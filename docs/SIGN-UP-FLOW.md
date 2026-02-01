# Sign-Up Flow

How end-users authenticate with developer apps using Dream API.

## Overview

All auth flows route through the sign-up worker. **Devs never touch Clerk** - the worker handles everything and returns JWTs via URL params. This works on localhost, Vercel, Netlify - anywhere, with TEST or LIVE keys.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SDK                                 SIGN-UP WORKER                      │
│                                                                         │
│ getSignUpUrl()  ────────────────►  /signup?pk=xxx&redirect=url         │
│ getSignInUrl()  ────────────────►  /signin?pk=xxx&redirect=url         │
│ getCustomerPortalUrl() ─────────►  /account?pk=xxx&redirect=url        │
│ getRefreshUrl() ────────────────►  /refresh?pk=xxx&redirect=url        │
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
│                                    Redirect with __clerk_jwt           │
│ SDK stores JWT in localStorage ◄────────────                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why All Auth Goes Through Sign-Up Worker

**Problem:** Clerk requires domains to be allowlisted. Making devs configure Clerk is complex and error-prone.

**Solution:** All auth happens on OUR worker domain (already allowed). Dev apps just receive JWTs via URL params.

**Benefits:**
- Works on localhost with LIVE keys (auth happens on our domain)
- Devs never configure Clerk
- No domain restrictions for dev apps
- Consistent auth across all dev apps

## Sign-Up Worker Routes

| Route | Purpose | Description |
|-------|---------|-------------|
| `/signup` | New user registration | Embedded Clerk SignUp |
| `/signin` | Returning user login | Embedded Clerk SignIn |
| `/account` | Account settings | Embedded Clerk UserProfile |
| `/refresh` | **JWT refresh after plan change** | Polls until plan updates |

## JWT Flow (Not Tickets)

We use JWTs passed via URL params, not Clerk tickets:

```
1. User completes auth on worker
2. Worker calls user.reload() to get fresh metadata
3. Worker gets JWT: session.getToken({ template: 'end-user-api', skipCache: true })
4. Worker redirects: https://dev-app.com/dashboard?__clerk_jwt=eyJhbG...
5. SDK detects __clerk_jwt param
6. SDK stores JWT in localStorage
7. SDK cleans URL (removes param)
8. User is authenticated
```

## The /refresh Route (Critical for Upgrades)

When users upgrade via Stripe, the webhook updates Clerk metadata. But Stripe redirects the user BEFORE the webhook fires. The `/refresh` route solves this timing issue:

```
Stripe Checkout Complete
         │
         ▼
/refresh (sign-up worker)
         │
         ▼
┌─────────────────────────┐
│  Show spinner           │
│  "Updating account..."  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Poll loop:             │
│  1. user.reload()       │
│  2. check plan          │
│  3. still 'free'?       │◄──┐
│     wait 1 sec, retry   │───┘
│  4. plan changed?       │
│     break loop          │
└─────────────────────────┘
         │
         ▼
Get JWT with skipCache: true
(guarantees fresh plan in token)
         │
         ▼
Redirect to dashboard with __clerk_jwt
```

**Key:** The polling waits for the webhook to update Clerk before getting the JWT. Max 20 attempts (~20 seconds).

## SDK Integration

```typescript
// Auth URLs (all go through sign-up worker)
const signupUrl = api.auth.getSignUpUrl({ redirect: '/choose-plan' });
const signinUrl = api.auth.getSignInUrl({ redirect: '/dashboard' });
const accountUrl = api.auth.getCustomerPortalUrl({ returnUrl: '/dashboard' });

// For Stripe checkout success - uses /refresh for JWT polling
const refreshUrl = api.auth.getRefreshUrl({ redirect: '/dashboard?success=true' });

await api.billing.createCheckout({
  tier: 'pro',
  successUrl: refreshUrl,  // Goes to /refresh, not directly to dashboard
  cancelUrl: window.location.origin + '/choose-plan',
});
```

## Complete Upgrade Flow

```
1. User on /choose-plan clicks "Upgrade to Pro"
2. SDK calls api.billing.createCheckout({ successUrl: refreshUrl })
3. api-multi creates Stripe checkout with success_url = /refresh route
4. User completes payment on Stripe
5. Stripe fires webhook → api-multi → updates Clerk publicMetadata.plan = 'pro'
6. Stripe redirects user to /refresh
7. /refresh polls user.reload() until plan !== 'free'
8. /refresh gets JWT with skipCache: true (has plan: 'pro')
9. /refresh redirects to /dashboard?__clerk_jwt=xxx
10. SDK stores JWT, cleans URL
11. Dashboard shows "Plan: PRO"
```

## What Gets Stored

**Clerk publicMetadata (set by worker + webhook):**
```json
{
  "publishableKey": "pk_live_xxx",
  "plan": "pro",
  "stripeCustomerId": "cus_xxx",
  "subscriptionId": "sub_xxx"
}
```

**JWT Template (end-user-api):**
```json
{
  "email": "{{user.primary_email_address}}",
  "publishableKey": "{{user.public_metadata.publishableKey}}",
  "plan": "{{user.public_metadata.plan}}",
  "stripeCustomerId": "{{user.public_metadata.stripeCustomerId}}",
  "subscriptionId": "{{user.public_metadata.subscriptionId}}"
}
```

**D1 Tables:**
- `end_users`: clerkUserId, email, publishableKey, platformId
- `usage_counts`: plan, usageCount, limits

## Test vs Live Mode

Detected from publishable key prefix:

| Key Prefix | Clerk Instance | Use Case |
|------------|----------------|----------|
| `pk_test_xxx` | composed-blowfish-76 (test) | Development, testing |
| `pk_live_xxx` | users.panacea-tech.net (live) | Production |

**Both work on localhost** because Clerk runs on our worker domain, not the dev's domain.

## Clerk Test Credentials

Skip email verification during development:

| Type | Value |
|------|-------|
| Test Email | `anything+clerk_test@example.com` |
| Verification Code | `424242` |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Plan still shows 'free' after upgrade | Webhook timing | Use getRefreshUrl() for Stripe success |
| JWT missing plan field | JWT template not configured | Add plan to Clerk JWT template |
| Auth fails on localhost | Old: domain restriction | Now works - auth on our domain |
| User stuck on spinner | Webhook not firing | Check Stripe webhook logs |

## Key Files

| File | Purpose |
|------|---------|
| `sign-up/src/index.ts` | Sign-up worker (all routes) |
| `sign-up/src/index.ts:getRefreshPageHTML()` | Polling spinner page |
| `dream-sdk/src/clerk.ts` | ClerkManager, JWT handling |
| `dream-sdk/src/auth.ts` | URL builders (getRefreshUrl, etc.) |
| `api-multi/src/routes/checkout.ts` | Passes successUrl to Stripe |
