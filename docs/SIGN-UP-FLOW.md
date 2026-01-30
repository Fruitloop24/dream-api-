# Sign-Up Flow

How end-users authenticate with developer apps using Dream API.

## Overview

All auth flows route through the sign-up worker for consistent Clerk key selection.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SDK                                 SIGN-UP WORKER                      │
│                                                                         │
│ getSignUpUrl()  ────────────────►  /signup?pk=xxx&redirect=url         │
│ getSignInUrl()  ────────────────►  /signin?pk=xxx&redirect=url         │
│ getCustomerPortalUrl() ─────────►  /account?pk=xxx&redirect=url        │
│                                           │                             │
│                                           ▼                             │
│                                    Worker reads pk prefix              │
│                                    pk_test_ → TEST Clerk               │
│                                    pk_live_ → LIVE Clerk               │
│                                           │                             │
│                                           ▼                             │
│                                    Embedded Clerk component            │
│                                           │                             │
│                                           ▼                             │
│                                    Redirect with __clerk_ticket        │
│ SDK consumes ticket  ◄──────────────────────                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why All Auth Goes Through Sign-Up Worker

**Problem:** The SDK loads Clerk via CDN. Clerk's key must match the mode (test/live) of the Dream API publishable key, or cross-domain auth breaks.

**Solution:** All auth URLs go through the sign-up worker, which reads the pk prefix and loads the matching Clerk instance:

```typescript
// sign-up/src/index.ts
function getClerkKeys(pk: string | null, env: Env) {
  const isTestKey = pk?.startsWith('pk_test_');

  if (isTestKey && env.CLERK_PUBLISHABLE_KEY_TEST) {
    return {
      publishableKey: env.CLERK_PUBLISHABLE_KEY_TEST,  // Test Clerk
      secretKey: env.CLERK_SECRET_KEY_TEST,
    };
  }

  return {
    publishableKey: env.CLERK_PUBLISHABLE_KEY,  // Live Clerk
    secretKey: env.CLERK_SECRET_KEY,
  };
}
```

## Sign-Up Worker Routes

| Route | Purpose | Clerk Component |
|-------|---------|-----------------|
| `/signup?pk=xxx&redirect=url` | New user registration | SignUp |
| `/signin?pk=xxx&redirect=url` | Returning user login | SignIn |
| `/account?pk=xxx&redirect=url` | Account settings | UserProfile |
| `/oauth/complete` | Set metadata after auth | (API endpoint) |

## Sign-Up Flow Detail

```
1. User clicks "Get Started"
2. Dev's app redirects to sign-up worker:
   /signup?pk=pk_test_xxx&redirect=/dashboard

3. Worker validates PK exists in D1
4. Worker sets cookie: {pk, redirect}
5. Worker serves HTML with embedded Clerk SignUp component
   (Using TEST or LIVE Clerk based on pk prefix)

6. User completes sign-up (email or OAuth)

7. Page calls POST /oauth/complete with:
   - userId (from Clerk session)
   - publishableKey (from cookie)

8. Worker sets publicMetadata: {publishableKey, plan: 'free'}
9. Worker syncs to D1 (end_users + usage_counts)
10. Worker creates sign-in token via Clerk API
11. Worker redirects to dev's app with __clerk_ticket

12. SDK detects ticket, consumes it:
    clerk.client.signIn.create({ strategy: 'ticket', ticket })

13. User is signed in with plan='free'
```

## SDK Integration

```typescript
// All auth URLs go through sign-up worker now
const signupUrl = api.auth.getSignUpUrl({ redirect: '/dashboard' });
const signinUrl = api.auth.getSignInUrl({ redirect: '/dashboard' });
const accountUrl = api.auth.getCustomerPortalUrl({ returnUrl: '/dashboard' });

// SDK builds URLs like:
// https://sign-up.../signup?pk=pk_test_xxx&redirect=/dashboard
// https://sign-up.../signin?pk=pk_test_xxx&redirect=/dashboard
// https://sign-up.../account?pk=pk_test_xxx&redirect=/dashboard
```

## Ticket Consumption (Critical Fix)

When Clerk is loaded via CDN, the signIn object is at `clerk.client.signIn`:

```typescript
// WRONG - clerk.signIn doesn't exist on CDN-loaded Clerk!
clerk.signIn.create({ strategy: 'ticket', ticket })

// CORRECT - must use clerk.client.signIn
clerk.client.signIn.create({ strategy: 'ticket', ticket })
```

The SDK handles this automatically in `dream-sdk/src/clerk.ts`.

## What Gets Set

**Clerk publicMetadata:**
```json
{ "publishableKey": "pk_test_xxx", "plan": "free" }
```

**D1 Tables:**
- `end_users`: clerkUserId, email, publishableKey, platformId
- `usage_counts`: initial record with usageCount=0

## Clerk Test Credentials

Skip email verification during development:

| Type | Value |
|------|-------|
| Test Email | `anything+clerk_test@example.com` |
| Verification Code | `424242` |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `client.signIn: false` | Clerk not fully initialized | SDK handles retries |
| `Ticket present: NO` | Worker didn't add token | Check /oauth/complete logs |
| `Ticket error: expired` | Token TTL is 5 minutes | User took too long |
| `Ticket error: already used` | Token is single-use | Don't refresh with ticket |
| Live key on localhost | Clerk blocks live keys on localhost | Use test key for local dev |

## Key Files

| File | Purpose |
|------|---------|
| `sign-up/src/index.ts` | Sign-up worker (signup, signin, account routes) |
| `dream-sdk/src/clerk.ts` | ClerkManager with mode-based key selection |
| `dream-sdk/src/auth.ts` | AuthHelpers with URL builders |
