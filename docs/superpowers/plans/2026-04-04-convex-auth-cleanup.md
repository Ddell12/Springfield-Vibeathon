# Convex Auth Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining Clerk-specific code, config, tests, and documentation from Bridges, and finish the migration so auth behavior is consistently implemented through `@convex-dev/auth`.

**Architecture:** The repo already uses Convex Auth for the live app shell, sign-in UI, middleware, and most backend identity checks. This plan is a second-pass cleanup focused on stale Clerk references that still affect runtime correctness, local setup, tests, seeding, and operational docs. The only behavior change should be replacing Clerk-era assumptions with direct Convex Auth and `users` table reads.

**Tech Stack:** Next.js 16 App Router, Convex, `@convex-dev/auth`, Vitest, Playwright, Zod env validation.

---

## Audit Summary

The current codebase is partially migrated. These areas still carry Clerk assumptions:

- Runtime config still requires Clerk env vars in [`src/env.ts`](/Users/desha/Springfield-Vibeathon/src/env.ts).
- Example envs still document Clerk keys in [`.env.example`](/Users/desha/Springfield-Vibeathon/.env.example).
- One backend action still parses `identity.public_metadata` like a Clerk JWT in [`convex/email.ts`](/Users/desha/Springfield-Vibeathon/convex/email.ts).
- One API route test still mocks `@clerk/nextjs/server` in [`src/app/api/tools/infer-template/__tests__/route.test.ts`](/Users/desha/Springfield-Vibeathon/src/app/api/tools/infer-template/__tests__/route.test.ts).
- E2E config/specs still refer to Clerk users, Clerk setup, and Clerk DOM in several files under [`tests/e2e/`](/Users/desha/Springfield-Vibeathon/tests/e2e) and [`playwright.config.ts`](/Users/desha/Springfield-Vibeathon/playwright.config.ts).
- Seed tooling still assumes pre-created Clerk accounts in [`scripts/seed-e2e.ts`](/Users/desha/Springfield-Vibeathon/scripts/seed-e2e.ts) and comments in [`convex/demo_seed.ts`](/Users/desha/Springfield-Vibeathon/convex/demo_seed.ts).
- Contributor docs still describe Clerk as the live auth system in [`AGENTS.md`](/Users/desha/Springfield-Vibeathon/AGENTS.md), [`CLAUDE.md`](/Users/desha/Springfield-Vibeathon/CLAUDE.md), and [`CHANGELOG.md`](/Users/desha/Springfield-Vibeathon/CHANGELOG.md).

## File Map

