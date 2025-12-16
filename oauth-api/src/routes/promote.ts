/**
 * ============================================================================
 * PROMOTE ROUTES - Test to Live Migration
 * ============================================================================
 *
 * This route handles promoting a test project to live production.
 *
 * THE FLOW:
 * 1. Developer creates test products (mode=test) with pk_test_/sk_test_ keys
 * 2. They test their integration in sandbox mode
 * 3. When ready, they call /promote-to-live
 * 4. We create REAL Stripe products (on live mode)
 * 5. We generate NEW live keys (pk_live_/sk_live_)
 * 6. Test and live are now separate but parallel
 *
 * WHY SEPARATE PRODUCTS?
 * Stripe test mode and live mode are completely separate. Products created
 * in test mode don't exist in live mode. So we have to recreate everything.
 *
 * WHAT STAYS THE SAME:
 * - Tier names, prices, limits, features
 * - Project type (saas vs store)
 * - Platform association
 *
 * WHAT CHANGES:
 * - New Stripe product IDs (live mode)
 * - New Stripe price IDs (live mode)
 * - New API keys (pk_live_/sk_live_)
 *
 * ============================================================================
 */

import { Env } from '../types';
import { ensurePlatform } from '../lib/schema';
import { upsertApiKey } from '../lib/keys';
import { TierInput, upsertTiers } from '../lib/tiers';
import { getCorsHeaders } from './oauth';

/**
 * Helper: Generate live API keys
 */
function generateLiveKeyPair(): { publishableKey: string; secretKey: string } {
  const pkRandom = crypto.randomUUID().replace(/-/g, '');
  const skRandom = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  return {
    publishableKey: `pk_live_${pkRandom}`,
    secretKey: `sk_live_${skRandom}`,
  };
}

/**
 * Helper: Hash secret key for storage
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
 * POST /promote-to-live
 *
 * Promotes a test project to live production.
 *
 * Request body:
 *   - userId: Clerk user ID
 *   - publishableKey: The TEST key to promote (pk_test_xxx)
 *
 * What happens:
 *   1. Load test tier config
 *   2. Create live Stripe products/prices
 *   3. Generate live API keys
 *   4. Store everything in D1 and KV
 *   5. Return new live credentials
 *
 * IMPORTANT:
 * This creates a PARALLEL live project. The test project still exists.
 * Changes to test tiers don't automatically sync to live.
 */
