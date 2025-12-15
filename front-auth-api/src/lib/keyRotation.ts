import { Env } from '../types';
import { ensureApiKeySchema } from './schema';
import { upsertApiKey } from './keys';

export async function rotateSecretKey(env: Env, platformId: string, projectId: string | null, projectType: string | null, mode: 'live' | 'test', name?: string) {
  await ensureApiKeySchema(env);
  const publishableKey = `pk_${mode === 'test' ? 'test' : 'live'}_${crypto.randomUUID().replace(/-/g, '')}`;
  const secretKey = `sk_${mode === 'test' ? 'test' : 'live'}_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secretKey));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  await upsertApiKey(env, platformId, publishableKey, hashHex, mode, name, projectId, projectType);

  // KV mirrors (best-effort)
  await env.TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, platformId);
  await env.TOKENS_KV.put(`secretkey:${hashHex}:publishableKey`, publishableKey);
  if (projectId) {
    await env.TOKENS_KV.put(`project:${projectId}:${mode}:publishableKey`, publishableKey);
    await env.TOKENS_KV.put(`project:${projectId}:${mode}:secretKey`, secretKey);
  }

  return { publishableKey, secretKey };
}
