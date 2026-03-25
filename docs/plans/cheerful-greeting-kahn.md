# Final Polish: UI/UX Audit & Comprehensive Fix Plan

## Context

Bridges is being prepared for the Springfield Vibeathon demo where judges will test every page and interaction. A thorough browser audit + code review revealed **34 issues** across navigation, design, functionality, and user feedback. The app shell sidebar overlaps content on every page, navigation between sidebar and tabs is broken, the builder doesn't match the Lovable-like aesthetic the user wants, and multiple buttons are non-functional. This plan fixes everything in priority order so the demo is bulletproof.

---

## Phase 1: Fix App Shell Layout (Sidebar Overlap) — BLOCKER

**Root cause:** `DashboardSidebar` is `fixed left-0 top-0 w-20` (out of document flow), but the `<main>` in the app layout has no left offset, so ALL page content renders underneath the sidebar.

### 1.1 Add global sidebar offset to app layout

**File:** `src/app/(app)/layout.tsx`

Change the `<main>` element:
```tsx
// Before:
<main id="main-content" className="flex-1 overflow-hidden">

// After:
<main id="main-content" className="flex-1 overflow-hidden md:ml-20">
```

### 1.2 Remove duplicate `md:ml-20` from dashboard

**File:** `src/features/dashboard/components/dashboard-view.tsx`

The dashboard already has its own `md:ml-20` on its outer `<main>`. Remove it since the layout now handles it. Change the outer element from `md:ml-20 flex h-screen flex-col` to `flex h-screen flex-col`.

### 1.3 Hide desktop sidebar on mobile

**File:** `src/features/dashboard/components/dashboard-sidebar.tsx`

The sidebar `<aside>` needs `hidden md:flex` so it doesn't render on mobile viewports:
```tsx
// Before:
<aside className="fixed left-0 top-0 z-40 flex h-screen w-20 flex-col items-center bg-surface-container py-6">

// After:
<aside className="fixed left-0 top-0 z-40 hidden h-screen w-20 md:flex flex-col items-center bg-surface-container py-6">
```

### 1.4 Fix mobile layout offset

**File:** `src/app/(app)/layout.tsx`

The `md:ml-20` only applies on desktop. Mobile content needs no offset since sidebar is hidden. Verify the mobile header in `dashboard-view.tsx` has no left margin conflict.

**Verification:** Every page (`/dashboard`, `/builder`, `/settings`) should show full content without sidebar overlap.

---

## Phase 2: Fix Navigation & Routing — CRITICAL

### 2.1 Dashboard tabs must read URL query params

**File:** `src/features/dashboard/components/dashboard-view.tsx`

The `<Tabs>` component uses `defaultValue="recent"` and ignores `?tab=` query param.

Fix:
- Import `useSearchParams` from `next/navigation`
- Map query param values to tab values: `templates` -> `templates`, `my-projects` -> `my-projects`, default -> `recent`
- Change `<Tabs defaultValue="recent">` to `<Tabs value={activeTab} onValueChange={handleTabChange}>`
- `handleTabChange` should call `router.replace(/dashboard?tab=${value})` to keep URL in sync

### 2.2 Sidebar active state must support query params

**File:** `src/features/dashboard/components/dashboard-sidebar.tsx`

Line 40: `pathname === item.href` never matches `/dashboard?tab=templates` because `pathname` excludes query strings.

Fix:
- Import `useSearchParams`
- For items with `?tab=` in href, parse the expected tab and compare to `searchParams.get("tab")`
- Home (`/dashboard`) is active when pathname is `/dashboard` AND tab is null or `"recent"`
- Builder (`/builder`) is active when `pathname.startsWith("/builder")`

### 2.3 Apply same fix to mobile nav drawer

**File:** `src/shared/components/mobile-nav-drawer.tsx`

Same active-state matching logic as sidebar — use `useSearchParams` for query-param items.

### 2.4 Wire template chips to navigate to builder

**File:** `src/features/dashboard/components/dashboard-view.tsx`

Template chips (Token Board, Visual Schedule, etc.) currently have no `onClick`. Wire each to:
```tsx
onClick={() => router.push(`/builder?prompt=${encodeURIComponent(`Build a ${chipLabel} for a child`)}`)}
```

