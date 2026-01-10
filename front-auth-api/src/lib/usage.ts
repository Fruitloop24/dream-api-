import Stripe from 'stripe';
import { Env, Platform } from '../types';

/**
 * Count live end-users for a platform
 * Only counts users with pk_live_% publishable keys (test users are free)
 */
export async function getLiveEndUserCount(
  platformId: string,
  db: D1Database
): Promise<number> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM end_users
    WHERE platformId = ?
    AND publishableKey LIKE 'pk_live_%'
  `).bind(platformId).first<{ count: number }>();

  return result?.count ?? 0;
}

/**
 * Get all platforms with active subscriptions
 */
export async function getActiveSubscriptions(db: D1Database): Promise<Platform[]> {
  const result = await db.prepare(`
    SELECT * FROM platforms
    WHERE stripeCustomerId IS NOT NULL
    AND subscriptionStatus IN ('trialing', 'active')
  `).all<Platform>();

  return result.results ?? [];
}

/**
 * Report usage to Stripe Billing Meter
 */
export async function reportUsageToStripe(
  stripeCustomerId: string,
  endUserCount: number,
  env: Env
): Promise<void> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_METER_EVENT_NAME) {
    console.log('Stripe meter not configured, skipping usage report');
    return;
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });

  try {
    // Report the current count (Stripe uses max aggregation)
    await stripe.billing.meterEvents.create({
      event_name: env.STRIPE_METER_EVENT_NAME,
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: String(endUserCount),
      },
    });

    console.log(`Reported ${endUserCount} end-users for customer ${stripeCustomerId}`);
  } catch (error) {
    console.error('Failed to report usage to Stripe:', error);
    // Don't throw - we don't want to fail the cron job
  }
}

/**
 * Daily cron job: Report end-user counts to Stripe Meter for all active subscriptions
 */
export async function runDailyUsageReport(env: Env): Promise<{ reported: number; errors: number }> {
  console.log('Starting daily usage report...');

  const platforms = await getActiveSubscriptions(env.DB);
  console.log(`Found ${platforms.length} active subscriptions`);

  let reported = 0;
  let errors = 0;

  for (const platform of platforms) {
    if (!platform.stripeCustomerId) continue;

    try {
      const count = await getLiveEndUserCount(platform.platformId, env.DB);
      await reportUsageToStripe(platform.stripeCustomerId, count, env);
      reported++;
    } catch (error) {
      console.error(`Error reporting usage for platform ${platform.platformId}:`, error);
      errors++;
    }
  }

  console.log(`Daily usage report complete: ${reported} reported, ${errors} errors`);
  return { reported, errors };
}

// ============================================================================
// SUBSCRIPTION ENFORCEMENT - GRACE PERIOD CLEANUP
// ============================================================================
// This runs daily to:
// 1. Log platforms with expired grace periods (for monitoring/alerting)
// 2. Clean up data for platforms canceled > 30 days (data retention policy)
//
// The actual API blocking happens in api-multi via KV cache check.
// This cron job is for monitoring and cleanup, not enforcement.
// ============================================================================

const GRACE_PERIOD_DAYS = 7;
const DATA_RETENTION_DAYS = 30;

/**
 * Get platforms with canceled subscriptions
 */
async function getCanceledPlatforms(db: D1Database): Promise<Platform[]> {
  const result = await db.prepare(`
    SELECT * FROM platforms
    WHERE subscriptionStatus = 'canceled'
    AND currentPeriodEnd IS NOT NULL
  `).all<Platform>();

  return result.results ?? [];
}

/**
 * Daily cron job: Check canceled platforms and enforce grace period
 *
 * This function:
 * 1. Finds platforms with canceled subscriptions
 * 2. Logs those past grace period (API access blocked by api-multi)
 * 3. Cleans up data for platforms past retention period (30 days)
 */
export async function runGracePeriodEnforcement(env: Env): Promise<{
  inGrace: number;
  blocked: number;
  cleaned: number;
}> {
  console.log('[Grace Period] Starting enforcement check...');

  const canceledPlatforms = await getCanceledPlatforms(env.DB);
  console.log(`[Grace Period] Found ${canceledPlatforms.length} canceled platforms`);

  const now = Date.now();
  let inGrace = 0;
  let blocked = 0;
  let cleaned = 0;

  for (const platform of canceledPlatforms) {
    const periodEnd = platform.currentPeriodEnd ?? 0;
    const gracePeriodEnd = periodEnd + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const retentionEnd = periodEnd + (DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    if (now < gracePeriodEnd) {
      // Still in grace period
      const daysLeft = Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60 * 1000));
      console.log(`[Grace Period] ${platform.platformId}: ${daysLeft} days grace remaining`);
      inGrace++;
    } else if (now < retentionEnd) {
      // Past grace, but within retention - API blocked, data kept
      const daysSinceGrace = Math.ceil((now - gracePeriodEnd) / (24 * 60 * 60 * 1000));
      console.log(`[Grace Period] ${platform.platformId}: BLOCKED (${daysSinceGrace} days since grace expired)`);
      blocked++;
    } else {
      // Past retention - clean up data
      console.log(`[Grace Period] ${platform.platformId}: Past retention, cleaning up...`);

      try {
        // Delete API keys from D1
        await env.DB.prepare('DELETE FROM api_keys WHERE platformId = ?')
          .bind(platform.platformId).run();

        // Delete tiers
        await env.DB.prepare('DELETE FROM tiers WHERE platformId = ?')
          .bind(platform.platformId).run();

        // Delete end_users, subscriptions, usage_counts, events
        await env.DB.prepare('DELETE FROM end_users WHERE platformId = ?')
          .bind(platform.platformId).run();
        await env.DB.prepare('DELETE FROM subscriptions WHERE platformId = ?')
          .bind(platform.platformId).run();
        await env.DB.prepare('DELETE FROM usage_counts WHERE platformId = ?')
          .bind(platform.platformId).run();
        await env.DB.prepare('DELETE FROM events WHERE platformId = ?')
          .bind(platform.platformId).run();

        // Clear KV cache
        await env.TOKENS_KV.delete(`platform:${platform.platformId}:subscription`);

        // Update platform status to indicate cleaned
        await env.DB.prepare(`
          UPDATE platforms SET subscriptionStatus = 'none' WHERE platformId = ?
        `).bind(platform.platformId).run();

        console.log(`[Grace Period] ✅ Cleaned up ${platform.platformId}`);
        cleaned++;
      } catch (error) {
        console.error(`[Grace Period] Error cleaning ${platform.platformId}:`, error);
      }
    }
  }

  console.log(`[Grace Period] Complete: ${inGrace} in grace, ${blocked} blocked, ${cleaned} cleaned`);
  return { inGrace, blocked, cleaned };
}
