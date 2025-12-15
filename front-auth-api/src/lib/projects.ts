import { Env } from '../types';
import { ensurePlatformSchema, ensureApiKeySchema } from './schema';

export type ProjectType = 'saas' | 'store';

export async function ensureProjectsTable(env: Env) {
  await ensurePlatformSchema(env);
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS projects (
      projectId TEXT PRIMARY KEY,
      platformId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
}

function newProjectId(): string {
  return `proj_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export async function listProjects(env: Env, platformId: string) {
  await ensureProjectsTable(env);
  await ensureApiKeySchema(env);
  const projects = await env.DB.prepare('SELECT projectId, name, type, createdAt FROM projects WHERE platformId = ? ORDER BY createdAt DESC')
    .bind(platformId)
    .all<{ projectId: string; name: string; type: string; createdAt: string }>();
  const keys = await env.DB.prepare(
    'SELECT publishableKey, status, mode, name, projectId, projectType FROM api_keys WHERE platformId = ? ORDER BY createdAt DESC'
  )
    .bind(platformId)
    .all<{ publishableKey: string; status: string | null; mode: string | null; name: string | null; projectId: string | null; projectType: string | null }>();

  const byProject = new Map<string, any>();
  (projects.results || []).forEach((p) => {
    byProject.set(p.projectId, { projectId: p.projectId, name: p.name, type: p.type as ProjectType, keys: [] });
  });
  for (const k of keys.results || []) {
    const projectId = k.projectId || 'legacy';
    if (!byProject.has(projectId)) {
      byProject.set(projectId, { projectId, name: k.name || 'Legacy', type: (k.projectType as ProjectType) || 'saas', keys: [] });
    }
    const mode = (k.mode as 'test' | 'live') || (k.publishableKey.startsWith('pk_test_') ? 'test' : 'live');
    const secretKey = await env.TOKENS_KV.get(`project:${projectId}:${mode}:secretKey`);
    byProject.get(projectId).keys.push({
      publishableKey: k.publishableKey,
      secretKey: secretKey || null,
      mode,
      status: k.status || 'active',
      projectType: k.projectType || 'saas',
      name: k.name || null,
    });
  }

  return Array.from(byProject.values());
}

export async function ensureProject(env: Env, platformId: string, name: string, type: ProjectType): Promise<string> {
  await ensureProjectsTable(env);
  const existing = await env.DB.prepare(
    'SELECT projectId FROM projects WHERE platformId = ? AND name = ? AND type = ? LIMIT 1'
  )
    .bind(platformId, name.trim(), type)
    .first<{ projectId: string }>();
  if (existing?.projectId) return existing.projectId;

  const projectId = newProjectId();
  await env.DB.prepare('INSERT INTO projects (projectId, platformId, name, type) VALUES (?, ?, ?, ?)')
    .bind(projectId, platformId, name.trim(), type)
    .run();
  return projectId;
}
