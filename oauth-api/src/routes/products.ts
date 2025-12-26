/**
 * ============================================================================
 * PRODUCTS ROUTES - Create Stripe Products & Generate API Keys
 * ============================================================================
 *
 * This route handles the initial product/tier setup for a developer's project.
 * When a dev wants to create a new API project (SaaS or Store), they:
 *
 * 1. Choose project type (SaaS subscriptions OR Store one-offs - NOT BOTH)
 * 2. Define their tiers/products (prices, limits, etc.)
 * 3. We create those products on THEIR Stripe account
 * 4. We generate API keys (pk/sk) for this project
 * 5. We link everything together
 *
 * KEY CONCEPT:
 * Each publishableKey IS a project. The key determines:
 *   - What type of products (saas vs store)
 *   - What mode (test vs live) - embedded in pk_test_ vs pk_live_
 *   - What tiers/products are available
 *   - What customers belong to this project
 *
 * SECURITY:
 * - secretKey is hashed before storage (SHA-256)
 * - Plain secretKey only returned ONCE at creation time
 * - All Stripe calls use developer's own access token (Connect)
 *
 * ============================================================================
 */

import { createClerkClient } from '@clerk/backend';
import { Env, ProjectType } from '../types';
import { ensurePlatform } from '../lib/schema';
import { upsertApiKey } from '../lib/keys';
import { TierInput, upsertTiers } from '../lib/tiers';
import { getCorsHeaders } from './oauth';

// Note: getPlatformIdFromDb removed - using KV lookup instead

/**
 * Helper: Generate a cryptographically secure API key
 *
 * Format:
 *   - Publishable: pk_{mode}_{32 hex chars}
 *   - Secret: sk_{mode}_{64 hex chars} (longer for more entropy)
 */
function generateKeyPair(mode: 'test' | 'live'): { publishableKey: string; secretKey: string } {
  const pkRandom = crypto.randomUUID().replace(/-/g, '');
  const skRandom = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  return {
    publishableKey: `pk_${mode}_${pkRandom}`,
    secretKey: `sk_${mode}_${skRandom}`,
  };
}

/**
 * Helper: Hash a secret key for secure storage
 * We never store plain secret keys - only the hash
 */
async function hashSecretKey(secretKey: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secretKey)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper: Create a Stripe product on the connected account
 *
 * Uses the developer's Stripe access token to create products
 * on THEIR account, not ours. This is Stripe Connect in action.
 */
async function createStripeProduct(
  accessToken: string,
  tier: {
    displayName: string;
    name: string;
    limit: number | 'unlimited';
    description?: string;
    imageUrl?: string;
    billingMode?: 'subscription' | 'one_off';
  },
  platformId: string
): Promise<{ productId: string }> {
  const params = new URLSearchParams({
    name: tier.displayName,
    'metadata[platformId]': platformId,
    'metadata[tierName]': tier.name,
    'metadata[limit]': String(tier.limit === 'unlimited' ? 0 : tier.limit),
  });

  // Only add description for one-off products if provided
  // Subscriptions typically don't need descriptions in Stripe
  if (tier.billingMode === 'one_off' && tier.description?.trim()) {
    params.append('description', tier.description);
  }

  // Add product image if provided
  if (tier.imageUrl?.trim()) {
    params.append('images[]', tier.imageUrl);
  }

  const response = await fetch('https://api.stripe.com/v1/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Stripe product: ${error}`);
  }

  const product = await response.json() as { id: string };
  return { productId: product.id };
}

/**
 * Helper: Create a Stripe price for a product
 *
 * Prices can be:
 *   - Recurring (subscription): monthly billing
 *   - One-time (one_off): single purchase
 */
async function createStripePrice(
  accessToken: string,
  productId: string,
  tier: {
    name: string;
    price: number;
    limit: number | 'unlimited';
    billingMode?: 'subscription' | 'one_off';
  },
  platformId: string
): Promise<{ priceId: string }> {
  const params = new URLSearchParams({
    product: productId,
    unit_amount: String(Math.round(tier.price * 100)), // Convert dollars to cents
    currency: 'usd',
    'metadata[platformId]': platformId,
    'metadata[tierName]': tier.name,
    'metadata[limit]': String(tier.limit === 'unlimited' ? 0 : tier.limit),
  });

  // Add recurring interval for subscriptions
  if (tier.billingMode !== 'one_off') {
    params.set('recurring[interval]', 'month');
  }

  const response = await fetch('https://api.stripe.com/v1/prices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Stripe price: ${error}`);
  }

  const price = await response.json() as { id: string };
  return { priceId: price.id };
}

