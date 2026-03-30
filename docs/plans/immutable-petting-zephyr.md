# Fix All Design Audit Issues

## Context

Two design audits on 2026-03-30 found systemic violations of DESIGN.md across the Bridges codebase:

1. **Visual audit** (gstack /design-review): Design Score C, AI Slop Score D. 11 landing-page fixes already committed (now B/B). Remaining issues flagged as deferred.
2. **Source-code audit** (Claude subagent): 90 font-headline violations, 100+ non-token color violations, undersized touch targets, WAB scaffold font mismatch.

This plan addresses **every remaining finding** from both audits.

---

## Workstream 1: font-headline Sweep (90 violations, 61 files)

**Rule:** `font-headline` (Fraunces) is for H1/H2 ONLY. Everything else inherits `font-body` (Instrument Sans) from the body default in globals.css.

**Mechanical fix per element type:**
- `<h3>`, `<h4>`: replace `font-headline` with `font-body`
- `<p>`, `<span>`, `<div>`, `<button>`: remove `font-headline` entirely
- `DialogTitle`, `CardTitle`, `SheetTitle`: remove `font-headline`

### Commits (grouped by feature, 8 commits)

**1a. settings** (5 files)
- `src/features/settings/components/account-section.tsx` — h3 x2 → font-body
- `src/features/settings/components/profile-section.tsx` — div → remove
- `src/features/settings/components/settings-page.tsx` — button → remove
- `src/features/settings/components/settings-sidebar.tsx` — button → remove

**1b. billing** (6 files)
- `billing-section.tsx` — h3 x2 → font-body, p → remove
- `billing-history.tsx` — CardTitle → remove
- `usage-meter.tsx` — CardTitle x2 → remove
- `plan-comparison-card.tsx` — CardTitle x2, p x2 → remove
- `upgrade-confirmation-dialog.tsx` — DialogTitle, p → remove
- `downgrade-warning-dialog.tsx` — DialogTitle → remove

**1c. family** (14 files — largest batch)
- `family-landing.tsx` — p x2 → remove
- `today-activities.tsx` — p x3 → remove
- `child-apps-section.tsx` — h3 → font-body
- `kid-mode-tile.tsx` — span, p → remove
- `streak-tracker.tsx` — p → remove
- `quick-rating.tsx` — p → remove
- `activity-card.tsx` — p → remove
- `pin-setup-modal.tsx` — DialogTitle → remove
- `practice-log-form.tsx` — DialogTitle → remove
- `app-picker.tsx` — div → remove

**1d. flashcards** (4 files)
- `flashcard-page.tsx` — h3, SheetTitle → font-body / remove
- `flashcard-card.tsx` — span → remove
- `deck-list.tsx` — h3 → font-body
- `rename-deck-dialog.tsx` — DialogTitle → remove

**1e. builder** (3 files)
- `blueprint-card.tsx` — h3 → font-body
- `interview/category-picker.tsx` — p → remove
- `progress-card.tsx` — p → remove

**1f. speech-coach** (3 files)
- `session-config.tsx` — h3 x4 → font-body
- `progress-card.tsx` — h4 → font-body
- `session-notes-list.tsx` — h3 → font-body

**1g. shared components** (6 files)
- `marketing-header.tsx` — span → remove
- `mobile-nav-drawer.tsx` — span → remove
- `delete-confirmation-dialog.tsx` — DialogTitle → remove
- `project-card.tsx` — h3 → font-body
- `dashboard-view.tsx` — span → remove
- `play-grid.tsx` — p → remove, `app-tile.tsx` — span → remove

**1h. remaining** (5 files)
- `templates-page.tsx` — h3 → font-body
- `demo-tool-card.tsx` — h3 → font-body
- `my-tools-page.tsx` — button label → remove
- `close-the-gap-hero.tsx` — span → remove
- `landing-footer.tsx` — span → remove

### Verification
```bash
grep -rn "font-headline" src/ --include="*.tsx" | grep -v globals.css | grep -vE "<h[12]\b"
# Should return 0 results
```

