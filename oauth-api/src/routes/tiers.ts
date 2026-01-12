/**
 * ============================================================================
 * TIERS ROUTES - Manage Product Tiers (CRUD)
 * ============================================================================
 *
 * These routes allow developers to manage their tiers/products AFTER initial
 * creation. The key difference from /create-products:
 *
 *   - /create-products: Creates NEW project with NEW keys
 *   - /tiers routes: Modify EXISTING project, SAME keys
 *
 * USE CASES:
 *   - GET /tiers: List existing tiers for a project
 *   - PUT /tiers: Update tier properties (price, limit, etc.)
 *   - POST /tiers/add: Add a new tier to existing project
 *   - DELETE /tiers: Remove a tier (archives Stripe product)
 *
 * KEY CONCEPT:
 * All operations are scoped by publishableKey (the project identifier).
 * The projectType (saas|store) is LOCKED - you can't switch.
 *
 * ============================================================================
 */

import { Env, ProjectType } from '../types';
import { ensureTierSchema } from '../lib/schema';
import { getCorsHeaders } from './oauth';

/**
 * Helper: Get platformId from D1 or KV
 * Tries D1 first (source of truth), falls back to KV cache
 */
async function getPlatformId(userId: string, env: Env): Promise<string | null> {
  // Try D1 first
  const row = await env.DB.prepare(
    'SELECT platformId FROM platforms WHERE clerkUserId = ?'
  )
    .bind(userId)
    .first<{ platformId: string }>();

  if (row?.platformId) return row.platformId;

  // Fall back to KV
  return await env.PLATFORM_TOKENS_KV.get(`user:${userId}:platformId`);
}

/**
 * Helper: Get Stripe credentials for a platform
 * Needed to create/archive products on their Stripe account
 */
async function getStripeCredentials(
  platformId: string,
  env: Env
): Promise<{ accessToken: string; stripeUserId: string } | null> {
  // D1 is source of truth for Stripe tokens
  const row = await env.DB.prepare(
    'SELECT accessToken, stripeUserId FROM stripe_tokens WHERE platformId = ? ORDER BY createdAt DESC LIMIT 1'
  )
    .bind(platformId)
    .first<{ accessToken: string; stripeUserId: string }>();

  if (row) return row;

  // Fallback to KV cache
  const json = await env.PLATFORM_TOKENS_KV.get(`platform:${platformId}:stripeToken`);
  if (json) return JSON.parse(json);

  return null;
}

/**
 * GET /tiers
 *
 * List existing tiers for a platform, optionally filtered by publishableKey.
 *
 * Query params:
 *   - userId: Clerk user ID (required)
 *   - mode: 'test' | 'live' (default: 'test')
 *   - publishableKey: Filter to specific project (optional)
 *
 * Returns:
 *   - tiers: Array of tier objects
 *   - platformId: The platform these belong to
 */
