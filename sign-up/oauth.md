# Sign-Up Worker - Technical Implementation

## Status: Working (Dec 24, 2025)

OAuth (Google) and Email/Password signup both functional. Users created with correct metadata, synced to D1.

---

## The Problem

Shared multi-tenant Clerk app (`end-user-api`) for all devs' end customers. When users sign up via Clerk's hosted pages or OAuth, we can't set `publicMetadata` (publishableKey, plan) at creation time. This breaks tenant isolation.

## The Solution

Custom sign-up worker that:
1. Intercepts signup before Clerk
2. Uses Clerk SDK for authentication
3. Sets metadata immediately after user creation
4. Syncs to D1 database
5. Redirects to dev's app

---

## Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/signup` | GET | Serve signup page, set session cookie |
| `/signup/email` | POST | Legacy - Backend API user creation |
| `/complete` | GET | OAuth callback - completes Google auth |
| `/verify` | GET | Email link verification callback |
| `/oauth/complete` | POST | Set metadata + sync D1 |
| `/sync` | POST | Manual D1 sync endpoint |

---

## Flows

### OAuth (Google)

```
Dev's App
    |
    | Link: /signup?pk=xxx&redirect=https://app.com/dashboard
    v
/signup page
    |
    | 1. Cookie set with {pk, redirect}
    | 2. Clerk SDK loaded
    | 3. User clicks "Continue with Google"
    v
Clerk SDK: signUp.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl: WORKER_URL + '/complete',
    redirectUrlComplete: WORKER_URL + '/complete',
})
    |
    | Google OAuth (Clerk manages)
    v
/complete page
    |
    | 1. handleRedirectCallback() - completes OAuth
    | 2. POST /oauth/complete - set metadata + sync D1
    | 3. Redirect to dev's app
    v
Dev's App (user must sign in again - different domain)
```

### Email/Password

```
Dev's App
    |
    | Link: /signup?pk=xxx&redirect=https://app.com/dashboard
    v
/signup page
    |
    | 1. Cookie set with {pk, redirect}
    | 2. User enters email/password
    | 3. Clerk SDK: signUp.create()
    | 4. prepareEmailAddressVerification({ strategy: 'email_code' })
    v
Code Entry Form (same page)
    |
    | 1. User gets 6-digit code via email
    | 2. Enters code
    | 3. attemptEmailAddressVerification({ code })
    | 4. POST /oauth/complete - set metadata + sync D1
    | 5. Redirect to dev's app
    v
Dev's App (user must sign in again)
```

---

## Key Implementation Details

### Why email_code, not email_link?

`email_link` verification fails if user opens link in different browser - signup state is lost. `email_code` keeps user on same page throughout.

### Session Cookie

Stores `{pk, redirect}` for OAuth flow (different browser context loses JS vars):
```javascript
Set-Cookie: signup_session={base64}; Path=/; Max-Age=600; SameSite=Lax; Secure
```

### Metadata Setting

```javascript
// /oauth/complete endpoint
const existingPk = userData.public_metadata?.publishableKey;

// Security: Can't reassign user to different project
if (existingPk && existingPk !== body.publishableKey) {
    return { error: 'User already associated with different project' };
}

// Only set metadata if not already set
if (!existingPk) {
    await updateClerkMetadata(userId, publishableKey, 'free');
}

// Always sync to D1 (idempotent)
await syncUserToD1(userId, email, publishableKey, 'free');
```

### D1 Sync

```javascript
// end_users table - composite primary key
INSERT INTO end_users (publishableKey, platformId, clerkUserId, email, createdAt)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(platformId, publishableKey, clerkUserId) DO UPDATE SET email = excluded.email

// usage_counts table
INSERT INTO usage_counts (publishableKey, platformId, userId, plan, usageCount, periodStart, periodEnd, updatedAt)
VALUES (?, ?, ?, ?, 0, ?, ?, ?)
ON CONFLICT(platformId, userId) DO NOTHING
```

---

## Known Limitations / Concerns

### 1. Double Sign-In Required

User must sign in again at dev's app after signup. Different domains = different Clerk sessions. This is standard behavior for cross-domain auth.

**Standard flow:** Sign up at central auth → Redirect to app → User signs in at app

**Not supported:** Auto-sign-in at dev's app (would require `__clerk_ticket` + Clerk SDK in dev's app, defeats purpose of our SDK)

### 2. CAPTCHA Requirement

Clerk's bot protection requires `<div id="clerk-captcha">` in the form. Without it, signups may fail silently.

### 3. Email Verification Methods

Clerk dashboard must have "Email verification code" enabled under Configure > User & Authentication > Email.

### 4. Dev Browser Tracking

Clerk's `__clerk_db_jwt` cookie can override redirects in hosted pages. Using SDK with `authenticateWithRedirect()` bypasses this.

---

## Clerk Dashboard Settings (end-user-api)

Required configuration:
- Sign-up with email: ON
- Verify at sign-up: ON
- Email verification code: ON (required for email_code strategy)
- Email verification link: Optional
- Bot sign-up protection: Ensure `clerk-captcha` div exists or disable

---

## Files

- `sign-up/src/index.ts` - Main worker (all routes + HTML pages)
- `sign-up/wrangler.toml` - D1/KV bindings
- `sign-up/oauth.md` - This file

## Deploy

```bash
cd sign-up && npx wrangler deploy
```

## Test URL

```
https://sign-up.k-c-sheffield012376.workers.dev/signup?pk=pk_test_xxx&redirect=http://127.0.0.1:5500/test-app/index.html
```

---

## Future: SDK Integration

When SDK is built, devs will use:
```javascript
import { DreamAPI } from '@dream-api/sdk';

const signupUrl = DreamAPI.getSignUpUrl({
    publishableKey: 'pk_test_xxx',
    redirect: 'https://myapp.com/dashboard'
});
// Redirect user to signupUrl
```

SDK will handle:
- Construct signup URL
- Token management after sign-in
- API call authentication

Devs won't need Clerk SDK directly.
