/**
 * ============================================================================
 * OAUTH ROUTES - Stripe Connect Authorization Flow
 * ============================================================================
 *
 * These routes handle the Stripe Connect OAuth dance. This is how developers
 * connect their Stripe account to our platform so we can create products and
 * process payments on their behalf.
 *
 * FLOW:
 * 1. Frontend calls /authorize with userId
 * 2. We redirect dev to Stripe's OAuth page
 * 3. Dev authorizes, Stripe redirects to /callback with code
 * 4. We exchange code for access token
 * 5. We store token, redirect dev to config page
 *
 * SECURITY:
 * - State parameter prevents CSRF attacks
 * - State stored in KV with 10-minute TTL
 * - platformId must already exist (created at signup)
 *
 * ============================================================================
 */

import { Env } from '../types';
import { ensurePlatform } from '../lib/schema';
import { saveStripeToken } from '../lib/stripe';

/**
 * Build CORS headers with origin validation.
 * Only allows requests from configured origins (your frontend).
 *
 * Configure via ALLOWED_ORIGINS env var (comma-separated) or uses defaults.
 */
export function getCorsHeaders(request?: Request, env?: { ALLOWED_ORIGINS?: string }): Record<string, string> {
  const origin = request?.headers.get('Origin') || '';

  // Default allowed origins (dev + production)
  const defaultAllowedOrigins = [
    'http://localhost:5173',               // Vite dev
    'http://localhost:5174',               // Vite alt
    'http://localhost:8787',               // Wrangler dev
    'http://127.0.0.1:5500',               // Live Server
    'http://localhost:5500',               // Live Server alt
  ];

  // Parse from env or use defaults
  const allowedOrigins = env?.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : defaultAllowedOrigins;

  // Check if origin is allowed (exact match OR Cloudflare Pages preview)
  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.dream-frontend-dyn\.pages\.dev$/.test(origin) ||
    origin === 'https://dream-frontend-dyn.pages.dev';

  // Echo back allowed origin, or use first default as safe fallback
  const finalOrigin = isAllowedOrigin ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': finalOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * GET /authorize
 *
 * Starts the Stripe Connect OAuth flow.
 *
 * SECURITY: Token passed in query param (for browser redirect compatibility).
 * We verify the Clerk session token server-side to extract userId.
 *
 * Query params:
 *   - token: Clerk session token from frontend
 *
 * What happens:
 *   1. Verify Clerk token to get userId
 *   2. Generate random state for CSRF protection
 *   3. Store userId in KV keyed by state (10 min TTL)
 *   4. Redirect to Stripe's OAuth authorize URL
 *
 * After this, Stripe shows their authorization page to the developer.
 */
export async function handleAuthorize(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  // Get token from query param (browser redirect can't send headers)
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({
      error: 'Missing token parameter',
      hint: 'Frontend must pass Clerk session token as ?token=xxx'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify token with Clerk
  let userId: string;
  try {
    const { verifyToken } = await import('@clerk/backend');
    const verified = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    userId = verified.sub;
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Invalid or expired token',
      message: error instanceof Error ? error.message : 'Token verification failed'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate random state for CSRF protection
  // This gets verified in the callback to ensure the request came from us
  const state = crypto.randomUUID();

  // Build Stripe OAuth URL
  const stripeUrl = new URL('https://connect.stripe.com/oauth/authorize');
  stripeUrl.searchParams.set('response_type', 'code');
  stripeUrl.searchParams.set('client_id', env.STRIPE_CLIENT_ID);
  stripeUrl.searchParams.set('scope', 'read_write');
  stripeUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
  stripeUrl.searchParams.set('state', state);

  // Store userId keyed by state so we can retrieve it in callback
  // 10-minute expiry - if they take longer, they need to start over
  await env.PLATFORM_TOKENS_KV.put(
    `oauth:state:${state}`,
    userId,
    { expirationTtl: 600 }
  );

  console.log(`[OAuth] Starting authorization for user ${userId}`);

  return Response.redirect(stripeUrl.toString(), 302);
}

/**
 * GET /callback
 *
 * Stripe redirects here after the developer authorizes.
 *
 * Query params (from Stripe):
 *   - code: Authorization code to exchange for access token
 *   - state: Our CSRF state to verify the request
 *
 * What happens:
 *   1. Verify state matches what we stored (CSRF check)
 *   2. Look up userId from state
 *   3. Get platformId for this user (must already exist from signup)
 *   4. Exchange code for Stripe access token
 *   5. Store token in D1 and KV
 *   6. Redirect to frontend config page
 *
 * After this, the developer can create products.
 */
export async function handleCallback(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Validate required params
  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  // Verify state and get userId - this prevents CSRF attacks
  const userId = await env.PLATFORM_TOKENS_KV.get(`oauth:state:${state}`);
  if (!userId) {
    return new Response(
      'Invalid or expired state. Please try again.',
      { status: 400 }
    );
  }

  // Delete state immediately - it's single-use
  await env.PLATFORM_TOKENS_KV.delete(`oauth:state:${state}`);

  // Get platformId - this should have been created when they signed up
  // If it doesn't exist, something is wrong with their account
  const platformId = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:platformId`);
  if (!platformId) {
    console.error(`[OAuth] No platformId found for user ${userId}`);
    return new Response(
      'Platform ID not found. Please log out and back in.',
      { status: 500 }
    );
  }

  console.log(`[OAuth] Found platformId ${platformId} for user ${userId}`);

  // Exchange authorization code for access token
  try {
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_secret: env.STRIPE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      stripe_user_id?: string;
      refresh_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    // Check for errors from Stripe
    if (tokenData.error || !tokenData.access_token || !tokenData.stripe_user_id) {
      console.error('[OAuth] Stripe error:', tokenData.error_description);
      return Response.redirect(`${env.FRONTEND_URL}/dashboard?stripe=error`, 302);
    }

    // =========================================================================
    // STORE CREDENTIALS
    // We store in multiple places for different access patterns:
    // - D1: Source of truth, queryable
    // - KV: Fast lookups by userId and platformId
    // =========================================================================

    // D1: Ensure platform exists and save Stripe token
    await ensurePlatform(env, platformId, userId);
    await saveStripeToken(
      env,
      platformId,
      tokenData.stripe_user_id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.scope
    );

    // KV: Store for fast lookup by both userId and platformId
    const stripeCredentials = JSON.stringify({
      accessToken: tokenData.access_token,
      stripeUserId: tokenData.stripe_user_id,
    });

    await env.PLATFORM_TOKENS_KV.put(
      `user:${userId}:stripeToken`,
      stripeCredentials
    );
    await env.PLATFORM_TOKENS_KV.put(
      `platform:${platformId}:stripeToken`,
      stripeCredentials
    );

    console.log(`[OAuth] Saved Stripe token for platform ${platformId}`);

    // Redirect to config page - they can now create products
    return Response.redirect(
      `${env.FRONTEND_URL}/api-tier-config?stripe=connected`,
      302
    );

  } catch (error) {
    console.error('[OAuth] Token exchange failed:', error);
    return new Response('An internal error occurred.', { status: 500 });
  }
}
