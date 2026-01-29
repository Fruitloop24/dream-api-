# Security Features

Comprehensive security measures implemented across the dream-api platform.

**Last Audit:** January 2025

---

## Security Model Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: Edge Protection (Cloudflare)                                      │
│  └─► DDoS mitigation, TLS termination, IP filtering                        │
│                                                                             │
│  Layer 2: Authentication (Clerk)                                            │
│  └─► JWT verification, session management, OAuth flows                     │
│                                                                             │
│  Layer 3: Authorization (Platform + Key Validation)                         │
│  └─► PK/SK separation, platformId scoping, subscription gating             │
│                                                                             │
│  Layer 4: Data Isolation (Multi-tenant)                                     │
│  └─► All queries filtered by platformId AND publishableKey                 │
│                                                                             │
│  Layer 5: Payment Security (Stripe)                                         │
│  └─► Webhook signatures, Connect isolation, PCI compliance (Stripe)        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Security

### JWT Verification (All Protected Endpoints)

Every authenticated endpoint verifies Clerk JWTs server-side:

```typescript
// oauth-api, front-auth-api, api-multi
const { toAuth } = await client.authenticateRequest(request, {
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});
const auth = toAuth();
if (!auth?.userId) throw new Error('Unauthorized');
```

**Fixed Issue (Dec 2024):** OAuth `/authorize` previously trusted `userId` query param without auth. Now requires Clerk JWT and extracts userId from verified token.

### Plan Stored in JWT (Unspoofable)

User plans are stored in Clerk `publicMetadata`, which:
- Can only be set server-side (via Clerk Backend API)
- Is embedded in JWT claims
- Cannot be modified by end-users
- Is verified on every API call

```typescript
// Set by webhook only, never by user input
await clerk.users.updateUser(userId, {
  publicMetadata: { publishableKey: pk, plan: 'pro' }
});
```

---

## API Key Security

### PK/SK Separation (Same Model as Stripe)

| Key Type | Prefix | Exposure | Capabilities |
|----------|--------|----------|--------------|
| Publishable Key | `pk_test_` / `pk_live_` | Public (frontend OK) | Read products, init auth, track usage |
| Secret Key | `sk_test_` / `sk_live_` | Private (backend only) | Full admin access, create customers, dashboard |

**Secret keys are:**
- SHA-256 hashed before storage (never stored in plain text)
- Shown only ONCE at creation time
- Can be regenerated (invalidates old key)

### Key Isolation

```sql
-- Every query is scoped by platformId AND publishableKey
SELECT * FROM tiers WHERE platformId = ? AND publishableKey = ?
SELECT * FROM end_users WHERE platformId = ? AND publishableKey = ?
```

Even if a publishableKey is guessed, queries require matching platformId (derived from secret key).

---

## Multi-Tenant Data Isolation

### Platform Scoping

All data is isolated by `platformId`:

| Table | Scoping |
|-------|---------|
| `api_keys` | `WHERE platformId = ?` |
| `tiers` | `WHERE platformId = ? AND publishableKey = ?` |
| `end_users` | `WHERE platformId = ? AND publishableKey = ?` |
| `subscriptions` | `WHERE platformId = ? AND publishableKey = ?` |
| `usage_counts` | `WHERE platformId = ? AND publishableKey = ?` |

### SQL Injection Prevention

All D1 queries use parameterized statements:

```typescript
// CORRECT - parameterized
await env.DB.prepare('SELECT * FROM tiers WHERE platformId = ?').bind(platformId).all();

// NEVER - string concatenation
await env.DB.prepare(`SELECT * FROM tiers WHERE platformId = '${platformId}'`).all();
```

---

## Stripe Payment Security

### Webhook Signature Verification

All Stripe webhooks verify signatures before processing:

```typescript
const signature = request.headers.get('Stripe-Signature');
const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
```

### Stripe Connect Isolation

- Funds go directly to developer's Stripe account
- We never hold customer funds
- Each developer has separate Stripe Connect account
- Platform keys + `Stripe-Account` header for API calls

### Idempotency

Webhook events are tracked to prevent duplicate processing:

