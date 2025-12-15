# Storage Schema

## D1 Database (Source of Truth)

### platforms
Developer accounts.
```sql
CREATE TABLE platforms (
  platformId TEXT PRIMARY KEY,  -- plt_xxx
  clerkUserId TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### api_keys
API keys for each project. publishableKey = project identifier.
```sql
CREATE TABLE api_keys (
  platformId TEXT NOT NULL,
  publishableKey TEXT PRIMARY KEY,  -- pk_test_xxx or pk_live_xxx
  secretKeyHash TEXT NOT NULL,      -- SHA-256 hash
  status TEXT DEFAULT 'active',     -- active/revoked
  mode TEXT NOT NULL,               -- test/live
  projectType TEXT NOT NULL,        -- saas/store (LOCKED at creation)
  name TEXT,                        -- Project display name
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (platformId) REFERENCES platforms(platformId)
);
```

### tiers
Subscription tiers (SaaS) or products (Store).
```sql
CREATE TABLE tiers (
  platformId TEXT NOT NULL,
  publishableKey TEXT,              -- Links to project (api_keys)
  projectType TEXT,                 -- saas/store
  name TEXT NOT NULL,               -- Tier ID: free, pro, enterprise
  displayName TEXT,
  price REAL DEFAULT 0,
  "limit" INTEGER,                  -- NULL = unlimited
  priceId TEXT,                     -- Stripe price ID
  productId TEXT,                   -- Stripe product ID
  features TEXT,                    -- JSON: { billingMode, imageUrl, description }
  popular INTEGER DEFAULT 0,        -- 0/1 for UI badge
  inventory INTEGER,                -- Stock count (store only)
  soldOut INTEGER DEFAULT 0,        -- 0/1 (store only)
  mode TEXT,                        -- test/live
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (platformId, name, mode)
);
```

### end_users
Customers of platform devs.
```sql
CREATE TABLE end_users (
  platformId TEXT NOT NULL,
  publishableKey TEXT,              -- Which project they belong to
  clerkUserId TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'active',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT,
  PRIMARY KEY (platformId, clerkUserId)
);
```

### subscriptions
Active subscriptions for SaaS customers.
```sql
CREATE TABLE subscriptions (
  platformId TEXT NOT NULL,
  userId TEXT NOT NULL,
  publishableKey TEXT,              -- Which project
  plan TEXT,                        -- Tier name
  priceId TEXT,
  productId TEXT,
  amount INTEGER,                   -- In cents
  currency TEXT DEFAULT 'usd',
  status TEXT,                      -- active/canceled/past_due
  currentPeriodEnd TEXT,
  canceledAt TEXT,
  cancelReason TEXT,
  subscriptionId TEXT,              -- Stripe subscription ID
  stripeCustomerId TEXT,
  updatedAt TEXT,
  PRIMARY KEY (platformId, userId)
);
```

### usage_counts
API usage tracking per billing period.
```sql
CREATE TABLE usage_counts (
  platformId TEXT NOT NULL,
  userId TEXT NOT NULL,
  plan TEXT,
  periodStart TEXT,
  periodEnd TEXT,
  usageCount INTEGER DEFAULT 0,
  updatedAt TEXT,
  PRIMARY KEY (platformId, userId, periodStart)
);
```

### events
Webhook event log for debugging.
```sql
CREATE TABLE events (
  platformId TEXT NOT NULL,
  source TEXT,                      -- stripe/clerk/internal
  type TEXT,                        -- event type
  eventId TEXT UNIQUE,              -- Idempotency key
  payload_json TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## KV Namespaces

### PLATFORM_TOKENS_KV
Owner/dev data. Used by front-auth-api and oauth-api.

```
# User → Platform mapping
user:{userId}:platformId              → plt_xxx

# Keys per mode
user:{userId}:publishableKey:test     → pk_test_xxx
user:{userId}:secretKey:test          → sk_test_xxx  (plain, for owner only)
user:{userId}:publishableKey:live     → pk_live_xxx
user:{userId}:secretKey:live          → sk_live_xxx

# Stripe credentials
user:{userId}:stripeToken             → { accessToken, stripeUserId }
platform:{platformId}:stripeToken     → { accessToken, stripeUserId }

# Reverse lookups (for API auth)
publishablekey:{pk}:platformId        → plt_xxx
secretkey:{hash}:publishableKey       → pk_xxx

# OAuth state (10 min TTL)
oauth:state:{uuid}                    → userId
```

### CUSTOMER_TOKENS_KV
Customer-facing data. Used by api-multi.

```
# Tier configs (cached for fast limit lookups)
platform:{platformId}:tierConfig:test → { tiers: [...] }
platform:{platformId}:tierConfig:live → { tiers: [...] }
platform:{platformId}:tierConfig      → { tiers: [...] }  (live fallback)

# Stripe credentials (for checkout/portal)
platform:{platformId}:stripeToken:test → { accessToken, stripeUserId }
platform:{platformId}:stripeToken:live → { accessToken, stripeUserId }
platform:{platformId}:stripeToken      → (live fallback)

# Reverse lookups (copied from PLATFORM_TOKENS_KV)
publishablekey:{pk}:platformId         → plt_xxx
secretkey:{hash}:publishableKey        → pk_xxx
```

---

## Key Relationships

```
platformId (plt_xxx)
    │
    ├── api_keys (publishableKey = project)
    │       │
    │       ├── tiers (linked by publishableKey)
    │       ├── subscriptions (linked by publishableKey)
    │       └── end_users (linked by publishableKey)
    │
    └── stripe_tokens (Stripe Connect credentials)
```

## Mode Filtering

All data is queryable by mode via key prefix:
- `pk_test_%` → Test data
- `pk_live_%` → Live data

Dashboard uses this to show correct customers per mode.
