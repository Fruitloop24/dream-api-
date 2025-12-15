# Current state and changes made

- Goal: make the dashboard switch cleanly between multiple projects (publishable keys) without cross-contaminating tiers/customers/usage.
- Flow remains: platformId = owner, publishableKey = project, mode = test/live. Dashboard/API auth still uses the secret key; pk is used as a filter hint.

## Backend (api-multi)
- Added optional `X-Publishable-Key` header handling for:
  - `/api/dashboard`, `/api/products`, `/api/data`, `/api/usage`, and cart checkout.
  - Passes pk into tier/price loaders so queries scope to `platformId + publishableKey + mode`.
- Config loader now accepts `publishableKey` and filters tiers when provided.
- CORS updated to allow `X-Publishable-Key`.
- Note: Legacy `projectId` branches still exist; we have not removed them yet.

## Frontend (dashboard)
- `/projects` response now includes per-project secret from KV (`pk:{publishableKey}:secretKey`).
- Dashboard fetches send `X-Publishable-Key` and prefer the per-project secret; fallback to mode-based secret to avoid empty panels when KV lacks pk-specific secret.
- Clears local dashboard/customer state on project switch to avoid showing old customer detail.

## Remaining issues observed
- Older project (first test) shows correct usage/customers but tiers missing; webhook recent events also not filtered correctly.
- Likely causes: (a) missing pk-scoped secret in KV for that project, so fallback secret may be wrong, or (b) data rows without publishableKey set (legacy rows with NULL publishableKey). Dashboard now scopes by pk, so rows missing pk will be filtered out.

## Proposed next steps
1) Verify secrets in KV for each project:
   - Keys stored at `pk:{publishableKey}:secretKey` in PLATFORM_TOKENS_KV. If absent, rehydrate from `/projects` or D1/Clerk metadata and repopulate KV.
2) Inspect D1 rows for tiers/subscriptions/end_users for affected project:
   - Check if `publishableKey` column is NULL; if so, backfill publishableKey for those rows.
3) Once confirmed, remove legacy `projectId` filtering and require `publishableKey` in queries to reduce ambiguity.
4) If desired, add a dashboard auth path that uses a signed token instead of the secret key in the browser (would remove secret exposure entirely).

## Deployment status
- All changes have been deployed; issues persist:
  - Older project still missing tiers and mixed webhook recents.
  - Likely missing pk-scoped secret in KV for that project or legacy rows with NULL publishableKey.
  - Events query still platformId-only; needs pk filter to isolate webhook recents.
