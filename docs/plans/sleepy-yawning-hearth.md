# Implement Stitch UI — Frontend Only

## Context

Phase 1 backend is working (Convex Agent chat, tool CRUD, streaming). But the frontend is mostly placeholder stubs with default shadcn styling — it doesn't match the 8 high-fidelity Stitch designs in `.stitch/designs/`. This plan converts those Stitch HTML designs into production React components while preserving all working Phase 1 code (BridgesChat, ToolPreview, BuilderLayout).

**Scope:** Frontend only — no Convex backend changes. Manual extraction from Stitch HTML (not auto-convert), because components need proper state management, VSA structure, and integration with existing working code.

---

## Step 1: Design System Foundation

**Goal:** Expand Tailwind v4 tokens to match the full Material 3 palette from Stitch, add Manrope font, add Material Symbols icons.

**Files to modify:**
- `src/app/globals.css` — Replace simplified tokens with full Stitch palette (~40 tokens from `.stitch/designs/02-builder-empty.html` lines 21-68), add Manrope + Material Symbols font imports, add utility classes (`bg-primary-gradient`, `sanctuary-shadow`, glass effect)

**New files:**
- `src/shared/components/material-icon.tsx` — Lightweight `<MaterialIcon icon="forum" />` wrapper that renders `<span className="material-symbols-outlined">`

**Key token changes:**
| Current | Stitch | Change |
|---------|--------|--------|
| `--color-primary: #0D7377` | `primary: #00595c` | Stitch's `#0D7377` is `primary-container`, not `primary` |
| No Manrope | `font-headline: Manrope 700/800` | Add Google Font import |
| `--font-heading: Inter` | `font-headline: Manrope` | Switch headline font |
| ~15 tokens | ~40 tokens | Add all surface-container-*, tertiary-fixed, secondary-container, etc. |

**Backward compat:** Keep aliases (`--color-foreground` → `var(--color-on-surface)`) so existing code doesn't break during migration.

---

## Step 2: Navigation Shells via Route Groups

**Goal:** Replace single global Header with layout-aware navigation. Stitch shows 2 patterns: top-bar nav (marketing pages) and sidebar + compact header (builder).

**Approach:** Use Next.js route groups to colocate pages with their navigation shell.

**Directory restructure:**
```
src/app/layout.tsx              → Root (Providers + Toaster ONLY, no Header)
src/app/(marketing)/layout.tsx  → Shell A: marketing top-bar nav
src/app/(marketing)/page.tsx    → Landing (moved from src/app/page.tsx)
src/app/(marketing)/templates/page.tsx
src/app/(marketing)/my-tools/page.tsx
src/app/(app)/layout.tsx        → Shell B: sidebar + compact header
src/app/(app)/builder/page.tsx  → (moved from src/app/builder/page.tsx)
src/app/tool/[toolId]/page.tsx  → Shell C: minimal shared-view header (stays in place)
```

**New files:**
- `src/shared/components/marketing-header.tsx` — From Stitch screens 06/07: Manrope logo, nav links (Builder, Templates, My Tools), action buttons. Active link = `border-b-2 border-primary`. No bottom border (tonal shift per "No-Line Rule").
- `src/features/builder/components/builder-sidebar.tsx` — From Stitch screen 02: Fixed `w-64` on lg+, hidden mobile. Items: Builder (active), Assets, Library, Settings, Help, "Deploy Tool" gradient CTA.
- `src/features/builder/components/builder-header.tsx` — From Stitch screen 03: Compact `h-14`. Logo, breadcrumb (tool name), New Tool + Share buttons, avatar.

**Modified:**
- `src/app/layout.tsx` — Remove `<Header />` import/render
- `src/shared/components/header.tsx` — Retire (replaced by marketing-header + builder-header)

---

## Step 3: Landing Page (Screen 01)

**Goal:** Full landing page from `.stitch/designs/01-landing-page.html`.

**New files in `src/features/landing/components/`:**
- `hero-section.tsx` — Asymmetric 12-col grid. Left: "AI-Powered Support" badge, h1 (`font-headline text-5xl font-extrabold`), subtitle, 2 CTAs (gradient primary + ghost secondary). Right: featured image area with glass overlay card.
- `how-it-works.tsx` — 3-card grid on `surface-container-low` bg. Cards: Describe (primary-fixed icon), Build (secondary-fixed icon), Share (tertiary-fixed icon).
- `product-preview.tsx` — Bento layout. Large card (8 cols) = Visual Schedules showcase. Small card (4 cols) = Communication Boards with `tertiary-fixed` bg.
- `landing-footer.tsx` — Logo, copyright, policy links.

**Page:** `src/app/(marketing)/page.tsx` — Thin wrapper importing all 4 sections.

---

## Step 4: Builder Visual Update (Screens 02 + 03)

**Goal:** Restyle builder to match Stitch while preserving all working Phase 1 code.

**Critical constraint:** `bridges-chat.tsx` (287 lines) has working @assistant-ui/react integration. Changes must be CSS-only className updates on existing primitives — no restructuring the component tree.

