/**
 * ============================================================================
 * DASHBOARD ROUTE - Developer Dashboard Data
 * ============================================================================
 *
 * This route provides all the data needed for the developer dashboard.
 * It aggregates data from multiple tables filtered by:
 *
 * PRIMARY FILTER: platformId (the developer)
 *   - Shows all data belonging to this developer
 *
 * SECONDARY FILTER: publishableKey (the project)
 *   - Filters to a specific project when provided
 *   - If not provided, returns data for all projects
 *
 * MODE FILTER: test vs live
 *   - Determined by key prefix (pk_test_ vs pk_live_)
 *   - Filters customers, subscriptions, tiers by mode
 *
 * WHAT IT RETURNS:
 *   - metrics: MRR, active subs, canceling subs, usage total
 *   - customers: List with usage, subscription status, limits
 *   - tiers: Product/tier definitions with pricing
 *   - keys: API keys for this platform
 *   - webhook: Recent events for debugging
 *
 * ============================================================================
 */

import { createClerkClient } from '@clerk/backend';
import { Env } from '../types';
import { ensureSubscriptionSchema, ensureTierSchema } from '../services/d1';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type TierRow = {
  name: string;
  displayName: string | null;
  price: number;
  limit: number | null;
  priceId: string | null;
  productId: string | null;
  popular: number | null;
  inventory?: number | null;
  soldOut?: number | null;
  publishableKey?: string | null;
  projectType?: string | null;
};

type SubscriptionRow = {
  userId: string;
  plan: string | null;
  status: string | null;
  subscriptionId?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  priceId: string | null;
  productId: string | null;
  amount: number | null;
  currency: string | null;
  publishableKey?: string | null;
};

