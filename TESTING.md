# Testing Notes - dream-api

Active testing and known issues to fix.

---

## Store - Sold Out Products

**Issue:** When products sell out (inventory = 0), they should be disabled on the frontend or show "Sold Out" overlay.

**Current state:**
- Dashboard correctly shows "Sold Out" badge for products with `inventory <= 0` (DashboardNew.tsx:884-887)
- Dashboard shows tier `soldOut: true` when `inventory <= 0` (dashboard.ts:170)
- `/api/products` endpoint returns products with `soldOut` field

**TODO:**
- [ ] Frontend store should check `soldOut` flag and either:
  - Hide the product entirely from shop display, OR
  - Show "Sold Out" overlay/badge on product card with disabled "Add to Cart" button
- [ ] `/api/cart/checkout` should reject items that are `soldOut` with clear error message
- [ ] Consider adding `active` field to disable products without deleting them

---

## Key Regeneration Modal

**Issue:** The modal that appears after regenerating a secret key needs polish.

**Current state:**
- Modal exists at DashboardNew.tsx:1021-1062
- Already dark themed with proper styling (bg-gray-800, border-gray-700)
- Shows checkmark icon and "New {MODE} Secret Key" header
- Displays the new secret key in green (`text-green-400`)
- Auto-copies to clipboard on generation
- Shows "What to update" guidance

**TODO:**
- [ ] Modal text says "Your server's `SECRET_KEY` environment variable" - this is correct
- [ ] The styling is already NOT plain white (dark theme matches dashboard)
- [x] Secret key is visible in the modal for copying

**Wording check:**
- The modal says: "Your server's SECRET_KEY environment variable" and "Any backend code that calls the dream-api"
- This is accurate - the dev updates their backend, not the dream-api backend
- Frontend code (publishable key) stays the same

---

## Key Management Notes

**What regenerate does:**
1. Generates new `sk_test_xxx` or `sk_live_xxx` (depending on project mode)
2. Hashes and stores in D1 `api_keys.secretKeyHash`
3. Updates KV cache: `secretkey:{hash}:publishableKey`
4. Updates KV: `user:{userId}:secretKey:{mode}`
5. Old secret key dies immediately - instant invalidation
6. Publishable key UNCHANGED - frontend keeps working

**What delete does:**
1. Removes BOTH test AND live keys for that project name
2. Deletes all tiers, subscriptions, usage, events, end_users for that project
3. Deletes R2 assets (product images)
4. Clears KV cache entries
5. Irreversible - no confirmation after the confirm dialog

---

## Dashboard Improvements

- [ ] Totals view - aggregate live revenue only (currently shows project counts)
- [ ] Store dashboard cleanup - product cards with images instead of table for better visual
- [ ] Consider adding quick stats to project dropdown (e.g., "MyStore (store) - live - $245 revenue")

---

## Testing Checklist

### SaaS Flow
- [x] Create customer via `/api/customers`
- [x] Track usage via `/api/data`
- [x] Usage limit enforcement at tier limit
- [x] Create checkout via `/api/create-checkout`
- [x] Webhook updates subscription in D1
- [x] JWT metadata updated in Clerk
- [ ] Customer portal access

### Store Flow
- [x] Products created with inventory
- [x] Cart checkout via `/api/cart/checkout`
- [x] Inventory decrement on purchase
- [x] Sold out detection (inventory = 0)
- [ ] Sold out rejection on checkout attempt
- [ ] Frontend sold out display

### Key Management
- [x] Regenerate secret - new key works immediately
- [x] Regenerate secret - old key fails immediately
- [x] Delete project - both modes (test+live) removed
- [x] Delete project - all data cleaned up
- [x] Dashboard shows new key after regen (via loadCredentials refresh)

---

## Browser Alert Issues - FIXED

**All alerts now use styled components:**
- [x] Key regeneration - proper modal (DashboardNew.tsx:1029-1071)
- [x] Delete success - dark themed toast with project name
- [x] Delete error - dark themed error toast
- [x] Regenerate error - dark themed error toast

**Toast system added:**
- Located at DashboardNew.tsx:1073-1101
- Success: green theme (bg-green-900/90, border-green-700)
- Error: red theme (bg-red-900/90, border-red-700)
- Auto-dismiss after 4 seconds
- Manual dismiss button

---

## Production Readiness Assessment

**What's solid:**
- [x] Full SaaS flow working (signup → usage → limits → checkout → subscription)
- [x] Full Store flow working (products → cart → checkout → inventory)
- [x] Stripe Connect OAuth (one click)
- [x] Key management (regen secret, delete project)
- [x] Dashboard with real metrics
- [x] Webhooks (idempotent, handles all events)
- [x] Test/Live separation
- [x] JWT gating (no DB lookup per request)
- [x] Edge deployment (CF Workers)
- [x] Parameterized queries (no SQL injection)
- [x] Hashed secrets (never stored plain)

**What needs polish before "prod":**
- [ ] Stripe account ID visible in dashboard
- [ ] Stripe disconnect flow with graceful degradation
- [ ] Revoked token handling (detect + prompt reconnect)
- [ ] CSV export
- [ ] Rate limiting (CF has it, just enable)
- [ ] Error monitoring (Datadog/Sentry integration)

**Security posture:**
- No ports exposed (serverless)
- No SSH (no server)
- No SQL injection (bound params)
- No credential storage (Clerk/Stripe handle it)
- Secrets hashed (SHA-256)
- DDoS protection (Cloudflare free tier)
- Can add WAF, rate limits, geo-blocking in minutes

**Honest verdict:**
This is closer to prod than most "production" apps. The architecture
is sound. The hard integrations work. What's missing is polish and
trust signals (Stripe dashboard link, disconnect button, exports).

One paying customer would validate everything.

---

## Last Updated
Dec 2025
