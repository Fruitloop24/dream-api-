import { Env, ProjectType } from '../types';
import { ensureProjectSchema } from './schema';

function generateProjectId(): string {
  return `proj_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export async function getOrCreateProject(env: Env, platformId: string, name: string, type: ProjectType): Promise<string> {
  await ensureProjectSchema(env);
  const trimmedName = name.trim();
  const existing = await env.DB.prepare(
    'SELECT projectId FROM projects WHERE platformId = ? AND name = ? AND type = ? LIMIT 1'
  )
    .bind(platformId, trimmedName, type)
    .first<{ projectId: string }>();
  if (existing?.projectId) return existing.projectId;

  const projectId = generateProjectId();
  await env.DB.prepare(
    'INSERT INTO projects (projectId, platformId, name, type) VALUES (?, ?, ?, ?)'
  )
    .bind(projectId, platformId, trimmedName, type)
    .run();
  return projectId;
}

export async function findProjectId(
  env: Env,
  platformId: string,
  opts: { projectId?: string | null; projectName?: string | null; projectType?: ProjectType | null }
): Promise<string | null> {
  await ensureProjectSchema(env);
  if (opts.projectId) {
    const row = await env.DB.prepare('SELECT projectId FROM projects WHERE platformId = ? AND projectId = ? LIMIT 1')
      .bind(platformId, opts.projectId)
      .first<{ projectId: string }>();
    if (row?.projectId) return row.projectId;
  }
  if (opts.projectName) {
    const row = await env.DB.prepare(
      'SELECT projectId FROM projects WHERE platformId = ? AND name = ? AND type = COALESCE(?, type) LIMIT 1'
    )
      .bind(platformId, opts.projectName.trim(), opts.projectType || null)
      .first<{ projectId: string }>();
    if (row?.projectId) return row.projectId;
  }
  return null;
}
