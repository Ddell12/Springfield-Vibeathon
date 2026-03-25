---
plan_version: 1
created: 2026-03-25
title: "Lovable-style UI Overhaul: Builder, Dashboard, Sidebar, Settings"
status: approved
domain_tags: [nextjs, tailwind, shadcn, builder]
files:
  create:
    - src/features/builder/components/builder-toolbar.tsx
    - src/features/builder/components/file-badges.tsx
    - src/features/builder/components/thinking-indicator.tsx
    - src/features/builder/components/suggestion-chips.tsx
    - src/features/builder/components/code-drawer.tsx
    - src/features/dashboard/components/project-card.tsx
    - src/features/dashboard/components/projects-grid.tsx
    - src/features/dashboard/components/templates-tab.tsx
    - src/features/settings/components/settings-page.tsx
    - src/features/settings/components/settings-sidebar.tsx
    - src/features/settings/components/profile-section.tsx
    - src/features/settings/components/appearance-section.tsx
    - src/features/settings/components/account-section.tsx
    - src/app/(app)/dashboard/page.tsx
    - src/app/(app)/settings/page.tsx
  modify:
    - src/features/builder/components/builder-page.tsx
    - src/features/builder/components/chat-panel.tsx
    - src/features/builder/components/preview-panel.tsx
    - src/features/dashboard/components/dashboard-sidebar.tsx
    - src/features/dashboard/components/dashboard-view.tsx
    - src/app/(app)/layout.tsx
    - src/app/layout.tsx
    - src/core/providers.tsx
team_hint: "3 agents: builder-ui, dashboard-nav, settings"
verification:
  pre_flight: pending
  audit_score: null
---

## Goal

Overhaul the app UI to match Lovable's builder-first design language:
- **Builder**: 2-panel layout (chat left, preview right), code view as a drawer/overlay toggle, file edit badges inline in chat, top toolbar with Preview/Code toggle + device sizes + Share + Publish
- **Dashboard**: Sidebar nav + greeting + prompt input + projects grid + templates tab
- **Settings**: Account, appearance, profile sections with sidebar nav
- **App Layout**: Persistent sidebar for all (app) routes

## Architecture

All new code follows existing VSA in `src/features/`. The `(app)` route group gets a sidebar layout. Builder drops the 3-panel resizable for a 2-panel with toolbar.

### Layout hierarchy:
```
RootLayout (providers, TooltipProvider)
  ├── (marketing) → MarketingHeader + pages
  └── (app) → AppSidebar + main content
       ├── /dashboard → DashboardView (greeting + prompt + projects)
       ├── /builder → BuilderPage (toolbar + chat + preview)
       └── /settings → SettingsPage (settings sidebar + sections)
```

## Files

| Path | Action | Description |
|------|--------|-------------|
| `src/app/layout.tsx` | Modify | Add `TooltipProvider` wrapper |
| `src/app/(app)/layout.tsx` | Modify | Add `DashboardSidebar` to all app routes |
| `src/app/(app)/dashboard/page.tsx` | Create | Thin wrapper for `DashboardView` |
| `src/app/(app)/settings/page.tsx` | Create | Thin wrapper for `SettingsPage` |
| `src/features/builder/components/builder-page.tsx` | Modify | 2-panel layout: chat + preview, toolbar, code as drawer |
| `src/features/builder/components/builder-toolbar.tsx` | Create | Top bar: project name, Preview/Code toggle, device sizes, Share, Publish |
| `src/features/builder/components/chat-panel.tsx` | Modify | Add file badges, thinking indicator, suggestion chips, timestamps |
| `src/features/builder/components/file-badges.tsx` | Create | Inline "Edited filename.tsx" badges shown after AI responses |
| `src/features/builder/components/thinking-indicator.tsx` | Create | "Thinking..." / "Thought for Xs" animated state |
| `src/features/builder/components/suggestion-chips.tsx` | Create | Action chips at bottom of chat (like "Add Project Images") |
| `src/features/builder/components/code-drawer.tsx` | Create | Slide-over code panel with file tree + source view |
| `src/features/builder/components/preview-panel.tsx` | Modify | Full-width preview, URL bar style, remove old toolbar |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Modify | Update links to real routes, add active state detection, responsive collapse |
| `src/features/dashboard/components/dashboard-view.tsx` | Modify | Add tabbed project views (Recently viewed, My projects, Shared, Templates) |
| `src/features/dashboard/components/project-card.tsx` | Create | Project thumbnail card with title, timestamp, avatar |
| `src/features/dashboard/components/projects-grid.tsx` | Create | Grid of project cards with tab filtering |
| `src/features/dashboard/components/templates-tab.tsx` | Create | Templates gallery grid with category cards |
| `src/features/settings/components/settings-page.tsx` | Create | Settings layout with sidebar + content area |
| `src/features/settings/components/settings-sidebar.tsx` | Create | Settings nav: Profile, Account, Appearance |
| `src/features/settings/components/profile-section.tsx` | Create | Name, avatar, bio fields |
| `src/features/settings/components/appearance-section.tsx` | Create | Theme picker (light/dark/system) |
| `src/features/settings/components/account-section.tsx` | Create | Email, password, danger zone |

## Key Types

```typescript
// Builder toolbar state
type BuilderView = "preview" | "code";
type DeviceSize = "mobile" | "tablet" | "desktop";

// File badge (displayed inline in chat)
interface FileBadge {
  action: "Edited" | "Created" | "Deleted";
  filename: string;
  path: string;
}

// Suggestion chip
interface SuggestionChip {
  label: string;
  prompt: string;
}

// Dashboard project card
interface ProjectCardData {
  id: string;
  title: string;
  thumbnail?: string;
  lastViewed: string;
  status: "published" | "draft";
}
```

## Integration Points

1. **`src/app/layout.tsx`** — wrap `{children}` with `<TooltipProvider>` from `@/shared/components/ui/tooltip`
2. **`src/app/(app)/layout.tsx`** — import `DashboardSidebar` from `@/features/dashboard/components/dashboard-sidebar`, render as flex sibling to `<main>`
3. **`builder-page.tsx`** — replace `ResizablePanelGroup` with simple flex layout: `BuilderToolbar` on top, then `div.flex-1.flex` containing `ChatPanel` (fixed width ~380px) + `PreviewPanel` (flex-1). `CodeDrawer` rendered conditionally via `BuilderView` state.
4. **`chat-panel.tsx`** — after each AI message, render `<FileBadges files={[...]} />` using the `files` array from `useStreaming`. Add `<ThinkingIndicator />` when `status === "generating"`. Add `<SuggestionChips />` below last message.
5. **`dashboard-sidebar.tsx`** — update `NavItem` hrefs: Home → `/dashboard`, Templates → `/templates`, All projects → `/my-tools`. Add `usePathname()` for active detection.
6. **`DashboardView`** — remove the `AnimatedGradient` absolute positioning (it clips in sidebar layout), use it as a contained background on the greeting area only.

## Constraints

- **No auth** — all settings/profile are local state or placeholder. Auth deferred to Phase 6.
- **CodePanel not deleted** — its logic moves into `CodeDrawer` which reuses the same file tabs + source view pattern but as a sheet/drawer overlay.
- **Existing tests** — the builder-page, chat-panel, preview-panel, and code-panel tests will need updating since the component APIs change. Keep tests passing.
- **Sidebar must collapse on mobile** — use Sheet for mobile sidebar toggle.
