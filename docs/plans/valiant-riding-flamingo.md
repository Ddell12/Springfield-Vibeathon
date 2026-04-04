# Fix Sign-In Flow End-to-End

## Context

The Clerk → @convex-dev/auth migration (commit `c86f801`) shipped to prod but broke the demo accounts and exposed raw internal errors to users. Two things are broken:

1. **Demo accounts don't exist** — `scripts/seed-demo.ts` creates users via `api.clerk.com/v1`. Clerk is gone; those API calls do nothing useful now. `slp@bridges.ai` and `parent@bridges.ai` have never been created in @convex-dev/auth.

2. **Raw error shown to users** — When sign-in fails, @convex-dev/auth throws `InvalidAccountId`. `claude-sign-in-card.tsx:39` shows `err.message` directly, so users see a full stack trace instead of "Invalid email or password."

The redirect logic (SLP → `/builder`, caregiver → `/family`) is already correct in `dashboard/page.tsx` and the sidebar — it just never gets exercised because no one can sign in.

---

## What NOT to Change

- `convex/auth.ts` — Password + Google + Apple providers are configured correctly
- `convex/demo_seed.ts` — `seedDemoData` args and logic are fine; just needs correct Convex user IDs
- `convex/http.ts` — `auth.addHttpRoutes(http)` already registers the sign-up/sign-in HTTP endpoint
- `src/app/(app)/dashboard/page.tsx` — Role-based redirect is correct
- `convex/users.ts::setUserRole` — Already works; callable via `npx convex run`

---

## Implementation Plan

### Task 1: Map auth errors to friendly messages
**File:** `src/features/auth/components/claude-sign-in-card.tsx`

Add a helper `mapAuthError(raw: string): string` above the component:

```typescript
function mapAuthError(raw: string): string {
  if (/InvalidAccountId|account.*not.*found/i.test(raw))
    return "Invalid email or password.";
  if (/InvalidSecret|incorrect.*password|invalid.*password/i.test(raw))
    return "Invalid email or password.";
  if (/already.*exists|duplicate/i.test(raw))
    return "An account with this email already exists. Try signing in instead.";
  if (/rate.*limit/i.test(raw))
    return "Too many attempts. Please wait a moment and try again.";
  return "Something went wrong. Please try again.";
}
```

Replace lines 39-41 in `handleSubmit`:
```typescript
// Before
const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";

// After
const message = err instanceof Error ? mapAuthError(err.message) : "Something went wrong. Please try again.";
```

Apply the same `mapAuthError` wrapper in `handleGoogle` (line 52) and `handleApple` (line 58) catch blocks.

---

### Task 2: Add `getByEmail` internal query to users.ts
**File:** `convex/users.ts`

The seed script needs to look up Convex user IDs after sign-up. Add:

```typescript
import { internalQuery } from "./_generated/server";

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
  },
});
```

This is callable via `npx convex run users:getByEmail '{"email":"..."}'` with the deploy key.

---

### Task 3: Rewrite seed-demo.ts for @convex-dev/auth
**File:** `scripts/seed-demo.ts`

Replace the entire `upsertClerkUser` function and Clerk-specific logic. The new flow:

```
1. POST ${CONVEX_SITE_URL}/api/auth/signin  (flow: signUp)  →  account created
2. If sign-up fails with "already exists" → that's fine, account exists, skip
3. npx convex run users:getByEmail         →  get Convex user ID
4. npx convex run users:setUserRole        →  set caregiver role for parent account
5. npx convex run demo_seed:seedDemoData   →  seed all demo data (existing helper)
```

Key changes:

**Remove:** `CLERK_SECRET_KEY` env check, `clerkFetch()`, `upsertClerkUser()`

