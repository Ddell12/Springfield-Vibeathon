# WAB Builder Pipeline — Replace WebContainer with Web Artifacts Builder

**Date:** 2026-03-26
**Status:** Approved
**Goal:** Replace the WebContainer-based live preview with a server-side Web Artifacts Builder (WAB) pipeline that produces production-quality bundled HTML apps.

## Problem

Claude's freeform code generation into the WebContainer produces terrible output. The WebContainer template has limited string-template shadcn components (8 total), uses Tailwind v4 `@theme` syntax that Claude struggles with, and Claude frequently generates flat, generic, broken apps.

## Solution

Integrate the Web Artifacts Builder (WAB) skill pipeline into the `/api/generate` route. Claude generates code targeting a real Vite+React+Tailwind v3 project with 40+ pre-installed shadcn/ui components. After generation, Parcel bundles everything into a single self-contained `bundle.html` served in an iframe.

## Architecture

```
User prompt → POST /api/generate →
  1. cp -r artifacts/wab-scaffold/ /tmp/bridges-build-{sessionId}/
  2. Claude generates files via tool calls → writes to disk + tracks in Map
  3. Design review pass (Claude polishes)
  4. pnpm exec parcel build + html-inline → bundle.html
  5. Stream bundle.html contents as SSE "bundle" event
  6. Client renders in iframe via blob URL
  7. Cleanup temp dir (in finally block)
```

## Components

### 1. Pre-scaffolded WAB Template (`artifacts/wab-scaffold/`)

One-time setup via `scripts/setup-wab-scaffold.sh`:
1. Runs `init-artifact.sh` from the WAB skill to create a Vite+React+TS+shadcn project
2. Pre-installs Parcel bundling deps: `parcel`, `@parcel/config-default`, `parcel-resolver-tspaths`, `html-inline`
3. Creates `.parcelrc` config with path alias support
4. Adds therapy components, hooks, and design tokens

**Scaffold contents:**
- React 18 + TypeScript + Vite
- Tailwind CSS 3.4 with shadcn HSL theming system
- 40+ real shadcn/ui components (pre-installed via tarball)
- All Radix UI dependencies included
- Parcel + html-inline pre-installed (no install at bundle time)
- Lucide icons, motion (framer-motion), CVA, clsx, tailwind-merge

**Therapy additions to scaffold:**
- Therapy components ported from current `webcontainer-files.ts`:
  - TokenBoard, VisualSchedule, CommunicationBoard, DataTracker
  - CelebrationOverlay, ChoiceGrid, TimerBar, PromptCard
  - TapCard, SentenceStrip, BoardGrid, PageViewer, etc.
  - Placed at `src/components/[Name].tsx` with `@/components/[Name]` import paths
- Therapy hooks: useLocalStorage, useAnimation, useDataCollection
  - Placed at `src/hooks/[name].ts` with `@/hooks/[name]` import paths
- TTS via Web Speech API (browser-native `speechSynthesis`, no API keys)
  - `src/hooks/useTTS.ts` — wraps `window.speechSynthesis` with `speak(text)` + `speaking` state
- Therapy-ui.css design tokens (colors, fonts, spacing) integrated into `src/index.css`
- Google Fonts (Nunito, Inter) in index.html

**Stored with node_modules** for fast copy (no install step per request).

**Git strategy:**
- `artifacts/wab-scaffold/node_modules/` in `.gitignore`
- `scripts/setup-wab-scaffold.sh` recreates the full scaffold from scratch
- Run once after cloning: `bash scripts/setup-wab-scaffold.sh`

