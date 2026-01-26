# dream-api

API-as-a-Service Platform. Developers get API keys, we handle auth/billing/usage.

**Business Model:** API is the product. Templates are free onboarding tools.

## TODO - Pre-Launch

- [ ] Add business phone or Telegram link to `frontend/src/config.ts`
- [ ] Fill in About page story (`frontend/src/pages/About.tsx`)
- [ ] Switch Clerk to production keys (seeing dev mode warning)
- [ ] Set up custom domain: `dream.panacea-tech.net`
- [ ] Push all changes and verify deploy
- [ ] Product Hunt launch prep

## Recently Completed

- [x] Video compression (21MB → 5MB, 12MB → 2.7MB)
- [x] Poster images for instant video preview
- [x] Privacy policy page (`/privacy`)
- [x] Terms of service page (`/terms`)
- [x] SLA page (`/sla`) - honest "we're glue" messaging
- [x] About page placeholder (`/about`)
- [x] Footer with company info, legal links, OSS links
- [x] Template SDK versions updated to `latest`
- [x] Favicon fixed (2MB → 2.7KB)

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| Trial | Free | 14 days, full access, payment method required |
| Pro | $19/mo | SaaS: 2,000 end-users / Store: unlimited guest checkout |
| Overage | $0.03/user | SaaS only, after 2,000 live users |

**Billing model:** Stripe direct for our billing ($19/mo + overage). Stripe Connect for end-user payments (funds go to dev).

## Quick Reference

```bash
npm install @dream-api/sdk
```

```typescript
// Frontend (PK only)
const api = new DreamAPI({ publishableKey: 'pk_test_xxx' });
await api.products.list();
await api.auth.init();
await api.usage.track();

// Backend (SK + PK)
const api = new DreamAPI({
  secretKey: 'sk_test_xxx',
  publishableKey: 'pk_test_xxx',
});
await api.customers.create({ email: 'user@example.com' });
await api.dashboard.get();
```

## Documentation

| Doc | Purpose |
|-----|---------|
| `docs/SDK-GUIDE.md` | Complete SDK reference |
| `docs/API-REFERENCE.md` | Endpoints and data types |
| `docs/ARCHITECTURE.md` | Technical details |
| `docs/SIGN-UP-FLOW.md` | End-user sign-up flow (critical `clerk.client.signIn` fix) |
| `docs/D1-SCHEMA.md` | Database schema reference |
| `docs/LIMITATIONS.md` | Constraints and considerations |
| `docs/HYPE.md` | Marketing/pitch document |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ PLATFORM (Dev pays us)                                       │
│                                                              │
│ Frontend → front-auth-api → oauth-api (Stripe Connect)      │
│                   ↓                                          │
│          front-auth-api ← Stripe Webhooks                   │
│          (subscriptions, daily cron → usage metering)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ END-USER (End-user pays dev via Stripe Connect)             │
│                                                              │
│ Dev's App → @dream-api/sdk → api-multi                      │
│                                   ↓                          │
│                              sign-up (end-user signup)      │
│                                   ↓                          │
│                           D1 + KV + R2                      │
└─────────────────────────────────────────────────────────────┘
```

## Workers

| Worker | Purpose |
|--------|---------|
| `api-multi` | Main API - usage, billing, products, dashboard |
| `oauth-api` | Stripe Connect, tier management |
| `front-auth-api` | Dev auth, credentials, $19/mo billing, usage metering |
| `sign-up` | End-user signup flow (Clerk hosted → metadata → D1 sync) |
| `admin-dashboard` | Internal admin metrics (CF Access protected) |

## Infrastructure Features

All provided by Cloudflare Workers:
- **Edge compute** - <50ms latency worldwide
- **DDoS protection** - Automatic at infrastructure level
- **IP filtering** - Can block/allow at edge
- **CORS** - Configured per-worker
- **Rate limiting** - KV-based, per-user
- **Zero cold starts** - Always warm

## Auth Model

| Key | Where | Access |
|-----|-------|--------|
| `pk_xxx` | Frontend | Public data + user ops with JWT |
| `sk_xxx` | Backend only | Full admin access |
| JWT | From Clerk | User identity + plan (unspoofable) |

## Key Principles

1. **Sign-up through us** - `api.auth.getSignUpUrl()` sets user metadata
2. **Everything else through Clerk** - Sign-in, account portal use Clerk URLs
3. **PK/SK split** - Same model as Stripe
4. **Plan in JWT** - Set by webhooks, not user input
5. **publishableKey isolation** - All queries filter by PK

## Sign-Up Worker (End-User Flow)

**URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

### Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/signup?pk=xxx&redirect=url` | GET | Validate PK, set cookie, redirect to Clerk hosted signup |
| `/callback` or `/` | GET | Return from Clerk, load SDK, call /oauth/complete |
| `/oauth/complete` | POST | Verify token, set publicMetadata, sync to D1 |