type UsageRow = {
  userId: string;
  usageCount: number | null;
  plan: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

type EndUserRow = {
  userId: string;
  email: string | null;
  status: string | null;
  createdAt?: string | null;
  publishableKey?: string | null;
};

type ApiKeyRow = {
  publishableKey: string;
  secretKeyHash: string;
  createdAt?: string;
  status?: string | null;
  name?: string | null;
  projectType?: string | null;
  mode?: string | null;
};

type EventRow = {
  type: string;
  createdAt: string;
};

type StripeTokenRow = {
  stripeUserId: string;
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Handle dashboard data request
 *
 * @param env - Worker environment
 * @param platformId - Developer's platform ID (required)
 * @param corsHeaders - CORS headers for response
 * @param mode - 'test' or 'live' (default: 'live')
 * @param publishableKey - Filter to specific project (optional)
 */
export async function handleDashboard(
  env: Env,
  platformId: string,
  corsHeaders: Record<string, string>,
  mode: string = 'live',
  publishableKey: string | null = null
): Promise<Response> {
  try {
    // Ensure schemas are up to date
    await ensureSubscriptionSchema(env);
    await ensureTierSchema(env);

    // Determine key prefix for mode filtering
    const keyPrefix = mode === 'test' ? 'pk_test_%' : 'pk_live_%';

    // =========================================================================
    // FETCH TIERS
    // Filter by platformId, mode, and optionally publishableKey
    // =========================================================================

    let tierQuery = `
      SELECT name, displayName, price, "limit", priceId, productId,
             popular, inventory, soldOut, publishableKey, projectType
      FROM tiers
      WHERE platformId = ?
        AND (mode = ? OR mode IS NULL)
    `;
    const tierParams: any[] = [platformId, mode];

    if (publishableKey) {
      tierQuery += ' AND (publishableKey = ? OR publishableKey IS NULL)';
      tierParams.push(publishableKey);
    }

    const tiersResult = await env.DB.prepare(tierQuery)
      .bind(...tierParams)
      .all<TierRow>();

    // Build tier lookup by name (case-insensitive)
    const tierInfoByName: Record<string, TierRow> = {};
    (tiersResult.results || []).forEach((t) => {
      if (t.name) tierInfoByName[t.name.toLowerCase()] = t;
      if (t.displayName) tierInfoByName[t.displayName.toLowerCase()] = t;
    });

    // Format tiers for response
    const tiers = (tiersResult.results || []).map((t) => ({
      name: t.name,
      displayName: t.displayName || t.name,
      price: t.price,
      limit: t.limit === null ? 'unlimited' : t.limit,
      priceId: t.priceId,
      productId: t.productId,
      popular: !!t.popular,
      inventory: t.inventory ?? null,
      soldOut: !!t.soldOut || (typeof t.inventory === 'number' && t.inventory <= 0),
      publishableKey: t.publishableKey,
      projectType: t.projectType,
    }));

    // =========================================================================
    // FETCH SUBSCRIPTIONS
    // Filter by platformId, mode (via key prefix), and optionally publishableKey
    // =========================================================================

    let subsQuery = `
      SELECT userId, plan, status, subscriptionId, stripeCustomerId,
             currentPeriodEnd, canceledAt, priceId, productId, amount,
             currency, publishableKey
      FROM subscriptions
      WHERE platformId = ?
        AND (publishableKey LIKE ? OR publishableKey IS NULL)
    `;
    const subsParams: any[] = [platformId, keyPrefix];

    if (publishableKey) {
      subsQuery += ' AND (publishableKey = ? OR publishableKey IS NULL)';
      subsParams.push(publishableKey);
    }

    const subsResult = await env.DB.prepare(subsQuery)
      .bind(...subsParams)
      .all<SubscriptionRow>();
    const subscriptions = subsResult.results || [];

    // =========================================================================
    // FETCH USAGE
    // Get usage for users who have subscriptions in this mode
    // =========================================================================

    const userIdsInMode = subscriptions.map(s => s.userId);
    let usage: UsageRow[] = [];

    if (userIdsInMode.length > 0) {
      const usageQuery = `
        SELECT userId, usageCount, plan, periodStart, periodEnd
        FROM usage_counts
        WHERE platformId = ?
      `;
      const usageResult = await env.DB.prepare(usageQuery)
        .bind(platformId)
        .all<UsageRow>();

      // Filter to only users in this mode
      usage = (usageResult.results || []).filter(u => userIdsInMode.includes(u.userId));
    }

    // =========================================================================
    // FETCH END USERS
    // Filter by platformId, mode, and optionally publishableKey
    // =========================================================================

    let usersQuery = `
      SELECT clerkUserId as userId, email, status, createdAt, publishableKey
      FROM end_users
      WHERE platformId = ?
        AND (publishableKey LIKE ? OR publishableKey IS NULL)
    `;
    const usersParams: any[] = [platformId, keyPrefix];

    if (publishableKey) {
      usersQuery += ' AND (publishableKey = ? OR publishableKey IS NULL)';
      usersParams.push(publishableKey);
    }

    const usersResult = await env.DB.prepare(usersQuery)
      .bind(...usersParams)
      .all<EndUserRow>();
    const users = usersResult.results || [];

    // =========================================================================
    // FETCH API KEYS
    // Get all keys for this platform filtered by mode
    // =========================================================================

    let keysQuery = `
      SELECT publishableKey, secretKeyHash, createdAt, status, name,
             projectType, mode
      FROM api_keys
      WHERE platformId = ?
        AND publishableKey LIKE ?
      ORDER BY createdAt DESC
    `;
    const keysParams: any[] = [platformId, keyPrefix];

    const allKeysResult = await env.DB.prepare(keysQuery)
      .bind(...keysParams)
      .all<ApiKeyRow>();

    // Get the "current" key (most recent or matching publishableKey)
    const currentKey = publishableKey
      ? allKeysResult.results?.find(k => k.publishableKey === publishableKey)
      : allKeysResult.results?.[0];

    // =========================================================================
    // FETCH STRIPE ACCOUNT INFO
    // =========================================================================

    const stripeResult = await env.DB.prepare(`
      SELECT stripeUserId FROM stripe_tokens WHERE platformId = ? LIMIT 1
    `)
      .bind(platformId)
      .first<StripeTokenRow>();

    // =========================================================================
    // FETCH RECENT EVENTS
    // For webhook debugging visibility
    // =========================================================================

    const eventsResult = await env.DB.prepare(`
      SELECT type, createdAt FROM events
      WHERE platformId = ?
      ORDER BY createdAt DESC
      LIMIT 5
    `)
      .bind(platformId)
      .all<EventRow>();
    const events = eventsResult.results || [];

    // =========================================================================
    // BUILD LOOKUPS
    // =========================================================================

    // Tier limits by name
    const tierLimitByName: Record<string, number | 'unlimited'> = {};
    tiers.forEach((t) => {
      const limit = t.limit === 'unlimited' ? 'unlimited' : Number(t.limit ?? 0);
      tierLimitByName[t.name] = limit;
      if (t.displayName && t.displayName !== t.name) {
        tierLimitByName[t.displayName] = limit;
      }
    });

    // Usage by userId
    const usageMap = new Map<string, UsageRow>();
    for (const u of usage) usageMap.set(u.userId, u);

    // End users by userId
    const userMap = new Map<string, EndUserRow>();
    for (const u of users) userMap.set(u.userId, u);

    // =========================================================================
    // BUILD CUSTOMER LIST
    // Merge subscriptions, usage, and end user data
    // =========================================================================

    const customerMap = new Map<string, any>();

    // Start with subscriptions (they have the richest data)
    for (const sub of subscriptions) {
      const u = usageMap.get(sub.userId);
      const e = userMap.get(sub.userId);
      const plan = sub.plan || u?.plan || 'free';

      // Find tier info for limit calculation
      const tierInfo =
        (typeof plan === 'string' && tierInfoByName[plan.toLowerCase()]) ||
        (typeof plan === 'string' && tierInfoByName[plan]) ||
        null;

      const limit =
        (tierInfo?.limit === null ? 'unlimited' : tierInfo?.limit) ||
        tierLimitByName[plan] ||
        (typeof plan === 'string' ? tierLimitByName[plan.toLowerCase()] : undefined) ||
        0;

      customerMap.set(sub.userId, {
        userId: sub.userId,
        email: e?.email || null,
        plan,
        status: sub.status || 'active',
        usageCount: u?.usageCount ?? 0,
        limit,
        periodStart: u?.periodStart || null,
        periodEnd: u?.periodEnd || null,
        currentPeriodEnd: sub.currentPeriodEnd,
        canceledAt: sub.canceledAt,
        subscriptionId: sub.subscriptionId || null,
        stripeCustomerId: sub.stripeCustomerId || null,
        priceId: sub.priceId || tierInfo?.priceId || null,
        productId: sub.productId || tierInfo?.productId || null,
        amount: sub.amount ?? (tierInfo?.price ? Math.round(tierInfo.price * 100) : null),
        currency: sub.currency,
        publishableKey: sub.publishableKey || null,
      });
    }

    // Add end users without subscriptions
    for (const e of users) {
      if (customerMap.has(e.userId)) continue;

      const u = usageMap.get(e.userId);
      const plan = u?.plan || 'free';

      const tierInfo =
        (typeof plan === 'string' && tierInfoByName[plan.toLowerCase()]) ||
        (typeof plan === 'string' && tierInfoByName[plan]) ||
        null;

      const limit =
        (tierInfo?.limit === null ? 'unlimited' : tierInfo?.limit) ||
        tierLimitByName[plan] ||
        (typeof plan === 'string' ? tierLimitByName[plan.toLowerCase()] : undefined) ||
        0;

      customerMap.set(e.userId, {
        userId: e.userId,
        email: e.email || null,
        plan,
        status: 'none',
        usageCount: u?.usageCount ?? 0,
        limit,
        periodStart: u?.periodStart || null,
        periodEnd: u?.periodEnd || null,
        currentPeriodEnd: null,
        canceledAt: null,
        subscriptionId: null,
        stripeCustomerId: null,
        priceId: tierInfo?.priceId || null,
        productId: tierInfo?.productId || null,
        amount: tierInfo?.price ? Math.round(tierInfo.price * 100) : null,
        currency: null,
        publishableKey: e.publishableKey || null,
      });
    }

    const customers = Array.from(customerMap.values());

    // =========================================================================
    // ENRICH WITH CLERK METADATA (fallback for missing Stripe IDs)
    // =========================================================================

    const clerkSecret = env.CLERK_SECRET_KEY;
    if (clerkSecret) {
      const clerk = createClerkClient({ secretKey: clerkSecret });

      for (const customer of customers) {
        if (customer.subscriptionId && customer.stripeCustomerId) continue;

        try {
          const user = await clerk.users.getUser(customer.userId);
          const meta = user.publicMetadata || {};
          customer.subscriptionId = customer.subscriptionId || (meta as any).subscriptionId || null;
          customer.stripeCustomerId = customer.stripeCustomerId || (meta as any).stripeCustomerId || null;
        } catch (err) {
          // Silently ignore - user might not exist in Clerk
          console.warn(`[Dashboard] Failed to fetch Clerk user ${customer.userId}`);
        }
      }
    }

    // =========================================================================
    // CALCULATE METRICS
    // =========================================================================

    const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
    const cancelingSubs = subscriptions.filter((s) => !!s.canceledAt).length;
    const mrr = subscriptions
      .filter((s) => s.status === 'active' && typeof s.amount === 'number')
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const usageTotal = usage.reduce((sum, u) => sum + (u.usageCount || 0), 0);

    // =========================================================================
    // BUILD RESPONSE
    // =========================================================================

    const response = {
      metrics: {
        activeSubs,
        cancelingSubs,
        mrr,
        usageThisPeriod: usageTotal,
      },
      customers,
      tiers,
      keys: {
        publishableKey: currentKey?.publishableKey || null,
        secretKeyMasked: currentKey ? '********' : null,
        platformId,
        apiKeys: (allKeysResult.results || []).map((k) => ({
          publishableKey: k.publishableKey,
          createdAt: k.createdAt || null,
          status: k.status || null,
          name: k.name || null,
          projectType: k.projectType || null,
          mode: k.mode || null,
        })),
        stripeAccountId: stripeResult?.stripeUserId || null,
      },
      webhook: {
        lastEventAt: events[0]?.createdAt || null,
        recent: events,
      },
      // Include filter info for frontend
      filters: {
        platformId,
        publishableKey: publishableKey || null,
        mode,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Dashboard] Error building dashboard:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to load dashboard' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ============================================================================
// ALL-LIVE TOTALS HANDLER
// Aggregate metrics across ALL live projects for a platform
// ============================================================================

/**
 * Get aggregate totals across all live projects
 *
 * @param env - Worker environment
 * @param platformId - Developer's platform ID
 * @param corsHeaders - CORS headers for response
 */
export async function handleDashboardTotals(
  env: Env,
  platformId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Get all live subscriptions
    const subsResult = await env.DB.prepare(`
      SELECT amount, status, canceledAt
      FROM subscriptions
      WHERE platformId = ?
        AND (publishableKey LIKE 'pk_live_%' OR publishableKey IS NULL)
    `)
      .bind(platformId)
      .all<{ amount: number | null; status: string | null; canceledAt: string | null }>();

    const subscriptions = subsResult.results || [];

    // Get all live products/tiers
    const tiersResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM tiers
      WHERE platformId = ?
        AND (mode = 'live' OR mode IS NULL)
    `)
      .bind(platformId)
      .first<{ count: number }>();

    // Get count of live API keys (projects)
    const keysResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM api_keys
      WHERE platformId = ?
        AND publishableKey LIKE 'pk_live_%'
    `)
      .bind(platformId)
      .first<{ count: number }>();

    // Calculate totals
    const totalMrr = subscriptions
      .filter((s) => s.status === 'active' && typeof s.amount === 'number')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const totalActiveSubs = subscriptions.filter((s) => s.status === 'active').length;
    const totalCanceling = subscriptions.filter((s) => !!s.canceledAt).length;

    return new Response(
      JSON.stringify({
        totals: {
          mrr: totalMrr,
          activeSubs: totalActiveSubs,
          cancelingSubs: totalCanceling,
          totalProducts: tiersResult?.count || 0,
          liveProjects: keysResult?.count || 0,
        },
        platformId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Dashboard Totals] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to load totals' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
