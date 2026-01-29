# OAuth & Test/Live Flow

Complete reference for Stripe Connect OAuth and the Test → Live promotion flow.

**Last Updated:** Jan 2025

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPER JOURNEY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Sign up (Clerk)                                                         │
│         ↓                                                                   │
│  2. Pay $19/mo (14-day trial)                                              │
│         ↓                                                                   │
│  3. Connect Stripe (TEST OAuth) ←─── First OAuth, uses test client_id      │
│         ↓                                                                   │
│  4. Create TEST project ←─────────── pk_test_/sk_test_ keys                │
│         ↓                                                                   │
│  5. Build & test on localhost ←───── No time limit! Stay here as long as   │
│         ↓                            you want                               │
│  6. Click "Promote to Live"                                                 │
│         ↓                                                                   │
│  7. Connect Stripe (LIVE OAuth) ←─── Second OAuth, uses live client_id     │
│         ↓                                                                   │
│  8. Live products created ←───────── pk_live_/sk_live_ keys                │
│         ↓                                                                   │
│  9. TEST DATA DELETED ←───────────── Clean slate for production            │
│         ↓                                                                   │
│  10. Deploy to Vercel/CF Pages ←──── Live keys ONLY work on deployed sites │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Two OAuth Flows?

Stripe Connect requires **separate authorization** for test and live environments:

| OAuth Flow | Client ID Used | What It Enables |
|------------|----------------|-----------------|
| Test OAuth | `STRIPE_CLIENT_ID_TEST` | Create products in connected account's TEST Stripe |
| Live OAuth | `STRIPE_CLIENT_ID` | Create products in connected account's LIVE Stripe |

**The `stripeUserId` (acct_xxx) is the same** for both - it's the connected account ID. But Stripe needs you to authorize each environment separately.

---

## Token Storage

### D1 (Source of Truth)

```sql
-- stripe_tokens table stores BOTH test and live tokens
-- Primary key is (platformId, mode) so they don't overwrite each other

INSERT INTO stripe_tokens (platformId, mode, stripeUserId, accessToken, ...)
VALUES ('plt_xxx', 'test', 'acct_xxx', 'sk_test_xxx', ...);

INSERT INTO stripe_tokens (platformId, mode, stripeUserId, accessToken, ...)
VALUES ('plt_xxx', 'live', 'acct_xxx', 'sk_live_xxx', ...);
```

### KV (Fast Cache)

```
user:{userId}:stripeToken:test  → {accessToken, stripeUserId}
user:{userId}:stripeToken:live  → {accessToken, stripeUserId}
user:{userId}:stripeToken       → (backwards compat, last OAuth wins)

platform:{platformId}:stripeToken:test → same
platform:{platformId}:stripeToken:live → same
platform:{platformId}:stripeToken      → same
```

---

## OAuth Callback Flow

**File:** `oauth-api/src/routes/oauth.ts`

```
1. User clicks "Connect Stripe" in dashboard
   └─► Redirect to /authorize?token=xxx&mode=test (or mode=live)

2. /authorize handler:
   └─► Validate JWT token
   └─► Get/create platformId
   └─► Build Stripe OAuth URL with correct client_id based on mode
   └─► Store state in KV: oauth:state:{state} = {userId, platformId, mode}
   └─► Redirect to Stripe

3. User authorizes on Stripe

4. Stripe redirects to /callback?code=xxx&state=xxx

5. /callback handler:
   └─► Retrieve state from KV (userId, platformId, mode)
   └─► Exchange code for tokens with Stripe
   └─► Save to D1: saveStripeToken(env, platformId, stripeUserId, accessToken, ..., MODE)
                                                                              ^^^^
                                                                   CRITICAL: pass the mode!
   └─► Save to KV with mode suffix
   └─► Redirect to /api-tier-config?stripe=connected&mode=xxx
```

---

## Product Creation Flow

**File:** `oauth-api/src/routes/products.ts`

