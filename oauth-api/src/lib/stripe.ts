/**
 * ============================================================================
 * STRIPE LIB - Stripe Token Management
 * ============================================================================
 *
 * Functions for managing Stripe Connect OAuth tokens.
 *
 * STRIPE CONNECT:
 * When developers connect their Stripe account, we get an access token
 * that lets us create products, prices, and checkout sessions on THEIR
 * Stripe account. This is how we handle payments for our customers'
 * customers without touching the money ourselves.
 *
 * TOKEN STORAGE:
 * - D1: Source of truth for tokens
 * - KV: Fast lookup cache (duplicated for quick access)
 *
 * SECURITY:
 * - Access tokens are sensitive - treat like passwords
 * - We store them encrypted in production (TODO)
 * - Tokens can be revoked by developer in Stripe dashboard
 *
 * ============================================================================
 */

import { Env } from '../types';
import { ensureStripeTokenSchema } from './schema';

/**
 * Save Stripe Connect credentials to D1
 *
 * @param env - Worker environment
 * @param platformId - Developer's platform ID
 * @param stripeUserId - Connected account ID (acct_xxx)
 * @param accessToken - OAuth access token for API calls
 * @param refreshToken - Token for refreshing access (if provided)
 * @param scope - OAuth scope granted
 * @param mode - 'test' or 'live' (defaults to live)
 */
export async function saveStripeToken(
  env: Env,
  platformId: string,
  stripeUserId: string,
  accessToken: string,
  refreshToken?: string,
  scope?: string,
  mode: 'live' | 'test' = 'live'
) {
  // Ensure schema has mode column
  await ensureStripeTokenSchema(env);

  // Insert or update token
  await env.DB.prepare(`
    INSERT OR REPLACE INTO stripe_tokens (
      platformId,
      stripeUserId,
      accessToken,
      refreshToken,
      scope,
      mode
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(
      platformId,
      stripeUserId,
      accessToken,
      refreshToken ?? null,
      scope ?? null,
      mode
    )
    .run();

  console.log(`[Stripe] Saved token for platform ${platformId} (${mode} mode)`);
}

/**
 * Get Stripe credentials from D1
 *
 * @param env - Worker environment
 * @param platformId - Developer's platform ID
 * @param mode - 'test' or 'live' (optional, returns any if not specified)
 */
export async function getStripeToken(
  env: Env,
  platformId: string,
  mode?: 'live' | 'test'
): Promise<{
  accessToken: string;
  stripeUserId: string;
  refreshToken: string | null;
} | null> {
  let query = `
    SELECT accessToken, stripeUserId, refreshToken
    FROM stripe_tokens
    WHERE platformId = ?
  `;
  const params: any[] = [platformId];

  if (mode) {
    query += ' AND (mode = ? OR mode IS NULL)';
    params.push(mode);
  }

  query += ' LIMIT 1';

  const row = await env.DB.prepare(query)
    .bind(...params)
    .first<{
      accessToken: string;
      stripeUserId: string;
      refreshToken: string | null;
    }>();

  return row || null;
}
