# Test/Live Mode Separation

Complete guide to how Dream API separates test and live environments across all services.

## Overview

Dream API maintains complete separation between test and live modes:
- **Test mode**: For development, localhost, sandbox payments
- **Live mode**: For production, real payments, real users

This separation spans:
- Stripe Connect OAuth
- Stripe Products/Prices
- Clerk user databases
- API keys (pk_test_/pk_live_)
- Webhook handlers

## The Golden Rule

```
pk_test_xxx → TEST Stripe + TEST Clerk
pk_live_xxx → LIVE Stripe + LIVE Clerk
```

The publishable key prefix determines EVERYTHING.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TEST MODE (localhost)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Developer Dashboard                                                         │
│       │                                                                      │
│       ▼                                                                      │
│  "Connect Stripe" ──► oauth-api/authorize?mode=test                         │
│       │                    │                                                 │
│       │                    ▼                                                 │
│       │              STRIPE_CLIENT_ID_TEST                                   │
│       │              STRIPE_CLIENT_SECRET_TEST                               │
│       │                    │                                                 │
│       │                    ▼                                                 │
│       │              Stripe OAuth (test mode)                                │
│       │                    │                                                 │
│       ▼                    ▼                                                 │
│  Create Project ──► oauth-api/create-products                               │
│       │                    │                                                 │
│       │                    ▼                                                 │
│       │              STRIPE_SECRET_KEY_TEST + Stripe-Account header         │
│       │                    │                                                 │
│       ▼                    ▼                                                 │
│  pk_test_xxx        Products in TEST Stripe                                 │
│  sk_test_xxx                                                                │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  End-User App (localhost:3000)                                              │
│       │                                                                      │
│       ▼                                                                      │
│  Sign Up ──► sign-up.workers.dev (detects .workers.dev)                     │
│       │              │                                                       │
│       │              ▼                                                       │
│       │        CLERK_SECRET_KEY_TEST                                        │
│       │              │                                                       │
│       │              ▼                                                       │
│       │        User created in TEST Clerk                                   │
│       │                                                                      │
│       ▼                                                                      │
│  Checkout ──► api-multi (detects pk_test_)                                  │
│       │              │                                                       │
│       │              ▼                                                       │
│       │        Stripe TEST checkout                                         │
│       │              │                                                       │
│       ▼              ▼                                                       │
│  Webhook ──► api-multi/webhook/stripe                                       │
│                      │                                                       │
│                      ▼                                                       │
│                getClerkClient(pk_test_xxx)                                  │
│                      │                                                       │
│                      ▼                                                       │
│                CLERK_SECRET_KEY_TEST                                        │
│                      │                                                       │
│                      ▼                                                       │
│                Update user in TEST Clerk                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           LIVE MODE (production)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Same flow as above, but:                                                   │
│  - oauth-api/authorize?mode=live                                            │
│  - STRIPE_CLIENT_ID + STRIPE_CLIENT_SECRET (live)                           │
│  - STRIPE_SECRET_KEY_LIVE + Stripe-Account header                           │
│  - pk_live_xxx / sk_live_xxx                                                │
│  - signup.users.panacea-tech.net (custom domain)                            │
│  - CLERK_SECRET_KEY (live)                                                  │
│  - getClerkClient(pk_live_xxx) → CLERK_SECRET_KEY                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Files & Line References

### 1. OAuth Flow (oauth-api)

**File:** `oauth-api/src/routes/oauth.ts`

```typescript
// Line 30-36: Mode detection in /authorize
const mode = url.searchParams.get('mode') === 'live' ? 'live' : 'test';

// Line 58-62: Select client_id based on mode
const clientId = mode === 'test'
  ? (env.STRIPE_CLIENT_ID_TEST || env.STRIPE_CLIENT_ID)
  : env.STRIPE_CLIENT_ID;

// Line 80-83: Store mode in OAuth state
await env.PLATFORM_TOKENS_KV.put(
  `oauth:state:${state}`,
  JSON.stringify({ userId, mode }),
  { expirationTtl: 600 }
);

// Line 165-168: Select client_secret in callback
const clientSecret = mode === 'test'
  ? (env.STRIPE_CLIENT_SECRET_TEST || env.STRIPE_CLIENT_SECRET)
  : env.STRIPE_CLIENT_SECRET;
```

### 2. Product Creation (oauth-api)

**File:** `oauth-api/src/routes/products.ts`

