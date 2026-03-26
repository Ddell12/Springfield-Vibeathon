# Fix 3 UI Issues from Playwright Testing

## Issue 1: Landing Page "Start Building" CTA Navigation — SKIP (False Positive)

**Verdict:** No code change required. The CTA is a standard `<Link href="/builder">` in `src/shared/components/marketing-header.tsx` (line 53-58). The Playwright test used `wait_for_load_state("networkidle")` which does not detect Next.js App Router client-side navigations. The URL change happens asynchronously after prefetched route activation.

**If test verification is desired (optional):** Replace `page.wait_for_load_state("networkidle")` with `page.waitForURL("**/builder")` in the test harness. No app code changes.

---

## Issue 2: Mobile Tap Targets Below 44px Minimum (WCAG 2.5.8)

### Problem
59 of 119 interactive elements on the dashboard fail the 44px minimum touch target requirement on a 390px mobile viewport.

### Existing Pattern to Follow
The codebase already uses `min-h-[44px]` correctly in two places:
- `src/shared/components/mobile-nav-drawer.tsx` line 86: `min-h-[44px]`
- `src/shared/components/empty-state.tsx` line 62: `min-h-[44px]`

### Strategy
Use `min-h-[44px] min-w-[44px]` for icon-only buttons and `min-h-[44px]` for text buttons. This expands the clickable/tappable area without changing the visual size of icons. Applied universally (not behind a breakpoint) since 44px tap targets are fine on desktop too.

### File 1: `src/features/builder/components/builder-toolbar.tsx`

**Change A — Back button (line 64-70):**
Current: `className="flex h-7 w-7 flex-shrink-0 items-center justify-center ..."`
Change: Replace `h-7 w-7` with `min-h-[44px] min-w-[44px]` (remove the fixed h-7 w-7).
```tsx
// Line 66 — change this:
"flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br ..."
// To this:
"flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded bg-gradient-to-br ..."
```

**Change B — New chat button (line 73-81):**
Current: `className="flex h-7 w-7 flex-shrink-0 items-center justify-center ..."`
Change: Replace `h-7 w-7` with `min-h-[44px] min-w-[44px]`.
```tsx
// Line 75 — change this:
"flex h-7 w-7 flex-shrink-0 items-center justify-center rounded ..."
// To this:
"flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded ..."
```

**Change C — Device toggle buttons (lines 189-203):**
Current: `className="rounded-md p-1.5 transition-all ..."`
Change: Add `min-h-[44px] min-w-[44px] flex items-center justify-center` to ensure the tap area is large enough. These are only visible on `lg:` screens (the parent div is `hidden lg:flex`), so this is a preventive fix for accessibility audits. The visual impact is minimal since `p-1.5` stays and `min-*` just ensures a floor.
```tsx
// Line 193-198 — change this:
"rounded-md p-1.5 transition-all active:scale-95",
// To this:
"flex items-center justify-center rounded-md p-1.5 min-h-[44px] min-w-[44px] transition-all active:scale-95",
```

**Change D — Share button (line 217-225):**
Current: `className="h-8 gap-1.5 rounded-md px-3 text-xs ..."`
Change: Replace `h-8` with `min-h-[44px]`.
```tsx
// Line 220 — change this:
"h-8 gap-1.5 rounded-md px-3 text-xs font-semibold ..."
// To this:
"min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold ..."
```

**Change E — Publish button (line 226-233):**
Current: `className="h-8 rounded-lg bg-primary-container px-4 ..."`
Change: Replace `h-8` with `min-h-[44px]`.
```tsx
// Line 228 — change this:
"h-8 rounded-lg bg-primary-container px-4 text-[13px] ..."
// To this:
"min-h-[44px] rounded-lg bg-primary-container px-4 text-[13px] ..."
```

