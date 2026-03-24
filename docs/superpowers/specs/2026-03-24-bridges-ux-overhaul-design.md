# Bridges UX Overhaul — Full Design Spec

**Date:** 2026-03-24
**Status:** Approved via brainstorming session
**Deadline:** March 27 (vibeathon demo)
**Scope:** Complete user journey redesign — from landing page to published tool

---

## 1. Project Overview

### What We're Building
A complete UX overhaul of the Bridges AI therapy tool builder so that every interaction feels intentional, every generated tool works first-try and looks professionally designed, and the full journey from "describe what you need" to "use it with your kid on an iPad" is seamless.

### Design Principles
1. **Every action gets feedback** — no dead buttons, no silent clicks, no mystery loading
2. **Zero developer jargon** — therapists and parents never see "component", "code", "API", "sandbox"
3. **Opinionated output** — generated tools have a minimum quality floor via a baked-in design system
4. **Persistence as a choice** — user picks how data saves before building, AI handles the rest
5. **Publish means permanent** — shared links work tomorrow, not just while a sandbox is alive

### Audience
- ABA therapists building tools for sessions
- Speech therapists creating communication boards
- Parents of autistic children making daily routine tools
- **Zero** technical knowledge assumed

---

## 2. User Journey (7 Stages)

### Stage 1: Landing & Intent
Parent arrives → sees "What does your child need today?" → types a description OR picks a quick-start template card (Token Board, Visual Schedule, Communication Board, Choice Board).

### Stage 2: Persistence Choice
Before building starts, a bottom sheet slides up:
> "How should this tool save progress?"
> - **"Just for now"** — resets when you close the tab
> - **"Save on this device"** — survives closing the browser *(default, pre-selected)*
> - **"Save everywhere"** — works on any device via a link

Single tap, auto-dismisses. Choice gets baked into generated code via system prompt injection.

### Stage 3: Generation (The Magic Moment)
Chat shows design plan streaming → progress steps animate ("Understanding your request..." → "Designing the layout..." → "Creating your tool..." → "Adding interactions..." → "Ready!") → preview builds live via Vite HMR in the iframe.

### Stage 4: Completion & Celebration
Confetti/sparkle burst (first generation only) → "Your [Tool Name] is ready!" card → "What's next?" tips → suggested action chips appear.

### Stage 5: Iteration
Parent types modification → subtle "Updating your tool..." pill overlays preview → tool morphs live (no full refresh) → new suggested actions cross-fade in.

### Stage 6: Publish & Share
Parent taps "Publish" → Vite builds in sandbox → uploads to Vercel → permanent URL returned. OR taps "Share" → gets sandbox-based preview link + QR code. OR taps "Save to my files" → downloads HTML.

### Stage 7: Return
Parent comes back → My Tools shows saved tools → tap to reopen → conversation + tool are exactly where they left off.

---

## 3. Interaction Feedback Map

### Stage 1 — Landing & Prompt

| Action | Feedback |
|--------|----------|
| Hover "Start Building" CTA | opacity-90, shadow-md (existing, keep) |
| Click template card | Scale 95% → 100% + brief ripple, then transition to builder |
| Type in textarea | Subtle "ready" state when prompt is substantial |
| Click "Build it" | Button shows spinner + text → "Building...", disables |
| Empty textarea + hover Build | cursor-not-allowed, opacity-40 (existing, keep) |

### Stage 2 — Persistence Choice

| Action | Feedback |
|--------|----------|
| Sheet appears | 300ms ease-out slide from bottom, backdrop dims |
| Hover option | Tonal background shift + slight scale |
| Select option | Checkmark appears, pulse animation, auto-dismiss after 400ms |
| Default state | "Save on this device" pre-selected with primary border |

### Stage 3 — Generation

| Action | Feedback |
|--------|----------|
| Plan streaming | Text streams into thinking bubble (existing, keep) |
| Progress steps | Staggered fade-in with spinner (existing, keep — fix label) |
| Preview loading (first build) | Loading carousel (existing, keep) |
| Preview appears | Opacity/scale transition + subtle border glow flash |

### Stage 4 — Completion

| Action | Feedback |
|--------|----------|
| Generation complete | CSS confetti/sparkle burst (1.5s, first generation only) |
| CompletionMessage | Fade-in card (existing, keep) |
| Suggested actions | Stagger fade-in (existing, keep) |

### Stage 5 — Iteration

| Action | Feedback |
|--------|----------|
| Send iteration message | "Updating your tool..." pill overlay, preview stays visible |
| Iteration complete | Dismiss pill + brief border glow (no confetti) |
| Suggested actions refresh | Cross-fade (old out 200ms, new in 200ms) |

