/**
 * ============================================================================
 * OAUTH-API - Main Router
 * ============================================================================
 *
 * This worker handles:
 * 1. Stripe Connect OAuth flow (connect developer's Stripe account)
 * 2. Product/tier creation (create Stripe products, generate API keys)
 * 3. Tier management (update/add/delete tiers without changing keys)
 * 4. Test-to-live promotion (create live products from test config)
 *
 * ARCHITECTURE:
 * This worker sits between the frontend and Stripe. It needs access to:
 *
 * - PLATFORM_TOKENS_KV: Developer data (keys, tokens, etc.)
 *   This is the TOKENS_KV from front-auth-api
 *
 * - CUSTOMER_TOKENS_KV: Customer-facing data (tier configs for api-multi)
 *   This is the TOKENS_KV from api-multi
 *
 * - DB: D1 database (source of truth for all data)
 *
 * ROUTES:
 *
 * OAuth Flow:
 *   GET  /authorize     - Start Stripe Connect OAuth
 *   GET  /callback      - Handle Stripe OAuth callback
 *
 * Product Creation:
 *   POST /create-products - Create Stripe products + generate keys
 *
 * Tier Management (no new keys):
 *   GET    /tiers       - List tiers for a platform
 *   PUT    /tiers       - Update tier properties
 *   POST   /tiers/add   - Add new tier to existing project
 *   DELETE /tiers       - Remove a tier
 *
 * Promotion:
 *   POST /promote-to-live - Create live products from test config
 *
 * ============================================================================
 */

/// <reference types="@cloudflare/workers-types" />

import { Env } from './types';

// Import route handlers
import { handleAuthorize, handleCallback, getCorsHeaders } from './routes/oauth';
import { handleCreateProducts } from './routes/products';
import { handleGetTiers, handleUpdateTier, handleAddTier, handleDeleteTier } from './routes/tiers';
import { handlePromoteToLive } from './routes/promote';
import { requireClerkUser } from './lib/auth';

export default {
  /**
   * Main request handler
   * Routes requests to appropriate handler based on path and method
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);

    // =========================================================================
    // CORS PREFLIGHT
    // All routes need CORS headers for frontend access
    // =========================================================================
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // =========================================================================
      // OAUTH ROUTES
      // Handle Stripe Connect authorization flow
      // =========================================================================

      // GET /authorize - Start OAuth flow
      if (url.pathname === '/authorize' && request.method === 'GET') {
        return handleAuthorize(request, env, url);
      }

      // GET /callback - Stripe redirects here after authorization
      if (url.pathname === '/callback' && request.method === 'GET') {
        return handleCallback(request, env, url);
      }

      // =========================================================================
      // PRODUCT CREATION
      // Create Stripe products and generate API keys
      // =========================================================================

      // POST /create-products - Create new project with products and keys
      if (url.pathname === '/create-products' && request.method === 'POST') {
        const userId = await requireClerkUser(request, env);
        return handleCreateProducts(request, env, userId);
      }

      // =========================================================================
      // TIER MANAGEMENT
      // CRUD operations on tiers (no key changes)
      // =========================================================================

      // GET /tiers - List tiers for a platform
      if (url.pathname === '/tiers' && request.method === 'GET') {
        const userId = await requireClerkUser(request, env);
        return handleGetTiers(request, env, url, userId);
      }

      // PUT /tiers - Update tier properties
      if (url.pathname === '/tiers' && request.method === 'PUT') {
        const userId = await requireClerkUser(request, env);
        return handleUpdateTier(request, env, userId);
      }

      // POST /tiers/add - Add new tier to existing project
      if (url.pathname === '/tiers/add' && request.method === 'POST') {
        const userId = await requireClerkUser(request, env);
        return handleAddTier(request, env, userId);
      }

      // DELETE /tiers - Remove a tier
      if (url.pathname === '/tiers' && request.method === 'DELETE') {
        const userId = await requireClerkUser(request, env);
        return handleDeleteTier(request, env, userId);
      }

      // =========================================================================
      // PROMOTION
      // Take test products live
      // =========================================================================

      // POST /promote-to-live - Create live products from test config
      if (url.pathname === '/promote-to-live' && request.method === 'POST') {
        const userId = await requireClerkUser(request, env);
        return handlePromoteToLive(request, env, userId);
      }

      // =========================================================================
      // 404 - Route not found
      // =========================================================================
      return new Response(
        JSON.stringify({ error: 'Not Found', path: url.pathname }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      // Ensure all errors return CORS headers so browser can read the error
      console.error('[oauth-api] Error:', error.message || error);
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          message: error.message || 'Unknown error'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  },
};
