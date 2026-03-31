# Plan: Fix Speech Coach Session Config UI/UX

## Context

The Speech Coach "New Session" configuration screen has broken button visuals. All sound-selector pills and the unselected age/duration toggle buttons render as dark gray blobs with invisible text. Users cannot see any labels.

**Root cause:** The project's design system redefined `--color-muted` as a text-secondary tone (`oklch(0.511 0.011 62)` = #6B6560, a medium-dark gray). The component code (inherited from shadcn conventions) uses `bg-muted text-muted-foreground` for unselected button backgrounds, but both tokens resolve to the same dark value — making background and text color identical, so text disappears.

Secondary issues also visible in the screenshot:
- The tip/hint box (`bg-muted/50`) renders as a semi-transparent dark gray blob instead of a soft recessed card
- The ToggleGroupItem base styles (`data-[state=on]:bg-accent`) conflict with the custom `data-[state=on]:bg-primary` className (resolved correctly right now via tw-merge, but brittle)

## Files to Change

- `src/features/speech-coach/components/session-config.tsx` — only file that needs editing

## Implementation

### 1. Fix sound-selector pill colors (labels)

In the `TARGET_SOUNDS.map()` label className, replace the unselected state:

```
BEFORE: "bg-muted text-muted-foreground hover:bg-muted/80"
AFTER:  "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
```

`bg-surface-container-high` = `oklch(0.938 0.009 85)` = `#EDEAE4` — a light warm gray recessed background.
`text-on-surface-variant` = `oklch(0.511 0.011 62)` = #6B6560 — warm medium gray, readable on light bg.

### 2. Fix age-range ToggleGroupItem colors

In the `ageRange` ToggleGroup section, replace the unselected className:

```
BEFORE: "bg-muted text-muted-foreground hover:bg-muted/80"
AFTER:  "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
```

Also remove the conflicting `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground` from the custom className and instead just let the existing base handle the selected state (the `data-[state=on]:bg-accent` from toggleVariants IS the wrong color here so we do still need the override). Keep the override but clean it up.

Actually, simplest correct fix: drop ToggleGroup entirely for age+duration since we're doing all the state ourselves. Use the same label+input (radio) pattern as sound selector — simpler, no base-style conflicts.

### 3. Fix duration ToggleGroupItem colors

Same as age range (same pattern, same fix).

### 4. Fix tip box

```
BEFORE: "rounded-lg bg-muted/50 p-4"
AFTER:  "rounded-lg bg-surface-container-high p-4"
```

## Revised Approach: Drop ToggleGroup for age+duration

Since the `ToggleGroup` component inherits base styles that conflict with our custom colors, and we're fully managing state ourselves anyway, replace age and duration selectors with the same `<label>` + `<input type="radio">` pattern used for target sounds. This is:
- Simpler (no Radix overhead for a 2-option picker)
- Consistent visual language with the sound pills
- No CSS specificity fights with toggleVariants

The label pattern for radio:
```tsx
<label
  className={cn(
    "flex cursor-pointer items-center rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
    value === selected
      ? "bg-primary text-primary-foreground"
      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
  )}
>
  <input type="radio" className="sr-only" ... />
  {label}
</label>
```

## Verification

1. Run `npm run dev` and open the speech coach page
2. Confirm all 8 sound-selector pills show visible labels in light warm-gray (unselected) and teal (selected)
3. Confirm age buttons (Ages 2-4 / Ages 5-7) show clear unselected state and teal selected state
4. Confirm duration buttons (5 minutes / 10 minutes) same
5. Confirm tip box is a soft light-gray card, not a dark blob
6. Toggle each selection and confirm state changes update visually
7. Confirm "Start Session" button is still disabled when no sounds selected

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
