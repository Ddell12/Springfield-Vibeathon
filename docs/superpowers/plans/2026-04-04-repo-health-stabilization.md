# Repo Health Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a clean local verification baseline by fixing the current failing Vitest suites and eliminating all current ESLint errors and warnings, while keeping TypeScript clean.

**Architecture:** Keep the repair localized to the broken patient invite flow, the outdated API route test, and the existing files currently failing ESLint. Favor behavioral fixes over test-only changes where production behavior is currently inconsistent with signed-in caregiver flows. Use ESLint autofix for import sorting, then make the small remaining manual edits.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest 4, ESLint 9, Convex, Clerk/Convex auth bridge

---

### Task 1: Rebaseline Verification And Lock The Failure Surface

**Files:**
- Modify: `package.json`
- Test: `src/features/patients/components/__tests__/invite-landing.test.tsx`
- Test: `src/app/api/tools/infer-template/__tests__/route.test.ts`

- [ ] **Step 1: Make the test script deterministic for future runs**

Update `package.json` so the default test script is `vitest run` instead of watch mode:

```json
"scripts": {
  "test": "vitest run",
  "test:run": "vitest run"
}
```

- [ ] **Step 2: Confirm the current baseline before edits**

Run:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
npx vitest run src/features/patients/components/__tests__/invite-landing.test.tsx
npx vitest run src/app/api/tools/infer-template/__tests__/route.test.ts
```

Expected:
- `tsc` exits `0`
- ESLint reports import-sort failures plus the six current warnings
- `invite-landing.test.tsx` fails three tests
- `infer-template` test suite fails before running tests because it imports the wrong auth module

- [ ] **Step 3: Commit the verification baseline change**

Run:

```bash
git add package.json
git commit -m "chore: run vitest in non-watch mode"
```

### Task 2: Repair The Signed-In Caregiver Invite Flow

**Files:**
- Modify: `src/features/patients/components/invite-landing.tsx`
- Modify: `src/features/patients/components/__tests__/invite-landing.test.tsx`
- Modify: `src/features/patients/hooks/use-invite.ts`

- [ ] **Step 1: Write the intended signed-in acceptance rules in the test file**

Keep and tighten the current expectations in `src/features/patients/components/__tests__/invite-landing.test.tsx`:

```tsx
it("shows SLP guard when therapist visits invite link", async () => {
  mockUseCurrentUser.mockReturnValue({ role: "slp", _id: "user_1", email: "slp@test.com", name: "Test SLP" });
  mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });

  await renderWithSuspense("valid-token");

  expect(screen.getByText(/This invite is for caregivers/i)).toBeInTheDocument();
  expect(mockAcceptInvite).not.toHaveBeenCalled();
});

it("auto-accepts invite when caregiver is signed in and invite is valid", async () => {
  mockUseCurrentUser.mockReturnValue({ role: "caregiver", _id: "user_1", email: "caregiver@test.com", name: "Parent" });
  mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });
  mockAcceptInvite.mockResolvedValue(undefined);

  await renderWithSuspense("valid-token");

  await waitFor(() => {
    expect(mockAcceptInvite).toHaveBeenCalledWith({ token: "valid-token" });
  });
});
```

- [ ] **Step 2: Fix imports and acceptance conditions in the component**

In `src/features/patients/components/invite-landing.tsx`, sort imports and replace the current `isNewUser`-only gate with an explicit caregiver-or-new-user check:

```tsx
import { useAcceptInvite, useInviteInfo } from "../hooks/use-invite";

const isCaregiver = user?.role === "caregiver";
const canAutoAcceptInvite = isSignedIn && (isCaregiver || user?.role == null);

useEffect(() => {
  if (
    !isLoaded ||
    !inviteInfo ||
    !canAutoAcceptInvite ||
    isAccepting ||
    acceptAttemptedRef.current
  ) {
    return;
  }

  acceptAttemptedRef.current = true;
  setIsAccepting(true);

  acceptInvite({ token })
    .then(() => {
      toast.success("You're connected!");
      router.push("/builder");
    })
    .catch((err) => {
      console.error("[invite] Failed to accept:", err);
      toast.error("Failed to accept invite. Please try again.");
      setIsAccepting(false);
      acceptAttemptedRef.current = false;
    });
}, [acceptInvite, canAutoAcceptInvite, inviteInfo, isAccepting, isLoaded, router, token]);
```

This removes the `setTimeout()` race that currently prevents the accepting state from rendering during tests.

- [ ] **Step 3: Fix import formatting in the invite hooks file**

In `src/features/patients/hooks/use-invite.ts`, normalize the import line:

```ts
import { useMutation, useQuery } from "convex/react";
```

- [ ] **Step 4: Run the invite tests**

Run:

```bash
npx vitest run src/features/patients/components/__tests__/invite-landing.test.tsx
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit the invite-flow repair**

Run:

```bash
git add src/features/patients/components/invite-landing.tsx src/features/patients/components/__tests__/invite-landing.test.tsx src/features/patients/hooks/use-invite.ts
git commit -m "fix: auto-accept caregiver invite links"
```

### Task 3: Update The Infer-Template Route Test To Match Current Auth

**Files:**
- Modify: `src/app/api/tools/infer-template/__tests__/route.test.ts`
- Reference: `src/app/api/tools/infer-template/route.ts`
- Reference: `src/app/api/tools/generate-config/__tests__/route.test.ts`

- [ ] **Step 1: Replace the outdated Clerk mock with the Convex auth mock**

