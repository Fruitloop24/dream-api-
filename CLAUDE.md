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
├── dream-sdk/                # ✓ In main repo
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

## Deploy

```bash
cd api-multi && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy
```

All workers auto-deploy via GitHub/Cloudflare connector.

## SDK Published

```bash
npm install @dream-api/sdk
```

SDK is on npm. Templates just run `npm install` to get it.
