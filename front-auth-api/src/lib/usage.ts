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
