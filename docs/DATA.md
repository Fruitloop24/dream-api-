# Data Storage Reference

## D1 Database (Primary Data Store)

All workers share the same D1 database. Tables are organized by domain.

---

### platforms

Developer accounts (our customers).

| Column | Type | Notes |
|--------|------|-------|
| `platformId` | TEXT | **PK** - `plt_xxx` |
| `clerkUserId` | TEXT | Clerk ID from dream-api app |
| `stripeAccountId` | TEXT | Stripe Connect account ID |
| `createdAt` | TEXT | ISO timestamp |

**Created by:** `front-auth-api` webhook on dev signup

---

### api_keys

Project credentials. One row per project.

| Column | Type | Notes |
|--------|------|-------|
| `publishableKey` | TEXT | **PK** - `pk_test_xxx` or `pk_live_xxx` |
| `platformId` | TEXT | FK to platforms |
| `secretKeyHash` | TEXT | SHA-256 hash of secret key |
| `mode` | TEXT | `test` or `live` |
| `projectType` | TEXT | `saas` or `store` |
| `name` | TEXT | Project display name |
| `createdAt` | TEXT | ISO timestamp |

**Created by:** `oauth-api` POST /create-products

**Key Pattern:**
- Test: `pk_test_xxx` / `sk_test_xxx`
- Live: `pk_live_xxx` / `sk_live_xxx`

---

### tiers

Subscription tiers (SaaS) or products (Store).

| Column | Type | Notes |
|--------|------|-------|
| `publishableKey` | TEXT | **PK** - project key |
| `name` | TEXT | **PK** - tier slug (e.g., `free`, `pro`) |
| `displayName` | TEXT | UI display name |
| `price` | REAL | Monthly price or one-time price |
| `requestLimit` | INTEGER | API calls per period (SaaS only) |
| `priceId` | TEXT | Stripe Price ID |
| `productId` | TEXT | Stripe Product ID |
| `features` | TEXT | JSON array of feature strings |
| `inventory` | INTEGER | Stock count (Store only, NULL for SaaS) |
| `popular` | INTEGER | 1 = show "Popular" badge |

**Primary Key:** `(publishableKey, name)`

**Created by:** `oauth-api` POST /create-products, PUT /tiers

**SaaS Example:**
```sql
INSERT INTO tiers VALUES (
  'pk_test_xxx', 'pro', 'Pro', 29.00, 10000,
  'price_xxx', 'prod_xxx', '["10K API calls", "Priority support"]',
  NULL, 1
);
```

**Store Example:**
```sql
INSERT INTO tiers VALUES (
  'pk_test_xxx', 't-shirt', 'Cool T-Shirt', 29.99, NULL,
  'price_xxx', 'prod_xxx', '["100% cotton"]',
  50, 0
);
```

---

### subscriptions

Active user subscriptions.

| Column | Type | Notes |
|--------|------|-------|
| `publishableKey` | TEXT | Project key |
| `platformId` | TEXT | FK to platforms |
| `userId` | TEXT | Clerk user ID (end-user) |
| `plan` | TEXT | Tier name (e.g., `pro`) |
| `status` | TEXT | `active`, `canceling`, `canceled` |
| `stripeCustomerId` | TEXT | Stripe Customer ID |
| `subscriptionId` | TEXT | Stripe Subscription ID |
| `currentPeriodEnd` | TEXT | Subscription renewal date |
| `createdAt` | TEXT | ISO timestamp |
| `updatedAt` | TEXT | ISO timestamp |

**Primary Key:** `(platformId, publishableKey, userId)`

**Created by:** `api-multi` Stripe webhook on `customer.subscription.created`

**Updated by:** Webhook on subscription updates/cancellations

---

### usage_counts

Monthly API usage tracking per user.

| Column | Type | Notes |
|--------|------|-------|
| `platformId` | TEXT | FK to platforms |
| `publishableKey` | TEXT | Project key |
| `userId` | TEXT | **PK** - Clerk user ID |
| `plan` | TEXT | Current plan (for limit lookup) |
| `usageCount` | INTEGER | Calls this period |
| `periodStart` | TEXT | Period start (YYYY-MM-DD) |
| `periodEnd` | TEXT | Period end (YYYY-MM-DD) |
| `updatedAt` | TEXT | Last update timestamp |

**Primary Key:** `(platformId, userId)`

**Usage:**
```sql
-- Increment on POST /api/data
UPDATE usage_counts
SET usageCount = usageCount + 1, updatedAt = ?
WHERE platformId = ? AND userId = ?;

-- Check limit on GET /api/usage
SELECT usageCount, plan FROM usage_counts
WHERE platformId = ? AND userId = ?;
-- Then lookup tier.requestLimit
```

**Period Reset:** Automatic on new period (checked on each request)

---

### end_users

All end-users per project. Source of truth for customer list.

| Column | Type | Notes |
|--------|------|-------|
| `platformId` | TEXT | FK to platforms |
| `publishableKey` | TEXT | **PK** - Project key |
| `clerkUserId` | TEXT | **PK** - Clerk user ID |
| `email` | TEXT | User email |
| `createdAt` | TEXT | ISO timestamp |

