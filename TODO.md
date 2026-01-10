# Dream API - Launch Checklist

## What's Left

### Pre-Launch (Do Now)
- [ ] Deploy Store demo site
- [ ] Set official domain for frontend (CF Pages dashboard)
- [ ] **SDK: Update hardcoded API URL** before npm publish (see DEPLOY.md)
- [ ] Test Stripe meter billing end-to-end
- [ ] Delete test-paywall directory

### Launch
- [ ] Demo videos for templates
- [ ] Product Hunt launch prep
- [ ] Launch

---

## Completed Phases

| Phase | Status |
|-------|--------|
| Platform Billing ($19/mo + overage) | ✅ Done |
| Landing Page (config-driven, themes) | ✅ Done |
| Admin Dashboard (CF Access protected) | ✅ Done |
| Documentation (Docs.tsx with AI Prompt) | ✅ Done |
| Frontend deployed (clerk-frontend.pages.dev) | ✅ Done |
| SaaS demo site | ✅ Done |
| Polling glitch fix | ✅ Done |

---

## Key Files for Launch

| What | Where |
|------|-------|
| SDK API URL | `dream-sdk/src/client.ts` - **MUST UPDATE** |
| Worker secrets | `.dev.vars` files (gitignored) |
| Deploy guide | `DEPLOY.md` |
| Frontend config | `frontend/src/config.ts` |

---

## Pricing Model

| Who | Pays | Amount |
|-----|------|--------|
| Dev → Us | $19/mo base | Stripe direct |
| Dev → Us | $0.03/user after 2,000 | Stripe Billing Meter |
| End-user → Dev | Tier price | Stripe Connect (direct) |

---

## Workers (5 total)

| Worker | Purpose |
|--------|---------|
| api-multi | Main API (usage, billing, products) |
| oauth-api | Stripe Connect, tier management |
| front-auth-api | Dev auth, platform billing |
| sign-up | End-user signup with metadata |
| admin-dashboard | Internal metrics (CF Access) |
