import { Env } from '../types';
import { ensureApiKeySchema } from './schema';

export async function upsertApiKey(
  env: Env,
  platformId: string,
  publishableKey: string,
  secretKeyHash: string,
  mode: 'live' | 'test' = 'live',
  name?: string,
  projectId?: string | null,
  projectType?: string | null
) {
  await ensureApiKeySchema(env);
  await env.DB.prepare(
    'INSERT OR REPLACE INTO api_keys (platformId, projectId, projectType, publishableKey, secretKeyHash, status, mode, name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(platformId, projectId || null, projectType || null, publishableKey, secretKeyHash, 'active', mode, name || null)
    .run();
}
