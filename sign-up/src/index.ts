/**
 * ============================================================================
 * SIGN-UP WORKER - dream-api
 * ============================================================================
 *
 * ROUTES:
 * GET  /signup?pk=xxx&redirect=url  - Redirect to Clerk hosted signup
 * GET  /callback                     - Return from Clerk, set metadata, redirect
 * POST /oauth/complete               - API: verify token, set metadata, sync D1
 *
 * FLOW:
 * 1. Dev's app links to /signup?pk=xxx&redirect=/dashboard
 * 2. We set cookie, redirect to Clerk hosted signup
 * 3. User signs up (email OR Google - Clerk handles all)
 * 4. Clerk redirects to /callback
 * 5. /callback loads Clerk SDK, gets token, calls /oauth/complete
 * 6. We verify token, set metadata, sync D1
 * 7. Redirect to dev's app - user is logged in!
 *
 * ============================================================================
 */

export interface Env {
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_SECRET_KEY: string;
	DB: D1Database;
	KV: KVNamespace;
}

const WORKER_URL = 'https://sign-up.k-c-sheffield012376.workers.dev';
const CLERK_FRONTEND_API = 'https://composed-blowfish-76.accounts.dev';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// -----------------------------------------
		// GET /signup - Redirect to Clerk hosted
		// -----------------------------------------
		if (path === '/signup' && request.method === 'GET') {
			const pk = url.searchParams.get('pk');
			const redirect = url.searchParams.get('redirect');

			if (!pk || !redirect) {
				return new Response('Missing pk or redirect', { status: 400 });
			}

			if (!pk.startsWith('pk_test_') && !pk.startsWith('pk_live_')) {
				return new Response('Invalid publishableKey', { status: 400 });
			}

			// Validate pk exists in D1
			const apiKey = await env.DB.prepare(
				'SELECT platformId FROM api_keys WHERE publishableKey = ?'
			).bind(pk).first();

			if (!apiKey) {
				return new Response('Unknown publishableKey', { status: 400 });
			}

			// Store pk + redirect in cookie
			const cookieValue = btoa(JSON.stringify({ pk, redirect }));
			const callbackUrl = `${WORKER_URL}/callback`;
			const clerkUrl = `${CLERK_FRONTEND_API}/sign-up?redirect_url=${encodeURIComponent(callbackUrl)}`;

			return new Response(null, {
				status: 302,
				headers: {
					'Location': clerkUrl,
					'Set-Cookie': `signup_session=${cookieValue}; Path=/; Max-Age=600; SameSite=Lax; Secure`,
				},
			});
		}

		// -----------------------------------------
		// GET /callback - Return from Clerk
		// -----------------------------------------
		if (path === '/callback' && request.method === 'GET') {
			const cookies = parseCookies(request.headers.get('Cookie'));
			const session = cookies['signup_session'];

			if (!session) {
				return htmlResponse(errorPage('Session expired. Please try again.'));
			}

			let pk: string, redirect: string;
			try {
				const data = JSON.parse(atob(session));
				pk = data.pk;
				redirect = data.redirect;
			} catch {
				return htmlResponse(errorPage('Invalid session.'));
			}

			return htmlResponse(callbackPage(pk, redirect, env.CLERK_PUBLISHABLE_KEY));
		}

		// -----------------------------------------
		// POST /oauth/complete - Set metadata
		// -----------------------------------------
		if (path === '/oauth/complete' && request.method === 'POST') {
			try {
				// Get token from header
				const auth = request.headers.get('Authorization') || '';
				if (!auth.startsWith('Bearer ')) {
					return jsonResponse({ error: 'Missing auth' }, 401);
				}
				const token = auth.replace('Bearer ', '');

				// Verify token with Clerk
				const verifyRes = await fetch('https://api.clerk.com/v1/sessions/verify', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ token }),
				});

				if (!verifyRes.ok) {
					return jsonResponse({ error: 'Invalid token' }, 401);
				}

				const session = (await verifyRes.json()) as { user_id?: string };
				const userId = session.user_id;
				if (!userId) {
					return jsonResponse({ error: 'No user in token' }, 401);
				}

				// Get publishableKey from body
				const body = (await request.json()) as { publishableKey: string };
				if (!body.publishableKey) {
					return jsonResponse({ error: 'Missing publishableKey' }, 400);
				}

				// Get user from Clerk
				const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
					headers: { 'Authorization': `Bearer ${env.CLERK_SECRET_KEY}` },
				});
				if (!userRes.ok) {
					return jsonResponse({ error: 'User not found' }, 404);
				}
				const user = (await userRes.json()) as any;

				// Check if already has different pk (prevent project hopping)
				const existingPk = user.public_metadata?.publishableKey;
				if (existingPk && existingPk !== body.publishableKey) {
					return jsonResponse({ error: 'User belongs to different project', existingProject: true }, 400);
				}

				// Set metadata if not already set
				if (!existingPk) {
					await fetch(`https://api.clerk.com/v1/users/${userId}`, {
						method: 'PATCH',
						headers: {
							'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							public_metadata: { publishableKey: body.publishableKey, plan: 'free' },
						}),
					});
				}

				// Sync to D1
				await syncUserToD1(env, {
					userId,
					email: user.email_addresses?.[0]?.email_address || '',
					publishableKey: body.publishableKey,
					plan: 'free',
				});

				return jsonResponse({ success: true });

			} catch (err: any) {
				return jsonResponse({ error: err.message }, 500);
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};

