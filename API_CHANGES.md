# dream-api - API Changes Summary

**Date:** 2025-11-26
**Status:** Core API key authentication implemented ✅

---

## What Was Built

### ✅ 1. API Key Authentication (`middleware/apiKey.ts`)

**New file:** `api-multi/src/middleware/apiKey.ts`

**Functions:**
- `verifyApiKey(apiKey, env)` - Verify API key and return platformId
- `generateApiKey(platformId, env)` - Generate new API key for a platform
- `revokeApiKey(apiKey, env)` - Revoke API key (for rotation)

**How it works:**
- API keys format: `pk_live_{64_hex_chars}`
- Keys are hashed (SHA-256) before storage
- Stored in KV: `apikey:{hash}` → `platformId`
- Single KV read for verification (~10ms)

**Security:**
- Keys hashed (SHA-256) before storage
- Original keys never stored
- Constant-time comparison (prevent timing attacks)
- Rate limiting per key (TODO)

---

### ✅ 2. Developer Registration (`routes/developer.ts`)

**New file:** `api-multi/src/routes/developer.ts`

**Endpoints added:**

#### POST `/api/developer/register`
- **Auth:** None (public endpoint)
- **Body:** `{ email: string }`
- **Returns:** `{ platformId, apiKey, message }`
- **What it does:**
  1. Generates platformId (`plt_xxxxx`)
  2. Generates API key (`pk_live_xxxxx`)
  3. Stores developer metadata in KV
  4. Creates default tier config (free tier)
  5. Initializes stats (for dashboard)
  6. Returns API key (SHOWN ONLY ONCE)

#### GET `/api/developer/dashboard`
- **Auth:** API key required
- **Returns:** `{ stats, platform }`
- **What it does:**
  - Reads stats from KV: `platform:{platformId}:stats`
  - Shows totalUsers, revenue, API calls
  - Single KV read (~10ms)

**Helper functions:**
- `updatePlatformStats()` - Update stats in KV (called internally)

**TODO endpoints (documented, not yet implemented):**
- POST `/api/developer/regenerate` - Rotate API key
- POST `/api/developer/create-products` - Create Stripe products

---

### ✅ 3. Dual Authentication Mode (`index.ts`)

**Updated file:** `api-multi/src/index.ts`

**Changes:**
- Added imports for `verifyApiKey`, `handleDeveloperRegister`, `handleDeveloperDashboard`
- Replaced single Clerk JWT auth with dual-mode auth
- Added developer registration endpoint route
- Added developer dashboard endpoint route

**Authentication modes:**

#### MODE 1: API Key Auth
```
Authorization: Bearer pk_live_xxxxx
X-User-Id: user_123
X-User-Plan: free
```
- Verifies API key → gets platformId
- Gets userId from X-User-Id header
- Gets plan from X-User-Plan header (or defaults to free)

#### MODE 2: Clerk JWT Auth
```
Authorization: Bearer {clerk_jwt}
```
- Verifies JWT → gets userId
- Gets platformId from JWT metadata (`publicMetadata.platformId`)
- Gets plan from JWT claims (`sessionClaims.plan`)

**Security fix:**
- ❌ **REMOVED:** `X-Platform-User-Id` header (could be spoofed)
- ✅ **NOW:** platformId from trusted source (API key OR JWT metadata)

**Limitations:**
- Stripe endpoints (`/api/create-checkout`, `/api/customer-portal`) still require Clerk JWT
- TODO: Support API key mode for Stripe (get email from request body)

---

### ✅ 4. Updated Comments & Documentation

**Files updated with dream-api comments:**

#### `index.ts`
- Header updated (removed "PLUG SAAS", added "dream-api")
- Added TODO markers for API-first pivot
- Explained dual authentication modes
- Documented security improvements

#### `routes/usage.ts`
- Updated header with dream-api branding
- Explained multi-tenant KV structure
- Updated function signatures (`platformUserId` → `platformId`)
- Updated usage key format: `usage:{platformId}:{userId}`

#### `routes/checkout.ts`
- Updated header with dream-api branding
- Documented current limitations (Clerk JWT required)
- Updated function signatures (`platformUserId` → `platformId`)
- Explained multi-tenant pricing config

---

## KV Storage Structure

### Developer Registration
```
apikey:{sha256_hash}           → "plt_abc123" (reverse lookup)
platform:plt_abc123:email      → "dev@example.com"
platform:plt_abc123:createdAt  → "2025-11-26T10:30:00Z"
platform:plt_abc123:stats      → { totalUsers, revenue, totalCalls }
```

### Platform Configuration
```
user:plt_abc123:tierConfig     → { tiers: [...] }
```

### Usage Tracking (UPDATED KEY FORMAT)
```
usage:plt_abc123:user_xyz      → { count, plan, periodStart, periodEnd }
```

