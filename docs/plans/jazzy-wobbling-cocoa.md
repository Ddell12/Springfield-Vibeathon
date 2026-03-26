# Fix UI Issues Found in Playwright Testing

## Context

Automated Playwright testing across all 7 routes of the Bridges app revealed 3 actionable issues:
1. A false-positive navigation failure (test artifact, not a code bug)
2. 59/119 interactive elements below the 44px WCAG 2.5.8 touch target minimum on mobile
3. Missing `<h1>` on the builder page (accessibility)

This plan fixes the 2 real issues (touch targets + missing h1) across 3 files, using the app's existing `min-h-[44px]` pattern already established in `mobile-nav-drawer.tsx` and `empty-state.tsx`.

## Issue 1: Landing Page CTA — SKIP (False Positive)

The "Start Building" CTA is a standard `<Link href="/builder">` in `src/shared/components/marketing-header.tsx:53-58`. No overlays, no click interceptors. The Playwright test used `wait_for_load_state("networkidle")` which doesn't detect Next.js client-side navigations. **No code change needed.**

---

## Issue 2: Mobile Tap Targets Below 44px

### File 1: `src/features/builder/components/builder-toolbar.tsx`

**Back button (line 64-70):** `h-7 w-7` → `min-h-[44px] min-w-[44px]`
```tsx
// Before
className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br..."
// After
className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded bg-gradient-to-br..."
```

**New chat button (line 73-81):** same change `h-7 w-7` → `min-h-[44px] min-w-[44px]`

**Device toggle buttons (lines 189-203):** `p-1.5` → add `min-h-[44px] min-w-[44px] flex items-center justify-center`
```tsx
// Before
className="rounded-md p-1.5 transition-all active:scale-95"
// After
className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 transition-all active:scale-95"
```

**Share button (line 217-225):** `h-8` → `min-h-[44px]`

**Publish button (line 226-233):** `h-8` → `min-h-[44px]`

**Mobile Chat/Preview toggles (lines 123-149):** add `min-h-[44px]` to each tab button

### File 2: `src/features/dashboard/components/project-card.tsx`

**Menu/delete button (line 92-101):** `h-8 w-8` → `min-h-[44px] min-w-[44px]`
- Keep the visual circle compact by leaving `h-8 w-8` on the inner icon container
- The outer button gets the larger tap target

```tsx
// Before
className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/90..."
// After
className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface-container-lowest/90..."
```

Note: The user avatar (`h-8 w-8` at line 131) is non-interactive — no change needed.

### File 3: `src/features/dashboard/components/dashboard-view.tsx`

**Tab triggers (lines 125-148):** Add `min-h-[44px]` to all 4 `TabsTrigger` className props
```tsx
// Before
className="pb-4 font-body text-sm data-[state=active]:font-bold..."
// After
className="min-h-[44px] pb-4 font-body text-sm data-[state=active]:font-bold..."
```

**Template chip buttons (lines ~105-117):** Add `min-h-[44px]` to the chip button className
```tsx
// Look for the chip button and add min-h-[44px]
```

---

## Issue 3: Builder Page Missing `<h1>`

### File: `src/features/builder/components/builder-toolbar.tsx`

Wrap the project name display (both editing and viewing states) in `<h1 className="contents">`:

```tsx
// Before (lines ~83-104)
{isEditingName ? (
  <input ... />
) : (
  <button ... >{projectName}</button>
)}

// After
<h1 className="contents">
  {isEditingName ? (
    <input ... />
  ) : (
    <button ... >{projectName}</button>
  )}
</h1>
```

`display: contents` generates no box, so flex layout is unaffected. Screen readers get a proper heading.

---

## Implementation Order

1. **builder-toolbar.tsx** — Add `<h1 className="contents">` wrapper (Issue 3)
2. **builder-toolbar.tsx** — Fix 6 tap target groups (Issue 2)
3. **project-card.tsx** — Fix menu button tap target (Issue 2)
4. **dashboard-view.tsx** — Fix tab triggers + chip buttons (Issue 2)

## Files Modified
- `src/features/builder/components/builder-toolbar.tsx`
- `src/features/dashboard/components/project-card.tsx`
- `src/features/dashboard/components/dashboard-view.tsx`

## Reference (read-only)
- `src/shared/components/mobile-nav-drawer.tsx` — established `min-h-[44px]` pattern
- `src/shared/components/empty-state.tsx` — established `min-h-[44px]` pattern

## Verification

1. **Visual regression:** Run Playwright screenshots at 390x844 and 1280x900 viewports, compare before/after
2. **Tap target audit:** Re-run the mobile tap target counter script — target: <10 undersized elements (down from 59)
3. **Accessibility:** Verify `<h1>` exists on `/builder` with the a11y audit script
4. **Existing tests:** Run `npx vitest run` — no test changes expected
5. **Manual check:** Verify builder toolbar buttons still look compact on desktop (visual size unchanged, only tap area enlarged)