### Stage 6 — Header Actions

| Action | Feedback |
|--------|----------|
| Click Save (download) | Toast: "Tool saved to your files!" with checkmark |
| Click Share | Share dialog opens (existing, keep) |
| Copy share link | Toast: "Link copied!" (existing, keep) |
| Click New | AlertDialog: "Start a new tool? Your current one is saved." |
| Click Undo | Restore previous version + toast "Restored previous version" |
| Click theme toggle | Smooth 300ms transition on all surfaces |
| Responsive picker | Preview resizes with spring animation, device frame appears |
| Click Publish | Spinner + "Publishing..." → progress → confetti + permanent URL |
| Click Update (after publish) | Spinner + "Updating..." → toast "Published!" |

### Stage 7 — My Tools

| Action | Feedback |
|--------|----------|
| Page load | Skeleton cards with pulse (existing, keep) |
| Hover tool card | ring-primary/30 + shadow-lg (existing, keep) |
| Click Open | Card scale-down 95% before navigation |
| Click Delete | shadcn AlertDialog (not browser confirm()) with destructive styling |
| Empty state | Icon + "No tools yet" + CTA (existing, keep) |

### Global

| Gap | Fix |
|-----|-----|
| Error messages are text-only | Add "Try again" button next to error text |
| Footer links point to "#" | Remove footer links entirely (or implement real pages) |

---

## 4. Opinionated Generation — Therapy Design System

### Layer 1: Custom Vite E2B Template (`vite-therapy`)

Switch from `nextjs-developer` to a custom E2B template:

```
vite-therapy/
├── index.html              ← loads Google Fonts (Nunito + Inter)
├── src/
│   ├── App.tsx             ← AI writes HERE (default export)
│   ├── main.tsx            ← ReactDOM.createRoot (never touched by AI)
│   ├── therapy-ui.css      ← design system classes + animation keyframes
│   ├── hooks/
│   │   ├── useLocalStorage.ts   ← "Save on this device" persistence
│   │   └── useConvexData.ts     ← "Save everywhere" persistence
│   └── lib/
│       └── convex-client.ts     ← anonymous Convex auth (lazy-loaded)
├── tailwind.config.ts      ← therapy theme (warm colors, large radii)
├── package.json            ← react, tailwind, framer-motion pre-installed
└── vite.config.ts          ← standard Vite React config
```

**Key constraint:** AI only writes to `src/App.tsx`. Everything else is pre-built and tested.

### therapy-ui.css Classes

```css
/* Interactive cards — all tool types */
.card-interactive     /* rounded-2xl, shadow, hover:scale-[1.02], active:scale-95, transition-all 200ms */
.tap-target           /* min-h-[64px], min-w-[64px], touch-action:manipulation */

/* Token boards */
.token-star           /* 48px star with glow on .earned state */
.token-star.earned    /* golden glow + scale bounce-in animation */

/* Visual schedules */
.schedule-step        /* horizontal step card */
.schedule-step.completed  /* strikethrough + checkmark draw animation */

/* Communication / choice boards */
.board-cell           /* grid cell, scales on tap, border highlight on selected */
.board-cell.selected  /* primary border + pulse animation */

/* Celebrations */
.celebration-burst    /* triggers confetti keyframe on mount */
.celebration-bounce   /* bounces element in from scale-0 */

/* Typography */
.tool-title           /* Nunito 700, 2rem, primary color */
.tool-instruction     /* Inter 400, 1rem, muted color */
.tool-label           /* Inter 600, 0.875rem */

/* Layout */
.tool-container       /* max-w-lg mx-auto p-6, centered single-column */
.tool-grid            /* responsive grid, auto-fit minmax(120px, 1fr), gap-4 */
```

### Layer 2: System Prompt Upgrade