export async function handlePromoteToLive(
  request: Request,
  env: Env
): Promise<Response> {
  const corsHeaders = getCorsHeaders();

  const body = await request.json() as {
    userId: string;
    publishableKey?: string;  // Optional: specific test key to promote
  };

  const { userId, publishableKey: testPublishableKey } = body;

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Missing userId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // =========================================================================
  // GET PLATFORM AND CREDENTIALS
  // =========================================================================

  const platformId = await env.PLATFORM_TOKENS_KV.get(`user:${userId}:platformId`);
  if (!platformId) {
    return new Response(
      JSON.stringify({ error: 'Platform ID not found. Please connect Stripe first.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Require publishableKey - we need to know which test project to promote
  if (!testPublishableKey) {
    return new Response(
      JSON.stringify({ error: 'Missing publishableKey. Select a test project to promote.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate it's a test key
  if (!testPublishableKey.startsWith('pk_test_')) {
    return new Response(
      JSON.stringify({ error: 'Can only promote test projects. Select a pk_test_ key.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // =========================================================================
  // READ FROM D1 (SOURCE OF TRUTH)
  // =========================================================================

  // Get project info from api_keys table
  const projectResult = await env.DB.prepare(
    `SELECT name, projectType, mode FROM api_keys WHERE publishableKey = ? AND platformId = ?`
  ).bind(testPublishableKey, platformId).first<{ name: string; projectType: string; mode: string }>();

  if (!projectResult) {
    return new Response(
      JSON.stringify({ error: 'Test project not found in database.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const projectName = projectResult.name || 'Untitled Project';
  const projectType = projectResult.projectType || 'saas';

  // Get tiers from D1 tiers table
  const tiersResult = await env.DB.prepare(
    `SELECT * FROM tiers WHERE publishableKey = ? AND platformId = ?`
  ).bind(testPublishableKey, platformId).all();

  if (!tiersResult.results || tiersResult.results.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No tiers found for this test project.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const tiersToPromote = tiersResult.results as any[];

  // Get Stripe credentials
  const stripeDataJson =
    await env.PLATFORM_TOKENS_KV.get(`user:${userId}:stripeToken`) ||
    await env.PLATFORM_TOKENS_KV.get(`platform:${platformId}:stripeToken`);

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
  // CREATE LIVE STRIPE PRODUCTS AND PRICES
  // =========================================================================

  console.log(`[Promote] Creating ${tiersToPromote.length} live products for platform ${platformId}`);

  const priceIds: Array<{ tier: string; priceId: string; productId: string }> = [];

  try {
    for (const tier of tiersToPromote) {
      // Parse features JSON from D1 (contains billingMode, description, imageUrl, etc.)
      let featuresData: any = {};
      if (tier.features) {
        try {
          featuresData = typeof tier.features === 'string' ? JSON.parse(tier.features) : tier.features;
        } catch (e) {
          console.warn(`[Promote] Failed to parse features for tier ${tier.name}:`, e);
        }
      }

      const billingMode = featuresData.billingMode || (projectType === 'store' ? 'one_off' : 'subscription');
      const description = featuresData.description || '';
      const imageUrl = featuresData.imageUrl || '';

      // Create live product
      const productParams = new URLSearchParams({
        name: tier.displayName,
        'metadata[platformId]': platformId,
        'metadata[tierName]': tier.name,
        'metadata[limit]': String(tier.limit ?? 0),
      });

      if (billingMode === 'one_off' && description.trim()) {
        productParams.append('description', description);
      }
      if (imageUrl.trim()) {
        productParams.append('images[]', imageUrl);
      }

      const productRes = await fetch('https://api.stripe.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeData.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: productParams,
      });

      if (!productRes.ok) {
        const error = await productRes.text();
        throw new Error(`Failed to create live product: ${error}`);
      }

      const product = await productRes.json() as { id: string };

      // Create live price
      const priceParams = new URLSearchParams({
        product: product.id,
        unit_amount: String(Math.round(tier.price * 100)),
        currency: 'usd',
        'metadata[platformId]': platformId,
        'metadata[tierName]': tier.name,
        'metadata[limit]': String(tier.limit ?? ''),
      });

      if (billingMode === 'subscription') {
        priceParams.set('recurring[interval]', 'month');
      }

      const priceRes = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeData.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: priceParams,
      });

      if (!priceRes.ok) {
        const error = await priceRes.text();
        throw new Error(`Failed to create live price: ${error}`);
      }

      const price = await priceRes.json() as { id: string };

      priceIds.push({
        tier: tier.name,
        priceId: price.id,
        productId: product.id,
      });

      console.log(`[Promote] Created live ${tier.name}: product=${product.id}, price=${price.id}`);
    }

    // =========================================================================
    // GENERATE LIVE API KEYS
    // =========================================================================

    const { publishableKey, secretKey } = generateLiveKeyPair();
    const secretKeyHash = await hashSecretKey(secretKey);

    console.log(`[Promote] Generated live keys: ${publishableKey}`);

    // =========================================================================
    // BUILD LIVE TIER CONFIG
    // =========================================================================

    const liveTierConfig: TierInput[] = tiersToPromote.map((tier: any, i: number) => ({
      ...tier,
      publishableKey,        // Link to new live key
      priceId: priceIds[i].priceId,
      productId: priceIds[i].productId,
      mode: 'live',
    }));

    // =========================================================================
    // PERSIST TO D1 AND KV
    // =========================================================================

    await ensurePlatform(env, platformId, userId);
    await upsertApiKey(env, platformId, publishableKey, secretKeyHash, 'live', projectName, projectType);
    await upsertTiers(env, platformId, liveTierConfig);

    // KV: Store live keys
    await env.PLATFORM_TOKENS_KV.put(`user:${userId}:publishableKey`, publishableKey);
    await env.PLATFORM_TOKENS_KV.put(`user:${userId}:secretKey`, secretKey);
    await env.PLATFORM_TOKENS_KV.put(`user:${userId}:publishableKey:live`, publishableKey);
    await env.PLATFORM_TOKENS_KV.put(`user:${userId}:secretKey:live`, secretKey);

    // Reverse lookups
    await env.PLATFORM_TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, platformId);
    await env.PLATFORM_TOKENS_KV.put(`secretkey:${secretKeyHash}:publishableKey`, publishableKey);

    // Customer tokens KV (api-multi namespace)
    await env.CUSTOMER_TOKENS_KV.put(
      `platform:${platformId}:tierConfig:live`,
      JSON.stringify({ tiers: liveTierConfig })
    );
    await env.CUSTOMER_TOKENS_KV.put(
      `platform:${platformId}:tierConfig`,
      JSON.stringify({ tiers: liveTierConfig })
    );
    await env.CUSTOMER_TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, platformId);
    await env.CUSTOMER_TOKENS_KV.put(`secretkey:${secretKeyHash}:publishableKey`, publishableKey);
    await env.CUSTOMER_TOKENS_KV.put(`platform:${platformId}:stripeToken:live`, stripeDataJson);
    await env.CUSTOMER_TOKENS_KV.put(`platform:${platformId}:stripeToken`, stripeDataJson);

    console.log(`[Promote] Successfully promoted to live for platform ${platformId}`);

    // =========================================================================
    // RETURN LIVE CREDENTIALS
    // =========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        publishableKey,
        secretKey,    // Developer must save this!
        products: priceIds,
        mode: 'live',
        projectType,
        projectName,
        linkedTestKey: testPublishableKey,  // Which test project this came from
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Promote] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to promote to live'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
