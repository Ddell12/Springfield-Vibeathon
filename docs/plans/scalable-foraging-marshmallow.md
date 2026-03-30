# Fix: Tablet Overflow + Heading Hierarchy Issues

## Context

Comprehensive Playwright testing (visual, flow, regression, DOM inspection) across all 11 routes uncovered 3 actionable issues:

1. **Horizontal overflow on marketing page at tablet (768px)** — content bleeds past viewport
2. **Heading skip H2→H4 on marketing page** — ProductPreview uses H4 for card titles with no H3
3. **Heading skip H1→H3 on templates page** — template card titles are H3 with no H2 parent

These are accessibility (WCAG 2.1) and responsive design issues. No functional bugs.

---

## Fix 1: Tablet Horizontal Overflow

**Root cause:** The Testimonials section uses `md:grid-cols-3` which kicks in at 768px — 3 columns + `gap-8` (32px×2) + `px-6` (24px×2) leaves only ~218px per card, causing overflow.

**File:** `src/features/landing/components/testimonials.tsx`
- **Line 38:** Change `md:grid-cols-3` → `lg:grid-cols-3` so 3-column grid only activates at 1024px+. At 768px it stays single-column.

```diff
- <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
+ <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
```

That's the only change needed — the `max-w-7xl` containers don't cause overflow by themselves (they're capped by viewport width via `mx-auto`). The overflow comes from the 3-column grid being too cramped at 768px.

---

## Fix 2: Heading Skip on Marketing Page (H2→H4)

**Root cause:** ProductPreview uses `<h4>` for "Visual Schedules" and "Communication Boards" card titles, but these sit under an implicit H2 section with no H3 ancestor.

**File:** `src/features/landing/components/product-preview.tsx`
- **Line 29:** Change `<h4>` → `<h3>` for "Visual Schedules"
- **Line 45:** Change `<h4>` → `<h3>` for "Communication Boards"

```diff
- <h4 className="text-3xl font-headline font-extrabold mb-2 text-on-surface">
+ <h3 className="text-3xl font-headline font-extrabold mb-2 text-on-surface">
    Visual Schedules
- </h4>
+ </h3>
```

```diff
- <h4 className="text-2xl font-headline font-extrabold mb-2">
+ <h3 className="text-2xl font-headline font-extrabold mb-2">
    Communication Boards
- </h4>
+ </h3>
```

The visual appearance stays identical (styling is via classes, not heading level). This fixes the H2→H4 skip by making it H2→H3.

---

## Fix 3: Heading Skip on Templates Page (H1→H3)

**Root cause:** Template card titles use `<h3>` but the only preceding heading is the `<h1>` page title. There's no `<h2>` between them.

**File:** `src/features/templates/components/templates-page.tsx`
- **Line 62:** Change `<h3>` → `<h2>` for template card titles

```diff
- <h3 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">
+ <h2 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">
    {template.title}
- </h3>
+ </h2>
```

This creates a clean H1→H2 hierarchy. The existing H2 "Have something else in mind?" at line 75 remains H2 (siblings are fine at the same level).

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/landing/components/testimonials.tsx` | `md:grid-cols-3` → `lg:grid-cols-3` |
| `src/features/landing/components/product-preview.tsx` | `h4` → `h3` (2 places) |
| `src/features/templates/components/templates-page.tsx` | `h3` → `h2` (1 place) |

## Verification

1. **Re-run the visual test** at tablet viewport to confirm no horizontal overflow:
   ```bash
   python3 /tmp/bridges_test_visual.py
   ```
   Expected: `horizontal_overflow: false` for home at tablet.

2. **Re-run the DOM test** to confirm heading hierarchy:
   ```bash
   python3 /tmp/bridges_test_dom.py
   ```
   Expected: 0 heading skip issues.

3. **Visual spot-check**: View `/templates` and `/` at mobile, tablet, desktop to confirm no visual regressions from heading level changes.

4. **Run existing tests**:
   ```bash
   npm test -- --run
   ```
