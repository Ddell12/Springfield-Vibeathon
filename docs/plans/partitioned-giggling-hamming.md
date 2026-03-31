# Fix: Email and Google Sign-In Flow

## Context

`@clerk/nextjs@7.0.7` ships Clerk Core 3, which introduced a new `signIn.sso()` method for OAuth
flows with different parameter semantics. The existing `handleGoogle()` uses the old
`signIn.create({ strategy: "oauth_google", redirectUrl, actionCompleteRedirectUrl })` pattern,
which maps parameters incorrectly for Core 3 and may not trigger the browser redirect to Google.

Core 3 also added a new sign-in status `needs_client_trust` that sits between email verification
and `"complete"`. If this is enabled on the Clerk dashboard, `handleVerify()` would show
"Your sign-in isn't complete yet" for all successful verifications.

The `sso-callback` page also renders a Clerk client component without `"use client"`, which can
cause RSC hydration warnings in strict environments.

---

## Critical Files

| File | Change |
|------|--------|
| `src/features/auth/components/claude-sign-in-card.tsx` | Fix Google OAuth API + handle `needs_client_trust` |
| `src/app/sso-callback/[[...sso-callback]]/page.tsx` | Add `"use client"` |

---

## Implementation Plan

### 1. Fix Google OAuth — switch from `signIn.create()` to `signIn.sso()`

**File:** `src/features/auth/components/claude-sign-in-card.tsx` — `handleGoogle()` (line 229)

Old (broken) call:
```ts
const { error } = await signIn.create({
  strategy: "oauth_google",
  redirectUrl,                          // was the callback URL
  actionCompleteRedirectUrl: AUTH_REDIRECT_URL,  // doesn't exist on sso() params
});
```

New call using Core 3 `sso()`:
```ts
const { error } = await signIn.sso({
  strategy: "oauth_google",
  redirectCallbackUrl: redirectUrl,     // the /sso-callback URL
  redirectUrl: AUTH_REDIRECT_URL,       // final destination (/dashboard)
});
```

Parameter mapping (Core 3 vs old):
- `redirectUrl` in `create()` → `redirectCallbackUrl` in `sso()` (the OAuth callback URL)
- `actionCompleteRedirectUrl` in `create()` → `redirectUrl` in `sso()` (final destination)

### 2. Handle `needs_client_trust` status in email verification

**File:** `src/features/auth/components/claude-sign-in-card.tsx` — `handleVerify()` (line 191)

After `signIn.emailCode.verifyCode()` succeeds, add a check for the new Core 3 status before
the existing `"complete"` check. If status is `needs_client_trust`, finalize anyway (Clerk
handles the trust flow internally via `finalize()`).

```ts
// Before:
if (signIn.status === "complete") {
  await finalizeSignIn();
  return;
}

// After:
if (signIn.status === "complete" || signIn.status === "needs_client_trust") {
  await finalizeSignIn();
  return;
}
```

### 3. Add `"use client"` to sso-callback page

**File:** `src/app/sso-callback/[[...sso-callback]]/page.tsx`

`AuthenticateWithRedirectCallback` is a Clerk client component that runs browser-side OAuth
completion. The page needs the directive to opt into client rendering:

```tsx
"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
```

---

## Verification

1. **Google OAuth**: Click "Continue with Google" on `/sign-in` → browser should navigate to
   Google's auth consent screen. After Google consent, should redirect back to `/sso-callback`
   then to `/dashboard`.

2. **Email sign-in**: Enter email, receive code, enter code → should navigate to `/dashboard`.

3. **SLP sign-up transfer**: Enter a new SLP email → verify code → should trigger transfer
   to sign-up flow (step moves to "requirements" step) then to `/dashboard`.

4. No console errors on `/sso-callback` about hydration or missing `"use client"`.