The system prompt tells Claude:
1. What CSS classes are available (use them, don't write custom CSS)
2. What hooks are available (useLocalStorage, useConvexData)
3. What fonts are pre-loaded (Nunito headings, Inter body)
4. Strict rules: every button works, no placeholders, realistic content, animations via pre-built classes
5. Persistence tier (injected based on user's Stage 2 choice)
6. Iteration rules: preserve functionality, only change what was asked

### Layer 3: Persistence Tier Injection

Based on user's choice, the system prompt includes:

- **"Just for now"** → "Use React state (useState) for all data. No persistence."
- **"Save on this device"** → "Use the `useLocalStorage` hook from `./hooks/useLocalStorage` for all data that should persist. Import: `import { useLocalStorage } from './hooks/useLocalStorage'`"
- **"Save everywhere"** → "Use the `useConvexData` hook from `./hooks/useConvexData` for all data that should sync. Import: `import { useConvexData } from './hooks/useConvexData'`"

### Cloud Persistence: Convex Anonymous Auth (Detail)

The "Save everywhere" tier uses Convex's built-in Anonymous auth provider (`@convex-dev/auth/providers/Anonymous`).

**How it works:**
1. The `vite-therapy` template includes a pre-configured Convex client in `src/lib/convex-client.ts`
2. On first load, the app calls `signIn("anonymous")` — Convex creates a persistent anonymous user with no credentials
3. The anonymous session persists via a browser cookie — same device returns as the same user
4. Cross-device: the share/publish URL includes a `toolId` query param. The Convex backend stores tool state keyed by `toolId`, not by user. Anyone with the link reads/writes the same data.

**`useConvexData` hook API:**
```tsx
// Generic key-value hook — tool state stored as a JSON blob in Convex
function useConvexData<T>(key: string, defaultValue: T): [T, (value: T) => void]

// Usage in generated code:
const [stars, setStars] = useConvexData("stars", [false, false, false, false, false]);
const [reward, setReward] = useConvexData("selectedReward", null);
```

**Convex schema for tool state:**
```typescript
// convex/schema.ts — new table
toolState: defineTable({
  toolId: v.string(),     // matches the project's shareSlug
  key: v.string(),        // state key (e.g., "stars", "selectedReward")
  value: v.any(),         // JSON-serializable value
  updatedAt: v.number(),
})
  .index("by_toolId_key", ["toolId", "key"])
```

This generalizes across all tool types — each tool stores its own keys. The hook handles reads (reactive via Convex subscription) and writes (mutation). No auth UI, no login, no password.

### FragmentSchema Changes

| Field | Current | New |
|-------|---------|-----|
| `template` | `"nextjs-developer" \| "vue-developer" \| "html-developer"` | `"vite-therapy"` (single value) |
| `file_path` | `"app/page.tsx"` | `"src/App.tsx"` |
| `port` | 3000 (default) | 5173 (Vite default) |
| `persistence` | (doesn't exist) | `"session" \| "device" \| "cloud"` (NEW) |
| Other fields | Keep as-is | Keep as-is |

---

## 5. E2B Sandbox Switch — Next.js to Vite

### Why
- Vite HMR: 5-20ms (vs Next.js 200-500ms)
- No `"use client"` hack needed
- Lighter template = faster boot (3-5s vs 10-15s)
- Simpler mental model for AI (no SSR, no RSC, no routing)
- Pre-installed design system means consistent output

### Template Source Location

The template lives in this repo at `e2b-templates/vite-therapy/`. It is a standalone directory with its own `package.json`, NOT a Next.js sub-project. E2B templates are registered via CLI and stored in E2B's infrastructure — the local directory is the source of truth.

### Migration
1. Build the `vite-therapy` template in `e2b-templates/vite-therapy/`
2. Register as custom E2B template via `e2b template create` from that directory
3. Update `FragmentSchema` to default to `"vite-therapy"`, port 5173, file_path `"src/App.tsx"`
4. Update `e2b.ts` — `createSandbox` and `executeFragment` use new template
5. Update system prompt to reference available classes, hooks, fonts
6. Remove `"use client"` injection hack from `chat.tsx`
7. Existing saved projects: fragment code is self-contained, still works in new sandbox

### Backward Compatibility
Saved projects store complete fragment code. When restoring an old Next.js project, the sandbox will write the code to `src/App.tsx` instead of `app/page.tsx`. Since the code is a self-contained React component with a default export, it will work in Vite as long as it doesn't use Next.js-specific imports (`next/image`, `next/link`). The system prompt already bans these.

---

## 6. Publish & Share

### Three Modes

**1. Share Preview (Existing — Fix)**
- Boots a fresh sandbox on-demand from saved fragment in Convex
- Link is permanent (fragment persists), sandbox is ephemeral
- Note in share dialog: "May take a few seconds to load"

**2. Publish to Vercel (NEW)**
- Runs `vite build` inside E2B sandbox
- Uploads `dist/` folder to Vercel via Deploy API
- Returns permanent `.vercel.app` URL
- Header button: "Publish" → "Update" (after first publish)
- Progress: "Building..." → "Uploading..." → "Live!" + confetti
- Published URL stored on project in Convex (`publishedUrl` field)

**Vercel Deploy API Details:**
- **Endpoint:** `POST https://api.vercel.com/v13/deployments`
- **Auth:** Vercel Access Token stored as `VERCEL_DEPLOY_TOKEN` env var (server-side only, in `src/app/api/publish/route.ts`)
- **Project strategy:** Single Vercel project named `bridges-tools` — all published tools deploy as separate deployments under this project. Each deployment gets a unique URL like `bridges-tools-abc123.vercel.app`.
- **Flow:**
  1. Server route receives `{ projectId }` from client
  2. Fetches fragment from Convex
  3. Runs `sandbox.commands.run("npx vite build")` in E2B sandbox
  4. Reads built files from `dist/` via `sandbox.files.list("dist")`
  5. Uploads files to Vercel: `POST /v13/deployments` with `files` array
  6. Returns deployment URL
  7. Stores URL on project via `updateProject({ publishedUrl })`
- **Re-deploy:** Same flow, same Vercel project — Vercel handles versioning
- **Team:** Uses `VERCEL_TEAM_ID` env var if deploying under a team scope

**3. Save to Files (Existing — Polish)**
- Downloads self-contained HTML file
- Rename button title: "Save to my files"
- Add toast: "Tool saved to your files!"

### Publish Button States

| State | Button | Behavior |
|-------|--------|----------|
| No project | Hidden | — |
| Has project, not published | "Publish" (primary gradient) | Triggers Vercel deploy |
| Has project, published | "Update" (primary gradient) | Re-deploys to same URL |
| Publishing | Spinner + "Publishing..." | Disabled |

### Share Dialog Tabs

**Tab 1: "Preview Link"**
- QR code + sandbox-based preview URL
- "This loads a live preview"

**Tab 2: "Published Link"** (shown only after publishing)
- QR code + permanent Vercel URL
- "This link is permanent"
- "Open" + "Copy" buttons

---

## 7. Undo / Version History Strategy

### Data Model

Add to the `projects` table in `convex/schema.ts`:

```typescript
versions: v.optional(v.array(v.object({
  fragment: v.any(),       // complete FragmentResult snapshot
  title: v.string(),       // tool title at that point
  timestamp: v.number(),   // Date.now()
}))),
publishedUrl: v.optional(v.string()),  // Vercel deployment URL
persistence: v.optional(v.string()),   // "session" | "device" | "cloud"
```

### When Versions Are Captured

A version is saved **before each iteration update** — when `handleFragmentGenerated` fires and a previous fragment already exists. The current fragment is pushed to the `versions` array before being replaced by the new one.

- **First generation:** No version saved (nothing to go back to)
- **Second generation (first iteration):** Previous fragment saved as version[0]
- **Third generation:** Previous saved as version[1], etc.
- **Retention:** Max 10 versions, FIFO (oldest dropped when limit hit)

### Undo Behavior

- **Single-step undo:** Restores the most recent version (second-to-last in the array). This is intentional — non-technical users think "go back" not "navigate a timeline."
- **After undo:** The undo button disappears until the user makes another change (versions array now has < 2 entries for comparison).
- **Undo creates a new sandbox:** Restored fragment is written to E2B sandbox, preview updates.
- **Toast:** "Restored previous version"

### Size Concern

Each fragment includes full HTML code (10-50KB). 10 versions = 100-500KB per project document. Convex's 1MB document limit is not likely to be hit, but monitor.

---

## 8. Backward Compatibility

### Old Next.js Projects in Vite Sandbox

Saved projects store complete fragment code. When the sandbox switches to Vite:

- **Safe:** Projects using React + Tailwind + inline styles → work as-is in `src/App.tsx`
- **Broken:** Projects with `next/image`, `next/link`, or `next/font` imports → fail in Vite

**Mitigation:** Add a code sanitizer that runs before writing to the sandbox:
1. Replace `import Image from 'next/image'` → remove import, replace `<Image>` with `<img>`
2. Replace `import Link from 'next/link'` → remove import, replace `<Link>` with `<a>`
3. Remove `"use client";` directive (not needed in Vite, not harmful but unnecessary)

This runs in `e2b.ts` before `sandbox.files.write()` — a simple string replacement, not an AST transform.

---

## 9. UI Cleanup — Strip Developer-Facing Elements

### Remove
- 5 stub view toggle buttons in header (Cloud, Code, Analytics, divider, Plus)
- "Code" tab from preview panel (raw HTML view)
- 4 stub buttons from chat input (+, Visual edits, Chat, mic)
- Commented notification banner in chat input
- Footer links pointing to "#"

### Rename
- "Download Code" → "Save to my files"
- "Your app preview will appear here" → "Your tool preview will appear here"
- "App Preview" iframe title → "Tool Preview"
- "Writing component code" progress label → "Creating your tool"

### Add
- Responsive preview picker (Phone / Tablet / Computer) in header center
- Undo button in header (restores previous version)
- Dark mode toggle (sun/moon) in header
- Confetti animation on first generation completion
- "Updating your tool..." pill overlay during iteration
- Download toast confirmation
- AlertDialog for New (confirmation) and Delete (replace browser confirm)
- "Try again" button on error messages
- Persistence choice bottom sheet before first build

---

## 10. Technical Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/features/builder-v2/components/responsive-picker.tsx` | Phone/Tablet/Computer breakpoint buttons |
| `src/features/builder-v2/components/persistence-sheet.tsx` | Bottom sheet for persistence tier selection |
| `src/features/builder-v2/components/confetti.tsx` | CSS confetti burst animation component |
| `src/features/builder-v2/components/publish-dialog.tsx` | Publish flow with progress + result |
| `src/shared/components/theme-toggle.tsx` | Dark mode sun/moon toggle |
| `src/app/api/publish/route.ts` | Server route for Vercel Deploy API |
| `e2b-templates/vite-therapy/` | Custom Vite sandbox template (in this repo) |
| `e2b-templates/vite-therapy/src/therapy-ui.css` | Design system classes + animation keyframes |
| `e2b-templates/vite-therapy/src/hooks/useLocalStorage.ts` | Device-persistent state hook |
| `e2b-templates/vite-therapy/src/hooks/useConvexData.ts` | Cross-device persistent state hook |
| `e2b-templates/vite-therapy/src/lib/convex-client.ts` | Anonymous Convex auth client |

### Modified Files
| File | Changes |
|------|---------|
| `src/features/builder-v2/components/builder-header.tsx` | Remove stubs, add responsive picker + undo + theme toggle + publish |
| `src/features/builder-v2/components/chat-input.tsx` | Remove stub buttons + notification banner |
| `src/features/builder-v2/components/preview.tsx` | Remove code view, add breakpoint width + iteration overlay + border glow |
| `src/features/builder-v2/components/fragment-web.tsx` | Accept width prop for responsive sizing |
| `src/features/builder-v2/components/file-progress.tsx` | Fix jargon label |
| `src/features/builder-v2/components/chat.tsx` | Message persistence, initial messages, onMessagesChange |
| `src/features/builder-v2/components/completion-message.tsx` | Trigger confetti on first completion |
| `src/features/builder-v2/components/suggested-actions.tsx` | Cross-fade animation on refresh |
| `src/features/builder-v2/lib/prompt.ts` | Complete system prompt rewrite with design system classes, persistence injection |
| `src/features/builder-v2/lib/schema.ts` | Update FragmentSchema (template, file_path, port, persistence field) |
| `src/features/builder-v2/lib/e2b.ts` | Switch to vite-therapy template, update port |
| `src/app/(app)/builder/page.tsx` | Wire persistence choice, undo, publish, iteration state, message persistence, responsive state |
| `src/features/my-tools/components/my-tools-page.tsx` | Replace browser confirm() with AlertDialog |
| `src/features/sharing/components/share-dialog.tsx` | Add tabs (Preview Link / Published Link) |
| `convex/schema.ts` | Add versions + publishedUrl + persistence fields to projects |
| `convex/projects.ts` | Add saveVersion, getLatestVersion, updatePublishUrl |
| `src/app/globals.css` | Add .dark tokens + dark utility overrides |
| `src/app/api/sandbox/route.ts` | Handle new template, port |

---

## 11. Success Criteria

After implementation, these must all be true:

1. **A judge can watch** a parent describe a token board → tool builds live → all buttons work → stars animate → celebration plays → parent shares it via QR code
2. **Zero dead buttons** — every visible button does something
3. **Zero developer jargon** visible anywhere in the UI
4. **Generated tools look designed** — consistent typography, spacing, colors, animations via therapy-ui.css
5. **Iteration is live** — "make stars bigger" morphs the preview without a loading screen
6. **Persistence works** — "Save on this device" survives browser close; "Save everywhere" works across devices
7. **Publish works** — permanent Vercel URL that loads instantly
8. **Dark mode works** — all surfaces/text invert correctly
9. **Responsive preview works** — Phone/Tablet/Computer resizes the preview with device frame
10. **Undo works** — restores previous version with one tap
11. **Messages persist** — close browser, reopen, conversation is there
