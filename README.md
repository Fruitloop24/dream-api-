# dream-api

**Auth + Billing + Usage Tracking as an API**

Stop building authentication and billing infrastructure. Just hit our API.

---

## The Pitch

> "Don't trust me - trust Clerk (auth leader), Stripe (payments leader), and Cloudflare (20% of internet traffic). I'm just the glue that wires them together so you don't have to."

**What you get:**
- ✅ **Authentication** - Clerk JWT validation (best-in-class auth)
- ✅ **Usage Tracking** - Per-user counters with tier limits
- ✅ **Billing** - Stripe checkout + customer portal
- ✅ **Dashboard** - See your users, revenue, and API usage
- ✅ **Edge Performance** - Cloudflare Workers (no cold starts, true edge)
- ✅ **Security** - No database, no SSH, minimal attack surface

**What you don't build:**
- ❌ Auth infrastructure
- ❌ Billing webhooks
- ❌ Usage tracking logic
- ❌ Tier limit enforcement
- ❌ Rate limiting
- ❌ Subscription management

---

## Why This Exists

**The Problem:**
Every SaaS developer rebuilds the same boring infrastructure:
- Set up Clerk/Auth0 ($25/mo)
- Integrate Stripe webhooks (10 hours of pain)
- Build usage tracking (database + counters)
- Deploy API server (Vercel/Railway: $20/mo)
- Maintain it forever

**Total cost:** $70/mo + 10 hours setup + ongoing maintenance

**The Solution:**
Just use our API.

```javascript
// 5 lines of code, $29/mo, done.
import DreamAPI from '@dream-api/client';

const api = new DreamAPI('pk_live_your_key');
await api.trackUsage(userId);
await api.createCheckout(userId, 'pro');
```

---

## How It Works

### The Architecture

```
Your App
  ↓
dream-api (Cloudflare Workers)
  ↓
├─ Clerk (validates JWTs)
├─ Stripe (handles billing)
└─ KV Storage (tracks usage, enforces limits)
```

**Multi-tenant on one Clerk app:**
- Each developer gets a `platformId` (e.g., `plt_abc123`)
- Their config stored in KV: `platform:plt_abc123:config`
- Their users tracked in KV: `usage:plt_abc123:user_xyz`
- All isolated, all on the edge, all fast

