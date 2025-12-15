# Projects Model

## Simple Truth: publishableKey = Project

Each `publishableKey` IS a project. No separate project ID needed.

```
pk_test_abc123 → SaaS project (test mode)
pk_live_abc123 → Same project (live mode)
pk_test_xyz789 → Store project (different project)
```

## What a "Project" Contains

```
publishableKey
    ├── projectType (saas | store) - LOCKED at creation
    ├── mode (test | live) - embedded in key prefix
    ├── name ("My Chat API")
    ├── tiers[] - subscription tiers or store products
    ├── customers[] - end users scoped to this key
    └── secretKey - for API authentication
```

## Business Type Locking

When creating a new project, dev chooses:
- **SaaS** - Subscriptions with usage limits
- **Store** - One-off products with inventory

This choice is **LOCKED FOREVER** for that key set. Can't mix.

Want both? Create two projects → two separate key sets.

## Test → Live Flow

```
1. Create test project
   └── pk_test_xxx, sk_test_xxx (projectType: saas)

2. Develop & test with sandbox Stripe

3. Click "Go Live"
   └── pk_live_xxx, sk_live_xxx (same projectType: saas)

4. Both exist in parallel
   - Test for development
   - Live for production
```

## Key Generation

Keys are generated in `oauth-api/routes/products.ts`:

```js
// Format
pk_{mode}_{32 hex chars}
sk_{mode}_{64 hex chars}  // longer for more entropy

// Examples
pk_test_a1b2c3d4e5f6...
sk_live_x9y8z7w6v5u4...
```

Secret key is hashed (SHA-256) before storage. Plain key shown ONCE at creation.

## Querying by Project

```sql
-- Get tiers for a project
SELECT * FROM tiers WHERE publishableKey = 'pk_test_xxx';

-- Get customers for a project
SELECT * FROM subscriptions WHERE publishableKey LIKE 'pk_live_%';

-- Get all projects for a platform
SELECT * FROM api_keys WHERE platformId = 'plt_xxx';
```

## Dashboard Display

```
Platform: plt_xxx
├── Project: "My SaaS API" (saas)
│   ├── Test: pk_test_abc...
│   └── Live: pk_live_abc...
│
└── Project: "My Store" (store)
    ├── Test: pk_test_xyz...
    └── Live: pk_live_xyz...
```

## Key Rotation (Future)

Rotate secret key without changing products:
1. Generate new sk_xxx
2. Update hash in D1
3. Update KV lookups
4. Old key stops working immediately

Products, tiers, customers all stay linked to same publishableKey.