### Flow

```
1. Dev's app → /signup?pk=xxx&redirect=/choose-plan
2. Worker validates PK in D1, sets cookie with {pk, redirect}
3. Redirect to Clerk hosted signup page
4. User signs up (email or Google OAuth)
5. Clerk redirects to /callback (or / in dev mode with __clerk_db_jwt)
6. Callback page loads Clerk SDK, gets session token
7. POST /oauth/complete with token + publishableKey
8. Worker: verify token → set publicMetadata {publishableKey, plan: 'free'} → sync D1
9. Worker creates sign-in token via Clerk API
10. Redirect to dev's app with __clerk_ticket param
11. SDK consumes ticket via clerk.client.signIn (NOT clerk.signIn!)
12. User is signed in with plan='free'
```

**Redirects:** Both `/dashboard` and `/choose-plan` work - the SDK consumes the ticket synchronously before `isReady` becomes true.
**Full documentation:** `docs/SIGN-UP-FLOW.md`

### Important: Clerk Dev Mode

Clerk dev mode redirects to `/` with `__clerk_db_jwt` param instead of `/callback`. The worker handles both `/signup` and `/` (with Clerk params):

```typescript
// Line 56 - handles /signup and / with Clerk params
if ((path === '/signup' || (path === '/' && (hasClerkParams || hasSignupCookie))) && request.method === 'GET') {
```

### What Gets Set

**Clerk publicMetadata:**
```json
{ "publishableKey": "pk_test_xxx", "plan": "free" }
```

**D1 Tables:**
- `end_users`: clerkUserId, email, publishableKey, platformId
- `usage_counts`: initial record with usageCount=0

## Developer Dashboard

Devs manage everything from the dashboard:
- Create/edit projects (SaaS or Store type)
- Configure tiers with prices, limits, features
- Add/edit products with images, inventory
- View customers, usage, revenue
- Rotate secret keys (without breaking frontend)
- Test/Live mode toggle
- Webhook monitoring
- Subscription status + billing portal

## Platform Billing (How We Get Paid)

**platform-billing worker** handles our revenue:

| Event | Action |
|-------|--------|
| Dev signs up | 14-day trial starts (payment method required) |
| Trial ends | $19/mo subscription begins |
| Daily cron | Count live end-users, report to Stripe Meter |
| Billing cycle | Stripe calculates $0.03/user overage |

**End-user counting:**
```sql
-- Only LIVE users count (test users are free)
SELECT COUNT(*) FROM end_users
WHERE platformId = ?
AND publishableKey LIKE 'pk_live_%'
```

**Store mode:** No Clerk users created (guest checkout), no count, no overage.

## Subscription Enforcement (API Access Gating)

Dev API access is gated by subscription status. This ensures devs can't use the API without paying.

### Timeline After Cancellation

