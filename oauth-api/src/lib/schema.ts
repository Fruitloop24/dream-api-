/**
 * ============================================================================
 * SCHEMA HELPERS - D1 Database Schema Management
 * ============================================================================
 *
 * These functions ensure the D1 database schema is up to date.
 * They add columns if missing (safe to run multiple times).
 *
 * WHY THIS EXISTS:
 * Cloudflare D1 doesn't have migration tools like traditional databases.
 * So we use ALTER TABLE with try/catch - if column exists, it fails silently.
 * This lets us evolve the schema without manual migrations.
 *
 * SCHEMA OVERVIEW:
 *
 * platforms
 *   - platformId: Unique ID for the developer (plt_xxx)
 *   - clerkUserId: Links to Clerk authentication
 *
 * api_keys
 *   - platformId: Which developer owns this key
 *   - publishableKey: The public key (pk_test_xxx or pk_live_xxx)
 *   - secretKeyHash: SHA-256 hash of secret key (never store plain!)
 *   - projectType: 'saas' or 'store' - LOCKED after creation
 *   - mode: 'test' or 'live'
 *   - name: Display name for dashboard
 *
 * tiers
 *   - platformId: Which developer owns this
 *   - publishableKey: Which project this tier belongs to (NEW!)
 *   - projectType: 'saas', 'store', or 'membership'
 *   - name, displayName, price, limit: Tier properties
 *   - priceId, productId: Stripe IDs
 *   - mode: 'test' or 'live'
 *   - inventory, soldOut: For store products
 *   - trialDays: For membership (trial period before billing)
 *
 * stripe_tokens
 *   - platformId: Which developer
 *   - accessToken: Stripe Connect OAuth token
 *   - stripeUserId: Connected account ID
 *   - mode: 'test' or 'live'
 *
 * ============================================================================
 */

import { Env } from '../types';

// Track which schemas we've already checked this request
// Prevents redundant ALTER TABLE calls
let tierSchemaChecked = false;
let apiKeySchemaChecked = false;
let stripeTokenSchemaChecked = false;

/**
 * Ensure platform exists in D1
 * Called when we need to associate data with a platform
 */
export async function ensurePlatform(env: Env, platformId: string, userId: string) {
  await env.DB.prepare(
    'INSERT OR IGNORE INTO platforms (platformId, clerkUserId) VALUES (?, ?)'
  )
    .bind(platformId, userId)
    .run();
}

/**
 * Ensure tiers table has all required columns
 *
 * Key column: publishableKey
 * This links each tier to a specific project (identified by its key)
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

  // Legacy: projectId (keeping for backwards compat, but publishableKey is preferred)
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN projectId TEXT').run();
  } catch {}

  // trialDays - trial period for membership subscriptions
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN trialDays INTEGER').run();
  } catch {}
}

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

  // Legacy: projectId (keeping for backwards compat)
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectId TEXT').run();
  } catch {}

  // enableTax - enable Stripe automatic tax collection for this project
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN enableTax INTEGER DEFAULT 0').run();
  } catch {}
}

/**
 * Ensure stripe_tokens table exists with correct schema
 *
 * IMPORTANT: Primary key must be (platformId, mode) to support both test and live tokens.
 * If the old table has wrong primary key, we drop and recreate.
 */
export async function ensureStripeTokenSchema(env: Env) {
  if (stripeTokenSchemaChecked) return;
  stripeTokenSchemaChecked = true;

  // Check if table exists and has correct schema
  try {
    // Try to check the table info
    const tableInfo = await env.DB.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='stripe_tokens'"
    ).first<{ sql: string }>();

    if (tableInfo?.sql) {
      // Table exists - check if it has the correct primary key
      const hasCorrectPK = tableInfo.sql.includes('platformId, mode') ||
                           tableInfo.sql.includes('platformId,mode');

      if (!hasCorrectPK) {
        console.log('[Schema] stripe_tokens has wrong primary key, recreating...');
        // Drop and recreate with correct schema
        await env.DB.prepare('DROP TABLE stripe_tokens').run();
      }
    }
  } catch (e) {
    console.warn('[Schema] Table check warning:', e);
  }

  // Create table with correct schema
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS stripe_tokens (
        platformId TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'live',
        stripeUserId TEXT NOT NULL,
        accessToken TEXT NOT NULL,
        refreshToken TEXT,
        scope TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (platformId, mode)
      )
    `).run();
    console.log('[Schema] stripe_tokens table ready');
  } catch (e) {
    console.warn('[Schema] stripe_tokens create warning:', e);
  }
}