### Modify
- [`src/env.ts`](/Users/desha/Springfield-Vibeathon/src/env.ts) — remove Clerk env validation and add only current auth envs actually used by Convex Auth.
- [`.env.example`](/Users/desha/Springfield-Vibeathon/.env.example) — replace Clerk keys with Convex Auth-era envs and current E2E credentials.
- [`convex/email.ts`](/Users/desha/Springfield-Vibeathon/convex/email.ts) — stop reading Clerk `public_metadata`; use the shared auth helper or direct `users` lookup.
- [`src/app/api/tools/infer-template/__tests__/route.test.ts`](/Users/desha/Springfield-Vibeathon/src/app/api/tools/infer-template/__tests__/route.test.ts) — replace Clerk mock with current auth boundary mock.
- [`playwright.config.ts`](/Users/desha/Springfield-Vibeathon/playwright.config.ts) — remove Clerk-specific setup commentary/dependency naming.
- [`tests/e2e/helpers.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/helpers.ts) — rename Clerk timeout constant/comment.
- [`tests/e2e/dashboard.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/dashboard.spec.ts) — remove `E2E_CLERK_*` gating.
- [`tests/e2e/mobile.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/mobile.spec.ts) — remove `E2E_CLERK_*` gating.
- [`tests/e2e/my-tools.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/my-tools.spec.ts) — remove `E2E_CLERK_*` gating.
- [`tests/e2e/navigation.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/navigation.spec.ts) — remove Clerk env guard and Clerk DOM selectors.
- [`tests/e2e/settings.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/settings.spec.ts) — remove `E2E_CLERK_*` gating.
- [`tests/e2e/caregiver.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/caregiver.spec.ts) — update fixture comments to Convex Auth terminology.
- [`scripts/seed-e2e.ts`](/Users/desha/Springfield-Vibeathon/scripts/seed-e2e.ts) — seed by email/password-era users, not Clerk IDs.
- [`convex/demo_seed.ts`](/Users/desha/Springfield-Vibeathon/convex/demo_seed.ts) — remove Clerk-specific comments.
- [`convex/e2e_seed.ts`](/Users/desha/Springfield-Vibeathon/convex/e2e_seed.ts) — update comments/examples to current user identifiers.
- [`convex/lib/auth.ts`](/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts) — remove Clerk-specific comments around identifier handling.
- [`src/app/(play)/family/[patientId]/play/layout.tsx`](/Users/desha/Springfield-Vibeathon/src/app/(play)/family/[patientId]/play/layout.tsx) — update provider comment.
- [`src/test/setup.ts`](/Users/desha/Springfield-Vibeathon/src/test/setup.ts) — remove Clerk-specific test comments if still stale.
- [`convex/__tests__/app_state.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/app_state.test.ts) — normalize test issuer string.
- [`convex/__tests__/appointments.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/appointments.test.ts) — normalize remaining `issuer: "clerk"` fixtures.
- [`convex/__tests__/tools.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/tools.test.ts) — normalize remaining `issuer: "clerk"` fixtures.
- [`convex/__tests__/speechCoach.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/speechCoach.test.ts) — normalize remaining `issuer: "clerk"` fixtures.
- [`AGENTS.md`](/Users/desha/Springfield-Vibeathon/AGENTS.md) — update repo instructions to Convex Auth.
- [`CLAUDE.md`](/Users/desha/Springfield-Vibeathon/CLAUDE.md) — update contributor guide to Convex Auth.
- [`CHANGELOG.md`](/Users/desha/Springfield-Vibeathon/CHANGELOG.md) — correct current auth history summary.

### Verify Only
- [`src/core/providers.tsx`](/Users/desha/Springfield-Vibeathon/src/core/providers.tsx)
- [`src/app/layout.tsx`](/Users/desha/Springfield-Vibeathon/src/app/layout.tsx)
- [`src/proxy.ts`](/Users/desha/Springfield-Vibeathon/src/proxy.ts)
- [`convex/auth.ts`](/Users/desha/Springfield-Vibeathon/convex/auth.ts)
- [`convex/auth.config.ts`](/Users/desha/Springfield-Vibeathon/convex/auth.config.ts)
- [`src/features/auth/components/claude-sign-in-card.tsx`](/Users/desha/Springfield-Vibeathon/src/features/auth/components/claude-sign-in-card.tsx)

## Task 1: Remove Clerk Env Surface

**Files:**
- Modify: [`src/env.ts`](/Users/desha/Springfield-Vibeathon/src/env.ts)
- Modify: [`.env.example`](/Users/desha/Springfield-Vibeathon/.env.example)

- [ ] **Step 1: Remove Clerk env keys from typed validation**

Delete these server/client fields from [`src/env.ts`](/Users/desha/Springfield-Vibeathon/src/env.ts):

```ts
CLERK_SECRET_KEY: z.string().min(1),
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),
```

and remove the matching `runtimeEnv` mappings.

- [ ] **Step 2: Keep only auth envs the app still uses**

If auth env validation is still needed, validate current Convex Auth-era vars only, for example:

```ts
server: {
  ANTHROPIC_API_KEY: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  FAL_KEY: z.string().optional(),
  CONVEX_DEPLOYMENT: z.string().min(1),
}
```

Do not add speculative auth keys unless they are actually read in app code.

- [ ] **Step 3: Rewrite the auth block in [`.env.example`](/Users/desha/Springfield-Vibeathon/.env.example)**

Replace the Clerk block with a Convex Auth-era block, e.g.:

```dotenv
# Auth - Convex Auth
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
SITE_URL=http://localhost:3000
CONVEX_SITE_URL=http://localhost:3000