```typescript
// Line 76-85: Select Stripe key based on mode
function getStripeSecretKey(env: Env, mode: 'test' | 'live'): string {
  if (mode === 'test') {
    return env.STRIPE_SECRET_KEY_TEST;
  }
  return env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_CLIENT_SECRET;
}

// Line 125-131: Create product on connected account
const response = await fetch('https://api.stripe.com/v1/products', {
  headers: {
    'Authorization': `Bearer ${secretKey}`,      // Platform key (test or live)
    'Stripe-Account': stripeUserId,              // Connected account
  },
});
```

### 3. Sign-Up Worker (sign-up)

**File:** `sign-up/src/index.ts`

```typescript
// Line 29-38: Auto-detect mode from hostname
function getClerkKeys(request: Request, env: Env) {
  const hostname = new URL(request.url).hostname;
  const isWorkersDev = hostname.endsWith('.workers.dev');

  if (isWorkersDev && env.CLERK_SECRET_KEY_TEST) {
    return {
      publishableKey: env.CLERK_PUBLISHABLE_KEY_TEST,
      secretKey: env.CLERK_SECRET_KEY_TEST,
    };
  }
  // ... fall back to live keys
}
```

### 4. API Multi - JWT Verification (api-multi)

**File:** `api-multi/src/index.ts`

```typescript
// Line 65-70: Select Clerk key based on publishableKey prefix
const isTestMode = publishableKey?.startsWith('pk_test_');
const secretKey = isTestMode && env.CLERK_SECRET_KEY_TEST
  ? env.CLERK_SECRET_KEY_TEST
  : env.CLERK_SECRET_KEY;
```

### 5. Stripe Webhook Handler (api-multi)

**File:** `api-multi/src/stripe-webhook.ts`

```typescript
// Line 128-141: Mode-aware Clerk client helper
function getClerkClient(publishableKey: string | null | undefined) {
  const isTestMode = publishableKey?.startsWith('pk_test_');
  const secretKey = isTestMode && env.CLERK_SECRET_KEY_TEST
    ? env.CLERK_SECRET_KEY_TEST
    : env.CLERK_SECRET_KEY;
  console.log(`[Webhook] Using ${isTestMode ? 'TEST' : 'LIVE'} Clerk keys`);
  return createClerkClient({ secretKey });
}

// Line 177: Create mode-aware client for checkout
const clerkClient = getClerkClient(pkFromSession);

// Line 283: Create mode-aware client for subscription events
const subClerkClient = getClerkClient(pkFromSub);

// Line 362: Create mode-aware client for subscription deletion
const deletedClerkClient = getClerkClient(deletedPk);
```

## Required Secrets

### oauth-api

| Secret | Purpose | Example |
|--------|---------|---------|
| `STRIPE_CLIENT_ID` | Live Connect OAuth | `ca_xxx` |
| `STRIPE_CLIENT_SECRET` | Live OAuth token exchange | `sk_live_xxx` |
| `STRIPE_CLIENT_ID_TEST` | Test Connect OAuth | `ca_xxx` |
| `STRIPE_CLIENT_SECRET_TEST` | Test OAuth token exchange | `sk_test_xxx` |
| `STRIPE_SECRET_KEY_TEST` | Create test products | `sk_test_xxx` |
| `STRIPE_SECRET_KEY_LIVE` | Create live products | `sk_live_xxx` |

### api-multi

| Secret | Purpose | Example |
|--------|---------|---------|
| `CLERK_SECRET_KEY` | Live user operations | `sk_live_xxx` |
| `CLERK_PUBLISHABLE_KEY` | Live Clerk app | `pk_live_xxx` |
| `CLERK_SECRET_KEY_TEST` | Test user operations | `sk_test_xxx` |
| `CLERK_PUBLISHABLE_KEY_TEST` | Test Clerk app | `pk_test_xxx` |

### sign-up

| Secret | Purpose | Example |
|--------|---------|---------|
| `CLERK_SECRET_KEY` | Live user creation | `sk_live_xxx` |
| `CLERK_PUBLISHABLE_KEY` | Live Clerk hosted pages | `pk_live_xxx` |
| `CLERK_SECRET_KEY_TEST` | Test user creation | `sk_test_xxx` |
| `CLERK_PUBLISHABLE_KEY_TEST` | Test Clerk hosted pages | `pk_test_xxx` |

## Developer Flow

### Starting a New Project (Test Mode)

