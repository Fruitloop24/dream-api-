/**
 * ============================================================================
 * OAUTH-API - Stripe Connect Handler for dream-api
 * ============================================================================
 *
 * PURPOSE:
 * Securely handle the Stripe Connect OAuth flow. This worker acts as a bridge
 * between the developer platform and the multi-tenant customer API.
 *
 * ARCHITECTURE:
 * This worker requires access to TWO separate KV namespaces to maintain the
 * strict data isolation of the platform.
 *
 * 1. PLATFORM_TOKENS_KV: The TOKENS_KV from `front-auth-api`.
 *    - It READS from here to find the `platformId` for a given `userId`.
 *
 * 2. CUSTOMER_TOKENS_KV: The TOKENS_KV from `api-multi`.
 *    - It WRITES the resulting Stripe credentials here, associated with the
 *      developer's `platformId`.
 *
 * DATA FLOW:
 * 1. Frontend calls `/authorize` with the developer's `userId`.
 * 2. Worker looks up `user:{userId}:platformId` in PLATFORM_TOKENS_KV.
 * 3. Worker stores `platformId` in a temporary state key and redirects to Stripe.
 * 4. User authorizes on Stripe and is redirected to `/callback`.
 * 5. Worker verifies state, gets `platformId`, and exchanges the code for a Stripe token.
 * 6. Worker saves the Stripe token to `platform:{platformId}:stripe` in CUSTOMER_TOKENS_KV.
 * 7. Worker redirects back to the frontend dashboard.
 *
 * ============================================================================
 */

/// <reference types="@cloudflare/workers-types" />

interface Env {
  // KV Bindings (must be configured in wrangler.toml)
  PLATFORM_TOKENS_KV: KVNamespace;
  CUSTOMER_TOKENS_KV: KVNamespace;

  // Stripe Connect OAuth App credentials
  STRIPE_CLIENT_ID: string;
  STRIPE_CLIENT_SECRET: string;

  // URL to redirect back to after success/failure
  FRONTEND_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle Stripe Connect authorization request
    if (url.pathname === '/authorize') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response('Missing userId parameter', { status: 400 });
      }

      // Look up the platformId from the developer's userId.
      const platformId = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:platformId`);
      if (!platformId) {
        return new Response(`Could not find platformId for user ${userId}`, { status: 404 });
      }

      const state = crypto.randomUUID(); // CSRF protection
      const stripeUrl = new URL('https://connect.stripe.com/oauth/authorize');
      stripeUrl.searchParams.set('response_type', 'code');
      stripeUrl.searchParams.set('client_id', env.STRIPE_CLIENT_ID);
      stripeUrl.searchParams.set('scope', 'read_write');
      stripeUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
      stripeUrl.searchParams.set('state', state);

      // Store the platformId in the state object for retrieval in the callback.
      // This is the crucial link between the two systems.
      await env.PLATFORM_TOKENS_KV.put(`oauth:state:${state}`, platformId, { expirationTtl: 600 }); // 10-minute expiry

      return Response.redirect(stripeUrl.toString(), 302);
    }

    // Handle Stripe Connect callback
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response('Missing code or state parameter', { status: 400 });
      }

      // Verify the state and retrieve the platformId
      const platformId = await env.PLATFORM_TOKENS_KV.get(`oauth:state:${state}`);
      if (!platformId) {
        return new Response('Invalid or expired state. Please try again.', { status: 400 });
      }
      // Delete the state key now that it has been used
      await env.PLATFORM_TOKENS_KV.delete(`oauth:state:${state}`);

      // Exchange the authorization code for a Stripe access token
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
          error?: string;
          error_description?: string;
        };

        if (tokenData.error || !tokenData.access_token || !tokenData.stripe_user_id) {
          console.error('Stripe OAuth Error:', tokenData.error_description);
          return Response.redirect(`${env.FRONTEND_URL}/dashboard?stripe=error`, 302);
        }

        // Store the Stripe credentials in the CUSTOMER_TOKENS_KV,
        // associated with the developer's platformId.
        const stripeCredentials = {
          accessToken: tokenData.access_token,
          stripeUserId: tokenData.stripe_user_id,
        };
        await env.CUSTOMER_TOKENS_KV.put(
          `platform:${platformId}:stripe`,
          JSON.stringify(stripeCredentials)
        );

        // Redirect back to the frontend tier config page after successful OAuth
        return Response.redirect(`${env.FRONTEND_URL}/api-tier-config?stripe=connected`, 302);

      } catch (error) {
        console.error('Failed to exchange Stripe token:', error);
        return new Response('An internal error occurred.', { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};