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
import { getPlatformFromPublishableKey, getPlatformFromSecretHash } from '../services/d1';

/**
 * Result of API key verification
 */
export interface ApiKeyVerifyResult {
	platformId: string;
	publishableKey: string;
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

		// Prefer D1 (authoritative), then KV as cache
		let pk: string | null = null;
		let platformId: string | null = null;

		const fromDb = await getPlatformFromSecretHash(env, hashHex);
		if (fromDb) {
			pk = fromDb.publishableKey;
			platformId = fromDb.platformId;
		} else {
			const publishableKey = await env.TOKENS_KV.get(`secretkey:${hashHex}:publishableKey`);
			pk = publishableKey;
			platformId = pk ? await env.TOKENS_KV.get(`publishablekey:${pk}:platformId`) : null;
		}

		// If we found via DB, rehydrate KV for hot path
		if (fromDb && pk && platformId) {
			await env.TOKENS_KV.put(`secretkey:${hashHex}:publishableKey`, pk);
			await env.TOKENS_KV.put(`publishablekey:${pk}:platformId`, platformId);
		}

		if (!platformId && pk) {
			platformId =
				(await env.TOKENS_KV.get(`publishablekey:${pk}:platformId`)) ||
				(await getPlatformFromPublishableKey(env, pk));
			if (platformId) {
				await env.TOKENS_KV.put(`publishablekey:${pk}:platformId`, platformId);
			}
		}

		if (!pk || !platformId) {
			console.error(`[API Key] Missing pk/platform for hash ${hashHex}, pk: ${pk}, platformId: ${platformId}`);
			console.error(`[API Key] No platformId/pk for key hash: ${hashHex}`);
			return null;
		}

		console.log(`[API Key] ✅ Valid - Platform: ${platformId}, PublishableKey: ${pk}`);
		return { platformId, publishableKey: pk };
	} catch (error) {
		console.error('[API Key] Verification error:', error);
		return null;
	}
}
