# Group A: App Shell & Navigation Overhaul

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Sidebar rebuild, route cleanup, shared header, recent sessions

---

## Goals

- Replace the fixed `w-20` icon-only sidebar with a Claude.ai-style collapsible panel
- Remove dead routes (dashboard, flashcards) and consolidate library pages
- Move notification bell into a shared page header visible on all breakpoints
- Give users a bottom-left user menu (settings + sign-out) matching Claude.ai UX
- Surface recent builder sessions in the sidebar so users can resume long-running generations

---

## 1. Sidebar Structure

### Layout (top → bottom)

1. **Collapse toggle row** — hamburger icon left, "Bridges" wordmark right. Clicking the hamburger toggles collapsed (`w-14`) / expanded (`w-56`). State persists in `localStorage` key `bridges_sidebar_collapsed`.
2. **"New App" button** — full-width pill (expanded) or icon-only (collapsed), teal gradient, routes to `/builder?new=1`.
3. **Primary nav items** — icon + label inline when expanded, icon-only when collapsed. Items vary by role:
   - **SLP:** Builder, Patients, Sessions, Billing, Speech Coach, Library
   - **Caregiver:** Sessions, Speech Coach
4. **Recents section** — visible only when expanded. "Recents" label (muted caps), then up to 8 recent builder sessions. Each row: session title (truncated, one line), animated dot if `state === "generating"`. Active session highlighted. No recents → "No recent apps" muted text.
5. **User menu row** — bottom of sidebar. Avatar + name + plan tier + chevron when expanded; avatar only when collapsed. Clicking opens a `Popover` above the row.

### Sizing

| State | Width | Content |
|-------|-------|---------|
| Expanded | `w-56` (224px) | Icons + labels + recents |
| Collapsed | `w-14` (56px) | Icons only, no recents |

### No scroll rule

All nav items must fit without overflow. SLP has 6 nav items — at standard icon height (`h-10`) with `gap-1` this fits in ~320px, well within a typical screen. If future items are added, reduce gap before adding scroll.

---

## 2. Routes & Page Changes

### Removed routes

| Route | Action |
|-------|--------|
| `/dashboard` | Delete `src/app/(app)/dashboard/` and `src/features/dashboard/components/dashboard-page.tsx`. Redirect `/dashboard` → `/builder` via `next.config` redirect. |
| `/flashcards` | Delete `src/app/(app)/flashcards/` route directory only. Keep `src/features/flashcards/` — the flashcard generation logic is reused by Group B's type picker. Redirect `/flashcards` → `/builder`. |

### Merged route

`/templates` and `/my-tools` merge into **`/library`**:
- New page: `src/app/(app)/library/page.tsx`
- New feature: `src/features/library/` with a tabbed page component
- Tabs: "Templates" (SLP + caregiver) | "My Apps" (SLP + caregiver, their saved tools)
- **Caregiver access:** Caregivers have no Library item in their sidebar nav. They reach `/library` via the "My Apps" link on their family dashboard, or via a direct link from the builder after saving an app. Do not add Library to the caregiver sidebar (keeps their nav minimal).
- Old routes redirect 301: `/templates` → `/library?tab=templates`, `/my-tools` → `/library?tab=my-apps`
- `ROUTES` constant gets `LIBRARY: "/library"` added

### After sign-in destination

Clerk `afterSignInUrl` and `afterSignUpUrl` set to `/builder` (not `/dashboard`).

### Settings route

`/settings` page and route remain. It is no longer in the sidebar nav — accessed only via the user menu popover.

---

## 3. Shared Page Header

`src/app/(app)/layout.tsx` adds a **shared `AppHeader`** component rendered above `{children}` in every `(app)` route.

```
AppHeader structure:
  <header class="sticky top-0 z-40 h-14 flex items-center border-b bg-background/80 backdrop-blur px-4 gap-4">
    [page title — left, sourced from a `title` prop on AppHeader; each page passes its own title string from within the page component via a context or directly from the layout wrapper]
    [flex-1 spacer]
    [NotificationBell — right]
    [UserButton — right, mobile only (md:hidden hides it on desktop)]
  </header>
```

