## dream-api - Evaluation Brief

### What it is
- API-as-a-Service for indie devs: we provide auth, billing, usage enforcement, and a hosted dashboard. Devs connect their Stripe (Connect Standard), get pk/sk + platformId, and run their own customers through our shared infra.
- Two Clerk apps: one for our paying devs; one shared for their end-users. Isolation via `publishableKey` in the end-user JWT.
- Three keys per dev: `platformId` (internal), `publishableKey` (in JWT), `secretKey` (API auth, stored as SHA-256). One keyset per platform to avoid confusion.

### What we handle automatically
- Product/tier creation: UI lets devs define subscription products (price, limit) or one-offs (price, description, image, inventory placeholder). OAuth worker creates products/prices on the dev’s connected Stripe and stores tier config in D1 (KV cache optional).
- Usage enforcement: D1 `usage_counts` per platformId/userId/plan; `/api/data` enforces limits (403 at limit). Limits from D1 tiers (fallback KV cache).
- Stripe webhooks (Connect): `/webhook/stripe` handles checkout + subscription events. We update end-user Clerk metadata (plan, publishableKey, stripeCustomerId, subscriptionId) and upsert D1 `subscriptions` (plan, priceId, productId, amount, currency, status, currentPeriodEnd, canceledAt, subscriptionId, stripeCustomerId). Events stored in D1 `events` for dashboard visibility. Cancel-at-period-end is captured; access remains until Stripe sends deleted (no sweeper yet).
- Customer portal: `/api/customer-portal` builds Stripe portal session via dev OAuth token (fallback platform key + Stripe-Account); KV→DB fallback for platformId; surfaces Stripe error message.
- Dashboard: `/api/dashboard` aggregates metrics, customers (usage, status, cancel dates, Stripe IDs), tiers, keys, Stripe account ID, recent webhooks. Falls back to Clerk metadata for missing IDs.

### Surface APIs (dev-facing)
- `POST /api/customers` create end-user (initial plan free/pro).
- `GET /api/usage` / `POST /api/data` usage check + increment with enforcement.
- `POST /api/create-checkout` upgrade to paid tier (success/cancel URLs overridable).
- `POST /api/customer-portal` manage/cancel subscription (cancel_at_period_end).
- `GET /api/tiers` pricing info; `GET /api/dashboard` platform snapshot.
- Stripe webhook `/webhook/stripe` (Connect, single secret).

### Data & storage
- D1 tables: platforms, api_keys, stripe_tokens, tiers, end_users, usage_counts/snapshots, subscriptions, events.
- KV caches: publishableKey→platformId, tier config cache, secretHash→publishableKey.
- Clerk metadata (end-user): plan, publishableKey, stripeCustomerId, subscriptionId.
- Clerk metadata (dev): plan (paid), platformId, stripe connect token refs.

### What the dashboard shows
- Metrics: active subs, canceling subs, MRR, usage this period.
- Keys: current pk/sk (masked), platformId, Stripe account ID, list of api_keys.
- Tiers: free/pro (or custom) with limits and priceIds/productIds.
- Customers: email, plan, usage bar with limit, status (active/canceling), renew/cancel date; detail panel with subscriptionId, stripeCustomerId, priceId, amount.
- Webhook recent events + last timestamp.

### Known gaps / risks (be truthful)
- Webhook dependence: if Stripe delete event is missed, no sweeper to downgrade after period end.
- One-off inventory not enforced (fields stored only).
- Success/cancel URLs still rely on caller input; legacy default remains unless provided.
- No rate limit beyond usage gating; no alerting/health badge except recent events.
- Portal error handling improved but could add retries for transient Stripe errors.

### Ask to reviewer AI
- Be candid on reliability, edge cases, security, and rollout risks; flag multi-tenant isolation holes and fail-open paths.
- Call out missing sweepers (plan downgrade after period end), lack of inventory enforcement, weak rate limiting, webhook fragility, and portal error handling.
- Highlight any data consistency risks between KV/D1/Clerk and how to harden them before a wider launch.
- Output: prioritized findings with severity, suggested minimal fixes, and must-run tests (webhook retries, usage gating bypass attempts, checkout/portal URL overrides).