# E2E testing
E2E_SLP_EMAIL=
E2E_SLP_PASSWORD=
E2E_CAREGIVER_EMAIL=
E2E_CAREGIVER_PASSWORD=
```

Match the final keys to what the repo actually reads today. If `SITE_URL` or `CONVEX_SITE_URL` are documented elsewhere under a different name, keep docs consistent.

- [ ] **Step 4: Verify no Clerk env names remain in live code**

Run:

```bash
rg -n 'CLERK_|NEXT_PUBLIC_CLERK' src convex tests scripts .env.example
```

Expected: no results except historical docs you intentionally have not updated yet.

## Task 2: Fix Runtime Auth Logic Still Using Clerk Metadata

**Files:**
- Modify: [`convex/email.ts`](/Users/desha/Springfield-Vibeathon/convex/email.ts)

- [ ] **Step 1: Replace Clerk metadata parsing in `sendVideoCallInvite`**

Remove this block:

```ts
const raw = (identity as Record<string, unknown>).public_metadata;
let role: string | null = null;
if (typeof raw === "string") {
  try { role = (JSON.parse(raw) as { role?: string }).role ?? null; } catch { role = null; }
} else if (raw && typeof raw === "object") {
  role = ((raw as { role?: string }).role) ?? null;
}
if (role !== null && role !== "slp") {
  throw new ConvexError("Only SLPs can send session invites");
}
```

- [ ] **Step 2: Use the shared role helper instead**

Prefer the existing helper from [`convex/lib/auth.ts`](/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts):

```ts
import { getAuthRole } from "./lib/auth";
```

Then gate with:

```ts
const role = await getAuthRole(ctx);
if (role !== null && role !== "slp") {
  throw new ConvexError("Only SLPs can send session invites");
}
```

If `getAuthRole` is not callable from an action context because of its typing, widen its context type once in [`convex/lib/auth.ts`](/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts) instead of duplicating auth lookup logic.

- [ ] **Step 3: Preserve the booking URL identity contract**

Keep this behavior unchanged unless a separate auth/user-ID migration is intended:

```ts
const bookingUrl = `${APP_URL}/sessions/book/${identity.subject}`;
```

This cleanup task is not the place to change patient/session ownership ID formats unless the existing route is already broken.

- [ ] **Step 4: Verify no runtime code still reads Clerk-only auth claims**

Run:

```bash
rg -n 'public_metadata|Clerk|@clerk|useUser\\(|useClerk\\(|currentUser\\(' src convex
```

Expected: no Clerk auth API usage in runtime files.

## Task 3: Update API and Unit Tests to the Current Auth Boundary

**Files:**
- Modify: [`src/app/api/tools/infer-template/__tests__/route.test.ts`](/Users/desha/Springfield-Vibeathon/src/app/api/tools/infer-template/__tests__/route.test.ts)
- Modify: [`src/app/api/livekit/token/__tests__/route.test.ts`](/Users/desha/Springfield-Vibeathon/src/app/api/livekit/token/__tests__/route.test.ts)
- Modify: [`convex/__tests__/app_state.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/app_state.test.ts)
- Modify: [`convex/__tests__/appointments.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/appointments.test.ts)
- Modify: [`convex/__tests__/tools.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/tools.test.ts)
- Modify: [`convex/__tests__/speechCoach.test.ts`](/Users/desha/Springfield-Vibeathon/convex/__tests__/speechCoach.test.ts)

- [ ] **Step 1: Rewrite the infer-template test mock**

Replace the Clerk mock in [`src/app/api/tools/infer-template/__tests__/route.test.ts`](/Users/desha/Springfield-Vibeathon/src/app/api/tools/infer-template/__tests__/route.test.ts):

```ts
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test123" }),
}));
```

with a mock of the actual auth entrypoint used by the route today. If the route uses [`src/app/api/lib/authenticate.ts`](/Users/desha/Springfield-Vibeathon/src/app/api/lib/authenticate.ts), mock that module instead.

- [ ] **Step 2: Update the assertions to match the real auth contract**

If unauthenticated now means `authenticate()` returns `{ userId: undefined }`, make the test use that shape exactly rather than a Clerk-style `{ userId: null }`.

- [ ] **Step 3: Normalize remaining test issuer strings**

Replace remaining `issuer: "clerk"` fixtures in Convex tests with the same issuer used elsewhere:

```ts
issuer: "https://test.convex.dev"
```

This keeps tests aligned with the current auth provider and avoids encoding Clerk into ownership checks.

- [ ] **Step 4: Remove Clerk-specific comments from tests**

