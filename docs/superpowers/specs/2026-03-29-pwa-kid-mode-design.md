# PWA Kid Mode — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Author:** Claude + Desha

## Objective

Enable parents/caregivers to "Add to Home Screen" on a tablet and give their child a dedicated app icon that opens straight to a fullscreen grid of their assigned therapy apps. The kid taps a tile, the app launches fullscreen — no nav chrome, no distractions.

## Decisions

| Question | Decision |
|----------|----------|
| What is `/play`? | Dedicated kid-mode view — stripped-down UI with just therapy apps, no navigation chrome |
| What does the child see? | Grid of assigned therapy apps as big colorful tiles |
| What happens on tile tap? | App takes over full viewport in same PWA window, with subtle "back to grid" button |
| Offline support? | Online-only — no service worker, just installability via web app manifest |
| Who can install? | Dual-manifest: play route gets per-child identity, main app separately installable as "Bridges" |
| Approach? | Two static manifests via route handlers — dynamic per-child manifest at play route |

## Route Structure

The play experience lives in a `(play)` route group **outside** the `(app)` group to avoid the sidebar/nav layout:

```
src/app/(play)/family/[patientId]/play/
  ├── layout.tsx                    ← fullscreen layout, no sidebar
  ├── page.tsx                      ← thin wrapper → PlayGrid
  ├── [appId]/page.tsx              ← thin wrapper → AppViewer
  └── manifest.json/route.ts        ← dynamic per-child manifest
```

### Why a separate route group?

The `(app)` layout includes `DashboardSidebar` and `MobileTopBar`. The play experience needs a completely clean viewport — no sidebar, no header. Using a separate `(play)` route group with its own layout is the cleanest way to achieve this in Next.js App Router without conditional rendering hacks.

## Data Flow

### Grid query chain

No new tables or schema changes needed. Everything uses existing schema:

1. **`patientMaterials`** (index: `by_patientId`) — get all materials assigned to this child. Only materials with a non-null `appId` appear in the grid; session-only materials are filtered out. Grid ordered by `patientMaterials.assignedAt`.
2. For each material with an `appId`, fetch the **`apps`** record → title, description, sessionId
3. **`homePrograms`** (index: `by_patientId`) — identify which apps have active practice assignments (visual priority badge)
4. **Empty state:** If no materials with an `appId` exist, show "No activities yet — your therapist will assign them here" with a friendly illustration

### App launch

1. Fetch `app` by ID
2. Fetch latest `files` by `sessionId` → get bundled HTML
3. Render in sandboxed iframe via blob URL (same pattern as builder preview)
4. Wire up `use-tts-bridge` for TTS/STT if the app uses speech features

### Auth

- Caregiver must be authenticated and linked to patient via `caregiverLinks`
- If not linked: show "Ask your therapist to invite you" with link to `/family`
- If not signed in: redirect to sign-in with return URL to play page

## Dual Manifest Strategy

### Root manifest — `src/app/manifest.ts`

Next.js Metadata API convention. Serves the main "Bridges" installable identity:

```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bridges — AI Therapy App Builder",
    short_name: "Bridges",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#f8faf8",
    background_color: "#f8faf8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

### Per-child play manifest — route handler

`src/app/(play)/family/[patientId]/play/manifest.json/route.ts`

Dynamic route handler that uses `ConvexHttpClient` to fetch the patient's name from Convex via a public query. Returns a personalized manifest. If the `patientId` is invalid or not found, returns a fallback manifest with generic name "Activities".

- `name`: "{Child's name}'s Activities"
- `short_name`: "{Child's name}"
- `start_url`: `/family/{patientId}/play`
- `scope`: `/family/{patientId}/play`
- `display`: "standalone"
- `theme_color`: `#0d7377` (Bridges teal)
- `background_color`: `#faf8f5` (warm cream)
- Icons: same `icon-192.png` / `icon-512.png` (personalized per-child icons is a future enhancement)