**Change F — Mobile panel toggle buttons (lines 123-148):**
The Chat/Preview tab buttons at lines 127-132 and 140-145 use `px-3 py-1` which yields a height well below 44px.
Change: Add `min-h-[44px]` to each button.
```tsx
// Line 128 — add min-h-[44px]:
"rounded-md px-3 py-1 min-h-[44px] text-[13px] font-semibold ..."
// Line 140 — add min-h-[44px]:
"rounded-md px-3 py-1 min-h-[44px] text-[13px] font-semibold ..."
```

**Side effect on toolbar height:** The header is currently `h-12` (48px). Expanding icon buttons to 44px with padding still fits within 48px. The Share and Publish buttons growing from 32px to 44px min-height will push to fill vertically, which is fine since the header is already 48px. No header height change needed.

### File 2: `src/features/dashboard/components/project-card.tsx`

**Change A — Menu/options button (line 92-101):**
Current: `className="flex h-8 w-8 items-center justify-center ..."`
Change: Replace `h-8 w-8` with `min-h-[44px] min-w-[44px]`.
```tsx
// Line 97 — change this:
"flex h-8 w-8 items-center justify-center rounded-full ..."
// To this:
"flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full ..."
```
Note: The visual circle bg (`bg-surface-container-lowest/90`) will grow to 44px. This is acceptable since the button sits in the thumbnail's upper-right corner with adequate space. Alternatively, to keep the visual circle at 32px but expand the tap target, use a wrapper approach:
```tsx
<button
  onClick={...}
  className="relative flex min-h-[44px] min-w-[44px] items-center justify-center"
  aria-label="App options"
>
  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface-variant shadow-sm backdrop-blur-sm">
    <MaterialIcon icon="more_vert" size="sm" />
  </span>
</button>
```
**Recommendation:** Use the wrapper approach for this button to keep the visual 32px circle but expand the tap target. This is the more polished solution.

**Change B — User avatar circle (line 131-138):**
This is a `<div>`, not interactive (no `onClick`, no `role="button"`). It is purely decorative. **No change needed** — tap target requirements only apply to interactive elements.

### File 3: `src/features/dashboard/components/dashboard-view.tsx`

**Change A — Dashboard tab triggers (lines 125-148):**
Current: Each `TabsTrigger` has `className="pb-4 font-body text-sm ..."` with no height constraint.
The `TabsTrigger` base component in `src/shared/components/ui/tabs.tsx` has `h-[calc(100%-1px)]` and `py-1` but the parent `TabsList` is `h-9` (36px) for horizontal tabs. The line variant overrides make the height auto. Either way, the actual rendered height depends on font size + padding and is below 44px.

Change: Add `min-h-[44px]` to each `TabsTrigger`.
```tsx
// Line 127 — change this:
"pb-4 font-body text-sm data-[state=active]:font-bold ..."
// To this:
"pb-4 min-h-[44px] font-body text-sm data-[state=active]:font-bold ..."

// Line 133 — change this:
"pb-4 font-body text-sm text-on-surface-variant ..."
// To this:
"pb-4 min-h-[44px] font-body text-sm text-on-surface-variant ..."

// Line 139 — change this:
"pb-4 font-body text-sm text-on-surface-variant ..."
// To this:
"pb-4 min-h-[44px] font-body text-sm text-on-surface-variant ..."

// Line 145 — change this:
"pb-4 font-body text-sm text-on-surface-variant ..."
// To this:
"pb-4 min-h-[44px] font-body text-sm text-on-surface-variant ..."
```

**Change B — Mobile header avatar (line 70-72):**
The avatar `div` at `h-8 w-8` is not interactive, so no tap target fix needed. However, if this is intended to become a profile menu trigger in the future, consider wrapping it in a `min-h-[44px] min-w-[44px]` button. **For now: skip.**

