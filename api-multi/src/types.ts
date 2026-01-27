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
	// LIVE keys for production (custom domain: users.panacea-tech.net)
	CLERK_SECRET_KEY: string;           // Clerk secret key (sk_live_...)
	CLERK_PUBLISHABLE_KEY: string;      // Clerk publishable key (pk_live_...)
	CLERK_JWT_TEMPLATE: string;         // JWT template name ("end-user-api")
	// TEST keys for localhost development (workers.dev domain)
	// These allow devs to test locally without production Clerk keys
	CLERK_SECRET_KEY_TEST?: string;     // Optional: Clerk test secret key (sk_test_...)
	CLERK_PUBLISHABLE_KEY_TEST?: string; // Optional: Clerk test publishable key (pk_test_...)

	// KV namespace bindings (set in wrangler.toml)
	TOKENS_KV: KVNamespace;             // Tier configs + API key lookups
	DB: D1Database;                     // SSOT for dashboard/analytics

	// Stripe (YOUR platform's key for creating checkouts on connected accounts)
	STRIPE_SECRET_KEY: string;          // Platform Stripe key (sk_test_... or sk_live_...)

	// Optional
	ALLOWED_ORIGINS?: string;           // Comma-separated allowed CORS origins
	STRIPE_WEBHOOK_SECRET?: string;     // For Connect webhook verification (per-platform)

	// Optional R2 bucket for hosted product images (one-off store)
	dream_api_assets?: R2Bucket;
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
