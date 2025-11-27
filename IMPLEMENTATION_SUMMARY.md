# Usage Tracking Implementation - front-auth-api

## ✅ Completed (2025-11-26)

### 1. **Added Types & Configuration**
- `UsageData` interface (tracks count, plan, period)
- `PLATFORM_TIERS` config (free: 5 calls/month, paid: 500 calls/month)
- `RATE_LIMIT_PER_MINUTE` constant (100 requests/minute)
- Updated `Env` interface to include `USAGE_KV`

### 2. **Added Utility Functions**
- `getCurrentPeriod()` - Gets current billing month (UTC)
- `shouldResetUsage()` - Checks if usage needs monthly reset
- `checkRateLimit()` - Enforces 100 req/min limit with KV
- `trackUsage()` - Main usage tracking function (increments, checks limits)

### 3. **Wired Up Webhook Handler**
- Imported `handleStripeWebhook` from webhook.ts
- Replaced old inline webhook code
- Webhook now updates `plan` field in JWT metadata (not just `subscribed`)
- Added idempotency checking

### 4. **Wrapped ALL Endpoints with Usage Tracking**

#### `/verify-auth` (POST)
- ✅ Checks rate limit (100/min)
- ✅ Tracks usage (increments counter)
- ✅ Returns usage stats in response
- ✅ Returns 403 if tier limit exceeded
- ✅ Returns 429 if rate limit exceeded

#### `/create-checkout` (POST)
- ✅ Checks rate limit
- ✅ Tracks usage
- ✅ Returns usage stats
- ✅ Added `tier: 'paid'` to Stripe metadata (for webhook)

#### `/generate-credentials` (POST)
- ✅ Checks rate limit
- ✅ Tracks usage
- ✅ Returns usage stats with credentials

#### `/get-credentials` (GET)
- ✅ Checks rate limit
- ✅ Tracks usage
- ✅ Returns usage stats with credentials

#### Endpoints WITHOUT tracking (as intended):
- `/health` - Health check (public)
- `/webhook/stripe` - Stripe webhook (verified by signature)

---

## How It Works

### For FREE Tier Developers:
1. Sign up → Clerk sets `plan: 'free'` in JWT
2. Make API call → Usage counter increments
3. After 5 calls → Returns 403 with upgrade message
4. Monthly reset (1st of month) → Counter resets to 0

### For PAID Tier Developers ($29/mo):
1. Sign up → Free tier (5 calls)
2. Pay $29 → Stripe webhook fires
3. Webhook updates Clerk JWT: `plan: 'paid'`
4. Now has 500 calls/month
5. Monthly reset applies

### Usage Response Format:
```json
{
  "success": true,
  "userId": "user_abc123",
  "usage": {
    "count": 3,
    "limit": 5,
    "plan": "free",
    "periodStart": "2025-11-01",
    "periodEnd": "2025-11-30",
    "remaining": 2
  }
}
```

### When Limit Exceeded:
```json
{
  "error": "Tier limit reached",
  "count": 5,
  "limit": 5,
  "plan": "free",
  "message": "Please upgrade to unlock more requests"
}
```

---

## KV Storage Structure

### Usage Tracking:
```
usage:{userId} → {
  usageCount: 3,
  plan: "free",
  lastUpdated: "2025-11-26T23:00:00Z",
  periodStart: "2025-11-01",
  periodEnd: "2025-11-30"
}
```

### Rate Limiting:
```
ratelimit:{userId}:{minute} → count
TTL: 120 seconds (auto-cleanup)
```

### Webhook Idempotency:
```
webhook:stripe:{eventId} → timestamp
TTL: 30 days
```

### Credentials:
```
apikey:{hash} → platformId
user:{userId}:platformId → "plt_abc123"
user:{userId}:apiKey → "pk_live_xyz..."
platform:{platformId}:userId → userId
```

---

## Next Steps

### To Test Locally:
1. Fill in `.dev.vars` with your Clerk and Stripe keys
2. Run: `cd front-auth-api && npx wrangler dev`
3. Test endpoints with curl or Postman
4. Check usage counters in KV

### To Deploy:
1. Set secrets:
   ```bash
   cd front-auth-api
   npx wrangler secret put CLERK_SECRET_KEY
   npx wrangler secret put CLERK_PUBLISHABLE_KEY
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_PRICE_ID
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

2. Deploy:
   ```bash
   npx wrangler deploy
   ```

3. Update frontend env vars to point to deployed URL

---

## Integration with Frontend

### Dashboard Updates Needed:

The frontend should now display usage stats from API responses:

```typescript
// Example: After calling /get-credentials
const response = await fetch(`${FRONT_AUTH_API}/get-credentials`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

// Show in dashboard:
// - data.usage.count / data.usage.limit
// - "3 / 5 calls this month"
// - Progress bar
// - Upgrade button when near limit
```

---

## Stripe Integration

### Checkout Session Metadata:
The `/create-checkout` endpoint now includes `tier: 'paid'` in metadata:

```typescript
metadata: { userId, tier: 'paid' }
```

### Webhook Handler:
The webhook.ts file reads this and updates Clerk:

```typescript
await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    plan: tier,  // 'paid' from metadata
    stripeCustomerId: session.customer,
    subscriptionId: session.subscription
  }
});
```

### Subscription Cancellation:
When subscription is deleted, webhook downgrades to `plan: 'free'`

---

## Testing Checklist

- [ ] Sign up new user → Check if plan='free' in JWT
- [ ] Make 5 API calls → Should all succeed
- [ ] Make 6th API call → Should return 403
- [ ] Wait until next month → Counter should reset
- [ ] Pay for subscription → Webhook should set plan='paid'
- [ ] Make 6th call after payment → Should succeed (500 limit now)
- [ ] Make 100 requests in 1 minute → Should get rate limited
- [ ] Cancel subscription → Should downgrade to free tier

---

*Implementation completed: 2025-11-26 23:30 UTC*
*Status: Ready for local testing*
*Next: Add .dev.vars keys → Test → Deploy*