For example, in [`src/app/api/livekit/token/__tests__/route.test.ts`](/Users/desha/Springfield-Vibeathon/src/app/api/livekit/token/__tests__/route.test.ts), change:

```ts
// Mock the authenticate helper (used by the route instead of calling Clerk directly)
```

to:

```ts
// Mock the shared auth helper used by the route.
```

- [ ] **Step 5: Run the focused unit test set**

Run:

```bash
npm test -- src/app/api/tools/infer-template/__tests__/route.test.ts src/app/api/livekit/token/__tests__/route.test.ts convex/__tests__/app_state.test.ts convex/__tests__/appointments.test.ts convex/__tests__/tools.test.ts convex/__tests__/speechCoach.test.ts
```

Expected: all targeted auth-adjacent tests pass.

## Task 4: Clean Up E2E Assumptions and Seed Tooling

**Files:**
- Modify: [`playwright.config.ts`](/Users/desha/Springfield-Vibeathon/playwright.config.ts)
- Modify: [`tests/e2e/helpers.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/helpers.ts)
- Modify: [`tests/e2e/dashboard.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/dashboard.spec.ts)
- Modify: [`tests/e2e/mobile.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/mobile.spec.ts)
- Modify: [`tests/e2e/my-tools.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/my-tools.spec.ts)
- Modify: [`tests/e2e/navigation.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/navigation.spec.ts)
- Modify: [`tests/e2e/settings.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/settings.spec.ts)
- Modify: [`tests/e2e/caregiver.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/caregiver.spec.ts)
- Modify: [`scripts/seed-e2e.ts`](/Users/desha/Springfield-Vibeathon/scripts/seed-e2e.ts)
- Modify: [`convex/e2e_seed.ts`](/Users/desha/Springfield-Vibeathon/convex/e2e_seed.ts)
- Modify: [`convex/demo_seed.ts`](/Users/desha/Springfield-Vibeathon/convex/demo_seed.ts)

- [ ] **Step 1: Remove Clerk env guards from E2E specs**

Anywhere a spec currently skips on:

```ts
!process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD
```

replace it with the current fixture envs, usually `E2E_SLP_EMAIL` / `E2E_SLP_PASSWORD`, or rely on the shared fixture’s own `requireEnvOrSkip`.

- [ ] **Step 2: Remove Clerk DOM selectors from navigation checks**

In [`tests/e2e/navigation.spec.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/navigation.spec.ts), replace:

```ts
"[data-clerk-component], .cl-userButtonTrigger, a[href='/sign-in']"
```

with selectors for your current UI, e.g. a profile menu trigger, sign-out button, or sign-in link that actually exists after the Convex Auth migration.

- [ ] **Step 3: Rename stale E2E timeout labels/comments**

In [`tests/e2e/helpers.ts`](/Users/desha/Springfield-Vibeathon/tests/e2e/helpers.ts), replace:

```ts
CLERK_INIT: 10_000,
```

with a neutral name like:

```ts
AUTH_INIT: 10_000,
```

and update any references.

- [ ] **Step 4: Simplify Playwright setup comments**

[`playwright.config.ts`](/Users/desha/Springfield-Vibeathon/playwright.config.ts) still describes a Clerk setup token flow. Keep the dependency if you still want a setup project, but rename the comment so it reflects reality:

```ts
// Shared setup project for app-level preconditions.
```

If the setup project is now useless, remove the dependency chain entirely.

- [ ] **Step 5: Rewrite `scripts/seed-e2e.ts` away from Clerk IDs**

Stop requiring:

```ts
E2E_SLP_USER_ID
E2E_CAREGIVER_USER_ID
```

and instead seed based on the current auth model. Preferred approach:

1. Use `E2E_SLP_EMAIL`, `E2E_CAREGIVER_EMAIL`.
2. Resolve the matching Convex users through an internal query like `users.getByEmail`.
3. Pass the resolved user document IDs into the seed mutation.

If users must exist before seeding, fail with a clear message telling the operator to sign up both test users first.

- [ ] **Step 6: Update comments/examples in seed modules**