**Path protection:** Claude must NOT overwrite pre-installed scaffold files:
- `src/components/ui/*` (shadcn components)
- `src/components/TokenBoard.tsx`, `src/components/SentenceStrip.tsx`, etc. (therapy components)
- `src/hooks/*` (pre-built hooks)
- `src/lib/utils.ts`
- Config files (`vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `.parcelrc`)

### 2. API Route Changes (`src/app/api/generate/route.ts`)

**Before generation:**
```typescript
import { exec } from "child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// Copy scaffold to temp dir
const buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
cpSync("artifacts/wab-scaffold", buildDir, { recursive: true });
```

**Tool changes:**
- `write_file`: writes to `buildDir` on disk AND tracks in `collectedFiles` Map (dual-write — disk for build, Map for Convex persistence + design review)
- `read_file`: reads from `buildDir` filesystem
- `list_files`: lists from `buildDir` filesystem
- `set_app_name`: same as current

**After generation + review pass:**
```typescript
// Bundle with Parcel (async — does NOT block event loop)
send("status", { status: "bundling" });
send("activity", { type: "thinking", message: "Bundling your app..." });

await execAsync(
  "pnpm exec parcel build index.html --no-source-maps --dist-dir dist && pnpm exec html-inline -i dist/index.html -o bundle.html",
  { cwd: buildDir, timeout: 30000 }
);
const bundleHtml = readFileSync(join(buildDir, "bundle.html"), "utf-8");

// Stream to client
send("bundle", { html: bundleHtml });
```

**Cleanup in finally block:**
```typescript
finally {
  // Cleanup temp dir even on crash
  try { rmSync(buildDir, { recursive: true, force: true }); } catch {}
  controller.close();
}
```

**collectedFiles Map preserved for:**
- Convex file persistence (existing batch mutation logic)
- `buildReviewMessages(collectedFiles)` for design review pass
- `done` SSE event with file list

**SSE events (updated):**
- `session` — sessionId
- `status` — generating | bundling | live | failed
- `activity` — thinking messages
- `token` — streaming Claude tokens
- `file_complete` — individual file written (progress indicator only — no WebContainer write)
- `bundle` — final bundle.html contents
- `done` — completion with sessionId + files[]

### 3. Preview Panel (`src/features/builder/components/preview-panel.tsx`)

Replace WebContainer iframe with blob URL-based rendering:

```tsx
interface PreviewPanelProps {
  bundleHtml: string | null;
  state: StreamingStatus;
  error?: string;
  deviceSize?: DeviceSize;
}

// Use blob URL instead of srcdoc — gives iframe its own origin,
// making sandbox="allow-scripts allow-same-origin" safe
// (unlike srcdoc where allow-same-origin shares parent origin)
const blobUrl = useMemo(() => {
  if (!bundleHtml) return null;
  const blob = new Blob([bundleHtml], { type: "text/html" });
  return URL.createObjectURL(blob);
}, [bundleHtml]);

// Cleanup blob URL on unmount
useEffect(() => {
  return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
}, [blobUrl]);

// Render:
{blobUrl ? (
  <iframe
    src={blobUrl}
    sandbox="allow-scripts allow-same-origin"
    className={cn("h-full border-0", deviceSize === "mobile" ? "w-[375px] mx-auto" : "w-full")}
  />
) : (
  // Loading/generating/error states
)}
```

**Why blob URL instead of srcdoc:**
- `srcdoc` + `allow-same-origin` = iframe shares parent origin (sandbox neutralized)
- Blob URL gives iframe its own unique origin (`blob:...`), so `allow-same-origin` is safe
- Web Speech API (`speechSynthesis`) requires `allow-same-origin` to function
- This resolves the sandbox vs TTS conflict

**Remove:**
- `use-webcontainer.ts` hook
- `webcontainer-files.ts` template (hooks/ version)
- `webcontainer-files.ts` (lib/ version — duplicate)
- `webcontainer.ts` (hooks/ and lib/ versions)
- `use-postmessage-bridge.ts` (no longer needed)
- WebContainer boot sequence / "Starting environment..." state
- `allow="microphone"` attribute (STT removed — only TTS via speechSynthesis)

**Keep:**
- Device size toggle (mobile 375px / desktop full)
- Streaming token display during generation
- Error/failed state rendering

### 4. Builder Page Changes (`src/features/builder/components/builder-page.tsx`)

This is the largest change — it orchestrates WebContainer today and must be fully rewired.

**Remove:**
- `useWebContainer()` hook call and all references (`wcStatus`, `previewUrl`, `writeFile`, `wcError`, `reloadPreview`)
- WebContainer status passed to `BuilderToolbar` and `PreviewPanel` as `wcStatus` prop
- `onFileComplete: writeFile` callback (no longer writes to WebContainer)
- Session resume logic that calls `writeFile` to populate WebContainer
- AAC template loading via `writeFile`
- Placeholder app write via `writeFile`
- `reloadPreview()` call on generation complete

**Add:**
- `bundleHtml` state: `useState<string | null>(null)`
- SSE `bundle` event handler: sets `bundleHtml` when received
- Pass `bundleHtml` to new `PreviewPanel` props
- `file_complete` events become progress indicators only (update activity log)

### 5. Builder Toolbar Changes (`src/features/builder/components/builder-toolbar.tsx`)

- Remove `WebContainerStatus` import from `use-webcontainer.ts`
- Remove `wcStatus` prop
- Replace WebContainer status indicators with generation/bundling status

### 6. Streaming Hook Changes (`src/features/builder/hooks/use-streaming.ts`)

- `onFileComplete` callback changes from "write to WebContainer" to "progress indicator only"
- Add `onBundle` callback to handle the `bundle` SSE event
- Parse new `bundle` event type: `{ html: string }`
- `file_complete` events still fire for progress UI but don't trigger writes

### 7. Agent Prompt Updates (`src/features/builder/lib/agent-prompt.ts`)

**ROLE_AND_RUNTIME segment — full replacement:**

Replace "WebContainer sandbox" + "React 19" + "Tailwind CSS v4" with:
```
You are writing code that runs in a Vite + React 18 + TypeScript project:
- **Package manager:** pnpm (pre-installed packages listed below)
- **Bundler:** Vite with React plugin
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS v3.4 with shadcn/ui HSL theming (CSS variables in index.css)
- **Component library:** 40+ shadcn/ui components pre-installed
- All data must be local (useState, useLocalStorage, hardcoded arrays)
- The app will be bundled into a single self-contained HTML file
```

Remove "NO native binaries" and "NO external network calls" constraints (code runs in browser after bundling).

**Import paths (WAB style):**
```tsx
// shadcn components — individual imports
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
// ... 40+ components available

// Therapy components
import { TokenBoard } from "@/components/TokenBoard";
import { SentenceStrip } from "@/components/SentenceStrip";
import { CommunicationBoard } from "@/components/CommunicationBoard";

// Hooks
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTTS } from "@/hooks/useTTS";