**Why KV instead of a database:**
- ⚡ Edge reads <10ms (vs 50-200ms for databases)
- 💰 Nearly free ($0.50 per million reads)
- 🔒 No SQL injection, no connection pools, no migrations
- 🌍 Replicated globally (Cloudflare's edge network)

---

## Current Status

**Origin Story:**
1. Started as open-source SaaS template
2. Made auto-deploy tool (help devs deploy easily)
3. Added preview system (multi-tenant with KV)
4. Realized: "Wait, why deploy instances? Just sell the API!"

**What We Have (copied from previous iteration):**
- ✅ Multi-tenant API worker (api-multi)
- ✅ Clerk JWT authentication
- ✅ Stripe checkout/webhooks/portal
- ✅ Usage tracking with KV
- ✅ Rate limiting (100 req/min per user)
- ✅ CORS handling
- ✅ Tier config loading from KV

**What Needs Work:**
- 🔨 API key authentication (currently uses Clerk JWT only - needs dual mode)
- 🔨 Developer registration endpoint
- 🔨 Product creation helper (Stripe API wrapper)
- 🔨 Developer dashboard (simple signup/stats UI)
- 🔨 Documentation cleanup (remove old auto-deploy stuff)

---

## Directory Structure

```
dream-api/
├── api-multi/           # Main API (Cloudflare Worker)
│                        # Handles: auth, usage tracking, billing
│                        # STATUS: Needs API key auth + dev endpoints
│
├── frontend/            # Developer dashboard (React + Vite)
│                        # Will show: API key, usage stats, revenue
│                        # STATUS: Needs rebuild (currently old builder UI)
│
├── front-auth-api/      # Dashboard authentication (Cloudflare Worker)
│                        # Validates Clerk JWTs for dashboard access
│                        # STATUS: Works as-is (stays separate)
│
├── oauth-api/           # OAuth handler (might not need)
│                        # Originally for GitHub/Stripe/CF OAuth
│                        # STATUS: Evaluate if needed (Stripe Connect?)
│
├── CLAUDE.md            # Development guide (detailed architecture)
└── README.md            # This file (project overview)
```

---

## Revenue Model

**Developer Pricing:**
- $29/mo - Basic (up to 10k API calls/mo)
- $79/mo - Pro (up to 100k API calls/mo)
- $199/mo - Scale (up to 1M API calls/mo)

**Your Costs (at 100 developers):**
- Clerk: FREE (up to 10k MAU)
- Cloudflare Workers: FREE (up to 100k req/day)
- KV Storage: ~$10/mo
- **Total: ~$10-20/mo**

**Profit Margin: 95%+**

**At 100 devs × $29 = $2,900/mo revenue - $20/mo costs = $2,880/mo profit**

---

## The Value Proposition

### For Indie Developers:
> "I just want to build my product, not rebuild auth and billing for the 10th time."

### For Agencies:
> "We build 5-10 SaaS apps per year. This saves us 10 hours per project."

### For Startups:
> "We need to ship fast. $29/mo to skip the boring infrastructure? Sold."

---

## Security Model

**You DON'T store:**
- ❌ Passwords (Clerk does)
- ❌ Payment info (Stripe does)
- ❌ Sensitive user data (developer's app does)

**You DO store:**
- ✅ API keys (hashed)
- ✅ Usage counters (non-sensitive)
- ✅ Platform configs (tier limits, pricing)

**Attack Surface:**
- No database to SQL inject
- No servers to SSH into
- No passwords to breach
- Just KV lookups and JWT validation

**Built on proven infrastructure:**
- Cloudflare (20% of internet traffic, battle-tested security)
- Clerk (used by thousands of companies)
- Stripe (processes billions in payments)

---

## Why Cloudflare Edge?

**Traditional API (Vercel/Railway/AWS):**
- Cold starts: 500ms-2s
- Database latency: 50-200ms
- Regional deployment: Users far from server = slow
- Cost: $20-50/mo for basic hosting

**Cloudflare Workers + KV:**
- No cold starts (0ms)
- KV reads: <10ms (replicated to 300+ cities)
- Global deployment: Request hits nearest edge
- Cost: FREE up to 100k req/day

**Real-world performance:**
- Auth check: ~15ms (JWT validation + KV lookup)
- Usage tracking: ~20ms (KV read + write)
- Total API latency: **30-50ms** (vs 200-500ms traditional)

---

## Next Steps

**Phase 1: Core API (2-3 weeks)**
1. Add API key authentication (dual mode: API key OR Clerk JWT)
2. Developer registration endpoint (POST /api/developer/register)
3. Product creation helper (POST /api/developer/create-products)
4. Clean up code comments (remove old project references)

**Phase 2: Dashboard (1-2 weeks)**
1. Rebuild frontend as simple signup/dashboard
2. Show API key, usage stats, revenue
3. Deploy to Cloudflare Pages

**Phase 3: Go to Market (1 week)**
1. Write documentation (API reference, quickstart)
2. Create npm package (@dream-api/client)
3. Launch on ProductHunt/Twitter

**Total time to MVP: 4-6 weeks**

---

## Technical Decisions

### Why One Clerk App (Not Per-Developer Orgs)?

**Option A: Metadata-based (CHOSEN):**
- One Clerk app, use `publicMetadata.platformId` for namespacing
- FREE tier (up to 10k MAU)
- Simple to implement
- Scales to thousands of developers

**Option B: Organizations:**
- Each developer gets a Clerk organization
- Requires Clerk Pro ($25/mo)
- More complex
- Only needed if developers want direct Clerk dashboard access

**Decision:** Start with Option A, migrate if needed.

### Why KV Instead of a Database?

**KV Pros:**
- Edge-replicated (global reads <10ms)
- Nearly free ($0.50 per million reads)
- No connection pools, no migrations
- Eventually consistent (fine for usage counters)

**KV Cons:**
- Not suitable for complex queries
- Eventually consistent (1-2 second sync across edge)

**Our Use Case:**
- Simple key-value lookups (`usage:{userId}`, `platform:{id}:config`)
- No joins, no transactions needed
- Perfect fit for KV

---

## Development Commands

```bash
# Start API locally
cd api-multi && npm run dev

# Start dashboard locally
cd frontend && npm run dev

# View KV data
wrangler kv:key list --binding=TOKENS_KV --prefix="platform:"
wrangler kv:key get "platform:plt_abc123:config" --binding=TOKENS_KV

# Deploy API
cd api-multi && wrangler deploy

# Deploy dashboard
cd frontend && npm run build && wrangler pages deploy dist
```

---

## Questions?

See `CLAUDE.md` for detailed architecture, code structure, and implementation notes.

---

*Last Updated: 2025-11-26*
*Status: Pivoting from auto-deploy platform → API-as-a-Service*
*Origin: Open-source template → Auto-deploy tool → Hosted platform → **API product***
