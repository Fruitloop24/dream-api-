# dream-api Review (2025-12-30)

## Scope
- Read all docs and code (excluding `test-paywall`), plus `test-store` and `fs-template`.
- Focus: viability, marketability, scalability, security, reliability, and ship-readiness.

## Executive Summary
This is a real product, not a toy MVP. The architecture is coherent (Workers + D1 + KV + Clerk + Stripe), the dashboard and SDK are solid, and the store flow is already close to turnkey. Critical security issues have been addressed (see Resolved Issues below).

## Key Strengths
- Clear product value: API auth + billing + usage tracking in one package.
- Multi-worker design maps cleanly to responsibilities.
- SDK is already published and consistent with docs.
- Store mode is straightforward: API already returns `imageUrl`, `features`, and `description` for products.
- D1 queries are parameterized via `.bind(...)` (good baseline security).
- OAuth flows now require Clerk JWT authentication.
- Sign-up flow validates session tokens server-side.

---

## Resolved Issues (2025-12-30)

### 1. OAuth `/authorize` - FIXED
- **Was:** Trusted `userId` query param with no auth
- **Now:** Requires Clerk JWT, extracts userId from verified token
- **Files:** `oauth-api/src/index.ts`, `oauth-api/src/routes/oauth.ts`

### 2. Sign-up Worker - SIMPLIFIED & FIXED
- **Was:** Complex 900+ line worker with custom forms, multiple verification strategies
- **Now:** 332 lines, redirects to Clerk hosted pages, sets metadata on callback
- **Security:** Session token verified with Clerk Backend API, userId from token not user input
- **Files:** `sign-up/src/index.ts`, `sign-up/oauth.md`

### 3. Build blockers - FIXED/CLARIFIED
- **`ensureProjectSchema`:** The importing file (`oauth-api/src/lib/projects.ts`) was orphaned/unused. Deleted.
- **`rotateSecretKey`:** File EXISTS at `front-auth-api/src/lib/keyRotation.ts`. Original review was incorrect.

### 4. Usage table mismatch - FIXED
- **Was:** `api-multi/src/services/d1.ts` used `usage_snapshots`, rest of system used `usage_counts`
- **Now:** All code uses `usage_counts` consistently
- **Files:** `api-multi/src/services/d1.ts`

### 5. Rate limiting `USAGE_KV` - ACKNOWLEDGED
- **Status:** Code gracefully skips rate limiting when `USAGE_KV` not bound
- **Impact:** Rate limiting disabled in api-multi (not a crash, just no limiting)
- **Action:** Can add binding later if needed, not blocking

---

## Remaining Considerations

### Security & Data Isolation
- **Publishable key (pk_*)** is the per-project separator
- **Secret key (sk_*)** is the auth credential
- **Platform ID** derived from secret key, used as primary scoping filter
- **Stripe webhook signatures verified** when `STRIPE_WEBHOOK_SECRET` set

### Reliability / Scalability
- Workers + KV good fit for moderate scale
- D1 write-per-request usage tracking will bottleneck at high traffic (OK for non-enterprise)
- Webhook idempotency implemented

### fs-template Notes
- Single-tenant SaaS starter (doesn't use pk/sk model)
- Needs README and setup guide
- Uses `getToken({ template: 'pan-api' })` - JWT template name is configurable

### Store Mode
- Production-ready for basic stores
- API returns `imageUrl`, `features`, `description`
- Inventory tracked, `soldOut` computed from stock

---

## Investment Take (Updated)
- **Would I invest time?** Yes - critical issues resolved.
- **Would I invest money?** Yes, for MVP launch. Security gaps closed.
- **Ship-ready?** Yes for beta/early customers after testing.

---

## Next Steps
1. ~~Full end-to-end test of OAuth flow~~ ✓
2. ~~Test sign-up flow (OAuth + email/password)~~ ✓ Using Clerk hosted pages
3. Test store template with SDK
4. Test SaaS template with SDK
5. ~~Deploy updated workers~~ ✓ sign-up worker deployed

---

## Addendum (2025-12-31) - Template + Redirect Notes

### 1) Client-side secret key exposure in templates - FIXED
- **Where:** `fs-template/frontend/src/hooks/useDreamAPI.tsx`, `test-paywall/src/App.tsx`
- **Issue:** `import.meta.env.VITE_DREAM_SECRET_KEY` was compiled into the browser bundle.
- **Fix Applied:**
  1. Added `verifyPublishableKey()` function to api-multi
  2. Modified api-multi router to accept PK-only auth for public routes (tiers, products)
  3. Modified api-multi router to accept PK+JWT auth for user routes (usage, billing)
  4. Updated SDK to work without secretKey (frontend-only mode)
  5. Updated templates to use PK-only: `new DreamAPI({ publishableKey: 'pk_xxx' })`
  6. SK-only endpoints (customers, dashboard) remain protected
- **Security Model:** Same as Stripe - PK is public, SK stays on backend

### 2) Sign-up redirect is not escaped or allowlisted
- **Where:** `sign-up/src/index.ts` (`/signup` redirect param, `callbackPage` JS interpolation)
- **Issue:** Arbitrary `redirect` is interpolated into JS without escaping.
- **Why it matters:** Enables open redirect phishing and potential script injection on the callback page, before any JWT validation.
- **Fix:** Embed via `JSON.stringify(redirect)` and validate redirect against a per-project allowlist. Optional: signed state in cookie.

### 3) Publishable-key override is not validated
- **Where:** `api-multi/src/index.ts` (`X-Publishable-Key` header override)
- **Issue:** Override is accepted without verifying it belongs to the platformId derived from the SK.
- **Why it matters:** If an SK leaks, override expands blast radius across projects.
- **Fix:** Verify override against D1/KV mapping for the platformId before use (otherwise ignore).

### 4) Demo checkout without JWT
- **Where:** `test-paywall/src/App.tsx`
- **Issue:** Calls `api.billing.createCheckout()` without a user JWT.
- **Why it matters:** Works in demo but fails in production; can confuse template users.
- **Fix:** Wire sign-in and call `setUserToken()` before billing calls, or mark as demo-only.