```
1. Dashboard: Click "Connect Stripe"
   └─► oauth-api/authorize?mode=test
   └─► OAuth with STRIPE_CLIENT_ID_TEST
   └─► Connection exists in TEST Stripe

2. Dashboard: Create Project (defaults to TEST)
   └─► oauth-api/create-products
   └─► Uses STRIPE_SECRET_KEY_TEST
   └─► Products created in TEST Stripe
   └─► Returns pk_test_xxx, sk_test_xxx

3. Template: Set pk_test_xxx in .env.local
   └─► npm run dev (localhost:3000)

4. User signs up on localhost
   └─► SDK detects localhost → uses test Clerk keys
   └─► sign-up.workers.dev → CLERK_SECRET_KEY_TEST
   └─► User created in TEST Clerk

5. User checkouts ($1 test)
   └─► api-multi detects pk_test_ → test mode
   └─► Stripe TEST checkout
   └─► Webhook fires → getClerkClient(pk_test_xxx)
   └─► Updates user in TEST Clerk
```

### Promoting to Live

```
1. Dashboard: Click "Promote to Live"
   └─► oauth-api/authorize?mode=live (if not already done)
   └─► OAuth with STRIPE_CLIENT_ID (live)
   └─► Connection exists in LIVE Stripe

2. Dashboard: Promote creates LIVE products
   └─► Uses STRIPE_SECRET_KEY_LIVE
   └─► Products created in LIVE Stripe
   └─► Returns pk_live_xxx, sk_live_xxx

3. Production: Set pk_live_xxx in environment
   └─► Deploy to production domain

4. User signs up on production
   └─► SDK uses live Clerk keys
   └─► signup.users.panacea-tech.net → CLERK_SECRET_KEY
   └─► User created in LIVE Clerk

5. User checkouts (real money)
   └─► api-multi detects pk_live_ → live mode
   └─► Stripe LIVE checkout
   └─► Webhook fires → getClerkClient(pk_live_xxx)
   └─► Updates user in LIVE Clerk
```

## D1 Data Separation

Data is separated by `publishableKey` column in all tables:

```sql
-- Test data
SELECT * FROM end_users WHERE publishableKey LIKE 'pk_test_%';
SELECT * FROM subscriptions WHERE publishableKey LIKE 'pk_test_%';
SELECT * FROM usage_counts WHERE publishableKey LIKE 'pk_test_%';

-- Live data
SELECT * FROM end_users WHERE publishableKey LIKE 'pk_live_%';
SELECT * FROM subscriptions WHERE publishableKey LIKE 'pk_live_%';
SELECT * FROM usage_counts WHERE publishableKey LIKE 'pk_live_%';
```

No schema changes needed - the key prefix provides natural isolation.

## Debugging

### Common Issues

**1. "Account invalid" error when creating products**
- Cause: OAuth was done in wrong mode
- Fix: Re-do OAuth with correct mode parameter

**2. Plan not updating after checkout**
- Cause: Webhook using wrong Clerk keys
- Fix: Check `getClerkClient()` is receiving publishableKey from metadata
- Logs: Look for `[Webhook] Using TEST/LIVE Clerk keys`

**3. User can't sign in after sign-up**
- Cause: User created in TEST Clerk, but app trying LIVE Clerk
- Fix: Ensure SDK/sign-up worker using same mode

### Useful Log Patterns

```
# OAuth mode detection
[OAuth] Starting TEST authorization for user xxx
[OAuth] Starting LIVE authorization for user xxx

# Webhook Clerk selection
[Webhook] Using TEST Clerk keys for pk: pk_test_xxx...
[Webhook] Using LIVE Clerk keys for pk: pk_live_xxx...

# Product creation mode
[Products] Creating 2 products for platform xxx
[Products] Created TEST tier_name: product=prod_xxx, price=price_xxx
```

## Testing Checklist

- [ ] Create TEST project → products appear in Stripe test dashboard
- [ ] Sign up on localhost → user in TEST Clerk
- [ ] Checkout with test card (4242...) → plan updates
- [ ] Check webhook logs show "Using TEST Clerk keys"
- [ ] Promote to LIVE → do live OAuth
- [ ] Create LIVE products → appear in Stripe live dashboard
- [ ] Sign up on production domain → user in LIVE Clerk
- [ ] Real checkout → real payment → plan updates
- [ ] Check webhook logs show "Using LIVE Clerk keys"

## History

This separation was implemented because:
1. Stripe Connect OAuth is mode-specific (test OAuth ≠ live OAuth)
2. Clerk has separate user databases for test vs production
3. We wanted localhost development to work without touching production

Key commits:
- `b0692f9` - Add mode parameter to OAuth flow
- `c016970` - Fix webhook to use mode-aware Clerk client