- `NotificationBell` is **removed from `DashboardSidebar`** — only lives here
- On desktop, `UserButton` is hidden in the header (user accesses account via sidebar bottom)
- On mobile, `UserButton` stays in the header (sidebar is not shown)
- `MobileTopBar` is deleted and replaced by `AppHeader`

---

## 4. Recent Sessions Data

### New Convex query

`convex/sessions.ts` — add `listRecent`:

```ts
export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(8);
  },
});
```

Returns: `_id`, `title` (or first message fallback), `state`, `_creationTime`.

**Implementation note:** Verify `by_userId` index exists on the `sessions` table in `convex/schema.ts` before writing this query. If absent, add `.index("by_userId", ["userId"])` to the schema.

### Sidebar consumption

`DashboardSidebar` calls `useQuery(api.sessions.listRecent)` and renders the recents list. A generating dot (`animate-pulse` teal circle, 6px) appears next to any session where `state === "generating"`.

---

## 5. User Menu (Bottom-Left)

### Implementation

Replace the current `<UserButton />` in the sidebar with a custom button that opens a shadcn/ui `Popover`.

**Trigger (collapsed):** Avatar only
**Trigger (expanded):** Avatar + display name + plan tier badge + `expand_more` icon

**Popover content:**
```
[Avatar] [Name]        (read-only)
         [email]
─────────────────────
  Settings             → /settings
─────────────────────
  Sign out             → clerk.signOut()
```

**Signed-out state:** Row shows "Sign in" text link → `/sign-in`.

**Hooks used:** `useUser()` for name/email, `useClerk()` for `signOut()`.
**No `<UserButton />` in sidebar** — Clerk's built-in component is only used in `AppHeader` (mobile).

---

## 6. Navigation Data Changes

`src/shared/lib/navigation.ts` — update `NAV_ITEMS`:

```ts
export const NAV_ITEMS = [
  { icon: "auto_awesome",     label: "Builder",      href: ROUTES.BUILDER },
  { icon: "group",            label: "Patients",     href: ROUTES.PATIENTS },
  { icon: "video_call",       label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "receipt_long",     label: "Billing",      href: ROUTES.BILLING },
  { icon: "record_voice_over",label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "collections_bookmark", label: "Library",  href: ROUTES.LIBRARY },
] as const;

export const CAREGIVER_NAV_ITEMS = [
  { icon: "video_call",       label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "record_voice_over",label: "Speech Coach", href: ROUTES.SPEECH_COACH },
] as const;
```

Removed: `home`, `flashcards`, `grid_view` (templates), `folder_open` (my tools), `settings`.

---

## 7. Affected Files

### New files
- `src/app/(app)/library/page.tsx`
- `src/features/library/components/library-page.tsx`
- `src/shared/components/app-header.tsx`

### Modified files
- `src/app/(app)/layout.tsx` — add `AppHeader`, remove `MobileTopBar`
- `src/features/dashboard/components/dashboard-sidebar.tsx` — full rebuild
- `src/shared/lib/navigation.ts` — update nav items
- `src/core/routes.ts` — add `LIBRARY`, update `DASHBOARD` redirect
- `convex/sessions.ts` — add `listRecent` query
- `next.config.ts` — add redirects for old routes

### Deleted files
- `src/app/(app)/dashboard/` (entire directory)
- `src/app/(app)/flashcards/` (route directory only — feature logic stays for Group B)
- `src/app/(app)/templates/` (entire directory)
- `src/app/(app)/my-tools/` (entire directory)
- `src/features/dashboard/components/mobile-top-bar.tsx`
- `src/shared/components/mobile-nav-drawer.tsx`

### Test updates
- `dashboard-sidebar.test.tsx` — rewrite for new sidebar
- `dashboard-sidebar-caregiver.test.tsx` — rewrite
- `mobile-nav-drawer.test.tsx` — delete
- `navigation.test.ts` — update for new nav items + library route

---

## 8. Out of Scope

- Group B (builder artifact/publish fixes, background generation, flashcard picker)
- Group C (patient detail redesign, session note redesign, billing E2E, session email invite, mobile time overflow)
- Group D (caregiver QA screenshots)
- Any changes to the marketing layout or sign-in/sign-up pages
