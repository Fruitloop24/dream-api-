# Dream API - Repository Context

Quick reference for AI assistants working in this codebase.

## What This Is

API-as-a-Service platform. Developers use our API to add auth, billing, and usage tracking to their apps. We charge $19/mo + overage.

## Architecture Summary

```
Developer's App
    │
    └─► @dream-api/sdk (npm)
            │
            ├─► api-multi (main API)
            ├─► sign-up (end-user signup)
            └─► Clerk + Stripe Connect
```

## Key Workers

| Worker | Purpose | Key Files |
|--------|---------|-----------|
| `api-multi` | Main API - usage, billing, products | `src/index.ts`, `src/routes/` |
| `sign-up` | End-user signup flow | `src/index.ts` (~400 lines) |
| `front-auth-api` | Dev auth, platform billing | `src/index.ts`, `src/webhook.ts` |
| `oauth-api` | Stripe Connect, tier management | `src/index.ts`, `src/routes/` |
| `admin-dashboard` | Internal metrics | `src/index.ts` |

## SDK Structure

```
dream-sdk/src/
├── index.ts      # Main DreamAPI class
├── client.ts     # HTTP client with auth
├── auth.ts       # URL helpers
├── clerk.ts      # Clerk SDK + ticket consumption (CRITICAL: uses clerk.client.signIn)
└── types.ts      # TypeScript types
```

## Templates (Separate Repos)

| Template | Type | GitHub |
|----------|------|--------|
| dream-saas-basic | React SaaS | Fruitloop24/dream-saas-basic |
| dream-saas-next | Next.js SaaS | Fruitloop24/dream-saas-next |
| dream-store-basic | React Store | Fruitloop24/dream-store-basic |
| dream-store-next | Next.js Store | Fruitloop24/dream-store-next |
| dream-membership-basic | React Membership | Fruitloop24/dream-membership-basic |
| dream-membership-next | Next.js Membership | Fruitloop24/dream-membership-next |

Templates are gitignored - they're separate repos cloned locally for development.

## Critical Knowledge

### Sign-Up Flow (docs/SIGN-UP-FLOW.md)

**The `clerk.client.signIn` fix is critical:**
```typescript
// WRONG - clerk.signIn doesn't exist on CDN-loaded Clerk!
clerk.signIn.create({ strategy: 'ticket', ticket })

// CORRECT - must use clerk.client.signIn
clerk.client.signIn.create({ strategy: 'ticket', ticket })
```

### Auth Pattern

1. New users: `api.auth.getSignUpUrl({ redirect: '/choose-plan' })` - goes through sign-up worker
2. Returning users: `api.auth.getSignInUrl()` - direct to Clerk
3. Account settings: `clerk.openUserProfile()` or `api.auth.getCustomerPortalUrl()`

**Always redirect to `/choose-plan` not `/dashboard`** to avoid ProtectedRoute race conditions.

### Key/JWT Model

- `pk_xxx` - Publishable key (frontend safe)
- `sk_xxx` - Secret key (backend only)
- JWT contains: `userId`, `plan`, `publishableKey`
- Plan is set by webhooks, not spoofable

### Database

Single D1 database: `dream-api-ssot`

Key tables:
- `platforms` - Developer accounts
- `api_keys` - Project credentials
- `tiers` - Pricing tiers/products
- `end_users` - End-users per project
- `usage_counts` - Monthly usage tracking
- `subscriptions` - User subscriptions

## Documentation Index

| Doc | When to Read |
|-----|--------------|
| `docs/SIGN-UP-FLOW.md` | Debugging auth/signup issues |
| `docs/SDK-GUIDE.md` | SDK methods and patterns |
| `docs/API-REFERENCE.md` | Endpoint details |
| `docs/ARCHITECTURE.md` | System overview |
| `docs/D1-SCHEMA.md` | Database schema |
| `docs/LIMITATIONS.md` | Known constraints |
| `CLAUDE.md` | Full technical reference |

## Common Tasks

### Deploy a worker
```bash
cd worker-name && npx wrangler deploy
```

### Publish SDK
```bash
cd dream-sdk
npm version patch --no-git-tag-version
npm run build
npm publish --access public
```

### Test sign-up flow
Use Clerk test credentials:
- Email: `anything+clerk_test@example.com`
- Verification code: `424242`

## What NOT to Do

1. Don't modify `useDreamAPI.tsx` in templates - it's wired to SDK
2. Don't redirect sign-up to `/dashboard` - use `/choose-plan`
3. Don't use `clerk.signIn` - use `clerk.client.signIn`
4. Don't hardcode prices - they come from API
5. Don't put SK in frontend code