**Add:** `signUpAccount(email, password, name)` — hits @convex-dev/auth HTTP endpoint:
```typescript
async function signUpAccount(siteUrl: string, email: string, password: string, name: string) {
  const body = new URLSearchParams({
    provider: "password",
    params: JSON.stringify({ email, password, flow: "signUp", name }),
  });
  const res = await fetch(`${siteUrl}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual", // Don't follow redirects
  });
  // 200, 302, or 400 "already exists" are all acceptable outcomes
  if (res.status >= 500) {
    throw new Error(`Auth sign-up failed: ${res.status} ${await res.text()}`);
  }
  console.log(`  Sign-up for ${email}: ${res.status}`);
}
```

**Add:** `convexRunJson(fn, args)` — typed wrapper around `execSync('npx convex run ...')` that returns parsed JSON output.

**New env requirement:** `CONVEX_SITE_URL` (the HTTP actions URL, e.g. `https://[hash].convex.site`). Add check alongside `NEXT_PUBLIC_CONVEX_URL`. If absent, derive it: the HTTP site URL is typically the `NEXT_PUBLIC_CONVEX_URL` with `.convex.cloud` replaced by `.convex.site`.

**New `main()`:**
```typescript
async function main() {
  loadEnv();
  const siteUrl = process.env.CONVEX_SITE_URL ?? deriveConvexSiteUrl();

  // 1. Create accounts
  await signUpAccount(siteUrl, DEMO.slp.email, DEMO.slp.password, "Dr. Sarah Mitchell");
  await signUpAccount(siteUrl, DEMO.caregiver.email, DEMO.caregiver.password, "Jamie Rivera");

  // 2. Get Convex user IDs
  const slpUser   = convexRunJson("users:getByEmail", { email: DEMO.slp.email });
  const cgUser    = convexRunJson("users:getByEmail", { email: DEMO.caregiver.email });

  if (!slpUser?._id || !cgUser?._id) throw new Error("Could not find created users");

  // 3. Set caregiver role
  convexRun("users:setUserRole", { userId: cgUser._id, role: "caregiver" });

  // 4. Seed demo data (existing function, same args)
  convexRun("demo_seed:seedDemoData", {
    slpUserId: slpUser._id,
    caregiverUserId: cgUser._id,
    caregiverEmail: DEMO.caregiver.email,
  }, reset);
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/auth/components/claude-sign-in-card.tsx` | Add `mapAuthError()`, apply to all 3 catch blocks |
| `convex/users.ts` | Add `getByEmail` internalQuery |
| `scripts/seed-demo.ts` | Replace Clerk API calls with @convex-dev/auth HTTP sign-up + `npx convex run` calls |

---

## Verification

### 1. Error messages (local, no auth required)
- Try signing in with a nonexistent email at `localhost:3000/sign-in`
- Expect: "Invalid email or password." (not a stack trace)
- Try signing in with wrong password for a real account
- Expect: same friendly message

### 2. Seed script
```bash
npm run seed:demo
# Expect: both accounts created (or skipped if already exist), caregiver role set, demo data seeded
npm run seed:demo -- --reset
# Expect: data wiped and reseeded cleanly
```

### 3. Sign-in flow E2E on prod
```bash
agent-browser open https://vocali.health/sign-in
# Sign in as slp@bridges.ai / BridgesDemo2026!
# Expect: redirect → /dashboard → /builder
# Sign out, sign in as parent@bridges.ai / BridgesDemo2026!
# Expect: redirect → /dashboard → /family
```

### 4. Verify via Convex dashboard
- Confirm `authAccounts` table has entries for both emails
- Confirm `users` table has `role: "caregiver"` for `parent@bridges.ai`
- Confirm `patients` table has Ace Rivera + Maya Chen seeded

---

## Notes

- `CONVEX_SITE_URL` may not be in `.env.local` — it's distinct from `NEXT_PUBLIC_CONVEX_URL`. Add `CONVEX_SITE_URL=https://[deployment].convex.site` to `.env.local` if the derivation heuristic doesn't work.
- The @convex-dev/auth HTTP sign-up endpoint may redirect (302) on success — use `redirect: "manual"` and treat 3xx as success.
- `seedDemoData` is idempotent — safe to run multiple times; passes `reset: true` only when `--reset` flag is passed.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
