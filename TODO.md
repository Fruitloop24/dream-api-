# Dream API Roadmap

## Phase 1: Platform Billing (DONE)

Platform billing = how devs pay us $19/mo + overage.

### Stripe Setup (DONE)
- [x] Create product: Dream API Pro
- [x] Create price: $19/mo base subscription (14-day trial)
- [x] Create metered price: graduated pricing (first 2000 @ $0, then $0.03/user)
- [x] Create Billing Meter: `end_user_count`
- [x] Add webhook endpoint for platform-billing worker
- [x] Configure TEST mode credentials
- [x] Configure LIVE mode credentials

### front-auth-api Billing Features (DONE)
- [x] Schema migration (add columns to platforms table)
- [x] POST /create-checkout - Dev subscription checkout
- [x] POST /billing-portal - Dev billing portal
- [x] GET /subscription - Dev subscription status + usage info
- [x] POST /webhook/stripe - Handle subscription events (stores in D1)
- [x] Daily cron - Report end-user counts to Stripe Meter
- [x] Deploy secrets (STRIPE_PRICE_ID_METERED, STRIPE_METER_EVENT_NAME)

### Frontend Dashboard Updates
- [ ] Add billing section for devs
- [ ] Show subscription status, trial countdown
- [ ] Show live end-user count and estimated overage
- [ ] Billing portal link
- [ ] Fix polling glitch on dashboard pages

---

## Phase 2: Landing Page (DONE)

- [x] Config-driven branding system (config.ts)
- [x] Theme system (light/dark) for all pages
- [x] Accent color system (6 options)
- [x] Landing page redesigned with config
- [x] Templates page (/templates) with downloads
- [x] GitHub links (Fruitloop24 org)
- [x] AI commands explained (/setup, /pwa)
- [x] Quick start section
- [ ] Demo site URLs (pending deployment)

## Phase 3: Admin Dashboard
- [ ] Admin route (email whitelist)
- [ ] Query all platforms (same D1, no publishableKey filter)
- [ ] View all devs, subscriptions, usage
- [ ] Basic metrics (total devs, MRR, usage)

## Phase 4: Testing & Polish
- [ ] Test Stripe meter billing end-to-end
- [ ] Test PWA on templates
- [ ] Add QR code for PWA download guidance
- [ ] Deploy demo sites:
  - [ ] SaaS demo (existing)
  - [ ] Store demo (Jasper Bridges)
- [ ] Deploy frontend to Cloudflare Pages

## Phase 5: Documentation
- [ ] Admin docs (SK-required calls)
- [ ] SDK quick starts by framework:
  - [ ] React - 4 end-user calls
  - [ ] Next.js - 4 end-user calls
  - [ ] Vue - 4 end-user calls
  - [ ] Admin calls for each framework

## Phase 6: Launch
- [ ] Demo videos for templates
- [ ] Product Hunt launch prep
- [ ] Launch
- [ ] Verify `clerkFrontendApi` in `dream-sdk/src/auth.ts`

---

## Completed

### Frontend (dream-api dashboard)
- [x] Config-driven branding (config.ts)
- [x] Theme + accent color system
- [x] Landing page redesigned
- [x] Templates page with downloads
- [x] Sign-in/sign-up pages centered
- [x] Header navigation (Dashboard, Templates, Docs)
- [x] CLAUDE.md for frontend

### Templates
- [x] dream-saas-basic - React SaaS starter
- [x] dream-store-basic - React e-commerce
- [x] Theme system (light/dark toggle)
- [x] Accent colors
- [x] /setup command for AI-assisted config
- [x] /pwa command for installable apps
- [x] CLAUDE.md for each template
- [x] GitHub repos: Fruitloop24/dream-saas-basic, Fruitloop24/dream-store-basic

### SDK
- [x] @dream-api/sdk on npm
- [x] Auth (sign up, sign in, customer portal)
- [x] Billing (checkout, portal)
- [x] Usage tracking
- [x] Products (list, cart checkout)
- [x] Tiers (list)

### Workers
- [x] api-multi (main API)
- [x] oauth-api (Stripe Connect)
- [x] front-auth-api (dev auth)
- [x] sign-up (end-user signup)

### Stripe Platform Billing
- [x] Product: Dream API Pro ($19/mo + 14-day trial)
- [x] Metered pricing: graduated (first 2000 @ $0, then $0.03/user)
- [x] Billing Meter: end_user_count
- [x] TEST credentials configured
- [x] LIVE credentials configured
- [x] Secrets deployed to front-auth-api

### Security Fixes
- [x] OAuth /authorize requires Clerk JWT
- [x] Sign-up worker validates session tokens
- [x] XSS fix in redirect handling
- [x] Usage table name consistency

### Documentation
- [x] ARCHITECTURE.md - Platform billing flow
- [x] API-REFERENCE.md - Platform billing endpoints
- [x] SDK-GUIDE.md
- [x] HYPE.md
- [x] PROJECT-CONTEXT.md

---

## Pricing Model

| Who | Pays | Amount | Method |
|-----|------|--------|--------|
| Dev → Us | $19/mo | Base subscription | Stripe direct |
| Dev → Us | $0.03/user | After 2,000 live SaaS users | Stripe Billing Meter |
| End-user → Dev | Tier price | Subscription/purchase | Stripe Connect (direct) |

**Key:** We only bill devs. End-user payments go straight to dev's Stripe.

---

## Cleanup
- [ ] Delete test-paywall directory