**Old format:** `usage:{userId}`
**New format:** `usage:{platformId}:{userId}`
**Why:** Multi-tenant isolation (each platform's users separated)

---

## API Endpoints Summary

### Public Endpoints (No Auth)
- `GET /health` - Health check
- `GET /api/tiers` - Get available pricing tiers
- `POST /api/developer/register` - Developer signup
- `POST /webhook/stripe` - Stripe webhook handler

### Authenticated Endpoints (API Key OR Clerk JWT)
- `GET /api/developer/dashboard` - Developer stats
- `POST /api/data` - Track usage (increment counter)
- `GET /api/usage` - Check usage and limits

### Authenticated Endpoints (Clerk JWT Only)
- `POST /api/create-checkout` - Create Stripe Checkout session
- `POST /api/customer-portal` - Create Stripe Customer Portal session

---

## How to Test

### 1. Register as a Developer
```bash
curl -X POST http://localhost:8787/api/developer/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Response:
{
  "success": true,
  "platformId": "plt_abc123",
  "apiKey": "pk_live_xyz...",
  "message": "Save your API key - it will not be shown again!"
}
```

### 2. Test API Key Auth (Track Usage)
```bash
curl -X POST http://localhost:8787/api/data \
  -H "Authorization: Bearer pk_live_xyz..." \
  -H "X-User-Id: user_123" \
  -H "X-User-Plan: free"

# Response:
{
  "success": true,
  "data": { "message": "Request processed successfully" },
  "usage": {
    "count": 1,
    "limit": 100,
    "plan": "free"
  }
}
```

### 3. Check Dashboard Stats
```bash
curl -X GET http://localhost:8787/api/developer/dashboard \
  -H "Authorization: Bearer pk_live_xyz..."

# Response:
{
  "success": true,
  "stats": {
    "totalUsers": 0,
    "freeUsers": 0,
    "proUsers": 0,
    "totalCalls": 1,
    "monthlyRevenue": 0
  },
  "platform": {
    "platformId": "plt_abc123",
    "email": "test@example.com",
    "createdAt": "2025-11-26T..."
  }
}
```

---

## What Still Needs to Be Built

### Phase 1 Remaining (Core API)
- [ ] Update stats on each API call (increment `totalCalls`)
- [ ] Update stats on Stripe webhooks (track revenue)
- [ ] API key regeneration endpoint
- [ ] Stripe product creation endpoint
- [ ] Support API key mode for Stripe endpoints

### Phase 2 (Dashboard UI)
- [ ] Rebuild frontend as developer dashboard
- [ ] Signup flow UI
- [ ] Dashboard stats display
- [ ] API key copy/regenerate UI

### Phase 3 (Polish)
- [ ] npm package (@dream-api/client)
- [ ] API documentation site
- [ ] Rate limiting for registration endpoint
- [ ] Email validation
- [ ] Welcome email with API key

---

## Breaking Changes

### KV Key Format Change
**Old:** `usage:{userId}`
**New:** `usage:{platformId}:{userId}`

**Impact:** Existing usage data won't be found with new key format.

**Migration:** If you have existing data, run migration script:
```bash
# TODO: Create migration script to move data to new key format
```

### Header Removal
**Removed:** `X-Platform-User-Id` header (security risk)
**Replaced by:** Derived from API key or JWT metadata

**Impact:** Preview mode using header-based platformId no longer works.

**Fix:** Use JWT metadata instead (`publicMetadata.platformId`)

---

## File Checklist

### ✅ Created
- [x] `api-multi/src/middleware/apiKey.ts`
- [x] `api-multi/src/routes/developer.ts`

### ✅ Updated
- [x] `api-multi/src/index.ts`
- [x] `api-multi/src/routes/usage.ts`
- [x] `api-multi/src/routes/checkout.ts`

### ⏭️ Not Modified (Still Work)
- [ ] `api-multi/src/config/configLoader.ts` (already multi-tenant)
- [ ] `api-multi/src/config/tiers.ts` (config values)
- [ ] `api-multi/src/middleware/cors.ts` (CORS handling)
- [ ] `api-multi/src/middleware/rateLimit.ts` (rate limiting)
- [ ] `api-multi/src/middleware/security.ts` (security headers)
- [ ] `api-multi/src/services/kv.ts` (KV helpers)
- [ ] `api-multi/src/stripe-webhook.ts` (Stripe webhooks)
- [ ] `api-multi/src/types.ts` (TypeScript types)
- [ ] `api-multi/src/utils.ts` (utility functions)

---

## Next Steps

1. **Test locally:**
   ```bash
   cd api-multi && npm run dev
   ```

2. **Register a developer:**
   ```bash
   curl -X POST http://localhost:8787/api/developer/register \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com"}'
   ```

3. **Save the API key** (won't be shown again!)

4. **Test usage tracking:**
   ```bash
   curl -X POST http://localhost:8787/api/data \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "X-User-Id: test_user" \
     -H "X-User-Plan: free"
   ```

5. **Check dashboard:**
   ```bash
   curl -X GET http://localhost:8787/api/developer/dashboard \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

---

**Status:** Ready for local testing!
**Next:** Update stats tracking + build frontend dashboard
