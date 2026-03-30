# Plan: Migrate Raw HTML Elements to shadcn/ui Components

## Context

The Bridges codebase has 26 shadcn/ui components installed but ~50+ raw HTML interactive elements (`<button>`, `<input>`, `<select>`, inline badge `<span>`s, avatar `<div>`s) scattered across 17 files. These bypass the design system's built-in accessibility, focus management, and consistent styling. This migration replaces them with their shadcn equivalents — preserving all functionality and custom styling where needed.

## Available shadcn Variants (verified from source)

**Button**: `default | destructive | outline | secondary | ghost | link | gradient` / sizes: `default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg`
**Badge**: `default | secondary | destructive | outline | ghost | link`
**Avatar**: sizes `sm (24px) | default (32px) | lg (40px)` — custom sizes via className
**ToggleGroup**: inherits Toggle variants `default | outline` / sizes `default | sm | lg`

## Exclusions (leave as-is)

- `appearance-section.tsx` theme cards — complex card-level click targets, not standard buttons
- `my-tools-page.tsx:262-283` — checkbox overlay with absolute positioning
- `pin-setup-modal.tsx` — specialized PIN keypad grid
- `quick-rating.tsx` — star rating with hover state tracking
- `flashcard-card.tsx` — audio play button (already well-structured)
- All files in `src/shared/components/ui/` and `__tests__/`

---

## Batch 1: Raw `<button>` → shadcn Button / ToggleGroup

### 1A — Filter/toggle pill groups → ToggleGroup

| File | Lines | What | Migration |
|------|-------|------|-----------|
| `src/features/patients/components/patients-page.tsx` | 62-73 | Status filter pills | `ToggleGroup type="single"` + `ToggleGroupItem` with `rounded-full` className |
| `src/features/patients/components/patient-intake-form.tsx` | 254-269 | Communication level toggle | `ToggleGroup type="single"` + `ToggleGroupItem` |
| `src/features/speech-coach/components/session-config.tsx` | 107-119 | Age range selector | `ToggleGroup type="single"` + `ToggleGroupItem` |
| `src/features/speech-coach/components/session-config.tsx` | 131-143 | Duration selector | `ToggleGroup type="single"` + `ToggleGroupItem` |
| `src/features/my-tools/components/my-tools-page.tsx` | 199-213 | Sort toggle | `ToggleGroup type="single"` + `ToggleGroupItem` |

**Note**: ToggleGroup `onValueChange` returns `""` for deselection; convert with `(v) => setState(v || undefined)` where needed. Custom active-state colors (e.g., `bg-primary text-white`) applied via className on `ToggleGroupItem` using `data-[state=on]:` prefix.

### 1B — Icon/action buttons → Button

| File | Lines | What | Variant + Size |
|------|-------|------|----------------|
| `src/features/flashcards/components/flashcard-toolbar.tsx` | 57-64 | New deck | `ghost` + `icon` |
| `src/features/flashcards/components/flashcard-toolbar.tsx` | 82-88 | Rename trigger | `link` + `sm` |
| `src/features/builder/components/builder-toolbar.tsx` | 77-84 | New chat | `ghost` + `icon` |
| `src/features/builder/components/builder-toolbar.tsx` | 102-108 | Rename trigger | `link` + `sm` |
| `src/features/builder/components/builder-toolbar.tsx` | 196-209 | Device size toggles | `ToggleGroup type="single"` + `ToggleGroupItem` |
| `src/features/patients/components/patient-profile-widget.tsx` | 104 | Delete interest "x" | `ghost` + `icon-xs` |
| `src/features/patients/components/patient-intake-form.tsx` | 297 | Delete interest "x" | `ghost` + `icon-xs` |
| `src/features/patients/components/patient-intake-form.tsx` | 236-246 | Toggle optional section | `ghost` + `sm` |
| `src/features/my-tools/components/my-tools-page.tsx` | 163-170 | "Select" toggle | `ghost` + `sm` |
| `src/features/my-tools/components/my-tools-page.tsx` | 312-318 | Fullscreen play | `gradient` + `sm` with `rounded-full` |
| `src/features/my-tools/components/my-tools-page.tsx` | 402-417 | Cancel / Delete bulk | `ghost` + `sm` / `destructive` + `sm` |
| `src/shared/components/suggestion-chips.tsx` | 14-19 | Suggestion chips | `outline` + `sm` with `rounded-full` |

### 1C — Settings/nav buttons → Button

| File | Lines | What | Variant |
|------|-------|------|---------|
| `src/features/settings/components/settings-sidebar.tsx` | 44-56 | Sidebar nav items | `ghost` with custom active className |
| `src/features/settings/components/settings-page.tsx` | 75-90 | Mobile dropdown options | `ghost` + `sm` |

### 1D — Tab-like panel toggles → ToggleGroup

