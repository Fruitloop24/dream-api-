/**
 * ============================================================================
 * FRONT-AUTH-API - Platform Authentication & Payment
 * ============================================================================
 *
 * PURPOSE:
 * Handle YOUR platform's authentication, payment, and credential generation.
 * Customers sign up, pay YOU $29/mo, get platformId + API key.
 *
 * ENDPOINTS:
 * POST /verify-auth           - Verify JWT, return userId
 * POST /create-checkout       - Create Stripe checkout ($29/mo)
 * POST /webhook/stripe        - Handle payment webhooks (update JWT)
 * POST /generate-credentials  - Generate platformId + API key
 * GET  /get-credentials       - Get existing credentials
 *
 * AUTH:
 * Clerk JWT verification (YOUR Clerk app for platform)
 *
 * ============================================================================
 */

/// <reference types="@cloudflare/workers-types" />

import { createClerkClient } from '@clerk/backend';
import { handleStripeWebhook } from './webhook';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  FRONTEND_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;
  TOKENS_KV: KVNamespace;
  USAGE_KV: KVNamespace;
  DB: D1Database;
  dream_api_assets?: R2Bucket;
}

/**
 * Usage data structure stored in KV
 * Key format: `usage:{userId}`
 * For YOUR platform developers (not their end-users)
 */
interface UsageData {
  usageCount: number;        // Number of API calls made in current period
  plan: 'free' | 'paid';     // Developer's current plan
  lastUpdated: string;       // ISO timestamp of last update
  periodStart?: string;      // Billing period start (YYYY-MM-DD)
  periodEnd?: string;        // Billing period end (YYYY-MM-DD)
}

/**
 * Platform tier configuration
 * Defines limits and pricing for YOUR developers
 */
const PLATFORM_TIERS: Record<string, { limit: number; price: number; name: string }> = {
  free: {
    name: 'Free',
    price: 0,
    limit: 5  // 5 API calls per month
  },
  paid: {
    name: 'Paid',
    price: 29,  // $29/month
    limit: 500  // 500 API calls per month
  }
};

const RATE_LIMIT_PER_MINUTE = 100;

// ============================================================================
// D1 HELPERS
// ============================================================================

async function getPlatformIdFromDb(userId: string, env: Env): Promise<string | null> {
  const row = await env.DB.prepare('SELECT platformId FROM platforms WHERE clerkUserId = ?')
    .bind(userId)
    .first<{ platformId: string }>();
  return row?.platformId ?? null;
}

async function insertPlatform(env: Env, platformId: string, userId: string): Promise<void> {
  await env.DB.prepare('INSERT OR IGNORE INTO platforms (platformId, clerkUserId) VALUES (?, ?)')
    .bind(platformId, userId)
    .run();
}

async function getPublishableKeyFromDb(platformId: string, env: Env): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT publishableKey FROM api_keys WHERE platformId = ? ORDER BY createdAt DESC LIMIT 1'
  )
    .bind(platformId)
    .first<{ publishableKey: string }>();
  return row?.publishableKey ?? null;
}

// ============================================================================
// USAGE TRACKING UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current billing period (calendar month)
 * Returns first day and last day of current month in UTC
 */
function getCurrentPeriod(): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return {
    start: start.toISOString().split('T')[0],  // "2025-11-01"
    end: end.toISOString().split('T')[0]        // "2025-11-30"
  };
}

/**
 * Check if usage data needs reset for new billing period
 */
function shouldResetUsage(usageData: UsageData): boolean {
  const currentPeriod = getCurrentPeriod();

  // No period data = first time, reset
  if (!usageData.periodStart || !usageData.periodEnd) {
    return true;
  }

  // Different month = new period, reset
  return currentPeriod.start !== usageData.periodStart;
}

/**
 * Rate limiting check using KV storage
 * 100 requests per minute per developer
 */
