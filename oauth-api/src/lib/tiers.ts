import { Env, ProjectType } from '../types';
import { ensureTierSchema } from './schema';

export type TierInput = {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  billingMode?: 'subscription' | 'one_off';
  projectId?: string | null;
  projectType?: ProjectType;
  description?: string;
  imageUrl?: string;
  inventory?: number | null;
  features?: string | string[];
  popular?: boolean;
  priceId: string;
  productId: string;
  mode?: 'live' | 'test';
};

export async function upsertTiers(env: Env, platformId: string, tiers: TierInput[]) {
  await ensureTierSchema(env);
  const stmt = env.DB.prepare(
    'INSERT OR REPLACE INTO tiers (platformId, projectId, projectType, name, displayName, price, "limit", features, popular, priceId, productId, inventory, soldOut, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const tier of tiers) {
    const featuresStr = JSON.stringify({
      description: tier.description || undefined,
      features: tier.features || [],
      billingMode: tier.billingMode || 'subscription',
      imageUrl: tier.imageUrl || '',
      inventory: tier.inventory ?? null,
    });
    const popularFlag = tier.popular ? 1 : 0;
    const projectType = tier.projectType || (tier.billingMode === 'one_off' ? 'store' : 'saas');

    await stmt
      .bind(
        platformId,
        tier.projectId || null,
        projectType,
        tier.name,
        tier.displayName,
        tier.price,
        tier.limit === 'unlimited' ? null : tier.limit,
        featuresStr,
        popularFlag,
        tier.priceId,
        tier.productId,
        tier.inventory ?? null,
        tier.inventory !== null && tier.inventory !== undefined ? (tier.inventory <= 0 ? 1 : 0) : 0,
        tier.mode || 'live'
      )
      .run();
  }
}
