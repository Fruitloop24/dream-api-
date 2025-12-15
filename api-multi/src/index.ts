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

			const { platformId, publishableKey, mode: keyMode, projectType } = authResult;
			const mode = keyMode || (publishableKey?.startsWith('pk_test_') ? 'test' : 'live');

			// Get userId from header
			const userId = request.headers.get('X-User-Id') || 'anonymous';

			// Get plan from header
			const planHeader = request.headers.get('X-User-Plan');
			let plan: PlanTier = (planHeader as PlanTier) || 'free';

			// If no plan specified, default to free tier from config
			if (!plan || plan === 'free') {
				const allTiers = await getAllTiers(env, platformId, mode, publishableKey || undefined);
				const freeTier = allTiers.find(t => t.price === 0) || allTiers[0];
				plan = (freeTier?.id || 'free') as PlanTier;
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