// Utils
import { cn } from "@/lib/utils";
```

**Tailwind theming (v3 HSL):**
```tsx
// Use semantic tokens instead of CSS custom properties:
className="bg-primary text-primary-foreground"    // not bg-[var(--color-primary)]
className="bg-background text-foreground"          // not bg-[var(--color-surface)]
className="bg-card shadow-lg rounded-2xl"          // not bg-[var(--color-surface-raised)]
className="bg-muted text-muted-foreground"         // not bg-[var(--color-text-muted)]
```

**Key prompt changes:**
- Reference Tailwind v3 syntax (not v4 `@theme`)
- Reference `@/` path aliases (not `./` relative)
- Expand component reference from 8 to 40+ shadcn components
- Update ROLE_AND_RUNTIME to say React 18 + Tailwind v3 (not React 19 + v4)
- Claude knows Tailwind v3 + shadcn HSL extremely well from training data (quality boost)

### 8. Design Review Prompt Updates (`src/features/builder/lib/review-prompt.ts`)

Update CSS class references from therapy-ui.css classes to shadcn semantic tokens:
- `.btn-primary` → `Button` component with variant
- `.card-interactive` → `Card` + hover classes
- `.tool-title` → heading with `font-[Nunito]` classes
- `.tool-instruction` → `text-muted-foreground`
- `.tool-label` → `Label` component

Update import path references from `"./ui"` to `"@/components/ui/*"`.

### 9. Few-Shot Examples (`src/features/builder/lib/few-shot-examples.ts`)

Update all import paths in examples:
```tsx
// Before:
import { Button } from "./ui";
import { TokenBoard } from "./components";
import { cn } from "./lib/utils";

