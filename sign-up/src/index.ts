/**
 * SIGN-UP WORKER
 *
 * ONE JOB: Sign up new users
 *
 * Flow:
 * 1. /signup?pk=xxx&redirect=xxx → show Clerk signup form
 * 2. User signs up → Clerk redirects back to /signup
 * 3. Page loads, user is signed in (same domain!)
 * 4. Set metadata, create sign-in token
 * 5. Redirect to dev app with __clerk_ticket
 * 6. Dev app SDK consumes ticket → done
 */

export interface Env {
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_SECRET_KEY: string;
	DB: D1Database;
	KV: KVNamespace;
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

		if ((path === '/signup' || (path === '/' && (hasClerkParams || hasSignupCookie))) && request.method === 'GET') {
			let pk = url.searchParams.get('pk');
			let redirect = url.searchParams.get('redirect');

			// Try to get from cookie if not in URL (Clerk callback case)
			if (!pk || !redirect) {
				const cookies = parseCookies(request.headers.get('Cookie'));
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

			// Set cookie to persist pk/redirect through Clerk redirects
			const cookieData = btoa(JSON.stringify({ pk, redirect }));

			return new Response(getSignupPageHTML(pk, redirect, env.CLERK_PUBLISHABLE_KEY), {
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

				// Get user from Clerk
				const checkResponse = await fetch(`https://api.clerk.com/v1/users/${body.userId}`, {
					headers: { 'Authorization': `Bearer ${env.CLERK_SECRET_KEY}` },
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
						'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
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

function getSignupPageHTML(pk: string, redirect: string, clerkPk: string): string {
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
    const PK = '${pk}';
    const REDIRECT = '${redirect}';

    async function init() {
      // Load Clerk
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      script.setAttribute('data-clerk-publishable-key', '${clerkPk}');
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

        const res = await fetch('/oauth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: window.Clerk.user.id, publishableKey: PK }),
        });
        const data = await res.json();
        console.log('[SignUp] Response:', data);

        // Debug: Store in localStorage so we can check after redirect
        const debug = {
          timestamp: new Date().toISOString(),
          userId: window.Clerk.user.id,
          hasToken: !!data.signInToken,
          tokenLength: data.signInToken ? data.signInToken.length : 0,
          redirect: REDIRECT,
          error: data.error || null
        };
        localStorage.setItem('dream_signup_debug', JSON.stringify(debug));

        // Redirect with token
        let finalUrl = REDIRECT;
        if (data.signInToken) {
          const url = new URL(REDIRECT);
          url.searchParams.set('__clerk_ticket', data.signInToken);
          finalUrl = url.toString();
        } else {
          console.error('[SignUp] NO TOKEN! Response was:', data);
        }
        console.log('[SignUp] Redirecting to:', finalUrl);
        localStorage.setItem('dream_signup_redirect', finalUrl);
        window.location.href = finalUrl;
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