```sql
-- Check if event already processed
SELECT 1 FROM events WHERE eventId = ?
-- If not, insert and process
INSERT INTO events (eventId, type, ...) VALUES (?, ?, ...)
```

---

## OAuth Security

### State Parameter (CSRF Protection)

OAuth flows use cryptographic state parameter:

```typescript
const state = crypto.randomUUID();
await env.KV.put(`oauth:state:${state}`, JSON.stringify({ userId, platformId, mode }), { expirationTtl: 600 });
// State verified on callback
```

### Token Storage

- OAuth tokens stored in D1 (source of truth)
- KV used for fast lookups (cache)
- Tokens scoped by `(platformId, mode)` - test and live tokens are separate

---

## Rate Limiting

### Per-User Rate Limits

```typescript
const RATE_LIMIT_PER_MINUTE = 100;
const key = `ratelimit:${userId}:${minute}`;
const count = await env.USAGE_KV.get(key);
if (count >= RATE_LIMIT_PER_MINUTE) return { allowed: false };
```

### Graceful Degradation

If KV binding unavailable, rate limiting is skipped (not crashed):

```typescript
if (!env.USAGE_KV) {
  console.warn('Rate limiting disabled - USAGE_KV not bound');
  return { allowed: true };
}
```

---

## Infrastructure Security

### Cloudflare Edge Protection

- **DDoS Mitigation:** Automatic at infrastructure level
- **TLS:** All traffic encrypted (HTTPS only)
- **IP Filtering:** Can block/allow at edge
- **Bot Protection:** Cloudflare's bot management

### Admin Dashboard Protection

Internal admin dashboard protected by Cloudflare Access:
- Email whitelist only
- Blocked at edge before reaching worker
- No public access possible

---

## XSS Prevention

### Redirect URL Escaping

Sign-up redirects properly escape user-provided URLs:

```typescript
// BEFORE (vulnerable)
const script = `redirect = "${redirectUrl}"`;

// AFTER (fixed)
const script = `redirect = ${JSON.stringify(redirectUrl)}`;
```

### Content Security

- No inline scripts in templates
- SDK loaded from CDN with integrity checks
- User content sanitized before display

---

## Subscription Enforcement

### API Access Gating

Developers without active subscriptions are blocked:

| Status | API Access |
|--------|------------|
| `trialing` | Full access |
| `active` | Full access |
| `past_due` | Full access (Stripe dunning) |
| `canceled` (0-7 days) | Full access (grace period) |
| `canceled` (7+ days) | **BLOCKED** |

### KV-Cached Subscription Status

```typescript
// Fast check on every API call (~1ms)
const subData = await env.KV.get(`platform:${platformId}:subscription`);
if (subData.status === 'canceled' && Date.now() > subData.gracePeriodEnd) {
  return new Response('Subscription expired', { status: 403 });
}
```

---

## Test/Live Mode Separation

### Environment Isolation

| Mode | Clerk Instance | Stripe Products | Data |
|------|----------------|-----------------|------|
| Test | Development | Test mode | Separate |
| Live | Production | Live mode | Separate |

### Localhost Restriction (Clerk Security Feature)

```
pk_test_xxx + localhost    → Works
pk_live_xxx + localhost    → BLOCKED by Clerk
pk_live_xxx + deployed URL → Works
```

This prevents accidental production usage during development.

---

## Security Checklist

- [x] JWT verification on all authenticated endpoints
- [x] Plan stored in JWT (webhook-set only)
- [x] PK/SK key separation
- [x] Secret keys hashed (SHA-256)
- [x] Parameterized SQL queries
- [x] Multi-tenant isolation by platformId
- [x] Stripe webhook signature verification
- [x] Webhook idempotency
- [x] OAuth state parameter (CSRF protection)
- [x] Rate limiting (per-user)
- [x] DDoS protection (Cloudflare)
- [x] TLS encryption (HTTPS only)
- [x] Admin dashboard protected (CF Access)
- [x] XSS prevention (redirect escaping)
- [x] Subscription enforcement (API gating)
- [x] Test/Live mode separation

---

## Reporting Security Issues

If you discover a security vulnerability, please email security@panacea-tech.net.

Do not open public GitHub issues for security vulnerabilities.
