/**
 * ============================================================================
 * dream-api - MULTI-TENANT USAGE TRACKING API
 * ============================================================================
 *
 * FILTERING:
 * - platformId: identifies the developer (owner)
 * - publishableKey: identifies the project (pk_test_xxx or pk_live_xxx)
 * - mode: test or live (derived from key prefix)
 *
 * ============================================================================
 */

import { createClerkClient, verifyToken } from '@clerk/backend';
import { handleStripeWebhook } from './stripe-webhook';

// Type definitions
import { Env, PlanTier } from './types';

// Configuration
import { RATE_LIMIT_PER_MINUTE } from './config/tiers';
import { getAllTiers } from './config/configLoader';

// Middleware
import { getCorsHeaders, handlePreflight } from './middleware/cors';
import { checkRateLimit } from './middleware/rateLimit';
import { verifyApiKey, verifyPublishableKey } from './middleware/apiKey';

// Routes
import { handleDataRequest, handleUsageCheck } from './routes/usage';
import { handleCreateCheckout, handleCustomerPortal } from './routes/checkout';
import { handleCreateCustomer, handleGetCustomer, handleUpdateCustomer, handleDeleteCustomer } from './routes/customers';
import { handleDashboard, handleDashboardTotals } from './routes/dashboard';
import { handleCartCheckout, handleGetProducts } from './routes/products';
import { handleAssetGet, handleAssetUpload } from './routes/assets';

// Utilities
import { validateEnv } from './utils';

/**
 * Verify end-user JWT token (required for user-specific operations)
 *
 * SECURITY: No header fallback - JWT is the ONLY way to identify end-users.
 * The plan comes from JWT's publicMetadata, set by our system during subscription.
 * This prevents users from spoofing their plan via headers.
 */
async function verifyEndUserToken(
	request: Request,
	env: Env
): Promise<{ userId: string; plan: PlanTier; publishableKeyFromToken?: string | null; email?: string | null }> {
	const token =
		request.headers.get('X-Clerk-Token') ||
		request.headers.get('X-User-Token') ||
		request.headers.get('X-End-User-Token');

	if (!token) {
		throw new Error('Missing end-user token (send X-Clerk-Token with a valid JWT)');
	}

	// Verify the JWT signature using standalone verifyToken function
	// Returns { data, error } in newer Clerk SDK versions
	// Allow 5 minutes clock skew to handle timezone/clock sync issues
	const result = await verifyToken(token, {
		secretKey: env.CLERK_SECRET_KEY,
		clockSkewInMs: 5 * 60 * 1000, // 5 minutes
	});

	// Handle new { data, error } return format
	const verified = 'data' in result ? result.data : result;
	if (!verified || ('error' in result && result.error)) {
		throw new Error('Token verification failed');
	}

	const publicMeta = (verified as any).publicMetadata || {};
	const plan = (publicMeta.plan as PlanTier) || 'free';
	const publishableKeyFromToken = (publicMeta.publishableKey as string) || null;

	// Try to get email from various places in the token
	const email = (verified as any).email ||
		(verified as any).primary_email ||
		publicMeta.email ||
		null;

	return { userId: verified.sub, plan, publishableKeyFromToken, email };
}

/**
 * Endpoints that require end-user JWT verification
 * These are operations where we need to know WHO the end-user is
 */
const ENDPOINTS_REQUIRING_USER_JWT = [
	{ path: '/api/data', method: 'POST' },        // Usage tracking - must know real user
	{ path: '/api/usage', method: 'GET' },        // Usage check - must know real user
	{ path: '/api/create-checkout', method: 'POST' }, // Subscription upgrade - must know who's upgrading
	{ path: '/api/customer-portal', method: 'POST' }, // Billing portal - must know who's managing
];

function requiresEndUserJwt(pathname: string, method: string): boolean {
	return ENDPOINTS_REQUIRING_USER_JWT.some(
		(ep) => ep.path === pathname && ep.method === method
	);
}

/**
 * Endpoints accessible with publishable key only (no secret key required)
 * These are safe for frontend/browser use
 */
const PK_ACCESSIBLE_ENDPOINTS = [
	// Public catalog (PK only, no JWT)
	{ path: '/api/tiers', method: 'GET' },
	{ path: '/api/products', method: 'GET' },
	// Guest checkout for stores (PK only, no JWT)
	{ path: '/api/cart/checkout', method: 'POST' },
	// User operations (PK + JWT required)
	{ path: '/api/data', method: 'POST' },
	{ path: '/api/usage', method: 'GET' },
	{ path: '/api/create-checkout', method: 'POST' },
	{ path: '/api/customer-portal', method: 'POST' },
];

