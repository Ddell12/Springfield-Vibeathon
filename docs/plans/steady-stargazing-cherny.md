# Frontend Polish Plan — "Digital Sanctuary" Alignment

## Context

The Bridges app has a well-defined design system (`.stitch/DESIGN.md` — "The Digital Sanctuary") with Material 3 tonal surfaces, OKLCH colors, Manrope/Inter typography, and strict rules (no 1px borders, gradient CTAs, 300ms+ animations). The `globals.css` already implements most tokens correctly, but there are **systematic violations** across ~25 files: 1px borders used for sectioning, missing shadcn-compat token aliases that break Card/Button rendering, inconsistent font/color token usage, and flat CTAs where gradients are specified. This plan fixes all violations and polishes every page to match the design system.

---

## Phase 1: Foundation — Token Aliases & Core Primitives

**Why first:** Every page depends on these. Fixing them propagates improvements app-wide.

### 1A. `src/app/globals.css` — Add Missing shadcn-compat Aliases

The `@theme` block needs aliases that shadcn components reference:

```css
/* Inside @theme { } — after the outline-variant line (~line 56) */
--color-card: oklch(1 0 0);                          /* surface-container-lowest */
--color-card-foreground: oklch(0.192 0.020 255);     /* on-surface */
--color-popover: oklch(1 0 0);
--color-popover-foreground: oklch(0.192 0.020 255);
--color-primary-foreground: oklch(1 0 0);            /* on-primary */
--color-secondary-foreground: oklch(1 0 0);          /* on-secondary */
--color-accent: oklch(0.958 0.012 268);              /* surface-container-low */
--color-accent-foreground: oklch(0.192 0.020 255);
--color-destructive: oklch(0.454 0.170 25);          /* error */
--color-destructive-foreground: oklch(1 0 0);
--color-muted-foreground: oklch(0.370 0.018 195);    /* on-surface-variant */
--color-ring: oklch(0.352 0.055 192);                /* primary */
--color-input: oklch(0.920 0.014 262);               /* surface-container-high */
--color-sidebar-background: oklch(0.940 0.014 265);  /* surface-container */
--color-sidebar-foreground: oklch(0.192 0.020 255);
--color-sidebar-accent: oklch(0.958 0.012 268);
--color-sidebar-accent-foreground: oklch(0.192 0.020 255);
```

Also add matching dark mode overrides in `.dark { }`:

```css
--color-card: oklch(0.230 0.020 260);
--color-card-foreground: oklch(0.928 0.014 268);
--color-popover: oklch(0.230 0.020 260);
--color-popover-foreground: oklch(0.928 0.014 268);
--color-primary-foreground: oklch(1 0 0);
--color-secondary-foreground: oklch(1 0 0);
--color-accent: oklch(0.280 0.018 260);
--color-accent-foreground: oklch(0.928 0.014 268);
--color-destructive: oklch(0.600 0.170 25);
--color-destructive-foreground: oklch(1 0 0);
--color-muted-foreground: oklch(0.778 0.016 220);
--color-ring: oklch(0.441 0.063 190);
--color-input: oklch(0.280 0.018 260);
--color-sidebar-background: oklch(0.190 0.017 260);
--color-sidebar-foreground: oklch(0.928 0.014 268);
--color-sidebar-accent: oklch(0.280 0.018 260);
--color-sidebar-accent-foreground: oklch(0.928 0.014 268);
```

Fix dark mode glass effect (line 104):

```css
.dark .glass-effect {
  background: oklch(0.155 0.015 260 / 0.8);
}
```

### 1B. `src/shared/components/ui/button.tsx`

- **default variant**: Add `duration-300` → `"bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"`
- **destructive variant**: Add `transition-all duration-300`
- **outline variant**: Add `transition-all duration-300`
- **secondary variant**: Add `transition-all duration-300`

### 1C. `src/shared/components/ui/card.tsx`

No changes needed — once `--color-card` exists from 1A, `bg-card text-card-foreground` resolves.

### Verification

```bash
npm run build   # Ensure no broken token references
```
Then `agent-browser` screenshot of `/dashboard` and `/templates` in light + dark mode.

---

## Phase 2: Border Violations — The "No-Line" Rule

Replace **sectioning borders** with tonal background shifts. Keep ghost borders (10-15% opacity) on interactive/floating elements per DESIGN.md Section 4.

