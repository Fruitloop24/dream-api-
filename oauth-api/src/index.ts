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

import { createClerkClient } from '@clerk/backend';

interface Env {
  // KV Bindings (must be configured in wrangler.toml)
  PLATFORM_TOKENS_KV: KVNamespace;
  CUSTOMER_TOKENS_KV: KVNamespace;
  DB: D1Database;

  // Stripe Connect OAuth App credentials
  STRIPE_CLIENT_ID: string;
  STRIPE_CLIENT_SECRET: string;

  // Clerk credentials (for updating user metadata)
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;

  // URL to redirect back to after success/failure
  FRONTEND_URL: string;
}

async function ensurePlatform(env: Env, platformId: string, userId: string) {
  await env.DB.prepare('INSERT OR IGNORE INTO platforms (platformId, clerkUserId) VALUES (?, ?)')
    .bind(platformId, userId)
    .run();
}

async function saveStripeToken(
  env: Env,
  platformId: string,
  stripeUserId: string,
  accessToken: string,
  refreshToken?: string,
  scope?: string
) {
  await env.DB.prepare(
    'INSERT OR REPLACE INTO stripe_tokens (platformId, stripeUserId, accessToken, refreshToken, scope) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(platformId, stripeUserId, accessToken, refreshToken ?? null, scope ?? null)
    .run();
}

async function upsertApiKey(
  env: Env,
  platformId: string,
  publishableKey: string,
  secretKeyHash: string
) {
  await env.DB.prepare(
    'INSERT OR REPLACE INTO api_keys (platformId, publishableKey, secretKeyHash, status) VALUES (?, ?, ?, ?)'
  )
    .bind(platformId, publishableKey, secretKeyHash, 'active')
    .run();
}

type TierInput = {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  billingMode?: 'subscription' | 'one_off';
  description?: string;
  imageUrl?: string;
  inventory?: number | null;
  features?: string | string[];
  popular?: boolean;
  priceId: string;
  productId: string;
};

async function upsertTiers(env: Env, platformId: string, tiers: TierInput[]) {
  const stmt = env.DB.prepare(
    'INSERT OR REPLACE INTO tiers (platformId, name, displayName, price, "limit", features, popular, priceId, productId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const tier of tiers) {
    const featuresStr = JSON.stringify({
      description: tier.description || '',
      features: tier.features || [],
      billingMode: tier.billingMode || 'subscription',
      imageUrl: tier.imageUrl || '',
      inventory: tier.inventory ?? null,
    });
    const popularFlag = tier.popular ? 1 : 0;

    await stmt
      .bind(
        platformId,
        tier.name,
        tier.displayName,
        tier.price,
        tier.limit === 'unlimited' ? null : tier.limit,
        featuresStr,
        popularFlag,
        tier.priceId,
        tier.productId
      )
      .run();
  }
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

      // READ platformId (should already exist - created IMMEDIATELY after login)
      const platformId = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:platformId`);
      if (!platformId) {
        console.error(`[OAuth] No platformId found for user ${userId} - this should have been created at login!`);
        return new Response('Platform ID not found. Please log out and back in.', { status: 500 });
      }

      console.log(`[OAuth] Found platformId for user ${userId}: ${platformId}`);

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

        // Ensure platform exists in D1 and store Stripe token (SSOT)
        await ensurePlatform(env, platformId, userId);
        await saveStripeToken(
          env,
          platformId,
          tokenData.stripe_user_id,
          tokenData.access_token,
          (tokenData as any).refresh_token,
          (tokenData as any).scope
        );

        // Store Stripe credentials in PLATFORM_TOKENS_KV (front-auth-api namespace)
        // This is the MAIN namespace for dev data
        const stripeCredentials = {
          accessToken: tokenData.access_token,
          stripeUserId: tokenData.stripe_user_id,
        };

        // Save under BOTH userId and platformId for easy lookup
        await env.PLATFORM_TOKENS_KV.put(
          `user:${userId}:stripeToken`,
          JSON.stringify(stripeCredentials)
        );
        await env.PLATFORM_TOKENS_KV.put(
          `platform:${platformId}:stripeToken`,
          JSON.stringify(stripeCredentials)
        );

        console.log(`[OAuth] Saved Stripe token for platformId: ${platformId}`);

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
        billingMode?: 'subscription' | 'one_off';
        description?: string;
        imageUrl?: string;
        inventory?: number | null;
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

      // Get Stripe credentials from PLATFORM_TOKENS_KV (front-auth-api namespace)
      const stripeDataJson = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:stripeToken`);
      if (!stripeDataJson) {
        return new Response('Stripe credentials not found. Please connect Stripe first.', { status: 404 });
      }

      const stripeData = JSON.parse(stripeDataJson) as { accessToken: string; stripeUserId: string };

      // Create Stripe products on THEIR account
      const priceIds: Array<{ tier: string; priceId: string; productId: string }> = [];

      try {
        for (const tier of tiers) {
          const billingMode = tier.billingMode || 'subscription'; // fallback to recurring

          // Create product
          const productResponse = await fetch('https://api.stripe.com/v1/products', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeData.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: (() => {
              const params = new URLSearchParams({
                name: tier.displayName,
                description: tier.description || '',
                'metadata[platformId]': platformId,
                'metadata[tierName]': tier.name,
                'metadata[limit]': tier.limit.toString(),
              });
              if (tier.imageUrl) {
                params.append('images[]', tier.imageUrl);
              }
              return params;
            })(),
          });

          if (!productResponse.ok) {
            const error = await productResponse.text();
            throw new Error(`Failed to create product: ${error}`);
          }

          const product = await productResponse.json() as { id: string };

          const params = new URLSearchParams({
            product: product.id,
            unit_amount: (tier.price * 100).toString(),
            currency: 'usd',
            'metadata[platformId]': platformId,
            'metadata[tierName]': tier.name,
            'metadata[limit]': tier.limit.toString(),
          });

          if (billingMode === 'subscription') {
            params.set('recurring[interval]', 'month');
          }

          const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeData.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
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

        // ===================================================================
        // GENERATE KEYS (publishableKey + secretKey)
        // ===================================================================
        const publishableKey = `pk_live_${crypto.randomUUID().replace(/-/g, '')}`;
        const secretKey = `sk_live_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;

        // Hash secretKey for secure storage
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secretKey));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        // Build tier config with product IDs
        const tierConfig = tiers.map((tier, i) => ({
          ...tier,
          priceId: priceIds[i].priceId,
          productId: priceIds[i].productId,
        }));

        // ===================================================================
        // D1 SSOT: platform, keys, tiers
        // ===================================================================
        await ensurePlatform(env, platformId, userId);
        await upsertApiKey(env, platformId, publishableKey, hashHex);
        await upsertTiers(env, platformId, tierConfig as TierInput[]);

        // ===================================================================
        // SAVE TO PLATFORM_TOKENS_KV (front-auth-api namespace)
        // This is the MAIN namespace - stores EVERYTHING about the dev
        // ===================================================================
        await env.PLATFORM_TOKENS_KV.put(`user:${userId}:publishableKey`, publishableKey);
        await env.PLATFORM_TOKENS_KV.put(`user:${userId}:secretKey`, secretKey);
        await env.PLATFORM_TOKENS_KV.put(`user:${userId}:products`, JSON.stringify(priceIds));

        // Reverse lookups
        await env.PLATFORM_TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, platformId);
        await env.PLATFORM_TOKENS_KV.put(`secretkey:${hashHex}:publishableKey`, publishableKey);

        // ===================================================================
        // COPY TO CUSTOMER_TOKENS_KV (api-multi namespace)
        // Only copy what api-multi needs for fast tier limit lookups
        // ===================================================================
        await env.CUSTOMER_TOKENS_KV.put(
          `platform:${platformId}:tierConfig`,
          JSON.stringify({ tiers: tierConfig })
        );
        await env.CUSTOMER_TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, platformId);
        await env.CUSTOMER_TOKENS_KV.put(`secretkey:${hashHex}:publishableKey`, publishableKey);
        // Copy Stripe token (needed for checkout/portal)
        await env.CUSTOMER_TOKENS_KV.put(`platform:${platformId}:stripeToken`, stripeDataJson);

        console.log(`[Products] Created ${priceIds.length} products for platform ${platformId}`);
        console.log(`[Keys] Generated publishableKey: ${publishableKey}`);

        // ===================================================================
        // CONFIGURE STRIPE CUSTOMER PORTAL (CRITICAL FOR CHECKOUT + SUBSCRIPTIONS)
        // ===================================================================
        // WHY THIS IS NEEDED:
        // - Stripe REQUIRES Customer Portal to be configured before checkout works properly
        // - Even if you never use /api/customer-portal endpoint, this config must exist
        // - Without this, checkout sessions may fail with "missing API key" errors
        // - This is a ONE-TIME setup per connected Stripe account
        //
        // WHAT THIS DOES:
        // - Creates default portal configuration on the connected account
        // - Allows customers to update email/address
        // - Allows customers to cancel subscriptions
        // - Enables invoice history viewing
        //
        // STRIPE CONNECT PATTERN:
        // - Uses OAuth access token (not platform secret key)
        // - Uses Stripe-Account header to target connected account
        // - Portal lives on THEIR Stripe account, not yours
        console.log(`[Portal] Configuring Customer Portal for connected account ${stripeData.stripeUserId}`);

        // Build portal config params (need to append array values separately)
        const portalParams = new URLSearchParams({
          // Business branding
          'business_profile[headline]': 'Manage your subscription',
          // Allow customers to update their info
          'features[customer_update][enabled]': 'true',
          // Allow customers to view invoice history
          'features[invoice_history][enabled]': 'true',
          // Allow customers to cancel subscriptions
          'features[subscription_cancel][enabled]': 'true',
          'features[subscription_cancel][mode]': 'at_period_end',
          // Disable pause (optional - can enable later)
          'features[subscription_pause][enabled]': 'false',
        });
        // Append array values for allowed updates (can't use object syntax for duplicate keys)
        portalParams.append('features[customer_update][allowed_updates][]', 'email');
        portalParams.append('features[customer_update][allowed_updates][]', 'address');

        const portalConfig = await fetch('https://api.stripe.com/v1/billing_portal/configurations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_CLIENT_SECRET}`,
            'Stripe-Account': stripeData.stripeUserId,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: portalParams.toString(),
        });

        const portalResult = await portalConfig.json() as { id?: string; error?: { message: string } };

        if (!portalConfig.ok) {
          // Portal config failed - log but don't block (might already exist)
          console.error(`[Portal] Failed to configure portal: ${portalResult.error?.message}`);
          console.error('[Portal] This may cause checkout issues - developer needs to manually configure portal in Stripe dashboard');
        } else {
          console.log(`[Portal] ✅ Customer Portal configured successfully (ID: ${portalResult.id})`);
        }

        // ===================================================================
        // UPDATE CLERK METADATA (add publishableKey to JWT)
        // ===================================================================
        const clerkClient = createClerkClient({
          secretKey: env.CLERK_SECRET_KEY,
          publishableKey: env.CLERK_PUBLISHABLE_KEY,
        });

        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: { publishableKey }
        });

        console.log(`[Clerk] Updated user ${userId} with publishableKey in metadata`);

        return new Response(
          JSON.stringify({
            success: true,
            publishableKey,
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
