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

import { createClerkClient } from '@clerk/backend';
import { handleStripeWebhook } from './stripe-webhook';

// Type definitions
import { Env, PlanTier } from './types';

// Configuration
import { RATE_LIMIT_PER_MINUTE } from './config/tiers';
import { getAllTiers } from './config/configLoader';

// Middleware
import { getCorsHeaders, handlePreflight } from './middleware/cors';
import { checkRateLimit } from './middleware/rateLimit';
import { verifyApiKey } from './middleware/apiKey';

// Routes
import { handleDataRequest, handleUsageCheck } from './routes/usage';
import { handleCreateCheckout, handleCustomerPortal } from './routes/checkout';
import { handleCreateCustomer, handleGetCustomer, handleUpdateCustomer } from './routes/customers';
import { handleDashboard, handleDashboardTotals } from './routes/dashboard';
import { handleCartCheckout, handleGetProducts } from './routes/products';
import { handleAssetGet, handleAssetUpload } from './routes/assets';

// Utilities
import { validateEnv } from './utils';

async function verifyEndUserToken(
	request: Request,
	env: Env
): Promise<{ userId: string; plan: PlanTier; publishableKeyFromToken?: string | null }> {
	const token =
		request.headers.get('X-Clerk-Token') ||
		request.headers.get('X-User-Token') ||
		request.headers.get('X-End-User-Token');

	if (!token) {
		// TEMP: allow header-based fallback for testing; remove this after adding frontend token plumbing
		const userIdFallback = request.headers.get('X-User-Id');
		const planHeader = request.headers.get('X-User-Plan') as PlanTier | null;
		if (userIdFallback && planHeader) {
			return { userId: userIdFallback, plan: planHeader, publishableKeyFromToken: null };
		}
		throw new Error('Missing end-user token (send X-Clerk-Token or X-User-Token)');
	}

	const clerkClient = createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
	});

	const verified = await clerkClient.verifyToken(token, {
		template: env.CLERK_JWT_TEMPLATE,
	});

	const publicMeta = (verified as any).publicMetadata || {};
	const plan = (publicMeta.plan as PlanTier) || 'free';
	const publishableKeyFromToken = (publicMeta.publishableKey as string) || null;

	return { userId: verified.sub, plan, publishableKeyFromToken };
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

		// Get available tiers (public pricing info)
		if (url.pathname === '/api/tiers' && request.method === 'GET') {
			const tiers = await getAllTiers(env);
			return new Response(JSON.stringify({ tiers }), {
				status: 200,
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
		// ====================================================================
		const authHeader = request.headers.get('Authorization');

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return new Response(
				JSON.stringify({
					error: 'Missing authentication',
					message: 'Authorization header required: Bearer {api_key}'
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

			// Verify end-user JWT to derive user + plan (stateless, no DB lookup)
			let userId: string;
			let plan: PlanTier;
			let publishableKeyFromToken: string | null | undefined;

			try {
				const verified = await verifyEndUserToken(request, env);
				userId = verified.userId;
				plan = verified.plan;
				publishableKeyFromToken = verified.publishableKeyFromToken;
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

			// Optional safety: ensure token scope matches the project tied to the secret key
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

			console.log(`[Auth] ✅ Verified - Platform: ${platformId}, User: ${userId}, Plan: ${plan}`);

			// Create Clerk client
			const clerkClient = createClerkClient({
				secretKey: env.CLERK_SECRET_KEY,
				publishableKey: env.CLERK_PUBLISHABLE_KEY,
			});

			// Rate limiting
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

			// ====================================================================
			// ROUTE TO HANDLERS
			// ====================================================================

			// Get publishableKey from header override or auth result
			const overridePk = request.headers.get('X-Publishable-Key');
			const pkForFilter = overridePk || publishableKey || null;

			// Process request and track usage
			if (url.pathname === '/api/data' && request.method === 'POST') {
				return await handleDataRequest(userId, platformId, plan, env, corsHeaders, mode, pkForFilter);
			}

			// Get current usage and limits
			if (url.pathname === '/api/usage' && request.method === 'GET') {
				return await handleUsageCheck(userId, platformId, plan, env, corsHeaders, mode, pkForFilter);
			}

			// Dashboard aggregate
			if (url.pathname === '/api/dashboard' && request.method === 'GET') {
				return await handleDashboard(env, platformId, corsHeaders, mode, pkForFilter);
			}

			// All-live totals
			if (url.pathname === '/api/dashboard/totals' && request.method === 'GET') {
				return await handleDashboardTotals(env, platformId, corsHeaders);
			}

			// Create Stripe Checkout session
			if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				return await handleCreateCheckout(userId, platformId, publishableKey, clerkClient, env, corsHeaders, origin, request, mode);
			}

			// List products
			if (url.pathname === '/api/products' && request.method === 'GET') {
				return await handleGetProducts(env, platformId, corsHeaders, mode, pkForFilter);
			}

			// Upload assets
			if (url.pathname === '/api/assets' && request.method === 'POST') {
				return await handleAssetUpload(env, platformId, corsHeaders, request);
			}

			// Serve assets
			if (url.pathname.startsWith('/api/assets/') && request.method === 'GET') {
				return await handleAssetGet(env, platformId, url.pathname, corsHeaders);
			}

			// Cart checkout
			if (url.pathname === '/api/cart/checkout' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				return await handleCartCheckout(platformId, pkForFilter || publishableKey, env, corsHeaders, origin, request, mode, pkForFilter);
			}

			// Customer portal
			if (url.pathname === '/api/customer-portal' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				return await handleCustomerPortal(userId, clerkClient, env, corsHeaders, origin, mode);
			}

			// Create customer
			if (url.pathname === '/api/customers' && request.method === 'POST') {
				return await handleCreateCustomer(platformId, publishableKey, clerkClient, env, corsHeaders, request);
			}

			// Get customer
			if (url.pathname.startsWith('/api/customers/') && request.method === 'GET') {
				const customerId = url.pathname.replace('/api/customers/', '');
				return await handleGetCustomer(customerId, platformId, publishableKey, clerkClient, corsHeaders);
			}

			// Update customer
			if (url.pathname.startsWith('/api/customers/') && request.method === 'PATCH') {
				const customerId = url.pathname.replace('/api/customers/', '');
				return await handleUpdateCustomer(customerId, platformId, publishableKey, clerkClient, corsHeaders, request);
			}

			// 404
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('Token verification failed:', error);
			return new Response(JSON.stringify({ error: 'Invalid token' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
