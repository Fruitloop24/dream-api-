/**
 * ============================================================================
 * CONFIG LOADER - Dynamic Tier Configuration
 * ============================================================================
 *
 * Loads tier configuration from D1 database.
 * Filters by platformId + publishableKey + mode.
 *
 * ============================================================================
 */

import { TierConfig, Env } from '../types';
import { ensureTierSchema } from '../services/d1';

interface ConfigTier {
  id: string;
  name: string;
  displayName?: string | null;
  price: number;
  limit: number | 'unlimited';
  features?: string[] | string;
  description?: string;
  billingMode?: 'subscription' | 'one_off';
  imageUrl?: string | null;
  inventory?: number | null;
  soldOut?: boolean;
  popular?: boolean;
  stripePriceId?: string | null;
  priceId?: string | null;
  productId?: string | null;
}

interface Config {
  tiers: ConfigTier[];
}

interface TierConfigData {
  productName?: string;
  tiers: ConfigTier[];
}

/**
 * Load tiers from D1 database
 */
async function loadTiersFromDb(
  env: Env,
  platformId?: string,
  mode: string = 'live',
  publishableKey?: string | null
): Promise<Config | null> {
  if (!platformId || !env.DB) return null;

  await ensureTierSchema(env);

  let query = `
    SELECT name, displayName, price, "limit", priceId, productId, features, popular, inventory, soldOut, projectType, publishableKey
    FROM tiers
    WHERE platformId = ? AND (mode = ? OR mode IS NULL)
  `;
  const params: any[] = [platformId, mode];

  if (publishableKey) {
    query += ' AND (publishableKey = ? OR publishableKey IS NULL)';
    params.push(publishableKey);
  }

  const rows = await env.DB.prepare(query)
    .bind(...params)
    .all<{
      name: string;
      displayName: string | null;
      price: number;
      limit: number | null;
      priceId: string | null;
      productId: string | null;
      features: string | null;
      popular: number | null;
      inventory?: number | null;
      soldOut?: number | null;
      projectType?: string | null;
    }>();

  if (!rows.results || rows.results.length === 0) return null;

  const tiers: ConfigTier[] = rows.results.map((row) => {
    let description = '';
    let billingMode: 'subscription' | 'one_off' = 'subscription';
    let imageUrl: string | null = null;
    let inventory: number | null = null;
    let soldOut = false;
    let features: string[] = [];

    if (row.features) {
      try {
        const parsed = JSON.parse(row.features);
        if (Array.isArray(parsed)) {
          features = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const obj = parsed as {
            description?: string;
            features?: string[] | string;
            billingMode?: string;
            imageUrl?: string;
            inventory?: number | string | null;
          };
          description = obj.description || '';
          if (Array.isArray(obj.features)) features = obj.features;
          else if (typeof obj.features === 'string') features = [obj.features];
          billingMode = obj.billingMode === 'one_off' ? 'one_off' : 'subscription';
          imageUrl = obj.imageUrl || null;
          if (typeof obj.inventory === 'string') {
            const parsedInventory = Number(obj.inventory);
            inventory = Number.isNaN(parsedInventory) ? null : parsedInventory;
          } else {
            inventory = obj.inventory === undefined ? null : (obj.inventory as number | null);
          }
        } else if (typeof parsed === 'string') {
          description = parsed;
        }
      } catch {
        features = row.features.split(',').map((f) => f.trim()).filter(Boolean);
      }
    }

    if (row.inventory !== undefined && row.inventory !== null) {
      inventory = Number(row.inventory);
      if (Number.isNaN(inventory)) inventory = null;
    }

    if (row.soldOut !== undefined && row.soldOut !== null) {
      soldOut = !!row.soldOut;
    }

    if (!soldOut && typeof inventory === 'number' && inventory <= 0) {
      soldOut = true;
    }

    return {
      id: row.name,
      name: row.displayName || row.name,
      displayName: row.displayName || row.name,
      price: row.price,
      limit: row.limit === null ? 'unlimited' : row.limit,
      features,
      description,
      billingMode,
      imageUrl,
      inventory,
      soldOut,
      popular: !!row.popular,
      stripePriceId: row.priceId,
      priceId: row.priceId,
      productId: row.productId,
    };
  });

  return { tiers };
}

/**
 * Load configuration (D1 first, fallback to KV)
 */
async function loadConfig(
  env: Env,
  platformId?: string,
  mode: string = 'live',
  publishableKey?: string | null
): Promise<Config> {
  try {
    // Prefer D1 tiers if available
    const dbConfig = await loadTiersFromDb(env, platformId, mode, publishableKey);
    if (dbConfig) {
      return dbConfig;
    }

    // Fallback: Read from KV
    if (platformId && env?.TOKENS_KV) {
      const tierConfigJson =
        (await env.TOKENS_KV.get(`platform:${platformId}:tierConfig:${mode}`)) ||
        (await env.TOKENS_KV.get(`platform:${platformId}:tierConfig`));
      if (tierConfigJson) {
        const tierData: TierConfigData = JSON.parse(tierConfigJson);
        return { tiers: tierData.tiers || [] };
      }
    }

    console.warn(`[ConfigLoader] No tier config found for platform: ${platformId}`);
    return { tiers: [] };
  } catch (error) {
    console.error('[ConfigLoader] Config load failed:', error);
    throw new Error(`Config load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transform config tiers to TIER_CONFIG format
 */
function transformTiers(tiers: ConfigTier[]): Record<string, TierConfig> {
  const tierConfig: Record<string, TierConfig> = {};

  for (const tier of tiers) {
    const key = tier.id || tier.name;
    tierConfig[key] = {
      name: tier.name,
      price: tier.price,
      limit: tier.limit === 'unlimited' ? Infinity : tier.limit,
    };
  }

  return tierConfig;
}

/**
 * Get tier configuration
 */
export async function getTierConfig(
  env: Env,
  platformId?: string,
  mode: string = 'live',
  publishableKey?: string | null
): Promise<Record<string, TierConfig>> {
  const config = await loadConfig(env, platformId, mode, publishableKey);
  return transformTiers(config.tiers);
}

/**
 * Get Stripe Price ID map
 */
export async function getPriceIdMap(
  env: Env,
  platformId?: string,
  mode: string = 'live',
  publishableKey?: string | null
): Promise<Record<string, string>> {
  const config = await loadConfig(env, platformId, mode, publishableKey);
  const priceIdMap: Record<string, string> = {};

  for (const tier of config.tiers) {
    const priceId = tier.stripePriceId || tier.priceId;
    if (!priceId) continue;

    // Index by id (internal name like 'free', 'pro')
    if (tier.id) {
      priceIdMap[tier.id] = priceId;
      priceIdMap[tier.id.toLowerCase()] = priceId;
    }

    // Also index by display name
    if (tier.name) {
      priceIdMap[tier.name] = priceId;
      priceIdMap[tier.name.toLowerCase()] = priceId;
    }
  }

  return priceIdMap;
}

/**
 * Get all tiers
 */
export async function getAllTiers(
  env: Env,
  platformId?: string,
  mode: string = 'live',
  publishableKey?: string | null
): Promise<ConfigTier[]> {
  const config = await loadConfig(env, platformId, mode, publishableKey);
  return config.tiers.map((t) => ({
    ...t,
    billingMode: t.billingMode || 'subscription',
    displayName: t.displayName || t.name,
    description: t.description || (Array.isArray(t.features) ? '' : typeof t.features === 'string' ? t.features : ''),
    imageUrl: t.imageUrl || null,
    inventory: t.inventory ?? null,
  }));
}

export type { ConfigTier };
