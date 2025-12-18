/**
 * ============================================================================
 * D1 DATABASE SERVICE - api-multi
 * ============================================================================
 *
 * This module handles all D1 database operations for the customer-facing API.
 * It's used by:
 *   - Usage tracking (increment counters, check limits)
 *   - Subscription management (upsert from webhooks)
 *   - Dashboard data retrieval
 *   - Inventory management (for store products)
 *
 * KEY CONCEPT:
 * The publishableKey is the project identifier. All data is scoped:
 *   platformId → the developer who owns the API
 *   publishableKey → the specific project (SaaS or Store)
 *
 * SCHEMA EVOLUTION:
 * We use ALTER TABLE with try/catch for schema changes.
 * If column exists, it silently fails. This lets us evolve
 * the schema without manual migrations.
 *
 * ============================================================================
 */

import { Env, PlanTier } from '../types';

/**
 * Input type for subscription upserts
 * Used when processing Stripe webhook events
 */
type SubscriptionInput = {
  platformId: string | null;
  userId: string;
  publishableKey?: string | null;
  subscriptionId?: string | null;
  stripeCustomerId?: string | null;
  priceId?: string | null;
  productId?: string | null;
  plan?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
};

// ============================================================================
// SCHEMA CHECK FLAGS
// Track which tables we've already updated this request
// Prevents redundant ALTER TABLE calls
// ============================================================================
let tierSchemaChecked = false;
let apiKeySchemaChecked = false;
let stripeTokenSchemaChecked = false;
let usageSchemaChecked = false;
let subscriptionSchemaChecked = false;
let endUserSchemaChecked = false;

// ============================================================================
// SCHEMA ENSURE FUNCTIONS
// Add columns if missing, silently ignore if they exist (ALTER TABLE throws)
// ============================================================================

/**
 * Ensure api_keys table has all required columns
 */
export async function ensureApiKeySchema(env: Env) {
  if (apiKeySchemaChecked) return;
  apiKeySchemaChecked = true;

  // projectType - saas or store (LOCKED after creation)
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectType TEXT').run();
  } catch {}

  // mode - test or live
  try {
    await env.DB.prepare("ALTER TABLE api_keys ADD COLUMN mode TEXT DEFAULT 'live'").run();
  } catch {}

  // name - display name for dashboard
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN name TEXT').run();
  } catch {}
}

/**
 * Ensure stripe_tokens table has mode column
 */
export async function ensureStripeTokenSchema(env: Env) {
  if (stripeTokenSchemaChecked) return;
  stripeTokenSchemaChecked = true;

  try {
    await env.DB.prepare("ALTER TABLE stripe_tokens ADD COLUMN mode TEXT DEFAULT 'live'").run();
  } catch {}
}

/**
 * Ensure tiers table has all required columns
 *
 * Key column: publishableKey - links tier to project
 */
export async function ensureTierSchema(env: Env) {
  if (tierSchemaChecked) return;
  tierSchemaChecked = true;

  // publishableKey - THE KEY COLUMN - links tier to project
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN publishableKey TEXT').run();
  } catch {}

  // projectType - saas or store
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN projectType TEXT').run();
  } catch {}

  // inventory - stock count for store products
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN inventory INTEGER').run();
  } catch {}

  // soldOut - flag when inventory hits 0
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN soldOut INTEGER DEFAULT 0').run();
  } catch {}

  // mode - test or live
  try {
    await env.DB.prepare("ALTER TABLE tiers ADD COLUMN mode TEXT DEFAULT 'live'").run();
  } catch {}
}

/**
 * Ensure usage_counts table has publishableKey column
 */
export async function ensureUsageSchema(env: Env) {
  if (usageSchemaChecked) return;
  usageSchemaChecked = true;

  try {
    await env.DB.prepare('ALTER TABLE usage_counts ADD COLUMN publishableKey TEXT').run();
  } catch {}
}

/**
 * Ensure subscriptions table has all required columns
 */
export async function ensureSubscriptionSchema(env: Env) {
  if (subscriptionSchemaChecked) return;
  subscriptionSchemaChecked = true;

  // subscriptionId - Stripe subscription ID
  try {
    await env.DB.prepare('ALTER TABLE subscriptions ADD COLUMN subscriptionId TEXT').run();
  } catch {}

  // stripeCustomerId - Stripe customer ID
  try {
    await env.DB.prepare('ALTER TABLE subscriptions ADD COLUMN stripeCustomerId TEXT').run();
  } catch {}
}

/**
 * Ensure end_users table exists
 * publishableKey column is created in schema
 */