### Files & Changes

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `landing/landing-footer.tsx` | 3 | `border-t border-outline-variant/10` | Remove border, change `bg-surface` to `bg-surface-container-low` |
| `builder/chat-panel.tsx` | 36 | AssistantBubble `border border-outline-variant/15` | Remove border (bg-surface-container provides tonal distinction) |
| `builder/chat-panel.tsx` | 225 | Form `border-t border-border/40` | Remove border-t, change bg to `bg-surface-container-low` |
| `builder/blueprint-card.tsx` | ~31 | `outline outline-1 outline-outline-variant/15` | Remove (shadow already provides depth) |
| `builder/blueprint-card.tsx` | ~35 | Header `border-b border-outline-variant/10` | Remove border, use `bg-surface-container-low` on header |
| `dashboard/dashboard-view.tsx` | 110 | Chips `ring-1 ring-outline-variant/10` | Remove ring |
| `dashboard/dashboard-view.tsx` | 121 | TabsList `border-b border-outline-variant/10` | Remove border |
| `dashboard/main-prompt-input.tsx` | ~30 | `ring-1 ring-outline-variant/10` | Remove ring |
| `flashcards/flashcard-page.tsx` | 197 | Input wrapper `border border-outline-variant/40` | Replace with `bg-surface-container-high` (no border) |
| `flashcards/flashcard-chat-panel.tsx` | ~119 | `border-t border-border/40` | Replace with `bg-surface-container-low` |
| `flashcards/flashcard-preview-panel.tsx` | ~74 | `border-b border-border/30` | Replace with tonal bg shift |
| `my-tools/my-tools-page.tsx` | 95 | `ring-1 ring-outline-variant/10` | Remove ring |
| `marketing-header.tsx` | 44 | Active nav `border-b-2 border-primary pb-1` | Replace with `bg-primary/10 text-primary rounded-lg` |
| `shared/suggestion-chips.tsx` | ~17 | `border border-outline-variant/40` | Replace with `bg-surface-container` (no border) |
| `shared/tool-card.tsx` | ~40 | `ring-1 ring-outline-variant/10` | Remove ring |
| `billing/billing-section.tsx` | ~86 | `border-t border-outline-variant` | Replace with `bg-surface-container-low` section bg |
| `builder/interview/interview-controller.tsx` | 46, 249 | `border border-outline-variant/15` | Remove border on assistant bubbles |

### Verification

`agent-browser` screenshots of `/`, `/dashboard`, `/builder`, `/templates`, `/my-tools` — compare before/after.

---

## Phase 3: Typography & Token Consistency

### 3A. Add `font-headline` to Headings Missing It

| File | Element | Fix |
|------|---------|-----|
| `patients/patients-page.tsx:43` | `<h1>` "My Caseload" | Add `font-headline`, change `text-foreground` → `text-on-surface` |
| `patients/patient-detail-page.tsx` | Main heading | Add `font-headline` if missing |
| `session-notes/session-notes-list.tsx` | Section headings | Replace `font-manrope` with `font-headline` |
| `session-notes/session-note-editor.tsx` | Section headings | Replace inline font-family with `font-headline` |
| `goals/` component headings | Various | Add `font-headline` where missing |

### 3B. Replace `text-foreground` with `text-on-surface`

Both alias to the same color, but `on-surface` is the correct Material 3 semantic token. Key files:

- `patient-row.tsx:32`, `chat-panel.tsx:26,37`, `flashcard-page.tsx:181`, `empty-state.tsx:129`
- Multiple files in `session-notes/`, `goals/`, `family/`

### 3C. Replace `text-muted-foreground` with `text-on-surface-variant`

- All instances in `preview-panel.tsx`, `session-notes/`, `duration-preset-input.tsx`

---

## Phase 4: CTA & Button Consistency

### 4A. Flat Primary CTAs → Gradient

| File | Current | Fix |
|------|---------|-----|
| `my-tools/my-tools-page.tsx:108` | `bg-primary text-on-primary` | `bg-primary-gradient text-on-primary` |
| `patients/patients-page.tsx:50` | Default `<Button>` | Add `variant="gradient"` |

### 4B. Link-styled CTAs → Button Component

Wrap raw `<Link>` elements that look like buttons in `<Button asChild>`:

- `hero-section.tsx:27-37` — primary CTA
- `my-tools-page.tsx:46-50, 68-74` — CTA links

### 4C. Add `duration-300` Where Missing

Search `transition-colors` without `duration-300` across all files. Add `duration-300` to:
- `landing-footer.tsx` link hovers
- `marketing-header.tsx` nav link hovers
- Various component hover states

---

## Phase 5: Animation Polish

### 5A. Ensure 300ms Minimum on All Transitions

Replace any `duration-200` with `duration-300` across:
- `builder-toolbar.tsx:132` — segmented control `duration-200` → `duration-300`
- WAB scaffold `index.css` — card-interactive, btn-primary animations at 200ms → 300ms

### 5B. Enhance Key Hover States

