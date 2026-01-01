# Dream API - The Complete Backend for Your App

**Auth. Billing. Usage Tracking. One SDK. Done.**

Stop building the same infrastructure every project. Dream API gives you production-ready backend services with a single npm install.

---

## Why Dream API?

### Ship Faster
- **One integration** replaces Auth0 + Stripe + custom usage tracking
- **Ready-to-use templates** - SaaS and E-commerce, fully functional
- **SDK handles everything** - auth flows, token refresh, API calls

### Enterprise-Grade Security

**Same Security Model as Stripe**
- Publishable keys (pk_xxx) safe for frontend - can only read public data
- Secret keys (sk_xxx) for backend only - full admin access
- Never expose secrets in browser bundles

**JWT-Based User Identity**
- Clerk-signed JWTs verified on every request
- User ID extracted from cryptographically signed tokens
- No header spoofing possible - identity comes from verified JWT

**Plan Protection**
- Subscription plan stored in JWT metadata
- Set by Stripe webhooks, not user input
- Users cannot upgrade themselves without paying

**Multi-Tenant Isolation**
- Every request filtered by publishableKey
- Test/Live mode separation built-in
- No cross-tenant data access possible

**SQL Injection Protected**
- All D1 queries use parameterized `.bind()` calls
- No string concatenation in SQL queries

**Webhook Security**
- Stripe webhook signatures verified
- Event idempotency prevents replay attacks

**Token Auto-Refresh**
- SDK automatically refreshes JWTs before expiry
- 5-minute clock skew tolerance
- No expired token errors for your users

---

## Industry Best Practices

### Authentication
- **Clerk** - Enterprise-grade auth used by Vercel, Notion, and thousands more
- Supports email, Google, GitHub, and 20+ OAuth providers
- Passwordless, MFA, and SSO ready

### Payments
- **Stripe Connect** - Powers Shopify, Lyft, DoorDash
- PCI-DSS compliant out of the box
- Subscription billing + one-time payments
- Customer portal for self-service billing

### Infrastructure
- **Cloudflare Workers** - Edge computing, <50ms latency worldwide
- **D1** - SQLite at the edge, automatic replication
- **KV** - Sub-millisecond caching, rate limiting
- **R2** - Zero-egress object storage for assets

---

## What You Get

### For SaaS Apps
```typescript
// Frontend - just the publishable key
const api = new DreamAPI({ publishableKey: 'pk_xxx' });

// User signs up (Clerk handles auth)
await api.auth.init();

// Track usage
await api.usage.track();
const { usageCount, limit, remaining } = await api.usage.check();

// Upgrade to paid tier
await api.billing.createCheckout({ tier: 'pro' });
```

### For E-Commerce
```typescript
// List products (public, PK only)
const { products } = await api.products.list();

// Guest checkout (no account needed)
const { url } = await api.products.cartCheckout({
  items: [{ priceId: 'price_xxx', quantity: 2 }],
  customerEmail: 'buyer@email.com',
  successUrl: '/thank-you',
  cancelUrl: '/cart',
});
```

### Developer Dashboard
- Real-time usage metrics
- Customer management
- Revenue tracking
- Product/tier configuration

---

## Technical Reliability

### Rate Limiting
- Per-user rate limiting built-in
- KV-based for sub-millisecond checks
- Configurable limits per tier

### Atomic Operations
- D1 atomic increments for usage tracking
- No race conditions on concurrent requests

### Webhook Idempotency
- Events table prevents duplicate processing
- Safe to receive the same webhook twice

### Error Handling
- Consistent error format across all endpoints
- Actionable error messages
- Proper HTTP status codes

---

## The Numbers

| Metric | Value |
|--------|-------|
| API Latency | <50ms (edge) |
| Uptime Target | 99.9% |
| Auth Providers | 20+ |
| Payment Methods | 135+ countries |

---

## What Devs Are Building

- **SaaS platforms** with usage-based billing
- **AI tools** with token/request metering
- **E-commerce stores** with Stripe checkout
- **Membership sites** with tiered access
- **Developer tools** with API key management

---

## Get Started

```bash
npm install @dream-api/sdk
```

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});

// That's it. Start building.
```

---

## Security Checklist

- [x] PK/SK key separation (Stripe model)
- [x] JWT verification on all user operations
- [x] Server-side plan validation (no spoofing)
- [x] Parameterized SQL queries (no injection)
- [x] Stripe webhook signature verification
- [x] Multi-tenant data isolation
- [x] Automatic token refresh
- [x] Rate limiting per user
- [x] HTTPS everywhere
- [x] No secrets in frontend bundles

---

## Built With

- **Clerk** - Authentication
- **Stripe Connect** - Payments
- **Cloudflare Workers** - Edge compute
- **Cloudflare D1** - Database
- **Cloudflare KV** - Caching
- **Cloudflare R2** - Asset storage
- **TypeScript** - End-to-end type safety

---

**Dream API** - Focus on your product. We handle the infrastructure.