**Modified files:**
- `src/features/builder/components/chat/bridges-chat.tsx`:
  - `WelcomeState`: Add forum icon with sparkle, heading in `font-headline text-2xl`, 3 suggestion pill buttons (Morning routine schedule, Feelings communication board, Star reward chart)
  - `UserMessage`: Update to `bg-primary-container text-white rounded-2xl rounded-tr-sm`
  - `AssistantMessage`: Update to `bg-surface-container-low text-on-surface rounded-2xl rounded-tl-sm border border-outline-variant/10`
  - `Composer`: Style input with `bg-surface-container-high` fill, send button with gradient

- `src/features/builder/components/tool-preview.tsx`:
  - Empty state: Dashed border container, extension icon, skeleton cards, decorative blurred orbs
  - Active state: Wrap tool in "Safe Space Container" (`bg-white rounded-3xl p-8 sanctuary-shadow border border-outline-variant/5`)

- `src/features/builder/components/builder-layout.tsx`:
  - Integrate sidebar awareness (sidebar provided by `(app)/layout.tsx`, BuilderLayout stays focused on resizable panels)

---

## Step 5: Tool Renderers (Screens 04 + 05)

**Goal:** Replace stub placeholders in `tool-renderer.tsx` with interactive components matching Stitch designs.

**New files:**
- `src/features/therapy-tools/components/token-board.tsx` — From screen 04:
  - Star slots (filled = `bg-primary-fixed` circle, empty = dashed border)
  - Progress section with gradient bar
  - "Earn Star" gradient CTA
  - Reward hint card (`bg-tertiary-fixed border-l-8 border-tertiary-container`)
  - State: `zustand` store for earned count, `motion` for earn animation

- `src/features/therapy-tools/components/visual-schedule.tsx` — From screen 05:
  - Step items with 3 states: completed (teal bg, checkmark, strikethrough), current (border-l-4, scale, pulsing dot), pending (radio unchecked)
  - Drag handles per step via `@dnd-kit/react`
  - Progress card with gradient bar
  - State: `zustand` for completion, `@dnd-kit/react` for reorder

- `src/features/therapy-tools/components/communication-board.tsx` — No dedicated Stitch screen, but screen 03/08 show emoji grid pattern:
  - Grid of emotion/item cards with emoji + label
  - Sentence starter strip ("I FEEL...")
  - "SPEAK" gradient CTA
  - Selected card state with primary border ring

**Modified:**
- `src/features/therapy-tools/components/tool-renderer.tsx` — Wire switch cases to real components

---

## Step 6: My Tools + Templates (Screens 06 + 07)

**Goal:** Implement listing pages with shared card component.

**New shared files:**
- `src/shared/components/tool-card.tsx` — Reusable card from screens 06/07: `aspect-[4/3]` image area, type badge overlay, title, metadata, action area. Variants: "tool" (share/edit) vs "template" (description + "Use Template" CTA).
- `src/shared/components/type-badge.tsx` — Maps tool types to badge colors per Stitch palette.

**New feature files:**
- `src/features/my-tools/components/my-tools-page.tsx` — Header ("My Tools" + count + "Create New Tool"), 3-col responsive grid, "Need a custom tool?" Safe Space CTA. Uses mock data for now.
- `src/features/templates/components/templates-page.tsx` — Header, category tabs (All, Communication, Rewards, Routines) styled as pill segmented control, 3-col grid, "Can't find?" CTA. Mock data for 6 templates.

**Pages:**
- `src/app/(marketing)/my-tools/page.tsx`
- `src/app/(marketing)/templates/page.tsx`

---

## Step 7: Shared Tool View (Screen 08)

**Goal:** Public shared tool page matching Stitch screen 08.

**New files:**
- `src/features/shared-tool/components/shared-tool-page.tsx` — Minimal header ("Bridges" + "Public Tool View"), centered Safe Space Container with `<ToolRenderer>`, therapist tip card (`bg-tertiary-fixed`), creator info card, bottom sticky CTA footer ("Build your own — powered by Bridges" + "Create Tool" gradient button).

**Modified:**
- `src/app/tool/[toolId]/page.tsx` — Replace placeholder with SharedToolPage, fetch tool via Convex `useQuery`.

---

## Step 8: Polish & Verify

- Install any needed shadcn components: `avatar`, `badge`, `progress`, `separator`, `navigation-menu`
- Migrate remaining Lucide icon usages (header Menu, chat SendHorizontal) to MaterialIcon
- Test all routes at 375px, 768px, 1440px viewports
- Verify builder chat + preview still work end-to-end
- Compare each page against `.stitch/designs/*.png` screenshots

---

## Verification

1. `npm run dev` — all pages load without errors
2. `/` — Landing page matches `01-landing-page.png` layout
3. `/builder` — Sidebar visible on desktop, chat welcome state with suggestion pills, preview empty state with skeleton
4. `/builder` (type a message) — Chat bubbles styled correctly, tool preview updates in Safe Space Container
5. `/my-tools` — Card grid renders with mock data
6. `/templates` — Tab filtering works, card grid renders
7. `/tool/test-id` — Shared view renders with tool + therapist tip
8. Mobile (375px) — Sidebar hidden, pages stack vertically, hamburger menu works
9. `npm run build` — No TypeScript errors
