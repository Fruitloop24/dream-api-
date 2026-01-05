# Dream API - API Reference

Complete reference for endpoints and data structures.

---

## Base URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Main API | `https://api-multi.k-c-sheffield012376.workers.dev` | End-user operations |
| Sign-Up Worker | `https://sign-up.k-c-sheffield012376.workers.dev` | End-user signup |
| OAuth/Products | `https://oauth-api.k-c-sheffield012376.workers.dev` | Stripe Connect, tier/product CRUD |
| Dev Auth + Billing | `https://front-auth-api.k-c-sheffield012376.workers.dev` | Developer auth, credentials, $19/mo billing |

---

## Authentication

### Headers

| Header | Value | When |
|--------|-------|------|
| `Authorization` | `Bearer sk_xxx` | Backend requests (full access) |
| `X-Publishable-Key` | `pk_xxx` | Frontend requests |
| `X-Clerk-Token` | JWT | User-specific operations |

### Access Levels

| Endpoint Type | PK Only | PK + JWT | SK |
|--------------|---------|----------|-----|
| List tiers/products | Yes | Yes | Yes |
| Usage tracking | No | Yes | Yes |
| Billing operations | No | Yes | Yes |
| Customer management | No | No | Yes |
| Dashboard | No | No | Yes |

---

## Endpoints

### Products & Tiers

**GET /api/tiers** - List subscription tiers
```
Auth: PK
Response: { tiers: Tier[] }
```

**GET /api/products** - List store products
```
Auth: PK
Response: { products: Product[] }
```

### Usage

**POST /api/data** - Track usage (increment counter)
```
Auth: PK + JWT
Response: { success: boolean, usage: Usage }
```

**GET /api/usage** - Check current usage
```
Auth: PK + JWT
Response: { usage: Usage }
```

### Billing

**POST /api/create-checkout** - Create Stripe checkout session
```
Auth: PK + JWT
Body: { tier: string, priceId?: string, successUrl?: string, cancelUrl?: string }
Response: { url: string }
```

**POST /api/customer-portal** - Open Stripe billing portal
```
Auth: PK + JWT
Body: { returnUrl?: string }
Response: { url: string }
```

**POST /api/cart/checkout** - Guest cart checkout (store)
```
Auth: PK
Body: { items: CartItem[], email?: string, successUrl?: string, cancelUrl?: string }
Response: { url: string }
```

### Customers (SK Only)

**POST /api/customers** - Create customer
```
Auth: SK
Body: { email: string, firstName?: string, lastName?: string, plan?: string, password?: string }
Response: { customer: Customer }
```

**GET /api/customers/:id** - Get customer
```
Auth: SK
Response: { customer: Customer }
```

**PATCH /api/customers/:id** - Update customer
```
Auth: SK
Body: { plan: string }
Response: { customer: Customer }
```

**DELETE /api/customers/:id** - Delete customer
```
Auth: SK
Response: { success: boolean, deleted: { id, email } }
```

### Dashboard (SK Only)

**GET /api/dashboard** - Platform metrics
```
Auth: SK
Response: DashboardMetrics (see types below)
```

**GET /api/dashboard/totals** - Aggregate totals
```
Auth: SK
Response: { totalRevenue, totalCustomers, totalMRR }
```

### Webhooks (api-multi)

**POST /webhook/stripe** - Stripe webhook handler (end-user payments)
```
Auth: Stripe signature
Events: checkout.session.completed, customer.subscription.*, invoice.paid
```

---

## Platform Billing (front-auth-api)

These endpoints handle billing for developers (our customers), not their end-users.
All on `front-auth-api` worker.

### Endpoints

**POST /create-checkout** - Create developer subscription checkout
```
Auth: Clerk JWT (dream-api app)
Body: { successUrl?: string, cancelUrl?: string }
Response: { url: string }

Creates Stripe checkout for $19/mo Pro plan with 14-day trial.
Payment method required upfront.
```

**POST /create-portal** - Open developer billing portal
```
Auth: Clerk JWT (dream-api app)
Body: { returnUrl?: string }
Response: { url: string }

Manage subscription, update payment method, view invoices.
```

**GET /subscription** - Get developer subscription status
```
Auth: Clerk JWT (dream-api app)
Response: {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'none',
  trialEndsAt?: number,
  currentPeriodEnd?: number,
  liveEndUserCount: number,
  includedUsers: 2000,
  overageRate: 0.03
}
```

**POST /webhook/stripe** - Platform billing webhook
```
Auth: Stripe signature (different from api-multi webhook)
Events:
  - checkout.session.completed: Store subscription info
  - customer.subscription.updated: Sync status
  - customer.subscription.deleted: Mark canceled
  - invoice.payment_succeeded: Confirm payment
  - invoice.payment_failed: Handle failure
```

### Cron Jobs

**Daily usage reporting** (0 0 * * *)
```
For each platform with active subscription:
1. Count live end-users: SELECT COUNT(*) FROM end_users WHERE publishableKey LIKE 'pk_live_%'
2. Report to Stripe Billing Meter
3. Stripe calculates overage automatically
```

### Stripe Resources

| Resource | Purpose |
|----------|---------|
| Product: Dream API Pro | Base subscription product |
| Price: $19/mo | Monthly subscription price |
| Price: $0.03/unit metered | End-user overage price |
| Billing Meter: end_user_count | Tracks live end-users per platform |

---

## Data Types

