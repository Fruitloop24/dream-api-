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

		// Look up publishableKey from secretKey hash
		const publishableKey = await env.TOKENS_KV.get(`secretkey:${hashHex}:publishableKey`);

		if (!publishableKey) {
			console.warn(`[API Key] Invalid key: ${apiKey.substring(0, 12)}...`);
			return null;
		}

		// Look up platformId from publishableKey
		const platformId = await env.TOKENS_KV.get(`publishablekey:${publishableKey}:platformId`);

		if (!platformId) {
			console.error(`[API Key] No platformId for publishableKey: ${publishableKey}`);
			return null;
		}

		console.log(`[API Key] ✅ Valid - Platform: ${platformId}, PublishableKey: ${publishableKey}`);
		return { platformId, publishableKey };
	} catch (error) {
		console.error('[API Key] Verification error:', error);
		return null;
	}
}
