import { Env } from '../types';
import { ensureStripeTokenSchema } from './schema';

export async function saveStripeToken(
  env: Env,
  platformId: string,
  stripeUserId: string,
  accessToken: string,
  refreshToken?: string,
  scope?: string,
  mode: 'live' | 'test' = 'live'
) {
  await ensureStripeTokenSchema(env);
  await env.DB.prepare(
    'INSERT OR REPLACE INTO stripe_tokens (platformId, stripeUserId, accessToken, refreshToken, scope, mode) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(platformId, stripeUserId, accessToken, refreshToken ?? null, scope ?? null, mode)
    .run();
}