// After:
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TokenBoard } from "@/components/TokenBoard";
import { cn } from "@/lib/utils";
```

### 10. TTS Strategy

Use browser-native Web Speech API (`window.speechSynthesis`) in the scaffold's `useTTS` hook:
```tsx
// src/hooks/useTTS.ts in scaffold
export function useTTS() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, speaking };
}
```

This is:
- Free (no API keys)
- Works offline
- Self-contained in the bundle
- Requires `allow-same-origin` in iframe sandbox (solved by blob URL approach in Section 3)

## Files Changed

| File | Action |
|------|--------|
| `artifacts/wab-scaffold/` | **New** — pre-scaffolded WAB project with therapy components |
| `scripts/setup-wab-scaffold.sh` | **New** — one-time scaffold setup script |
| `src/app/api/generate/route.ts` | **Modify** — disk writes + async Parcel build, dual-write to Map + disk |
| `src/features/builder/lib/agent-prompt.ts` | **Modify** — WAB imports, Tailwind v3, 40+ components, React 18 runtime |
| `src/features/builder/lib/agent-tools.ts` | **Modify** — write to disk + Map instead of Map only |
| `src/features/builder/lib/few-shot-examples.ts` | **Modify** — `@/` import paths |
| `src/features/builder/lib/review-prompt.ts` | **Modify** — update CSS class refs to shadcn tokens |
| `src/features/builder/components/preview-panel.tsx` | **Modify** — blob URL iframe instead of WebContainer |
| `src/features/builder/components/builder-page.tsx` | **Modify** — remove useWebContainer, add bundleHtml state, rewire streaming |
| `src/features/builder/components/builder-toolbar.tsx` | **Modify** — remove wcStatus prop/type |
| `src/features/builder/hooks/use-streaming.ts` | **Modify** — handle bundle SSE event, file_complete becomes progress-only |
| `src/features/builder/hooks/use-webcontainer.ts` | **Remove** |
| `src/features/builder/hooks/webcontainer-files.ts` | **Remove** |
| `src/features/builder/hooks/use-postmessage-bridge.ts` | **Remove** |
| `src/features/builder/hooks/webcontainer.ts` | **Remove** |
| `src/features/builder/lib/webcontainer-files.ts` | **Remove** (duplicate in lib/) |
| Tests: `use-webcontainer.test.ts`, `builder-page.test.tsx`, `preview-panel.test.tsx`, `agent-tools.test.ts` | **Modify** — update for new architecture |
| Tests: `use-postmessage-bridge.test.ts`, `webcontainer.test.ts` | **Remove** |

## Constraints

- **Local-only**: Requires disk access + Node.js + pnpm for Parcel builds. Will not work on Vercel serverless.
- **pnpm required**: WAB scaffold uses pnpm. Must be installed on the dev machine.
- **Build time**: Parcel bundle adds ~5-10s after Claude finishes generating (async, does not block event loop).
- **No live preview**: User sees generating status until bundle completes, then the full app appears at once.
- **Scaffold size**: node_modules in scaffold may be large (~200-400MB). Git-ignored; recreated via `scripts/setup-wab-scaffold.sh`.

## What We Keep

- Claude tool loop (write_file, read_file, list_files, set_app_name)
- SSE streaming of tokens during generation
- Design review pass (Pass 2)
- Device size toggle (mobile/desktop)
- Convex file persistence (via collectedFiles Map)
- Session state machine

## What We Remove

- WebContainer boot/runtime
- PostMessage TTS/STT bridge
- String-template shadcn components (replaced by real installed components)
- `@webcontainer/api` dependency
- STT (speech-to-text) — only TTS (text-to-speech) via Web Speech API
