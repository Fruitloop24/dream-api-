import { Env } from '../types';

let tierSchemaChecked = false;
let apiKeySchemaChecked = false;
let stripeTokenSchemaChecked = false;
let projectSchemaChecked = false;

export async function ensurePlatform(env: Env, platformId: string, userId: string) {
  await env.DB.prepare('INSERT OR IGNORE INTO platforms (platformId, clerkUserId) VALUES (?, ?)')
    .bind(platformId, userId)
    .run();
}

export async function ensureTierSchema(env: Env) {
  if (tierSchemaChecked) return;
  tierSchemaChecked = true;
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN projectId TEXT').run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN projectType TEXT').run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN inventory INTEGER').run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE tiers ADD COLUMN soldOut INTEGER DEFAULT 0').run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE tiers ADD COLUMN mode TEXT DEFAULT 'live'").run();
  } catch {}
}

export async function ensureApiKeySchema(env: Env) {
  if (apiKeySchemaChecked) return;
  apiKeySchemaChecked = true;
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectId TEXT').run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectType TEXT').run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE api_keys ADD COLUMN mode TEXT DEFAULT 'live'").run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN name TEXT').run();
  } catch {}
}

export async function ensureStripeTokenSchema(env: Env) {
  if (stripeTokenSchemaChecked) return;
  stripeTokenSchemaChecked = true;
  try {
    await env.DB.prepare("ALTER TABLE stripe_tokens ADD COLUMN mode TEXT DEFAULT 'live'").run();
  } catch {}
}

export async function ensureProjectSchema(env: Env) {
  if (projectSchemaChecked) return;
  projectSchemaChecked = true;
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
