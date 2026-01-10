/**
 * ============================================================================
 * API KEY AUTHENTICATION - dream-api
 * ============================================================================
 *
 * HOW IT WORKS:
 * 1. Customer pays YOU on dream-api.com
 * 2. You generate: platformId + API key
 * 3. Store in KV: apikey:{hash} → platformId
 * 4. Customer uses API key in their app
 * 5. We verify and get their platformId
 * 6. Load their config from KV (Stripe keys, tiers, etc.)
 *
 * SUBSCRIPTION ENFORCEMENT:
 * After verifying the API key, we check if the platform's subscription is active.
 * The subscription status is cached in KV by front-auth-api webhooks.
 *
 * Allowed statuses: trialing, active, past_due
 * Blocked statuses: canceled (after grace period), none
 *
 * Grace period: 7 days after subscription ends to allow reactivation
 *
 * SECURITY:
 * - API keys hashed (SHA-256) before storage
 * - Original keys never stored
 * - Single KV read for verification (~10ms)
 * - Subscription check adds ~1ms (KV read)
 *
 * ============================================================================
 */

import { Env } from '../types';
import { getPlatformFromSecretHash, getPlatformFromPublishableKey } from '../services/d1';

// ============================================================================
// SUBSCRIPTION STATUS TYPES
// ============================================================================

type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

interface SubscriptionCache {
	status: SubscriptionStatus;
	currentPeriodEnd: number | null;
	gracePeriodEnd: number | null;
}

/**
 * Check if platform subscription allows API access
 *
 * Returns: { allowed: true } or { allowed: false, reason: string }
 *
 * Logic:
 * - trialing, active, past_due → allowed (Stripe is handling payment)
 * - canceled but within grace period → allowed (7 days to reactivate)
 * - canceled and grace expired → BLOCKED
 * - no subscription record → allowed (backward compat, new platforms)
 */
async function checkSubscriptionStatus(
	platformId: string,
	env: Env
): Promise<{ allowed: boolean; reason?: string; status?: SubscriptionStatus }> {
	try {
		const cached = await env.TOKENS_KV.get(`platform:${platformId}:subscription`);

		if (!cached) {
			// No subscription cache - could be:
			// 1. New platform that hasn't gone through checkout yet
			// 2. Old platform from before this feature
			// Allow access but log for monitoring
			console.log(`[Subscription] No cache for ${platformId}, allowing (backward compat)`);
			return { allowed: true, status: 'none' };
		}

		const sub: SubscriptionCache = JSON.parse(cached);
		const now = Date.now();

		// Active statuses - always allowed
		if (sub.status === 'trialing' || sub.status === 'active' || sub.status === 'past_due') {
			return { allowed: true, status: sub.status };
		}

		// Canceled - check grace period
		if (sub.status === 'canceled') {
			if (sub.gracePeriodEnd && now < sub.gracePeriodEnd) {
				// Within grace period - allow but warn
				const daysLeft = Math.ceil((sub.gracePeriodEnd - now) / (24 * 60 * 60 * 1000));
				console.log(`[Subscription] ${platformId} canceled, ${daysLeft} days grace remaining`);
				return { allowed: true, status: 'canceled' };
			}

			// Grace period expired - BLOCK
			console.warn(`[Subscription] ❌ BLOCKED ${platformId} - subscription canceled, grace expired`);
			return {
				allowed: false,
				status: 'canceled',
				reason: 'Subscription expired. Please renew at dashboard to restore API access.',
			};
		}

		// Unknown status - allow but log
		console.warn(`[Subscription] Unknown status for ${platformId}: ${sub.status}, allowing`);
		return { allowed: true, status: sub.status };
	} catch (error) {
		// KV error - don't block the request, just log
		console.error(`[Subscription] Error checking ${platformId}:`, error);
		return { allowed: true };
	}
}

/**
 * Result of API key verification
 */
export interface ApiKeyVerifyResult {
	platformId: string;
	publishableKey: string;
	mode?: string;
	projectType?: string | null;
	error?: string;       // Set when subscription blocked
	errorMessage?: string; // Human-readable error
}

/**
 * Verify API key and return platformId + publishableKey
 *
 * Returns both because:
 * - platformId: for tier config lookups, usage tracking
 * - publishableKey: for setting on new customers (their JWT will have it)
 */
