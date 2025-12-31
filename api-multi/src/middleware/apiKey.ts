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
 * SECURITY:
 * - API keys hashed (SHA-256) before storage
 * - Original keys never stored
 * - Single KV read for verification (~10ms)
 *
 * ============================================================================
 */

import { Env } from '../types';
import { getPlatformFromSecretHash, getPlatformFromPublishableKey } from '../services/d1';

/**
 * Result of API key verification
 */
export interface ApiKeyVerifyResult {
	platformId: string;
	publishableKey: string;
	mode?: string;
	projectType?: string | null;
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

		console.log(`[PK Auth] ✅ Valid (from D1) - Platform: ${platformId}, PK: ${pk}, Mode: ${mode}`);
		return { platformId, publishableKey: pk, mode };
	} catch (error) {
		console.error('[PK Auth] Verification error:', error);
		return null;
	}
}