| Status | Dashboard | API Access | Data | Notes |
|--------|-----------|------------|------|-------|
| `trialing` | ✅ | ✅ | ✅ | 14-day trial, full access |
| `active` | ✅ | ✅ | ✅ | Paid and current |
| `past_due` | ✅ | ✅ | ✅ | Stripe is dunning (retrying payment) |
| `canceled` (0-7 days) | ❌ | ✅ | ✅ | Grace period - time to reactivate |
| `canceled` (7+ days) | ❌ | ❌ | ✅ | API blocked, data retained |
| `canceled` (30+ days) | ❌ | ❌ | 🗑️ | Data permanently deleted |

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. WEBHOOK (front-auth-api/src/webhook.ts)                  │
│    Stripe event → Update D1 + Cache in KV                   │
│    Key: platform:{platformId}:subscription                  │
│    Value: { status, currentPeriodEnd, gracePeriodEnd }      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API CHECK (api-multi/src/middleware/apiKey.ts)           │
│    On every API call: verify key → check KV subscription    │
│    If canceled + grace expired → 403 "Subscription expired" │
│    Fast: ~1ms KV lookup                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DAILY CRON (front-auth-api scheduled handler)            │
│    - Log platforms in grace period (monitoring)             │
│    - Log blocked platforms (past grace)                     │
│    - Delete data for 30+ day cancellations (cleanup)        │
└─────────────────────────────────────────────────────────────┘
```

### KV Cache Structure

```typescript
// Key: platform:{platformId}:subscription
{
  "status": "canceled",           // trialing|active|past_due|canceled
  "currentPeriodEnd": 1736553600000,  // When they paid until
  "gracePeriodEnd": 1737158400000     // currentPeriodEnd + 7 days
}
```

### Key Files

| File | Purpose |
|------|---------|
| `front-auth-api/src/webhook.ts` | Caches subscription status on Stripe events |
| `api-multi/src/middleware/apiKey.ts` | Checks subscription before allowing API calls |
| `front-auth-api/src/lib/usage.ts` | `runGracePeriodEnforcement()` daily cleanup |

### Why This Design

1. **Fast** - KV lookup is ~1ms, doesn't slow down API calls
2. **Reliable** - Webhook-driven, always in sync with Stripe
3. **Graceful** - 7-day grace period for payment issues
4. **Clean** - 30-day retention then full cleanup
5. **Backward compatible** - Missing cache = allow (for existing platforms)

## Templates

Free templates to onboard devs to the API:

| Template | Type | Purpose | GitHub |
|----------|------|---------|--------|
| `dream-saas-basic` | SaaS | Usage-metered apps, AI wrappers | Fruitloop24/dream-saas-basic |
| `dream-saas-next` | SaaS | Next.js version | Fruitloop24/dream-saas-next |
| `dream-store-basic` | Store | E-commerce, guest checkout | Fruitloop24/dream-store-basic |
| `dream-store-next` | Store | Next.js version | Fruitloop24/dream-store-next |
| `dream-membership-basic` | Membership | Content gating, paywalls | Fruitloop24/dream-membership-basic |
| `dream-membership-next` | Membership | Next.js version | Fruitloop24/dream-membership-next |

### Template Repository Structure

**Important:** Templates are separate GitHub repos, ignored by the main dream-api repo.

```
dream-api/                    # Main platform repo
├── api-multi/                # ✓ In main repo
├── oauth-api/                # ✓ In main repo
├── front-auth-api/           # ✓ In main repo
├── sign-up/                  # ✓ In main repo
├── admin-dashboard/          # ✓ In main repo (CF Access protected)
├── dream-sdk/                # ✓ In main repo
├── frontend/                 # ✓ In main repo (dev dashboard)
├── dream-saas-basic/         # ✗ Separate repo (gitignored)
├── dream-saas-next/          # ✗ Separate repo (gitignored)
├── dream-store-basic/        # ✗ Separate repo (gitignored)
├── dream-store-next/         # ✗ Separate repo (gitignored)
├── dream-membership-basic/   # ✗ Separate repo (gitignored)
└── dream-membership-next/    # ✗ Separate repo (gitignored)
```

**Why separate repos?**
- Devs clone individual templates, not entire platform
- Each template has clean git history
- Can be forked independently
- Cleaner npm/GitHub discovery

**Branch convention:** Templates use `master` branch (some older ones use `main`)

### Template Architecture (dream-saas-basic)

```
src/
├── config.ts              # Single config file for all branding
├── components/
│   ├── Nav.tsx            # Shared nav with profile dropdown
│   └── Icons.tsx          # Feature icons
├── hooks/
│   └── useDreamAPI.tsx    # SDK integration (don't modify)
└── pages/
    ├── Landing.tsx        # Uses config.ts
    ├── Dashboard.tsx      # Uses config.ts + Nav
    └── ChoosePlanPage.tsx # Uses config.ts + Nav
