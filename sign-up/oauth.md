# Sign-Up Worker

## Status: Production Ready (Dec 30, 2025)

Frictionless signup using Clerk hosted pages. Users sign up, get metadata set automatically, and land in the app logged in.

---

## The Problem

Multi-tenant Clerk app (`end-user-api`) for all devs' end customers. Need to set `publicMetadata` (publishableKey, plan) at signup for tenant isolation.

## The Solution

Redirect to Clerk hosted pages, set metadata on callback. **332 lines of code.**

---

## Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/signup` | GET | Redirect to Clerk hosted signup |
| `/callback` | GET | Return from Clerk, set metadata, redirect |
| `/oauth/complete` | POST | API: verify token, set metadata, sync D1 |

---

## Flow

```
Dev's App
    │
    │ Link: /signup?pk=xxx&redirect=/dashboard
    ▼
/signup
    │
    │ 1. Validate pk exists in D1
    │ 2. Set cookie with {pk, redirect}
    │ 3. Redirect to Clerk hosted signup
    ▼
Clerk Hosted Page (accounts.*.clerk.dev)
    │
    │ User signs up (email OR Google - Clerk handles all)
    │ Email verification, OAuth, CAPTCHA - all Clerk
    ▼
/callback
    │
    │ 1. Read cookie
    │ 2. Load Clerk SDK
    │ 3. Get session token
    │ 4. POST /oauth/complete
    ▼
/oauth/complete (API)
    │
    │ 1. Verify token with Clerk Backend API
    │ 2. Extract userId from verified session
    │ 3. Check for project hopping (reject if different pk)
    │ 4. Set metadata: { publishableKey, plan: 'free' }
    │ 5. Sync to D1 (end_users + usage_counts)
    ▼
Dev's App (user is logged in!)
```

---

## Security

1. **Token verified server-side** - `/oauth/complete` verifies session token with Clerk Backend API using our secret key
2. **UserId from verified token** - Extracted from Clerk's response, not user input
3. **PublishableKey validated** - Must exist in D1 `api_keys` table
4. **No project hopping** - If user has different pk in metadata, request rejected
5. **Cookie is convenience only** - Security comes from Clerk token verification

---

## Why This Works

- Clerk handles all auth complexity (passwords, OAuth, email verification, CAPTCHA)
- We only set authorization metadata (which project does user belong to)
- Same Clerk instance across signup and app = session carries over
- No double sign-in required

---

## Adding OAuth Providers

Just enable them in Clerk dashboard. Google, GitHub, Apple, etc. Zero code changes - Clerk hosted page shows all enabled providers.

---

## Files

- `sign-up/src/index.ts` - Main worker (332 lines)
- `sign-up/wrangler.toml` - D1/KV bindings
- `sign-up/oauth.md` - This file

## Deploy

```bash
cd sign-up && npx wrangler deploy
```

## Test URL

```
https://sign-up.k-c-sheffield012376.workers.dev/signup?pk=pk_test_xxx&redirect=http://localhost:5173/dashboard
```

---

## SDK Integration

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: 'sk_test_xxx',
  publishableKey: 'pk_test_xxx',
});

// Get signup URL
const signupUrl = api.auth.getSignUpUrl({
  redirect: 'https://myapp.com/dashboard'
});
// → https://sign-up.../signup?pk=pk_test_xxx&redirect=...
```
