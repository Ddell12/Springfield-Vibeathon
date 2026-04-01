# Rebrand, Workflow IA, and Reliability Relaunch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved relaunch spec into three independently shippable tracks: reliability and entitlements, workflow IA and library upgrades, and final brand rollout.

**Architecture:** The spec intentionally spans multiple independent subsystems. Do not execute this as one giant branch of mixed changes. Implement Track A first until stable, then Track B, then Track C. Each track must produce working software and pass its own verification before the next track starts.

**Tech Stack:** Next.js 16 App Router, React, Tailwind v4, Clerk v7, Convex, Vercel integration points, Vitest + React Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-03-31-rebrand-workflow-reliability-design.md`

---

## Scope Check

This spec covers multiple independent subsystems:

1. builder reliability and entitlement logic
2. workflow/navigation/library UX
3. company-wide rebrand

Per the skill rules, this should not be executed as a flat checklist. This plan therefore treats the relaunch as a **program plan with three self-contained tracks**. Each track is shippable on its own and should be executed in order.

---

## Track Map

### Track A: Reliability and Entitlements

Ship first.

- preview state hardening
- share/save/publish separation
- free-tier upgrade UX cleanup
- publish-path verification

### Track B: Workflow IA and Library

Ship second.

- remove billing from primary SLP nav
- add workflow billing entry points
- library thumbnails and pagination
- notification click-through routing

### Track C: Brand Rollout

Ship last.

- choose new company/product name
- apply wordmark/logo
- update shell metadata, product copy, and key marketing surfaces

---

## File Structure

### Track A

| File | Action | Responsibility |
|------|--------|---------------|
| `src/features/builder/hooks/use-streaming.ts` | Modify | richer preview lifecycle state |
| `src/features/builder/components/preview-panel.tsx` | Modify | preview lifecycle UI and retry affordance |
| `src/features/builder/components/builder-page.tsx` | Modify | distinct save/share/publish UX |
| `src/app/api/generate/route.ts` | Modify | explicit bundle/build state in SSE stream |
| `convex/apps.ts` | Modify | separate shareable artifact path from saved-app cap |
| `convex/generated_files.ts` | Modify | shared bundle lookup and preview artifact helpers |
| `src/shared/components/share-dialog.tsx` | Modify | share-specific loading and failure states |
| `tests/e2e/builder.spec.ts` | Modify | preview readiness assertions |
| `tests/e2e/builder-preview.spec.ts` | Modify | preview retry and success assertions |

### Track B

| File | Action | Responsibility |
|------|--------|---------------|
| `src/shared/lib/navigation.ts` | Modify | remove Billing from primary SLP nav |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Modify | nav + secondary operations access |
| `src/shared/components/app-header.tsx` | Modify | stable notification surface |
| `src/features/sessions/components/notification-bell.tsx` | Modify | route on click |
| `convex/notifications.ts` | Modify | typed routing metadata if needed |
| `convex/notificationActions.ts` | Modify | emit useful links |
| `src/features/library/components/library-page.tsx` | Modify | URL-backed pagination |
| `src/features/templates/components/templates-page.tsx` | Modify | template thumbnails + pagination |
| `src/features/my-tools/components/my-tools-page.tsx` | Modify | app thumbnails + pagination |
| `src/shared/components/project-card.tsx` | Modify | real thumbnail support and metadata |
| `src/features/sessions/components/sessions-page.tsx` | Modify | billing status and entry points |
| `src/features/session-notes/components/session-note-editor.tsx` | Modify | billing next-step action after sign |
| `src/features/patients/components/patient-detail-page.tsx` | Modify | patient billing context |
| `src/features/billing/components/clinical-billing-dashboard.tsx` | Modify | secondary operations workspace framing |

### Track C

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/layout.tsx` | Modify | metadata, titles, siteName, descriptions |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Modify | new name in shell |
| `src/shared/components/app-header.tsx` | Modify | new name in shell where needed |
| `src/app/(marketing)/**` | Modify | top-level marketing copy and brand |
| `public/favicon.svg` and related assets | Modify | brand asset rollout |

---

## Task 1: Track A kickoff — codify preview lifecycle states