export async function handleGetTiers(
  request: Request,
  env: Env,
  url: URL,
  userId: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request, env);

  const mode = url.searchParams.get('mode') || 'test';
  const publishableKey = url.searchParams.get('publishableKey');

  const platformId = await getPlatformId(userId, env);
  if (!platformId) {
    return new Response(
      JSON.stringify({ error: 'Platform not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Ensure schema is up to date
  await ensureTierSchema(env);

  // Build query - filter by platformId, mode, and optionally publishableKey
  let query = `
    SELECT name, displayName, price, "limit", priceId, productId,
           features, popular, inventory, soldOut, mode,
           publishableKey, projectType, trialDays
    FROM tiers
    WHERE platformId = ?
      AND (mode = ? OR mode IS NULL)
  `;
  const params: any[] = [platformId, mode];

  // If publishableKey provided, filter to that specific project
  if (publishableKey) {
    query += ' AND (publishableKey = ? OR publishableKey IS NULL)';
    params.push(publishableKey);
  }

  const result = await env.DB.prepare(query).bind(...params).all();

  return new Response(
    JSON.stringify({
      tiers: result.results || [],
      platformId,
      publishableKey: publishableKey || null,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * PUT /tiers
 *
 * Update an existing tier's properties.
 * Does NOT change API keys or create new Stripe products.
 *
 * Request body:
 *   - userId: Clerk user ID
 *   - tierName: Name of tier to update
 *   - mode: 'test' | 'live'
 *   - publishableKey: The project this tier belongs to
 *   - updates: Object with properties to change
 *
 * Updatable properties:
 *   - displayName: Display name shown to customers
 *   - price: Price in dollars (creates new Stripe price if changed)
 *   - limit: Usage limit (number or 'unlimited')
 *   - features: JSON string of features
 *   - popular: Boolean flag for UI highlighting
 *   - inventory: Stock count (for store products)
 *   - soldOut: Boolean sold out flag
 *
 * PRICE CHANGES:
 * Since Stripe prices are immutable, changing the price will:
 *   1. Create a new Stripe price for the same product
 *   2. Deactivate the old price
 *   3. Update D1 with the new priceId
 */
export async function handleUpdateTier(
  request: Request,
  env: Env,
  authenticatedUserId: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request, env);

  const body = await request.json() as {
    userId?: string;
    tierName: string;
    mode?: string;
    publishableKey?: string;
    updates: {
      displayName?: string;
      price?: number;
      limit?: number | string;
      features?: string;
      popular?: boolean;
      inventory?: number | null;
      soldOut?: boolean;
      trialDays?: number | null;  // Trial period for membership
    };
  };

  const { tierName, updates, mode = 'test', publishableKey } = body;
  const userId = authenticatedUserId;

  // Validate required fields
  if (!tierName) {
    return new Response(
      JSON.stringify({ error: 'Missing tierName' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (body.userId && body.userId !== userId) {
    return new Response(
      JSON.stringify({ error: 'User mismatch', message: 'Token user does not match request userId' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const platformId = await getPlatformId(userId, env);
  if (!platformId) {
    return new Response(
      JSON.stringify({ error: 'Platform not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // =========================================================================
  // HANDLE PRICE CHANGE - Create new Stripe price if price is being updated
  // =========================================================================
  let newPriceId: string | null = null;

  if (updates.price !== undefined) {
    // First, get the current tier to check if price actually changed
    let tierQuery = `
      SELECT price, priceId, productId, projectType FROM tiers
      WHERE platformId = ? AND name = ? AND (mode = ? OR mode IS NULL)
    `;
    const tierParams: any[] = [platformId, tierName, mode];

    if (publishableKey) {
      tierQuery += ' AND (publishableKey = ? OR publishableKey IS NULL)';
      tierParams.push(publishableKey);
    }

    const currentTier = await env.DB.prepare(tierQuery)
      .bind(...tierParams)
      .first<{ price: number; priceId: string; productId: string; projectType: string }>();

    if (!currentTier) {
      return new Response(
        JSON.stringify({ error: 'Tier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only create new Stripe price if price actually changed
    if (currentTier.price !== updates.price) {
      const stripeData = await getStripeCredentials(platformId, env);
      if (!stripeData) {
        return new Response(
          JSON.stringify({ error: 'Stripe not connected - cannot update price' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine if this is a subscription or one-time price
      const isSubscription = currentTier.projectType === 'saas';

      // Create new Stripe price (price already in cents)
      const priceParams = new URLSearchParams({
        product: currentTier.productId,
        currency: 'usd',
        unit_amount: String(Math.round(updates.price)), // Already in cents
      });

      if (isSubscription) {
        priceParams.set('recurring[interval]', 'month');
      }

      const priceRes = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeData.accessToken}`,
          'Stripe-Account': stripeData.stripeUserId,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: priceParams,
      });

      if (!priceRes.ok) {
        const err = await priceRes.text();
        return new Response(
          JSON.stringify({ error: `Failed to create new Stripe price: ${err}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newPrice = await priceRes.json() as { id: string };
      newPriceId = newPrice.id;

      console.log(`[Tiers] Created new Stripe price ${newPriceId} for tier ${tierName} (old: ${currentTier.priceId})`);

      // Deactivate old price (best practice)
      try {
        await fetch(`https://api.stripe.com/v1/prices/${currentTier.priceId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeData.accessToken}`,
            'Stripe-Account': stripeData.stripeUserId,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ active: 'false' }),
        });
        console.log(`[Tiers] Deactivated old price ${currentTier.priceId}`);
      } catch (err) {
        // Non-fatal - old price just stays active
        console.warn(`[Tiers] Failed to deactivate old price: ${err}`);
      }
    }
  }

  // =========================================================================
  // BUILD D1 UPDATE QUERY
  // =========================================================================
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.displayName !== undefined) {
    setClauses.push('displayName = ?');
    values.push(updates.displayName);
  }
  if (updates.price !== undefined) {
    setClauses.push('price = ?');
    values.push(updates.price);
  }
  // If we created a new Stripe price, update the priceId
  if (newPriceId) {
    setClauses.push('priceId = ?');
    values.push(newPriceId);
  }
  if (updates.limit !== undefined) {
    setClauses.push('"limit" = ?');
    values.push(updates.limit === 'unlimited' ? null : updates.limit);
  }
  if (updates.features !== undefined) {
    setClauses.push('features = ?');
    values.push(updates.features);
  }
  if (updates.popular !== undefined) {
    setClauses.push('popular = ?');
    values.push(updates.popular ? 1 : 0);
  }
  if (updates.inventory !== undefined) {
    setClauses.push('inventory = ?');
    values.push(updates.inventory);
  }
  if (updates.soldOut !== undefined) {
    setClauses.push('soldOut = ?');
    values.push(updates.soldOut ? 1 : 0);
  }
  if (updates.trialDays !== undefined) {
    setClauses.push('trialDays = ?');
    values.push(updates.trialDays);
  }

  if (setClauses.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No updates provided' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build WHERE clause
  values.push(platformId, tierName, mode);
  let whereClause = 'platformId = ? AND name = ? AND (mode = ? OR mode IS NULL)';

  if (publishableKey) {
    whereClause += ' AND (publishableKey = ? OR publishableKey IS NULL)';
    values.push(publishableKey);
  }

  await env.DB.prepare(
    `UPDATE tiers SET ${setClauses.join(', ')} WHERE ${whereClause}`
  ).bind(...values).run();

  console.log(`[Tiers] Updated tier ${tierName} for platform ${platformId}${newPriceId ? ` (new priceId: ${newPriceId})` : ''}`);

  return new Response(
    JSON.stringify({
      success: true,
      tierName,
      updates,
      ...(newPriceId && { newPriceId })
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /tiers/add
 *
 * Add a NEW tier to an EXISTING project.
 * Creates new Stripe product/price but does NOT generate new API keys.
 *
 * Request body:
 *   - userId: Clerk user ID
 *   - mode: 'test' | 'live'
 *   - publishableKey: The project to add tier to (required)
 *   - tier: Tier definition object
 *
 * The tier's type (subscription vs one_off) must match the project's type.
 * You can't add a store product to a SaaS project.
 */
export async function handleAddTier(
  request: Request,
  env: Env,
  authenticatedUserId: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request, env);

  try {
  const body = await request.json() as {
    userId?: string;
    mode?: string;
    publishableKey: string;
    tier: {
      name: string;
      displayName: string;
      price: number;
      limit: number | string;
      billingMode?: 'subscription' | 'one_off';
      features?: string;
      description?: string;
      imageUrl?: string;
      inventory?: number | null;
      popular?: boolean;
      trialDays?: number | null;  // Trial period for membership
    };
  };

  const { tier, mode = 'test', publishableKey } = body;
  const userId = authenticatedUserId;

  // Validate required fields
  if (!tier?.name || !tier?.displayName || !publishableKey) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields (tier.name, tier.displayName, publishableKey)' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (body.userId && body.userId !== userId) {
    return new Response(
      JSON.stringify({ error: 'User mismatch', message: 'Token user does not match request userId' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const platformId = await getPlatformId(userId, env);
  if (!platformId) {
    return new Response(
      JSON.stringify({ error: 'Platform not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get the project type from the existing key to enforce type locking
  const existingKey = await env.DB.prepare(
    'SELECT projectType FROM api_keys WHERE platformId = ? AND publishableKey = ? LIMIT 1'
  )
    .bind(platformId, publishableKey)
    .first<{ projectType: string }>();

  if (!existingKey) {
    return new Response(
      JSON.stringify({ error: 'Project not found for this publishableKey' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const projectType = existingKey.projectType as ProjectType;

  // Validate tier type matches project type
  // membership and saas use subscription billing, store uses one_off
  const tierBillingMode = tier.billingMode || 'subscription';
  const tierType = tierBillingMode === 'one_off' ? 'store' : 'saas';

  // For membership projects, we allow subscription-based tiers
  const isCompatible = projectType === 'membership'
    ? tierBillingMode === 'subscription'
    : tierType === projectType;

  if (!isCompatible) {
    return new Response(
      JSON.stringify({
        error: `Cannot add ${tierType} tier to ${projectType} project. Project type is locked.`
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get Stripe credentials
  const stripeData = await getStripeCredentials(platformId, env);
  if (!stripeData) {
    return new Response(
      JSON.stringify({ error: 'Stripe not connected' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // =========================================================================
  // CREATE STRIPE PRODUCT
  // =========================================================================

  const productParams = new URLSearchParams({
    name: tier.displayName,
    'metadata[platformId]': platformId,
    'metadata[tierName]': tier.name,
  });

  if (tierBillingMode === 'one_off' && tier.description?.trim()) {
    productParams.append('description', tier.description);
  }
  if (tier.imageUrl?.trim()) {
    productParams.append('images[]', tier.imageUrl);
  }

  const productRes = await fetch('https://api.stripe.com/v1/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeData.accessToken}`,
      'Stripe-Account': stripeData.stripeUserId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: productParams,
  });

  if (!productRes.ok) {
    const err = await productRes.text();
    return new Response(
      JSON.stringify({ error: `Failed to create Stripe product: ${err}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const product = await productRes.json() as { id: string };

  // =========================================================================
  // CREATE STRIPE PRICE
  // =========================================================================

  const priceParams = new URLSearchParams({
    product: product.id,
    currency: 'usd',
    unit_amount: String(Math.round(tier.price)), // Already in cents
  });

  if (tierBillingMode === 'subscription') {
    priceParams.set('recurring[interval]', 'month');
  }

  const priceRes = await fetch('https://api.stripe.com/v1/prices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeData.accessToken}`,
      'Stripe-Account': stripeData.stripeUserId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: priceParams,
  });

  if (!priceRes.ok) {
    const err = await priceRes.text();
    return new Response(
      JSON.stringify({ error: `Failed to create Stripe price: ${err}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const price = await priceRes.json() as { id: string };

  // =========================================================================
  // INSERT INTO D1
  // =========================================================================

  await ensureTierSchema(env);

  const featuresJson = JSON.stringify({
    features: tier.features ? tier.features.split(',').map(f => f.trim()) : [],
    billingMode: tierBillingMode,
    imageUrl: tier.imageUrl || '',
    inventory: tier.inventory ?? null,
  });

  const tierNameSlug = tier.name.toLowerCase().replace(/\s+/g, '_');

  await env.DB.prepare(`
    INSERT INTO tiers (
      platformId, publishableKey, projectType, name, displayName,
      price, "limit", priceId, productId, features, popular,
      inventory, soldOut, mode, createdAt, trialDays
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    platformId,
    publishableKey,
    projectType,
    tierNameSlug,
    tier.displayName,
    tier.price,
    tier.limit === 'unlimited' || tier.limit === undefined ? null : tier.limit,
    price.id,
    product.id,
    featuresJson,
    tier.popular ? 1 : 0,
    tier.inventory ?? null,
    0, // soldOut starts false
    mode,
    new Date().toISOString().replace('T', ' ').slice(0, 19),
    tier.trialDays ?? null  // Trial period for membership
  ).run();

  console.log(`[Tiers] Added new tier ${tierNameSlug} to project ${publishableKey}`);

  return new Response(
    JSON.stringify({
      success: true,
      tier: {
        name: tierNameSlug,
        priceId: price.id,
        productId: product.id,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
  } catch (error) {
    console.error('[Tiers Add] Error:', error);
    return new Response(
      JSON.stringify({ error: `Failed to add tier: ${(error as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * DELETE /tiers
 *
 * Remove a tier from a project.
 * Archives the Stripe product (doesn't delete - might have existing subs).
 *
 * Request body:
 *   - userId: Clerk user ID
 *   - tierName: Name of tier to delete
 *   - mode: 'test' | 'live'
 *   - publishableKey: The project this tier belongs to
 */
export async function handleDeleteTier(
  request: Request,
  env: Env,
  authenticatedUserId: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request, env);

  const body = await request.json() as {
    userId?: string;
    tierName: string;
    mode?: string;
    publishableKey?: string;
  };

  const { tierName, mode = 'test', publishableKey } = body;
  const userId = authenticatedUserId;

  if (!tierName) {
    return new Response(
      JSON.stringify({ error: 'Missing tierName' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (body.userId && body.userId !== userId) {
    return new Response(
      JSON.stringify({ error: 'User mismatch', message: 'Token user does not match request userId' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const platformId = await getPlatformId(userId, env);
  if (!platformId) {
    return new Response(
      JSON.stringify({ error: 'Platform not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get the tier to find productId for Stripe archival
  let tierQuery = `
    SELECT productId FROM tiers
    WHERE platformId = ? AND name = ? AND (mode = ? OR mode IS NULL)
  `;
  const tierParams: any[] = [platformId, tierName, mode];

  if (publishableKey) {
    tierQuery += ' AND (publishableKey = ? OR publishableKey IS NULL)';
    tierParams.push(publishableKey);
  }

  const tier = await env.DB.prepare(tierQuery)
    .bind(...tierParams)
    .first<{ productId: string }>();

  if (!tier) {
    return new Response(
      JSON.stringify({ error: 'Tier not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Archive Stripe product (don't delete - might have existing subscriptions)
  const stripeData = await getStripeCredentials(platformId, env);
  if (stripeData && tier.productId) {
    try {
      await fetch(`https://api.stripe.com/v1/products/${tier.productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeData.accessToken}`,
          'Stripe-Account': stripeData.stripeUserId,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ active: 'false' }),
      });
      console.log(`[Tiers] Archived Stripe product ${tier.productId}`);
    } catch (err) {
      console.warn(`[Tiers] Failed to archive Stripe product: ${err}`);
      // Continue with D1 deletion even if Stripe fails
    }
  }

  // Delete from D1
  let deleteQuery = `
    DELETE FROM tiers
    WHERE platformId = ? AND name = ? AND (mode = ? OR mode IS NULL)
  `;
  const deleteParams: any[] = [platformId, tierName, mode];

  if (publishableKey) {
    deleteQuery += ' AND (publishableKey = ? OR publishableKey IS NULL)';
    deleteParams.push(publishableKey);
  }

  await env.DB.prepare(deleteQuery).bind(...deleteParams).run();

  console.log(`[Tiers] Deleted tier ${tierName} from platform ${platformId}`);

  return new Response(
    JSON.stringify({ success: true, deleted: tierName }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
