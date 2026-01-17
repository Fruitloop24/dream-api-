# Next.js SaaS Template - OAuth Sign-Up Fix

## The Problem

OAuth sign-up was broken. Email sign-up worked fine, but OAuth would:
1. Complete sign-up successfully (metadata set: `plan: 'free'`, `publishableKey: 'pk_test_xxx'`)
2. Redirect back to `/choose-plan?__clerk_ticket=xxx`
3. **Immediately redirect to landing page** instead of showing choose-plan

User was signed up, JWT had the plan, but the app didn't recognize it.

## Root Causes Found

### 1. Outdated SDK (MAJOR)
Template had SDK version `0.1.5`, but latest was `0.1.21`.

The SDK handles ticket consumption in `clerk.ts`:
```typescript
// SDK detects ticket, consumes it, waits for user to hydrate
if (ticket && signInObj && clerk.setActive) {
  const result = await signInObj.create({ strategy: 'ticket', ticket });
  if (result.status === 'complete') {
    await clerk.setActive({ session: result.createdSessionId });
    // Wait for user to hydrate...
  }
}
```

Older SDK versions had incomplete ticket handling - `auth.init()` returned before Clerk finished processing the ticket.

**Fix:** `npm install @dream-api/sdk@latest` (now 0.1.21)

### 2. Wrong Auth Check in Template
Template was checking `isSignedIn` which requires BOTH `clerk.user && clerk.session`:

```typescript
// OLD - Too strict
if (isReady && !isSignedIn) {
  router.push('/');  // Redirects even when we have user data!
}
```

But `user` data (with plan from JWT) can be available even if session isn't fully ready.

**Fix:** Just check `user`:
```typescript
// NEW - Simple
if (isReady && !user) {
  router.push('/');
}
```

## What Was Changed

### 1. Updated SDK
```bash
npm install @dream-api/sdk@latest
```
Version: 0.1.5 → 0.1.21

### 2. Simplified choose-plan/page.tsx
```typescript
// Before
const { api, isReady, isSignedIn, user } = useDreamAPI();

useEffect(() => {
  if (isReady && !isSignedIn && !user) {
    router.push('/');
  }
}, [isReady, isSignedIn, user, router]);

if (!isSignedIn && !user) {
  return null;
}

// After
const { api, isReady, user } = useDreamAPI();

useEffect(() => {
  if (isReady && !user) {
    router.push('/');
  }
}, [isReady, user, router]);

if (!user) {
  return null;
}
```

### 3. Simplified dashboard/page.tsx
Same pattern - removed all `isSignedIn` checks, just use `user`.

### 4. Cleaned useDreamAPI.tsx
Removed debug logging and retry hacks. SDK should handle everything now.

## Why This Should Work

The flow is now simple:

```
1. User clicks Sign Up (OAuth)
2. → sign-up worker → Clerk OAuth → metadata set
3. → Redirect to /choose-plan?__clerk_ticket=xxx
4. → SDK loads, sees ticket
5. → SDK consumes ticket: clerk.client.signIn.create({ strategy: 'ticket', ticket })
6. → SDK waits for clerk.user to hydrate
7. → auth.init() returns
8. → getUser() returns { email, plan: 'free', ... }
9. → Template checks: user exists? YES → show page
```

No session check needed. We have the user, we have the plan from JWT. Done.

## Console Logs to Watch

With SDK 0.1.21, you should see:
```
[DreamAPI] URL: http://localhost:3000/choose-plan?__clerk_ticket=xxx
[DreamAPI] Ticket present: YES
[DreamAPI] signIn available: false client.signIn: true setActive: true
[DreamAPI] Consuming ticket...
[DreamAPI] Ticket result: complete sess_xxx
[DreamAPI] Session activated!
[DreamAPI] User hydrated: true
```

If ticket consumption fails, you'll see:
```
[DreamAPI] FAILED to get signIn object! Ticket NOT consumed.
```

## Test Plan

### Test 1: OAuth Sign-Up (Google)
1. Go to http://localhost:3000
2. Click "Get Started"
3. Choose Google OAuth
4. Complete sign-up
5. **Expected:** Lands on /choose-plan, shows "Current plan: FREE"
6. Select Free plan
7. **Expected:** Goes to /dashboard, shows user email

### Test 2: Email Sign-Up
1. Go to http://localhost:3000
2. Click "Get Started"
3. Use email: `test+clerk_test@example.com`
4. Verification code: `424242`
5. **Expected:** Same flow as OAuth

### Test 3: Sign Out and Sign In
1. From dashboard, sign out
2. Click "Sign In"
3. Sign in with same account
4. **Expected:** Goes directly to /dashboard

### Test 4: Direct Dashboard Access (Not Signed In)
1. Clear cookies/storage
2. Go directly to http://localhost:3000/dashboard
3. **Expected:** Redirects to landing page

## If It Still Fails

Check browser console for `[DreamAPI]` logs:

| Log | Meaning |
|-----|---------|
| `Ticket present: NO` | Ticket not in URL - sign-up worker issue |
| `client.signIn: false` | Clerk not ready - SDK timing issue |
| `Ticket error: expired` | User took >5 min - retry sign-up |
| `Ticket error: already used` | Page refreshed - don't refresh with ticket |
| `User hydrated: false` | Clerk didn't return user - Clerk issue |

## Files Changed

| File | Change |
|------|--------|
| `package.json` | SDK version bump |
| `lib/useDreamAPI.tsx` | Removed debug code |
| `app/choose-plan/page.tsx` | Simplified to check `user` only |
| `app/dashboard/page.tsx` | Simplified to check `user` only |
