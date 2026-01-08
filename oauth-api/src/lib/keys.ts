/**
 * ============================================================================
 * KEYS LIB - API Key Management
 * ============================================================================
 *
 * Functions for creating and managing API keys.
 *
 * KEY FORMAT:
 *   Publishable: pk_{mode}_{32 hex chars}
 *   Secret: sk_{mode}_{64 hex chars}
 *
 * STORAGE:
 *   - D1: Stores publishableKey and secretKeyHash (SHA-256 of secretKey)
 *   - Never store plain secretKey in database!
 *   - Plain secretKey only shown ONCE at creation time
 *
 * THE publishableKey IS THE PROJECT:
 *   - Each key pair = one project
 *   - projectType (saas|store) is locked at creation
 *   - mode (test|live) is embedded in key prefix
 *
 * ============================================================================
 */

import { Env, ProjectType } from '../types';
import { ensureApiKeySchema } from './schema';

/**
 * Insert or update an API key in D1
 *
 * @param env - Worker environment
 * @param platformId - Developer's platform ID (plt_xxx)
 * @param publishableKey - The public key (pk_test_xxx or pk_live_xxx)
 * @param secretKeyHash - SHA-256 hash of the secret key
 * @param mode - 'test' or 'live'
 * @param name - Display name for this project
 * @param projectType - 'saas' or 'store' (LOCKED - can't change later)
 * @param enableTax - Enable Stripe automatic tax collection
 */
export async function upsertApiKey(
  env: Env,
  platformId: string,
  publishableKey: string,
  secretKeyHash: string,
  mode: 'live' | 'test' = 'live',
  name?: string,
  projectType?: ProjectType,
  enableTax?: boolean
) {
  // Ensure schema has all columns
  await ensureApiKeySchema(env);

  // Insert or replace the key
  // Note: publishableKey is unique, so this updates if exists
  await env.DB.prepare(`
    INSERT OR REPLACE INTO api_keys (
      platformId,
      publishableKey,
      secretKeyHash,
      status,
      mode,
      name,
      projectType,
      enableTax
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      platformId,
      publishableKey,
      secretKeyHash,
      'active',
      mode,
      name || null,
      projectType || null,
      enableTax ? 1 : 0
    )
    .run();

  console.log(`[Keys] Upserted key ${publishableKey} for platform ${platformId}`);
}

/**
 * Update just the secret key hash (for key rotation)
 *
 * This is used when rotating a secret key:
 * 1. Generate new secretKey
 * 2. Hash it
 * 3. Update only the hash, everything else stays same
 *
 * @param env - Worker environment
 * @param publishableKey - The public key (identifies the project)
 * @param newSecretKeyHash - New SHA-256 hash
 */
export async function updateSecretKeyHash(
  env: Env,
  publishableKey: string,
  newSecretKeyHash: string
): Promise<boolean> {
  const result = await env.DB.prepare(`
    UPDATE api_keys
    SET secretKeyHash = ?
    WHERE publishableKey = ?
  `)
    .bind(newSecretKeyHash, publishableKey)
    .run();

  return result.meta.changes > 0;
}

/**
 * Get API key info by publishable key
 */
export async function getApiKey(
  env: Env,
  publishableKey: string
): Promise<{
  platformId: string;
  projectType: ProjectType | null;
  mode: string;
  name: string | null;
  enableTax: boolean;
} | null> {
  const row = await env.DB.prepare(`
    SELECT platformId, projectType, mode, name, enableTax
    FROM api_keys
    WHERE publishableKey = ?
    LIMIT 1
  `)
    .bind(publishableKey)
    .first<{
      platformId: string;
      projectType: string | null;
      mode: string;
      name: string | null;
      enableTax: number | null;
    }>();

  if (!row) return null;

  return {
    platformId: row.platformId,
    projectType: row.projectType as ProjectType | null,
    mode: row.mode,
    name: row.name,
    enableTax: !!row.enableTax,
  };
}

/**
 * List all API keys for a platform
 */
export async function listApiKeys(
  env: Env,
  platformId: string
): Promise<Array<{
  publishableKey: string;
  projectType: ProjectType | null;
  mode: string;
  name: string | null;
  status: string;
}>> {
  const result = await env.DB.prepare(`
    SELECT publishableKey, projectType, mode, name, status
    FROM api_keys
    WHERE platformId = ?
    ORDER BY createdAt DESC
  `)
    .bind(platformId)
    .all<{
      publishableKey: string;
      projectType: string | null;
      mode: string;
      name: string | null;
      status: string;
    }>();

  return (result.results || []).map(row => ({
    publishableKey: row.publishableKey,
    projectType: row.projectType as ProjectType | null,
    mode: row.mode,
    name: row.name,
    status: row.status,
  }));
}