// =============================================================================
// HELPERS
// =============================================================================

function parseCookies(header: string | null): Record<string, string> {
	if (!header) return {};
	return Object.fromEntries(
		header.split(';').map(c => {
			const [k, ...v] = c.trim().split('=');
			return [k, v.join('=')];
		})
	);
}

async function syncUserToD1(
	env: Env,
	data: { userId: string; email: string; publishableKey: string; plan: string }
) {
	const row = await env.DB.prepare(
		'SELECT platformId FROM api_keys WHERE publishableKey = ?'
	).bind(data.publishableKey).first<{ platformId: string }>();

	if (!row) throw new Error('Invalid publishableKey');

	const platformId = row.platformId;
	const now = new Date();
	const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
	const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

	await env.DB.prepare(`
		INSERT INTO end_users (publishableKey, platformId, clerkUserId, email, createdAt)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(platformId, publishableKey, clerkUserId) DO UPDATE SET email = excluded.email
	`).bind(data.publishableKey, platformId, data.userId, data.email, now.toISOString()).run();

	await env.DB.prepare(`
		INSERT INTO usage_counts (publishableKey, platformId, userId, plan, usageCount, periodStart, periodEnd, updatedAt)
		VALUES (?, ?, ?, ?, 0, ?, ?, ?)
		ON CONFLICT(platformId, userId) DO NOTHING
	`).bind(data.publishableKey, platformId, data.userId, data.plan, periodStart, periodEnd, now.toISOString()).run();
}

function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

function htmlResponse(html: string) {
	return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =============================================================================
// HTML PAGES (minimal)
// =============================================================================

function callbackPage(pk: string, redirect: string, clerkPk: string): string {
	return `<!DOCTYPE html>
<html>
<head>
  <title>Setting up...</title>
  <style>
    body { font-family: system-ui; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .box { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; text-align: center; color: white; }
    .spin { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    #msg { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spin" id="spin"></div>
    <div id="msg">Setting up your account...</div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
    data-clerk-publishable-key="${clerkPk}" async></script>
  <script>
    const PK = ${JSON.stringify(pk)};
    const REDIRECT = ${JSON.stringify(redirect)};

    async function run() {
      // Wait for Clerk
      while (!window.Clerk) await new Promise(r => setTimeout(r, 100));
      await window.Clerk.load();

      // Handle OAuth callback if needed
      try { await window.Clerk.handleRedirectCallback(); } catch {}
      await new Promise(r => setTimeout(r, 300));

      if (!window.Clerk.user) {
        document.getElementById('msg').textContent = 'Redirecting...';
        location.href = REDIRECT;
        return;
      }

      // Get token and set metadata
      const token = await window.Clerk.session.getToken();
      const res = await fetch('/oauth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ publishableKey: PK }),
      });

      document.getElementById('spin').style.display = 'none';
      document.getElementById('msg').textContent = 'Done! Redirecting...';
      setTimeout(() => location.href = REDIRECT, 500);
    }
    run();
  </script>
</body>
</html>`;
}

function errorPage(msg: string): string {
	return `<!DOCTYPE html>
<html>
<head>
  <title>Error</title>
  <style>
    body { font-family: system-ui; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
    h1 { color: #e74c3c; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Oops</h1>
    <p>${escapeHtml(msg)}</p>
    <p><a href="javascript:history.back()">Go back</a></p>
  </div>
</body>
</html>`;
}
