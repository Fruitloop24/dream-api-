/**
 * ============================================================================
 * CUSTOM SIGN-UP WORKER - dream-api
 * ============================================================================
 *
 * ROUTES:
 * GET  /signup?pk={pk}&redirect={url} - Serve signup page, set cookie
 * POST /signup/email - Create user with email/password via Clerk Backend API
 * GET  /complete - OAuth callback, handle redirect, set metadata, redirect to dev app
 * POST /oauth/complete - API endpoint to set metadata
 * POST /sync - Sync user to D1
 *
 * OAUTH FLOW (Clerk Custom Flow - bypasses dev browser redirect issues):
 * 1. User lands on /signup?pk=xxx&redirect=xxx
 * 2. Cookie set with {pk, redirect}
 * 3. User clicks "Google" → Clerk SDK initiates OAuth with explicit redirectUrl
 * 4. After Google auth → returns to /complete (we control this!)
 * 5. /complete calls handleRedirectCallback(), sets metadata, redirects to dev app
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
	'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper to parse cookies
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

		// ===========================================
		// GET /signup - Serve signup page + set cookie
		// ===========================================
		if (path === '/signup' && request.method === 'GET') {
			const pk = url.searchParams.get('pk');
			const redirect = url.searchParams.get('redirect');

			if (!pk || !redirect) {
				return new Response('Missing pk or redirect parameter', { status: 400 });
			}

			if (!pk.startsWith('pk_test_') && !pk.startsWith('pk_live_')) {
				return new Response('Invalid publishableKey format', { status: 400 });
			}

			// Validate pk exists
			const apiKey = await env.DB.prepare('SELECT platformId FROM api_keys WHERE publishableKey = ?')
				.bind(pk).first();
			if (!apiKey) {
				return new Response('Invalid publishableKey - not found', { status: 400 });
			}

			// Set cookie with pk and redirect (expires in 10 min)
			const cookieData = JSON.stringify({ pk, redirect });
			const cookieValue = btoa(cookieData); // base64 encode

			return new Response(getSignupPageHTML(pk, redirect, env.CLERK_PUBLISHABLE_KEY), {
				headers: {
					'Content-Type': 'text/html',
					'Set-Cookie': `signup_session=${cookieValue}; Path=/; Max-Age=600; SameSite=Lax; Secure`,
				},
			});
		}

		// ===========================================
		// POST /signup/email - Create user with email/password
		// ===========================================
		if (path === '/signup/email' && request.method === 'POST') {
			try {
				const body = (await request.json()) as {
					email: string;
					password: string;
					publishableKey: string;
					redirect: string;
				};

				if (!body.email || !body.password || !body.publishableKey) {
					return jsonResponse({ error: 'Missing required fields' }, 400);
				}

				// Create user via Clerk Backend API with metadata
				const clerkResponse = await fetch('https://api.clerk.com/v1/users', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						email_address: [body.email],
						password: body.password,
						public_metadata: {
							publishableKey: body.publishableKey,
							plan: 'free',
						},
					}),
				});

				const clerkData = await clerkResponse.json() as any;

				if (!clerkResponse.ok) {
					const errorMsg = clerkData.errors?.[0]?.long_message || clerkData.errors?.[0]?.message || 'Failed to create user';
					return jsonResponse({ error: errorMsg }, clerkResponse.status);
				}

				// Send verification email
				const emailId = clerkData.email_addresses?.[0]?.id;
				if (emailId) {
					await fetch(`https://api.clerk.com/v1/email_addresses/${emailId}/prepare_verification`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							strategy: 'email_link',
							redirect_url: body.redirect,
						}),
					});
				}

				// Sync to D1
				await syncUserToD1(env, {
					userId: clerkData.id,
					email: body.email,
					publishableKey: body.publishableKey,
					plan: 'free',
				});

				return jsonResponse({
					success: true,
					userId: clerkData.id,
					verificationSent: true,
				});

			} catch (error: any) {
				return jsonResponse({ error: error.message }, 500);
			}
		}

		// ===========================================
		// GET /verify - Email verification callback
		// User clicked the link in their email
		// ===========================================
		if (path === '/verify' && request.method === 'GET') {
			const pk = url.searchParams.get('pk');
			const redirect = url.searchParams.get('redirect');

			if (!pk || !redirect) {
				return new Response(getErrorPageHTML('Invalid verification link.'), {
					headers: { 'Content-Type': 'text/html' },
				});
			}

			return new Response(getVerifyPageHTML(pk, redirect, env.CLERK_PUBLISHABLE_KEY), {
				headers: { 'Content-Type': 'text/html' },
			});
		}

		// ===========================================
		// GET /complete - OAuth callback from Clerk SDK
		// Handles redirect callback, sets metadata, redirects to dev app
		// ===========================================
		if (path === '/complete' && request.method === 'GET') {
			// Parse cookie to get pk and redirect
			const cookies = parseCookies(request.headers.get('Cookie'));
			const sessionCookie = cookies['signup_session'];

			if (!sessionCookie) {
				return new Response(getErrorPageHTML('Session expired. Please start the sign-up process again.'), {
					headers: { 'Content-Type': 'text/html' },
				});
			}

			let pk: string, redirect: string;
			try {
				const decoded = JSON.parse(atob(sessionCookie));
				pk = decoded.pk;
				redirect = decoded.redirect;
			} catch {
				return new Response(getErrorPageHTML('Invalid session. Please start over.'), {
					headers: { 'Content-Type': 'text/html' },
				});
			}

			// Serve a page that will:
			// 1. Load Clerk SDK
			// 2. Check if user is signed in
			// 3. Call our API to set metadata
			// 4. Redirect to dev's app
			return new Response(getCompletePageHTML(pk, redirect, env.CLERK_PUBLISHABLE_KEY), {
				headers: {
					'Content-Type': 'text/html',
					// Clear the cookie
					'Set-Cookie': 'signup_session=; Path=/; Max-Age=0',
				},
			});
		}

		// ===========================================
		// POST /oauth/complete - Set user metadata via API
		// Security: Rejects if user already has a publishableKey (prevents project hopping)
		// ===========================================
		if (path === '/oauth/complete' && request.method === 'POST') {
			try {
				const body = (await request.json()) as { userId: string; publishableKey: string };

				if (!body.userId || !body.publishableKey) {
					return jsonResponse({ error: 'Missing userId or publishableKey' }, 400);
				}

				// First, check if user already has metadata set (prevent project hopping)
				const checkResponse = await fetch(`https://api.clerk.com/v1/users/${body.userId}`, {
					headers: { 'Authorization': `Bearer ${env.CLERK_SECRET_KEY}` },
				});

				if (!checkResponse.ok) {
					return jsonResponse({ error: 'User not found' }, 404);
				}

				const userData = await checkResponse.json() as any;

				// Security check: If user has a DIFFERENT publishableKey, reject
				const existingPk = userData.public_metadata?.publishableKey;
				if (existingPk && existingPk !== body.publishableKey) {
					// User belongs to a DIFFERENT project - don't allow changing
					return jsonResponse({
						error: 'User already associated with a different project',
						existingProject: true,
					}, 400);
				}

				// If same pk, just ensure D1 sync (metadata already correct)
				const needsMetadataUpdate = !existingPk;

				// Only update Clerk metadata if not already set
				if (needsMetadataUpdate) {
					const updateResponse = await fetch(`https://api.clerk.com/v1/users/${body.userId}`, {
						method: 'PATCH',
						headers: {
							'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							public_metadata: { publishableKey: body.publishableKey, plan: 'free' },
						}),
					});

					if (!updateResponse.ok) {
						const err = await updateResponse.json() as any;
						return jsonResponse({ error: err.errors?.[0]?.message || 'Failed to update' }, 400);
					}
				}

				// Sync to D1
				await syncUserToD1(env, {
					userId: body.userId,
					email: userData.email_addresses?.[0]?.email_address || '',
					publishableKey: body.publishableKey,
					plan: 'free',
				});

				// Create a sign-in token so the dev's app can auto-sign-in the user
				let signInToken = null;
				try {
					const tokenResponse = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							user_id: body.userId,
							expires_in_seconds: 300, // 5 min expiry
						}),
					});
					if (tokenResponse.ok) {
						const tokenData = await tokenResponse.json() as any;
						signInToken = tokenData.token;
					}
				} catch (e) {
					// Non-critical - user can still sign in manually
					console.error('Failed to create sign-in token:', e);
				}

				return jsonResponse({ success: true, signInToken });
			} catch (error: any) {
				return jsonResponse({ error: error.message }, 500);
			}
		}

		// ===========================================
		// POST /sync - Sync user to D1
		// ===========================================
		if (path === '/sync' && request.method === 'POST') {
			try {
				const body = (await request.json()) as {
					userId: string; email: string; publishableKey: string; plan: string;
				};
				await syncUserToD1(env, body);
				return jsonResponse({ success: true });
			} catch (error: any) {
				return jsonResponse({ error: error.message }, 500);
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};

// ===========================================
// Helper Functions
// ===========================================

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
		 VALUES (?, ?, ?, ?, ?) ON CONFLICT(platformId, publishableKey, clerkUserId) DO UPDATE SET
		 email = excluded.email`
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

// ===========================================
// HTML Pages
// ===========================================

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
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }
    h1 { text-align: center; color: #1a1a2e; margin-bottom: 8px; font-size: 28px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
    .divider {
      display: flex; align-items: center; margin: 24px 0; color: #999; font-size: 13px;
    }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e0e0e0; }
    .divider span { padding: 0 16px; }
    label { display: block; color: #333; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
    input {
      width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px;
      font-size: 16px; margin-bottom: 16px; transition: border-color 0.2s;
    }
    input:focus { outline: none; border-color: #667eea; }
    .btn {
      width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 16px;
      font-weight: 600; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-oauth { background: white; border: 2px solid #e0e0e0; color: #333; margin-bottom: 12px; }
    .btn-oauth:hover { background: #f5f5f5; border-color: #ccc; }
    .btn-oauth:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-oauth svg { width: 20px; height: 20px; }
    .error { background: #fee; border: 1px solid #fcc; color: #c00; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; display: none; }
    .error.show { display: block; }
    .status { text-align: center; color: #666; font-size: 14px; margin-top: 16px; display: none; }
    .status.show { display: block; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #667eea; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer { text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e0e0e0; color: #999; font-size: 13px; }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
  <!-- Load Clerk SDK for OAuth -->
  <script
    async
    crossorigin="anonymous"
    data-clerk-publishable-key="${clerkPk}"
    src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
    type="text/javascript"
  ></script>
</head>
<body>
  <div class="card">
    <h1>Create Account</h1>
    <p class="subtitle">Sign up to get started</p>

    <!-- OAuth - Uses Clerk SDK with explicit redirect control -->
    <button type="button" onclick="googleSignUp()" class="btn btn-oauth" id="google-btn">
      <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continue with Google
    </button>

    <div class="divider"><span>or sign up with email</span></div>

    <div id="error" class="error"></div>
    <form id="signup-form" onsubmit="emailSignup(event)">
      <label>Email</label>
      <input type="email" id="email" placeholder="you@example.com" required>
      <label>Password</label>
      <input type="password" id="password" placeholder="At least 8 characters" required minlength="8">
      <div id="clerk-captcha" style="margin-bottom:16px;"></div>
      <button type="submit" class="btn btn-primary" id="submit-btn">Create Account</button>
    </form>

    <div id="status" class="status"><span class="spinner"></span>Creating your account...</div>

    <div class="footer">
      Already have an account? <a href="${CLERK_FRONTEND_API}/sign-in?redirect_url=${encodeURIComponent(redirect)}">Sign in</a>
    </div>
  </div>

  <script>
    const PK = '${pk}';
    const REDIRECT = '${redirect}';
    const WORKER_URL = '${WORKER_URL}';

    function showError(msg) {
      document.getElementById('error').textContent = msg;
      document.getElementById('error').classList.add('show');
    }
    function setLoading(on, msg) {
      document.getElementById('submit-btn').disabled = on;
      document.getElementById('google-btn').disabled = on;
      document.getElementById('status').classList.toggle('show', on);
      if (msg) document.getElementById('status').innerHTML = '<span class="spinner"></span>' + msg;
    }

    // =====================================================
    // Google OAuth using Clerk SDK with explicit redirects
    // This bypasses dev browser tracking issues!
    // =====================================================
    async function googleSignUp() {
      try {
        document.getElementById('error').classList.remove('show');
        setLoading(true, 'Connecting to Google...');

        // Wait for Clerk to load
        while (!window.Clerk) {
          await new Promise(r => setTimeout(r, 100));
        }
        await window.Clerk.load();

        // Use signUp.authenticateWithRedirect for explicit redirect control
        // This is the key - we specify EXACTLY where to return after OAuth
        await window.Clerk.client.signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: WORKER_URL + '/complete',
          redirectUrlComplete: WORKER_URL + '/complete',
        });

        // Note: This line won't execute - browser redirects to Google
      } catch (err) {
        setLoading(false);
        showError(err.message || 'Failed to connect to Google');
        console.error('Google OAuth error:', err);
      }
    }

    // Store signUp object for verification step
    let currentSignUp = null;
    let userEmail = '';

    // Email/password signup using Clerk SDK with email code verification
    async function emailSignup(e) {
      e.preventDefault();
      document.getElementById('error').classList.remove('show');
      setLoading(true, 'Creating your account...');

      try {
        // Wait for Clerk to load
        while (!window.Clerk) {
          await new Promise(r => setTimeout(r, 100));
        }
        await window.Clerk.load();

        userEmail = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Create signup via Clerk SDK
        currentSignUp = await window.Clerk.client.signUp.create({
          emailAddress: userEmail,
          password: password,
        });

        // Send verification CODE (not link) - stays on same page
        await currentSignUp.prepareEmailAddressVerification({
          strategy: 'email_code',
        });

        // Show code entry form
        setLoading(false);
        document.querySelector('.card').innerHTML = \`
          <div style="text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">📧</div>
            <h1 style="color:#1a1a2e;margin-bottom:12px;">Enter Verification Code</h1>
            <p style="color:#666;margin-bottom:24px;">We sent a 6-digit code to <strong>\${userEmail}</strong></p>
            <div id="code-error" class="error" style="display:none;margin-bottom:16px;"></div>
            <input type="text" id="verification-code" placeholder="000000" maxlength="6"
              style="width:100%;padding:16px;font-size:24px;text-align:center;letter-spacing:8px;border:2px solid #e0e0e0;border-radius:8px;margin-bottom:16px;">
            <button onclick="verifyCode()" class="btn btn-primary" id="verify-btn">Verify & Create Account</button>
            <p style="color:#999;font-size:13px;margin-top:16px;">Didn't get the code? <a href="#" onclick="resendCode();return false;" style="color:#667eea;">Resend</a></p>
          </div>
        \`;
        document.getElementById('verification-code').focus();
      } catch (err) {
        setLoading(false);
        showError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message);
      }
    }

    // Verify the code and complete signup
    async function verifyCode() {
      const code = document.getElementById('verification-code').value.trim();
      if (code.length !== 6) {
        document.getElementById('code-error').textContent = 'Please enter the 6-digit code';
        document.getElementById('code-error').style.display = 'block';
        return;
      }

      document.getElementById('verify-btn').disabled = true;
      document.getElementById('verify-btn').textContent = 'Verifying...';
      document.getElementById('code-error').style.display = 'none';

      try {
        // Attempt verification with the code
        const result = await currentSignUp.attemptEmailAddressVerification({ code });
        console.log('Verification result:', result);

        if (result.status === 'complete') {
          // Success! Set active session
          await window.Clerk.setActive({ session: result.createdSessionId });

          // Now set metadata via our API
          const res = await fetch('/oauth/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: window.Clerk.user.id, publishableKey: PK }),
          });

          const data = await res.json();
          if (!res.ok && !data.existingProject) {
            throw new Error(data.error || 'Failed to setup account');
          }

          // Show success and redirect
          document.querySelector('.card').innerHTML = \`
            <div style="text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">✓</div>
              <h1 style="color:#1a1a2e;margin-bottom:12px;">Account Created!</h1>
              <p style="color:#666;">Redirecting you now...</p>
            </div>
          \`;

          setTimeout(() => window.location.href = REDIRECT, 1500);
        } else {
          throw new Error('Verification incomplete. Status: ' + result.status);
        }
      } catch (err) {
        document.getElementById('verify-btn').disabled = false;
        document.getElementById('verify-btn').textContent = 'Verify & Create Account';
        document.getElementById('code-error').textContent = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message;
        document.getElementById('code-error').style.display = 'block';
      }
    }

    // Resend verification code
    async function resendCode() {
      try {
        await currentSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        alert('New code sent to ' + userEmail);
      } catch (err) {
        alert('Failed to resend: ' + (err.errors?.[0]?.message || err.message));
      }
    }
  </script>
</body>
</html>`;
}

function getCompletePageHTML(pk: string, redirect: string, clerkPk: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Completing Sign Up...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container { text-align: center; padding: 40px; background: rgba(255,255,255,0.1); border-radius: 20px; backdrop-filter: blur(10px); max-width: 400px; }
    .spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 24px; margin-bottom: 10px; }
    p { opacity: 0.9; }
    #status { margin-top: 20px; font-family: monospace; font-size: 14px; opacity: 0.8; }
    .checkmark { font-size: 48px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <div class="checkmark" id="checkmark" style="display:none;">&#10003;</div>
    <h1 id="title">Completing Sign Up</h1>
    <p id="subtitle">Setting up your account...</p>
    <div id="status">Initializing...</div>
  </div>

  <script
    async
    crossorigin="anonymous"
    data-clerk-publishable-key="${clerkPk}"
    src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
    type="text/javascript"
  ></script>

  <script>
    const PK = '${pk}';
    const REDIRECT = '${redirect}';

    function updateStatus(msg) {
      document.getElementById('status').textContent = msg;
    }

    function showSuccess() {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('checkmark').style.display = 'block';
      document.getElementById('title').textContent = 'All Set!';
      document.getElementById('subtitle').textContent = 'Redirecting you now...';
    }

    async function completeSignup() {
      try {
        updateStatus('Loading authentication...');

        // Wait for Clerk to load
        while (!window.Clerk) {
          await new Promise(r => setTimeout(r, 100));
        }

        const clerk = window.Clerk;
        await clerk.load();

        // =====================================================
        // CRITICAL: Handle the OAuth redirect callback first!
        // This completes the OAuth flow and establishes session
        // =====================================================
        updateStatus('Processing OAuth callback...');

        try {
          // handleRedirectCallback completes the OAuth flow
          // It processes the tokens in the URL and establishes the session
          await clerk.handleRedirectCallback();
        } catch (callbackErr) {
          // If callback fails, might already be handled or user directly navigated here
          console.log('Callback handling:', callbackErr.message);
        }

        // Small delay to ensure session is fully established
        await new Promise(r => setTimeout(r, 500));

        // Now check for user
        if (!clerk.user) {
          updateStatus('No session found. Redirecting...');
          setTimeout(() => window.location.href = REDIRECT, 1500);
          return;
        }

        updateStatus('Verifying account...');

        // Check if metadata already set
        const existingPk = clerk.user.publicMetadata?.publishableKey;

        if (existingPk && existingPk !== PK) {
          // User already belongs to a DIFFERENT project - can't reassign
          showSuccess();
          updateStatus('Account exists with different project. Redirecting...');
          setTimeout(() => window.location.href = REDIRECT, 1000);
          return;
        }

        updateStatus('Setting up your account...');

        // Call our API to set metadata
        const res = await fetch('/oauth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: clerk.user.id, publishableKey: PK }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Special case: user already associated (tried to sign up with different dev)
          if (data.existingProject) {
            showSuccess();
            updateStatus('Account exists! Redirecting...');
            setTimeout(() => window.location.href = REDIRECT, 1000);
            return;
          }
          throw new Error(data.error || 'Failed to complete setup');
        }

        showSuccess();
        updateStatus('Account created successfully!');

        // Build redirect URL with sign-in token if available
        let finalRedirect = REDIRECT;
        if (data.signInToken) {
          const url = new URL(REDIRECT);
          url.searchParams.set('__clerk_ticket', data.signInToken);
          finalRedirect = url.toString();
          updateStatus('Signing you in...');
        }

        setTimeout(() => window.location.href = finalRedirect, 1000);

      } catch (err) {
        console.error('Complete signup error:', err);
        updateStatus('Error: ' + err.message);
        // Still redirect after error - user might be able to sign in at app
        setTimeout(() => window.location.href = REDIRECT, 3000);
      }
    }

    // Start when page loads
    window.addEventListener('load', () => setTimeout(completeSignup, 300));
  </script>
</body>
</html>`;
}

function getVerifyPageHTML(pk: string, redirect: string, clerkPk: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifying Email...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container { text-align: center; padding: 40px; background: rgba(255,255,255,0.1); border-radius: 20px; backdrop-filter: blur(10px); max-width: 400px; }
    .spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 24px; margin-bottom: 10px; }
    p { opacity: 0.9; }
    #status { margin-top: 20px; font-family: monospace; font-size: 14px; opacity: 0.8; }
    .checkmark { font-size: 48px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <div class="checkmark" id="checkmark" style="display:none;">✓</div>
    <h1 id="title">Verifying Email</h1>
    <p id="subtitle">Please wait...</p>
    <div id="status">Processing verification...</div>
  </div>

  <script
    async
    crossorigin="anonymous"
    data-clerk-publishable-key="${clerkPk}"
    src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
    type="text/javascript"
  ></script>

  <script>
    const PK = '${pk}';
    const REDIRECT = '${redirect}';

    function updateStatus(msg) {
      document.getElementById('status').textContent = msg;
    }

    function showSuccess() {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('checkmark').style.display = 'block';
      document.getElementById('title').textContent = 'Email Verified!';
      document.getElementById('subtitle').textContent = 'Redirecting you now...';
    }

    function showError(msg) {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('title').textContent = 'Verification Failed';
      document.getElementById('subtitle').textContent = msg;
    }

    async function verifyEmail() {
      try {
        updateStatus('Loading...');

        // Log URL params to see what Clerk sends
        console.log('URL:', window.location.href);
        console.log('Search params:', window.location.search);

        // Wait for Clerk to load
        while (!window.Clerk) {
          await new Promise(r => setTimeout(r, 100));
        }
        await window.Clerk.load();

        const clerk = window.Clerk;
        updateStatus('Processing verification...');

        // Try handleEmailLinkVerification first (this is the correct method)
        try {
          const result = await clerk.handleEmailLinkVerification({
            redirectUrl: window.location.href,
            redirectUrlComplete: REDIRECT,
          });
          console.log('handleEmailLinkVerification result:', result);
        } catch (e) {
          console.log('handleEmailLinkVerification error (might be ok):', e.message);
        }

        await new Promise(r => setTimeout(r, 500));

        // Check signUp status
        const signUp = clerk.client?.signUp;
        console.log('SignUp after verification:', signUp);
        console.log('SignUp status:', signUp?.status);

        if (signUp?.status === 'complete' && signUp?.createdSessionId) {
          updateStatus('Activating session...');
          await clerk.setActive({ session: signUp.createdSessionId });
          await new Promise(r => setTimeout(r, 500));
        }

        // Check if user exists now
        if (clerk.user) {
          updateStatus('Setting up your account...');

          // Set metadata via our API
          const res = await fetch('/oauth/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: clerk.user.id, publishableKey: PK }),
          });

          const data = await res.json();
          if (!res.ok && !data.existingProject) {
            throw new Error(data.error || 'Failed to complete setup');
          }

          showSuccess();
          updateStatus('Account created!');
          setTimeout(() => window.location.href = REDIRECT, 1000);
        } else {
          // No user - verification completed but need to sign in from original browser
          showSuccess();
          document.getElementById('subtitle').textContent = 'Email verified! Return to original browser to complete signup.';
          updateStatus('Or sign in at the app.');
          setTimeout(() => window.location.href = REDIRECT, 3000);
        }

      } catch (err) {
        console.error('Verification error:', err);
        showError(err.message || 'Verification issue');
        setTimeout(() => window.location.href = REDIRECT, 3000);
      }
    }

    window.addEventListener('load', () => setTimeout(verifyEmail, 300));
  </script>
</body>
</html>`;
}

function getErrorPageHTML(message: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up Error</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    h1 { color: #e74c3c; margin-bottom: 16px; }
    p { color: #666; margin-bottom: 24px; }
    a { color: #667eea; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Oops!</h1>
    <p>${message}</p>
    <p><a href="javascript:history.back()">Go back</a></p>
  </div>
</body>
</html>`;
}