The play layout renders a `<link rel="manifest" href="/family/{patientId}/play/manifest.json">` directly in the layout JSX `<head>`. Next.js Metadata API's `manifest` field only supports static paths, so the dynamic per-child URL requires an explicit `<link>` tag.

### Why scoped manifests work

The browser treats each unique `start_url` + `scope` pair as a separate installable app. Since `/family/{patientId}/play` is a subset of `/`, and has its own `scope` declaration, the browser recognizes it as a distinct installable web app. Both can coexist on the same device's home screen.

## Kid Mode UI

### Play Grid (`src/features/play/components/play-grid.tsx`)

- Responsive grid: 2 columns tablet portrait, 3 columns landscape
- Large colorful tiles with generous touch targets (min 88x88px) — designed for children with motor planning challenges
- Each tile: app title, thumbnail/icon, optional "Practice today" badge (linked to active `homeProgram`)
- Top bar: child's first name + small parent-only settings gear icon (links to caregiver dashboard)
- Background: warm, soft color — subtle gradient or Bridges teal at low opacity
- Minimal text — icons and colors communicate
- Tap animation: scale down → spring back, `cubic-bezier(0.4, 0, 0.2, 1)`, 300ms

### App Viewer (`src/features/play/components/app-viewer.tsx`)

- Full-viewport sandboxed iframe rendering the app's HTML bundle via blob URL
- Floating "home" button: small semi-transparent circle, top-left corner. Visible but not distracting. Returns to grid.
- Inherits `use-tts-bridge` for TTS/STT support
- No other chrome — app owns the entire screen

### Auth Guard (`src/features/play/components/play-auth-guard.tsx`)

- Checks `caregiverLinks` for current user + patient pair
- Not linked: "Ask your therapist to invite you" + link to `/family`
- Not signed in: redirect to sign-in with return URL
- Invalid or nonexistent `patientId`: show not-found page
- Invalid `appId` in viewer: return to grid with error toast

## New Files

| File | Purpose |
|------|---------|
| `src/app/manifest.ts` | Root "Bridges" web app manifest |
| `src/app/(play)/layout.tsx` | Fullscreen layout — no sidebar, no nav |
| `src/app/(play)/family/[patientId]/play/page.tsx` | Thin wrapper → PlayGrid |
| `src/app/(play)/family/[patientId]/play/[appId]/page.tsx` | Thin wrapper → AppViewer |
| `src/app/(play)/family/[patientId]/play/manifest.json/route.ts` | Dynamic per-child manifest |
| `src/features/play/components/play-grid.tsx` | App tile grid |
| `src/features/play/components/app-tile.tsx` | Single tile component |
| `src/features/play/components/app-viewer.tsx` | Fullscreen iframe app renderer |
| `src/features/play/components/play-auth-guard.tsx` | Caregiver link check |
| `src/features/play/hooks/use-play-data.ts` | Fetches materials + apps + programs for grid |
| `public/icon-192.png` | PWA icon 192x192 (generated from favicon.svg) |
| `public/icon-512.png` | PWA icon 512x512 (generated from favicon.svg) |

**Note:** PWA icons are a prerequisite for installability — browsers will not show the install prompt without valid icons at the declared paths. Generate these before testing.

**Modified files:** `src/app/layout.tsx` (add root manifest link via metadata)

## Not in Scope

- No service worker / offline caching — online-only
- No per-child custom icons — both manifests use same Bridges icons
- No push notifications
- No app reordering / favorites — grid ordered by `patientMaterials.assignedAt`
- No usage tracking from play mode
- No parent lock / kiosk mode — rely on OS-level Guided Access / screen pinning
- No new Convex tables or schema changes

## Testing

- Unit tests for `use-play-data` hook (material → app resolution, program badge logic)
- Unit test for manifest route handler (returns valid JSON with child name)
- E2E: caregiver signs in → navigates to `/family/{patientId}/play` → sees grid → taps tile → app renders fullscreen → taps home → returns to grid
- E2E: unauthenticated user → redirect to sign-in
- E2E: unlinked user → "Ask your therapist" message