### 2.5 Builder must read and auto-submit `?prompt=` param

**File:** `src/features/builder/components/builder-page.tsx`

Currently only reads `?sessionId`. Add:
- Read `searchParams.get("prompt")`
- `useEffect` with `useRef` guard (StrictMode double-fire protection) that calls `generate(decodedPrompt)` when prompt is present and status is `"idle"`
- Clear prompt from URL via `router.replace("/builder")` after triggering

**Verification:** Type prompt on dashboard -> Enter -> builder opens -> generation starts automatically.

---

## Phase 3: Builder Redesign (Lovable-like Aesthetic)

### 3.1 Rounded panel containers with surface hierarchy

**File:** `src/features/builder/components/builder-page.tsx`

- Wrap `ResizablePanelGroup` in a container with `p-2 bg-surface-container-low gap-2`
- Each `ResizablePanel` gets `className="overflow-hidden rounded-2xl bg-surface-container-lowest"`
- Remove fragile `h-[calc(100vh-64px)]` — use `flex-1 overflow-hidden` (layout provides h-screen)

### 3.2 Resizable handle styling

**File:** `src/shared/components/ui/resizable.tsx`

- Handle: change `bg-border` to `bg-transparent hover:bg-outline-variant/20`
- Add `mx-0.5` spacing for breathing room between rounded panels
- Handle grip: `text-outline-variant/30 hover:text-outline-variant/60`

### 3.3 Builder toolbar polish

**File:** `src/features/builder/components/builder-toolbar.tsx`

- Remove `border-b border-outline-variant/30` (no-line rule violation)
- Add subtle `shadow-sm` or use tonal background shift
- Remove ChevronDown from project name (no dropdown exists — removes impression of broken UI)
- URL bar: show `projectName` instead of static "/"
- Back button already has gradient — keep

### 3.4 Chat panel redesign

**File:** `src/features/builder/components/chat-panel.tsx`

- **Empty state**: Replace minimal text with centered Bridges logo icon, "What would you like to build?" headline (`font-headline`), descriptive subtitle, and `SuggestionChips` component (already exists at `src/features/builder/components/suggestion-chips.tsx`) with therapy tool suggestions
- **Thinking state**: Integrate `ThinkingIndicator` (exists at `src/features/builder/components/thinking-indicator.tsx`) during generation instead of plain text
- **File updates**: Integrate `FileBadges` (exists at `src/features/builder/components/file-badges.tsx`) after file_complete events
- **Input area**: Remove `border-t` (no-line rule) — use `bg-surface-container-low pt-3` tonal shift instead
- **Message styling**: User messages `bg-primary/5 rounded-2xl p-4`, assistant `bg-surface-container-low rounded-2xl p-4`
- **Follow-up chips**: Show `SuggestionChips` when status is "live" with suggestions like "Add dark mode", "Make it colorful", "Add sounds"

### 3.5 Preview panel polish

**File:** `src/features/builder/components/preview-panel.tsx`

- Remove duplicate Mobile/Desktop size buttons (toolbar already has device size controls)
- Thread `deviceSize` prop from `BuilderPage` to control iframe width
- Remove `border-b` on toolbar area (no-line rule)
- Better loading states: skeleton shimmer for "booting", progress text for "installing"
- Idle state: show Bridges logo + "Your app will appear here" with subtle animation

### 3.6 Code panel improvements

**File:** `src/features/builder/components/code-panel.tsx`

- Remove border from tab bar, use tonal background shift
- Wire Download button (create Blob from file contents, trigger anchor click download)
- Add toast on Copy: `toast("Copied to clipboard")` after clipboard write

---

## Phase 4: Design System Alignment

### 4.1 Add gradient button variant

**File:** `src/shared/components/ui/button.tsx`

Add `gradient` variant to `buttonVariants`:
```
gradient: "bg-gradient-to-br from-primary to-primary-container text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all duration-300"
```