/**
 * Helper: Configure Stripe Customer Portal for the connected account
 *
 * WHY THIS IS NEEDED:
 * Stripe REQUIRES Customer Portal configuration before checkout works properly.
 * Even if you never use the portal, this config must exist. Without it,
 * checkout sessions may fail with cryptic "missing API key" errors.
 *
 * This is a one-time setup per Stripe connected account.
 */
async function configureStripePortal(
  stripeClientSecret: string,
  stripeUserId: string
): Promise<void> {
  const portalParams = new URLSearchParams({
    'business_profile[headline]': 'Manage your subscription',
    'features[customer_update][enabled]': 'true',
    'features[invoice_history][enabled]': 'true',
    'features[subscription_cancel][enabled]': 'true',
    'features[subscription_cancel][mode]': 'at_period_end',
    'features[subscription_pause][enabled]': 'false',
  });
  portalParams.append('features[customer_update][allowed_updates][]', 'email');
  portalParams.append('features[customer_update][allowed_updates][]', 'address');

  const response = await fetch('https://api.stripe.com/v1/billing_portal/configurations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeClientSecret}`,
      'Stripe-Account': stripeUserId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: portalParams.toString(),
  });

  const result = await response.json() as { id?: string; error?: { message: string } };

  if (!response.ok) {
    // Log but don't fail - portal might already exist
    console.error(`[Portal] Failed to configure: ${result.error?.message}`);
  } else {
    console.log(`[Portal] Configured successfully (ID: ${result.id})`);
  }
}

/**
 * POST /create-products
 *
 * Creates Stripe products/prices and generates API keys for a new project.
 *
 * Request body:
 *   - userId: Clerk user ID
 *   - mode: 'test' | 'live'
 *   - projectName: Display name for this project
 *   - projectType: 'saas' | 'store' (LOCKED after creation)
 *   - tiers: Array of tier definitions
 *
 * What happens:
 *   1. Validate inputs, get platformId
 *   2. Get Stripe credentials
 *   3. Create Stripe products and prices for each tier
 *   4. Generate API keys (pk/sk)
 *   5. Store everything in D1 (source of truth)
 *   6. Cache lookups in KV
 *   7. Configure Stripe portal
 *   8. Update Clerk user metadata
 *   9. Return keys to developer (ONLY TIME they see secret key)
 *
 * IMPORTANT:
 * The publishableKey becomes the project identifier.
 * All tiers are linked to this publishableKey.
 * The projectType (saas|store) is LOCKED - no switching later.
 */
