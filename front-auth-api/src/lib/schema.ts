import { Env } from '../types';

let platformSchemaChecked = false;
let apiKeySchemaChecked = false;

export async function ensurePlatform(env: Env, platformId: string, userId: string) {
  await env.DB.prepare('INSERT OR IGNORE INTO platforms (platformId, clerkUserId) VALUES (?, ?)')
    .bind(platformId, userId)
    .run();
}

export async function ensurePlatformSchema(env: Env) {
  if (platformSchemaChecked) return;
  platformSchemaChecked = true;

  // Create table if not exists
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS platforms (
      platformId TEXT PRIMARY KEY,
      clerkUserId TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  // Add billing columns (safe migrations - ignore if already exists)
  const billingColumns = [
    "ALTER TABLE platforms ADD COLUMN stripeCustomerId TEXT",
    "ALTER TABLE platforms ADD COLUMN stripeSubscriptionId TEXT",
    "ALTER TABLE platforms ADD COLUMN subscriptionStatus TEXT DEFAULT 'none'",
    "ALTER TABLE platforms ADD COLUMN trialEndsAt INTEGER",
    "ALTER TABLE platforms ADD COLUMN currentPeriodEnd INTEGER",
  ];

  for (const sql of billingColumns) {
    try { await env.DB.prepare(sql).run(); } catch {}
  }
}

export async function ensureApiKeySchema(env: Env) {
  if (apiKeySchemaChecked) return;
  apiKeySchemaChecked = true;
  try {
    await env.DB.prepare("ALTER TABLE api_keys ADD COLUMN mode TEXT DEFAULT 'live'").run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN name TEXT').run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectId TEXT').run();
  } catch {}
  try {
    await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectType TEXT').run();
  } catch {}
}