**Files:**
- Modify: `src/features/builder/hooks/use-streaming.ts`
- Modify: `src/features/builder/components/preview-panel.tsx`
- Test: `src/features/builder/components/__tests__/preview-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test to `src/features/builder/components/__tests__/preview-panel.test.tsx`:

```tsx
it("shows bundling state before a live preview is ready", () => {
  render(
    <PreviewPanel
      bundleHtml={null}
      state="generating"
      activityMessage="Bundling preview..."
    />
  );

  expect(screen.getByText("Creating your app...")).toBeInTheDocument();
  expect(screen.getByText("Bundling preview...")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/builder/components/__tests__/preview-panel.test.tsx`

Expected: FAIL if the current test file does not yet cover the new lifecycle copy or state transition.

- [ ] **Step 3: Add richer preview state to `use-streaming.ts`**

Update the status model in `src/features/builder/hooks/use-streaming.ts`:

```ts
export type StreamingStatus =
  | "idle"
  | "generating"
  | "bundling"
  | "validating"
  | "live"
  | "failed";
```

Add reducer actions for bundle lifecycle:

```ts
type StreamingAction =
  | { type: "SET_STATUS"; status: StreamingStatus }
  | { type: "SET_BUNDLE"; html: string }
  | { type: "SET_BUILD_FAILED"; failed: boolean }
  | { type: "ERROR_RESPONSE"; error: string };
```

- [ ] **Step 4: Render the explicit lifecycle state**

In `src/features/builder/components/preview-panel.tsx`, keep the existing generating UI but make the activity line authoritative:

```tsx
{isGenerating && !hasPreview && (
  <div className="flex flex-col items-center gap-5 text-muted-foreground max-w-xs text-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
    <div>
      <p className="text-sm font-medium">Creating your app...</p>
      {activityMessage && (
        <p className="mt-1.5 text-xs text-muted-foreground/60">
          {activityMessage}
        </p>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/features/builder/components/__tests__/preview-panel.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/hooks/use-streaming.ts \
        src/features/builder/components/preview-panel.tsx \
        src/features/builder/components/__tests__/preview-panel.test.tsx
git commit -m "feat(builder): add explicit preview lifecycle states"
```

---

## Task 2: Track A — keep the last good preview visible during follow-ups

**Files:**
- Modify: `src/features/builder/hooks/use-streaming.ts`
- Test: `src/features/builder/hooks/__tests__/use-session.test.ts` or nearest streaming hook tests

- [ ] **Step 1: Write the failing test**

Add a reducer-level assertion near the existing streaming hook tests:

```ts
it("preserves bundleHtml during follow-up generation", () => {
  const prev = {
    ...initialState,
    status: "live" as const,
    bundleHtml: "<html>ok</html>",
  };

  const next = streamingReducer(prev, { type: "START_FOLLOW_UP" });
  expect(next.bundleHtml).toBe("<html>ok</html>");
  expect(next.status).toBe("generating");
});
```

- [ ] **Step 2: Run test to verify it fails or confirms current behavior**

Run: `npm test -- src/features/builder/hooks`

Expected: If no reducer-level test exists yet, add it and verify current behavior.

- [ ] **Step 3: Preserve last good preview explicitly**

Keep this shape in `START_FOLLOW_UP` inside `src/features/builder/hooks/use-streaming.ts`:

```ts
case "START_FOLLOW_UP":
  return {
    ...state,
    error: null,
    status: "generating",
    streamingText: "",
    activities: [],
    buildFailed: false,
    notableMessage: null,
  };
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/features/builder/hooks`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/hooks/use-streaming.ts \
        src/features/builder/hooks/__tests__
git commit -m "test(builder): lock preview persistence during follow-up generations"
```

---

## Task 3: Track A — decouple share from saved-app free-tier limits

**Files:**
- Modify: `convex/apps.ts`
- Test: `convex/__tests__/apps.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test to `convex/__tests__/apps.test.ts` proving share allowance at cap:

```ts
it("allows share provisioning for an existing session even when the user is at the free saved-app cap", async () => {
  const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
  const sessionId = await t.mutation(api.sessions.create, {
    title: "Shareable app",
    query: "test",
  });

  for (let i = 0; i < FREE_LIMITS.maxApps; i++) {
    await t.mutation(api.apps.create, {
      title: `App ${i}`,
      description: "seed",
      shareSlug: `slug-${i}`,
      sessionId,
    });
  }

  const app = await t.mutation(api.apps.ensureForSession, {
    sessionId,
    title: "Shareable app",
  });

  expect(app).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify current failure**

Run: `npm test -- convex/__tests__/apps.test.ts`

Expected: FAIL with the current `"Free plan limit reached"` error.

- [ ] **Step 3: Reorder `ensureForSession` logic in `convex/apps.ts`**

Move the existing-record lookup above the free-tier check:

```ts
const existing = await ctx.db
  .query("apps")
  .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
  .first();
if (existing) return existing;
```

Keep the limit check only for creating a new saved app record:

```ts
if (identity) {
  const isPremium = await checkPremiumStatus(ctx, identity.subject);
  if (!isPremium) {
    const userApps = await ctx.db
      .query("apps")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .take(FREE_LIMITS.maxApps);
    if (userApps.length >= FREE_LIMITS.maxApps) {
      throw new Error("Free plan limit reached. Upgrade to Premium for unlimited apps.");
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- convex/__tests__/apps.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/apps.ts convex/__tests__/apps.test.ts
git commit -m "fix(apps): allow existing session share records at free-tier cap"
```

---

## Task 4: Track A — remove console-error-driven share UX

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`
- Modify: `src/shared/components/share-dialog.tsx`
- Test: `src/features/builder/components/__tests__/builder-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test around `handleShare` behavior:

```tsx
it("opens upgrade flow instead of generic share failure when free-tier save is blocked", async () => {
  const ensureApp = vi.fn().mockRejectedValue(new Error("Free plan limit reached. Upgrade to Premium for unlimited apps."));
  vi.mocked(useMutation).mockReturnValue(ensureApp as never);

  render(<BuilderPage />);
  await userEvent.click(screen.getByRole("button", { name: /share/i }));

  expect(screen.queryByText(/could not create share link/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- src/features/builder/components/__tests__/builder-page.test.tsx`

Expected: FAIL with current generic share error handling.

- [ ] **Step 3: Update `handleShare`**

Replace the current catch in `src/features/builder/components/builder-page.tsx` with:

```ts
    } catch (err) {
      if (err instanceof Error && err.message.includes("Free plan limit reached")) {
        setUpgradeOpen(true);
      } else {
        console.error("Failed to create share link:", err);
        toast.error("Could not create share link");
      }
      return;
    }
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/features/builder/components/__tests__/builder-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/builder-page.tsx \
        src/features/builder/components/__tests__/builder-page.test.tsx
git commit -m "fix(builder): route share limit failures into upgrade UX"
```

---

## Task 5: Track A — promote preview readiness in E2E

**Files:**
- Modify: `tests/e2e/builder.spec.ts`
- Modify: `tests/e2e/builder-preview.spec.ts`

- [ ] **Step 1: Tighten the builder preview assertion**

In the E2E tests, replace “iframe exists” assertions with “iframe visible and build-failed state absent”:

```ts
const preview = page.locator("iframe[title='App preview']");
await expect(preview).toBeVisible({ timeout: 60_000 });
await expect(page.getByText(/Something didn't look right/i)).toHaveCount(0);
```

- [ ] **Step 2: Run the E2E suite**

Run: `npx playwright test tests/e2e/builder.spec.ts tests/e2e/builder-preview.spec.ts`

Expected: PASS or a real preview reliability failure to fix before moving on.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/builder.spec.ts tests/e2e/builder-preview.spec.ts
git commit -m "test(builder): assert preview readiness in E2E flows"
```

---

## Task 6: Track B kickoff — remove Billing from primary SLP navigation

**Files:**
- Modify: `src/shared/lib/navigation.ts`
- Test: `src/shared/lib/__tests__/navigation.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test:

```ts
it("does not expose Billing in the primary SLP nav", () => {
  expect(NAV_ITEMS.map((item) => item.label)).not.toContain("Billing");
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- src/shared/lib/__tests__/navigation.test.ts`

Expected: FAIL

- [ ] **Step 3: Update `navigation.ts`**

Change `NAV_ITEMS` in `src/shared/lib/navigation.ts` to:

```ts
export const NAV_ITEMS = [
  { icon: "auto_awesome",         label: "Builder",      href: ROUTES.BUILDER },
  { icon: "group",                label: "Patients",     href: ROUTES.PATIENTS },
  { icon: "video_call",           label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "record_voice_over",    label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "collections_bookmark", label: "Library",      href: ROUTES.LIBRARY },
] as const;
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/shared/lib/__tests__/navigation.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/navigation.ts src/shared/lib/__tests__/navigation.test.ts
git commit -m "feat(nav): remove billing from primary SLP navigation"
```

---

## Task 7: Track B — make notification clicks route deterministically

**Files:**
- Modify: `src/features/sessions/components/notification-bell.tsx`
- Modify: `convex/notificationActions.ts`
- Test: notification bell tests

- [ ] **Step 1: Write the failing UI test**

Add a test asserting routing happens when a notification has a link:

```tsx
it("routes to the notification link and marks the item read", async () => {
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  await userEvent.click(screen.getByRole("button", { name: /session booked/i }));
  expect(mockPush).toHaveBeenCalledWith("/sessions/appt123");
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- src/features/sessions/components`

Expected: FAIL if the current mock data or routing behavior is incomplete.

- [ ] **Step 3: Ensure producers emit explicit links**

Keep explicit route creation in `convex/notificationActions.ts` like:

```ts
link: `/sessions/${args.appointmentId}`,
```

and reminder links like:

```ts
link: `/sessions/${args.appointmentId}/call`,
```

- [ ] **Step 4: Keep click handler deterministic**

In `src/features/sessions/components/notification-bell.tsx`, keep:

```ts
const handleNotificationClick = useCallback(async (id: Id<"notifications">, link?: string) => {
  setOpen(false);
  void markRead({ notificationId: id });
  if (link) router.push(link);
}, [markRead, router]);
```

Add a fallback route map if new notification types are introduced without links.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/features/sessions/components`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/sessions/components/notification-bell.tsx \
        convex/notificationActions.ts
git commit -m "fix(notifications): route notification clicks to linked destinations"
```

---

## Task 8: Track B — add URL-backed pagination to Library tabs

**Files:**
- Modify: `src/features/library/components/library-page.tsx`
- Modify: `src/features/templates/components/templates-page.tsx`
- Modify: `src/features/my-tools/components/my-tools-page.tsx`
- Test: `src/features/library/components/__tests__/library-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that preserves the selected tab in the URL:

```tsx
it("writes the selected tab into the library URL", async () => {
  render(<LibraryPage />);
  await userEvent.click(screen.getByRole("tab", { name: /templates/i }));
  expect(mockReplace).toHaveBeenCalledWith("/library?tab=templates", { scroll: false });
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- src/features/library/components/__tests__/library-page.test.tsx`

Expected: PASS or confirm existing tab behavior before pagination changes.

- [ ] **Step 3: Add page state to the URL**

Extend the router call in `src/features/library/components/library-page.tsx` to preserve `page`:

```ts
onValueChange={(v) => router.replace(`/library?tab=${v}&page=1`, { scroll: false })}
```

- [ ] **Step 4: Add local pagination in templates and apps**

In `src/features/templates/components/templates-page.tsx` and `src/features/my-tools/components/my-tools-page.tsx`, derive a page slice:

```ts
const PAGE_SIZE = 12;
const pageItems = filteredTemplates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
```

and render `pageItems` instead of the full array.

- [ ] **Step 5: Run tests**

Run:
- `npm test -- src/features/library/components/__tests__/library-page.test.tsx`
- `npm test -- src/features/my-tools/components/__tests__/my-tools-page.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/library/components/library-page.tsx \
        src/features/templates/components/templates-page.tsx \
        src/features/my-tools/components/my-tools-page.tsx
git commit -m "feat(library): add URL-backed pagination to apps and templates"
```

---

## Task 9: Track B — upgrade cards to screenshot-first thumbnails

**Files:**
- Modify: `src/shared/components/project-card.tsx`
- Modify: `src/features/my-tools/components/my-tools-page.tsx`
- Modify: `src/features/templates/components/templates-page.tsx`

- [ ] **Step 1: Write the failing card test**

Add or update a `ProjectCard` test:

```tsx
it("renders the provided thumbnail image when available", () => {
  render(
    <ProjectCard
      project={{
        id: "session123",
        title: "Token board",
        thumbnail: "/thumb.png",
        updatedAt: Date.now(),
        userInitial: "T",
        userColor: "bg-primary text-white",
      }}
    />
  );

  expect(screen.getByAltText("Token board")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- src/features/dashboard/components/__tests__/project-card.test.tsx`

Expected: PASS or update to the correct test path that owns `ProjectCard`.

- [ ] **Step 3: Preserve screenshot-first behavior**

Keep `project.thumbnail` driving the `Image` path in `src/shared/components/project-card.tsx`:

```tsx
{project.thumbnail ? (
  <Image
    src={project.thumbnail}
    alt={project.title}
    width={400}
    height={192}
    className="h-full w-full object-cover"
  />
) : (
  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary/20">
    {project.title.charAt(0)}
  </div>
)}
```

- [ ] **Step 4: Thread real thumbnail data from list pages**

Update the data mapping in `src/features/my-tools/components/my-tools-page.tsx` to pass actual screenshot fields when they exist.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/project-card.tsx \
        src/features/my-tools/components/my-tools-page.tsx \
        src/features/templates/components/templates-page.tsx
git commit -m "feat(library): make cards screenshot-first with graceful fallback"
```

---

## Task 10: Track B — add billing entry points inside workflow

**Files:**
- Modify: `src/features/sessions/components/sessions-page.tsx`
- Modify: `src/features/session-notes/components/session-note-editor.tsx`
- Modify: `src/features/patients/components/patient-detail-page.tsx`
- Modify: `src/features/billing/components/clinical-billing-dashboard.tsx`

- [ ] **Step 1: Add a visible workflow hint in Sessions**

In `src/features/sessions/components/sessions-page.tsx`, add a secondary line under the heading for SLPs:

```tsx
<p className="text-sm text-on-surface-variant">
  {isCaregiver
    ? "Upcoming sessions for your family"
    : "Schedule, run, document, and manage billing for sessions"}
</p>
```

- [ ] **Step 2: Add a post-sign billing action to session notes**

After a sign succeeds in `src/features/session-notes/components/session-note-editor.tsx`, add a success toast with a billing cue:

```ts
toast.success("Session note signed. Billing record is ready for review.");
```

- [ ] **Step 3: Add patient billing context**

Add a `Billing` tab trigger in `src/features/patients/components/patient-detail-page.tsx` and render a billing-history section or placeholder in that tab.

- [ ] **Step 4: Reframe the billing dashboard as operations**

In `src/features/billing/components/clinical-billing-dashboard.tsx`, change the subcopy to:

```tsx
<p className="text-sm text-on-surface-variant mt-1">
  Review billing work created from signed notes and session workflow
</p>
```

- [ ] **Step 5: Commit**

```bash
git add src/features/sessions/components/sessions-page.tsx \
        src/features/session-notes/components/session-note-editor.tsx \
        src/features/patients/components/patient-detail-page.tsx \
        src/features/billing/components/clinical-billing-dashboard.tsx
git commit -m "feat(workflow): surface billing actions from sessions notes and patients"
```

---

## Task 11: Track C kickoff — prepare shell metadata for rebrand

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add temporary brand constants**

At the top of `src/app/layout.tsx`, introduce temporary constants so the final rename is a single edit:

```ts
const PRODUCT_NAME = "Bridges";
const PRODUCT_TAGLINE = "AI Therapy App Builder";
```

- [ ] **Step 2: Use the constants in metadata**

Refactor metadata:

```ts
title: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
openGraph: {
  title: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
  siteName: PRODUCT_NAME,
},
twitter: {
  title: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
},
```

- [ ] **Step 3: Run typecheck or tests that cover layout imports**

Run: `npm test -- src/app`

Expected: PASS or no relevant tests; if none, rely on the main suite later.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "refactor(brand): centralize shell metadata naming constants"
```

---

## Task 12: Track C — apply final brand once name is chosen

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Modify: `src/shared/components/app-header.tsx`
- Modify: relevant marketing layouts and assets

- [ ] **Step 1: Replace temporary constants with the final approved name and tagline**
- [ ] **Step 2: Update visible shell references from `Bridges` to the new brand**
- [ ] **Step 3: Update favicon and related public assets**
- [ ] **Step 4: Run smoke tests on sign-in, builder, library, patients, and sessions**
- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx \
        src/features/dashboard/components/dashboard-sidebar.tsx \
        src/shared/components/app-header.tsx \
        public
git commit -m "feat(brand): apply final relaunch identity across app shell"
```

---

## Self-Review

### Spec Coverage

- preview hardening: Tasks 1, 2, 5
- share/save/publish separation: Tasks 3, 4
- workflow IA and billing relocation: Tasks 6, 10
- library pagination and thumbnails: Tasks 8, 9
- notification routing: Task 7
- brand rollout: Tasks 11, 12

### Placeholder Scan

Track C still depends on the final chosen name and logo. That is acceptable because the spec explicitly leaves final name selection out of scope. The implementation task is therefore framed as “apply final brand once chosen,” not as an unresolved engineering placeholder.

### Type Consistency

- `StreamingStatus` additions are localized to `use-streaming.ts` and `preview-panel.tsx`
- navigation still flows through `NAV_ITEMS`
- notification routing still flows through `link`

---

## Execution Order

1. Tasks 1-5
2. Tasks 6-10
3. Tasks 11-12
4. Full verification pass

### Final Verification

Run before calling the relaunch engineering work complete:

```bash
npm test
npx playwright test
```

Manual smoke checks:

- generate app and confirm preview appears
- hit free-tier saved-app cap and confirm sharing still works correctly
- verify publish messaging is explicit
- confirm billing is reachable from workflow surfaces
- confirm notification clicks navigate correctly
- confirm library pagination works on both tabs
- confirm shell brand references are consistent
