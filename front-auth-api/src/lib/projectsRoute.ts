import { Env } from '../types';
import { getPlatformIdFromDb } from './auth';
import { listProjects } from './projects';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handleListProjects(env: Env, userId: string): Promise<Response> {
  // Get platformId from D1 or KV
  const platformId =
    (await getPlatformIdFromDb(userId, env)) ||
    (await env.TOKENS_KV.get(`user:${userId}:platformId`));

  if (!platformId) {
    return new Response(JSON.stringify({ error: 'Platform not found', projects: [] }), {
      status: 200, // Return 200 with empty projects so dashboard can show "create project" UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const projects = await listProjects(env, platformId);

  return new Response(JSON.stringify({ platformId, projects }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
