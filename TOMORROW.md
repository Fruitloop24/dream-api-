# What's Next - 2025-11-27

## 🎯 Today We Accomplished

✅ **Usage tracking implemented in front-auth-api**
- Free tier: 5 API calls/month
- Paid tier: 500 API calls/month
- Monthly billing period resets
- Rate limiting: 100 req/min
- All endpoints wrapped with tracking

✅ **KV namespaces created**
- 4 separate namespaces (total isolation)
- front-auth-api: USAGE_KV + TOKENS_KV
- api-multi: USAGE_KV + TOKENS_KV

✅ **Webhook handler integrated**
- Stripe checkout.session.completed
- Updates JWT plan from 'free' to 'paid'
- Idempotency checking

✅ **Local dev environment working**
- front-auth-api: http://localhost:8788
- frontend: http://localhost:5173
- Auth flow tested and working

---

## 🚀 Tomorrow's Plan

### Priority 1: Dashboard UI (frontend)

**Show usage stats:**
```typescript
// After API call, display in dashboard:
{
  usage: {
    count: 3,
    limit: 5,
    plan: 'free',
    remaining: 2,
    periodStart: '2025-11-01',
    periodEnd: '2025-11-30'
  }
}
```

**Components needed:**
- Usage progress bar (3/5 calls)
- Upgrade prompt when limit hit
- Plan badge (FREE/PAID)
- Current billing period display

### Priority 2: Preview Mode Strategy

**The Big Question:** How do developers try the API?

**Current thinking:**
- Use existing preview-api worker (your AI demo system)
- Free tier gets preview link with YOUR Stripe
- Preview mode = watermarked + limited to 100 end-users
- Paid tier = production mode + THEIR Stripe via OAuth

**Next steps:**
1. Wire up preview link generation
2. Show preview URL in dashboard
3. Add "Try Demo" button on landing page

### Priority 3: Clerk JWT Template

**Create in Clerk dashboard:**
- Template name: `dream-api`
- Claims: `{ "plan": "{{user.public_metadata.plan}}" }`
- Set default metadata on signup: `{ "plan": "free" }`

### Priority 4: Frontend Cleanup

**Current state:**
- Dashboard shows subscribe button ✅
- Off-center layout (needs CSS fix)
- Missing usage stats display
- Missing tier config UI
- Missing preview link

---

## 💡 Key Decisions Made

1. **Preview vs Production:**
   - Preview = Free tier + YOUR Stripe + Watermarked
   - Production = Paid tier + THEIR Stripe (OAuth)

2. **Multi-tenant approach:**
   - One Clerk app for all
   - One set of YOUR Stripe keys for previews
   - Customer Stripe keys stored per platformId

3. **Pricing strategy:**
   - Free: 5 API calls/month (prove value)
   - Paid: $29/mo for 500 calls (host their preview)
   - Customer charges their users however they want

---

## 🔧 Technical Debt

- [ ] Remove old "PLUG SAAS" comments from api-multi
- [ ] Update CORS regex in front-auth-api (remove fact-saas references)
- [ ] Add TypeScript types file for shared interfaces
- [ ] Add error handling for KV failures
- [ ] Add retry logic for Clerk API calls

---

## 📝 Notes for Tomorrow

**You mentioned:**
- "I have the prev-api stuff that did all the AI demo backends"
- "Was going to let them pull in frontend code with AI md to protect routers"
- "They keep what they want, just don't mess up the protected parts"

**This suggests:**
- Give them the preview API worker code
- Protected routes = your auth/billing logic (don't touch)
- Customizable routes = their business logic (change freely)
- Frontend code = open source with attribution

**Tomorrow we should:**
1. Look at your preview-api code
2. Figure out how to merge it with api-multi
3. Add "protected route" markers
4. Create frontend template they can fork

---

## 🎨 UI Mockup Ideas

**Dashboard Layout:**
```
┌────────────────────────────────────────┐
│ dream-api Dashboard                    │
├────────────────────────────────────────┤
│                                        │
│  Usage This Month                      │
│  ███████░░░  3 / 5 calls               │
│  FREE PLAN  [Upgrade to 500 calls →]  │
│                                        │
│  Preview Link:                         │
│  https://preview.dream-api.com/plt_... │
│  [Copy] [Try Demo]                     │
│                                        │
│  API Key:                              │
│  pk_live_abc123...  [Copy] [Rotate]   │
│                                        │
│  Billing Period: Nov 1 - Nov 30        │
│                                        │
└────────────────────────────────────────┘
```

---

## ✅ Quick Wins for Tomorrow

1. **5 min:** Fix dashboard centering CSS
2. **10 min:** Add usage stats display
3. **15 min:** Add "Upgrade" CTA when near limit
4. **20 min:** Show preview link (even if it doesn't work yet)
5. **30 min:** Create Clerk JWT template

---

*Ready to crush it tomorrow! 🔥*
*Current status: Backend solid, frontend needs love*
