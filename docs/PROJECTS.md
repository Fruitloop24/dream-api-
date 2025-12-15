# Project-Scoped Keys & Projects

## Why
- Each project gets its own keyset and products (no mixing SaaS/Store under one key).
- Test and Live exist per project.
- Dashboard and config need to scope data by project to avoid blended metrics/customers.

## Data Model
- projects(projectId, platformId, name, type, createdAt)
- api_keys: add projectId, projectType, mode
- tiers/products: add projectId, projectType, mode
- KV (owner, PLATFORM_TOKENS_KV):
  - project:{projectId}:{mode}:publishableKey
  - project:{projectId}:{mode}:secretKey
- KV (customer/API_MULTI):
  - platform:{platformId}:tierConfig:{mode} (unchanged)

## Key Generation (oauth-api)
- /create-products accepts projectName + projectType, creates products/prices, generates pk/sk per mode.
- Stores pk/sk in D1 (hashed sk) and KV per project/mode for owner retrieval.

## Owner Retrieval (front-auth-api)
- GET /projects → [{ projectId, name, type, keys: [{ publishableKey, secretKey, mode }] }]
- POST /projects/rotate-key → rotates sk for a project/mode (no grace period) and updates KV/D1.

## Dashboard Usage
- Fetch /projects to list projects and obtain project sk per mode.
- For selected project:
  - Call api-multi with project sk + X-Project-Id for /api/dashboard, /api/products, etc.
  - Show only tabs matching projectType (saas vs store).
- Legacy single keys remain for backward compatibility.

## Remaining Wiring
- api-multi: propagate projectId to subscriptions/end_users/usage; filter dashboard by project; optional live totals endpoint.
- Frontend: project keys panel, rotate-key button, live-only totals view, store UI polish.