```
POST /create-products
{
  userId: "user_xxx",
  mode: "test",           // or "live"
  projectName: "My App",
  projectType: "saas",    // or "store"
  tiers: [...]
}

1. Get platformId from KV
2. Get stripeToken for this MODE from KV
   └─► Try: user:{userId}:stripeToken:{mode}
   └─► Fallback: user:{userId}:stripeToken
3. Create Stripe products using:
   └─► Authorization: Bearer {STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY_LIVE}
   └─► Stripe-Account: {stripeUserId from token}
4. Generate API keys (pk_{mode}_xxx, sk_{mode}_xxx)
5. Save to D1 (api_keys, tiers)
6. Save to KV (reverse lookups, tier config cache)
7. Return keys to developer (ONLY TIME they see secret key!)
```

---

## Promote to Live Flow

**File:** `oauth-api/src/routes/promote.ts`

```
POST /promote-to-live
{
  userId: "user_xxx",
  publishableKey: "pk_test_xxx",  // Which test project to promote
  tiers: [...]                     // Optional: edited tier values
}

1. Validate test key exists
2. Check for existing live version (block if exists)
3. Get live stripeToken
   └─► If missing: return 428 {needsLiveOAuth: true}
   └─► Frontend auto-redirects to live OAuth
4. Create LIVE Stripe products
5. Generate LIVE API keys
6. Save to D1 and KV
7. DELETE TEST DATA:
   └─► api_keys WHERE publishableKey = pk_test_xxx
   └─► tiers WHERE publishableKey = pk_test_xxx
   └─► end_users WHERE publishableKey = pk_test_xxx
   └─► usage_counts WHERE publishableKey = pk_test_xxx
   └─► subscriptions WHERE publishableKey = pk_test_xxx
   └─► KV cache entries for test key
8. Return live credentials + warning about localhost
```

---

## Critical Gotcha: Localhost + Live Keys

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  LIVE KEYS DO NOT WORK ON LOCALHOST                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  pk_test_xxx + localhost     → ✅ Works                        │
│  pk_test_xxx + deployed URL  → ✅ Works                        │
│  pk_live_xxx + localhost     → ❌ BLOCKED by Clerk             │
│  pk_live_xxx + deployed URL  → ✅ Works                        │
│                                                                 │
│  This is a Clerk security feature, not a bug.                  │
│  Production keys only work on production domains.              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Dashboard shows a permanent warning banner** when a live project is selected.

---

## Debugging Checklist

### "Stripe credentials not found"
- [ ] Check KV: `user:{userId}:stripeToken:{mode}` exists?
- [ ] Check D1: `SELECT * FROM stripe_tokens WHERE platformId = ? AND mode = ?`
- [ ] Was OAuth completed for this mode?

### "Live Stripe connection required" (428)
- [ ] User needs to do LIVE OAuth
- [ ] Frontend should auto-redirect to `/authorize?mode=live`
- [ ] After OAuth, `pendingPromote` in sessionStorage resumes the flow

### Test data not deleted on promote
- [ ] Check promote.ts DELETE queries ran
- [ ] Check KV cleanup ran (catch blocks might swallow errors)

### Tokens overwriting each other
- [ ] Verify `saveStripeToken` is called with MODE parameter
- [ ] Check D1 has separate rows for test and live (different mode values)

---

## Environment Variables

### oauth-api

```bash
# Stripe Connect OAuth
STRIPE_CLIENT_ID_TEST    # For test OAuth flow
STRIPE_CLIENT_ID         # For live OAuth flow (production)
STRIPE_CLIENT_SECRET_TEST
STRIPE_CLIENT_SECRET

# Platform keys (for creating products on connected accounts)
STRIPE_SECRET_KEY_TEST   # sk_test_xxx
STRIPE_SECRET_KEY_LIVE   # sk_live_xxx

# Clerk (for JWT verification)
CLERK_SECRET_KEY
CLERK_PUBLISHABLE_KEY

# Frontend redirect
FRONTEND_URL             # https://dream.panacea-tech.net
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `oauth-api/src/routes/oauth.ts` | OAuth authorize + callback handlers |
| `oauth-api/src/routes/products.ts` | Create products, generate keys |
| `oauth-api/src/routes/promote.ts` | Promote test → live, delete test data |
| `oauth-api/src/lib/stripe.ts` | `saveStripeToken`, `getStripeToken` |
| `oauth-api/src/lib/schema.ts` | D1 schema migrations |
| `frontend/src/pages/ApiTierConfig.tsx` | Product config UI, promote handling |
| `frontend/src/pages/DashboardNew.tsx` | Dashboard, live mode warning banner |
