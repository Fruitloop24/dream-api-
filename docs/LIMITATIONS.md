# Dream API - Limitations & Considerations

## Current Limitations

### Scale

| Component | Limit | Notes |
|-----------|-------|-------|
| D1 writes | ~10k/sec | Usage tracking writes per request |
| D1 reads | ~100k/sec | Adequate for most workloads |
| KV reads | ~100k/sec | Used for caching, rate limiting |
| Workers | 50ms CPU / request | Cloudflare limit |

**Bottom line:** Good for indie/startup scale. Enterprise-level traffic (millions of writes/sec) would need architecture changes (batch writes, queue-based tracking).

### Features Not Yet Implemented

- [ ] Facebook OAuth (Google works via Clerk)
- [ ] Metered billing (pay-per-use) - currently fixed tiers only
- [ ] Multi-currency - USD only
- [ ] Team/organization accounts
- [ ] API versioning
- [ ] Audit logs
- [ ] Custom domains for sign-up worker
- [ ] Webhook retry UI in dashboard

### Known Constraints

1. **Single Clerk App for All End-Users**
   - All developers' customers share one Clerk instance
   - Isolated by `publishableKey` in metadata
   - Works well, but no per-developer Clerk customization

2. **Stripe Connect Required**
   - Developers must connect their Stripe account
   - No alternative payment processors

3. **Usage Reset**
   - Monthly periods only
   - No weekly/annual options yet

4. **Rate Limiting**
   - Per-user, not per-endpoint
   - 60 requests/minute default
   - Requires USAGE_KV binding (gracefully skipped if missing)

5. **Cross-Domain Auth via Tickets**
   - Sign-up uses `__clerk_ticket` param for cross-domain session
   - Tickets expire in 5 minutes and are single-use
   - If user refreshes before ticket consumed, they must sign in again
   - See `docs/SIGN-UP-FLOW.md` for details

### Security Considerations

1. **Sign-up redirect parameter** - FIXED
   - Now properly escaped with JSON.stringify()
   - Open redirect is low risk (auth happens first)
   - Can add allowlist later if needed

2. **X-Publishable-Key override** - PROTECTED
   - All queries use platformId AND publishableKey
   - AND condition prevents cross-platform access
   - Low risk: requires SK which is already god-mode

3. **JWT Clock Skew**
   - 5-minute tolerance for clock differences
   - Standard practice, acceptable tradeoff

### Clerk API Quirks

1. **CDN-Loaded Clerk: `clerk.client.signIn` not `clerk.signIn`**
   - When Clerk is loaded via CDN script (not npm), `signIn` lives at `clerk.client.signIn`
   - SDK uses CDN loading for cross-domain compatibility
   - This caused auth failures until fixed in `dream-sdk/src/clerk.ts`
   - See `docs/SIGN-UP-FLOW.md` for details

2. **Dev Mode Callback Path**
   - Clerk dev mode redirects to `/` with `__clerk_db_jwt` param
   - Clerk prod mode redirects to `/callback`
   - Sign-up worker handles BOTH paths

### What's NOT a Limitation

- **PK in frontend** - By design, same as Stripe
- **Single database** - D1 handles it fine at current scale
- **No Redis** - KV serves same purpose for caching
- **No queue** - Webhooks are synchronous but idempotent

## Comparison to Alternatives

| Feature | Dream API | Auth0 | Firebase | Stripe |
|---------|-----------|-------|----------|--------|
| Auth | Clerk (included) | Core product | Core product | Sessions only |
| Billing | Stripe Connect | Add-on | Add-on | Core product |
| Usage tracking | Built-in | Manual | Manual | Metered billing |
| Multi-tenant | Built-in | Manual | Manual | N/A |
| Self-hosted | Cloudflare only | Yes | No | No |
| Pricing | Your margin | Per MAU | Per operation | % of transactions |

## When NOT to Use Dream API

1. **Enterprise scale** - Millions of users, need dedicated infrastructure
2. **Custom auth flows** - Need SAML, LDAP, custom providers
3. **Non-Stripe payments** - Need PayPal, crypto, local processors
4. **Offline-first apps** - Need sync, conflict resolution
5. **Real-time features** - Need WebSockets, presence

## Roadmap Considerations

**Completed:**
- ~~Redirect allowlist validation~~ → Fixed with JSON.stringify, low risk
- ~~X-Publishable-Key override validation~~ → Protected by AND condition
- ~~Subscription enforcement~~ → API blocked when dev subscription expires (7-day grace)
- ~~Cross-domain sign-in~~ → Fixed `clerk.client.signIn` (not `clerk.signIn`) for CDN-loaded Clerk

**High Value, Low Effort:**
- USAGE_KV binding documentation
- End-user count enforcement in sign-up worker

**High Value, Medium Effort:**
- Metered billing support (Stripe meters)
- Multi-currency
- Webhook retry UI

**High Value, High Effort:**
- Team/org accounts (Clerk Organizations)
- Custom domains
- Self-service Clerk customization
