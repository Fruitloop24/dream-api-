/**
 * ============================================================================
 * STRIPE CHECKOUT ROUTES - dream-api
 * ============================================================================
 *
 * ENDPOINTS:
 * POST /api/create-checkout    - Create Stripe Checkout session (upgrade flow)
 * POST /api/customer-portal    - Create Stripe Customer Portal session (billing)
 *
 * PURPOSE:
 * Let end-users upgrade to paid tiers and manage their subscriptions.
 * Stripe handles payment processing, we just create sessions and handle webhooks.
 *
 * CURRENT LIMITATION:
 * These endpoints require Clerk JWT (to get user email).
 * TODO: Support API key mode (get email from request body or X-User-Email header)
 *
 * MULTI-TENANT:
 * - Gets tier config from user:{platformId}:tierConfig
 * - Gets Stripe price IDs per developer
 * - Each developer can have custom pricing
 *
 * ============================================================================
 */

import { Env } from '../types';
import { getPriceIdMap } from '../config/configLoader';
import type { ClerkClient } from '@clerk/backend'; // Import ClerkClient type

/**
 * Handle /api/create-checkout - Create Stripe Checkout session
 *
 * FLOW:
 * 1. Get user email from Clerk
 * 2. Get target tier from request body (or default to first paid tier)
 * 3. Get Stripe Price ID from platformId's tier config
 * 4. Create Stripe Checkout session
 * 5. Return checkout URL for redirect
 *
 * STRIPE CHECKOUT FLOW:
 * 1. User clicks "Upgrade to Pro"
 * 2. Frontend calls this endpoint
 * 3. Frontend redirects to Stripe Checkout URL
 * 4. User enters payment info on Stripe
 * 5. Stripe redirects back to success_url
 * 6. Stripe webhook updates Clerk metadata (see stripe-webhook.ts)
 *
 * @param userId - End-user ID (from JWT)
 * @param platformId - Developer's platform ID (from JWT metadata or API key)
 * @param clerkClient - Clerk client (to get user email)
 * @param env - Worker environment
 * @param corsHeaders - CORS headers
 * @param origin - Request origin (for success/cancel URLs)
 * @param request - Full request (for body parsing)
 */
export async function handleCreateCheckout(
	userId: string,
	platformId: string,
	clerkClient: ClerkClient,
	env: Env,
	corsHeaders: Record<string, string>,
	origin: string,
	request: Request
): Promise<Response> {
	try {
		// Get target tier and price ID from request body
		const body = await request.json().catch((err) => {
			console.error('❌ Failed to parse request body:', err);
			return {};
		}) as { tier?: string; priceId?: string };
		console.log(`[Checkout] Request body: ${JSON.stringify(body)}`);

		const targetTier = body.tier || 'pro';
		let priceId = body.priceId || '';

		console.log(`[Checkout] userId: ${userId}, targetTier: ${targetTier}`);

		// Get user email from Clerk
		const user = await clerkClient.users.getUser(userId);
		const userEmail = user.emailAddresses[0]?.emailAddress || '';

		// If no priceId provided, load from config (multi-tenant using platformId)
		if (!priceId) {
			console.log(`🔍 Loading price ID from config for tier: ${targetTier}, platformId: ${platformId}`);
			const priceIdMap = await getPriceIdMap(env, platformId);
			console.log(`[Checkout] Price ID Map from KV: ${JSON.stringify(priceIdMap)}`);
			priceId = priceIdMap[targetTier] || '';
			console.log(`💳 Loaded price ID: ${priceId}`);
		}

		console.log(`🎯 Checkout requested for tier: ${targetTier}, priceId: ${priceId}`);

		if (!priceId || priceId === 'null') {
			console.error(`❌ No price ID configured for tier: ${targetTier}`);
			throw new Error(`No price ID configured for tier: ${targetTier}`);
		}

		// Use origin from request for success/cancel URLs (handles changing hash URLs)
		const frontendUrl = origin || 'https://app.panacea-tech.net';

		// Create Stripe checkout session
		const checkoutSession = await fetch('https://api.stripe.com/v1/checkout/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				'success_url': `${frontendUrl}/dashboard?success=true`,
				'cancel_url': `${frontendUrl}/dashboard?canceled=true`,
				'customer_email': userEmail,
				'client_reference_id': userId,
				'mode': 'subscription',
				'line_items[0][price]': priceId,
				'line_items[0][quantity]': '1',
				'metadata[userId]': userId,
				'metadata[tier]': targetTier,
				'subscription_data[metadata][userId]': userId,
				'subscription_data[metadata][tier]': targetTier,
			}).toString(),
		});

		const session = await checkoutSession.json() as { url?: string; error?: { message: string } };

		if (!checkoutSession.ok) {
			throw new Error(session.error?.message || 'Failed to create checkout session');
		}

		return new Response(
			JSON.stringify({ url: session.url }),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: unknown) {
		console.error('Checkout error:', error);
		return new Response(
			JSON.stringify({ error: (error as Error).message || 'Failed to create checkout' }),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}

/**
 * Handle /api/customer-portal - Create Stripe Customer Portal session
 *
 * WHAT THIS DOES:
 * 1. Gets user's Stripe customer ID from Clerk metadata
 * 2. Creates Stripe Customer Portal session
 * 3. Returns portal URL for redirect
 *
 * CUSTOMER PORTAL ALLOWS:
 * - Update payment methods
 * - View invoices and payment history
 * - Cancel or pause subscriptions
 * - Update billing information
 */
export async function handleCustomerPortal(
	userId: string,
	clerkClient: ClerkClient,
	env: Env,
	corsHeaders: Record<string, string>,
	origin: string
): Promise<Response> {
	try {
		// Get user from Clerk to retrieve Stripe customer ID
		const user = await clerkClient.users.getUser(userId);
		const stripeCustomerId = user.publicMetadata?.stripeCustomerId as string;

		if (!stripeCustomerId) {
			return new Response(
				JSON.stringify({ error: 'No active subscription found' }),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		// Use origin from request for return URL
		const frontendUrl = origin || 'https://app.panacea-tech.net';

		// Build portal session params
		const portalParams: Record<string, string> = {
			'customer': stripeCustomerId,
			'return_url': `${frontendUrl}/dashboard`,
		};

		// Add portal configuration ID if provided in env
		if (env.STRIPE_PORTAL_CONFIG_ID) {
			portalParams['configuration'] = env.STRIPE_PORTAL_CONFIG_ID;
		}

		// Create Stripe billing portal session
		const portalSession = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(portalParams).toString(),
		});

		const session = await portalSession.json() as { url?: string; error?: { message: string } };

		if (!portalSession.ok) {
			throw new Error(session.error?.message || 'Failed to create portal session');
		}

		return new Response(
			JSON.stringify({ url: session.url }),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: unknown) {
		console.error('Customer portal error:', error);
		return new Response(
			JSON.stringify({ error: (error as Error).message || 'Failed to create portal session' }),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}