**Primary Key:** `(platformId, publishableKey, clerkUserId)`

**Created by:** `sign-up` worker on user registration

**Query Pattern:**
```sql
-- Get all customers for a project
SELECT * FROM end_users WHERE publishableKey = ?;

-- Count for dashboard
SELECT COUNT(*) FROM end_users WHERE publishableKey = ?;
```

---

### events

Webhook idempotency tracking.

| Column | Type | Notes |
|--------|------|-------|
| `eventId` | TEXT | **PK** - Stripe event ID |
| `type` | TEXT | Event type |
| `payload_json` | TEXT | Full event payload |
| `createdAt` | TEXT | ISO timestamp |

**Usage:** Check before processing webhook:
```sql
-- Already processed?
SELECT 1 FROM events WHERE eventId = ?;

-- Record event
INSERT INTO events (eventId, type, payload_json, createdAt)
VALUES (?, ?, ?, ?);
```

---

## KV Namespaces

### TOKENS_KV (api-multi, front-auth-api, sign-up)

Fast lookups for API authentication.

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `secretkey:{sha256}:publishableKey` | `pk_xxx` | - |
| `publishablekey:{pk}:platformId` | `plt_xxx` | - |
| `user:{clerkUserId}:secretKey:test` | `sk_test_xxx` | - |
| `user:{clerkUserId}:secretKey:live` | `sk_live_xxx` | - |

**Auth Flow:**
1. Request comes with `Authorization: Bearer sk_test_xxx`
2. Hash the key: `sha256(sk_test_xxx)`
3. Lookup: `KV.get(secretkey:{hash}:publishableKey)` → `pk_test_xxx`
4. Lookup: `KV.get(publishablekey:pk_test_xxx:platformId)` → `plt_xxx`

### PLATFORM_TOKENS_KV (oauth-api)

Stripe Connect tokens for dev accounts.

| Key Pattern | Value |
|-------------|-------|
| `stripe:{platformId}:test` | `{ accessToken, refreshToken, stripeUserId }` |
| `stripe:{platformId}:live` | `{ accessToken, refreshToken, stripeUserId }` |

### CUSTOMER_TOKENS_KV (oauth-api)

Tier configurations (cached from D1).

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `tiers:{publishableKey}` | `[{ name, price, limit, ... }]` | 5 min |

---

## R2 Buckets

### dream_api_assets

Product images and uploads.

**Key Pattern:** `{publishableKey}/{timestamp}-{filename}`

**Example:** `pk_test_xxx/1703980800000-product.png`

**Access:**
- Upload: `POST /api/assets` (api-multi)
- Retrieve: `GET /api/assets/{key}` (api-multi, public)

**Binding:** `dream_api_assets` in api-multi wrangler.toml

---

## Query Patterns

### Get Customer with Usage

```sql
SELECT
  eu.clerkUserId,
  eu.email,
  uc.plan,
  uc.usageCount,
  t.requestLimit,
  s.status,
  s.currentPeriodEnd
FROM end_users eu
LEFT JOIN usage_counts uc ON eu.clerkUserId = uc.userId
LEFT JOIN tiers t ON t.publishableKey = eu.publishableKey AND t.name = uc.plan
LEFT JOIN subscriptions s ON s.userId = eu.clerkUserId AND s.publishableKey = eu.publishableKey
WHERE eu.publishableKey = ?;
```

### Dashboard Metrics

```sql
-- Active subscriptions
SELECT COUNT(*) FROM subscriptions
WHERE publishableKey = ? AND status = 'active';

-- MRR calculation
SELECT SUM(t.price) FROM subscriptions s
JOIN tiers t ON t.publishableKey = s.publishableKey AND t.name = s.plan
WHERE s.publishableKey = ? AND s.status = 'active';

-- Total usage this period
SELECT SUM(usageCount) FROM usage_counts
WHERE publishableKey = ? AND periodStart = ?;
```

### Store Inventory

```sql
-- Decrement on purchase
UPDATE tiers
SET inventory = inventory - ?
WHERE publishableKey = ? AND name = ?;

-- Check stock
SELECT inventory FROM tiers
WHERE publishableKey = ? AND name = ?;
```

---

## Data Flow

```
End-User Signs Up (sign-up worker)
    ↓
Creates: end_users row + usage_counts row (plan: free)
    ↓
Sets Clerk metadata: { publishableKey, plan: 'free' }

User Upgrades (api-multi checkout → Stripe webhook)
    ↓
Creates: subscriptions row
Updates: usage_counts.plan, Clerk metadata.plan

User Makes API Call (api-multi)
    ↓
KV lookup → platformId
D1 check → usage_counts vs tier.requestLimit
D1 update → usageCount++
```

---

## Important Notes

1. **Always filter by publishableKey** - This ensures test/live isolation
2. **D1 is source of truth** - KV is cache only
3. **Clerk metadata mirrors D1** - Plan changes update both
4. **Events table prevents duplicates** - Check before processing webhooks
5. **Usage resets monthly** - Check periodEnd on each request