export async function verifyApiKey(apiKey: string, env: Env): Promise<ApiKeyVerifyResult | null> {
	try {
		// Hash the API key
		const encoder = new TextEncoder();
		const data = encoder.encode(apiKey);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

		// Try KV cache first (fast path)
		const cachedPk = await env.TOKENS_KV.get(`secretkey:${hashHex}:publishableKey`);
		if (cachedPk) {
			const cachedPlatformId = await env.TOKENS_KV.get(`publishablekey:${cachedPk}:platformId`);
			if (cachedPlatformId) {
				// Check subscription status before allowing access
				const subCheck = await checkSubscriptionStatus(cachedPlatformId, env);
				if (!subCheck.allowed) {
					console.warn(`[API Key] ❌ Subscription blocked - Platform: ${cachedPlatformId}`);
					const mode = cachedPk.startsWith('pk_test_') ? 'test' : 'live';
					return {
						platformId: cachedPlatformId,
						publishableKey: cachedPk,
						mode,
						projectType: null,
						error: 'subscription_expired',
						errorMessage: subCheck.reason || 'Subscription inactive',
					};
				}

				const mode = cachedPk.startsWith('pk_test_') ? 'test' : 'live';
				console.log(`[API Key] ✅ Valid (from cache) - Platform: ${cachedPlatformId}, PublishableKey: ${cachedPk}, Mode: ${mode}`);
				return { platformId: cachedPlatformId, publishableKey: cachedPk, mode, projectType: null };
			}
		}

		// Cache miss - query D1
		const fromDb = await getPlatformFromSecretHash(env, hashHex);
		if (!fromDb) {
			console.warn(`[API Key] Invalid key hash: ${hashHex}`);
			return null;
		}

		const pk = fromDb.publishableKey;
		const platformId = fromDb.platformId;
		const mode = fromDb.mode || (pk.startsWith('pk_test_') ? 'test' : 'live');
		const projectType = fromDb.projectType || null;

		// Warm KV cache for next time (only on cache miss)
		await env.TOKENS_KV.put(`secretkey:${hashHex}:publishableKey`, pk);
		await env.TOKENS_KV.put(`publishablekey:${pk}:platformId`, platformId);

		console.log(`[API Key] ✅ Valid (from D1) - Platform: ${platformId}, PublishableKey: ${pk}, Mode: ${mode}`);

		// Check subscription status before allowing access
		const subCheck = await checkSubscriptionStatus(platformId, env);
		if (!subCheck.allowed) {
			console.warn(`[API Key] ❌ Subscription blocked - Platform: ${platformId}`);
			return {
				platformId,
				publishableKey: pk,
				mode,
				projectType,
				error: 'subscription_expired',
				errorMessage: subCheck.reason || 'Subscription inactive',
			};
		}

		return { platformId, publishableKey: pk, mode, projectType };
	} catch (error) {
		console.error('[API Key] Verification error:', error);
		return null;
	}
}

/**
 * Result of publishable key verification
 */
export interface PublishableKeyVerifyResult {
	platformId: string;
	publishableKey: string;
	mode: string;
	error?: string;       // Set when subscription blocked
	errorMessage?: string; // Human-readable error
}

/**
 * Verify publishable key and return platformId
 *
 * Used for frontend-only auth (PK without SK):
 * - Public endpoints: tiers, products (no JWT needed)
 * - User endpoints: usage, billing (JWT required separately)
 *
 * This does NOT grant admin access - admin operations still require SK.
 */
export async function verifyPublishableKey(pk: string, env: Env): Promise<PublishableKeyVerifyResult | null> {
	try {
		// Validate format
		if (!pk || (!pk.startsWith('pk_test_') && !pk.startsWith('pk_live_'))) {
			console.warn(`[PK Auth] Invalid publishable key format: ${pk?.substring(0, 10)}...`);
			return null;
		}

		// Derive mode from prefix
		const mode = pk.startsWith('pk_test_') ? 'test' : 'live';

		// Try KV cache first (fast path)
		const cachedPlatformId = await env.TOKENS_KV.get(`publishablekey:${pk}:platformId`);
		if (cachedPlatformId) {
			// Check subscription status before allowing access
			const subCheck = await checkSubscriptionStatus(cachedPlatformId, env);
			if (!subCheck.allowed) {
				console.warn(`[PK Auth] ❌ Subscription blocked - Platform: ${cachedPlatformId}`);
				return {
					platformId: cachedPlatformId,
					publishableKey: pk,
					mode,
					error: 'subscription_expired',
					errorMessage: subCheck.reason || 'Subscription inactive',
				};
			}

			console.log(`[PK Auth] ✅ Valid (from cache) - Platform: ${cachedPlatformId}, PK: ${pk}, Mode: ${mode}`);
			return { platformId: cachedPlatformId, publishableKey: pk, mode };
		}

		// Cache miss - query D1
		const platformId = await getPlatformFromPublishableKey(env, pk);
		if (!platformId) {
			console.warn(`[PK Auth] Publishable key not found: ${pk}`);
			return null;
		}

		// Warm KV cache for next time
		await env.TOKENS_KV.put(`publishablekey:${pk}:platformId`, platformId);

		// Check subscription status before allowing access
		const subCheck = await checkSubscriptionStatus(platformId, env);
		if (!subCheck.allowed) {
			console.warn(`[PK Auth] ❌ Subscription blocked - Platform: ${platformId}`);
			return {
				platformId,
				publishableKey: pk,
				mode,
				error: 'subscription_expired',
				errorMessage: subCheck.reason || 'Subscription inactive',
			};
		}

		console.log(`[PK Auth] ✅ Valid (from D1) - Platform: ${platformId}, PK: ${pk}, Mode: ${mode}`);
		return { platformId, publishableKey: pk, mode };
	} catch (error) {
		console.error('[PK Auth] Verification error:', error);
		return null;
	}
}
