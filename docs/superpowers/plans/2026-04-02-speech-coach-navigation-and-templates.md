# Speech Coach Navigation And Template Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Sessions`, `Setup`, and `Templates` clearly reachable inside the Speech Coach area without adding extra top-level sidebar clutter.

**Architecture:** Keep the global sidebar unchanged at the product-information level with one `Speech Coach` entry, then implement therapist navigation through `src/app/(app)/speech-coach/layout.tsx` as the authoritative shared shell for `Sessions`, `Setup`, and `Templates`. Reuse existing setup and template components where possible, narrow `slp-speech-coach-page.tsx` into setup content instead of a second shell, add stable route helpers, and make template apply flows explicitly child/program-specific instead of relying on route-global context.

**Tech Stack:** Next.js App Router, React, Clerk role metadata, Convex React hooks, Vitest, React Testing Library

---

## File Structure Map

### Existing files to modify

- `src/core/routes.ts`
  Responsibility: Add stable route helpers for speech coach setup and templates.
- `src/shared/lib/navigation.ts`
  Responsibility: Keep `Speech Coach` active across the new in-area routes.
- `src/features/dashboard/components/dashboard-sidebar.tsx`
  Responsibility: Preserve the single top-level nav entry while keeping the new child routes marked active correctly.
- `src/features/speech-coach/components/slp-speech-coach-page.tsx`
  Responsibility: Stop acting like a disconnected page and become focused setup content with no local shell ownership.
- `src/features/speech-coach/components/speech-coach-page.tsx`
  Responsibility: Become the `Sessions` surface inside the shared shell.
- `src/features/speech-coach/components/template-library-page.tsx`
  Responsibility: Become the `Templates` surface inside the shared shell and expose direct assign/apply affordances.
- `src/app/(app)/speech-coach/page.tsx`
  Responsibility: Route the base speech coach page through the new shared layout.
- `src/app/(app)/speech-coach/templates/page.tsx`
  Responsibility: Route templates through the shared layout.

### New files to create

- `src/app/(app)/speech-coach/layout.tsx`
  Responsibility: Own the therapist route shell, section nav, and shared route-level loading/error behavior.
- `src/app/(app)/speech-coach/setup/page.tsx`
  Responsibility: Add the therapist-facing stable setup route.
- `src/features/speech-coach/components/speech-coach-shell.tsx`
  Responsibility: If still needed after layout extraction, act as a presentational shell fragment only, not the authoritative route shell.
- `src/features/speech-coach/components/speech-coach-sections.ts`
  Responsibility: Export the route-aware nav model used by the layout and tests.
- `src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx`
  Responsibility: Validate the visible `Sessions`, `Setup`, and `Templates` navigation.
- `src/features/speech-coach/components/__tests__/template-library-page.test.tsx`
  Responsibility: Extend template discoverability tests to cover assign/apply navigation.
