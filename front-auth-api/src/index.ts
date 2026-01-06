/// <reference types="@cloudflare/workers-types" />

/**
 * ============================================================================
 * FRONT-AUTH-API - Platform Authentication & Dev Management
 * ============================================================================
 *
 * This service handles authentication for platform OWNERS (devs who pay $15/mo).
 * Uses Clerk App #1 (dream-api) for auth.
 *
 * ENDPOINTS:
 * ----------
 * POST /generate-platform-id  - Create plt_xxx on first login
 * GET  /get-platform-id       - Retrieve existing platformId
 * GET  /get-credentials       - Get test/live keys and products
 * POST /create-checkout       - $19/mo subscription via Stripe (14-day trial)
 * POST /upload-asset          - Upload product images to R2
 * GET  /projects              - List all projects for a dev
 * POST /projects/rotate-key   - Rotate secret key (keep products)
 * POST /verify-auth           - Verify auth + track usage
 * POST /webhook/stripe        - Handle platform subscription events
 * GET  /subscription          - Get subscription status + usage info
 * POST /billing-portal        - Open Stripe billing portal
 *
 * CRON:
 * -----
 * Daily 00:00 UTC             - Report end-user counts to Stripe Meter
 *
 * FLOW:
 * -----
 * 1. Dev signs up via Clerk (dream-api app)
 * 2. /generate-platform-id creates plt_xxx
 * 3. /create-checkout redirects to Stripe ($15/mo)
 * 4. Webhook marks user as paid in Clerk metadata
 * 5. Dev connects Stripe via oauth-api
 * 6. Dev configures products via oauth-api
 * 7. /get-credentials returns their keys
 *
 * STORAGE:
 * --------
 * - D1: platforms, api_keys tables
 * - KV: user:{userId}:platformId, user:{userId}:secretKey:test, etc.
 * - R2: Product images via dream_api_assets bucket
 *
 * ============================================================================
 */

import { createClerkClient } from '@clerk/backend';
import Stripe from 'stripe';
import { Env, PlatformPlan, PlatformSubscriptionInfo, SubscriptionStatus } from './types';
import { handleStripeWebhook } from './webhook';
import { ensurePlatformForUser, getPlatformIdFromDb } from './lib/auth';
import { ensureApiKeySchema, ensurePlatformSchema } from './lib/schema';
import { handleListProjects } from './lib/projectsRoute';
import { rotateSecretKey } from './lib/keyRotation';
import { getLiveEndUserCount, runDailyUsageReport } from './lib/usage';

// ============================================================================ //
// Constants                                                                    //
// ============================================================================ //

const RATE_LIMIT_PER_MINUTE = 100;
const PLATFORM_TIERS: Record<PlatformPlan, { limit: number; price: number; name: string }> = {
  free: { name: 'Free', price: 0, limit: 5 },
  paid: { name: 'Paid', price: 29, limit: 500 },
};

// ============================================================================ //
// Helpers                                                                      //
// ============================================================================ //

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getCorsHeaders(origin: string, env: Env): Record<string, string> {
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
  ];
  const isHashUrl = /^https:\/\/[a-z0-9]+\.dream-frontend-dyn\.pages\.dev$/.test(origin);
  const isMainPages = origin === 'https://dream-frontend-dyn.pages.dev';
  const isAllowed = allowedOrigins.includes(origin) || isHashUrl || isMainPages;
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

async function clerk(env: Env) {
  return createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY });
}

async function verifyAuth(request: Request, env: Env): Promise<string> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Missing or invalid Authorization header');
  const client = await clerk(env);
  const { toAuth } = await client.authenticateRequest(request, {
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
  const auth = toAuth();
  if (!auth?.userId) throw new Error('Unauthorized');
  return auth.userId;
}

async function checkRateLimit(userId: string, env: Env): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = `ratelimit:${userId}:${minute}`;
  const current = await env.USAGE_KV.get(key);
  const count = current ? Number(current) : 0;
  if (count >= RATE_LIMIT_PER_MINUTE) return { allowed: false, remaining: 0 };
  await env.USAGE_KV.put(key, String(count + 1), { expirationTtl: 120 });
  return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - count - 1 };
}

