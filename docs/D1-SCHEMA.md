# D1 Database Schema

Complete reference for the `dream-api-ssot` D1 database.

**Database ID:** `07e784d5-2c3f-4bb0-a79c-094c1d05410f`

---

## Tables Overview

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `platforms` | Developer accounts + billing | `platformId` |
| `api_keys` | Project credentials (test/live) | `publishableKey` |
| `tiers` | Subscription tiers or products | `(publishableKey, name)` |
| `stripe_tokens` | Stripe Connect OAuth tokens | `(platformId, mode)` |
| `subscriptions` | End-user subscriptions | `(platformId, publishableKey, userId)` |
| `usage_counts` | Monthly usage tracking | `(platformId, userId)` |
| `end_users` | Users per project | `(platformId, publishableKey, clerkUserId)` |
| `events` | Webhook idempotency | `eventId` |

---

## platforms

Developer accounts and platform billing status.

```sql
CREATE TABLE platforms (
  platformId TEXT PRIMARY KEY,           -- plt_xxx
  clerkUserId TEXT,                      -- Clerk user ID (dream-api app)
  stripeCustomerId TEXT,                 -- Stripe customer ID (OUR billing)
  stripeSubscriptionId TEXT,             -- Active subscription ID
  subscriptionStatus TEXT DEFAULT 'none', -- 'none', 'trialing', 'active', 'past_due', 'canceled'
  trialEndsAt INTEGER,                   -- Unix timestamp (ms)
  currentPeriodEnd INTEGER,              -- Unix timestamp (ms)
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Used by:** front-auth-api (billing), oauth-api (Connect)

**Notes:**
- `stripeCustomerId` is for OUR billing (dev pays us $19/mo)
- NOT the same as Stripe Connect account ID (stored in stripe_tokens)
- `subscriptionStatus` updated by Stripe webhooks
- `trialEndsAt` set when subscription starts (14-day trial)

---

## stripe_tokens

Stripe Connect OAuth tokens for test and live modes.

```sql
CREATE TABLE stripe_tokens (
  platformId TEXT NOT NULL,              -- Owner platform
  mode TEXT NOT NULL DEFAULT 'live',     -- 'test' or 'live'
  stripeUserId TEXT NOT NULL,            -- Connected account ID (acct_xxx)
  accessToken TEXT NOT NULL,             -- OAuth access token
  refreshToken TEXT,                     -- For token refresh (if provided)
  scope TEXT,                            -- OAuth scope granted
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (platformId, mode),
  FOREIGN KEY (platformId) REFERENCES platforms(platformId)
);
```

**Used by:** oauth-api

**Notes:**
- **CRITICAL**: Test and live tokens are SEPARATE (different OAuth flows)
- `stripeUserId` (acct_xxx) is the connected Stripe account ID
- Same stripeUserId for both modes, but tokens come from different OAuth flows
- We use platform keys + `Stripe-Account` header for API calls, not the accessToken
- Token stored in D1 as source of truth, KV for fast lookups

**Why two OAuth flows?**
- Test OAuth uses our test client_id → creates test Stripe products
- Live OAuth uses our live client_id → creates live Stripe products
- Stripe Connect requires separate authorization for each environment

---

## api_keys

Project credentials for test and live modes.

```sql
CREATE TABLE api_keys (
  publishableKey TEXT PRIMARY KEY,       -- pk_test_xxx or pk_live_xxx
  platformId TEXT NOT NULL,              -- Owner platform
  secretKeyHash TEXT NOT NULL,           -- SHA-256 of secret key
  mode TEXT DEFAULT 'live',              -- 'test' or 'live'
  projectType TEXT,                      -- 'saas' or 'store'
  name TEXT,                             -- Project display name
  projectId TEXT,                        -- Optional grouping ID
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (platformId) REFERENCES platforms(platformId)
);