async function checkRateLimit(
  userId: string,
  env: Env
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const rateLimitKey = `ratelimit:${userId}:${minute}`;

  const currentCount = await env.USAGE_KV.get(rateLimitKey);
  const count = currentCount ? parseInt(currentCount) : 0;

  if (count >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  // Increment and set TTL of 2 minutes (auto-cleanup)
  await env.USAGE_KV.put(
    rateLimitKey,
    (count + 1).toString(),
    { expirationTtl: 120 }
  );

  return {
    allowed: true,
    remaining: RATE_LIMIT_PER_MINUTE - count - 1
  };
}

/**
 * Main usage tracking handler
 * Call this on EVERY API endpoint that should count toward limits
 */
async function trackUsage(
  userId: string,
  plan: 'free' | 'paid',
  env: Env
): Promise<{ success: boolean; usage?: any; error?: string }> {
  // Load usage data from KV
  const usageKey = `usage:${userId}`;
  const usageDataRaw = await env.USAGE_KV.get(usageKey);
  const currentPeriod = getCurrentPeriod();

  let usageData: UsageData = usageDataRaw
    ? JSON.parse(usageDataRaw)
    : {
        usageCount: 0,
        plan,
        lastUpdated: new Date().toISOString(),
        periodStart: currentPeriod.start,
        periodEnd: currentPeriod.end,
      };

  const tierLimit = PLATFORM_TIERS[plan]?.limit || 0;

  // Reset usage if new billing period
  if (shouldResetUsage(usageData)) {
    usageData.usageCount = 0;
    usageData.periodStart = currentPeriod.start;
    usageData.periodEnd = currentPeriod.end;
  }

  // Update plan (in case it changed in JWT)
  usageData.plan = plan;

  // Check if tier limit exceeded
  if (usageData.usageCount >= tierLimit) {
    return {
      success: false,
      error: 'Tier limit reached',
      usage: {
        count: usageData.usageCount,
        limit: tierLimit,
        plan,
        periodStart: usageData.periodStart,
        periodEnd: usageData.periodEnd,
        message: 'Please upgrade to unlock more requests'
      }
    };
  }

  // Increment usage count
  usageData.usageCount++;
  usageData.lastUpdated = new Date().toISOString();
  await env.USAGE_KV.put(usageKey, JSON.stringify(usageData));

  return {
    success: true,
    usage: {
      count: usageData.usageCount,
      limit: tierLimit,
      plan,
      periodStart: usageData.periodStart,
      periodEnd: usageData.periodEnd,
      remaining: tierLimit - usageData.usageCount
    }
  };
}

// ============================================================================
// CORS & AUTH HELPERS
// ============================================================================

/**
 * CORS headers for configurator frontend
 */
function getCorsHeaders(origin: string, env: Env): Record<string, string> {
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:5173', // Local dev
    'http://localhost:5174',
  ];

  // Allow CF Pages hash URLs (e.g., https://8c888735.dream-frontend-dyn.pages.dev)
  const isHashUrl = /^https:\/\/[a-z0-9]+\.dream-frontend-dyn\.pages\.dev$/.test(origin);
  const isMainPages = origin === 'https://dream-frontend-dyn.pages.dev';
  const isAllowed = allowedOrigins.includes(origin) || isHashUrl || isMainPages;

  console.log(`[CORS] Origin: ${origin}, isHashUrl: ${isHashUrl}, isAllowed: ${isAllowed}`);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Verify Clerk JWT and extract userId
 */
async function verifyAuth(request: Request, env: Env): Promise<string> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const clerkClient = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });

  const { toAuth } = await clerkClient.authenticateRequest(request, {
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });

  const auth = toAuth();

  if (!auth || !auth.userId) {
    throw new Error('Unauthorized');
  }

  return auth.userId;
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = getCorsHeaders(origin, env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Verify JWT and return userId
      if (url.pathname === '/verify-auth' && request.method === 'POST') {
        const userId = await verifyAuth(request, env);
        console.log(`[Config] Verified auth for user: ${userId}`);

        // Get user plan from Clerk metadata
        const clerkClient = createClerkClient({
          secretKey: env.CLERK_SECRET_KEY,
          publishableKey: env.CLERK_PUBLISHABLE_KEY,
        });
        const user = await clerkClient.users.getUser(userId);
        const plan = (user.publicMetadata.plan as 'free' | 'paid') || 'free';

        // Check rate limit
        const rateLimit = await checkRateLimit(userId, env);
        if (!rateLimit.allowed) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Try again in 1 minute.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Track usage
        const usageResult = await trackUsage(userId, plan, env);
        if (!usageResult.success) {
          return new Response(
            JSON.stringify({ error: usageResult.error, ...usageResult.usage }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            userId,
            usage: usageResult.usage
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    // Create Stripe checkout session for $29/mo subscription
      if (url.pathname === '/create-checkout' && request.method === 'POST') {
        const userId = await verifyAuth(request, env);

        // Get user plan
        const clerkClient = createClerkClient({
          secretKey: env.CLERK_SECRET_KEY,
          publishableKey: env.CLERK_PUBLISHABLE_KEY,
        });
        const user = await clerkClient.users.getUser(userId);
        const plan = (user.publicMetadata.plan as 'free' | 'paid') || 'free';

        // Check rate limit
        const rateLimit = await checkRateLimit(userId, env);
        if (!rateLimit.allowed) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Try again in 1 minute.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Track usage
        const usageResult = await trackUsage(userId, plan, env);
        if (!usageResult.success) {
          return new Response(
            JSON.stringify({ error: usageResult.error, ...usageResult.usage }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-11-17.clover' });

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price: env.STRIPE_PRICE_ID,
            quantity: 1,
          }],
          mode: 'subscription',
          success_url: `${env.FRONTEND_URL}/dashboard?payment=success`,
          cancel_url: `${env.FRONTEND_URL}/dashboard?payment=cancelled`,
          client_reference_id: userId,
          metadata: { userId, tier: 'paid' },  // Add tier to metadata for webhook
        });

        console.log(`[Payment] Created checkout session for user: ${userId}`);

        return new Response(
          JSON.stringify({
            checkoutUrl: session.url,
            usage: usageResult.usage
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Authenticated asset upload (before API keys exist)
      if (url.pathname === '/upload-asset' && request.method === 'POST') {
        if (!env.dream_api_assets) {
          return new Response(JSON.stringify({ error: 'Assets bucket not configured' }), {
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userId = await verifyAuth(request, env);

        // Get platformId from D1 or KV (generated at login)
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (!platformId) {
          return new Response(JSON.stringify({ error: 'Platform ID not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let body: { filename?: string; contentType?: string; data?: string };
        try {
          body = await request.json();
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!body.filename || !body.data) {
          return new Response(JSON.stringify({ error: 'Missing filename or data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const key = `${platformId}/${Date.now()}-${sanitizeFilename(body.filename)}`;
        const bytes = decodeBase64(body.data);
        await env.dream_api_assets.put(key, bytes, {
          httpMetadata: {
            contentType: body.contentType || 'application/octet-stream',
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        return new Response(
          JSON.stringify({ key, url: `${env.FRONTEND_URL.replace(/\/$/, '')}/api/assets/${key}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate platformId (IMMEDIATELY after successful login)
      // This is called BEFORE payment, BEFORE OAuth
      // platformId is stable internal ID that NEVER changes
      if (url.pathname === '/generate-platform-id' && request.method === 'POST') {
        const userId = await verifyAuth(request, env);

        // Check if already generated (idempotent) - DB first, KV fallback
        const existingDb = await getPlatformIdFromDb(userId, env);
        if (existingDb) {
          // Mirror back to KV if missing
          const existingKv = await env.TOKENS_KV.get(`user:${userId}:platformId`);
          if (!existingKv) {
            await env.TOKENS_KV.put(`user:${userId}:platformId`, existingDb);
            await env.TOKENS_KV.put(`platform:${existingDb}:userId`, userId);
          }
          console.log(`[PlatformID] Already exists for user ${userId}: ${existingDb}`);
          return new Response(
            JSON.stringify({ platformId: existingDb }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Legacy KV check (older data before D1)
        const legacyKv = await env.TOKENS_KV.get(`user:${userId}:platformId`);
        if (legacyKv) {
          await insertPlatform(env, legacyKv, userId);
          await env.TOKENS_KV.put(`platform:${legacyKv}:userId`, userId);
          console.log(`[PlatformID] Migrated KV platform for user ${userId}: ${legacyKv}`);
          return new Response(
            JSON.stringify({ platformId: legacyKv }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate new platformId (plt_xxx format)
        const platformId = `plt_${crypto.randomUUID().replace(/-/g, '')}`;

        // Store in D1 (SSOT) + mirror bidirectional mapping in KV
        await insertPlatform(env, platformId, userId);
        await env.TOKENS_KV.put(`user:${userId}:platformId`, platformId);
        await env.TOKENS_KV.put(`platform:${platformId}:userId`, userId);

        console.log(`[PlatformID] Generated for user ${userId}: ${platformId}`);

        return new Response(
          JSON.stringify({ platformId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get platformId (for dashboard display)
      if (url.pathname === '/get-platform-id' && request.method === 'GET') {
        const userId = await verifyAuth(request, env);

        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));

        if (!platformId) {
          return new Response(
            JSON.stringify({ error: 'Platform ID not generated yet' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mirror back to KV if it was missing
        const kvPlatform = await env.TOKENS_KV.get(`user:${userId}:platformId`);
        if (!kvPlatform) {
          await env.TOKENS_KV.put(`user:${userId}:platformId`, platformId);
          await env.TOKENS_KV.put(`platform:${platformId}:userId`, userId);
        }

        return new Response(
          JSON.stringify({ platformId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get credentials (publishableKey + secretKey)
      // Everything read from front-auth-api TOKENS_KV (YOUR dev's data)
      if (url.pathname === '/get-credentials' && request.method === 'GET') {
        const userId = await verifyAuth(request, env);

        // Get platformId (generated at login)
        const platformId =
          (await getPlatformIdFromDb(userId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:platformId`));
        if (!platformId) {
          return new Response(
            JSON.stringify({ error: 'Platform ID not found. Please log in first.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get publishableKey and secretKey (created by oauth-api after tier config)
        // oauth-api writes these as user:{userId}:publishableKey and user:{userId}:secretKey
        const publishableKey =
          (await getPublishableKeyFromDb(platformId, env)) ||
          (await env.TOKENS_KV.get(`user:${userId}:publishableKey`));
        const secretKey = await env.TOKENS_KV.get(`user:${userId}:secretKey`);
        const productsJson = await env.TOKENS_KV.get(`user:${userId}:products`);

        if (!publishableKey || !secretKey) {
          return new Response(
            JSON.stringify({
              error: 'API keys not generated yet. Please configure tiers first.',
              platformId
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const products = productsJson ? JSON.parse(productsJson) : [];

        return new Response(
          JSON.stringify({
            platformId,
            publishableKey,
            secretKey,
            products
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // TODO: Clerk webhook for later - not needed for payment flow

      // Stripe webhook - delegate to webhook handler
      if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
        return await handleStripeWebhook(request, env);
      }

      // Not found
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('[Config] Auth error:', error);
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
