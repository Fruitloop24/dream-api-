/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 *
 * Shared TypeScript interfaces and types used across the API
 */

/**
 * Environment variables required for the worker
 * Set via: wrangler secret put <KEY>
 *
 * NOTE: api-multi uses DEV's Stripe token from KV for checkouts,
 * NOT a platform STRIPE_SECRET_KEY. The token is stored at:
 *   platform:{platformId}:stripeToken → { accessToken, stripeUserId }
 */
export interface Env {
	// Clerk (end-user-api - shared app for ALL devs' customers)
	CLERK_SECRET_KEY: string;           // Clerk secret key (sk_test_...)
	CLERK_PUBLISHABLE_KEY: string;      // Clerk publishable key (pk_test_...)
	CLERK_JWT_TEMPLATE: string;         // JWT template name ("end-user-api")

	// KV namespace bindings (set in wrangler.toml)
	USAGE_KV: KVNamespace;              // Usage tracking: usage:{platformId}:{userId}
	TOKENS_KV: KVNamespace;             // Tier configs + API key lookups

	// Optional
	ALLOWED_ORIGINS?: string;           // Comma-separated allowed CORS origins
	STRIPE_WEBHOOK_SECRET?: string;     // For Connect webhook verification (per-platform)
}

/**
 * Usage data structure stored in KV
 * Key format: `usage:{userId}`
 * TTL: None (persists forever, resets monthly for free tier)
 */
export interface UsageData {
	usageCount: number;        // Number of requests made in current period
	plan: PlanTier;            // User's current plan (synced from Clerk metadata)
	lastUpdated: string;       // ISO timestamp of last update
	periodStart?: string;      // Billing period start (YYYY-MM-DD)
	periodEnd?: string;        // Billing period end (YYYY-MM-DD)
}

/**
 * Tier configuration - defines limits and pricing for all tiers
 */
export type PlanTier = 'free' | 'pro' | 'developer';

/**
 * Tier configuration object
 */
export interface TierConfig {
	name: string;
	price: number;
	limit: number;
}
