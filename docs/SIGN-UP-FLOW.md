# Sign-Up Flow

How end-users sign up for developer apps using Dream API.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DEV'S APP                           SIGN-UP WORKER                      │
│                                                                         │
│ 1. User clicks "Get Started"                                            │
│         │                                                               │
│         ▼                                                               │
│ 2. getSignUpUrl({ redirect: '/choose-plan' })                          │
│         │                                                               │
│         └──────────────────────► 3. /signup?pk=xxx&redirect=xxx        │
│                                         │                               │
│                                         ▼                               │
│                                  4. Clerk hosted signup                 │
│                                    (email or OAuth)                     │
│                                         │                               │
│                                         ▼                               │
│                                  5. POST /oauth/complete                │
│                                    - Set publicMetadata                 │
│                                    - Sync to D1                         │
│                                    - Create sign-in token               │
│                                         │                               │
│ 6. /choose-plan?__clerk_ticket=xxx  ◄───┘                              │
│         │                                                               │
│         ▼                                                               │
│ 7. SDK consumes ticket (clerk.client.signIn)                           │
│         │                                                               │
│         ▼                                                               │
│ 8. User is signed in with plan='free'                                  │
│         │                                                               │
│         ▼                                                               │
│ 9. Auto-checkout or plan selection                                     │
│         │                                                               │
│         ▼                                                               │
│ 10. Dashboard (paid member)                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## The Critical Fix (clerk.client.signIn)

The `__clerk_ticket` mechanism requires using the correct Clerk API path:

```javascript
// WRONG - clerk.signIn doesn't exist on CDN-loaded Clerk!
clerk.signIn.create({ strategy: 'ticket', ticket })

// CORRECT - must use clerk.client.signIn
clerk.client.signIn.create({ strategy: 'ticket', ticket })
```

This is the key insight that makes cross-domain sign-in work.

## Sign-Up Worker Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/signup?pk=xxx&redirect=url` | GET | Show Clerk signup form |
| `/` | GET | Handle Clerk callback (OAuth/email verification) |
| `/oauth/complete` | POST | Set metadata, create sign-in token |

### Worker Flow Detail

1. **Initial Request**: Dev app redirects to `/signup?pk=xxx&redirect=/choose-plan`
2. **Cookie Set**: Worker stores `{pk, redirect}` in cookie (survives OAuth redirect)
3. **Clerk Signup**: User signs up via embedded Clerk component
4. **Callback**: Clerk redirects back to worker (same domain = session exists)
5. **Complete**: Worker detects signed-in user, calls `/oauth/complete`
6. **Redirect**: Worker redirects to dev app with `__clerk_ticket` param

### What Gets Set

**Clerk publicMetadata:**
```json
{
  "publishableKey": "pk_test_xxx",
  "plan": "free"
}
```

**D1 Tables:**
- `end_users`: clerkUserId, email, publishableKey, platformId
- `usage_counts`: initial record with usageCount=0

## SDK Ticket Consumption

The SDK (`dream-sdk/src/clerk.ts`) automatically handles ticket consumption:

```typescript
// SDK detects ticket in URL
const ticket = new URLSearchParams(window.location.search).get('__clerk_ticket');

if (ticket) {
  // Use clerk.client.signIn (NOT clerk.signIn!)
  const signInObj = clerk.client?.signIn;

  if (signInObj && clerk.setActive) {
    const result = await signInObj.create({ strategy: 'ticket', ticket });

    if (result.status === 'complete' && result.createdSessionId) {
      await clerk.setActive({ session: result.createdSessionId });
      // User is now signed in!
    }
  }
}
```

## Debug Console Output

Successful flow shows:
```
[SignUp] Clerk loaded, user: user_xxx          ← Worker detected signed-in user
[SignUp] Response: {success: true, signInToken: xxx}  ← Token created
[SignUp] Redirecting to: http://localhost:5173/choose-plan?__clerk_ticket=xxx

[DreamAPI] URL: http://localhost:5173/choose-plan?__clerk_ticket=xxx
[DreamAPI] Ticket present: YES
[DreamAPI] signIn available: false client.signIn: true setActive: true
[DreamAPI] Consuming ticket...
[DreamAPI] Ticket result: complete sess_xxx
[DreamAPI] Session activated!
[DreamAPI] User hydrated: true
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `client.signIn: false` | Clerk not fully initialized | Increase wait time in SDK |
| `Ticket present: NO` | Worker didn't add token | Check /oauth/complete response |
| `Ticket error: expired` | Token TTL is 5 minutes | User took too long, retry |
| `Ticket error: already used` | Token is single-use | Don't refresh page with ticket |
| `404 on /` | Worker not handling callback | Check signup cookie exists |
| Redirected to landing | Ticket not consumed (rare) | SDK handles this - check console logs |

## Template Redirect Pattern

Both `/dashboard` and `/choose-plan` work because the SDK consumes the ticket synchronously in `clerk.load()` before `isReady` becomes true.

```typescript
// ✓ Works - SDK consumes ticket before isReady=true
dreamAPI.auth.getSignUpUrl({ redirect: '/dashboard' })

// ✓ Also works - has extra ticket-wait safety code
dreamAPI.auth.getSignUpUrl({ redirect: '/choose-plan' })
```

**Recommended by template type:**
- **SaaS**: `/choose-plan` if user picks tier, `/dashboard` if auto-checkout
- **Store**: `/` (guest checkout, no auth needed)
- **Membership**: `/dashboard` (auto-checkout to single tier)

## Clerk Test Credentials

For automated testing without captcha:
- **Email**: `anything+clerk_test@example.com`
- **Verification code**: `424242`

## Key Files

| File | Purpose |
|------|---------|
| `sign-up/src/index.ts` | Sign-up worker |
| `dream-sdk/src/clerk.ts` | SDK Clerk manager with ticket consumption |
| `templates/*/ChoosePlanPage.tsx` | Handles post-signup redirect |

## Deploy Commands

```bash
# Deploy sign-up worker
cd sign-up && npx wrangler deploy

# Publish SDK (after changes)
cd dream-sdk
npm version patch --no-git-tag-version
npm run build
npm publish --access public

# Update app to use new SDK
cd your-app
rm -rf node_modules/.vite  # Clear Vite cache!
npm install @dream-api/sdk@latest
npm run dev
```
