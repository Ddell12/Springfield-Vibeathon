# Fullscreen App Mode & Kid Mode Portal

**Date:** 2026-03-29
**Status:** Approved

## Overview

Two related features that make Bridges apps usable by children on tablets:

1. **Fullscreen App Mode** — hide all app chrome (sidebar, toolbar, chat) and let the generated app fill the entire screen
2. **Kid Mode Portal** — a curated, child-friendly grid of apps accessible from the caregiver's family dashboard, with PIN-protected exit

## Feature 1: Fullscreen App Mode

### Behavior

A single `isFullscreen` boolean state hides all chrome and expands the iframe to cover the viewport.

### Where It Appears

| Surface | Trigger | Behavior |
|---------|---------|----------|
| Builder (preview panel) | `Maximize2` icon button in toolbar right section | Hides sidebar, chat panel, toolbar; iframe fills viewport |
| My Apps | Play icon button on each ProjectCard | Loads app bundle, renders fullscreen as an overlay |
| Kid Mode | Tapping any tile | Default interaction — opens app fullscreen |

### Fullscreen View

- Iframe gets `fixed inset-0 z-50 w-full h-full bg-white`
- No sidebar, toolbar, or header visible
- Floating exit button: top-right, semi-transparent, fades after 3s of inactivity, reappears on touch/mouse movement
- Exit button: `Minimize2` icon + "Exit" label
- `Escape` key exits fullscreen in Builder and My Apps contexts
- **Kid Mode exception:** `Escape` does NOT exit fullscreen — only the PIN-protected exit mechanism works

### Shared Component

`<FullscreenAppView>` is a controlled component. The caller fetches the bundle and passes it in:
- `bundleHtml: string` — the HTML bundle to render in the iframe
- `onExit: () => void` — callback when user exits fullscreen
- `disableEscapeKey?: boolean` — set `true` in kid mode to prevent Escape exit

The exit callback behavior varies by context:

| Context | onExit action |
|---------|---------------|
| Builder | Restores sidebar + chat + toolbar |
| My Apps | Closes the overlay |
| Kid Mode | Navigates back to `/family/[patientId]/play` grid |

### State Management

Local state only in Builder and My Apps — no new hooks, no URL changes, no routing for fullscreen in those contexts. Kid Mode uses URL-based routing (`/family/[patientId]/play/[appId]`) for fullscreen because it needs browser back-button support within the child portal.

### Bundle Fetching

The app bundle lives in the `files` table keyed by `sessionId` + path `_bundle.html`. The lookup chain is:
- **Builder:** Already has `bundleHtml` in state from the streaming pipeline
- **My Apps:** `sessionId` → query `files` table for `_bundle.html`
- **Kid Mode:** `appId` → `apps.sessionId` → query `files` table for `_bundle.html`

A new query `convex/childApps.ts:getBundleForApp` handles the kid mode lookup.

## Feature 2: Kid Mode Portal

### Data Model

New Convex table: `childApps`

```typescript
childApps: defineTable({
  patientId: v.id("patients"),
  appId: v.id("apps"),
  assignedBy: v.string(),           // Clerk userId
  assignedByRole: v.union(v.literal("slp"), v.literal("caregiver")),
  label: v.optional(v.string()),     // Kid-friendly display name override
  sortOrder: v.optional(v.number()), // Manual ordering
})
  .index("by_patientId", ["patientId"])
  .index("by_appId", ["appId"])
```

New field on `caregiverLinks` table:

```typescript
kidModePIN: v.optional(v.string())  // SHA-256 hashed 4-digit PIN
```

**PIN hashing:** SHA-256 is sufficient. The threat model is child-proofing (preventing a kid from reading the PIN in network traffic), not defending against a determined attacker. A 4-digit PIN with SHA-256 is trivially brute-forceable but that's acceptable — the PIN guards a UI mode switch, not sensitive data.

### Curation UI

**SLP side** — Patient detail page (`/patients/[id]`):
- New "Apps" section below existing home programs section
- "Add App" button opens a picker showing the SLP's saved apps
- Can remove apps from the list

**Caregiver side** — Family dashboard (`/family/[patientId]`):
- "Manage Apps" link near the "Enter Kid Mode" button
- Picker shows apps from the caregiver's saved sessions
- Same add/remove flow

Both use `assertPatientAccess` for authorization.

### Routes

```
/family/[patientId]/play          → Kid mode grid
/family/[patientId]/play/[appId]  → Fullscreen app (reuses FullscreenAppView)
```

### Layout

`/family/[patientId]/play/layout.tsx` — completely bare:
- No sidebar, no header, no navigation
- Full-viewport container
- Warm, friendly background (soft pastel or gentle gradient)

