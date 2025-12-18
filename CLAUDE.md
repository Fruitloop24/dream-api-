# dream-api

**API-as-a-Service Platform** - Devs pay $15/mo, get API keys, we handle billing/auth/usage.

## Quick Deploy
```bash
cd front-auth-api && npm run deploy
cd oauth-api && npm run deploy
cd api-multi && npm run deploy
# Or just: git push (auto-deploys frontend via Cloudflare Pages)
```

## Core Concept

**publishableKey = Project**. One key tells you everything:
- `pk_test_xxx` / `pk_live_xxx` = mode
- Links to tiers, customers, usage
- Project type (saas/store) locked at creation

## Architecture

```
Frontend (React) → front-auth-api (Dev Auth) → oauth-api (Stripe Connect)
                            ↓
                    D1 + KV + R2
                            ↓
                    api-multi ← Dev's App (SDK calls)
```

## Workers

| Worker | Purpose |
|--------|---------|
| `front-auth-api` | Dev auth, platform ID, credentials, project delete/regen |
| `oauth-api` | Stripe Connect OAuth, create/edit products & tiers |
| `api-multi` | Customer API - usage tracking, checkouts, webhooks, dashboard |

## Key Endpoints

### front-auth-api
```
POST /generate-platform-id     Create plt_xxx
GET  /get-credentials          Get test + live keys
GET  /projects                 List all projects
POST /projects/delete          DELETE ENTIRE PROJECT (test+live, all data, R2 assets)
POST /projects/regenerate-secret  New secret key, same publishable key
```

### oauth-api
```
GET  /authorize                Start Stripe OAuth
POST /create-products          Create project + Stripe products + keys
PUT  /tiers                    Edit tier (price, limit) - no new keys
POST /promote-to-live          Test → Live with edits
```

### api-multi
```
POST /api/customers            Create end-user (in shared Clerk app)
POST /api/data                 Track usage + enforce limits
POST /api/create-checkout      SaaS subscription checkout
POST /api/cart/checkout        Store multi-item checkout
GET  /api/dashboard            Metrics for dev dashboard
POST /webhook/stripe           Handle payments, update subs/inventory
```

## D1 Tables

| Table | Key Fields |
|-------|------------|
| `platforms` | platformId, clerkUserId |
| `api_keys` | publishableKey (PK), secretKeyHash, mode, projectType, name |
| `tiers` | publishableKey, name, price, limit, priceId, productId, inventory |
| `subscriptions` | publishableKey, userId, plan, status, amount, subscriptionId |
| `usage_counts` | publishableKey, userId, plan, usageCount, periodStart/End |
| `end_users` | publishableKey, clerkUserId, email |
| `events` | eventId (unique), type, payload_json |

**CRITICAL:** Always filter by `publishableKey` to separate test/live data.

## KV Keys

```
# Auth lookups (api-multi)
secretkey:{hash}:publishableKey → pk_xxx
publishablekey:{pk}:platformId → plt_xxx

# Dashboard credentials (front-auth-api)
user:{clerkUserId}:secretKey:live → sk_live_xxx
user:{clerkUserId}:secretKey:test → sk_test_xxx
```

## Two Clerk Apps

1. **dream-api** - Platform devs ($15/mo customers)
2. **end-user-api** - Shared app for ALL devs' end customers, isolated by `publishableKey` in metadata

## SaaS Flow (Tested & Working)
```bash
# 1. Create customer
curl -X POST .../api/customers -H "Authorization: Bearer sk_live_xxx" \
  -d '{"email":"user@example.com","password":"xxx","plan":"free"}'

# 2. Track usage (returns count/limit, blocks at limit)
curl -X POST .../api/data -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_xxx" -H "X-User-Plan: free"

# 3. Create upgrade checkout
curl -X POST .../api/create-checkout -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_xxx" -d '{"tier":"pro","successUrl":"...","cancelUrl":"..."}'
```

## Key Management

**Regenerate Secret** - New `sk_xxx`, same `pk_xxx`. Old key dies instantly. Updates:
- D1: `api_keys.secretKeyHash`
- KV: `secretkey:{hash}:publishableKey`
- KV: `user:{userId}:secretKey:{mode}`

**Delete Project** - Nukes EVERYTHING for that project name:
- Both test + live keys
- All tiers, subscriptions, usage, events, end_users
- R2 assets
- KV cache entries

## URLs

- Frontend: https://dream-frontend-dyn.pages.dev
- front-auth-api: https://front-auth-api.k-c-sheffield012376.workers.dev
- oauth-api: https://oauth-api.k-c-sheffield012376.workers.dev
- api-multi: https://api-multi.k-c-sheffield012376.workers.dev

## Debugging

| Problem | Fix |
|---------|-----|
| "Invalid API key" | Hash sk with SHA-256, check D1 `api_keys.secretKeyHash`, clear KV cache |
| Dashboard shows old secret | Regen updates KV `user:{id}:secretKey:{mode}` - check both with and without mode suffix |
| User not showing in dashboard | Check `end_users.publishableKey` matches your project |
| Usage wrong between test/live | Ensure queries filter by `publishableKey` not just `platformId` |

## What's Working (Dec 2025)

- Full SaaS flow: signup → usage tracking → limits → checkout → subscription
- Full Store flow: products → cart → checkout → inventory decrement
- Project management: create, edit tiers, promote to live, delete, regen secret
- Dashboard: metrics, customers, tiers with priceId/productId
- Webhooks: subscription create/update, inventory decrement, idempotent

## TODO

- [ ] Better browser alerts on regen (not plain white)
- [ ] Totals view - aggregate live revenue only
- [ ] Store dashboard cleanup - product cards with images
- [ ] PWA for mobile
