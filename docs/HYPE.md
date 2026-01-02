# Dream API - Ship Your SaaS in Minutes, Not Months

**Clone. /setup. Ship.**

The AI-native backend for the vibe coder generation. Auth, billing, usage tracking - done before your coffee gets cold.

---

## The New Way to Build

```bash
# 1. Clone template
git clone dream-saas-basic

# 2. Open in Claude Code / Cursor / Windsurf

# 3. Run setup
/setup

# 4. Deploy
npm run build && npx wrangler pages deploy dist
```

**That's it.** Auth works. Billing works. Usage tracking works. PWA-ready. Go build your thing.

---

## Why Dream API?

### AI-First Development

Built for the way you actually work:
- **`/setup` command** - AI asks what you're building, configures everything
- **Works with Claude Code, Cursor, Windsurf** - your AI assistant knows the SDK
- **One config file** - `src/config.ts` has all branding, AI updates it for you
- **No docs rabbit holes** - AI has context, just ask

### Zero Infrastructure

You don't deploy workers. You don't manage databases. You don't configure auth.

| You Do | We Handle |
|--------|-----------|
| Clone template | Auth (Clerk) |
| Run /setup | Billing (Stripe) |
| Build your feature | Usage tracking |
| Deploy static files | Multi-tenancy |
| | Webhooks |
| | JWT verification |
| | Rate limiting |

### Stupid Fast

- **Vite** - Sub-second hot reload
- **Cloudflare Edge** - <50ms API latency worldwide
- **Static hosting** - Free/cheap deploys (Cloudflare Pages, Vercel, Netlify)
- **No server costs** - It's just HTML/JS/CSS + our API

### PWA-Ready

Your SaaS is an installable app:
- Works on iOS, Android, Desktop
- No App Store approval
- No Play Store fees
- Just share a link or QR code
- AI adds PWA support with `/pwa` command

---

## Security That Actually Works

**Same model as Stripe** - battle-tested, understood by every dev:

| Layer | Protection |
|-------|------------|
| Keys | PK (public) / SK (secret) separation |
| Identity | JWT verified on EVERY request |
| Plans | Stored in JWT, set by webhooks only |
| Data | Multi-tenant isolation by publishableKey |
| SQL | Parameterized queries, no injection |
| Webhooks | Stripe signatures verified |
| Tokens | Auto-refresh, no expiry errors |

**Users can't spoof their plan.** The JWT is signed by Clerk, verified server-side. They'd have to compromise Clerk itself.

---

## What You Get

### Free Templates

| Template | Use Case |
|----------|----------|
| `dream-saas-basic` | AI wrappers, usage-metered SaaS |
| `dream-store-basic` | E-commerce, guest checkout |
| More coming | Gated content, courses, membership |

### SDK That Just Works

```typescript
// Frontend - safe to expose
const api = new DreamAPI({ publishableKey: 'pk_xxx' });

// Auth
await api.auth.init();
const user = api.auth.getUser(); // { email, plan, ... }

// Usage
await api.usage.track();  // Increment counter
await api.usage.check();  // Get remaining

// Billing
await api.billing.createCheckout({ tier: 'pro' });
await api.billing.openPortal({ returnUrl: '/dashboard' });
```

### Developer Dashboard

- Real-time metrics (MRR, usage, customers)
- Tier/product management
- Customer list with plan status
- Webhook monitoring
- Test/Live mode toggle
- One-click Stripe Connect

---

## The Stack

All best-in-class, all handled for you:

| Component | Technology | Why |
|-----------|------------|-----|
| Auth | Clerk | Enterprise-grade, 20+ OAuth providers |
| Payments | Stripe Connect | PCI compliant, 135+ countries |
| API | Cloudflare Workers | Edge compute, global |
| Database | Cloudflare D1 | SQLite at edge, auto-replicated |
| Cache | Cloudflare KV | Sub-ms reads, rate limiting |
| Storage | Cloudflare R2 | Zero egress fees |
| Frontend | React + Vite | Fast builds, cheap hosting |

---

## Who This Is For

**Vibe coders** - You prompt, AI builds, you ship

**Indie hackers** - Launch fast, validate fast, pivot fast

**AI wrapper builders** - Usage tracking built-in for token metering

**Course creators** - Gated content with subscription billing

**Side project warriors** - Free hosting, pay nothing until you make money

---

## What Makes This Different

| Feature | Typical SaaS Kit | Dream API |
|---------|------------------|-----------|
| Setup | Read docs, configure 12 files | `/setup` |
| Auth | DIY or complex integration | Works out of box |
| Billing | Wire up Stripe yourself | Works out of box |
| Usage tracking | Build it yourself | `api.usage.track()` |
| Multi-tenant | Figure it out | Built-in |
| AI-assisted | None | Full context in CLAUDE.md |
| Hosting cost | $20+/mo (servers) | $0 (static) |
| PWA | Not included | One command |

---

## The Numbers

| Metric | Value |
|--------|-------|
| API Latency | <50ms (edge) |
| Setup Time | ~2 minutes |
| Lines of config | 1 file |
| Hosting cost | $0 (static sites) |
| Auth providers | 20+ |
| Payment countries | 135+ |

---

## Get Started

**Option 1: Template (Recommended)**
```bash
git clone https://github.com/dream-api/dream-saas-basic
cd dream-saas-basic
# Open in Claude Code / Cursor / Windsurf
# Run /setup
```

**Option 2: SDK Only**
```bash
npm install @dream-api/sdk
```

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: 'pk_xxx',
});
```

---

## Security Checklist

- [x] PK/SK key separation (Stripe model)
- [x] JWT verification on every request
- [x] Server-side plan validation (unspoofable)
- [x] Parameterized SQL (no injection)
- [x] Stripe webhook signatures
- [x] Multi-tenant data isolation
- [x] Automatic token refresh
- [x] Rate limiting per user
- [x] HTTPS everywhere
- [x] No secrets in frontend

---

## Built For The AI Era

The old way: Read docs → Configure → Debug → Read more docs → Finally works

The new way: Clone → /setup → Ship

Your AI assistant has full context. The SDK is published. The templates are ready. Stop building infrastructure. Start building your product.

---

**Dream API** - Clone. /setup. Ship.
