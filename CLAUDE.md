# dream-api - Technical Reference

**Updated:** Current | **Status:** Working (grace cancel/redirect tweaks still pending)

## Quick Context
API-as-a-Service: Devs pay you → get auth, billing, usage tracking, one-off cart checkout, and hosted dashboard. Two Clerk apps: platform devs (`dream-api`) and shared end-users (`end-user-api`, isolated by publishableKey).

## Keys & Modes
- Keys per mode (test/live): `pk_mode_xxx`, `sk_mode_xxx`, tied to a stable `platformId (plt_xxx)`.
- Mode is selected via `X-Env: test|live` (defaults to live). Promote endpoint clones test config to live products/keys.

## KV / D1 Structure (high level)
- front-auth TOKENS_KV: `user:{userId}:platformId`, `publishableKey[:mode]`, `secretKey[:mode]`, `products[:mode]`, `stripeToken`, reverse lookups.
- api-multi TOKENS_KV: `platform:{platformId}:tierConfig[:mode]`, `platform:{platformId}:stripeToken[:mode]`, reverse lookups.
- D1 tables (mode-aware): `api_keys(mode)`, `stripe_tokens(mode)`, `tiers(mode, inventory, soldOut)`, `platforms`, `end_users`, `usage_counts`, `subscriptions`, `events`, `usage_snapshots`.
- Assets: R2 bucket `dream-api-assets`, keys prefixed by platformId. Upload via front-auth `/upload-asset` (Clerk auth) or api-multi `/api/assets` (secret key). Public GET `/api/assets/<platformId/...>`.

## Key Files
- api-multi/src/index.ts – main router (mode-aware)
- api-multi/src/routes/checkout.ts – subscription checkout (mode-aware)
- api-multi/src/routes/products.ts – one-off catalog + cart checkout (inventory checks)
- api-multi/src/routes/assets.ts – asset serve/upload to R2
- api-multi/src/stripe-webhook.ts – Connect webhooks; decrements one-off inventory on payment
- oauth-api/src/index.ts – Stripe Connect OAuth, product creation (test/live), promote-to-live
- front-auth-api/src/index.ts – platform auth/payment, credentials, asset upload (Clerk auth)

## Current Notes
- One-off inventory: enforced. Cart blocks sold-out/over-qty; webhook decrements inventory and marks soldOut. `/api/products` surfaces `soldOut`.
- Test/live: mode stored on keys, tiers, stripe_tokens; `create-products` accepts `mode`; promote endpoint clones test config to live.
- Checkout URLs: body overrides supported; legacy default remains.
- Graceful cancel: still depends on Stripe `customer.subscription.deleted` (no sweeper).

## Data Model (D1)
- platforms(platformId, clerkUserId, createdAt)
- api_keys(platformId, publishableKey, secretKeyHash, status, mode, createdAt)
- stripe_tokens(platformId, stripeUserId, accessToken, refreshToken, scope, mode, createdAt)
- tiers(platformId, name, displayName, price, limit, priceId, productId, features JSON, popular, inventory, soldOut, mode, createdAt)
- end_users(platformId, publishableKey, clerkUserId, email, status, createdAt, updatedAt)
- usage_counts(platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
- subscriptions(platformId, userId, publishableKey, plan, priceId, productId, amount, currency, status, currentPeriodEnd, canceledAt, cancelReason, updatedAt)
- events(platformId, source, type, eventId UNIQUE, payload_json, createdAt)
- usage_snapshots(platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)

## Deployment URLs
- Frontend: https://dream-frontend-dyn.pages.dev
- Platform: https://front-auth-api.k-c-sheffield012376.workers.dev
- OAuth: https://oauth-api.k-c-sheffield012376.workers.dev
- API: https://api-multi.k-c-sheffield012376.workers.dev

## Useful Calls
- Products (one-off): `GET /api/products` (Bearer sk, optional `X-Env: test`)
- Cart checkout: `POST /api/cart/checkout` `{email?, items:[{priceId,quantity}], successUrl?, cancelUrl?}` → `{url}`
- Subscription checkout: `POST /api/create-checkout` `{tier|priceId, successUrl?, cancelUrl?}`
- Assets upload: front-auth `/upload-asset` (Clerk auth, base64) or api-multi `/api/assets` (secret key)
- Promote: `POST oauth-api/promote-to-live {userId}` clones test config to live keys/products
