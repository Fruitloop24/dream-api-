# Test Plan - Test/Live Mode + Localhost Development

## What Changed

1. **Stripe Connect auth pattern**: Platform key + `Stripe-Account` header (not OAuth access token)
2. **Products default to TEST mode**: Creates TEST Stripe products, generates pk_test_/sk_test_ keys
3. **Promote to Live**: Creates LIVE Stripe products, generates pk_live_/sk_live_ keys
4. **Localhost auto-detection**: SDK uses TEST Clerk keys on localhost

## Pre-Test Setup

```bash
# 1. Deploy all workers
cd api-multi && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy

# 2. Verify secrets are set
cd oauth-api
npx wrangler secret list  # Should include STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE

cd api-multi
npx wrangler secret list  # Should include CLERK_SECRET_KEY_TEST, CLERK_PUBLISHABLE_KEY_TEST
```

## Test 1: Fresh Project Creation (TEST Mode)

**Goal:** Verify new projects default to TEST mode and create TEST Stripe products.

1. Go to `dream.panacea-tech.net`
2. Sign in as developer
3. **Delete any existing projects** (clean slate)
4. If needed, reconnect Stripe (should already be connected)
5. Create new project:
   - Type: SaaS
   - Name: "Test SaaS Project"
   - Add a tier: Basic - $9/month, 100 limit
6. **Expected:**
   - Keys generated: `pk_test_xxx`, `sk_test_xxx`
   - Project shows "test" mode badge
7. **Verify in Stripe Dashboard:**
   - Go to Stripe → Test mode → Products
   - Should see "Basic" product created
   - Should NOT be in Live mode products

## Test 2: Localhost Development

**Goal:** Verify SDK works on localhost with TEST Clerk keys.

1. Clone fresh template:
   ```bash
   git clone https://github.com/Fruitloop24/dream-saas-basic test-localhost
   cd test-localhost
   npm install
   ```

2. Create `.env` with TEST keys from dashboard:
   ```
   VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

4. **Test sign-up flow:**
   - Click "Get Started"
   - Complete Clerk sign-up (use `+clerk_test` email, code: 424242)
   - Should redirect back to app
   - User should be signed in

5. **Expected:**
   - SDK auto-detects localhost
   - Uses TEST Clerk publishable key
   - sign-up.workers.dev handles signup (TEST mode)
   - api-multi verifies JWT with TEST Clerk keys
   - User appears in dashboard with test publishable key

## Test 3: Promote to Live

**Goal:** Verify promote creates LIVE Stripe products and new keys.

1. In dashboard, find the test project
2. Click "Promote to Live" (or "Go Live")
3. Confirm the action

4. **Expected:**
   - New keys generated: `pk_live_xxx`, `sk_live_xxx`
   - Project shows "live" mode badge
   - Test project still exists (parallel, not replaced)

5. **Verify in Stripe Dashboard:**
   - Switch to Live mode
   - Products → Should see "Basic" product
   - Prices should match test tier config

## Test 4: Production Deployment

**Goal:** Verify LIVE keys work in production.

1. Deploy template to Vercel/Cloudflare:
   - Set `VITE_DREAM_PUBLISHABLE_KEY=pk_live_xxx`

2. **Test production sign-up:**
   - Use real email
   - Complete sign-up flow
   - User should appear in dashboard under LIVE project

3. **Test checkout:**
   - Select a paid tier
   - Complete Stripe checkout (use test card 4242...)
   - Plan should update

## Test 5: Tier Editing (TEST Mode)

**Goal:** Verify tier edits update TEST Stripe products.

1. Edit a tier on the test project:
   - Change price from $9 → $19
   - Add a feature

2. **Expected:**
   - Stripe TEST product/price updated
   - Dashboard shows new price

## Test 6: Tier Editing (LIVE Mode)

**Goal:** Verify tier edits update LIVE Stripe products.

1. Edit a tier on the live project:
   - Change price or features

2. **Expected:**
   - Stripe LIVE product/price updated
   - Dashboard shows new values

## Error Cases to Test

### Missing Stripe Secrets
1. Temporarily remove `STRIPE_SECRET_KEY_TEST` from oauth-api
2. Try to create a test project
3. **Expected:** Clear error message about missing secret

### OAuth Not Connected
1. Sign up as new developer (no Stripe connected)
2. Try to create project
3. **Expected:** Prompt to connect Stripe first

## Smoke Test Checklist

- [ ] Dashboard loads
- [ ] Can sign in as developer
- [ ] Can delete existing projects
- [ ] Can create TEST project → TEST Stripe products created
- [ ] Can copy TEST keys
- [ ] Template runs on localhost with TEST keys
- [ ] End-user sign-up works on localhost
- [ ] Can promote TEST → LIVE
- [ ] LIVE Stripe products created
- [ ] LIVE keys generated
- [ ] Template works in production with LIVE keys
- [ ] End-user checkout works

## Rollback Plan

If things break:

1. **OAuth token still stored** - The `stripeUserId` from OAuth is still valid
2. **Stripe products still exist** - They're in Stripe, just need keys fixed
3. **Revert code** - `git checkout <previous-commit>` and redeploy

## Key Files Changed

| File | Change |
|------|--------|
| `oauth-api/src/routes/products.ts` | Platform key + Stripe-Account header, default TEST mode |
| `oauth-api/src/routes/tiers.ts` | Same pattern for tier CRUD |
| `oauth-api/src/routes/promote.ts` | Uses LIVE key for promotion |
| `oauth-api/src/types.ts` | Added STRIPE_SECRET_KEY_TEST/LIVE |
| `api-multi/src/index.ts` | Detects pk_test_ → uses TEST Clerk keys |
| `sign-up/src/index.ts` | Detects workers.dev → uses TEST Clerk keys |
| `dream-sdk/src/clerk.ts` | Auto-detect localhost → TEST mode |
