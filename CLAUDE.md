# dream-api

API-as-a-Service Platform. Developers get API keys, we handle auth/billing/usage.

**Business Model:** API is the product. Templates are free onboarding tools.

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
| `sign-up` | End-user signup with metadata |
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
- **`/pwa` command** - Add PWA support (installable app, works offline)
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