Update all manually-applied gradient buttons to use `variant="gradient"`:
- `dashboard-view.tsx` — "Create New" button, FAB
- `builder-toolbar.tsx` — Publish button
- `mobile-nav-drawer.tsx` — "New Project" button
- `empty-state.tsx` — primary action buttons

### 4.2 Increase card border-radius

**File:** `src/shared/components/ui/card.tsx`

Change `rounded-xl` (12px) to `rounded-2xl` (16px) to match design spec.

### 4.3 Input filled-container style

**File:** `src/shared/components/ui/input.tsx`

- Replace `border border-input bg-transparent` with `border-2 border-transparent bg-surface-container-high`
- Focus: `focus-visible:border-primary focus-visible:bg-surface-container-lowest`
- Add `transition-all duration-300`
- Remove `shadow-xs`

### 4.4 No-line rule enforcement

Remove `border` / `border-b` / `border-t` lines used for sectioning across:

| File | Line/Element | Replace With |
|------|-------------|-------------|
| `card.tsx` | `border` class on Card | Remove, use `shadow-sm` + tonal bg |
| `chat-panel.tsx` | `border-t` on form | `bg-surface-container-low pt-3` |
| `preview-panel.tsx` | `border-b` on toolbar | Remove |
| `builder-toolbar.tsx` | `border-b border-outline-variant/30` | Remove, keep existing bg |

**Keep**: `border-l-4` in settings sidebar (active indicator, not sectioning), `border-white/5` in code panel dark theme (functional separator at 5% opacity).

### 4.5 Spacing improvements

**File:** `src/features/dashboard/components/dashboard-view.tsx`

- Hero section: increase `pb-12 pt-16` to `pb-16 pt-20`
- Tab container: increase `px-12 pt-12` to `px-12 pt-16`
- Grid gap: increase from `gap-8` to `gap-10`

### 4.6 Font headline enforcement

Audit all `<h1>`, `<h2>`, `<h3>` in modified files — add `font-headline` (Manrope) where missing:
- `chat-panel.tsx` headings
- `project-card.tsx` title
- `settings-page.tsx` section titles
- `empty-state.tsx` titles

### 4.7 Animation timing normalization

Global: change `duration-150` and `duration-200` to `duration-300` in all modified files. Add to `globals.css`:
```css
@theme {
  --ease-sanctuary: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Phase 5: Wire Missing Functionality

### 5.1 Share button

**File:** `src/features/builder/components/builder-toolbar.tsx` + `builder-page.tsx`

- Add `onShare` prop to toolbar
- In `builder-page.tsx`: add `shareDialogOpen` state, render `ShareDialog` (exists at `src/features/sharing/components/share-dialog.tsx`)
- Pass sessionId as share context

### 5.2 Publish button

**File:** `src/features/builder/components/builder-toolbar.tsx` + `builder-page.tsx`

- Add `onPublish` prop to toolbar
- In `builder-page.tsx`: add `publishModalOpen` state, render `PublishSuccessModal` (exists at `src/features/builder/components/publish-success-modal.tsx`)
- For demo: construct URL as `https://bridges.app/tool/${sessionId}`

### 5.3 Publish success modal handlers

**File:** `src/features/builder/components/publish-success-modal.tsx`

- Copy Link: already works
- QR Code button: use `navigator.share()` or `toast("QR code coming soon")`
- Share button: use `navigator.share()` if available, else copy URL + toast

### 5.4 Remove project name dropdown chevron

**File:** `src/features/builder/components/builder-toolbar.tsx`

Remove `ChevronDown` icon from project name — no dropdown exists, looks broken.

---

## Phase 6: User Feedback & Polish

### 6.1 Add route loading state

**New file:** `src/app/(app)/loading.tsx`

Simple centered spinner/shimmer for route transitions (Next.js convention).

### 6.2 Toast on all copy actions

Ensure `toast("Copied to clipboard")` fires after every `navigator.clipboard.writeText` call:
- `code-panel.tsx` copy button
- `publish-success-modal.tsx` (verify existing)
- `share-dialog.tsx` (verify existing)

### 6.3 Dashboard skeleton loading

**File:** `src/features/dashboard/components/dashboard-view.tsx`

Show 3 skeleton `ProjectCard` shapes (pulsing rectangles) briefly before showing the sample project cards.

