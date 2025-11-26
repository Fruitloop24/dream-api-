/**
 * ============================================================================
 * CONFIG API - Clerk JWT Verification Only
 * ============================================================================
 *
 * PURPOSE:
 * Verify Clerk JWT from configurator and return userId.
 * Frontend then uses userId with auth-api for everything else.
 *
 * ENDPOINTS:
 * POST /verify-auth  - Verify JWT, return userId
 *
 * AUTH:
 * Clerk JWT verification (configurator Clerk app)
 *
 * ============================================================================
 */

/// <reference types="@cloudflare/workers-types" />

import { createClerkClient } from '@clerk/backend';

interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  FRONTEND_URL: string;
}

/**
 * CORS headers for configurator frontend
 */
function getCorsHeaders(origin: string, env: Env): Record<string, string> {
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:5173', // Local dev
    'http://localhost:5174',
  ];

  // Allow CF Pages hash URLs (e.g., https://8c888735.fact-saas-v2.pages.dev)
  const isHashUrl = /^https:\/\/[a-z0-9]+\.fact-saas-v2\.pages\.dev$/.test(origin);
  const isAllowed = allowedOrigins.includes(origin) || isHashUrl;

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

        return new Response(
          JSON.stringify({ success: true, userId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
