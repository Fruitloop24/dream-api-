/**
 * ============================================================================
 * TIERS LIB - Tier/Product Data Management
 * ============================================================================
 *
 * Functions for storing and managing tier configurations in D1.
 *
 * TIER = A pricing tier or product that customers can buy
 *
 * For SaaS projects:
 *   - Tiers are subscription plans (Free, Pro, Enterprise)
 *   - Have usage limits (100 calls, 10000 calls, unlimited)
 *   - Recurring monthly billing
 *
 * For Store projects:
 *   - Tiers are products (T-Shirt, Sticker Pack, etc.)
 *   - Have inventory counts
 *   - One-time purchase
 *
 * For Membership projects:
 *   - Tiers are access levels (Basic, Premium, VIP)
 *   - Have trial periods (7 days, 14 days, etc.)
 *   - Recurring billing with content gating (no usage tracking)
 *
 * KEY RELATIONSHIP:
 *   Each tier belongs to a publishableKey (the project).
 *   This lets us filter tiers by project in the dashboard.
 *
 * ============================================================================
 */

import { Env, ProjectType } from '../types';
import { ensureTierSchema } from './schema';

/**
 * Input type for creating/updating tiers
 */
export type TierInput = {
  name: string;                          // Internal name (slug format)
  displayName: string;                   // Display name for customers
  price: number;                         // Price in dollars
  limit: number | 'unlimited';           // Usage limit (SaaS) or null
  billingMode?: 'subscription' | 'one_off';  // How to bill
  publishableKey?: string;               // Which project this belongs to
  projectType?: ProjectType;             // saas, store, or membership
  description?: string;                  // Product description (for store)
  imageUrl?: string;                     // Product image URL (for store)
  inventory?: number | null;             // Stock count (for store)
  features?: string | string[];          // Feature list
  popular?: boolean;                     // Highlight in UI
  trialDays?: number | null;             // Trial period in days (for membership)
  priceId: string;                       // Stripe price ID
  productId: string;                     // Stripe product ID
  mode?: 'live' | 'test';               // test or live
};

/**
 * Insert or update multiple tiers in D1
 *
 * @param env - Worker environment
 * @param platformId - Developer's platform ID
 * @param tiers - Array of tier configs to upsert
 */
export async function upsertTiers(env: Env, platformId: string, tiers: TierInput[]) {
  // Ensure schema has all columns (including publishableKey)
  await ensureTierSchema(env);

  // Prepare the insert statement
  const stmt = env.DB.prepare(`
    INSERT OR REPLACE INTO tiers (
      platformId,
      publishableKey,
      projectType,
      name,
      displayName,
      price,
      "limit",
      features,
      popular,
      priceId,
      productId,
      inventory,
      soldOut,
      mode,
      trialDays
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Insert each tier
  for (const tier of tiers) {
    // Build features JSON (stores extra metadata)
    const featuresJson = JSON.stringify({
      description: tier.description || undefined,
      features: Array.isArray(tier.features)
        ? tier.features
        : (tier.features ? [tier.features] : []),
      billingMode: tier.billingMode || 'subscription',
      imageUrl: tier.imageUrl || '',
      inventory: tier.inventory ?? null,
    });

    // Determine project type from billing mode if not specified
    // membership is explicit, store is one_off, saas is default subscription
    const projectType = tier.projectType ||
      (tier.billingMode === 'one_off' ? 'store' : 'saas');

    // Popular flag as integer for SQLite
    const popularFlag = tier.popular ? 1 : 0;

    // Sold out flag based on inventory
    const soldOutFlag =
      tier.inventory !== null && tier.inventory !== undefined
        ? (tier.inventory <= 0 ? 1 : 0)
        : 0;

    await stmt
      .bind(
        platformId,
        tier.publishableKey || null,    // Link to project via key
        projectType,
        tier.name,
        tier.displayName,
        tier.price,
        tier.limit === 'unlimited' ? null : tier.limit,
        featuresJson,
        popularFlag,
        tier.priceId,
        tier.productId,
        tier.inventory ?? null,
        soldOutFlag,
        tier.mode || 'live',
        tier.trialDays ?? null          // Trial period for membership
      )
      .run();

    console.log(`[Tiers] Upserted tier ${tier.name} for platform ${platformId}`);
  }
}

/**
 * Get all tiers for a platform, optionally filtered by publishableKey
 *
 * @param env - Worker environment
 * @param platformId - Developer's platform ID
 * @param options - Filter options
 */
export async function getTiers(
  env: Env,
  platformId: string,
  options?: {
    publishableKey?: string;
    mode?: string;
    projectType?: ProjectType;
  }
): Promise<TierInput[]> {
  await ensureTierSchema(env);

  let query = `
    SELECT name, displayName, price, "limit", priceId, productId,
           features, popular, inventory, soldOut, mode,
           publishableKey, projectType, trialDays
    FROM tiers
    WHERE platformId = ?
  `;
  const params: any[] = [platformId];

  // Filter by publishableKey if provided
  if (options?.publishableKey) {
    query += ' AND (publishableKey = ? OR publishableKey IS NULL)';
    params.push(options.publishableKey);
  }

  // Filter by mode if provided
  if (options?.mode) {
    query += ' AND (mode = ? OR mode IS NULL)';
    params.push(options.mode);
  }

  // Filter by project type if provided
  if (options?.projectType) {
    query += ' AND (projectType = ? OR projectType IS NULL)';
    params.push(options.projectType);
  }

  const result = await env.DB.prepare(query).bind(...params).all();

  return (result.results || []).map((row: any) => {
    // Parse features JSON
    let features: string[] = [];
    let billingMode: 'subscription' | 'one_off' = 'subscription';
    let description = '';
    let imageUrl = '';

    if (row.features) {
      try {
        const parsed = JSON.parse(row.features);
        features = parsed.features || [];
        billingMode = parsed.billingMode || 'subscription';
        description = parsed.description || '';
        imageUrl = parsed.imageUrl || '';
      } catch {}
    }

    return {
      name: row.name,
      displayName: row.displayName,
      price: row.price,
      limit: row.limit === null ? 'unlimited' : row.limit,
      priceId: row.priceId,
      productId: row.productId,
      features,
      billingMode,
      description,
      imageUrl,
      popular: !!row.popular,
      inventory: row.inventory,
      soldOut: !!row.soldOut,
      mode: row.mode,
      publishableKey: row.publishableKey,
      projectType: row.projectType,
      trialDays: row.trialDays ?? null,
    } as TierInput;
  });
}
