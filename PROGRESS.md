# Dream API - Progress & Current State

## What's Working (Dec 2025)

### Core API (api-multi)
- **Auth**: SK (secret key) + JWT (end-user token) two-layer authentication
- **Usage tracking**: `POST /api/data` increments counter, enforces tier limits
- **Usage check**: `GET /api/usage` returns current count, limit, plan
- **Checkout**: `POST /api/create-checkout` creates Stripe checkout session
- **Billing portal**: `POST /api/customer-portal` opens Stripe billing management
- **Dashboard**: `GET /api/dashboard` returns metrics, customers, tiers
- **Tiers**: Stored in D1, editable from dashboard
- **Webhooks**: Stripe webhooks update subscriptions, decrement inventory

### Auth Flow (Solved)
- Using **Clerk hosted auth pages** instead of embedded components
- Sign in: `https://composed-blowfish-76.accounts.dev/sign-in?redirect_url=...`
- Sign up: `https://composed-blowfish-76.accounts.dev/sign-up?redirect_url=...`
- Works everywhere - vanilla JS, React, any framework
- JWT refresh: Call `Clerk.session.getToken()` before each API call (tokens expire after 5 min)

### Plan Updates (Solved)
- D1 subscriptions table is source of truth (not JWT which can be stale)
- Usage routes check D1 for actual plan before enforcing limits
- After payment, user immediately gets correct tier limits

## Test App (`/test-app/index.html`)

Local testing console that exercises the full API:
- Sign in/out via hosted Clerk pages
- Track usage (POST /api/data)
- Check usage (GET /api/usage)
- Upgrade via Stripe checkout
- Store mode: products, cart, checkout

**Config**: Copy `config.example.js` to `config.js` with your secret key.

## fs-template (Imported)

Cloned from `git@github.com:Fruitloop24/fs-template.git` as reference SaaS template.

**Structure:**
- React + Vite + Tailwind
- Clerk for auth
- `ConfigContext` loads `/config.json` at runtime
- Pages: Landing, Dashboard, ChoosePlan, SignIn, SignUp

**Current State:** Untouched. Exploring how to integrate with dream-api.

**Options:**
1. Keep as reference, create separate "dream-api-integrated" version
2. Modify directly to show integration pattern
3. Build SDK first, then integration is trivial

**Decision:** TBD - first making test-app dynamic with tiers from API.

## Current Work

### TODO: Dynamic Tiers in Test App
The `/api/tiers` endpoint exists but needs auth to get platformId.

Need to:
1. Fix `/api/tiers` to require SK auth and filter by platformId
2. Add tier loading to test-app
3. Show tier cards with "Upgrade to X" buttons
4. Each button calls `/api/create-checkout` with that tier

This will let us test upgrading to any tier dynamically.

## Architecture Reminder

```
publishableKey = Project (pk_test_xxx / pk_live_xxx)
secretKey = Auth to API (sk_test_xxx / sk_live_xxx)

Frontend → Clerk hosted auth → JWT token
         → dream-api (SK + JWT) → D1/KV/Stripe
```

## Key Files

| File | Purpose |
|------|---------|
| `api-multi/src/index.ts` | Main router, auth logic |
| `api-multi/src/routes/usage.ts` | Usage tracking + limit enforcement |
| `api-multi/src/routes/checkout.ts` | Stripe checkout + portal |
| `api-multi/src/config/configLoader.ts` | Loads tiers from D1 |
| `test-app/index.html` | Local testing console |
| `fs-template/` | Reference SaaS template |