### 6.4 Templates tab content

**File:** `src/features/dashboard/components/dashboard-view.tsx`

The Templates tab should render the `TemplatesTab` component (exists at `src/features/dashboard/components/templates-tab.tsx`) which has 6 therapy template cards with emoji icons. Verify it's properly imported and rendered in the templates tab panel.

### 6.5 Low-priority polish (if time allows)

- Change sidebar avatar from "U" to "D" (for Desha)
- Add `pointer-events-none opacity-60` to notification bell and help icons (signal decorative)
- Hide FAB on desktop (`lg:hidden`), keep on mobile only
- Remove "Create New" duplication — FAB on mobile, header button on desktop

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `src/app/(app)/layout.tsx` | Add `md:ml-20` to main |
| `src/app/(app)/loading.tsx` | **NEW** — route loading spinner |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Hide on mobile, fix active states with query params |
| `src/features/dashboard/components/dashboard-view.tsx` | Tab routing via URL, wire template chips, spacing, skeleton loading, templates tab |
| `src/features/dashboard/components/main-prompt-input.tsx` | No changes needed (already works) |
| `src/features/builder/components/builder-page.tsx` | Read ?prompt param, rounded layout, integrate Share/Publish dialogs |
| `src/features/builder/components/builder-toolbar.tsx` | Remove border, wire Share/Publish, remove ChevronDown, URL bar shows name |
| `src/features/builder/components/chat-panel.tsx` | Rich empty state, ThinkingIndicator, SuggestionChips, FileBadges, no-line rule |
| `src/features/builder/components/preview-panel.tsx` | Remove duplicate size buttons, better loading states, no-line rule |
| `src/features/builder/components/code-panel.tsx` | Wire download, toast on copy |
| `src/features/builder/components/publish-success-modal.tsx` | Wire QR/Share buttons |
| `src/features/settings/components/settings-page.tsx` | No changes needed (layout fix handles offset) |
| `src/shared/components/ui/button.tsx` | Add gradient variant |
| `src/shared/components/ui/card.tsx` | Increase radius to rounded-2xl |
| `src/shared/components/ui/input.tsx` | Filled-container style |
| `src/shared/components/ui/resizable.tsx` | Subtle handle styling |
| `src/shared/components/mobile-nav-drawer.tsx` | Fix active states with query params |
| `src/app/globals.css` | Add ease-sanctuary custom property |

## Existing Components to Reuse (NOT create new)

- `SuggestionChips` — `src/features/builder/components/suggestion-chips.tsx`
- `ThinkingIndicator` — `src/features/builder/components/thinking-indicator.tsx`
- `FileBadges` — `src/features/builder/components/file-badges.tsx`
- `ShareDialog` — `src/features/sharing/components/share-dialog.tsx`
- `PublishSuccessModal` — `src/features/builder/components/publish-success-modal.tsx`
- `TemplatesTab` — `src/features/dashboard/components/templates-tab.tsx`
- `EmptyState` — `src/shared/components/empty-state.tsx`
- `DeleteConfirmationDialog` — `src/features/builder/components/delete-confirmation-dialog.tsx`

---

## Verification Plan

After all changes, test these flows with `agent-browser`:

1. **Dashboard -> Builder via prompt**: Type "Build a token board" -> Enter -> builder opens -> generation starts automatically
2. **Dashboard -> Builder via template chip**: Click "Visual Schedule" -> builder opens with pre-filled prompt
3. **Sidebar navigation**: Click Home, Templates, My Tools, Builder, Settings -> correct active states, correct tab content
4. **Settings page**: Content fully visible, not hidden behind sidebar
5. **Builder Code toggle**: Preview <-> Code switches panels correctly
6. **Builder toolbar**: Share opens dialog, Publish opens success modal, Copy shows toast, Download saves file
7. **Mobile responsive** (390x844): Sidebar hidden, hamburger menu works, nav drawer opens, all pages usable
8. **Visual audit**: No 1px border sectioning, cards 16px radius, gradient primary buttons, filled inputs, macro spacing
9. **Full page load**: No content hidden behind sidebar on any page
