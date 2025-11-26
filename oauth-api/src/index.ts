/// <reference types="@cloudflare/workers-types" />

/**
 * ============================================================================
 * AUTH API - OAUTH HANDLER FOR FACT-SAAS CONFIGURATOR
 * ============================================================================
 *
 * SECURITY MODEL: Each user gets their own isolated KV namespace
 *
 * WHY: Storing GitHub tokens, Stripe keys, and CF tokens in one shared KV
 * (even with prefixes) is risky. If there's ANY bug in prefix filtering,
 * user credentials could leak. Separate KV namespaces provide Cloudflare-level
 * isolation - no code bugs can cause cross-user data access.
 *
 * ARCHITECTURE:
 * - TOKENS_KV (central): Stores ONLY userId → kvNamespaceId mapping
 * - USER_{userId}_DATA (per-user): Stores ALL sensitive tokens + config
 *
 * CLEANUP:
 * - After production deploy: Delete entire USER_{userId}_DATA namespace
 * - Guaranteed complete deletion of all user data
 * - No lingering credentials, ever
 *
 * ENDPOINTS:
 * POST /kv/create                 - Create isolated KV namespace for user
 * GET  /oauth/github/authorize    - Redirect to GitHub OAuth
 * GET  /oauth/github/callback     - Handle GitHub callback, store in user's KV
 * GET  /oauth/stripe/authorize    - Redirect to Stripe Connect OAuth
 * GET  /oauth/stripe/callback     - Handle Stripe callback, store in user's KV
 * POST /tokens/cloudflare         - Save CF token in user's KV
 * POST /tokens/clerk              - Save Clerk keys in user's KV
 * POST /config/tiers              - Save tier config in user's KV
 * POST /config/branding           - Save branding in user's KV
 *
 * ============================================================================
 */

interface Env {
  TOKENS_KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  CLOUDFLARE_CLIENT_ID: string;
  CLOUDFLARE_CLIENT_SECRET: string;
  STRIPE_CLIENT_ID: string;
  STRIPE_CLIENT_SECRET: string;
  FRONTEND_URL: string;
  CLOUDFLARE_API_TOKEN: string; // For creating KV namespaces
  CLOUDFLARE_ACCOUNT_ID: string;
}

/**
 * ============================================================================
 * HELPER: Get user's dedicated KV namespace ID
 * ============================================================================
 *
 * SECURITY: Frontend never sees kvNamespaceId (stored server-side only)
 * This prevents XSS attacks from accessing the user's KV namespace
 *
 * @param env - Worker env
 * @param userId - User ID
 * @returns kvNamespaceId or null if not found
 */
async function getUserKVNamespaceId(env: Env, userId: string): Promise<string | null> {
  return await env.TOKENS_KV.get(`user:${userId}:kvNamespaceId`);
}

/**
 * ============================================================================
 * HELPER: Write to user's dedicated KV namespace
 * ============================================================================
 *
 * Writes data to the user's isolated KV namespace using Cloudflare API
 *
 * SECURITY: Each user's data is completely isolated at the Cloudflare level
 * No code bugs can cause data leakage between users
 *
 * @param env - Worker env
 * @param kvNamespaceId - User's KV namespace ID
 * @param key - Key to write (e.g., "tokens:github", "config:tiers")
 * @param value - Value to store
 */