export async function ensureEndUserSchema(_env: Env) {
  if (endUserSchemaChecked) return;
  endUserSchemaChecked = true;
  // No additional columns needed - base schema has publishableKey
}

// ============================================================================
// LOOKUP FUNCTIONS
// Find platform/key information from various identifiers
// ============================================================================

/**
 * Get platform info from a hashed secret key
 * Used during API authentication
 *
 * @param secretKeyHash - SHA-256 hash of the secret key
 * @returns Platform info including publishableKey and projectType
 */
export async function getPlatformFromSecretHash(
  env: Env,
  secretKeyHash: string
): Promise<{
  platformId: string;
  publishableKey: string;
  mode?: string;
  projectType?: string | null;
} | null> {
  const row = await env.DB.prepare(`
    SELECT platformId, publishableKey, mode, projectType
    FROM api_keys
    WHERE secretKeyHash = ?
    LIMIT 1
  `)
    .bind(secretKeyHash)
    .first<{
      platformId: string;
      publishableKey: string;
      mode?: string;
      projectType?: string | null;
    }>();

  return row ?? null;
}

/**
 * Get platformId from a publishable key
 * Used for quick platform resolution
 */
export async function getPlatformFromPublishableKey(
  env: Env,
  pk: string
): Promise<string | null> {
  const row = await env.DB.prepare(`
    SELECT platformId
    FROM api_keys
    WHERE publishableKey = ?
    LIMIT 1
  `)
    .bind(pk)
    .first<{ platformId: string }>();

  return row?.platformId ?? null;
}

/**
 * Get mode (test/live) for a publishable key
 * Can also be inferred from pk_test_ vs pk_live_ prefix
 */
export async function getModeForPublishableKey(
  env: Env,
  pk: string
): Promise<string | null> {
  const row = await env.DB.prepare(`
    SELECT mode
    FROM api_keys
    WHERE publishableKey = ?
    LIMIT 1
  `)
    .bind(pk)
    .first<{ mode: string | null }>();

  return row?.mode ?? null;
}

// ============================================================================
// END USER FUNCTIONS
// Manage end-users (customers of the developer's API)
// ============================================================================

/**
 * Insert or update an end user
 * Called when a user signs up through the developer's API
 */