---

## Workstream 2: Non-Token Color Migration (100+ violations, 25+ files)

### Phase 2A: Add extended design tokens to globals.css

Add to the `@theme` block in `src/app/globals.css`:

**Semantic status containers:**
- `--color-success-container` / `--color-on-success-container` (light/dark green)
- `--color-caution-container` / `--color-on-caution-container` (light/dark gold)
- `--color-info-container` / `--color-on-info-container` (light/dark blue)

**Domain category palette** (for diagnosis badges, goal domains, data viz):
- 9 hues: emerald, blue, amber, purple, rose, orange, pink, teal, neutral
- Each with: `--color-domain-{name}`, `--color-domain-{name}-container`, `--color-on-domain-{name}`

**Chart colors** (CSS custom properties for Recharts SVG):
- `--color-chart-line`, `--color-chart-target`, `--color-chart-success`, `--color-chart-caution`, `--color-chart-warning`, `--color-chart-danger`, `--color-chart-muted`

All values in OKLCH. Include `.dark` overrides with reduced saturation.

### Phase 2B: Semantic status colors (4 files)
- `session-notes/lib/session-utils.ts` — text-green → text-success, text-yellow → text-caution, text-red → text-error
- `session-notes/components/session-note-card.tsx` — bg-yellow-100 → bg-caution-container, etc.
- `session-notes/components/target-entry.tsx` — accuracy colors → semantic tokens
- Update corresponding test files with new expected strings

### Phase 2C: Diagnosis/domain palettes (3 files)
- `patients/lib/diagnosis-colors.ts` — Replace bg-emerald-100/text-emerald-700 with bg-domain-emerald-container/text-on-domain-emerald (all 9 categories)
- `goals/lib/goal-utils.ts` — `domainColor()` and `statusBadgeColor()` → domain tokens
- `goals/components/goal-met-banner.tsx` — green-* → success tokens

### Phase 2D: Chart hex colors (2 files)
- `goals/lib/goal-utils.ts` — `promptLevelColor()` returns hex → return CSS var references
- `goals/components/progress-chart.tsx` — inline `stroke="#f97316"` → chart tokens
- Create `src/shared/hooks/use-chart-colors.ts` if Recharts doesn't resolve CSS vars in SVG attributes (reads computed styles at runtime)

### Phase 2E: Family feature colors (8 files)
- `celebration-card.tsx` — amber-* → caution tokens
- `streak-tracker.tsx` — amber-* → caution tokens
- `weekly-progress.tsx` — green/amber → success/caution tokens
- `kid-mode-tile.tsx` — 8-color palette → domain tokens
- `play-tile.tsx` — teal/sky/amber/rose/violet/emerald → domain tokens
- `quick-rating.tsx` — amber → caution
- `message-thread.tsx`, `activity-card.tsx`, `practice-log-form.tsx`, `message-bubble.tsx` — hardcoded gradient `bg-[linear-gradient(...)]` → existing `bg-primary-gradient` class

### Phase 2F: Remaining scattered violations (6 files)
- `speech-coach/components/progress-card.tsx` — green/yellow/red → success/caution/error
- `builder/components/interview/category-picker.tsx` — teal/blue/amber/purple/rose → domain tokens
- `builder/components/preview-panel.tsx` — text-amber-600 → text-caution
- `patients/components/engagement-summary.tsx` — amber → caution tokens

### Verification
```bash
# Check no arbitrary Tailwind colors remain (excluding test files, generated code)
grep -rn "text-\(slate\|blue\|green\|red\|yellow\|amber\|purple\|gray\|emerald\|rose\|violet\|orange\|pink\|teal\|sky\)-" src/ --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v node_modules | grep -v agent-prompt | grep -v aac-template | grep -v few-shot
```

**Known exceptions** (NOT violations — these are output templates for generated app code):
- `src/features/builder/lib/agent-prompt.ts`
- `src/features/builder/lib/aac-template.ts`
- `src/features/builder/lib/few-shot-examples.ts`