### Kid Mode Grid Page

- **Header:** Child's first name + time-of-day greeting ("Good morning, Ace!")
- **Grid:** Large square tiles, 2 columns on tablet, 1 on phone
- **Tile contents:**
  - App thumbnail or colorful placeholder with app's first letter
  - App name in large Manrope bold
  - Practice activities (home programs) get a subtle star badge
- **Tap behavior:** Navigate to `/family/[patientId]/play/[appId]`
- **Back from app:** Floating back arrow (top-left) returns to grid

### Home Programs in the Grid

- Home programs with a linked `materialId` appear as tiles alongside curated apps. The lookup chain is: `homePrograms.materialId` → `patientMaterials.appId` → `apps` → bundle
- Programs without a linked app still appear — tapping shows a simple instruction card (large, readable format of the program's `instructions` field)
- **Quick practice logging:** After returning from an app linked to a home program, a "How did it go?" prompt shows 1-5 star buttons. Logs a `practiceLog` entry with the confidence rating. No duration or notes in kid mode.

### Empty State

If no curated apps and no active home programs: "No apps yet! Ask your therapist or parent to add some." with a colorful illustration.

### Exit Kid Mode

**Primary trigger:** Click/tap a hidden 8px strip at the top of the screen. This is the reliable cross-platform mechanism.

**Secondary trigger (nice-to-have):** Pull-down gesture from the top. Note: this may conflict with iOS Safari pull-to-refresh or Android notification shade. If gesture conflicts arise during implementation, fall back to the 8px strip only.

**Panel:** Slides down revealing "Enter PIN to exit" with a 4-digit numeric keypad (large buttons).

**PIN management:**
- Stored as hashed value on `caregiverLinks.kidModePIN`
- Parent sets PIN from family dashboard before first entering kid mode
- First "Enter Kid Mode" tap with no PIN set → PIN setup modal (enter + confirm)
- Wrong PIN → gentle shake animation, no lockout

### Entry Point

Family dashboard (`/family/[patientId]`) gets a prominent "Kid Mode" button:
1. If PIN not set → PIN setup modal
2. If PIN set → navigate to `/family/[patientId]/play`

### Auth & Access Control

- Kid mode uses the parent's Clerk session — no new auth layer, no child accounts
- All data fetching gated by existing `assertPatientAccess(ctx, patientId)`
- `childApps` mutations use `assertPatientAccess` — both SLP and caregiver can curate
- `childApps` queries fetch the app bundle by document ID (`ctx.db.get(appId)`), bypassing normal `apps.by_user` ownership checks — the `childApps` assignment itself is the authorization
- No new roles needed

## Files to Create/Modify

### New Files
- `convex/childApps.ts` — CRUD mutations/queries for child app assignments
- `src/app/(app)/family/[patientId]/play/layout.tsx` — Bare kid mode layout
- `src/app/(app)/family/[patientId]/play/page.tsx` — Thin wrapper for grid
- `src/app/(app)/family/[patientId]/play/[appId]/page.tsx` — Thin wrapper for fullscreen app
- `src/features/family/components/kid-mode-grid.tsx` — The tile grid
- `src/features/family/components/kid-mode-tile.tsx` — Individual tile component
- `src/features/family/components/kid-mode-exit.tsx` — Swipe-down PIN exit panel
- `src/features/family/components/pin-setup-modal.tsx` — PIN create/confirm modal
- `src/shared/components/fullscreen-app-view.tsx` — Shared fullscreen iframe component
- `src/features/family/components/app-picker.tsx` — Shared app picker for curation
- `src/features/family/components/quick-rating.tsx` — Post-app star rating prompt

### Modified Files
- `convex/schema.ts` — Add `childApps` table, add `kidModePIN` to `caregiverLinks`
- `src/core/routes.ts` — Add `FAMILY_PLAY` and `FAMILY_PLAY_APP` route helpers
- `src/features/builder/components/builder-toolbar.tsx` — Add fullscreen button
- `src/features/builder/components/builder-page.tsx` — Fullscreen state + conditional chrome hiding
- `src/features/my-tools/components/my-tools-page.tsx` — Add play/fullscreen button to cards
- `src/features/family/components/family-dashboard.tsx` — Add "Kid Mode" button + "Manage Apps" link
- `src/features/patients/components/patient-detail.tsx` (or equivalent) — Add "Apps" curation section

## Out of Scope

- PWA / Add to Home Screen (future enhancement — route structure supports it)
- Offline support
- Child accounts or separate auth
- App thumbnails/screenshots (use placeholder for now)
- Analytics on child app usage