export async function upsertEndUser(
  env: Env,
  platformId: string,
  publishableKey: string,
  clerkUserId: string,
  email?: string | null,
  status: string = 'active'
) {
  await env.DB.prepare(`
    INSERT OR REPLACE INTO end_users (
      platformId, publishableKey, clerkUserId, email, status, updatedAt
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)
    .bind(platformId, publishableKey, clerkUserId, email ?? null, status)
    .run();
}

// ============================================================================
// USAGE TRACKING FUNCTIONS
// Track API usage per user per period
// ============================================================================

/**
 * Insert or update a usage snapshot
 * Used for recording usage at a point in time
 */
export async function upsertUsageSnapshot(
  env: Env,
  platformId: string,
  userId: string,
  plan: PlanTier | string,
  periodStart: string | undefined,
  periodEnd: string | undefined,
  usageCount: number
) {
  await env.DB.prepare(`
    INSERT OR REPLACE INTO usage_snapshots (
      platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)
    .bind(platformId, userId, plan, periodStart ?? null, periodEnd ?? null, usageCount)
    .run();
}

/**
 * Atomically increment usage count with limit checking
 *
 * This is the HOT PATH for API usage tracking.
 * It atomically:
 *   1. Inserts new usage record if doesn't exist
 *   2. Increments existing count if under limit
 *   3. Blocks increment if at/over limit
 *
 * @returns Object with success flag, current count, limit, and plan
 */
export async function upsertUsageInDb(
  env: Env,
  platformId: string,
  userId: string,
  plan: PlanTier | string,
  periodStart: string,
  periodEnd: string,
  incrementBy: number,
  limit: number | 'unlimited'
): Promise<{ success: boolean; usageCount: number; limit: number | 'unlimited'; plan: string }> {
  // Handle unlimited case
  const isUnlimited = limit === 'unlimited' || limit === Infinity;
  const currentLimit = isUnlimited ? Number.MAX_SAFE_INTEGER : (limit as number);

  // Upsert + atomic increment with guard
  // The WHERE clause prevents increment if it would exceed limit
  await env.DB.prepare(`
    INSERT INTO usage_snapshots (platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(platformId, userId) DO UPDATE SET
      plan=excluded.plan,
      periodStart=excluded.periodStart,
      periodEnd=excluded.periodEnd,
      usageCount=CASE
        WHEN usage_snapshots.usageCount + ? > ? THEN usage_snapshots.usageCount
        ELSE usage_snapshots.usageCount + ?
      END,
      updatedAt=CURRENT_TIMESTAMP
    WHERE usage_snapshots.usageCount + ? <= ?
  `)
    .bind(
      platformId,
      userId,
      plan,
      periodStart,
      periodEnd,
      incrementBy,   // initial insert usageCount
      incrementBy,   // CASE guard +
      currentLimit,  // CASE guard limit
      incrementBy,   // CASE increment
      incrementBy,   // WHERE guard +
      currentLimit   // WHERE guard limit
    )
    .run();

  // Get current count to return to caller
  const row = await env.DB.prepare(`
    SELECT usageCount FROM usage_snapshots
    WHERE platformId = ? AND userId = ?
  `)
    .bind(platformId, userId)
    .first<{ usageCount: number }>();

  if (!row) {
    return { success: false, usageCount: 0, limit, plan: plan.toString() };
  }

  const success = row.usageCount <= currentLimit;
  return { success, usageCount: row.usageCount, limit, plan: plan.toString() };
}

// ============================================================================
// EVENT TRACKING
// Track webhook events for deduplication and debugging
// ============================================================================

/**
 * Check if an event has already been processed
 * Used to prevent duplicate webhook processing
 */
export async function isEventProcessed(env: Env, eventId: string): Promise<boolean> {
  const row = await env.DB.prepare(`
    SELECT eventId FROM events WHERE eventId = ? LIMIT 1
  `)
    .bind(eventId)
    .first<{ eventId: string }>();

  return !!row;
}

/**
 * Record a processed event
 * Called after successfully handling a webhook
 */
export async function recordEvent(
  env: Env,
  eventId: string,
  platformId: string | null,
  type: string,
  source: string,
  payloadJson: string,
  publishableKey?: string | null
) {
  // Ensure publishableKey column exists
  try {
    await env.DB.prepare('ALTER TABLE events ADD COLUMN publishableKey TEXT').run();
  } catch {}

  await env.DB.prepare(`
    INSERT INTO events (platformId, source, type, eventId, payload_json, publishableKey)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(platformId, source, type, eventId, payloadJson, publishableKey ?? null)
    .run();
}

// ============================================================================
// SUBSCRIPTION FUNCTIONS
// Manage subscriptions from Stripe webhooks
// ============================================================================

/**
 * Insert or update a subscription
 * Called when processing Stripe subscription webhooks
 */
export async function upsertSubscription(env: Env, sub: SubscriptionInput) {
  await ensureSubscriptionSchema(env);

  await env.DB.prepare(`
    INSERT OR REPLACE INTO subscriptions (
      platformId, userId, publishableKey, subscriptionId, stripeCustomerId,
      priceId, productId, plan, amount, currency, status,
      currentPeriodEnd, canceledAt, cancelReason, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)
    .bind(
      sub.platformId,
      sub.userId,
      sub.publishableKey ?? null,
      sub.subscriptionId ?? null,
      sub.stripeCustomerId ?? null,
      sub.priceId ?? null,
      sub.productId ?? null,
      sub.plan ?? null,
      sub.amount ?? null,
      sub.currency ?? null,
      sub.status ?? null,
      sub.currentPeriodEnd ?? null,
      sub.canceledAt ?? null,
      sub.cancelReason ?? null
    )
    .run();
}

// ============================================================================
// INVENTORY FUNCTIONS
// Manage product inventory for store products
// ============================================================================

/**
 * Decrement inventory for purchased items
 * Called after successful checkout for store products
 *
 * @param items - Array of { priceId, quantity } purchased
 * @param mode - test or live
 */
export async function decrementInventory(
  env: Env,
  platformId: string,
  items: { priceId: string; quantity: number }[],
  mode: string = 'live'
): Promise<void> {
  if (!items.length) return;

  await ensureTierSchema(env);

  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity || 1));

    // Atomic decrement with bounds checking
    // Sets soldOut flag when inventory hits 0
    await env.DB.prepare(`
      UPDATE tiers
      SET
        inventory = CASE
          WHEN inventory IS NULL THEN NULL
          WHEN inventory - ? < 0 THEN 0
          ELSE inventory - ?
        END,
        soldOut = CASE
          WHEN inventory IS NULL THEN soldOut
          WHEN inventory - ? <= 0 THEN 1
          ELSE 0
        END
      WHERE platformId = ? AND priceId = ? AND (mode = ? OR mode IS NULL)
    `)
      .bind(qty, qty, qty, platformId, item.priceId, mode)
      .run();
  }
}