### Tier
```typescript
{
  name: string;           // Internal ID: "free", "pro"
  displayName: string;    // UI display: "Free Plan"
  price: number;          // Monthly cost in DOLLARS
  limit: number;          // Requests/month (-1 = unlimited)
  priceId: string;        // Stripe price ID
  productId: string;      // Stripe product ID
  features?: string[];    // Feature list (ARRAY)
  popular?: boolean;      // Highlight badge
}
```

### Product
```typescript
{
  name: string;
  displayName?: string;
  description?: string;
  price: number;          // In DOLLARS (not cents)
  priceId: string;
  productId: string;
  imageUrl?: string;      // NOT "image"
  inventory?: number;     // null = unlimited
  soldOut?: boolean;      // Computed from inventory
  features?: string[];
}
```

### Usage
```typescript
{
  userId: string;
  plan: string;
  usageCount: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  periodStart: string;    // YYYY-MM-DD
  periodEnd: string;
}
```

### Customer
```typescript
{
  id: string;             // Clerk user ID
  email: string;
  firstName?: string;
  lastName?: string;
  plan: string;
  publishableKey: string;
  createdAt: number;      // Unix timestamp
}
```

### DashboardMetrics (SaaS)
```typescript
{
  activeSubscriptions: number;
  cancelingSubscriptions: number;
  mrr: number;
  usageThisPeriod: number;
  customers: DashboardCustomer[];
  tiers: Tier[];
  webhookStatus: WebhookStatus;
}
```

### DashboardMetrics (Store)
```typescript
{
  totalRevenue: number;
  totalSales: number;
  avgOrderValue: number;
  products: Product[];
  orders: Order[];
  webhookStatus: WebhookStatus;
}
```

### Platform (Developer Account)
```typescript
{
  platformId: string;           // plt_xxx
  clerkUserId: string;          // Clerk user ID
  stripeAccountId?: string;     // Stripe Connect ID (their account)
  stripeCustomerId?: string;    // Stripe customer ID (our billing)
  stripeSubscriptionId?: string;
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';
  trialEndsAt?: number;         // Unix timestamp
  currentPeriodEnd?: number;    // Unix timestamp
  liveEndUserCount?: number;    // Count of pk_live_% users
  createdAt: string;
}
```

### PlatformSubscription (Billing Status)
```typescript
{
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';
  trialEndsAt?: number;
  currentPeriodEnd?: number;
  liveEndUserCount: number;
  includedUsers: 2000;          // Always 2000
  overageRate: 0.03;            // Always $0.03
  estimatedOverage: number;     // (liveEndUserCount - 2000) * 0.03 if > 0
}
```

---

## Database Schema (D1)

### platforms
Developer accounts and subscription status.
```sql
platformId TEXT PRIMARY KEY,      -- plt_xxx
clerkUserId TEXT,                 -- Clerk ID from dream-api app
stripeAccountId TEXT,             -- Stripe Connect ID (for their payments)
stripeCustomerId TEXT,            -- Stripe customer ID (for OUR billing)
stripeSubscriptionId TEXT,        -- Their $19/mo subscription to us
subscriptionStatus TEXT,          -- 'trialing', 'active', 'past_due', 'canceled'
trialEndsAt INTEGER,              -- Unix timestamp
currentPeriodEnd INTEGER,         -- Unix timestamp
createdAt TEXT
```

### api_keys
Project credentials.
```sql
publishableKey TEXT PRIMARY KEY,  -- pk_test_xxx or pk_live_xxx
platformId TEXT,
secretKeyHash TEXT,               -- SHA-256 of secret key
mode TEXT,                        -- 'test' or 'live'
projectType TEXT,                 -- 'saas' or 'store'
name TEXT,
createdAt TEXT
```

### tiers
Subscription tiers or store products.
```sql
publishableKey TEXT,
name TEXT,
displayName TEXT,
price REAL,
requestLimit INTEGER,
priceId TEXT,
productId TEXT,
features TEXT,              -- JSON array
inventory INTEGER,          -- Store only
popular INTEGER,
PRIMARY KEY (publishableKey, name)
```

### subscriptions
User subscriptions.
```sql
publishableKey TEXT,
platformId TEXT,
userId TEXT,
plan TEXT,
status TEXT,                -- 'active', 'canceling', 'canceled'
stripeCustomerId TEXT,
subscriptionId TEXT,
currentPeriodEnd TEXT,
PRIMARY KEY (platformId, publishableKey, userId)
```

### usage_counts
Monthly usage tracking.
```sql
platformId TEXT,
publishableKey TEXT,
userId TEXT,
plan TEXT,
usageCount INTEGER,
periodStart TEXT,
periodEnd TEXT,
PRIMARY KEY (platformId, userId)
```

### end_users
Users per project.
```sql
platformId TEXT,
publishableKey TEXT,
clerkUserId TEXT,
email TEXT,
createdAt TEXT,
PRIMARY KEY (platformId, publishableKey, clerkUserId)
```

### events
Webhook idempotency.
```sql
eventId TEXT PRIMARY KEY,   -- Stripe event ID
type TEXT,
payload_json TEXT,
createdAt TEXT
```

---

## KV Namespaces

### TOKENS_KV
Fast auth lookups.
```
secretkey:{sha256}:publishableKey  →  pk_xxx
publishablekey:{pk}:platformId     →  plt_xxx
user:{clerkUserId}:secretKey:test  →  sk_test_xxx
user:{clerkUserId}:secretKey:live  →  sk_live_xxx
```

---

## Error Responses

All errors return:
```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Invalid or missing authentication |
| 403 | Usage limit exceeded / forbidden |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Server error |
