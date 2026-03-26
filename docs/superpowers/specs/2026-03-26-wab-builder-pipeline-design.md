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
  2. Claude generates files via tool calls → writes to disk
  3. Design review pass (Claude polishes)
  4. bash bundle-artifact.sh → bundle.html
  5. Stream bundle.html contents as SSE "bundle" event
  6. Client renders in iframe via srcdoc
  7. Cleanup temp dir
```

## Components

### 1. Pre-scaffolded WAB Template (`artifacts/wab-scaffold/`)

One-time setup using `init-artifact.sh` from the WAB skill:
- React 18 + TypeScript + Vite
- Tailwind CSS 3.4 with shadcn HSL theming system
- 40+ real shadcn/ui components (pre-installed via tarball)
- All Radix UI dependencies included
- Parcel configured for bundling (via .parcelrc)
- Lucide icons, motion (framer-motion), CVA, clsx, tailwind-merge

**Additions to scaffold:**
- Therapy components ported from current `webcontainer-files.ts`:
  - TokenBoard, VisualSchedule, CommunicationBoard, DataTracker
  - CelebrationOverlay, ChoiceGrid, TimerBar, PromptCard
  - TapCard, SentenceStrip, BoardGrid, PageViewer, etc.
- Therapy hooks: useLocalStorage, useAnimation, useDataCollection
- TTS via Web Speech API (browser-native `speechSynthesis`, no API keys)
- Therapy-ui.css design tokens (colors, fonts, spacing)
- Google Fonts (Nunito, Inter) in index.html

**Stored with node_modules** for fast copy (no install step per request).

### 2. API Route Changes (`src/app/api/generate/route.ts`)

**Before generation:**
```typescript
import { execSync } from "child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Copy scaffold to temp dir
const buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
cpSync("artifacts/wab-scaffold", buildDir, { recursive: true });
```

**Tool changes:**
- `write_file`: writes to `buildDir` instead of `collectedFiles` Map
- `read_file`: reads from `buildDir` instead of template strings
- `list_files`: lists from `buildDir` filesystem
- `set_app_name`: same as current

**After generation + review pass:**
```typescript
// Bundle with Parcel
execSync("bash scripts/bundle-artifact.sh", { cwd: buildDir, timeout: 30000 });
const bundleHtml = readFileSync(join(buildDir, "bundle.html"), "utf-8");

// Stream to client
send("bundle", { html: bundleHtml });

// Cleanup
rmSync(buildDir, { recursive: true, force: true });
```

**SSE events (updated):**
- `session` — sessionId
- `status` — generating | bundling | live | failed
- `activity` — thinking messages
- `token` — streaming Claude tokens
- `file_complete` — individual file written (for progress UI)
- `bundle` — final bundle.html contents
- `done` — completion with sessionId

### 3. Preview Panel (`src/features/builder/components/preview-panel.tsx`)

Replace WebContainer iframe with srcdoc-based rendering:

```tsx
interface PreviewPanelProps {
  bundleHtml: string | null;
  state: StreamingStatus;
  error?: string;
  deviceSize?: DeviceSize;
}

// Render:
{bundleHtml ? (
  <iframe
    srcdoc={bundleHtml}
    sandbox="allow-scripts"
    allow="microphone"
    className={cn("h-full border-0", deviceSize === "mobile" ? "w-[375px] mx-auto" : "w-full")}
  />
) : (
  // Loading/generating/error states
)}
```

**Remove:**
- `use-webcontainer.ts` hook
- `webcontainer-files.ts` template
- `use-postmessage-bridge.ts` (no longer needed)
- WebContainer boot sequence / "Starting environment..." state

**Keep:**
- Device size toggle (mobile 375px / desktop full)
- Streaming token display during generation
- Error/failed state rendering

### 4. Agent Prompt Updates (`src/features/builder/lib/agent-prompt.ts`)

**Import paths (WAB style):**
```tsx
// shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
// ... 40+ components available

// Therapy components
import { TokenBoard } from "@/components/TokenBoard";
import { SentenceStrip } from "@/components/SentenceStrip";

// Hooks
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Utils
import { cn } from "@/lib/utils";
```

**Tailwind theming (v3 HSL):**
```tsx
// Use semantic tokens instead of CSS custom properties:
className="bg-primary text-primary-foreground"    // not bg-[var(--color-primary)]
className="bg-background text-foreground"          // not bg-[var(--color-surface)]
className="bg-card shadow-lg rounded-2xl"          // not bg-[var(--color-surface-raised)]
```

**Key prompt changes:**
- Reference Tailwind v3 syntax (not v4 `@theme`)
- Reference `@/` path aliases (not `./` relative)
- Expand component reference from 8 to 40+ shadcn components
- Claude knows Tailwind v3 + shadcn HSL extremely well from training data (quality boost)

### 5. Few-Shot Examples (`src/features/builder/lib/few-shot-examples.ts`)

Update all import paths in examples:
```tsx
// Before:
import { Button } from "./ui";
import { TokenBoard } from "./components";
import { cn } from "./lib/utils";

// After:
import { Button } from "@/components/ui/button";
import { TokenBoard } from "@/components/TokenBoard";
import { cn } from "@/lib/utils";
```

### 6. TTS Strategy

Use browser-native Web Speech API (`window.speechSynthesis`):
```tsx
function speak(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}
```

This is:
- Free (no API keys)
- Works offline
- Self-contained in the bundle
- Sufficient for demo purposes

Replace the current `useTTS` hook (PostMessage bridge to ElevenLabs) with a Web Speech API version in the scaffold.

## Files Changed

| File | Action |
|------|--------|
| `artifacts/wab-scaffold/` | **New** — pre-scaffolded WAB project with therapy components |
| `src/app/api/generate/route.ts` | **Modify** — disk writes + Parcel build instead of in-memory Map |
| `src/features/builder/lib/agent-prompt.ts` | **Modify** — WAB imports, Tailwind v3, 40+ components |
| `src/features/builder/lib/agent-tools.ts` | **Modify** — write to disk instead of Map |
| `src/features/builder/lib/few-shot-examples.ts` | **Modify** — `@/` import paths |
| `src/features/builder/components/preview-panel.tsx` | **Modify** — srcdoc iframe instead of WebContainer |
| `src/features/builder/hooks/use-webcontainer.ts` | **Remove** |
| `src/features/builder/hooks/webcontainer-files.ts` | **Remove** |
| `src/features/builder/hooks/use-postmessage-bridge.ts` | **Remove** |
| `src/features/builder/hooks/webcontainer.ts` | **Remove** |

## Constraints

- **Local-only**: Requires disk access + Node.js for Parcel builds. Will not work on Vercel serverless.
- **Build time**: Parcel bundle adds ~5-10s after Claude finishes generating.
- **No live preview**: User sees generating status until bundle completes, then the full app appears at once.
- **Scaffold size**: node_modules in scaffold may be large (~200-400MB). Needs to be git-ignored with a setup script to recreate.

## What We Keep

- Claude tool loop (write_file, read_file, list_files, set_app_name)
- SSE streaming of tokens during generation
- Design review pass (Pass 2)
- Device size toggle (mobile/desktop)
- Convex file persistence
- Session state machine

## What We Remove

- WebContainer boot/runtime
- PostMessage TTS/STT bridge
- String-template shadcn components (replaced by real installed components)
- `@webcontainer/api` dependency