Remove phrases like “pre-created Clerk users” and “Clerk test accounts” from [`scripts/seed-e2e.ts`](/Users/desha/Springfield-Vibeathon/scripts/seed-e2e.ts), [`convex/e2e_seed.ts`](/Users/desha/Springfield-Vibeathon/convex/e2e_seed.ts), and [`convex/demo_seed.ts`](/Users/desha/Springfield-Vibeathon/convex/demo_seed.ts).

- [ ] **Step 7: Run focused E2E smoke tests**

Run:

```bash
npx playwright test tests/e2e/auth.spec.ts tests/e2e/caregiver.spec.ts tests/e2e/navigation.spec.ts
```

Expected: protected-route redirect, sign-in UI, caregiver redirect, and navigation assertions pass under the new auth system.

## Task 5: Update Repo Guidance and Historical Docs

**Files:**
- Modify: [`AGENTS.md`](/Users/desha/Springfield-Vibeathon/AGENTS.md)
- Modify: [`CLAUDE.md`](/Users/desha/Springfield-Vibeathon/CLAUDE.md)
- Modify: [`CHANGELOG.md`](/Users/desha/Springfield-Vibeathon/CHANGELOG.md)
- Modify: [`src/app/(play)/family/[patientId]/play/layout.tsx`](/Users/desha/Springfield-Vibeathon/src/app/(play)/family/[patientId]/play/layout.tsx)
- Modify: [`src/test/setup.ts`](/Users/desha/Springfield-Vibeathon/src/test/setup.ts)
- Modify: [`convex/lib/auth.ts`](/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts)

- [ ] **Step 1: Rewrite AGENTS/CLAUDE auth sections**

Update the stack and auth sections to describe:

- Convex Auth instead of Clerk
- `ConvexAuthNextjsProvider` / `ConvexAuthNextjsServerProvider`
- `convexAuthNextjsMiddleware`
- roles stored in the Convex `users` table
- current sign-in/sign-up flow and current E2E users

- [ ] **Step 2: Remove stale operational guidance**

Delete or replace references to:

- `@clerk/testing/playwright`
- Clerk email-code flow
- Clerk public metadata
- Clerk env vars
- Clerk JWT verification

- [ ] **Step 3: Update inline comments to match the new architecture**

Examples:

- In [`src/app/(play)/family/[patientId]/play/layout.tsx`](/Users/desha/Springfield-Vibeathon/src/app/(play)/family/[patientId]/play/layout.tsx), replace “Clerk + Convex providers” with “root auth/providers”.
- In [`convex/lib/auth.ts`](/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts), remove wording that implies Clerk is still a first-class identifier source.

- [ ] **Step 4: Verify repo guidance no longer advertises Clerk as current**

Run:

```bash
rg -n 'Clerk|@clerk|CLERK_|publicMetadata|ConvexProviderWithClerk|clerkMiddleware' AGENTS.md CLAUDE.md CHANGELOG.md src convex tests scripts
```

Expected: no hits in live code and only intentional historical references in archived design/spec docs.

## Final Verification

- [ ] **Step 1: Run full auth-focused search**

Run:

```bash
rg -n --glob 'src/**' --glob 'convex/**' --glob 'tests/**' --glob 'scripts/**' --glob '.env.example' --glob 'playwright.config.ts' --glob 'AGENTS.md' --glob 'CLAUDE.md' --glob 'CHANGELOG.md' 'clerk|Clerk|@clerk|CLERK_|NEXT_PUBLIC_CLERK|public_metadata|ConvexProviderWithClerk|clerkMiddleware'
```

Expected: zero results in active code/docs, or only clearly intentional historical references in archived planning docs outside the scoped file set.

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
npx playwright test
```

Expected: auth-related tests pass without any Clerk setup or Clerk env vars.

- [ ] **Step 3: Manual smoke-check**

Verify locally:

1. Visit `/sign-in`
2. Sign in with an SLP test account
3. Confirm redirect to `/dashboard`
4. Sign out
5. Sign in with a caregiver test account
6. Confirm redirect to `/family`
7. Visit `/dashboard` while signed out and confirm redirect to `/sign-in`

## Notes

- Do not edit archived design/spec docs just to erase historical references unless you want a separate doc-cleanup pass. This plan is about active code, tooling, and source-of-truth guidance.
- Do not change identifier formats stored across patients/sessions/invites unless verification shows a real auth break. That is a separate migration concern from removing Clerk references.