**Change C — Template chips (lines 110-117):**
Current: `className="rounded-full bg-surface-container-low px-5 py-2 ..."`
The `py-2` (8px top + 8px bottom) + text size gives roughly 36px height, below 44px.
Change: Add `min-h-[44px]` to template chip buttons.
```tsx
// Line 113 — change this:
"rounded-full bg-surface-container-low px-5 py-2 font-body text-sm ..."
// To this:
"rounded-full bg-surface-container-low px-5 py-2 min-h-[44px] font-body text-sm ..."
```

---

## Issue 3: Builder Page Missing h1 (Accessibility)

### Problem
The builder page at `/builder` renders an `<header>` with the project name inside a `<button>` (for rename), but no `<h1>` element exists. Screen readers cannot identify the page heading.

### File: `src/features/builder/components/builder-toolbar.tsx`

### Approach
Wrap the existing project name display (both the editing input and the display button) in an `<h1>` tag. The `<h1>` will inherit the existing visual styling (13px semibold) which is intentionally compact for the toolbar context. This is acceptable per HTML spec — the heading level conveys document structure to assistive tech, not visual prominence.

**Change — Lines 83-104:**
Currently:
```tsx
{isEditingName ? (
  <input ... />
) : (
  <button ... >
    {projectName}
  </button>
)}
```

Wrap in an `<h1>` with reset styles:
```tsx
<h1 className="contents">
  {isEditingName ? (
    <input ... />
  ) : (
    <button ... >
      {projectName}
    </button>
  )}
</h1>
```

The `contents` class (`display: contents`) makes the `<h1>` invisible to layout — it contributes no box of its own, so existing flex alignment is unaffected. The heading semantics are still picked up by assistive technology.

**Alternative (sr-only):** If there is concern about `display: contents` support or if we want a descriptive heading that differs from the editable name:
```tsx
<h1 className="sr-only">{projectName} — Bridges Builder</h1>
{isEditingName ? ( ... ) : ( ... )}
```

**Recommendation:** Use the `contents` approach. It is cleaner, supported in all modern browsers, and the project name is the most meaningful heading for the page.

---

## Test Impact Assessment

### Existing E2E tests that may need updates:

1. **`tests/e2e/builder-flow.spec.ts`** — Tests builder page navigation and chat input visibility. The `<h1>` addition does not affect these selectors. The tap target changes do not affect any selectors used. **No changes needed.**

2. **`tests/e2e/smoke.spec.ts`** — Only checks `page.goto("/")` and body visibility. **No changes needed.**

3. **`tests/e2e/landing.spec.ts`** and **`tests/e2e/sharing.spec.ts`** — Would need review if they query by element dimensions, but based on the pattern seen in smoke and builder-flow specs, they use semantic selectors. **Likely no changes needed.**

### New tests to consider:
- A Playwright test that verifies all interactive elements on `/builder` and `/dashboard` have a minimum bounding box of 44x44 on a 390px viewport. This would prevent regression.

---

## Implementation Sequence

1. **Issue 3 first** (builder-toolbar.tsx h1 wrap) — smallest change, no visual impact, one file
2. **Issue 2 — builder-toolbar.tsx** — tap target fixes for 6 button groups
3. **Issue 2 — project-card.tsx** — menu button wrapper approach
4. **Issue 2 — dashboard-view.tsx** — tab triggers + template chips
5. **Visual QA** — check builder toolbar and dashboard on 390px viewport to confirm no layout breaks
6. **Run existing e2e tests** to confirm no regressions

## Summary of Files to Edit

| File | Changes | Issue |
|------|---------|-------|
| `src/features/builder/components/builder-toolbar.tsx` | h1 wrap + 6 tap target fixes | #2, #3 |
| `src/features/dashboard/components/project-card.tsx` | 1 menu button wrapper | #2 |
| `src/features/dashboard/components/dashboard-view.tsx` | 4 tab triggers + template chips | #2 |

No changes to `src/shared/components/ui/tabs.tsx` — fixes are applied at the consumer level via className overrides, which is the established pattern.