Update the test header in `src/app/api/tools/infer-template/__tests__/route.test.ts`:

```ts
const mockConvexAuthNextjsToken = vi.fn().mockResolvedValue("fake-token");

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: mockConvexAuthNextjsToken,
}));
```

- [ ] **Step 2: Update the unauthenticated test to drive the current auth API**

Replace the dynamic import of `@clerk/nextjs/server` with a direct override:

```ts
it("returns 401 when unauthenticated", async () => {
  mockConvexAuthNextjsToken.mockResolvedValueOnce(null);

  const req = new Request("http://localhost/api/tools/infer-template", {
    method: "POST",
    body: JSON.stringify({ description: "token board for Marcus" }),
  });

  const res = await POST(req);

  expect(res.status).toBe(401);
});
```

- [ ] **Step 3: Keep the AI mocks deterministic and reset shared state**

Add a suite reset so auth and AI call state do not bleed between tests:

```ts
beforeEach(() => {
  callCount = 0;
  mockConvexAuthNextjsToken.mockResolvedValue("fake-token");
});
```

- [ ] **Step 4: Run the route test**

Run:

```bash
npx vitest run src/app/api/tools/infer-template/__tests__/route.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit the route-test update**

Run:

```bash
git add src/app/api/tools/infer-template/__tests__/route.test.ts
git commit -m "test: align infer-template auth mock with Convex auth"
```

### Task 4: Clear The Repo-Wide ESLint Backlog

**Files:**
- Modify: `convex/ResendOTPPasswordReset.ts`
- Modify: `convex/adventureSessionActions.ts`
- Modify: `convex/auth.ts`
- Modify: `convex/lib/auth.ts`
- Modify: `convex/speechCoachActions.ts`
- Modify: `convex/users.ts`
- Modify: `src/features/auth/components/claude-sign-in-card.tsx`
- Modify: `src/features/auth/hooks/use-current-user.ts`
- Modify: `src/features/auth/lib/server-role-guards.ts`
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Modify: `src/features/patients/components/invite-landing.tsx`
- Modify: `src/features/session-notes/components/session-note-editor.tsx`
- Modify: `src/features/shared-tool/components/shared-tool-page.tsx`
- Modify: `src/features/speech-coach/components/__tests__/active-session.test.tsx`
- Modify: `src/features/speech-coach/components/active-session.tsx`
- Modify: `src/features/speech-coach/components/adventure-session.tsx`
- Modify: `src/features/speech-coach/components/per-patient-coach-setup.tsx`
- Modify: `src/features/speech-coach/components/session-history.tsx`
- Modify: `src/features/speech-coach/components/slp-practice-frequency-panel.tsx`
- Modify: `src/features/speech-coach/components/speech-coach-page.tsx`
- Modify: `src/features/speech-coach/livekit/__tests__/agent.test.ts`
- Modify: `src/features/speech-coach/livekit/agent.ts`
- Modify: `src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx`
- Modify: `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx`
- Modify: `src/features/tools/components/builder/preview-panel.tsx`
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx`
- Modify: `src/features/tools/hooks/use-tool-builder.ts`
- Modify: `src/features/tools/lib/__tests__/session-note-formatter.test.ts`
- Modify: `src/features/tools/lib/__tests__/tool-config-seed.test.ts`
- Modify: `src/features/tools/lib/templates/matching-game/runtime.tsx`
- Modify: `src/shared/components/app-header.tsx`
- Modify: `src/shared/components/marketing-header.tsx`
- Modify: `tests/e2e/screenshot-journeys.spec.ts`

- [ ] **Step 1: Let ESLint fix the import-order backlog automatically**

Run:

```bash
./node_modules/.bin/eslint . --fix
```

Expected: import-sort errors are removed automatically across the files above.

- [ ] **Step 2: Fix the remaining manual lint warnings**

Apply these targeted edits:

```ts
// convex/speechCoachActions.ts
// remove unused Id import
// replace explicit any with a concrete response type or unknown + narrowing

// src/features/session-notes/components/session-note-editor.tsx
// remove unused useRouter import

// src/features/speech-coach/components/session-history.tsx
// remove unused ProgressCard import

// src/features/tools/components/builder/tool-builder-wizard.tsx
// remove unused TemplatePicker import

// src/features/tools/hooks/use-tool-builder.ts
// remove or use archiveInstance, whichever matches actual behavior

// src/features/tools/lib/templates/matching-game/runtime.tsx
// fix useCallback dependencies so they match referenced values
```

- [ ] **Step 3: Run ESLint again**

Run:

```bash
./node_modules/.bin/eslint .
```

Expected: exits `0` with no warnings.

- [ ] **Step 4: Commit the lint cleanup**

Run:

```bash
git add convex src tests/e2e package.json
git commit -m "chore: clear repo lint violations"
```

### Task 5: Final Verification

**Files:**
- Modify: none
- Test: repo root verification commands

- [ ] **Step 1: Run the full verification stack**

Run:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
npm test
```

Expected:
- TypeScript exits `0`
- ESLint exits `0`
- Vitest exits `0`

- [ ] **Step 2: Optionally run Playwright if the invite flow or route changes affect user journeys**

Run:

```bash
npx playwright test
```

Expected: pass, or produce only pre-existing unrelated failures that are documented before merge.

- [ ] **Step 3: Commit verification-only changes if needed, otherwise stop**

Run:

```bash
git status --short
```

Expected: clean working tree after the previous commits.