- `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
  Responsibility: Confirm the global sidebar still treats new speech coach routes as active.

## Review Amendments

- `src/app/(app)/speech-coach/layout.tsx` is the authoritative shell. Do not duplicate route-current logic inside feature components.
- `slp-speech-coach-page.tsx` must be narrowed to setup-specific content and mutation wiring only.
- `speech-coach-sections.ts` must be a concrete route model shared by layout and tests, not a placeholder file.
- Template apply flows must include explicit child/program selection before landing in setup.
- Therapist-gated route work must account for the existing `slpQuery` crash pattern instead of adding more fragile gated surfaces.
- Standalone `/speech-coach` behavior is not being redesigned, but it must remain working and covered by regression tests.

## Task 1: Add Stable Speech Coach Route Helpers

**Files:**
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`
- Test: `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Write the failing navigation-active test**

```tsx
it("keeps Speech Coach active on /speech-coach/setup and /speech-coach/templates", () => {
  expect(isNavActive(ROUTES.SPEECH_COACH, "/speech-coach/setup")).toBe(true);
  expect(isNavActive(ROUTES.SPEECH_COACH, "/speech-coach/templates")).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
Expected: FAIL because only `/speech-coach` is currently treated as active.

- [ ] **Step 3: Add explicit route helpers**

```ts
export const ROUTES = {
  // existing routes...
  SPEECH_COACH: "/speech-coach",
  SPEECH_COACH_SETUP: "/speech-coach/setup",
  SPEECH_COACH_TEMPLATES: "/speech-coach/templates",
} as const;
```

- [ ] **Step 4: Update nav activation rules**

```ts
if (href === ROUTES.SPEECH_COACH) {
  return pathname.startsWith(ROUTES.SPEECH_COACH);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
Expected: PASS with the new speech coach routes treated as active.

- [ ] **Step 6: Commit**

```bash
git add src/core/routes.ts src/shared/lib/navigation.ts src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
git commit -m "feat: add stable speech coach route helpers"
```

## Task 2: Create A Shared Therapist Speech Coach Route Layout

**Files:**
- Create: `src/app/(app)/speech-coach/layout.tsx`
- Create: `src/features/speech-coach/components/speech-coach-sections.ts`
- Create: `src/features/speech-coach/components/speech-coach-shell.tsx`
- Create: `src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx`

- [ ] **Step 1: Write the failing shell test**

```tsx
it("renders Sessions, Setup, and Templates navigation for therapists", () => {
  render(
    <SpeechCoachShell>
      <div>Setup content</div>
    </SpeechCoachShell>
  );

  expect(screen.getByRole("link", { name: "Sessions" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Setup" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Templates" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute("aria-current", "page");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx`
Expected: FAIL because the therapist route layout does not exist yet.

- [ ] **Step 3: Create shared section definitions**

```ts
import { ROUTES } from "@/core/routes";

export const SPEECH_COACH_SECTIONS = [
  { id: "sessions", label: "Sessions", href: ROUTES.SPEECH_COACH },
  { id: "setup", label: "Setup", href: ROUTES.SPEECH_COACH_SETUP },
  { id: "templates", label: "Templates", href: ROUTES.SPEECH_COACH_TEMPLATES },
] as const;
```

- [ ] **Step 4: Create the shared route layout**

```tsx
export default function SpeechCoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <SpeechCoachShell>{children}</SpeechCoachShell>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx`
Expected: PASS with the route layout driving shared navigation and active-state behavior.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(app)/speech-coach/layout.tsx' src/features/speech-coach/components/speech-coach-sections.ts src/features/speech-coach/components/speech-coach-shell.tsx src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx
git commit -m "feat: add shared speech coach route layout"
```

## Task 3: Add The Stable `/speech-coach/setup` Route

**Files:**
- Create: `src/app/(app)/speech-coach/setup/page.tsx`
- Modify: `src/features/speech-coach/components/slp-speech-coach-page.tsx`
- Test: `src/features/speech-coach/components/__tests__/coach-setup-tab.test.tsx`

- [ ] **Step 1: Write the failing route/setup test**

```tsx
it("renders setup inside the shared route layout instead of local tabs", async () => {
  render(<SlpSpeechCoachPage patientId={"patient" as never} homeProgramId={"program" as never} />);
  expect(await screen.findByRole("heading", { name: "Speech Coach" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute("aria-current", "page");
  expect(screen.queryByRole("button", { name: "Template" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/speech-coach/components/__tests__/coach-setup-tab.test.tsx`
Expected: FAIL because setup currently renders its own local `Coach Setup` / `Template` tab strip.

- [ ] **Step 3: Add the route wrapper**

```tsx
import { SlpSpeechCoachPage } from "@/features/speech-coach/components/slp-speech-coach-page";

export default function SpeechCoachSetupRoute() {
  return <SlpSpeechCoachPage />;
}
```

- [ ] **Step 4: Remove the local tab strip from `SlpSpeechCoachPage` and plug into the shell**

```tsx
return (
  <CoachSetupContent
    key={JSON.stringify(program.speechCoachConfig.coachSetup ?? null)}
    speechCoachConfig={program.speechCoachConfig}
    onSave={handleSaveCoachSetup}
    isSaving={isSavingSetup}
  />
);
```

- [ ] **Step 5: Move template assignment out of `SlpSpeechCoachPage`**

```tsx
// Delete the local Tab union and TemplateAssignmentPanel render branch.
// Keep only coach setup responsibilities in this component.
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/features/speech-coach/components/__tests__/coach-setup-tab.test.tsx`
Expected: PASS with setup rendered as a dedicated route inside the shared layout.

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(app)/speech-coach/setup/page.tsx' src/features/speech-coach/components/slp-speech-coach-page.tsx src/features/speech-coach/components/__tests__/coach-setup-tab.test.tsx
git commit -m "feat: add dedicated speech coach setup route"
```

## Task 4: Convert The Templates Page Into A First-Class Speech Coach Section

**Files:**
- Modify: `src/features/speech-coach/components/template-library-page.tsx`
- Modify: `src/app/(app)/speech-coach/templates/page.tsx`
- Modify: `src/features/speech-coach/components/__tests__/template-library-page.test.tsx`

- [ ] **Step 1: Write the failing template discoverability test**

```tsx
it("renders the Templates section inside the speech coach shell with assign/apply actions", async () => {
  render(<TemplateLibraryPage />);
  expect(await screen.findByRole("link", { name: "Templates" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "New template" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Apply to child/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-library-page.test.tsx`
Expected: FAIL because the current page renders standalone and has no direct apply action.

- [ ] **Step 3: Route the template page through the shared layout**

```tsx
return (
  <TemplateLibraryPageContent />
);
```

- [ ] **Step 4: Add a direct apply affordance per template**

```tsx
<Button asChild type="button" variant="outline" size="sm">
  <Link href={`${ROUTES.SPEECH_COACH_SETUP}?templateId=${t._id}`}>
    Apply to child
  </Link>
</Button>
```

- [ ] **Step 5: Improve the empty state**

```tsx
<div className="rounded-xl bg-muted px-6 py-10 text-center">
  <p className="text-sm text-muted-foreground">
    No templates yet. Create one now, then apply it from this page when a child is ready.
  </p>
  <Button type="button" onClick={() => setCreating(true)} className="mt-4">
    Create first template
  </Button>
</div>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-library-page.test.tsx`
Expected: PASS with visible shell nav and direct apply actions.

- [ ] **Step 7: Commit**

```bash
git add src/features/speech-coach/components/template-library-page.tsx 'src/app/(app)/speech-coach/templates/page.tsx' src/features/speech-coach/components/__tests__/template-library-page.test.tsx
git commit -m "feat: make speech coach templates a first-class section"
```

## Task 5: Keep Sessions As The Default Section And Link Empty States Forward

**Files:**
- Modify: `src/features/speech-coach/components/speech-coach-page.tsx`
- Modify: `src/features/speech-coach/components/session-history.tsx`
- Test: `src/features/speech-coach/components/__tests__/session-history.test.tsx`

- [ ] **Step 1: Write the failing sessions-empty-state test**

```tsx
it("links incomplete setup forward to Setup and Templates", async () => {
  render(<SpeechCoachPage patientId={"patient" as never} homeProgramId={"program" as never} />);
  expect(await screen.findByRole("link", { name: "Open setup" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse templates" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/speech-coach/components/__tests__/session-history.test.tsx`
Expected: FAIL because the current sessions surface does not point users to setup/templates.

- [ ] **Step 3: Route the sessions page through the shared layout**

```tsx
return (
  <SpeechCoachSessionsContent />
);
```

- [ ] **Step 4: Add forward actions when no assignment/setup is available**

```tsx
<div className="rounded-2xl bg-muted/30 p-4">
  <p className="text-sm text-muted-foreground">
    Set up this child’s coach before starting a session.
  </p>
  <div className="mt-3 flex gap-3">
    <Button asChild size="sm">
      <Link href={ROUTES.SPEECH_COACH_SETUP}>Open setup</Link>
    </Button>
    <Button asChild size="sm" variant="outline">
      <Link href={ROUTES.SPEECH_COACH_TEMPLATES}>Browse templates</Link>
    </Button>
  </div>
</div>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/features/speech-coach/components/__tests__/session-history.test.tsx`
Expected: PASS with sessions linking forward to setup and templates.

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/components/speech-coach-page.tsx src/features/speech-coach/components/session-history.tsx src/features/speech-coach/components/__tests__/session-history.test.tsx
git commit -m "feat: link speech coach sessions to setup and templates"
```

## Task 6: Full Verification Pass

**Files:**
- Modify: none unless fixes are required
- Test: `src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx`
- Test: `src/features/speech-coach/components/__tests__/coach-setup-tab.test.tsx`
- Test: `src/features/speech-coach/components/__tests__/template-library-page.test.tsx`
- Test: `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx src/features/speech-coach/components/__tests__/coach-setup-tab.test.tsx src/features/speech-coach/components/__tests__/template-library-page.test.tsx src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
Expected: PASS with route-aware discoverability covered.

- [ ] **Step 2: Run type-check verification**

Run: `npx tsc --noEmit`
Expected: PASS with route-layout and narrowed setup-component changes reflected across route wrappers and feature components.

- [ ] **Step 3: Manually verify the route flow**

```txt
1. Open /speech-coach as therapist and confirm Sessions, Setup, and Templates are visible.
2. Click Setup and confirm the coach setup form renders without the old local tab strip.
3. Click Templates and confirm the template library renders in the same shell.
4. Use Apply to child from a template, pick a child/program explicitly, and confirm the flow lands in the correct setup surface.
5. Open Speech Coach as caregiver and confirm therapist-only authoring controls are not shown.
6. Open standalone `/speech-coach` and confirm preview/history behavior still works after the therapist layout split.
```

- [ ] **Step 4: Commit any final verification fixes**

```bash
git add src/core/routes.ts src/features/speech-coach src/shared/lib/navigation.ts src/features/dashboard/components
git commit -m "test: verify speech coach navigation and template discoverability"
```

## Self-Review

### Spec Coverage

- Single top-level sidebar item preserved: Tasks 1 and 6.
- In-area `Sessions`, `Setup`, `Templates` navigation: Tasks 2 through 5.
- Stable route model: Tasks 1 and 3.
- Clear links between sessions, setup, and templates: Tasks 4 and 5.
- Simpler caregiver experience: Tasks 3, 4, and 6.

### Placeholder Scan

- No `TODO`, `TBD`, or vague “handle later” language remains.
- Each task includes concrete file paths, commands, and code snippets.

### Type Consistency

- Route names used consistently: `ROUTES.SPEECH_COACH`, `ROUTES.SPEECH_COACH_SETUP`, `ROUTES.SPEECH_COACH_TEMPLATES`.
- Shared shell name used consistently: `SpeechCoachShell`.
- Shared section constant used consistently: `SPEECH_COACH_SECTIONS`.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 10 issues resolved, route-layout contradiction removed, apply-to-child flow made explicit |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**OUTSIDE VOICE:** Claude Code CLI run captured 6 additional plan fixes, all accepted.
**UNRESOLVED:** 0
**VERDICT:** ENG CLEARED — ready to implement.