export async function handleCreateProducts(
  request: Request,
  env: Env,
  authenticatedUserId: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request, env);

  // Parse and validate request body
  const body = await request.json() as {
    userId?: string;
    mode?: 'live' | 'test';
    projectName?: string;
    projectType?: 'saas' | 'store';
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

  const { tiers, projectName } = body;
  const mode: 'live' | 'test' = body.mode === 'test' ? 'test' : 'live';
  const projectType: ProjectType = body.projectType === 'store' ? 'store' : 'saas';
  const userId = authenticatedUserId;

  // Validate required fields
  if (!tiers || tiers.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing tiers' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Optional: block mismatched userId in legacy clients
  if (body.userId && body.userId !== userId) {
    return new Response(
      JSON.stringify({ error: 'User mismatch', message: 'Token user does not match request userId' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // =========================================================================
  // GET PLATFORM AND STRIPE CREDENTIALS
  // =========================================================================

  const platformId = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:platformId`);
  if (!platformId) {
    return new Response(
      JSON.stringify({ error: 'Platform ID not found. Please connect Stripe first.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const stripeDataJson = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:stripeToken`);
  if (!stripeDataJson) {
    return new Response(
      JSON.stringify({ error: 'Stripe credentials not found. Please connect Stripe first.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const stripeData = JSON.parse(stripeDataJson) as {
    accessToken: string;
    stripeUserId: string;
  };

  // =========================================================================
  // CREATE STRIPE PRODUCTS AND PRICES
  // =========================================================================

  console.log(`[Products] Creating ${tiers.length} products for platform ${platformId}`);

  const priceIds: Array<{ tier: string; priceId: string; productId: string }> = [];

  try {
    for (const tier of tiers) {
      // Create product on developer's Stripe account
      const { productId } = await createStripeProduct(
        stripeData.accessToken,
        tier,
        platformId
      );

      // Create price for this product
      const { priceId } = await createStripePrice(
        stripeData.accessToken,
        productId,
        tier,
        platformId
      );

      priceIds.push({
        tier: tier.name,
        priceId,
        productId,
      });

      console.log(`[Products] Created ${tier.name}: product=${productId}, price=${priceId}`);
    }

    // =========================================================================
    // GENERATE API KEYS
    // publishableKey = project identifier
    // secretKey = for API authentication (hashed before storage)
    // =========================================================================

    const { publishableKey, secretKey } = generateKeyPair(mode);
    const secretKeyHash = await hashSecretKey(secretKey);

    console.log(`[Keys] Generated ${mode} keys: ${publishableKey}`);

    // =========================================================================
    // BUILD TIER CONFIG
    // Each tier is linked to the publishableKey (the project)
    // =========================================================================

    const tierConfig: TierInput[] = tiers.map((tier, i) => ({
      ...tier,
      publishableKey,           // NEW: Link tier to this key/project
      projectType,              // saas or store - LOCKED
      priceId: priceIds[i].priceId,
      productId: priceIds[i].productId,
      mode,
    }));

    // =========================================================================
    // D1: SOURCE OF TRUTH
    // Store platform, keys, and tiers in D1
    // =========================================================================

    await ensurePlatform(env, platformId, userId);
    await upsertApiKey(
      env,
      platformId,
      publishableKey,
      secretKeyHash,
      mode,
      projectName || 'Untitled Project',
      projectType
    );
    await upsertTiers(env, platformId, tierConfig);

    // =========================================================================
    // KV: CACHING FOR FAST LOOKUPS
    // These are used for quick API auth and tier resolution
    // =========================================================================

    // Store keys by userId (for dashboard credential retrieval)
    await env.PLATFORM_TOKENS_KV.put(`user:${userId}:publishableKey:${mode}`, publishableKey);
    await env.PLATFORM_TOKENS_KV.put(`user:${userId}:secretKey:${mode}`, secretKey);

    // Legacy: also store without mode suffix for backwards compat
    if (mode === 'live') {
      await env.PLATFORM_TOKENS_KV.put(`user:${userId}:publishableKey`, publishableKey);
      await env.PLATFORM_TOKENS_KV.put(`user:${userId}:secretKey`, secretKey);
    }

    // Store product info
    await env.PLATFORM_TOKENS_KV.put(`user:${userId}:products:${mode}`, JSON.stringify(priceIds));

    // Reverse lookups (for API auth - find platformId from key)
    await env.PLATFORM_TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, platformId);
    await env.PLATFORM_TOKENS_KV.put(`secretkey:${secretKeyHash}:publishableKey`, publishableKey);

    // Store secret key by publishableKey (for project listing)
    await env.PLATFORM_TOKENS_KV.put(`pk:${publishableKey}:secretKey`, secretKey);

    // =========================================================================
    // CUSTOMER_TOKENS_KV: API-MULTI NAMESPACE
    // Copy essential data for the customer-facing API (api-multi)
    // =========================================================================

    // Tier config cache for fast limit lookups
    await env.CUSTOMER_TOKENS_KV.put(
      `platform:${platformId}:tierConfig:${mode}`,
      JSON.stringify({ tiers: tierConfig })
    );
    if (mode === 'live') {
      await env.CUSTOMER_TOKENS_KV.put(
        `platform:${platformId}:tierConfig`,
        JSON.stringify({ tiers: tierConfig })
      );
    }

    // Reverse lookups for API auth
    await env.CUSTOMER_TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, platformId);
    await env.CUSTOMER_TOKENS_KV.put(`secretkey:${secretKeyHash}:publishableKey`, publishableKey);

    // Stripe token for checkout/portal operations
    await env.CUSTOMER_TOKENS_KV.put(`platform:${platformId}:stripeToken:${mode}`, stripeDataJson);
    if (mode === 'live') {
      await env.CUSTOMER_TOKENS_KV.put(`platform:${platformId}:stripeToken`, stripeDataJson);
    }

    // =========================================================================
    // CONFIGURE STRIPE PORTAL
    // Required for checkout to work properly
    // =========================================================================

    await configureStripePortal(env.STRIPE_CLIENT_SECRET, stripeData.stripeUserId);

    // =========================================================================
    // UPDATE CLERK USER METADATA
    // Add publishableKey to user's JWT for frontend access
    // =========================================================================

    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { publishableKey }
    });

    console.log(`[Clerk] Updated user ${userId} with publishableKey`);

    // =========================================================================
    // RETURN SUCCESS
    // This is the ONLY time the developer sees their secret key!
    // =========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        publishableKey,
        secretKey,          // Developer must save this - we can't show it again
        products: priceIds,
        mode,
        projectType,
        projectName: projectName || 'Untitled Project',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Products] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create products'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
