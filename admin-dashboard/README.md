# Admin Dashboard

Internal admin dashboard for Dream API platform monitoring.

## Overview

Simple Cloudflare Worker that displays:
- Developer counts (total, paying, trialing)
- MRR and overage revenue
- End-user counts (live vs test)
- Per-developer breakdown with emails

## Tech Stack

- **Runtime**: Cloudflare Worker (TypeScript)
- **Database**: D1 (shared `dream-api-ssot`)
- **Auth**: Cloudflare Access (email whitelist)
- **Frontend**: Inline HTML + vanilla JS (no framework)

## Metrics Displayed

| Metric | Description |
|--------|-------------|
| Total Devs | All registered platforms |
| Paying Devs | `status = 'active'` (actually paying $19/mo) |
| Trialing | `status = 'trialing'` (free trial, not paying yet) |
| MRR | Paying devs × $19 |
| Est. Overage | Sum of (live_users - 2000) × $0.03 per dev |
| Live End-Users | Users with `pk_live_%` keys |
| Test End-Users | Users with `pk_test_%` keys (free forever) |
| Devs with Users | Actually building something |
| Avg Users/Dev | Live users ÷ devs with live users |

## Tabs

- **All** - Everyone
- **Paying** - `active` status only (real revenue)
- **Trialing** - Free trial users
- **With Users** - Devs who have end-users
- **Empty** - Signed up but no activity

## Color Coding

| Color | Meaning |
|-------|---------|
| Green | < 1000 live users (safe) |
| Yellow | 1000-2000 (approaching limit) |
| Red | > 2000 (generating overage) |

## Security

Protected by Cloudflare Access email whitelist:
- Only whitelisted emails can access
- Requires email verification (one-time code)
- No passwords to manage/leak

### Setup Cloudflare Access

1. Go to **Cloudflare Dashboard** → **Zero Trust** → **Access** → **Applications**
2. Click **Add an application** → **Self-hosted**
3. Configure:
   - Application name: `Admin Dashboard`
   - Session Duration: `24 hours`
   - Application domain: `admin-dashboard.k-c-sheffield012376.workers.dev`
4. Add policy:
   - Policy name: `Email whitelist`
   - Action: `Allow`
   - Include: Emails → `k.c.sheffield012376@gmail.com`
5. Save

## Environment Variables

| Variable | Description | Set via |
|----------|-------------|---------|
| `CLERK_SECRET_KEY` | Fetches dev emails from Clerk | `wrangler secret put` |

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev
# → http://localhost:8790

# Deploy
npm run deploy
```

## API Endpoint

`GET /api/data` returns JSON:

```json
{
  "totals": {
    "total_platforms": 25,
    "paying_platforms": 2,
    "trialing_platforms": 7,
    "total_live_users": 101,
    "total_test_users": 16,
    "mrr": 38,
    "estimatedOverage": 0
  },
  "platforms": [
    {
      "platformId": "plt_xxx",
      "email": "dev@example.com",
      "subscriptionStatus": "active",
      "live_users": 150,
      "test_users": 10,
      "trialEndsAt": null,
      "createdAt": "2026-01-08"
    }
  ]
}
```

## Data Source

Queries the shared `dream-api-ssot` D1 database:
- `platforms` table - developer accounts
- `end_users` table - end-user counts by publishableKey

Emails fetched from Clerk API using `clerkUserId`.
