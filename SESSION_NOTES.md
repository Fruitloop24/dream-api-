# Session Notes - Dec 15, 2025

## What We Did

### 1. Clean Slate Reset
- Wiped all D1 tables and recreated with clean schema (no `projectId`)
- Cleared KV keys
- Stripped `projectId` from all code - now using `publishableKey` as the project identifier

### 2. Test Flow Completed (Project 1)
- Created customer `newcustomer2024@example.com`
- Tested free tier limit (1 call) - hit 403 ✅
- Upgraded to Pro via checkout ✅
- Tested Pro limit (2 calls) ✅
- Cancel subscription via portal ✅
- Undo cancel ✅

### 3. Project 2 Created
- Keys: `pk_test_58e987...` / `sk_test_64f331...` (redacted)
- Tiers: Free (limit: 2), Pro (limit: 3) with display names "Yo" and "Fo"
- Created customer `project2customer@example.com` (user_36tiy3U4ndqxo58FGPcC8zIeDp1)
- Tested free tier limit - hit 403 at 2 calls ✅

### 4. Bugs Fixed
- **getPriceIdMap** - Was only indexing by displayName, now indexes by both `tier.id` (internal name like 'pro') AND `tier.name` (display name)
- **KV writes excessive** - Changed apiKey.ts to read cache first, only write on cache miss (was writing 2 KV per request!)

## Still To Do

### Immediate
- [x] Complete Project 2 checkout - DONE! Ken Sheffield upgraded to Pro
- [x] Verify Project 2 shows in dashboard with subscription - DONE!

### Bugs Fixed (Latest Session)
- [x] **Dashboard reading wrong table** - Was querying `usage_counts`, should be `usage_snapshots`
  - Fixed in `dashboard.ts` line ~205
- [x] **Webhook events not storing publishableKey** - Added publishableKey param to recordEvent
  - Fixed in `d1.ts` recordEvent function
  - Fixed in `stripe-webhook.ts` to capture and pass eventPublishableKey

### Code Locations
- `api-multi/src/middleware/apiKey.ts` - KV cache fix
- `api-multi/src/config/configLoader.ts` - getPriceIdMap fix (line ~229)
- `api-multi/src/routes/dashboard.ts` - Fixed usage query to use usage_snapshots table
- `api-multi/src/services/d1.ts` - recordEvent now includes publishableKey param
- `api-multi/src/stripe-webhook.ts` - Now captures eventPublishableKey in all cases

## Project 2 Checkout URL
```
https://checkout.stripe.com/c/pay/cs_test_a1K0faoRY8sW0jHl4YHIqfS9uYxyNp1OJ3oOThCuAWO8MHC5stUQ7QRCCW#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cXdsdWBEZmZqcGtxJz8nZGZmcVo0VlZubkNXcWFSQE99TmFkJyknZHVsTmB8Jz8ndW5acWB2cVowNFdOSWgwN0kwYzVDY0p1NzZXVnw2dFZSd31DPTRxMEc1d389T2x3SWZAfzJnYDZvd0lPM0I3aDd0clxcREliQE1JYEMxUjZWME18NFx1aTNLdkhpbHxHaDU1ZFRLQz1HdlcnKSdjd2poVmB3c2B3Jz9xd3BgKSdnZGZuYndqcGthRmppancnPycmY2NjY2NjJyknaWR8anBxUXx1YCc%2FJ3Zsa2JpYFpscWBoJyknYGtkZ2lgVWlkZmBtamlhYHd2Jz9xd3BgeCUl
```

Test card: `4242 4242 4242 4242` (any future date, any CVC)
