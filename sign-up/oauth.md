# Sign-Up Worker

All end-user auth flows route through this worker for consistent Clerk key selection.

## Routes

| Route | Purpose |
|-------|---------|
| `/signup?pk=xxx&redirect=url` | New user registration |
| `/signin?pk=xxx&redirect=url` | Returning user login |
| `/account?pk=xxx&redirect=url` | Account settings |
| `/oauth/complete` | Set metadata after auth (API) |

## Mode Detection

The worker reads the pk prefix to select Clerk keys:

```typescript
function getClerkKeys(pk: string | null, env: Env) {
  const isTestKey = pk?.startsWith('pk_test_');

  if (isTestKey && env.CLERK_PUBLISHABLE_KEY_TEST) {
    return { publishableKey: env.CLERK_PUBLISHABLE_KEY_TEST, ... };
  }
  return { publishableKey: env.CLERK_PUBLISHABLE_KEY, ... };
}
```

| pk Prefix | Clerk Instance |
|-----------|----------------|
| `pk_test_` | TEST (composed-blowfish-76.clerk.accounts.dev) |
| `pk_live_` | LIVE (users.panacea-tech.net) |

## Sign-Up Flow

```
Dev's App → /signup?pk=xxx&redirect=/dashboard
    │
    ▼
Worker validates PK, sets cookie, serves Clerk SignUp
    │
    ▼
User signs up (email or OAuth)
    │
    ▼
POST /oauth/complete → set metadata {publishableKey, plan: 'free'}
    │
    ▼
Redirect with __clerk_ticket → SDK consumes → user signed in
```

## Required Secrets

```bash
CLERK_PUBLISHABLE_KEY       # Live Clerk publishable key
CLERK_SECRET_KEY            # Live Clerk secret key
CLERK_PUBLISHABLE_KEY_TEST  # Test Clerk publishable key
CLERK_SECRET_KEY_TEST       # Test Clerk secret key
```

## Deploy

```bash
cd sign-up && npx wrangler deploy
```

## SDK Integration

```typescript
// All auth URLs go through sign-up worker
api.auth.getSignUpUrl({ redirect: '/dashboard' })
api.auth.getSignInUrl({ redirect: '/dashboard' })
api.auth.getCustomerPortalUrl({ returnUrl: '/dashboard' })
```

## Test URL

```
https://sign-up.k-c-sheffield012376.workers.dev/signup?pk=pk_test_xxx&redirect=http://localhost:3000/dashboard
```
