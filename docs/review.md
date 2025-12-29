# dream-api Review (2025-02-14)

## Scope
- Read all docs and code (excluding `test-paywall`), plus `test-store` and `fs-template`.
- Focus: viability, marketability, scalability, security, reliability, and ship‑readiness.

## Executive Summary
This is a real product, not a toy MVP. The architecture is coherent (Workers + D1 + KV + Clerk + Stripe), the dashboard and SDK are solid, and the store flow is already close to turnkey. However, there are a few critical security and build‑blocking issues that must be fixed before I would invest serious time or money. The fact that it “works flawlessly” is a strong signal, but it does not offset the current auth gaps.

## Key Strengths
- Clear product value: API auth + billing + usage tracking in one package.
- Multi-worker design maps cleanly to responsibilities.
- SDK is already published and consistent with docs.
- Store mode is straightforward: API already returns `imageUrl`, `features`, and `description` for products (see `api-multi/src/routes/products.ts`).
- D1 queries are parameterized via `.bind(...)` (good baseline security).

## High-Risk Issues (Must Fix)
1. **OAuth `/authorize` trusts a `userId` query param** with no Clerk auth. Anyone who knows a userId could connect their Stripe account to someone else’s platform.  
   - Location: `oauth-api/src/routes/oauth.ts:89`
2. **Signup `/oauth/complete` is unauthenticated** and accepts `userId` directly. If a userId leaks, someone can bind that user to another project.  
   - Location: `sign-up/src/index.ts:231`
3. **Build blockers**: missing `ensureProjectSchema` export and missing `rotateSecretKey` file.  
   - Location: `oauth-api/src/lib/projects.ts:2` (import without export in `oauth-api/src/lib/schema.ts`)  
   - Location: `front-auth-api/src/index.ts:49` (missing `front-auth-api/src/lib/keyRotation.ts`)
4. **Usage table mismatch**: `usage_snapshots` is written but not created; the main system uses `usage_counts`. Fresh DBs can break `POST /api/customers`.  
   - Location: `api-multi/src/services/d1.ts:289`, `api-multi/src/routes/customers.ts:90`
5. **Rate limiting in api-multi** references `USAGE_KV` which is not in the env interface or `wrangler.toml`, so it effectively disables the limiter.  
   - Location: `api-multi/src/middleware/rateLimit.ts:42`, `api-multi/src/types.ts:17`, `api-multi/wrangler.toml:10`

## Security & Data Isolation Notes
- **Publishable key (pk_*)** is already the per‑project separator, and **secret key (sk_*)** is the auth credential.  
- **Platform ID** is derived from the secret key and used as the primary scoping filter in queries.  
- This is good, but **three identifiers alone do not make cross‑tenant theft “impossible.”** You still must authenticate OAuth flows and avoid accepting unverified userId inputs.
- **Stripe webhook signatures are verified** in `api-multi` and `front-auth-api` (and `fs-template`) when `STRIPE_WEBHOOK_SECRET` is set. That part is solid.

## Reliability / Scalability
- Workers + KV are a good fit for moderate scale and fast response times.
- D1 write‑per‑request usage tracking will bottleneck for high‑traffic APIs. OK for non‑enterprise, but you’ll want batching or queues later.
- Webhook idempotency is implemented (good), but storage for events is inconsistent between services.

## fs-template Review (Root `fs-template/`)
### What it is
Single‑tenant SaaS starter (Clerk + Stripe + KV usage). It does not use the multi‑tenant pk/sk model; it’s a product template for a single app.

### Why it is easy (or not)
- **Easy:** sensible pages, clear flow (Landing → SignUp → ChoosePlan → Dashboard), JWT‑only API, good separation of routes/middleware.
- **Not “super easy” yet:** no template README, and there are hidden assumptions:
  - Frontend uses `getToken({ template: 'pan-api' })` but the JWT template is configurable. This needs alignment to avoid auth failures.
  - `config.json` is loaded at runtime and expected to include `tiers`, `apiUrl`, and `userId`; but `userId` is not used by the API.
  - Clerk publishable key is injected via env (`VITE_CLERK_PUBLISHABLE_KEY`), not config.

### Is it a strong SaaS template?
Yes, but it needs a README and a one‑page “Getting Started” with Clerk + Stripe + webhook setup steps. The code itself is clean and close to production for a small SaaS.

### Ease of turning this into a SaaS starter
- **Fast** if you already know Clerk + Stripe: 1–2 days to brand + swap product logic.
- **Moderate** if you need onboarding/docs for new devs: 3–7 days to make it foolproof.

### Using Dream API SDK with fs-template
- fs-template is single-tenant and uses Clerk directly; Dream API SDK is multi-tenant and expects pk/sk plus the sign-up worker flow.
- To use the SDK, you would remove direct Clerk usage in the template and replace it with `@dream-api/sdk` auth helpers and API calls. That is a medium lift (roughly 1-3 days), mostly wiring and UI updates.

## Store Mode Reality Check
The store path is already “elementary”:
- API returns `imageUrl`, `features`, and `description` for items.
- Inventory is already tracked and `soldOut` is computed from stock.
- For a basic store, this is production‑ready with minimal UI work.

## Investment Take
If I were investing:
- **Would I invest time?** Yes, after fixing the high‑risk auth/build issues.  
- **Would I invest money today?** Not yet. The auth gaps are fixable, but they’re too risky to ignore.  
- **Does “flawless” behavior matter?** Absolutely — it’s necessary, but not sufficient. It’s a strong signal that the core product is viable, but security and correctness still decide whether it’s safe to scale.

## Actionable Next Fixes (Short List)
1. Require Clerk auth for `oauth-api /authorize` and remove the raw `userId` param.
2. Require authenticated user context for `sign-up /oauth/complete` or validate against a Clerk session.
3. Resolve build blockers (`ensureProjectSchema`, `rotateSecretKey`).
4. Unify usage tracking tables (`usage_counts` vs `usage_snapshots`).
5. Wire `USAGE_KV` into api-multi or change rate limiting to D1/KV that exists.
