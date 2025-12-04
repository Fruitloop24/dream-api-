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
 *    - It WRITES the generated `platformId` here: `user:{userId}:platformId`
 *
 * 2. CUSTOMER_TOKENS_KV: The TOKENS_KV from `api-multi`.
 *    - It WRITES the Stripe credentials here: `platform:{platformId}:stripe`
 *
 * DATA FLOW:
 * 1. Frontend calls `/authorize` with the developer's `userId`.
 * 2. Worker stores `userId` in a temporary state key and redirects to Stripe.
 * 3. User authorizes on Stripe and is redirected to `/callback`.
 * 4. Worker verifies state, retrieves `userId`, and generates `platformId` (pk_live_xxx).
 * 5. Worker exchanges code for Stripe token.
 * 6. Worker saves `platformId` to PLATFORM_TOKENS_KV and Stripe token to CUSTOMER_TOKENS_KV.
 * 7. Worker redirects to `/api-tier-config?stripe=connected`.
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

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Handle Stripe Connect authorization request
    if (url.pathname === '/authorize') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response('Missing userId parameter', { status: 400 });
      }

      const state = crypto.randomUUID(); // CSRF protection
      const stripeUrl = new URL('https://connect.stripe.com/oauth/authorize');
      stripeUrl.searchParams.set('response_type', 'code');
      stripeUrl.searchParams.set('client_id', env.STRIPE_CLIENT_ID);
      stripeUrl.searchParams.set('scope', 'read_write');
      stripeUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
      stripeUrl.searchParams.set('state', state);

      // Store the userId in state (we'll generate platformId in callback)
      await env.PLATFORM_TOKENS_KV.put(`oauth:state:${state}`, userId, { expirationTtl: 600 }); // 10-minute expiry

      return Response.redirect(stripeUrl.toString(), 302);
    }

    // Handle Stripe Connect callback
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response('Missing code or state parameter', { status: 400 });
      }

      // Verify the state and retrieve the userId
      const userId = await env.PLATFORM_TOKENS_KV.get(`oauth:state:${state}`);
      if (!userId) {
        return new Response('Invalid or expired state. Please try again.', { status: 400 });
      }
      // Delete the state key now that it has been used
      await env.PLATFORM_TOKENS_KV.delete(`oauth:state:${state}`);

      // Generate platformId (publishableKey pattern: pk_live_xxx)
      const platformId = `pk_live_${crypto.randomUUID().replace(/-/g, '')}`;

      // Store platformId in PLATFORM_TOKENS_KV
      await env.PLATFORM_TOKENS_KV.put(`user:${userId}:platformId`, platformId);

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

    // Create Stripe products on developer's connected account
    if (url.pathname === '/create-products' && request.method === 'POST') {
      const body = await request.json() as {
        userId: string;
        tiers: Array<{
          name: string;
          displayName: string;
          price: number;
          limit: number | 'unlimited';
          features: string;
          popular: boolean;
        }>;
      };

      const { userId, tiers } = body;

      if (!userId || !tiers || tiers.length === 0) {
        return new Response('Missing userId or tiers', { status: 400 });
      }

      // Get platformId (created during OAuth callback)
      const platformId = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:platformId`);
      if (!platformId) {
        return new Response('Platform ID not found. Please connect Stripe first.', { status: 404 });
      }

      // Get Stripe credentials from CUSTOMER_TOKENS_KV
      const stripeDataJson = await env.CUSTOMER_TOKENS_KV.get(`platform:${platformId}:stripe`);
      if (!stripeDataJson) {
        return new Response('Stripe credentials not found.', { status: 404 });
      }

      const stripeData = JSON.parse(stripeDataJson) as { accessToken: string; stripeUserId: string };

      // Create Stripe products on THEIR account
      const priceIds: Array<{ tier: string; priceId: string; productId: string }> = [];

      try {
        for (const tier of tiers) {
          // Create product
          const productResponse = await fetch('https://api.stripe.com/v1/products', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeData.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              name: tier.displayName,
              description: tier.features,
              'metadata[platformId]': platformId,
              'metadata[tierName]': tier.name,
            }),
          });

          if (!productResponse.ok) {
            const error = await productResponse.text();
            throw new Error(`Failed to create product: ${error}`);
          }

          const product = await productResponse.json() as { id: string };

          // Create price (recurring monthly)
          const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeData.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              product: product.id,
              unit_amount: (tier.price * 100).toString(),
              currency: 'usd',
              'recurring[interval]': 'month',
              'metadata[platformId]': platformId,
              'metadata[tierName]': tier.name,
            }),
          });

          if (!priceResponse.ok) {
            const error = await priceResponse.text();
            throw new Error(`Failed to create price: ${error}`);
          }

          const price = await priceResponse.json() as { id: string };

          priceIds.push({
            tier: tier.name,
            priceId: price.id,
            productId: product.id,
          });
        }

        // Generate secretKey (API key for developer)
        const secretKey = `sk_live_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;

        // Hash secretKey for storage
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secretKey));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        // Store secretKey (bidirectional lookup)
        await env.PLATFORM_TOKENS_KV.put(`user:${userId}:apiKey`, secretKey);
        await env.PLATFORM_TOKENS_KV.put(`apikey:${hashHex}`, platformId);

        // Store tier config in CUSTOMER_TOKENS_KV
        const tierConfig = tiers.map((tier, i) => ({
          ...tier,
          priceId: priceIds[i].priceId,
          productId: priceIds[i].productId,
        }));

        await env.CUSTOMER_TOKENS_KV.put(
          `platform:${platformId}:tierConfig`,
          JSON.stringify({ tiers: tierConfig })
        );

        console.log(`[Products] Created ${priceIds.length} products for platform ${platformId}`);

        return new Response(
          JSON.stringify({
            success: true,
            platformId,
            secretKey,
            products: priceIds,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('[Products] Error:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create products' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};