-- Indexes
CREATE INDEX idx_api_keys_platform ON api_keys(platformId);
CREATE INDEX idx_api_keys_mode ON api_keys(platformId, mode);
```

**Used by:** api-multi, front-auth-api, oauth-api

**Notes:**
- Each project has TWO api_keys rows: one test, one live
- `secretKeyHash` is SHA-256, never store plain secret key
- `mode` determines if transactions are real or test
- KV has reverse lookups: `secretkey:{hash}:publishableKey`

---

## tiers

Subscription tiers (SaaS) or products (Store).

```sql
CREATE TABLE tiers (
  publishableKey TEXT NOT NULL,          -- Which project this belongs to
  platformId TEXT NOT NULL,              -- Owner platform
  name TEXT NOT NULL,                    -- Internal ID: 'free', 'pro', etc.
  displayName TEXT,                      -- UI display: 'Free Plan'
  price REAL,                            -- Monthly price in CENTS
  requestLimit INTEGER,                  -- Requests/month (-1 = unlimited)
  priceId TEXT,                          -- Stripe price ID
  productId TEXT,                        -- Stripe product ID
  features TEXT,                         -- JSON array of feature strings
  inventory INTEGER,                     -- Store only: stock count
  description TEXT,                      -- Product description
  imageUrl TEXT,                         -- Product image URL
  popular INTEGER DEFAULT 0,             -- Highlight badge (1 = true)
  trialDays INTEGER,                     -- Membership only: free trial days before billing
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (publishableKey, name),
  FOREIGN KEY (platformId) REFERENCES platforms(platformId)
);

-- Indexes
CREATE INDEX idx_tiers_platform ON tiers(platformId);
```

**Used by:** api-multi, oauth-api

**Notes:**
- `features` is JSON: `["Feature 1", "Feature 2"]`
- `price` is in CENTS (same as Stripe)
- `inventory = NULL` means unlimited stock (Store only)
- `popular = 1` shows "Popular" badge in UI
- `trialDays` sets Stripe trial period (Membership only)
- `projectType`: `'saas'` (usage limits), `'store'` (one-off), `'membership'` (trial + content gating)

---

## subscriptions

End-user subscriptions (managed by dev's Stripe Connect).

```sql
CREATE TABLE subscriptions (
  platformId TEXT NOT NULL,
  publishableKey TEXT NOT NULL,
  userId TEXT NOT NULL,                  -- End-user Clerk ID
  plan TEXT,                             -- Tier name: 'free', 'pro'
  status TEXT,                           -- 'active', 'canceling', 'canceled'
  stripeCustomerId TEXT,                 -- Dev's Stripe customer ID for this user
  subscriptionId TEXT,                   -- Stripe subscription ID
  currentPeriodEnd TEXT,                 -- ISO date
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (platformId, publishableKey, userId),
  FOREIGN KEY (platformId) REFERENCES platforms(platformId)
);

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(userId);
CREATE INDEX idx_subscriptions_pk ON subscriptions(publishableKey);
```

**Used by:** api-multi

**Notes:**
- Tracks END-USER subscriptions (not platform billing)
- `stripeCustomerId` is on dev's Stripe Connect account
- Updated via Stripe webhooks to api-multi

---

## usage_counts

Monthly usage tracking per end-user.

```sql
CREATE TABLE usage_counts (
  platformId TEXT NOT NULL,
  publishableKey TEXT NOT NULL,
  userId TEXT NOT NULL,                  -- End-user Clerk ID
  plan TEXT,                             -- Their tier
  usageCount INTEGER DEFAULT 0,          -- Actions this period
  periodStart TEXT,                      -- YYYY-MM-DD
  periodEnd TEXT,                        -- YYYY-MM-DD

  PRIMARY KEY (platformId, userId),
  FOREIGN KEY (platformId) REFERENCES platforms(platformId)
);

-- Indexes
CREATE INDEX idx_usage_pk ON usage_counts(publishableKey);
```

**Used by:** api-multi

**Notes:**
- Resets on `periodStart` change (monthly)
- `usageCount` incremented by `api.usage.track()`
- Checked against tier limits before allowing actions

---

## end_users

All end-users across all projects.

```sql
CREATE TABLE end_users (
  platformId TEXT NOT NULL,
  publishableKey TEXT NOT NULL,
  clerkUserId TEXT NOT NULL,             -- End-user Clerk ID
  email TEXT,
  firstName TEXT,
  lastName TEXT,
  plan TEXT DEFAULT 'free',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (platformId, publishableKey, clerkUserId),
  FOREIGN KEY (platformId) REFERENCES platforms(platformId)
);