async function trackUsage(userId: string, plan: PlatformPlan, env: Env) {
  const usageKey = `usage:${userId}`;
  const raw = await env.USAGE_KV.get(usageKey);
  const period = getCurrentPeriod();
  const usage = raw ? JSON.parse(raw) as { usageCount: number; plan: PlatformPlan; periodStart?: string; periodEnd?: string } : {
    usageCount: 0,
    plan,
    periodStart: period.start,
    periodEnd: period.end,
  };
  if (!usage.periodStart || usage.periodStart !== period.start) {
    usage.usageCount = 0;
    usage.periodStart = period.start;
    usage.periodEnd = period.end;
  }
  const limit = PLATFORM_TIERS[plan]?.limit || 0;
  if (usage.usageCount >= limit) {
    return { success: false, usage: { ...usage, limit, remaining: 0, message: 'Tier limit reached' } };
  }
  usage.usageCount += 1;
  await env.USAGE_KV.put(usageKey, JSON.stringify(usage));
  return { success: true, usage: { ...usage, limit, remaining: Math.max(0, limit - usage.usageCount) } };
}

async function getPublishableKeyFromDb(platformId: string, env: Env): Promise<string | null> {
  await ensureApiKeySchema(env);
  const row = await env.DB.prepare(
    'SELECT publishableKey FROM api_keys WHERE platformId = ? ORDER BY createdAt DESC LIMIT 1'
  )
    .bind(platformId)
    .first<{ publishableKey: string }>();
  return row?.publishableKey ?? null;
}

