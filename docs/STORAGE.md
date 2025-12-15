# Storage Layout (D1 + KV)

## D1 Tables
```
platforms(platformId, clerkUserId, createdAt)
api_keys(platformId, projectId, projectType, publishableKey, secretKeyHash, status, mode, name, createdAt)
stripe_tokens(platformId, stripeUserId, accessToken, refreshToken, scope, mode, createdAt)
tiers(platformId, projectId, projectType, name, displayName, price, limit, priceId, productId, features, popular, inventory, soldOut, mode, createdAt)
end_users(platformId, projectId, publishableKey, clerkUserId, email, status, createdAt, updatedAt)
usage_counts(platformId, projectId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
subscriptions(platformId, projectId, userId, publishableKey, plan, priceId, productId, amount, currency, status, currentPeriodEnd, canceledAt, cancelReason, subscriptionId, stripeCustomerId, updatedAt)
events(platformId, source, type, eventId UNIQUE, payload_json, createdAt)
```

## KV (owner/platform scope – PLATFORM_TOKENS_KV)
- `user:{userId}:platformId` → plt_xxx (bidirectional mirrors)
- `user:{userId}:publishableKey:{mode}` → pk_...
- `user:{userId}:secretKey:{mode}` → sk_... (legacy, platform-wide)
- `user:{userId}:products:{mode}` → [{ priceId, productId }]
- `project:{projectId}:{mode}:publishableKey` → pk_... (owner-only)
- `project:{projectId}:{mode}:secretKey` → sk_... (owner-only)
- `publishablekey:{pk}:platformId` → platformId
- `secretkey:{hash}:publishableKey` → pk_...

## KV (api-multi scope – CUSTOMER_TOKENS_KV)
- `platform:{platformId}:tierConfig:{mode}` → { tiers: [...] }
- `platform:{platformId}:tierConfig` → live fallback
- `publishablekey:{pk}:platformId` → platformId
- `secretkey:{hash}:publishableKey` → pk_...
- `platform:{platformId}:stripeToken:{mode}` → { accessToken, stripeUserId }

## Project/Filtering Model
- All data is scoped by `platformId`, then `projectId`, then `projectType` (saas|store), and `mode` (test|live).
- Dashboard/config should pass `X-Project-Id` (or query param) and use the project’s secret key per mode.
