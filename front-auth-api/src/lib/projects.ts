/**
 * Projects = API Keys (from D1)
 *
 * Simple query. No KV nonsense.
 */

import { Env } from '../types';

export type ProjectType = 'saas' | 'store';

export interface Project {
  publishableKey: string;
  name: string;
  type: ProjectType;
  mode: 'test' | 'live';
  status: string;
  secretKey?: string | null;
}

/**
 * List all projects for a platform - just query api_keys table
 */
export async function listProjects(env: Env, platformId: string): Promise<Project[]> {
  const result = await env.DB.prepare(`
    SELECT publishableKey, name, projectType, mode, status
    FROM api_keys
    WHERE platformId = ?
    ORDER BY createdAt DESC
  `)
    .bind(platformId)
    .all<{
      publishableKey: string;
      name: string | null;
      projectType: string | null;
      mode: string | null;
      status: string | null;
    }>();

  return (result.results || []).map(row => ({
    publishableKey: row.publishableKey,
    name: row.name || 'Untitled',
    type: (row.projectType as ProjectType) || 'saas',
    mode: (row.mode as 'test' | 'live') || (row.publishableKey.startsWith('pk_test_') ? 'test' : 'live'),
    status: row.status || 'active',
  }));
}
