/**
 * SIGN-UP WORKER
 *
 * Flow:
 * 1. /signup?pk=xxx&redirect=xxx → serve page with embedded Clerk signup
 * 2. User signs up on OUR page (Clerk SDK embedded)
 * 3. After signup, page calls /oauth/complete
 * 4. Set metadata, create sign-in token
 * 5. Redirect to dev app with __clerk_ticket
 *
 * IMPORTANT: For live keys, this worker MUST be accessed via signup.users.panacea-tech.net
 * (subdomain of users.panacea-tech.net) so Clerk allows SDK loading.
 *
 * AUTO-DETECTS: pk_test_xxx = TEST Clerk, pk_live_xxx = LIVE Clerk
 */

export interface Env {
	// Live Clerk keys (for pk_live_xxx)
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_SECRET_KEY: string;
	// Test Clerk keys (for pk_test_xxx) - optional, falls back to live
	CLERK_PUBLISHABLE_KEY_TEST?: string;
	CLERK_SECRET_KEY_TEST?: string;
	DB: D1Database;
	KV: KVNamespace;
}

// Helper to get the right Clerk keys based on publishable key prefix
// pk_test_xxx → TEST Clerk, pk_live_xxx → LIVE Clerk
function getClerkKeys(pk: string | null, env: Env): { publishableKey: string; secretKey: string } {
	const isTestKey = pk?.startsWith('pk_test_');

	if (isTestKey && env.CLERK_PUBLISHABLE_KEY_TEST && env.CLERK_SECRET_KEY_TEST) {
		return {
			publishableKey: env.CLERK_PUBLISHABLE_KEY_TEST,
			secretKey: env.CLERK_SECRET_KEY_TEST,
		};
	}

	return {
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
		secretKey: env.CLERK_SECRET_KEY,
	};
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

function parseCookies(cookieHeader: string | null): Record<string, string> {
	if (!cookieHeader) return {};
	return Object.fromEntries(
		cookieHeader.split(';').map(c => {
			const [key, ...val] = c.trim().split('=');
			return [key, val.join('=')];
		})
	);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// GET /signup (or / for Clerk callback) - Main signup page
		const hasClerkParams = url.searchParams.has('__clerk_db_jwt') ||
		                       url.searchParams.has('__clerk_handshake') ||
		                       url.searchParams.has('__clerk_status');

		// Also handle / if there's a signup cookie (email verification redirect)
		const cookies = parseCookies(request.headers.get('Cookie'));
		const hasSignupCookie = !!cookies['signup_data'];

		// Handle /signup, /signin, /account, or / with Clerk callback params
		const isAuthRoute = path === '/signup' || path === '/signin' || path === '/account' || (path === '/' && (hasClerkParams || hasSignupCookie));

		if (isAuthRoute && request.method === 'GET') {
			const isSignIn = path === '/signin';
			const isAccount = path === '/account';
			let pk = url.searchParams.get('pk');
			let redirect = url.searchParams.get('redirect');

			// Try to get from cookie if not in URL (Clerk callback case)
			if (!pk || !redirect) {
				if (cookies['signup_data']) {
					try {
						const data = JSON.parse(atob(cookies['signup_data']));
						pk = pk || data.pk;
						redirect = redirect || data.redirect;
					} catch {}
				}
			}

			if (!pk || !redirect) {
				return new Response('Missing pk or redirect parameter', { status: 400 });
			}

			if (!pk.startsWith('pk_test_') && !pk.startsWith('pk_live_')) {
				return new Response('Invalid publishableKey format', { status: 400 });
			}

			const apiKey = await env.DB.prepare('SELECT platformId FROM api_keys WHERE publishableKey = ?')
				.bind(pk).first();
			if (!apiKey) {
				return new Response('Invalid publishableKey - not found', { status: 400 });
			}

			// Get Clerk keys based on pk prefix (pk_test_ = test Clerk, pk_live_ = live Clerk)
			const clerkKeys = getClerkKeys(pk, env);

			// Set cookie to persist pk/redirect through Clerk redirects
			const cookieData = btoa(JSON.stringify({ pk, redirect }));

			const html = isAccount
				? getAccountPageHTML(pk, redirect, clerkKeys.publishableKey)
				: isSignIn
					? getSigninPageHTML(pk, redirect, clerkKeys.publishableKey)
					: getSignupPageHTML(pk, redirect, clerkKeys.publishableKey);

			return new Response(html, {
				headers: {
					'Content-Type': 'text/html',
					'Set-Cookie': `signup_data=${cookieData}; Path=/; Max-Age=600; SameSite=Lax; Secure`,
				},
			});
		}

		// POST /oauth/complete - Set metadata and return sign-in token
		if (path === '/oauth/complete' && request.method === 'POST') {
			try {
				const body = (await request.json()) as { userId: string; publishableKey: string };

				if (!body.userId || !body.publishableKey) {
					return jsonResponse({ error: 'Missing userId or publishableKey' }, 400);
				}

				// Get Clerk keys based on pk prefix
				const clerkKeys = getClerkKeys(body.publishableKey, env);

				// Get user from Clerk
				const checkResponse = await fetch(`https://api.clerk.com/v1/users/${body.userId}`, {
					headers: { 'Authorization': `Bearer ${clerkKeys.secretKey}` },
				});

				if (!checkResponse.ok) {
					return jsonResponse({ error: 'User not found' }, 404);
				}

				const userData = await checkResponse.json() as any;

				// Security: reject if user belongs to different project
				const existingPk = userData.public_metadata?.publishableKey;
				if (existingPk && existingPk !== body.publishableKey) {
					return jsonResponse({ error: 'User belongs to different project', existingProject: true }, 400);
				}

				// Set metadata if not already set
				if (!existingPk) {
					await fetch(`https://api.clerk.com/v1/users/${body.userId}`, {
						method: 'PATCH',
						headers: {
							'Authorization': `Bearer ${clerkKeys.secretKey}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							public_metadata: { publishableKey: body.publishableKey, plan: 'free' },
						}),
					});
				}

				// Sync to D1
				await syncUserToD1(env, {
					userId: body.userId,
					email: userData.email_addresses?.[0]?.email_address || '',
					publishableKey: body.publishableKey,
					plan: 'free',
				});

				// Create sign-in token for dev app
				let signInToken = null;
				const tokenResponse = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${clerkKeys.secretKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						user_id: body.userId,
						expires_in_seconds: 300,
					}),
				});
				if (tokenResponse.ok) {
					const tokenData = await tokenResponse.json() as any;
					signInToken = tokenData.token;
				}

				return jsonResponse({ success: true, signInToken });
			} catch (error: any) {
				return jsonResponse({ error: error.message }, 500);
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};

async function syncUserToD1(
	env: Env,
	data: { userId: string; email: string; publishableKey: string; plan: string }
) {
	const apiKey = await env.DB.prepare('SELECT platformId FROM api_keys WHERE publishableKey = ?')
		.bind(data.publishableKey).first<{ platformId: string }>();

	if (!apiKey) throw new Error('Invalid publishableKey');

	const platformId = apiKey.platformId;
	const now = new Date();
	const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
	const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

	await env.DB.prepare(
		`INSERT INTO end_users (publishableKey, platformId, clerkUserId, email, createdAt)
		 VALUES (?, ?, ?, ?, ?) ON CONFLICT(platformId, publishableKey, clerkUserId) DO UPDATE SET email = excluded.email`
	).bind(data.publishableKey, platformId, data.userId, data.email, now.toISOString()).run();

	await env.DB.prepare(
		`INSERT INTO usage_counts (publishableKey, platformId, userId, plan, usageCount, periodStart, periodEnd, updatedAt)
		 VALUES (?, ?, ?, ?, 0, ?, ?, ?) ON CONFLICT(platformId, userId) DO NOTHING`
	).bind(data.publishableKey, platformId, data.userId, data.plan, periodStart, periodEnd, now.toISOString()).run();
}

function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

function getAccountPageHTML(pk: string, redirect: string, clerkPk: string): string {
	const safeRedirect = escapeJS(redirect);
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Settings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #status {
      color: white;
      text-align: center;
      background: rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #account-box { display: none; }
    .back-link {
      position: fixed;
      top: 20px;
      left: 20px;
      color: white;
      text-decoration: none;
      background: rgba(255,255,255,0.2);
      padding: 10px 20px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
    .back-link:hover { background: rgba(255,255,255,0.3); }
  </style>
</head>
<body>
  <a href="${safeRedirect}" class="back-link">← Back to App</a>
  <div id="status"><div class="spinner"></div><p>Loading...</p></div>
  <div id="account-box"></div>

  <script>
    const PK = '${escapeJS(pk)}';
    const REDIRECT = '${safeRedirect}';

    async function init() {
      // Load Clerk
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      script.setAttribute('data-clerk-publishable-key', '${escapeJS(clerkPk)}');
      document.head.appendChild(script);

      while (!window.Clerk) await new Promise(r => setTimeout(r, 50));
      await window.Clerk.load();

      // Wait for user to be available
      for (let i = 0; i < 30; i++) {
        if (window.Clerk.user) break;
        await new Promise(r => setTimeout(r, 100));
      }

      console.log('[Account] Clerk loaded, user:', window.Clerk.user?.id || 'none');

      // If not signed in, redirect to sign-in
      if (!window.Clerk.user) {
        window.location.href = '/signin?pk=' + PK + '&redirect=' + encodeURIComponent(window.location.href);
        return;
      }

      // Show account management
      document.getElementById('status').style.display = 'none';
      document.getElementById('account-box').style.display = 'block';

      window.Clerk.mountUserProfile(document.getElementById('account-box'), {
        appearance: {
          elements: {
            rootBox: { width: '100%', maxWidth: '800px' },
            card: { boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: '16px' },
          },
        },
      });
    }

    init();
  </script>
</body>
</html>`;
}

// Escape string for safe use in JavaScript string literals
function escapeJS(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function getSigninPageHTML(pk: string, redirect: string, clerkPk: string): string {
	const safeRedirect = escapeJS(redirect);
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #status {
      color: white;
      text-align: center;
      background: rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #signin-box { display: none; }
  </style>
</head>
<body>
  <div id="status"><div class="spinner"></div><p>Loading...</p></div>
  <div id="signin-box"></div>

  <script>
    const PK = '${escapeJS(pk)}';
    const REDIRECT = '${safeRedirect}';

    async function init() {
      // Load Clerk
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      script.setAttribute('data-clerk-publishable-key', '${escapeJS(clerkPk)}');
      document.head.appendChild(script);

      while (!window.Clerk) await new Promise(r => setTimeout(r, 50));
      await window.Clerk.load();

      // Wait for user to be available
      for (let i = 0; i < 30; i++) {
        if (window.Clerk.user) break;
        await new Promise(r => setTimeout(r, 100));
      }

      console.log('[SignIn] Clerk loaded, user:', window.Clerk.user?.id || 'none');

      // If user is signed in → get JWT and redirect
      if (window.Clerk.user) {
        document.getElementById('status').innerHTML = '<div class="spinner"></div><h2>Signing you in...</h2><p>Please wait...</p>';

        // Ensure metadata is set (returning user)
        await fetch('/oauth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: window.Clerk.user.id, publishableKey: PK }),
        });

        // CRITICAL: Reload user to get fresh metadata (plan!) from Clerk server
        await window.Clerk.user.reload();
        console.log('[SignIn] User reloaded, plan:', window.Clerk.user.publicMetadata?.plan);

        // Get JWT from Clerk session - now has fresh metadata
        const jwt = await window.Clerk.session.getToken({ template: 'end-user-api' });
        console.log('[SignIn] Got JWT:', jwt ? 'yes' : 'no');

        // Redirect with JWT - REDIRECT should be absolute URL from SDK
        // If absolute URL, use directly. If relative, build against current origin.
        let redirectUrl;
        if (REDIRECT.startsWith('http://') || REDIRECT.startsWith('https://')) {
          redirectUrl = new URL(REDIRECT);
        } else {
          redirectUrl = new URL(REDIRECT, window.location.origin);
        }
        if (jwt) {
          redirectUrl.searchParams.set('__clerk_jwt', jwt);
        }
        console.log('[SignIn] Redirecting to:', redirectUrl.toString());
        window.location.href = redirectUrl.toString();
        return;
      }

      // No user → show signin form
      document.getElementById('status').style.display = 'none';
      document.getElementById('signin-box').style.display = 'block';

      window.Clerk.mountSignIn(document.getElementById('signin-box'), {
        appearance: {
          elements: {
            rootBox: { width: '100%', maxWidth: '400px' },
            card: { boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: '16px' },
          },
        },
      });
    }

    init();
  </script>
</body>
</html>`;
}

function getSignupPageHTML(pk: string, redirect: string, clerkPk: string): string {
	const safeRedirect = escapeJS(redirect);
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #status {
      color: white;
      text-align: center;
      background: rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #signup-box { display: none; }
  </style>
</head>
<body>
  <div id="status"><div class="spinner"></div><p>Loading...</p></div>
  <div id="signup-box"></div>

  <script>
    const PK = '${escapeJS(pk)}';
    const REDIRECT = '${safeRedirect}';

    async function init() {
      // Load Clerk
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      script.setAttribute('data-clerk-publishable-key', '${escapeJS(clerkPk)}');
      document.head.appendChild(script);

      while (!window.Clerk) await new Promise(r => setTimeout(r, 50));
      await window.Clerk.load();

      // Wait for user to be available (OAuth might need extra time after load)
      for (let i = 0; i < 30; i++) {
        if (window.Clerk.user) break;
        await new Promise(r => setTimeout(r, 100));
      }

      console.log('[SignUp] Clerk loaded, user:', window.Clerk.user?.id || 'none');

      // If user is signed in → they just completed signup, process and redirect
      if (window.Clerk.user) {
        document.getElementById('status').innerHTML = '<div class="spinner"></div><h2>Setting up your account...</h2><p>Please wait...</p>';

        // Call /oauth/complete to set metadata first
        const res = await fetch('/oauth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: window.Clerk.user.id, publishableKey: PK }),
        });
        const data = await res.json();
        console.log('[SignUp] Response:', data);

        if (data.error) {
          console.error('[SignUp] Error:', data.error);
        }

        // CRITICAL: Reload user to get fresh metadata from Clerk server
        await window.Clerk.user.reload();
        console.log('[SignUp] User reloaded, plan:', window.Clerk.user.publicMetadata?.plan);

        // Get JWT from Clerk session - now has fresh metadata
        const jwt = await window.Clerk.session.getToken({ template: 'end-user-api' });
        console.log('[SignUp] Got JWT:', jwt ? 'yes' : 'no');

        // Redirect with JWT - REDIRECT should be absolute URL from SDK
        // If absolute URL, use directly. If relative, build against current origin.
        let redirectUrl;
        if (REDIRECT.startsWith('http://') || REDIRECT.startsWith('https://')) {
          redirectUrl = new URL(REDIRECT);
        } else {
          redirectUrl = new URL(REDIRECT, window.location.origin);
        }
        if (jwt) {
          redirectUrl.searchParams.set('__clerk_jwt', jwt);
        }
        console.log('[SignUp] Redirecting to:', redirectUrl.toString());
        window.location.href = redirectUrl.toString();
        return;
      }

      // No user → show signup form
      document.getElementById('status').style.display = 'none';
      document.getElementById('signup-box').style.display = 'block';

      window.Clerk.mountSignUp(document.getElementById('signup-box'), {
        appearance: {
          elements: {
            rootBox: { width: '100%', maxWidth: '400px' },
            card: { boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: '16px' },
          },
        },
      });
    }

    init();
  </script>
</body>
</html>`;
}
