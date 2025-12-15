import { createClerkClient } from '@clerk/backend';
import { Env } from '../types';
import { ensurePlatform } from './schema';
import { ensureProject } from './projects';
import { upsertApiKey } from './keys';

export async function getPlatformIdFromDb(userId: string, env: Env): Promise<string | null> {
  const row = await env.DB.prepare('SELECT platformId FROM platforms WHERE clerkUserId = ?')
    .bind(userId)
    .first<{ platformId: string }>();
  return row?.platformId ?? null;
}

export async function ensurePlatformForUser(env: Env, userId: string, platformId?: string | null) {
  const existing = platformId || (await getPlatformIdFromDb(userId, env));
  if (existing) return existing;
  const newId = `plt_${crypto.randomUUID().replace(/-/g, '')}`;
  await ensurePlatform(env, newId, userId);
  return newId;
}

export async function clerkClient(env: Env) {
  return createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
}