| Component | Current | Enhanced |
|-----------|---------|----------|
| `project-card.tsx` | `hover:-translate-y-2` | Add `hover:shadow-[0_24px_48px_rgba(19,29,30,0.08)]` |
| `how-it-works.tsx` cards | `hover:shadow-md` | Add `hover:-translate-y-1` |
| `testimonials.tsx` cards | No hover | Add `hover:-translate-y-1 hover:shadow-md transition-all duration-300` |

---

## Phase 6: Visual Atmosphere Enhancements

### 6A. Landing Hero — Add Depth

`hero-section.tsx`: Add subtle radial gradient orb behind hero content:

```tsx
{/* Atmospheric gradient orb */}
<div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
<div className="absolute -bottom-48 -left-48 h-[400px] w-[400px] rounded-full bg-secondary/5 blur-[100px]" />
```

Add `relative overflow-hidden` to the section wrapper.

### 6B. Dashboard Prompt Area — Add Atmosphere

`dashboard-view.tsx` hero section: Add subtle gradient background:

```tsx
<section className="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center overflow-hidden">
  <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-primary/3 blur-[80px]" />
  {/* existing content with relative z-10 */}
</section>
```

### 6C. Template Cards — Richer Hover

`templates-page.tsx` cards already have good hover. Add subtle scale:
`hover:shadow-xl hover:-translate-y-1` → `hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.01]`

---

## Phase 7: Page-Specific Polish

### 7A. Patients Page
- Add `font-headline` to heading, fix token to `text-on-surface`
- Filter pills: already good
- Patient rows: already have good tonal surfaces and transitions
- Empty state: already has the EmptyState component

### 7B. Settings Page
- Already uses proper tonal surfaces (`bg-surface`, `bg-surface-container-lowest`)
- Mobile dropdown: already polished
- No significant changes needed

### 7C. Family Portal Pages
- Quick scan for border violations and missing `font-headline`
- Fix any `text-foreground` → `text-on-surface`

---

## Execution Order (by file, to minimize context switching)

1. `src/app/globals.css`
2. `src/shared/components/ui/button.tsx`
3. `src/shared/components/suggestion-chips.tsx`
4. `src/shared/components/marketing-header.tsx`
5. `src/shared/components/empty-state.tsx`
6. `src/shared/components/project-card.tsx`
7. `src/shared/components/tool-card.tsx`
8. `src/features/landing/components/landing-footer.tsx`
9. `src/features/landing/components/hero-section.tsx`
10. `src/features/landing/components/how-it-works.tsx`
11. `src/features/landing/components/testimonials.tsx`
12. `src/features/landing/components/cta-section.tsx`
13. `src/features/builder/components/chat-panel.tsx`
14. `src/features/builder/components/blueprint-card.tsx`
15. `src/features/builder/components/builder-toolbar.tsx`
16. `src/features/builder/components/interview/interview-controller.tsx`
17. `src/features/dashboard/components/dashboard-view.tsx`
18. `src/features/dashboard/components/main-prompt-input.tsx`
19. `src/features/flashcards/components/flashcard-page.tsx`
20. `src/features/flashcards/components/flashcard-chat-panel.tsx`
21. `src/features/flashcards/components/flashcard-preview-panel.tsx`
22. `src/features/my-tools/components/my-tools-page.tsx`
23. `src/features/patients/components/patients-page.tsx`
24. `src/features/patients/components/patient-row.tsx`
25. `src/features/billing/components/billing-section.tsx`
26. `src/features/session-notes/` components (bulk token fixes)
27. `src/features/family/` components (bulk token fixes)

---

## Verification Strategy

After each phase:

1. **Build check**: `npm run build` — catch broken token refs
2. **Visual check**: `agent-browser` screenshots of key pages
3. **Test suite**: `npm test` — catch regressions in component tests
4. **Dark mode**: Verify every changed page in both light/dark
5. **Mobile**: Check responsive layout at 375px width

Key pages to screenshot:
- `/` (landing — hero, how-it-works, testimonials, footer)
- `/dashboard` (prompt area, tabs, project cards)
- `/builder/{session}` (toolbar, chat, preview)
- `/templates` (card grid, CTA)
- `/my-tools` (project grid, CTA section)
- `/patients` (header, filters, patient list)
- `/flashcards` (prompt screen)
- `/settings` (sidebar, sections)

---

## Risk Mitigation

- **Test token aliases first** — broken `--color-card` cascades to every Card
- **Preserve ghost borders on floating elements** — dialogs, sheets, popovers keep their borders
- **Do not remove borders on inputs/checkboxes** — form elements need borders for usability
- **Run tests after Phase 1** — token changes can break snapshot tests
- **Keep `transition-all` instead of adding custom easing** — Tailwind's default ease is close enough to sanctuary easing for most transitions
