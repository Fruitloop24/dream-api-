# Sign-Up Worker

Handles all end-user authentication for Dream API. Devs never touch Clerk - this worker manages everything.

## Why This Exists

Clerk requires SDK to run on allowed domains. Instead of making devs configure Clerk:
- This worker runs on OUR domain (allowed by Clerk)
- Dev apps redirect here for auth
- We handle Clerk, return JWT via URL param
- Works on localhost, Vercel, anywhere - with TEST or LIVE keys

## Routes

| Route | Purpose |
|-------|---------|
| `/signup` | New user registration |
| `/signin` | Returning user login |
| `/account` | Clerk UserProfile (account settings) |
| `/refresh` | **Get fresh JWT after plan changes** |

## The /refresh Route (Critical for Upgrades)

After Stripe checkout, the webhook updates Clerk metadata with the new plan. But Stripe redirects the user BEFORE the webhook fires. The `/refresh` route solves this:

1. Stripe redirects to `/refresh?pk=xxx&redirect=/dashboard`
2. Shows spinner: "Updating your account..."
3. **Polls** `user.reload()` until plan changes from 'free'
4. Gets JWT with `skipCache: true` (forces fresh token)
5. Redirects to dashboard with `__clerk_jwt` param

```
Stripe Checkout
    ↓ payment complete
/refresh (this worker)
    ↓ shows spinner
    ↓ polls until plan !== 'free' (max 20 attempts)
    ↓ gets fresh JWT with correct plan
    ↓ redirects with JWT
Dev's Dashboard
    ↓ SDK stores JWT
    ↓ shows PRO plan
```

## URL Parameters

All routes accept:
- `pk` - Dev's publishable key (determines TEST/LIVE Clerk)
- `redirect` - Where to send user after auth (absolute URL)

## How JWT Gets to Dev's App

After auth completes, we redirect with the JWT in URL:
```
https://dev-app.com/dashboard?__clerk_jwt=eyJhbG...
```

The SDK's `ClerkManager.load()` checks for `__clerk_jwt` param, stores it in localStorage, and cleans the URL.

## Test vs Live Mode

Detected from publishable key prefix:
- `pk_test_xxx` → Test Clerk instance (composed-blowfish-76)
- `pk_live_xxx` → Live Clerk instance (users.panacea-tech.net)

## Environment Variables

```
CLERK_PUBLISHABLE_KEY      # Live Clerk public key
CLERK_SECRET_KEY           # Live Clerk secret key
CLERK_PUBLISHABLE_KEY_TEST # Test Clerk public key
CLERK_SECRET_KEY_TEST      # Test Clerk secret key
```

## Key Files

- `src/index.ts` - All routes and HTML generators
- `getRefreshPageHTML()` - The polling spinner page
- `getSignupPageHTML()` - Signup form with Clerk embedded
- `getSigninPageHTML()` - Signin form with Clerk embedded

## Deploy

```bash
npx wrangler deploy
```

## The Magic

Devs just call SDK methods:
```typescript
api.auth.getSignUpUrl({ redirect: '/dashboard' })
api.auth.getRefreshUrl({ redirect: '/dashboard' })
```

They never see Clerk. Auth works on localhost with live keys. Plan upgrades just work.