| File | Lines | What |
|------|-------|------|
| `src/features/flashcards/components/flashcard-toolbar.tsx` | 108-134 | Chat/Cards mobile toggle |
| `src/features/builder/components/builder-toolbar.tsx` | 129-155 | Chat/Preview mobile toggle |
| `src/features/builder/components/builder-toolbar.tsx` | 161-188 | Preview/Source desktop toggle |

**Why ToggleGroup over Tabs**: These toggles control external state — content is rendered elsewhere in the parent. Radix Tabs couples TabsTrigger to TabsContent; ToggleGroup doesn't require content panels.

---

## Batch 2: Raw `<input>` → shadcn Input (3 files)

| File | Lines | Notes |
|------|-------|-------|
| `src/features/flashcards/components/flashcard-toolbar.tsx` | 69-79 | Inline rename — keep `bg-transparent border-b` override |
| `src/features/builder/components/builder-toolbar.tsx` | 89-99 | Inline rename — same pattern |
| `src/features/speech-coach/components/session-config.tsx` | 153-159 | Focus area — remove hand-rolled focus ring, Input has its own |

All three pass `autoFocus`, `defaultValue`/`value`, `onBlur`, `onKeyDown` — shadcn Input forwards all native props.

---

## Batch 3: Raw `<select>` → shadcn Select (1 file)

| File | Lines | Notes |
|------|-------|-------|
| `src/features/patients/components/home-program-form.tsx` | 142-154 | Frequency picker |

Restructure from native `<select>` to `Select > SelectTrigger > SelectValue` + `SelectContent > SelectItem`. Change initial state from `""` to `undefined` (Radix Select rejects empty string values). Existing validation `if (!frequency)` handles both.

---

## Batch 4: Inline badge spans → shadcn Badge (6 files)

| File | Lines | What | Variant + className |
|------|-------|------|---------------------|
| `src/features/patients/components/patient-row.tsx` | 40-50 | Diagnosis + status chips | `ghost` + domain color classes |
| `src/features/patients/components/patient-profile-widget.tsx` | 51-62 | Diagnosis/status/comm badges | `ghost` + domain color classes |
| `src/features/patients/components/patient-profile-widget.tsx` | 102, 115 | Interest badges | `secondary` + `bg-primary/10 text-primary` |
| `src/features/patients/components/patient-intake-form.tsx` | 294 | Interest badge | `secondary` + `bg-primary/10 text-primary` |
| `src/features/explore/components/demo-tool-card.tsx` | 49 | Category label | `secondary` + `bg-primary/10 text-primary` |
| `src/features/landing/components/hero-section.tsx` | 11 | "AI-Powered Support" | `ghost` + `bg-tertiary-fixed text-on-tertiary-fixed uppercase tracking-wider` |
| `src/features/landing/components/close-the-gap-hero.tsx` | 25 | Vibeathon badge | `ghost` + `bg-tertiary-fixed/40 text-on-tertiary-fixed uppercase tracking-widest` |

Domain-colored badges use colors from `diagnosis-colors.ts`. Apply via className override — Badge's default `border-transparent` is compatible.

---

## Batch 5: Avatars + Footer Links (5 files)

### 5A — Inline avatar divs → shadcn Avatar

| File | Lines | Current size | Migration |
|------|-------|-------------|-----------|
| `src/shared/components/mobile-nav-drawer.tsx` | 66-67 | h-12 w-12 (48px) | `Avatar className="h-12 w-12"` + `AvatarFallback className="bg-tertiary text-on-tertiary"` |
| `src/features/patients/components/patient-profile-widget.tsx` | 42-43 | h-14 w-14 (56px) | `Avatar className="h-14 w-14"` + `AvatarFallback` with color fn |
| `src/shared/components/project-card.tsx` | 164-170 | h-8 w-8 (32px) | `Avatar` (default 32px) + `AvatarFallback` with color + ring |
| `src/features/patients/components/patient-row.tsx` | 27-29 | h-10 w-10 (40px) | `Avatar size="lg"` + `AvatarFallback` with color fn |

### 5B — Raw `<a>` → Next.js Link

| File | Lines | Notes |
|------|-------|-------|
| `src/features/landing/components/landing-footer.tsx` | 16-24 | 3 placeholder `<a href="#">` links → `Link` from `next/link` (lowest priority; routes may not exist yet) |

---

## Verification

After each batch:
1. `npm run build` — ensure no type errors from changed imports/props
2. `npm test` — run existing tests (636 tests across 77 files)
3. Visual check: dev server on affected pages — verify styling, focus rings, dark mode
4. Keyboard: tab through all migrated elements, verify focus-visible rings
5. Touch targets: confirm 44px minimum on mobile viewport (Button default `min-h-[2.75rem]` = 44px)

**Key pages to check per batch:**
- Batch 1: `/patients`, `/builder`, `/my-tools`, `/settings`, `/flashcards`, `/speech-coach`
- Batch 2: Builder + flashcard toolbars, `/speech-coach`
- Batch 3: Patient intake form (home program section)
- Batch 4: `/patients`, `/explore`, landing page
- Batch 5: Landing footer, `/patients`, mobile nav drawer
