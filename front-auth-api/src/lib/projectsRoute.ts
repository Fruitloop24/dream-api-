import { Env } from '../types';
import { getPlatformIdFromDb } from './auth';
import { listProjects } from './projects';

export async function handleListProjects(env: Env, userId: string): Promise<Response> {
  const platformId =
    (await getPlatformIdFromDb(userId, env)) ||
    (await env.TOKENS_KV.get(`user:${userId}:platformId`));

  if (!platformId) {
    return new Response(JSON.stringify({ error: 'Platform not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const projects = await listProjects(env, platformId);
  return new Response(JSON.stringify({ platformId, projects }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
