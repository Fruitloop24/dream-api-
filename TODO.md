# Dream API Roadmap

## Phase 1: Platform Billing (IN PROGRESS)

Platform billing = how devs pay us $19/mo + overage.

### Stripe Setup (Manual in Dashboard)
- [ ] Create product: Dream API Pro
- [ ] Create price: $19/mo base subscription (14-day trial)
- [ ] Create price: $0.03/unit metered (end-user overage)
- [ ] Create Billing Meter: `end_user_count`
- [ ] Add webhook endpoint for platform-billing worker

### front-auth-api Billing Features (DONE)
- [x] Schema migration (add columns to platforms table)
- [x] POST /create-checkout - Dev subscription checkout
- [x] POST /billing-portal - Dev billing portal
- [x] GET /subscription - Dev subscription status + usage info
- [x] POST /webhook/stripe - Handle subscription events (stores in D1)
- [x] Daily cron - Report end-user counts to Stripe Meter
- [ ] Deploy updated worker

### Frontend Dashboard Updates
- [ ] Add billing section for devs
- [ ] Show subscription status, trial countdown
- [ ] Show live end-user count and estimated overage
- [ ] Billing portal link

---

## Phase 2: Landing Page
- [ ] Redo landing page
  - [ ] Link to GitHub (open source templates)
  - [ ] Link to live demo sites (SaaS + Store templates)
  - [ ] Promote free templates
  - [ ] Quick start section (AI-focused)

## Phase 3: Documentation
- [ ] Admin docs (SK-required calls)
- [ ] SDK quick starts by framework:
  - [ ] React - 4 end-user calls
  - [ ] Next.js - 4 end-user calls
  - [ ] Vue - 4 end-user calls
  - [ ] Admin calls for each framework

## Phase 4: Launch
- [ ] Demo videos for templates
- [ ] Product Hunt launch prep
- [ ] Launch
- [ ] Verify `clerkFrontendApi` in `dream-sdk/src/auth.ts`

---

## Completed

### Templates
- [x] dream-saas-basic - React SaaS starter
- [x] dream-store-basic - React e-commerce
- [x] Theme system (light/dark toggle)
- [x] Accent colors
- [x] /setup command for AI-assisted config
- [x] /pwa command for installable apps
- [x] CLAUDE.md for each template

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
