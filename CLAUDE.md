# dream-api

API-as-a-Service Platform. Developers get API keys, we handle auth/billing/usage.

**Business Model:** API is the product. Templates are free onboarding tools.

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| Trial | Free | 14 days, full access, no CC |
| Pro | $19/mo | SaaS: 2,000 end-users / Store: unlimited guest checkout |
| Overage | $0.03/user | SaaS only, after 2,000 users |

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
Frontend (React) → front-auth-api (Dev Auth) → oauth-api (Stripe Connect)
                            ↓
                    D1 + KV + R2
                            ↓
                    api-multi ← Dev's App (via SDK)
                            ↓
                    sign-up ← End-user signup
```

## Workers

| Worker | Purpose |
|--------|---------|
| `api-multi` | Main API - usage, billing, products, dashboard |
| `oauth-api` | Stripe Connect, tier management |
| `front-auth-api` | Dev auth, credentials |
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

## Templates

Free templates to onboard devs to the API:

| Template | Type | Purpose |
|----------|------|---------|
| `dream-saas-basic` | SaaS | Usage-metered apps, AI wrappers |
| `dream-store-basic` | Store | E-commerce, guest checkout |

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
- **Single config file** - `src/config.ts` controls all branding
- **Shared Nav component** - Profile dropdown with Account Settings, Billing, Sign Out
- **Accent color system** - Pick a color, applies everywhere
- **Hero image support** - Optional product screenshot
- **Social proof section** - Customer logos
- **Icons for features** - user, settings, rocket, check, chart, shield, etc.

### Planned Template Features

- **`/pwa` command** - Add PWA support (installable app, works offline)
- **More templates** - Gated content, courses, membership
- **Framework variants** - Next.js, Vue versions

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

## SDK Published

```bash
npm install @dream-api/sdk
```

SDK is on npm. Templates just run `npm install` to get it.
