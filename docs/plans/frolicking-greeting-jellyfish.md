# Fix Three Code Review Issues

## Context

Three bugs surfaced in a code review of the new `ClaudeSignInCard` auth component and `MarketingHeader`:
- Two TypeScript compilation blockers (P1s) that will break CI/builds
- One broken marketing nav link (P2) that sends anonymous visitors to a protected route

---

## Fix 1 — P1: Remove `error.errors` access in `handleVerify`

**File:** `src/features/auth/components/claude-sign-in-card.tsx` (lines 169–184)

**Problem:** `signIn.emailCode.verifyCode()` returns `Promise<{ error: ClerkError | null }>`. `ClerkError` (base class) has no `.errors` property — only `ClerkAPIResponseError` (subclass) does. Accessing `error.errors?.[0]?.code` on the base type causes `tsc --noEmit` to fail.

**Fix:**
1. Import `isClerkAPIResponseError` from `@clerk/nextjs` at the top of the file.
2. In `handleVerify`, narrow the error with:
   ```ts
   if (isClerkAPIResponseError(error)) {
     const firstCode = error.errors[0]?.code;
     // existing transfer / caregiver logic
   }
   ```
   If the error is not a `ClerkAPIResponseError`, fall through to `getClerkErrorMessage` as today.

---

## Fix 2 — P1: Remove unsupported `"name"` field checks

**File:** `src/features/auth/components/claude-sign-in-card.tsx` (lines 211–213, 256–263)

**Problem:** `SignUpField` is `SignUpAttributeField | SignUpIdentificationField`. `SignUpAttributeField` only contains `'first_name' | 'last_name' | 'password' | 'legal_accepted'` — there is no `"name"` literal in the union. Calling `.includes("name")` or comparing `field === "name"` against a `SignUpField[]` causes a TypeScript error.

**Fix:**
- Line 211–213: Delete the `if (missingFields.includes("name"))` block entirely.
- Lines 256 & 263 (JSX): Remove `|| field === "name"` from both `.some()` predicates.
  - The first name input condition becomes `field === "first_name"` only.
  - The last name input condition becomes `field === "last_name"` only.

Clerk does not send a synthetic `"name"` field — `first_name` / `last_name` already cover the requirement.

---

## Fix 3 — P2: Point "Pricing" nav link at a public route

**Files:**
- `src/shared/components/marketing-header.tsx` (line 22)
- New: `src/app/(marketing)/pricing/page.tsx`

**Problem:** `/billing` is in the `isProtectedRoute` matcher in `src/proxy.ts`. Anonymous visitors clicking "Pricing" are redirected to sign-in.

**Fix:**
1. Create `src/app/(marketing)/pricing/page.tsx` — a simple public page containing the `PlanComparisonCard` component (`src/features/billing/components/plan-comparison-card.tsx`) with a CTA to sign up. No auth required; sits inside the existing `(marketing)` layout.
2. In `marketing-header.tsx`, change the nav entry from `{ href: "/billing", label: "Pricing" }` to `{ href: "/pricing", label: "Pricing" }`.

No changes to `src/proxy.ts` needed — `/pricing` is not in the protected matcher.

---

## Verification

1. `npx tsc --noEmit` — should produce zero errors relating to `SignUpField` or `ClerkError.errors`
2. Open `/pricing` while signed out — should render without redirect
3. Open `/billing` while signed out — should still redirect to sign-in (proxy unchanged)
4. Sign-in flow with a new SLP email — `handleVerify` `sign_up_if_missing_transfer` path should still trigger transfer correctly