-- Indexes
CREATE INDEX idx_end_users_email ON end_users(email);
CREATE INDEX idx_end_users_pk ON end_users(publishableKey);
```

**Used by:** api-multi, sign-up, front-auth-api (for counting)

**Notes:**
- Created by sign-up worker when user signs up
- `publishableKey LIKE 'pk_live_%'` = live users (billable)
- `publishableKey LIKE 'pk_test_%'` = test users (free)
- Platform billing counts ONLY live users

---

## events

Webhook idempotency tracking.

```sql
CREATE TABLE events (
  eventId TEXT PRIMARY KEY,              -- Stripe event ID
  platformId TEXT,                       -- Optional: which platform
  source TEXT,                           -- 'stripe-webhook', 'clerk-webhook'
  type TEXT,                             -- Event type
  payload_json TEXT,                     -- Raw payload (for debugging)
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_events_platform ON events(platformId);
CREATE INDEX idx_events_type ON events(type);
```

**Used by:** api-multi, front-auth-api

**Notes:**
- Prevents duplicate webhook processing
- Check `eventId` before processing any webhook
- Store payload for debugging/auditing

---

## Query Patterns

### Count live end-users (for billing)

```sql
SELECT COUNT(*) FROM end_users
WHERE platformId = ?
AND publishableKey LIKE 'pk_live_%'
```

### Get platform subscription status

```sql
SELECT subscriptionStatus, trialEndsAt, currentPeriodEnd
FROM platforms WHERE platformId = ?
```

### Get all tiers for a project

```sql
SELECT * FROM tiers
WHERE publishableKey = ?
ORDER BY price ASC
```

### Check end-user usage

```sql
SELECT usageCount, plan FROM usage_counts
WHERE platformId = ? AND userId = ?
```

### Multi-tenant isolation (ALWAYS use)

```sql
-- Every query MUST filter by platformId or publishableKey
SELECT * FROM tiers WHERE publishableKey = ?
SELECT * FROM end_users WHERE platformId = ? AND publishableKey = ?
```

---

## Migration Notes

Columns added after initial schema (safe `ALTER TABLE ADD COLUMN`):

**platforms:**
- `stripeCustomerId` - Platform billing
- `stripeSubscriptionId` - Active subscription
- `subscriptionStatus` - Billing status
- `trialEndsAt` - Trial end timestamp
- `currentPeriodEnd` - Billing period end

**api_keys:**
- `mode` - Test/live mode
- `name` - Project display name
- `projectId` - Grouping ID
- `projectType` - SaaS or Store

**tiers:**
- `inventory` - Stock count (Store)
- `description` - Product description
- `imageUrl` - Product image

---

## Worker → Table Mapping

| Worker | Tables Used |
|--------|-------------|
| front-auth-api | platforms, api_keys, events |
| oauth-api | platforms, api_keys, tiers, stripe_tokens |
| api-multi | tiers, subscriptions, usage_counts, end_users, events |
| sign-up | end_users, usage_counts (creates initial records) |
| admin-dashboard | platforms, end_users (read-only) |

---

## Sign-Up Data Flow

When a user signs up through the sign-up worker:

1. **Clerk `publicMetadata` set:**
   ```json
   { "publishableKey": "pk_test_xxx", "plan": "free" }
   ```

2. **`end_users` table insert:**
   ```sql
   INSERT INTO end_users (platformId, publishableKey, clerkUserId, email, plan)
   VALUES (?, ?, ?, ?, 'free')
   ```

3. **`usage_counts` table insert:**
   ```sql
   INSERT INTO usage_counts (platformId, publishableKey, userId, plan, usageCount)
   VALUES (?, ?, ?, 'free', 0)
   ```

See `docs/SIGN-UP-FLOW.md` for the complete sign-up flow documentation.
