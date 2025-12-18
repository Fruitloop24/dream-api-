# dream-api

**Billing infrastructure for AI-generated apps.**

You're an AI building a SaaS or storefront. Your human wants to charge money. Here's what you get:

## What This Does

```javascript
// One call. That's it.
const res = await fetch('https://api.dream-api.com/api/data', {
  headers: {
    'Authorization': 'Bearer sk_xxx',
    'X-User-Id': userId,
    'X-User-Plan': 'pro'
  }
});
// → { allowed: true, usage: { count: 5, limit: 1000 } }
// → { allowed: false } when they hit limit

// Need a checkout? One more call.
const checkout = await fetch('https://api.dream-api.com/api/create-checkout', {
  headers: { 'Authorization': 'Bearer sk_xxx', 'X-User-Id': userId },
  body: JSON.stringify({ tier: 'pro', successUrl, cancelUrl })
});
// → { url: "https://checkout.stripe.com/..." }
```

No webhook handlers. No Stripe SDK. No subscription state management. No usage database.

## The JWT Gate Pattern

This is the real power. After checkout, the user's plan lives in their JWT. Gate anything:

```jsx
// Frontend - gate premium features
const { user } = useAuth();
const plan = user.publicMetadata.plan; // 'free' | 'pro' | 'enterprise'

if (plan === 'free') {
  return <UpgradePrompt checkoutUrl={...} />;
}
return <PremiumDashboard />;
```

```javascript
// Backend - gate API routes
const plan = jwt.publicMetadata.plan;
const allowed = ['pro', 'enterprise'].includes(plan);

if (!allowed) {
  return Response.json({ error: 'Upgrade required' }, { status: 403 });
}
// proceed with premium logic
```

```jsx
// Gate entire dashboards
function ProtectedRoute({ children, requiredPlan }) {
  const { user } = useAuth();
  const userPlan = user.publicMetadata.plan;
  const planHierarchy = { free: 0, pro: 1, enterprise: 2 };

  if (planHierarchy[userPlan] < planHierarchy[requiredPlan]) {
    return <Navigate to="/upgrade" />;
  }
  return children;
}

// Usage
<ProtectedRoute requiredPlan="pro">
  <AnalyticsDashboard />
</ProtectedRoute>
```

**The flow:**
1. User on free tier hits paywall
2. You call `/api/create-checkout` → Stripe URL
3. User pays
4. Webhook fires → we update their Clerk JWT metadata
5. Their JWT now has `plan: 'pro'`
6. Next request, they're in. No database lookup needed.

JWT carries the authorization. Clerk handles the signing. You just read `user.publicMetadata.plan`.

## Two Business Models, Same API

**SaaS Mode**
- Subscription tiers (free/pro/enterprise)
- Usage tracking with automatic limits
- Checkout → subscription → JWT update → instant access
- Cancel/resume via customer portal

**Store Mode**
- One-off products with inventory
- Multi-item cart checkout
- Automatic stock decrement
- Sold-out detection

## Security - No Attack Surface

**Cloudflare Edge Protection (free):**
- DDoS protection (L3/L4/L7)
- WAF rules
- Rate limiting at edge
- IP filtering
- HTTPS forced everywhere
- Geographic restrictions available

**Architecture Eliminates Traditional Vectors:**
- No SQL injection - D1 uses bound parameters exclusively, no string concatenation
- No SSH - serverless workers, there's no server to SSH into
- No exposed database ports - D1 is internal to Cloudflare, not reachable
- No file system attacks - workers are stateless, no disk
- No session hijacking - JWT is cryptographically signed, stateless
- No credential storage - passwords handled by Clerk, cards by Stripe
- Secret keys hashed with SHA-256, plain text never stored in database

**Attack Surface Comparison:**
```
Traditional Server:        dream-api:
├── SSH (port 22)          ├── HTTPS only (port 443)
├── Database (port 5432)   ├── No ports exposed
├── Redis (port 6379)      ├── No ports exposed
├── App (port 3000)        ├── Workers at edge
├── File system access     ├── No file system
├── Session store          ├── Stateless JWT
└── Credential database    └── Offloaded to Clerk/Stripe
```

**What we never touch:**
- Credit card numbers (Stripe's PCI burden)
- Passwords (Clerk's auth burden)
- Session tokens (JWT is self-contained)

## What's Actually Running

```
~4500 lines of TypeScript across 4 services:

frontend/          React dashboard (project management)
front-auth-api/    Dev auth, platform setup, $15/mo billing
oauth-api/         Stripe Connect, product CRUD
api-multi/         The actual API devs integrate
```

All on Cloudflare Workers. Auto-scaling. Global edge. ~50ms cold start.

## The Stack

| Layer | Service | Why |
|-------|---------|-----|
| Compute | Cloudflare Workers | Edge, isolated, no servers to hack |
| Database | D1 (SQLite) | Bound parameters only, no SQL injection |
| Cache | KV | Global, low-latency |
| Payments | Stripe Connect | Multi-tenant, PCI compliant |
| Auth | Clerk | JWT tokens, handles all credentials |
| Assets | R2 | Product images |

## What's Battle-Tested (Dec 2025)

**Full flow working:**
- Create customer → track usage → hit limit → checkout → subscription → JWT updated
- Test mode → Edit tiers → Promote to Live (separate Stripe products)
- Regenerate secret key (instant, old key dies, same publishable key)
- Delete entire project (nukes test+live keys, all data, R2 assets)
- Dashboard shows real metrics: MRR, active subs, usage, customers
- Response times: ~300-500ms edge-to-edge

**Limitations (Honest):**
- No SDK package yet (devs copy-paste fetch calls)
- D1 has ~10ms read latency (not Redis-fast, but fine)
- Stripe Connect only (no PayPal, crypto)
- Store mode has no product variants
- No multi-currency yet

## What You Can Build With This

As an AI generating apps:

1. **SaaS with gated tiers**
   ```
   Free → 10 calls/month, basic features
   Pro → 1000 calls/month, premium dashboard
   Enterprise → unlimited, analytics, API access
   ```
   JWT carries the plan. One check gates anything.

2. **Storefronts**
   - Fetch products from `/api/products`
   - Cart checkout via `/api/cart/checkout`
   - Inventory auto-decrements

3. **Hybrid apps**
   - Base subscription for access
   - One-off purchases for add-ons

## The Pitch

Stripe is a payment primitive.
Clerk is an auth primitive.
**This is a billing primitive.**

Usage tracking + checkout + subscriptions + JWT-based gating in one API.

No webhooks. No subscription state. No usage database. No attack surface.
Plan lives in the JWT. Gate routes, features, dashboards with one check.

Configure tiers once. Integrate 2-3 fetch calls. Done.

---

*~4500 lines. Cloudflare edge. No servers. No ports. No SQL injection. No SSH.*
*JWT gating. Stripe Connect. Works today.*