// ============================================================================ //
// Routes                                                                        //
// ============================================================================ //

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = getCorsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === '/health') return new Response(JSON.stringify({ status: 'ok' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Stripe webhook - NO AUTH REQUIRED (uses signature verification)
    if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
      return await handleStripeWebhook(request, env);
    }

    try {
      // Authenticated routes
      const userId = await verifyAuth(request, env);

      // Projects list
      if (url.pathname === '/projects' && request.method === 'GET') {
        return await handleListProjects(env, userId);
      }

      // Rotate key
      if (url.pathname === '/projects/rotate-key' && request.method === 'POST') {
        const body = await request.json().catch(() => ({})) as { projectId?: string | null; projectType?: string | null; mode?: 'live' | 'test'; name?: string };
        const mode = body.mode === 'test' ? 'test' : 'live';
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`)) ||
          (await ensurePlatformForUser(env, userId));
        const rotated = await rotateSecretKey(env, platformId, body.projectId || null, body.projectType || null, mode, body.name);
        return new Response(JSON.stringify(rotated), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // DELETE PROJECT - Nukes everything: both keys (test+live), tiers, data, assets
      if (url.pathname === '/projects/delete' && request.method === 'POST') {
        const body = await request.json().catch(() => ({})) as { projectName: string };
        if (!body.projectName) {
          return new Response(JSON.stringify({ error: 'projectName required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (!platformId) {
          return new Response(JSON.stringify({ error: 'Platform not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get all keys for this project (test + live)
        const keysResult = await env.DB.prepare(`
          SELECT publishableKey, secretKeyHash FROM api_keys
          WHERE platformId = ? AND name = ?
        `).bind(platformId, body.projectName).all<{ publishableKey: string; secretKeyHash: string }>();
        const keys = keysResult.results || [];

        if (keys.length === 0) {
          return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const publishableKeys = keys.map(k => k.publishableKey);

        // Delete from D1: api_keys
        await env.DB.prepare(`DELETE FROM api_keys WHERE platformId = ? AND name = ?`).bind(platformId, body.projectName).run();

        // Delete from D1: tiers (for all keys of this project)
        for (const pk of publishableKeys) {
          await env.DB.prepare(`DELETE FROM tiers WHERE platformId = ? AND publishableKey = ?`).bind(platformId, pk).run();
        }

        // Delete from D1: subscriptions, usage_counts, events, end_users
        for (const pk of publishableKeys) {
          await env.DB.prepare(`DELETE FROM subscriptions WHERE platformId = ? AND publishableKey = ?`).bind(platformId, pk).run().catch(() => {});
          await env.DB.prepare(`DELETE FROM usage_counts WHERE platformId = ? AND publishableKey = ?`).bind(platformId, pk).run().catch(() => {});
          await env.DB.prepare(`DELETE FROM events WHERE platformId = ? AND publishableKey = ?`).bind(platformId, pk).run().catch(() => {});
          await env.DB.prepare(`DELETE FROM end_users WHERE platformId = ? AND publishableKey = ?`).bind(platformId, pk).run().catch(() => {});
        }

        // Clear KV cache
        for (const key of keys) {
          await env.TOKENS_KV.delete(`publishablekey:${key.publishableKey}:platformId`).catch(() => {});
          await env.TOKENS_KV.delete(`secretkey:${key.secretKeyHash}:publishableKey`).catch(() => {});
        }
        // Clear user-level KV keys
        await env.TOKENS_KV.delete(`user:${userId}:publishableKey:test`).catch(() => {});
        await env.TOKENS_KV.delete(`user:${userId}:secretKey:test`).catch(() => {});
        await env.TOKENS_KV.delete(`user:${userId}:publishableKey:live`).catch(() => {});
        await env.TOKENS_KV.delete(`user:${userId}:secretKey:live`).catch(() => {});

        // Delete R2 assets for this platform (best effort)
        try {
          const listed = await env.ASSETS.list({ prefix: `${platformId}/` });
          for (const obj of listed.objects) {
            await env.ASSETS.delete(obj.key);
          }
        } catch (e) {
          console.warn('[Delete Project] R2 cleanup failed:', e);
        }

        return new Response(JSON.stringify({ success: true, message: 'Project deleted permanently', deletedKeys: publishableKeys.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // REGENERATE SECRET - New secret key, same publishable key
      if (url.pathname === '/projects/regenerate-secret' && request.method === 'POST') {
        const body = await request.json().catch(() => ({})) as { publishableKey: string };
        if (!body.publishableKey) {
          return new Response(JSON.stringify({ error: 'publishableKey required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (!platformId) {
          return new Response(JSON.stringify({ error: 'Platform not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Verify ownership
        const existing = await env.DB.prepare(`
          SELECT secretKeyHash, mode FROM api_keys WHERE platformId = ? AND publishableKey = ?
        `).bind(platformId, body.publishableKey).first<{ secretKeyHash: string; mode: string }>();
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Key not found or not owned by you' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Generate new secret key (keep same prefix based on mode)
        const mode = existing.mode || (body.publishableKey.startsWith('pk_test_') ? 'test' : 'live');
        const newSecretKey = `sk_${mode}_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newSecretKey));
        const newHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        // Update D1
        await env.DB.prepare(`UPDATE api_keys SET secretKeyHash = ? WHERE publishableKey = ?`).bind(newHash, body.publishableKey).run();

        // Update KV - remove old hash lookup, add new
        await env.TOKENS_KV.delete(`secretkey:${existing.secretKeyHash}:publishableKey`).catch(() => {});
        await env.TOKENS_KV.put(`secretkey:${newHash}:publishableKey`, body.publishableKey);

        // Update user-level secret key in KV (dashboard reads from these)
        await env.TOKENS_KV.put(`user:${userId}:secretKey:${mode}`, newSecretKey);
        // Also update the non-mode-suffixed key for backwards compat
        if (mode === 'live') {
          await env.TOKENS_KV.put(`user:${userId}:secretKey`, newSecretKey);
        }

        return new Response(JSON.stringify({
          success: true,
          publishableKey: body.publishableKey,
          secretKey: newSecretKey,
          mode,
          message: 'Secret key regenerated. Old key no longer works.'
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Verify auth + usage
      if (url.pathname === '/verify-auth' && request.method === 'POST') {
        const client = await clerk(env);
        const user = await client.users.getUser(userId);
        const plan: PlatformPlan = (user.publicMetadata.plan as PlatformPlan) || 'free';
        const rate = await checkRateLimit(userId, env);
        if (!rate.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const usage = await trackUsage(userId, plan, env);
        if (!usage.success) return new Response(JSON.stringify({ error: 'Tier limit reached', ...usage.usage }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true, userId, usage: usage.usage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create checkout ($29/mo)
      if (url.pathname === '/create-checkout' && request.method === 'POST') {
        const client = await clerk(env);
        const user = await client.users.getUser(userId);
        const plan: PlatformPlan = (user.publicMetadata.plan as PlatformPlan) || 'free';
        const rate = await checkRateLimit(userId, env);
        if (!rate.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const usage = await trackUsage(userId, plan, env);
        if (!usage.success) return new Response(JSON.stringify({ error: 'Tier limit reached', ...usage.usage }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-11-17.clover' });
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
          mode: 'subscription',
          subscription_data: { trial_period_days: 14 },
          success_url: `${env.FRONTEND_URL}/dashboard?payment=success`,
          cancel_url: `${env.FRONTEND_URL}/dashboard?payment=cancelled`,
          client_reference_id: userId,
          metadata: { userId, tier: 'paid' },
        });
        return new Response(JSON.stringify({ checkoutUrl: session.url, usage: usage.usage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Upload asset (for product images before keys)
      if (url.pathname === '/upload-asset' && request.method === 'POST') {
        if (!env.dream_api_assets) return new Response(JSON.stringify({ error: 'Assets bucket not configured' }), { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (!platformId) return new Response(JSON.stringify({ error: 'Platform ID not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const body = await request.json().catch(() => ({})) as { filename?: string; contentType?: string; data?: string };
        if (!body.filename || !body.data) return new Response(JSON.stringify({ error: 'Missing filename or data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const key = `${platformId}/${Date.now()}-${sanitizeFilename(body.filename)}`;
        const bytes = decodeBase64(body.data);
        await env.dream_api_assets.put(key, bytes, {
          httpMetadata: {
            contentType: body.contentType || 'application/octet-stream',
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });
        const apiMultiBase = (env.API_MULTI_URL || 'https://api-multi.k-c-sheffield012376.workers.dev').replace(/\/$/, '');
        return new Response(JSON.stringify({ key, url: `${apiMultiBase}/api/assets/${key}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Generate platformId
      if (url.pathname === '/generate-platform-id' && request.method === 'POST') {
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (platformId) {
          await env.TOKENS_KV.put(`user:${userId}:platformId`, platformId);
          await env.TOKENS_KV.put(`platform:${platformId}:userId`, userId);
          return new Response(JSON.stringify({ platformId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const newId = `plt_${crypto.randomUUID().replace(/-/g, '')}`;
        await env.DB.prepare('INSERT OR IGNORE INTO platforms (platformId, clerkUserId) VALUES (?, ?)').bind(newId, userId).run();
        await env.TOKENS_KV.put(`user:${userId}:platformId`, newId);
        await env.TOKENS_KV.put(`platform:${newId}:userId`, userId);
        return new Response(JSON.stringify({ platformId: newId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get platformId
      if (url.pathname === '/get-platform-id' && request.method === 'GET') {
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (!platformId) return new Response(JSON.stringify({ error: 'Platform ID not generated yet' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        await env.TOKENS_KV.put(`user:${userId}:platformId`, platformId);
        await env.TOKENS_KV.put(`platform:${platformId}:userId`, userId);
        return new Response(JSON.stringify({ platformId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get credentials (legacy)
      if (url.pathname === '/get-credentials' && request.method === 'GET') {
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (!platformId) return new Response(JSON.stringify({ error: 'Platform ID not found. Please log in first.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const livePublishableKey =
          (await getPublishableKeyFromDb(platformId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:publishableKey`)) ||
          (await env.TOKENS_KV.get(`user:${userId}:publishableKey:live`));
        const liveSecretKey =
          (await env.TOKENS_KV.get(`user:${userId}:secretKey`)) ||
          (await env.TOKENS_KV.get(`user:${userId}:secretKey:live`));
        const testPublishableKey = await env.TOKENS_KV.get(`user:${userId}:publishableKey:test`);
        const testSecretKey = await env.TOKENS_KV.get(`user:${userId}:secretKey:test`);
        const liveProductsJson =
          (await env.TOKENS_KV.get(`user:${userId}:products`)) ||
          (await env.TOKENS_KV.get(`user:${userId}:products:live`));
        const testProductsJson = await env.TOKENS_KV.get(`user:${userId}:products:test`);

        if (!livePublishableKey && !testPublishableKey) {
          return new Response(JSON.stringify({ error: 'API keys not generated yet. Please configure tiers first.', platformId }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          platformId,
          publishableKey: livePublishableKey || null,
          secretKey: liveSecretKey || null,
          products: liveProductsJson ? JSON.parse(liveProductsJson) : [],
          testPublishableKey: testPublishableKey || null,
          testSecretKey: testSecretKey || null,
          testProducts: testProductsJson ? JSON.parse(testProductsJson) : [],
          livePublishableKey: livePublishableKey || null,
          liveSecretKey: liveSecretKey || null,
          liveProducts: liveProductsJson ? JSON.parse(liveProductsJson) : [],
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get subscription status
      if (url.pathname === '/subscription' && request.method === 'GET') {
        await ensurePlatformSchema(env);
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));

        if (!platformId) {
          return new Response(JSON.stringify({ error: 'Platform not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const platform = await env.DB.prepare(`
          SELECT subscriptionStatus, trialEndsAt, currentPeriodEnd
          FROM platforms WHERE platformId = ?
        `).bind(platformId).first<{
          subscriptionStatus: string | null;
          trialEndsAt: number | null;
          currentPeriodEnd: number | null;
        }>();

        const liveEndUserCount = await getLiveEndUserCount(platformId, env.DB);
        const includedUsers = parseInt(env.INCLUDED_USERS || '2000');
        const overageRate = parseFloat(env.OVERAGE_RATE || '0.03');
        const overageUsers = Math.max(0, liveEndUserCount - includedUsers);
        const estimatedOverage = overageUsers * overageRate;

        const info: PlatformSubscriptionInfo = {
          status: (platform?.subscriptionStatus as SubscriptionStatus) || 'none',
          trialEndsAt: platform?.trialEndsAt ?? undefined,
          currentPeriodEnd: platform?.currentPeriodEnd ?? undefined,
          liveEndUserCount,
          includedUsers,
          overageRate,
          estimatedOverage,
        };

        return new Response(JSON.stringify(info), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Billing portal
      if (url.pathname === '/billing-portal' && request.method === 'POST') {
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));

        const platform = await env.DB.prepare(`
          SELECT stripeCustomerId FROM platforms WHERE platformId = ?
        `).bind(platformId).first<{ stripeCustomerId: string }>();

        if (!platform?.stripeCustomerId) {
          return new Response(JSON.stringify({ error: 'No subscription found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json().catch(() => ({})) as { returnUrl?: string };
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-11-17.clover' });

        const session = await stripe.billingPortal.sessions.create({
          customer: platform.stripeCustomerId,
          return_url: body.returnUrl || `${env.FRONTEND_URL}/dashboard`,
        });

        return new Response(JSON.stringify({ url: session.url }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error) {
      console.error('[front-auth-api] Error:', error);
      return new Response(JSON.stringify({ error: 'Authentication failed', message: error instanceof Error ? error.message : 'Unknown error' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Cron trigger - Daily usage reporting to Stripe Meter
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[front-auth-api] Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);
    await ensurePlatformSchema(env);
    ctx.waitUntil(runDailyUsageReport(env));
  },
};