---

## Workstream 3: WAB Scaffold Font Mismatch

**Problem:** Generated therapy apps load Nunito + Inter instead of Fraunces + Instrument Sans.

### Files to change

**`artifacts/wab-scaffold/src/main.tsx`** (line 7):
```
// FROM:
"Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600"
// TO:
"Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Instrument+Sans:wght@400;500;600;700&family=Commit+Mono"
```

**`artifacts/wab-scaffold/src/index.css`** (lines 48-49):
```css
/* FROM: */
--font-heading: "Nunito", system-ui, sans-serif;
--font-body: "Inter", system-ui, sans-serif;
/* TO: */
--font-heading: "Fraunces", Georgia, serif;
--font-body: "Instrument Sans", system-ui, sans-serif;
--font-mono: "Commit Mono", monospace;
```

### Verification
Generate a test app in the builder and inspect the iframe — headings should render in Fraunces (serif), body in Instrument Sans (sans-serif).

---

## Workstream 4: Touch Targets (44px minimum)

**Problem:** Button component has all variants below 44px. DESIGN.md requires 44px for therapy/autistic users.

### Approach: min-height floor + bump default/lg

**`src/shared/components/ui/button.tsx`:**
- Add `min-h-[2.75rem]` (44px) to CVA base string — guarantees ALL variants meet minimum
- Bump `default`: `h-9` → `h-11` (44px)
- Bump `lg`: `h-10` → `h-12` (48px)
- Bump `icon`: `size-9` → `size-11`
- Bump `icon-lg`: `size-10` → `size-12`
- Keep `xs` at `h-8` and `sm` at `h-9` — the `min-h` floor handles accessibility while keeping them visually compact for toolbars

**`src/shared/components/suggestion-chips.tsx`:**
- Change `py-1.5 text-xs` → `py-2 text-sm min-h-[2.75rem]`

### Risk mitigation
Bumping default from 36px to 44px affects ~27 usages across 17 files. Visual spot-check needed on:
- Session notes editor (dense toolbar)
- Builder chat panel (inline actions)
- Flashcard toolbar
- Settings page

---

## Workstream 5: Explore Page Empty Cards

**Problem:** When no featured apps exist in Convex, cards render disabled with empty shareSlug.

### Fix in `src/features/explore/components/demo-tool-grid.tsx`

1. Change `disabled: true` → `disabled: false` on line 42
2. Update `onTryIt` handler: when `shareSlug` is empty, navigate to `/builder?prompt=<encodeURIComponent(tool.prompt)>` instead of setting selectedSlug
3. Remove "Coming Soon" badge logic — tools are always actionable

---

## Execution Order

```
WS3 (scaffold fonts)     — independent, lowest risk, ship first
WS5 (explore page)       — independent, low risk
WS1 (font-headline)      — independent, mechanical, 8 atomic commits
WS2A (tokens)            — must land before WS2B-F
WS2B-F (color migration) — depends on WS2A, 6-8 atomic commits
WS4 (touch targets)      — highest layout risk, ship last with visual QA
```

WS1 and WS3 can run in parallel. WS2 depends on WS2A landing first.

## End-to-End Verification

1. `npm run build` — no TypeScript errors
2. `npm test` — all 636+ tests pass (update test expectations for changed color strings)
3. Visual QA via `/browse`:
   - Landing page: typography consistent, no font-headline on H3s
   - Builder: generate a test app, verify Fraunces renders in iframe preview
   - Explore: cards clickable and navigate to builder
   - Family dashboard: colors warm (no cool blue/slate tones)
   - Session notes: status badges use semantic colors
   - Settings/billing: all elements render without font-headline on non-headings
4. `grep -rn "font-headline" src/ --include="*.tsx" | grep -vE "globals|<h[12]\b"` → 0 results
5. Touch target check: `$B js` extract all interactive elements and verify min 44px height
