# Plan: Bootstrap WebContainer with Polished Starter Vite App

## Context

When users land on `/builder`, the WebContainer boots and displays a boring 6-line placeholder: "Loading your tool... This will be replaced by your generated tool." This gives a poor first impression and wastes the opportunity to showcase Bridges' therapy design system and pre-built components.

The goal is to replace this placeholder with a polished, interactive starter app that displays immediately when the WebContainer is ready — before any LLM generation. This sets the tone, demonstrates what Bridges can build, and guides users toward the chat input.

## Changes

**Single file modified:** `src/features/builder/hooks/webcontainer-files.ts`

No changes needed to `preview-panel.tsx`, `builder-page.tsx`, `use-webcontainer.ts`, or any other file. The boot flow already mounts template files → runs npm install → starts Vite → shows iframe when ready.

### Change 1: Fix Tailwind Plugin Bug in vite.config.ts (Line 71)

The template imports `tailwindcss` from `@tailwindcss/vite` (line 67) but never adds it to plugins. All Tailwind utility classes used by the 9 therapy components are silently broken.

```diff
- plugins: [react()],
+ plugins: [tailwindcss(), react()],
```

`tailwindcss()` must come before `react()` per Tailwind v4 Vite plugin docs.

### Change 2: Replace Starter App.tsx (Lines 144-156)

Replace the placeholder with a ~120-line interactive starter app containing:

1. **Welcome Hero** — "Welcome to Bridges" heading with therapy-gradient styling, subtitle explaining this is an AI therapy tool builder, and a visual cue pointing to the chat panel.

2. **Interactive Component Demos** (3 tabbed sections):
   - **Token Board** — Working `TokenBoard` with `goal={5}`, `earned` state, `CelebrationOverlay` on completion. Demonstrates the reward loop therapists care about.
   - **Visual Schedule** — `VisualSchedule` with 4 morning-routine steps (emoji icons). Tap to complete. Shows structure/progress tracking.
   - **Communication Board** — `CommunicationBoard` with 6 basic-needs items. Tap to add to a sentence strip above. Demonstrates AAC concepts.

3. **"Try These Ideas" Section** — Three `TherapyCard` components showing example prompts users can try in the chat, reinforcing that this is a builder.

**Imports used** (all already available in the template):
- `useState` from React
- `TokenBoard`, `VisualSchedule`, `CommunicationBoard`, `CelebrationOverlay`, `TherapyCard` from `./components`
- `Sparkles`, `MessageCircle`, `Star`, `Calendar`, `Grid3X3` from `lucide-react`

**State management:**
- `activeTab` — switches between the 3 demo sections
- `earned` — token count for TokenBoard
- `celebrate` — triggers CelebrationOverlay
- `steps` — array with `done` toggle for VisualSchedule
- `selectedItem` — last tapped CommunicationBoard item

**Design system usage:**
- `.tool-container`, `.tool-title`, `.tool-instruction` for layout
- `.card-interactive` for tab buttons
- `.btn-primary` gradient for CTA
- `TherapyCard variant="elevated"` wrapping demo sections
- Tailwind utilities for flex/grid/spacing/typography
- Therapy CSS custom properties for colors (`--color-primary`, `--color-accent`, etc.)

### Template String Escaping

The file uses backtick template literals. Every `${...}` in the JSX must be escaped as `\${...}` in the TypeScript source string. This follows the same pattern as existing component files in the template.

## What NOT to Change

- **preview-panel.tsx** — iframe rendering already correct
- **builder-page.tsx** — WebContainer boot orchestration already correct
- **use-webcontainer.ts** — hook lifecycle already correct
- **package.json** — all deps already available
- **Therapy components** — no modifications needed
- **therapy-ui.css** — design system already complete

## Verification

1. Run `npm run dev` and navigate to `/builder`
2. Confirm WebContainer boots → installs → shows starter app (not placeholder)
3. Verify Tailwind utilities render correctly (the bug fix)
4. Test all 3 tabs: tap tokens, toggle schedule steps, tap communication items
5. Earn all 5 tokens → CelebrationOverlay should fire
6. Test responsive: mobile (375px), tablet (768px), desktop preview sizes
7. Type a prompt in chat → confirm LLM-generated code replaces the starter completely
8. Run existing tests: `npx vitest run --reporter=verbose` (should remain green)
