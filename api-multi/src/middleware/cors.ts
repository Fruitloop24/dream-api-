/**
 * ============================================================================
 * CORS MIDDLEWARE
 * ============================================================================
 *
 * Open CORS policy for multi-tenant API.
 * Security is handled by publishable key validation + JWT authentication.
 */

import { Env } from '../types';
import { getSecurityHeaders } from './security';

/**
 * CORS STRATEGY: Open access with echo-back
 *
 * WHY OPEN CORS IS SAFE HERE:
 * ------------------------------------------------
 * This is a multi-tenant API where developers deploy their apps to ANY domain
 * (Vercel, Netlify, Cloudflare Pages, custom domains, etc.).
 *
 * Security is NOT provided by CORS origin checking. Instead:
 *
 * 1. PUBLIC ENDPOINTS (products.list, products.listTiers)
 *    - Require valid publishable key (X-Publishable-Key header)
 *    - Only return public data (prices, tier info)
 *    - No sensitive data exposed even if called from malicious site
 *
 * 2. AUTHENTICATED ENDPOINTS (usage.track, billing.checkout)
 *    - Require valid publishable key
 *    - Require valid JWT token (from Clerk, stored in user's browser)
 *    - JWT is httpOnly cookie - malicious sites can't steal it
 *    - Even if request is made, it's on behalf of the actual user
 *
 * 3. ADMIN ENDPOINTS (dashboard, customers.create)
 *    - Require secret key (server-to-server only)
 *    - Never called from browser
 *    - CORS irrelevant
 *
 * This matches how Stripe, Clerk, and other public APIs work.
 * The publishable key identifies the developer's project.
 * The JWT identifies and authorizes the end user.
 */
export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
	// Echo back the requesting origin, or use * if no origin header
	// This allows any domain to use the API while still enabling credentials
	const origin = request.headers.get('Origin');
	const allowOrigin = origin || '*';

	return {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Platform-User-Id, X-User-Id, X-User-Plan, X-Env, X-Publishable-Key, X-Clerk-Token',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
		...getSecurityHeaders(),
	};
}

/**
 * Handle CORS preflight requests (OPTIONS)
 */
export function handlePreflight(corsHeaders: Record<string, string>): Response {
	return new Response(null, {
		status: 204, // No Content
		headers: corsHeaders
	});
}