function isPkAccessible(pathname: string, method: string): boolean {
	return PK_ACCESSIBLE_ENDPOINTS.some(
		(ep) => ep.path === pathname && ep.method === method
	);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Validate environment
		const envCheck = validateEnv(env);
		if (!envCheck.valid) {
			console.error('Environment validation failed:', envCheck.missing);
			return new Response(
				JSON.stringify({
					error: 'Server configuration error',
					message: 'Missing required environment variables',
					missing: envCheck.missing,
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// CORS handling
		const corsHeaders = getCorsHeaders(request, env);

		if (request.method === 'OPTIONS') {
			return handlePreflight(corsHeaders);
		}

		const url = new URL(request.url);

		// ====================================================================
		// PUBLIC ENDPOINTS (No Auth Required)
		// ====================================================================

		// Health check
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({ status: 'ok' }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Public asset fetch
		if (url.pathname.startsWith('/api/assets/') && request.method === 'GET') {
			return await handleAssetGet(env, '', url.pathname, corsHeaders);
		}

		// Stripe webhook
		if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
			return await handleStripeWebhook(request, env);
		}

		// ====================================================================
		// API KEY AUTHENTICATION
		// Supports two modes:
		// 1. Secret Key (SK): Full access - Authorization: Bearer sk_xxx
		// 2. Publishable Key (PK): Limited access - X-Publishable-Key: pk_xxx
		// ====================================================================
		const authHeader = request.headers.get('Authorization');
		const pkHeader = request.headers.get('X-Publishable-Key');

		// Check if this is a secret key auth (full access)
		const hasSecretKey = authHeader?.startsWith('Bearer sk_');

		// Check if this is a publishable key auth (limited access)
		const hasPkOnly = !hasSecretKey && pkHeader;

		// If PK-only auth, verify the endpoint is accessible
		if (hasPkOnly) {
			if (!isPkAccessible(url.pathname, request.method)) {
				return new Response(
					JSON.stringify({
						error: 'Forbidden',
						message: 'This endpoint requires a secret key (backend only)',
					}),
					{
						status: 403,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					}
				);
			}

			// Verify the publishable key
			const pkAuth = await verifyPublishableKey(pkHeader, env);
			if (!pkAuth) {
				return new Response(
					JSON.stringify({
						error: 'Invalid publishable key',
						message: 'Publishable key not found or invalid',
					}),
					{
						status: 401,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					}
				);
			}

			const { platformId, publishableKey, mode } = pkAuth;

			// Create Clerk client for JWT verification
			const clerkClient = createClerkClient({
				secretKey: env.CLERK_SECRET_KEY,
				publishableKey: env.CLERK_PUBLISHABLE_KEY,
			});

			// ================================================================
			// PK-ONLY PUBLIC ENDPOINTS (no JWT required)
			// ================================================================

			// Get tiers - Public pricing page
			if (url.pathname === '/api/tiers' && request.method === 'GET') {
				console.log(`[PK Auth] ✅ Public - Platform: ${platformId}, Tiers list`);
				const tiers = await getAllTiers(env, platformId, mode, publishableKey);
				return new Response(JSON.stringify({ tiers }), {
					status: 200,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// List products - Public product catalog
			if (url.pathname === '/api/products' && request.method === 'GET') {
				console.log(`[PK Auth] ✅ Public - Platform: ${platformId}, Products list`);
				return await handleGetProducts(env, platformId, corsHeaders, mode, publishableKey);
			}

			// Cart checkout - Guest checkout (no account needed, email in body)
			if (url.pathname === '/api/cart/checkout' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				console.log(`[PK Auth] ✅ Public - Platform: ${platformId}, Cart checkout`);
				return await handleCartCheckout(platformId, publishableKey, env, corsHeaders, origin, request, mode, publishableKey);
			}

			// ================================================================
			// PK + JWT ENDPOINTS (user must be authenticated)
			// ================================================================

			if (requiresEndUserJwt(url.pathname, request.method)) {
				let userId: string;
				let plan: PlanTier;
				let publishableKeyFromToken: string | null | undefined;
				let userEmail: string | null = null;

				try {
					const verified = await verifyEndUserToken(request, env);
					userId = verified.userId;
					plan = verified.plan;
					publishableKeyFromToken = verified.publishableKeyFromToken;
					userEmail = verified.email || null;
				} catch (tokenError: any) {
					return new Response(
						JSON.stringify({
							error: 'Invalid or missing end-user token',
							message: tokenError?.message || 'Provide X-Clerk-Token with a valid JWT',
						}),
						{
							status: 401,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' },
						}
					);
				}

				// Security: ensure token's publishableKey matches the header PK
				if (publishableKeyFromToken && publishableKeyFromToken !== publishableKey) {
					return new Response(
						JSON.stringify({
							error: 'Publishable key mismatch',
							message: 'End-user token does not match this project',
						}),
						{
							status: 403,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' },
						}
					);
				}

				console.log(`[PK Auth] ✅ JWT verified - Platform: ${platformId}, User: ${userId}, Plan: ${plan}`);

				// Rate limiting (per user)
				const rateCheck = await checkRateLimit(userId, env);
				if (!rateCheck.allowed) {
					return new Response(
						JSON.stringify({
							error: 'Rate limit exceeded',
							message: `Maximum ${RATE_LIMIT_PER_MINUTE} requests per minute`,
							retryAfter: 60,
						}),
						{
							status: 429,
							headers: {
								...corsHeaders,
								'Content-Type': 'application/json',
								'Retry-After': '60',
							},
						}
					);
				}

				// Process request
				if (url.pathname === '/api/data' && request.method === 'POST') {
					return await handleDataRequest(userId, platformId, plan, env, corsHeaders, mode, publishableKey, userEmail);
				}

				if (url.pathname === '/api/usage' && request.method === 'GET') {
					return await handleUsageCheck(userId, platformId, plan, env, corsHeaders, mode, publishableKey);
				}

				if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
					const origin = request.headers.get('Origin') || '';
					return await handleCreateCheckout(userId, platformId, publishableKey, clerkClient, env, corsHeaders, origin, request, mode);
				}

				if (url.pathname === '/api/customer-portal' && request.method === 'POST') {
					const origin = request.headers.get('Origin') || '';
					return await handleCustomerPortal(userId, clerkClient, env, corsHeaders, origin, mode);
				}
			}

			// Should not reach here for PK routes
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// ====================================================================
		// SECRET KEY AUTHENTICATION (Full Access)
		// ====================================================================

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return new Response(
				JSON.stringify({
					error: 'Missing authentication',
					message: 'Provide Authorization: Bearer {secret_key} or X-Publishable-Key header'
				}),
				{
					status: 401,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		const apiKey = authHeader.replace('Bearer ', '');

		try {
			// Verify API key → get platformId + publishableKey
			const authResult = await verifyApiKey(apiKey, env);

			if (!authResult) {
				return new Response(
					JSON.stringify({
						error: 'Invalid API key',
						message: 'API key not found or expired'
					}),
					{
						status: 401,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					}
				);
			}

			const { platformId, publishableKey, mode: keyMode } = authResult;
			const mode = keyMode || (publishableKey?.startsWith('pk_test_') ? 'test' : 'live');

			// Create Clerk client (needed for several routes)
			const clerkClient = createClerkClient({
				secretKey: env.CLERK_SECRET_KEY,
				publishableKey: env.CLERK_PUBLISHABLE_KEY,
			});

			// Get publishableKey from header override or auth result
			const overridePk = request.headers.get('X-Publishable-Key');
			const pkForFilter = overridePk || publishableKey || null;

			// ====================================================================
			// SK-ONLY ENDPOINTS (No end-user JWT required)
			// These are dev operations or don't need user identity
			// ====================================================================

			// Create customer - Dev is creating a customer, no JWT needed
			if (url.pathname === '/api/customers' && request.method === 'POST') {
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Creating customer`);
				return await handleCreateCustomer(platformId, publishableKey, clerkClient, env, corsHeaders, request);
			}

			// Get customer - Dev fetching customer info
			if (url.pathname.startsWith('/api/customers/') && request.method === 'GET') {
				const customerId = url.pathname.replace('/api/customers/', '');
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Getting customer: ${customerId}`);
				return await handleGetCustomer(customerId, platformId, publishableKey, clerkClient, corsHeaders);
			}

			// Update customer - Dev updating customer
			if (url.pathname.startsWith('/api/customers/') && request.method === 'PATCH') {
				const customerId = url.pathname.replace('/api/customers/', '');
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Updating customer: ${customerId}`);
				return await handleUpdateCustomer(customerId, platformId, publishableKey, clerkClient, env, corsHeaders, request);
			}

			// Delete customer - Dev deleting a customer
			if (url.pathname.startsWith('/api/customers/') && request.method === 'DELETE') {
				const customerId = url.pathname.replace('/api/customers/', '');
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Deleting customer: ${customerId}, PK: ${pkForFilter}`);
				return await handleDeleteCustomer(customerId, platformId, pkForFilter || publishableKey, clerkClient, env, corsHeaders);
			}

			// Get tiers - Dev fetching their pricing tiers
			if (url.pathname === '/api/tiers' && request.method === 'GET') {
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Tiers list`);
				const tiers = await getAllTiers(env, platformId, mode, pkForFilter);
				return new Response(JSON.stringify({ tiers }), {
					status: 200,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// Dashboard - Dev viewing their own metrics
			if (url.pathname === '/api/dashboard' && request.method === 'GET') {
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Dashboard`);
				return await handleDashboard(env, platformId, corsHeaders, mode, pkForFilter);
			}

			// Dashboard totals - Dev viewing aggregate metrics
			if (url.pathname === '/api/dashboard/totals' && request.method === 'GET') {
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Dashboard totals`);
				return await handleDashboardTotals(env, platformId, corsHeaders);
			}

			// List products - Public product catalog
			if (url.pathname === '/api/products' && request.method === 'GET') {
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Products list`);
				return await handleGetProducts(env, platformId, corsHeaders, mode, pkForFilter);
			}

			// Cart checkout - Guest checkout (email in body, no account needed)
			if (url.pathname === '/api/cart/checkout' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Cart checkout`);
				return await handleCartCheckout(platformId, pkForFilter || publishableKey, env, corsHeaders, origin, request, mode, pkForFilter);
			}

			// Upload assets - Dev uploading assets
			if (url.pathname === '/api/assets' && request.method === 'POST') {
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Asset upload`);
				return await handleAssetUpload(env, platformId, corsHeaders, request);
			}

			// Serve assets (authenticated) - Already have public route above, this is for private assets
			if (url.pathname.startsWith('/api/assets/') && request.method === 'GET') {
				console.log(`[Auth] ✅ SK-only - Platform: ${platformId}, Asset get`);
				return await handleAssetGet(env, platformId, url.pathname, corsHeaders);
			}

			// ====================================================================
			// JWT-REQUIRED ENDPOINTS (Need end-user identity)
			// These operations must know WHO the end-user is
			// ====================================================================

			if (requiresEndUserJwt(url.pathname, request.method)) {
				let userId: string;
				let plan: PlanTier;
				let publishableKeyFromToken: string | null | undefined;
				let userEmail: string | null = null;

				try {
					const verified = await verifyEndUserToken(request, env);
					userId = verified.userId;
					plan = verified.plan;
					publishableKeyFromToken = verified.publishableKeyFromToken;
					userEmail = verified.email || null;
				} catch (tokenError: any) {
					return new Response(
						JSON.stringify({
							error: 'Invalid or missing end-user token',
							message: tokenError?.message || 'Provide X-Clerk-Token with a valid JWT',
						}),
						{
							status: 401,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' },
						}
					);
				}

				// Security: ensure token's publishableKey matches the secret key's project
				if (publishableKeyFromToken && publishableKeyFromToken !== publishableKey) {
					return new Response(
						JSON.stringify({
							error: 'Publishable key mismatch',
							message: 'End-user token does not match this project',
						}),
						{
							status: 403,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' },
						}
					);
				}

				console.log(`[Auth] ✅ JWT verified - Platform: ${platformId}, User: ${userId}, Plan: ${plan}`);

				// Rate limiting (per user)
				const rateCheck = await checkRateLimit(userId, env);
				if (!rateCheck.allowed) {
					return new Response(
						JSON.stringify({
							error: 'Rate limit exceeded',
							message: `Maximum ${RATE_LIMIT_PER_MINUTE} requests per minute`,
							retryAfter: 60,
						}),
						{
							status: 429,
							headers: {
								...corsHeaders,
								'Content-Type': 'application/json',
								'Retry-After': '60',
							},
						}
					);
				}

				// Process request and track usage
				if (url.pathname === '/api/data' && request.method === 'POST') {
					return await handleDataRequest(userId, platformId, plan, env, corsHeaders, mode, pkForFilter, userEmail);
				}

				// Get current usage and limits
				if (url.pathname === '/api/usage' && request.method === 'GET') {
					return await handleUsageCheck(userId, platformId, plan, env, corsHeaders, mode, pkForFilter);
				}

				// Create Stripe Checkout session (subscription upgrade)
				if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
					const origin = request.headers.get('Origin') || '';
					return await handleCreateCheckout(userId, platformId, publishableKey, clerkClient, env, corsHeaders, origin, request, mode);
				}

				// Customer portal (billing management)
				if (url.pathname === '/api/customer-portal' && request.method === 'POST') {
					const origin = request.headers.get('Origin') || '';
					return await handleCustomerPortal(userId, clerkClient, env, corsHeaders, origin, mode);
				}
			}

			// 404
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('API key verification failed:', error);
			return new Response(JSON.stringify({ error: 'Invalid API key' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
