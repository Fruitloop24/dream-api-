/**
 * ============================================================================
 * dream-api - MULTI-TENANT USAGE TRACKING API
 * ============================================================================
 *
 * THE FLOW:
 * 1. Customer pays YOU on dream-api.com (front-auth-api, Clerk App #1)
 * 2. JWT unlocks config page
 * 3. Customer configures tiers, connects Stripe
 * 4. You generate: platformId + API key
 * 5. Customer uses API key in their app
 * 6. Their end-users → their auth (Clerk App #2, Supabase, custom, whatever)
 * 7. Their backend → hits this API with: API key + userId + plan
 * 8. We track usage, enforce limits, handle Stripe billing
 *
 * FEATURES:
 * - API key authentication (identifies customer via platformId)
 * - Multi-tenant isolation (each customer's data separate in KV)
 * - Usage tracking with tier limits (edge-replicated KV)
 * - Stripe checkout + webhooks + customer portal (uses customer's Stripe)
 * - Rate limiting (100 req/min per user)
 * - Monthly billing period resets
 *
 * MULTI-TENANCY:
 * - platformId from API key verification
 * - Each customer's config: user:{platformId}:tierConfig
 * - Each end-user tracked: usage:{platformId}:{userId}
 * - Stripe keys per customer: platform:{platformId}:stripe
 *
 * SEPARATION OF CONCERNS:
 * - frontend + front-auth-api = YOUR payment platform (Clerk App #1)
 * - api-multi = Usage tracking API (API key based, no Clerk needed)
 * - Customer can use ANY auth for their users
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
import { handleDashboard } from './routes/dashboard';

// Utilities
import { validateEnv } from './utils';

// ============================================================================
// MAIN FETCH HANDLER
// ============================================================================

export default {
	/**
	 * Main request handler for Cloudflare Worker
	 *
	 * FLOW:
	 * 1. Validate environment variables (fails fast if misconfigured)
	 * 2. Handle CORS preflight (OPTIONS requests)
	 * 3. Check health endpoint (no auth required)
	 * 4. Handle Stripe webhook (signature verification, no JWT)
	 * 5. Verify JWT token for protected routes
	 * 6. Check rate limiting (100 req/min per user)
	 * 7. Route to appropriate handler
	 *
	 * SECURITY:
	 * - Security headers on all responses (CSP, HSTS, X-Frame-Options, etc)
	 * - Dynamic CORS validation (no wildcard)
	 * - JWT verification on every protected request
	 * - Rate limiting per user
	 * - Stripe webhook signature verification
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		// ====================================================================
		// STEP 1: VALIDATE ENVIRONMENT (Fast Fail)
		// ====================================================================
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

		// ====================================================================
		// STEP 2: CORS HANDLING (Dynamic Origin Validation)
		// ====================================================================
		const corsHeaders = getCorsHeaders(request, env);

		// Handle CORS preflight (OPTIONS requests)
		if (request.method === 'OPTIONS') {
			return handlePreflight(corsHeaders);
		}

		const url = new URL(request.url);

		// ====================================================================
		// STEP 3: PUBLIC ENDPOINTS (No Auth Required)
		// ====================================================================

		// Health check endpoint
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

		// Stripe webhook (signature verification inside handler)
		if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
			return await handleStripeWebhook(request, env);
		}

		// ====================================================================
		// STEP 4: API KEY AUTHENTICATION
		// ====================================================================
		/**
		 * AUTHENTICATION FLOW:
		 * 1. Customer sends API key (from YOUR dashboard after paying)
		 * 2. We verify API key → get platformId
		 * 3. Customer sends userId (from THEIR Clerk app or any auth)
		 * 4. Customer sends plan tier (free/pro/etc)
		 * 5. We track usage per platformId + userId
		 *
		 * SEPARATION:
		 * - front-auth-api = YOUR customers (Clerk App #1)
		 * - api-multi = THEIR end-users (Clerk App #2, optional)
		 * - Customer can use ANY auth for their users (Clerk, Supabase, custom)
		 * - We just need: API key + userId + plan
		 *
		 * KV STRUCTURE:
		 * - apikey:{hash} → platformId
		 * - platform:{platformId}:stripe → Their Stripe keys
		 * - user:{platformId}:tierConfig → Their pricing tiers
		 * - usage:{platformId}:{userId} → End-user usage tracking
		 */
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
			console.log('[Auth] Verifying API key...');
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

			const { platformId, publishableKey } = authResult;

			// Get userId from header (customer identifies their end-user)
			const userId = request.headers.get('X-User-Id') || 'anonymous';

			// Get plan from header (customer specifies tier)
			const planHeader = request.headers.get('X-User-Plan');
			let plan: PlanTier = (planHeader as PlanTier) || 'free';

			// If no plan specified, default to free tier from config
			if (!plan || plan === 'free') {
				const allTiers = await getAllTiers(env, platformId);
				const freeTier = allTiers.find(t => t.price === 0) || allTiers[0];
				plan = (freeTier?.id || 'free') as PlanTier;
			}

			console.log(`[Auth] ✅ Verified - Platform: ${platformId}, User: ${userId}, Plan: ${plan}`);

			// Create Clerk client for Stripe endpoints (uses shared app)
			const clerkClient = createClerkClient({
				secretKey: env.CLERK_SECRET_KEY,
				publishableKey: env.CLERK_PUBLISHABLE_KEY,
			});

			// ====================================================================
			// STEP 5: RATE LIMITING (100 req/min per user)
			// ====================================================================
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

			console.log(`✅ User ${userId} authenticated with plan: ${plan}`);

			// ====================================================================
			// STEP 6: ROUTE TO HANDLERS
			// ====================================================================

			// Process request and track usage
			if (url.pathname === '/api/data' && request.method === 'POST') {
				try {
					return await handleDataRequest(userId, platformId, plan, env, corsHeaders);
				} catch (err) {
					console.error('[Data] Handler error:', err);
					return new Response(
						JSON.stringify({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }),
						{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
					);
				}
			}

			// Get current usage and limits
			if (url.pathname === '/api/usage' && request.method === 'GET') {
				return await handleUsageCheck(userId, platformId, plan, env, corsHeaders);
			}

			// Dashboard aggregate (customers, tiers, metrics)
			if (url.pathname === '/api/dashboard' && request.method === 'GET') {
				return await handleDashboard(env, platformId, corsHeaders);
			}

			// Create Stripe Checkout session (upgrade flow)
			if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				return await handleCreateCheckout(userId, platformId, publishableKey, clerkClient, env, corsHeaders, origin, request);
			}

			// Create Stripe Customer Portal session (manage subscription)
			if (url.pathname === '/api/customer-portal' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				return await handleCustomerPortal(userId, clerkClient, env, corsHeaders, origin);
			}

			// ====================================================================
			// CUSTOMER MANAGEMENT ENDPOINTS
			// ====================================================================

			// Create a new customer in end-user-api Clerk
			if (url.pathname === '/api/customers' && request.method === 'POST') {
				return await handleCreateCustomer(platformId, publishableKey, clerkClient, env, corsHeaders, request);
			}

			// Get a customer by ID
			if (url.pathname.startsWith('/api/customers/') && request.method === 'GET') {
				const customerId = url.pathname.replace('/api/customers/', '');
				return await handleGetCustomer(customerId, platformId, publishableKey, clerkClient, corsHeaders);
			}

			// Update a customer's plan
			if (url.pathname.startsWith('/api/customers/') && request.method === 'PATCH') {
				const customerId = url.pathname.replace('/api/customers/', '');
				return await handleUpdateCustomer(customerId, platformId, publishableKey, clerkClient, corsHeaders, request);
			}

			// 404 - Route not found
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