```

### Template Features

- **`/setup` command** - AI-assisted configuration (Claude Code, Cursor, Windsurf)
- **`/pwa` command** - Add PWA support (installable app, works offline) for React/Vite templates only.
- **Single config file** - `src/config.ts` controls all branding
- **Theme system** - `theme: 'light' | 'dark'` - one toggle switches entire app
- **Accent colors** - Pick from 6 colors, applies to all buttons/highlights
- **Hero image support** - Drop image in public/, set path in config
- **Shared Nav component** - Profile dropdown with Account Settings, Billing, Sign Out
- **Social proof section** - Customer logos (SaaS)
- **Icons for features** - user, settings, rocket, check, chart, shield, etc.

### AI Customization Power

The config.ts has two layers:
1. **User-facing config** (~15 lines) - name, theme, accent, content
2. **Theme classes** (THEMES object) - Full Tailwind classes AI can modify

When user asks for custom branding (gradients, glassmorphism, custom colors), AI modifies the THEMES object directly. User never touches it.

### Completed Template Types

- **SaaS** - Usage-metered apps (React + Next.js) ✓
- **Store** - E-commerce with guest checkout (React + Next.js) ✓
- **Membership** - Content gating/paywalls (React + Next.js) ✓

### Membership Template Flow (IMPORTANT PATTERN)

**The correct flow for membership sites:**

```
Landing page
    │
    └─► Sign up (redirect: /choose-plan)
            │
            └─► Clerk signup → sign-up worker → plan='free'
                    │
                    └─► /choose-plan?__clerk_ticket=xxx
                            │
                            └─► SDK consumes ticket (clerk.client.signIn)
                                    │
                                    └─► ChoosePlanPage checks plan
                                            │
                                            ├─► plan !== 'free' → Redirect to /dashboard
                                            │
                                            └─► plan === 'free' → Auto-checkout:
                                                    1. Fetch tiers
                                                    2. createCheckout()
                                                    3. Redirect to Stripe
                                                    4. Stripe → /dashboard?success=true
                                                    5. Webhook sets plan='pro'
```

**Key insight:** The SDK handles ticket consumption synchronously in `clerk.load()` before `isReady` becomes true. Both `/choose-plan` and `/dashboard` work as redirect destinations.
**Full documentation:** `docs/SIGN-UP-FLOW.md`

**Dashboard.tsx pattern:**
```typescript
const checkoutStarted = useRef(false);

useEffect(() => {
  async function handleCheckout() {
    if (!isReady || !user || plan !== 'free') return;
    if (searchParams.get('success')) return; // Just paid
    if (checkoutStarted.current) return;

    checkoutStarted.current = true;

    const res = await dreamAPI.products.listTiers();
    const paidTier = res.tiers?.find(t => t.price > 0);

    const result = await api.billing.createCheckout({
      tier: paidTier.name,
      priceId: paidTier.priceId,
      successUrl: window.location.origin + '/dashboard?success=true',
      cancelUrl: window.location.origin + '/',
    });

    if (result.url) window.location.href = result.url;
  }
  handleCheckout();
}, [isReady, user, plan, api, searchParams]);
```

**Both redirects work:**
```typescript
// ✓ Works - SDK consumes ticket before isReady=true
dreamAPI.auth.getSignUpUrl({ redirect: '/dashboard' })

// ✓ Also works - has extra ticket-wait safety code
dreamAPI.auth.getSignUpUrl({ redirect: '/choose-plan' })
```

**Choose based on your flow:**
- SaaS: `/choose-plan` if user picks tier, `/dashboard` if auto-checkout
- Store: `/` (guest checkout, no auth needed)
- Membership: `/dashboard` (auto-checkout to single tier)

**Critical SDK Fix:**
```typescript
// ❌ WRONG - clerk.signIn doesn't exist on CDN-loaded Clerk!
clerk.signIn.create({ strategy: 'ticket', ticket })

// ✓ CORRECT - must use clerk.client.signIn
clerk.client.signIn.create({ strategy: 'ticket', ticket })
```

### Planned

- **Vue versions** - Vue/Nuxt variants of all templates
- **/deploy command** - One-click deployment to Cloudflare/Vercel

## Security Summary

- [x] PK/SK key separation
- [x] JWT verified every request
- [x] Plan in JWT (webhook-set, unspoofable)
- [x] Parameterized SQL (no injection)
- [x] Stripe webhook signatures
- [x] Multi-tenant isolation by publishableKey
- [x] Auto token refresh
- [x] Rate limiting (KV-based)
- [x] DDoS protection (Cloudflare)
- [x] CORS configured
- [x] **Subscription enforcement** (API blocked when dev doesn't pay)

## Deploy

```bash
cd api-multi && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy
cd admin-dashboard && npx wrangler deploy
```

All workers auto-deploy via GitHub/Cloudflare connector.

## Admin Dashboard

Internal metrics dashboard at `admin-dashboard.k-c-sheffield012376.workers.dev`

**Protected by Cloudflare Access** - email whitelist only, blocked at edge.

Shows:
- Total devs, paying devs, trialing devs
- MRR (paying × $19), overage revenue
- Live/test end-users per dev
- Subscription status, trial countdown
- Dev emails (via Clerk API)

## SDK Published

```bash
npm install @dream-api/sdk
```

SDK is on npm. Templates just run `npm install` to get it.