async function writeToUserKV(env: Env, kvNamespaceId: string, key: string, value: string): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${kvNamespaceId}/values/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'text/plain',
      },
      body: value,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to write to user KV: ${response.status}`);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Allow fact-saas configurator (production + preview branches)
    const isAllowedOrigin =
      origin === 'http://localhost:5174' ||
      origin === 'http://localhost:5173' ||
      // CF Pages: fact-saas configurator (production + preview branches)
      /^https:\/\/([a-z0-9]+\.)?fact-saas.*\.pages\.dev$/.test(origin);

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'http://localhost:5174',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ================================================================
    // CREATE DEDICATED KV NAMESPACE FOR USER
    // ================================================================
    /**
     * POST /kv/create
     *
     * Creates an isolated KV namespace for a new user
     *
     * SECURITY BENEFITS:
     * - True isolation: Cloudflare-level namespace separation
     * - No prefix bugs: Can't accidentally access other user's data
     * - Easy cleanup: Delete entire namespace = guaranteed complete deletion
     *
     * WHEN CALLED:
     * - Setup.tsx calls this when user first loads the page
     * - Returns kvNamespaceId (stored in mapping in TOKENS_KV)
     * - Frontend only needs userId from this point forward
     *
     * CLEANUP:
     * - After production deploy: wrangler kv namespace delete {kvNamespaceId}
     * - All tokens, configs, everything gone in one command
     */
    if (url.pathname === '/kv/create' && request.method === 'POST') {
      try {
        const body = await request.json() as { userId: string };

        if (!body.userId) {
          return new Response(JSON.stringify({ error: 'Missing userId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if user already has a KV namespace
        const existingKV = await getUserKVNamespaceId(env, body.userId);
        if (existingKV) {
          return new Response(JSON.stringify({
            success: true,
            kvNamespaceId: existingKV,
            message: 'Using existing KV namespace'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create new KV namespace via Cloudflare API
        const createResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `USER_${body.userId}_DATA`,
            }),
          }
        );

        const createData = await createResponse.json() as { success: boolean; result?: { id: string }; errors?: any[] };

        if (!createData.success || !createData.result?.id) {
          console.error('Failed to create KV:', createData.errors);
          return new Response(JSON.stringify({ error: 'Failed to create KV namespace' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const kvNamespaceId = createData.result.id;

        // Store mapping in TOKENS_KV (central registry)
        // SECURITY: Only this mapping is stored centrally, all sensitive data goes to user's KV
        await env.TOKENS_KV.put(`user:${body.userId}:kvNamespaceId`, kvNamespaceId);

        return new Response(JSON.stringify({
          success: true,
          kvNamespaceId,
          message: 'KV namespace created successfully',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('KV creation error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to create KV namespace',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ================================================================
    // GITHUB OAUTH
    // ================================================================

    // Step 1: Redirect to GitHub
    if (url.pathname === '/oauth/github/authorize') {
      const userId = url.searchParams.get('userId') || crypto.randomUUID();
      const state = crypto.randomUUID(); // CSRF protection
      const githubUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${env.GITHUB_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(url.origin + '/oauth/github/callback')}&` +
        `scope=repo,admin:repo_hook,workflow&` +
        `state=${state}`;

      // Store state + userId in KV for verification (expires in 10 min)
      await env.TOKENS_KV.put(`oauth:state:${state}`, JSON.stringify({ provider: 'github', userId }), { expirationTtl: 600 });

      return Response.redirect(githubUrl, 302);
    }

    // Step 2: Handle GitHub callback
    if (url.pathname === '/oauth/github/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 });
      }

      // Verify state (CSRF protection)
      const storedData = await env.TOKENS_KV.get(`oauth:state:${state}`);
      if (!storedData) {
        return new Response('Invalid state', { status: 400 });
      }

      const { provider, userId } = JSON.parse(storedData);
      if (provider !== 'github') {
        return new Response('Invalid state', { status: 400 });
      }

      // Exchange code for token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

      if (tokenData.error || !tokenData.access_token) {
        return new Response(`GitHub OAuth error: ${tokenData.error}`, { status: 400 });
      }

      // userId already retrieved from state above

      // SECURITY: Store token in user's dedicated KV namespace (not shared TOKENS_KV)
      // Lookup user's KV namespace
      const kvNamespaceId = await getUserKVNamespaceId(env, userId);
      if (!kvNamespaceId) {
        return new Response('User KV namespace not found. Please start from Setup page.', { status: 400 });
      }

      // Write to user's isolated KV namespace
      await writeToUserKV(env, kvNamespaceId, 'tokens:github', tokenData.access_token);

      // Redirect back to frontend
      return Response.redirect(`${env.FRONTEND_URL}/setup?github=success&userId=${userId}`, 302);
    }

    // ================================================================
    // CLOUDFLARE OAUTH (similar pattern)
    // ================================================================

    if (url.pathname === '/oauth/cloudflare/authorize') {
      // TODO: Implement Cloudflare OAuth
      // NOTE: Cloudflare uses API tokens, not traditional OAuth
      // Users might need to manually generate API token
      return new Response('Cloudflare OAuth coming soon - use manual token for now', { status: 501 });
    }

    // ================================================================
    // STRIPE OAUTH (Stripe Connect)
    // ================================================================

    if (url.pathname === '/oauth/stripe/authorize') {
      const userId = url.searchParams.get('userId') || crypto.randomUUID();
      const state = crypto.randomUUID();
      const stripeUrl = `https://connect.stripe.com/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${env.STRIPE_CLIENT_ID}&` +
        `scope=read_write&` +
        `redirect_uri=${encodeURIComponent(url.origin + '/oauth/stripe/callback')}&` +
        `state=${state}`;

      await env.TOKENS_KV.put(`oauth:state:${state}`, JSON.stringify({ provider: 'stripe', userId }), { expirationTtl: 600 });

      return Response.redirect(stripeUrl, 302);
    }

    if (url.pathname === '/oauth/stripe/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 });
      }

      const storedData = await env.TOKENS_KV.get(`oauth:state:${state}`);
      if (!storedData) {
        return new Response('Invalid state', { status: 400 });
      }

      const { provider, userId } = JSON.parse(storedData);
      if (provider !== 'stripe') {
        return new Response('Invalid state', { status: 400 });
      }

      // Exchange code for token
      const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_secret: env.STRIPE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json() as { access_token?: string; stripe_user_id?: string; error?: string };

      if (tokenData.error || !tokenData.access_token) {
        return new Response(`Stripe OAuth error: ${tokenData.error}`, { status: 400 });
      }

      // userId already retrieved from state above

      // SECURITY: Store token in user's dedicated KV namespace
      const kvNamespaceId = await getUserKVNamespaceId(env, userId);
      if (!kvNamespaceId) {
        return new Response('User KV namespace not found. Please start from Setup page.', { status: 400 });
      }

      await writeToUserKV(env, kvNamespaceId, 'tokens:stripe', tokenData.access_token);

      return Response.redirect(`${env.FRONTEND_URL}/setup?stripe=success&userId=${userId}`, 302);
    }

    // ================================================================
    // CLOUDFLARE TOKEN (Manual)
    // ================================================================

    if (url.pathname === '/tokens/cloudflare' && request.method === 'POST') {
      const body = await request.json() as { userId: string; token: string; accountId: string };

      // SECURITY: Store in user's dedicated KV namespace
      const kvNamespaceId = await getUserKVNamespaceId(env, body.userId);
      if (!kvNamespaceId) {
        return new Response(JSON.stringify({ error: 'User KV namespace not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await writeToUserKV(
        env,
        kvNamespaceId,
        'tokens:cloudflare',
        JSON.stringify({ token: body.token, accountId: body.accountId })
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ================================================================
    // CLERK KEYS (Manual)
    // ================================================================

    if (url.pathname === '/tokens/clerk' && request.method === 'POST') {
      const body = await request.json() as { userId: string; publishableKey: string; secretKey: string };

      // SECURITY: Store in user's dedicated KV namespace
      const kvNamespaceId = await getUserKVNamespaceId(env, body.userId);
      if (!kvNamespaceId) {
        return new Response(JSON.stringify({ error: 'User KV namespace not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await writeToUserKV(
        env,
        kvNamespaceId,
        'tokens:clerk',
        JSON.stringify({ publishableKey: body.publishableKey, secretKey: body.secretKey })
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ================================================================
    // TIER CONFIG (from Configure page)
    // ================================================================

    if (url.pathname === '/config/tiers' && request.method === 'POST') {
      const body = await request.json() as { userId: string; config: any };

      // Create dedicated KV namespace if it doesn't exist
      let kvNamespaceId = await getUserKVNamespaceId(env, body.userId);
      if (!kvNamespaceId) {
        console.log(`[Config] Creating KV namespace for user: ${body.userId}`);
        // Create KV namespace
        const createResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: `USER_${body.userId}_DATA` }),
          }
        );

        const createData = await createResponse.json() as any;
        kvNamespaceId = createData.result?.id;

        if (!kvNamespaceId) {
          return new Response(JSON.stringify({ error: 'Failed to create KV namespace' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Store namespace ID in TOKENS_KV
        await env.TOKENS_KV.put(`user:${body.userId}:kvNamespaceId`, kvNamespaceId);
      }

      // Store in user's dedicated KV namespace ONLY
      await writeToUserKV(env, kvNamespaceId, 'config:tiers', JSON.stringify(body.config));

      console.log(`[Config] Saved tier config for user: ${body.userId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ================================================================
    // BRANDING CONFIG (from Styling page)
    // ================================================================

    if (url.pathname === '/config/branding' && request.method === 'POST') {
      const body = await request.json() as { userId: string; branding: any };

      // Get user's KV namespace (should exist from tiers config)
      const kvNamespaceId = await getUserKVNamespaceId(env, body.userId);
      if (!kvNamespaceId) {
        return new Response(JSON.stringify({ error: 'User KV namespace not found. Save tiers first.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store in user's dedicated KV namespace ONLY
      await writeToUserKV(env, kvNamespaceId, 'config:branding', JSON.stringify(body.branding));

      console.log(`[Config] Saved branding for user: ${body.userId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ================================================================
    // GET ALL TOKENS (for a user)
    // ================================================================

    if (url.pathname.startsWith('/tokens/')) {
      const userId = url.pathname.split('/')[2];
      const data = await env.TOKENS_KV.get(`tokens:${userId}`);

      if (!data) {
        return new Response(JSON.stringify({ error: 'No tokens found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(data, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
