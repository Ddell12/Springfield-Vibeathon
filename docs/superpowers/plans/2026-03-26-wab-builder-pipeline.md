# WAB Builder Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace WebContainer with a server-side Web Artifacts Builder pipeline that produces production-quality bundled HTML apps via Parcel.

**Architecture:** Claude generates files via tool calls into a pre-scaffolded Vite+React+shadcn project on disk. After generation, Parcel bundles everything into a single `bundle.html` served in an iframe via blob URL. The scaffold includes 40+ real shadcn/ui components and therapy-specific components.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 3.4, shadcn/ui (40+ components), Parcel (bundling), html-inline, Web Speech API (TTS)

**Spec:** `docs/superpowers/specs/2026-03-26-wab-builder-pipeline-design.md`

**Prerequisite:** The WAB skill must be installed. Verify: `ls $HOME/.claude/plugins/marketplaces/anthropic-agent-skills/skills/web-artifacts-builder/scripts/init-artifact.sh`. If missing, install via Claude Code skill marketplace.

---

## Task 1: Create WAB Scaffold Setup Script

**Files:**
- Create: `scripts/setup-wab-scaffold.sh`
- Modify: `.gitignore`

This task creates the one-time scaffold. All subsequent tasks depend on this.

- [ ] **Step 1: Add artifacts directory to .gitignore**

Append to `.gitignore`:
```
# WAB scaffold (recreate via scripts/setup-wab-scaffold.sh)
artifacts/wab-scaffold/node_modules/
artifacts/wab-scaffold/.parcel-cache/
artifacts/wab-scaffold/dist/
artifacts/wab-scaffold/bundle.html
```

- [ ] **Step 2: Write the scaffold setup script**

Create `scripts/setup-wab-scaffold.sh`:
```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WAB_SKILL_DIR="$HOME/.claude/plugins/marketplaces/anthropic-agent-skills/skills/web-artifacts-builder"
SCAFFOLD_DIR="$PROJECT_ROOT/artifacts/wab-scaffold"

WAB_INIT="$WAB_SKILL_DIR/scripts/init-artifact.sh"
if [ ! -f "$WAB_INIT" ]; then
  echo "❌ WAB skill not found at $WAB_SKILL_DIR"
  echo "   Install it via Claude Code skill marketplace first."
  exit 1
fi

echo "🏗️  Setting up WAB scaffold..."

# Clean existing scaffold
rm -rf "$SCAFFOLD_DIR"
mkdir -p "$PROJECT_ROOT/artifacts"

# Run WAB init-artifact.sh
cd "$PROJECT_ROOT/artifacts"
bash "$WAB_SKILL_DIR/scripts/init-artifact.sh" wab-scaffold

# Pre-install Parcel bundling deps (so bundle step doesn't install per-request)
cd "$SCAFFOLD_DIR"
pnpm add -D parcel @parcel/config-default parcel-resolver-tspaths html-inline

# Create .parcelrc
cat > .parcelrc << 'PARCELRC'
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-tspaths", "..."]
}
PARCELRC

# Install motion (framer-motion) for therapy animations
pnpm add motion

echo "✅ WAB scaffold ready at artifacts/wab-scaffold/"
echo "   Next: run Task 2 to add therapy components"
```

- [ ] **Step 3: Run the scaffold setup**

Run: `bash scripts/setup-wab-scaffold.sh`
Expected: `artifacts/wab-scaffold/` created with node_modules, 40+ shadcn components, Parcel pre-installed.

- [ ] **Step 4: Verify scaffold works**

Run:
```bash
cd artifacts/wab-scaffold && pnpm exec parcel build index.html --dist-dir dist --no-source-maps && pnpm exec html-inline dist/index.html > bundle.html && echo "SUCCESS: $(du -h bundle.html | cut -f1)"
```
Expected: `bundle.html` created, SUCCESS with file size.

- [ ] **Step 5: Commit**

```bash
git add scripts/setup-wab-scaffold.sh .gitignore
git commit -m "feat: add WAB scaffold setup script"
```

---

## Task 2: Add Therapy Components to Scaffold

**Files:**
- Create: `artifacts/wab-scaffold/src/components/TokenBoard.tsx`
- Create: `artifacts/wab-scaffold/src/components/CommunicationBoard.tsx`
- Create: `artifacts/wab-scaffold/src/components/SentenceStrip.tsx`
- Create: `artifacts/wab-scaffold/src/components/CelebrationOverlay.tsx`
- Create: `artifacts/wab-scaffold/src/components/VisualSchedule.tsx`
- Create: `artifacts/wab-scaffold/src/components/TapCard.tsx`
- Create: `artifacts/wab-scaffold/src/components/BoardGrid.tsx`
- Create: `artifacts/wab-scaffold/src/components/DataTracker.tsx`
- Create: `artifacts/wab-scaffold/src/components/ChoiceGrid.tsx`
- Create: `artifacts/wab-scaffold/src/components/TimerBar.tsx`
- Create: `artifacts/wab-scaffold/src/components/PromptCard.tsx`
- Create: `artifacts/wab-scaffold/src/components/PageViewer.tsx`
- Create: `artifacts/wab-scaffold/src/components/TherapyCard.tsx`
- Create: `artifacts/wab-scaffold/src/components/SocialStory.tsx`
- Create: `artifacts/wab-scaffold/src/components/RewardPicker.tsx`
- Create: `artifacts/wab-scaffold/src/components/TokenSlot.tsx`
- Create: `artifacts/wab-scaffold/src/components/StepItem.tsx`
- Create: `artifacts/wab-scaffold/src/hooks/useLocalStorage.ts`
- Create: `artifacts/wab-scaffold/src/hooks/useTTS.ts`
- Create: `artifacts/wab-scaffold/src/hooks/useAnimation.ts`
- Create: `artifacts/wab-scaffold/src/hooks/useDataCollection.ts`

Port therapy components from the string templates in `src/features/builder/hooks/webcontainer-files.ts` into real `.tsx` files in the scaffold. Key changes during porting:

1. **Import paths:** Change `from "./ui"` barrel imports to individual `from "@/components/ui/button"` imports
2. **Tailwind classes:** Change `var(--color-primary)` CSS custom properties to shadcn semantic tokens (`bg-primary`, `text-primary-foreground`, etc.)
3. **TTS hook:** Replace PostMessage bridge with Web Speech API

- [ ] **Step 1: Extract component source strings from webcontainer-files.ts**

Read `src/features/builder/hooks/webcontainer-files.ts` and extract the string contents of each therapy component. These are stored as `contents:` string literals in the `FileSystemTree`.

- [ ] **Step 2: Port each therapy component**

For each component, create a real `.tsx` file at `artifacts/wab-scaffold/src/components/[Name].tsx`. During porting:
- Convert `from "./ui"` → individual `from "@/components/ui/[component]"` imports
- Convert CSS custom property classes → shadcn semantic tokens where applicable
- Keep `cn()` import as `from "@/lib/utils"`
- Keep `motion` import as `from "motion/react"`
- Keep `lucide-react` imports unchanged

- [ ] **Step 3: Create the Web Speech API TTS hook**

Create `artifacts/wab-scaffold/src/hooks/useTTS.ts`:
```tsx
import { useState, useCallback } from "react";

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, speaking };
}
```

- [ ] **Step 4: Port remaining hooks (useLocalStorage, useAnimation, useDataCollection)**

Extract from `webcontainer-files.ts` string templates, convert imports to `@/` paths, save as real files in `artifacts/wab-scaffold/src/hooks/`.

- [ ] **Step 5: Add therapy design tokens to index.css**

Append therapy-specific CSS variables to `artifacts/wab-scaffold/src/index.css` (inside the existing `:root` block or as additional custom properties):
```css
:root {
  /* Therapy design tokens (in addition to shadcn defaults) */
  --color-celebration: 45 93% 47%;
  --color-success: 122 39% 49%;
}
```

Also add Google Fonts (Nunito, Inter) to `artifacts/wab-scaffold/index.html` if not already present.

- [ ] **Step 6: Verify scaffold still builds**

Run:
```bash
cd artifacts/wab-scaffold && pnpm exec parcel build index.html --dist-dir dist --no-source-maps && echo "BUILD OK"
```
Expected: `BUILD OK` — no import errors.

- [ ] **Step 7: Commit**

```bash
git add artifacts/wab-scaffold/src/components/ artifacts/wab-scaffold/src/hooks/ artifacts/wab-scaffold/src/index.css artifacts/wab-scaffold/index.html
git commit -m "feat: add therapy components and hooks to WAB scaffold"
```

---

## Task 3: Add SSE Bundle Event Type

**Files:**
- Modify: `src/features/builder/lib/sse-events.ts`
- Modify: `src/features/builder/lib/__tests__/sse-events.test.ts`

Small, isolated change — add the new `bundle` and `bundling` status to the SSE type system.

- [ ] **Step 1: Write failing test for bundle event parsing**

Add to `src/features/builder/lib/__tests__/sse-events.test.ts`:
```typescript
it("parses bundle event", () => {
  const result = parseSSEEvent("bundle", { html: "<html>test</html>" });
  expect(result).toEqual({ event: "bundle", html: "<html>test</html>" });
});

it("parses bundling status", () => {
  const result = parseSSEEvent("status", { status: "bundling" });
  expect(result).toEqual({ event: "status", status: "bundling" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/builder/lib/__tests__/sse-events.test.ts --reporter=verbose`
Expected: FAIL — bundle event returns null, bundling not in status union.

- [ ] **Step 3: Add bundle event to SSEEvent type and parser**

Modify `src/features/builder/lib/sse-events.ts`:

Add to the `SSEEvent` union (after the `done` line):
```typescript
  | { event: "bundle"; html: string }
```

Add `"bundling"` to the status union:
```typescript
  | { event: "status"; status: "generating" | "bundling" | "live" | "failed"; message?: string }
```

Add case to `parseSSEEvent` switch (before `default`):
```typescript
    case "bundle":
      return { event: "bundle", html: String(d.html ?? "") };
```

Update the `status` case to include `"bundling"`:
```typescript
    case "status":
      return { event: "status", status: d.status as "generating" | "bundling" | "live" | "failed", message: d.message as string | undefined };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/builder/lib/__tests__/sse-events.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/sse-events.ts src/features/builder/lib/__tests__/sse-events.test.ts
git commit -m "feat: add bundle SSE event type and bundling status"
```

---

## Task 4: Update Agent Prompt for WAB

**Files:**
- Modify: `src/features/builder/lib/agent-prompt.ts`
- Modify: `src/features/builder/lib/few-shot-examples.ts`
- Modify: `src/features/builder/lib/review-prompt.ts`
- Modify: `src/features/builder/lib/__tests__/agent-prompt.test.ts`
- Modify: `src/features/builder/lib/__tests__/few-shot-examples.test.ts`
- Modify: `src/features/builder/lib/__tests__/review-prompt.test.ts`

Update all LLM prompts to target WAB's project structure (React 18, Tailwind v3 HSL, `@/` imports, 40+ shadcn components).

- [ ] **Step 1: Update ROLE_AND_RUNTIME segment in agent-prompt.ts**

In `src/features/builder/lib/agent-prompt.ts`, replace the `ROLE_AND_RUNTIME` const (line 9-26). Change:
- "WebContainer sandbox" → "Vite + React 18 + TypeScript project"
- "React 19" → "React 18"
- "Tailwind CSS v4 (configured via @theme in CSS, no tailwind.config.js)" → "Tailwind CSS v3.4 with shadcn/ui HSL theming (tailwind.config.js + CSS variables in index.css)"
- Remove "NO native binaries" and "NO external network calls" constraints
- Keep "All data must be local" constraint

- [ ] **Step 2: Update DESIGN_SYSTEM_RULES segment**

Replace CSS custom property references with shadcn semantic tokens:
- `--color-primary: #00595c` → `bg-primary / text-primary-foreground (HSL vars in index.css)`
- `bg-[var(--color-primary)]` → `bg-primary`
- `bg-[var(--color-primary-bg)]` → `bg-primary/10` or `bg-muted`
- `text-[var(--color-text)]` → `text-foreground`
- `text-[var(--color-text-muted)]` → `text-muted-foreground`
- `bg-[var(--color-surface)]` → `bg-background`
- `bg-[var(--color-surface-raised)]` → `bg-card`

- [ ] **Step 3: Update VISUAL_QUALITY_BAR segment**

Replace all CSS custom property class examples with shadcn equivalents. E.g.:
- `bg-gradient-to-b from-[var(--color-primary-bg)] to-white` → `bg-gradient-to-b from-primary/5 to-background`
- `ring-2 ring-[var(--color-primary)]` → `ring-2 ring-primary`

- [ ] **Step 4: Update COMPONENT_REFERENCE segment**

Replace the component reference section with WAB-style `@/` imports:
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// ... list all 40+ available shadcn components
import { TokenBoard } from "@/components/TokenBoard";
// ... list all therapy components
import { cn } from "@/lib/utils";
```

Update the composition recipes to use `@/` imports.
Update hooks reference to use `@/hooks/...` imports.
Remove the "Pre-Built CSS Classes" section (therapy-ui.css classes replaced by shadcn tokens).

- [ ] **Step 5: Update TOOLS_AND_WORKFLOW segment**

Update the import rules section:
```
- shadcn UI primitives: from "@/components/ui/[component]" (individual imports)
- Pre-built therapy components: from "@/components/[Name]" (individual imports)
- Pre-built hooks: from "@/hooks/useLocalStorage" etc.
- Your custom files: from "./types", from "./data", from "./components/Header"
- React: from "react"
- Icons: from "lucide-react"
- Animation: from "motion/react"
- Utility: from "@/lib/utils"
```

Update the file rules:
- Remove "Do NOT overwrite pre-built files: src/components/*, src/hooks/*, src/lib/utils.ts, src/ui/*"
- Add: "Do NOT overwrite pre-built files: src/components/ui/*, src/components/TokenBoard.tsx, src/components/SentenceStrip.tsx (and other therapy components), src/hooks/*, src/lib/utils.ts"

- [ ] **Step 6: Update few-shot-examples.ts**

In `src/features/builder/lib/few-shot-examples.ts`, update all import paths in both examples:
- `from "./ui"` → individual `from "@/components/ui/button"`, `from "@/components/ui/card"`, etc.
- `from "./components"` → individual `from "@/components/TokenBoard"`, `from "@/components/BoardGrid"`, etc.
- `from "./lib/utils"` → `from "@/lib/utils"`
- `from "./hooks/useLocalStorage"` → `from "@/hooks/useLocalStorage"`
- CSS custom property classes → shadcn semantic tokens

- [ ] **Step 7: Update review-prompt.ts**

In `src/features/builder/lib/review-prompt.ts`, update the `DESIGN_REVIEW_PROMPT` string:
- `.btn-primary` / `.btn-secondary` → "Button component from @/components/ui/button with variant"
- `.card-interactive` → "Card from @/components/ui/card with hover classes"
- `.tool-title` → "heading with font-[Nunito] and text-foreground"
- `.tool-instruction` → "text-muted-foreground"
- `.tool-label` → "Label from @/components/ui/label"
- `--color-surface`, `--color-primary-bg` → `bg-background`, `bg-primary/10`

- [ ] **Step 8: Update tests**

Update `agent-prompt.test.ts`, `few-shot-examples.test.ts`, `review-prompt.test.ts` to match new import paths and class references. Tests should verify:
- Prompt contains `@/components/ui/` import paths
- Prompt does NOT contain `from "./ui"` barrel imports
- Prompt references React 18 (not 19)
- Prompt references Tailwind v3 (not v4)

- [ ] **Step 9: Run tests**

Run: `npx vitest run src/features/builder/lib/__tests__/ --reporter=verbose`
Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/features/builder/lib/agent-prompt.ts src/features/builder/lib/few-shot-examples.ts src/features/builder/lib/review-prompt.ts src/features/builder/lib/__tests__/
git commit -m "feat: update agent prompts for WAB (React 18, Tailwind v3, @/ imports)"
```

---

## Task 5: Modify Agent Tools for Disk Writes

**Files:**
- Modify: `src/features/builder/lib/agent-tools.ts`
- Modify: `src/features/builder/lib/__tests__/agent-tools.test.ts`

Change tool implementations from in-memory Map + WebContainer template reads to disk I/O + Map dual-write.

- [ ] **Step 1: Write failing tests for disk-based tools**

Add tests to `src/features/builder/lib/__tests__/agent-tools.test.ts`:
```typescript
import { mkdtempSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("createAgentTools (disk mode)", () => {
  it("write_file writes to disk and collectedFiles Map", async () => {
    const buildDir = mkdtempSync(join(tmpdir(), "test-build-"));
    const collectedFiles = new Map<string, string>();
    const tools = createAgentTools({
      send: vi.fn(),
      sessionId: "test-session",
      collectedFiles,
      convex: {} as any,
      buildDir,
    });
    const writeTool = tools.find(t => t.name === "write_file")!;
    // Execute write_file
    await writeTool.execute({ path: "src/App.tsx", contents: "export default function App() { return <div>hi</div> }" });
    // Verify disk write
    expect(readFileSync(join(buildDir, "src/App.tsx"), "utf-8")).toContain("hi");
    // Verify Map write
    expect(collectedFiles.get("src/App.tsx")).toContain("hi");
  });

  it("read_file reads from disk", async () => {
    // ... test that read_file reads from buildDir filesystem
  });

  it("list_files lists from disk", async () => {
    // ... test that list_files reads buildDir directory
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/lib/__tests__/agent-tools.test.ts --reporter=verbose`
Expected: FAIL — `buildDir` not in ToolContext type.

- [ ] **Step 3: Update ToolContext and tool implementations**

Modify `src/features/builder/lib/agent-tools.ts`:

Add `buildDir` to the context interface:
```typescript
interface ToolContext {
  send: (eventType: string, data: object) => void;
  sessionId: string;
  collectedFiles: Map<string, string>;
  convex: ConvexHttpClient;
  buildDir: string; // NEW: path to temp WAB scaffold copy
}
```

Update `write_file` tool execute:
```typescript
// Dual write: disk (for Parcel build) + Map (for Convex persistence & review)
const fullPath = join(ctx.buildDir, path);
mkdirSync(dirname(fullPath), { recursive: true });
writeFileSync(fullPath, contents, "utf-8");
ctx.collectedFiles.set(path, contents);
```

Update `read_file` tool execute:
```typescript
// Read from disk (buildDir) — includes both scaffold files and generated files
const fullPath = join(ctx.buildDir, path);
if (!existsSync(fullPath)) throw new ToolError(`File not found: ${path}`);
return readFileSync(fullPath, "utf-8");
```

Update `list_files` tool execute:
```typescript
// List from disk (buildDir filesystem)
const fullPath = join(ctx.buildDir, directory);
if (!existsSync(fullPath)) return "Directory not found";
const entries = readdirSync(fullPath, { withFileTypes: true });
return entries.map(e => e.isDirectory() ? `${e.name}/` : e.name).join("\n");
```

Remove these imports and functions (no longer needed — disk reads replace template string lookups):
- Remove `import { templateFiles } from "../hooks/webcontainer-files"` (line 8)
- Delete the `getTemplateFileContents()` function entirely
- Delete the `getTemplateDirectoryListing()` function entirely
- Remove their exports

Also update `file_complete` SSE event to send path only (no contents — it's just a progress indicator now):
```typescript
ctx.send("file_complete", { path }); // was: { path, contents }
```

Add imports at top:
```typescript
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
```

- [ ] **Step 4: Add path traversal guard and scaffold file protection**

Add to `write_file` validation (before the write):
```typescript
import { resolve } from "path";

// Path traversal guard — prevent escaping buildDir
const resolved = resolve(fullPath);
if (!resolved.startsWith(resolve(ctx.buildDir))) {
  throw new ToolError(`Path traversal blocked: ${path}`);
}

// Protect pre-installed scaffold files from being overwritten
const PROTECTED_PATHS = [
  "src/components/ui/",          // All shadcn components
  "src/lib/utils.ts",            // cn() utility
  // Specific therapy components (not all of src/components/)
  "src/components/TokenBoard.tsx",
  "src/components/CommunicationBoard.tsx",
  "src/components/SentenceStrip.tsx",
  "src/components/CelebrationOverlay.tsx",
  "src/components/VisualSchedule.tsx",
  "src/components/TapCard.tsx",
  "src/components/BoardGrid.tsx",
  "src/components/DataTracker.tsx",
  "src/components/ChoiceGrid.tsx",
  "src/components/TimerBar.tsx",
  "src/components/PromptCard.tsx",
  "src/components/PageViewer.tsx",
  "src/components/TherapyCard.tsx",
  "src/components/SocialStory.tsx",
  "src/components/RewardPicker.tsx",
  "src/components/TokenSlot.tsx",
  "src/components/StepItem.tsx",
  // Specific pre-built hooks (Claude CAN create new hooks at src/hooks/)
  "src/hooks/useLocalStorage.ts",
  "src/hooks/useTTS.ts",
  "src/hooks/useAnimation.ts",
  "src/hooks/useDataCollection.ts",
];
if (PROTECTED_PATHS.some(p => path.startsWith(p) || path === p)) {
  throw new ToolError(`Cannot overwrite scaffold file: ${path}`);
}
```

Note: `src/hooks/` is NOT fully blocked — Claude can create new custom hooks (e.g., `src/hooks/useGameState.ts`). Only specific pre-built hook files are protected.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/__tests__/agent-tools.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/lib/agent-tools.ts src/features/builder/lib/__tests__/agent-tools.test.ts
git commit -m "feat: agent tools write to disk + Map (dual-write for WAB pipeline)"
```

---

## Task 6: Modify API Route for Disk Build Pipeline

**Files:**
- Modify: `src/app/api/generate/route.ts`

Wire up the disk-based build pipeline: copy scaffold → Claude generates → Parcel bundle → stream HTML.

- [ ] **Step 1: Add Node.js imports and async exec helper**

Add at top of `src/app/api/generate/route.ts`:
```typescript
import { cpSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
```

- [ ] **Step 2: Add scaffold copy before Claude generation**

Inside the `start(controller)` callback, declare `buildDir` with `let` at the top of the scope (so `finally` can access it), then copy:
```typescript
let buildDir: string | undefined;

try {
  // ... existing session setup ...

  // Copy WAB scaffold to temp dir for this build
  buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
  cpSync(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });
```

- [ ] **Step 3: Pass buildDir to createAgentTools**

Update the `createAgentTools` call:
```typescript
const tools = createAgentTools({ send, sessionId, collectedFiles, convex, buildDir });
```

- [ ] **Step 4: Add Parcel build step after design review**

After the design review pass (after line ~144 in current code), before file persistence, add:
```typescript
// Bundle with Parcel
if (collectedFiles.size > 0) {
  send("status", { status: "bundling" });
  send("activity", { type: "thinking", message: "Bundling your app..." });

  try {
    await execAsync(
      "pnpm exec parcel build index.html --no-source-maps --dist-dir dist && pnpm exec html-inline dist/index.html > bundle.html",
      { cwd: buildDir, timeout: 30000 }
    );
    const bundlePath = join(buildDir, "bundle.html");
    if (!existsSync(bundlePath)) throw new Error("Parcel produced no bundle.html");
    const bundleHtml = readFileSync(bundlePath, "utf-8");
    if (bundleHtml.length < 100) throw new Error("bundle.html is suspiciously small");
    send("bundle", { html: bundleHtml });
  } catch (buildError) {
    console.error("[generate] Parcel build failed:", buildError);
    send("activity", { type: "thinking", message: "Build failed — showing raw files instead" });
    // Don't throw — still persist files and send done event
  }
}
```

- [ ] **Step 5: Add cleanup in finally block**

Update the `finally` block to clean up the temp dir (safe even if `buildDir` was never assigned):
```typescript
finally {
  if (buildDir) {
    try { rmSync(buildDir, { recursive: true, force: true }); } catch {}
  }
  controller.close();
}
```

- [ ] **Step 6: Manual test — generate an AAC app**

Run `npm run dev`, open the builder, type "build me an AAC communication board". Verify:
1. Claude generates files (tokens stream)
2. "Bundling your app..." status appears
3. `bundle` SSE event received (check Network tab)
4. No errors in server console

- [ ] **Step 7: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: API route uses WAB disk pipeline with Parcel bundling"
```

---

## Task 7: Update Streaming Hook for Bundle Event

**Files:**
- Modify: `src/features/builder/hooks/use-streaming.ts`
- Modify: `src/features/builder/hooks/__tests__/use-streaming.test.ts`

Add `onBundle` callback and `bundleHtml` state to the streaming hook.

- [ ] **Step 1: Write failing test for bundle event handling**

Add to `src/features/builder/hooks/__tests__/use-streaming.test.ts`:
```typescript
it("calls onBundle when bundle event received", () => {
  // Test that handleEvent with { event: "bundle", html: "<html>..." }
  // calls the onBundle callback and sets bundleHtml state
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-streaming.test.ts --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Add bundle handling to use-streaming.ts**

Add to `UseStreamingOptions` interface:
```typescript
export interface UseStreamingOptions {
  onFileComplete?: (path: string, contents: string) => Promise<void>;
  onBundle?: (html: string) => void; // NEW
}
```

Add to `UseStreamingReturn` interface:
```typescript
bundleHtml: string | null; // NEW
```

Add state:
```typescript
const [bundleHtml, setBundleHtml] = useState<string | null>(null);
```

Add case to `handleEvent` switch:
```typescript
case "bundle":
  setBundleHtml(ev.html);
  onBundleRef.current?.(ev.html);
  break;
```

Add `"bundling"` to status handling:
```typescript
case "status":
  if (ev.status === "bundling") {
    setStatus("generating"); // Keep showing generating state to user
  } else {
    setStatus(ev.status);
  }
  break;
```

Return `bundleHtml` from the hook.

Reset `bundleHtml` to `null` at the start of `generate()`.

- [ ] **Step 4: Remove onFileComplete WebContainer dependency**

The `onFileComplete` callback currently writes to WebContainer. After this change, it becomes optional and is only used for progress tracking. No code change needed — `builder-page.tsx` will stop passing it (Task 8).

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-streaming.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/hooks/use-streaming.ts src/features/builder/hooks/__tests__/use-streaming.test.ts
git commit -m "feat: streaming hook handles bundle SSE event"
```

---

## Task 8: Update Preview Panel (Blob URL Iframe)

**Files:**
- Modify: `src/features/builder/components/preview-panel.tsx`
- Modify: `src/features/builder/components/__tests__/preview-panel.test.tsx`

**Must come before Task 9 (builder-page)** — defines the new `PreviewPanel` props that builder-page will consume.

Replace WebContainer iframe with blob URL-based rendering.

- [ ] **Step 1: Write failing test for blob URL rendering**

Add to `preview-panel.test.tsx`:
```typescript
it("renders iframe with blob URL when bundleHtml is provided", () => {
  render(<PreviewPanel bundleHtml="<html><body>test</body></html>" state="live" />);
  const iframe = screen.getByTitle("App preview");
  expect(iframe).toHaveAttribute("src");
  expect(iframe.getAttribute("src")).toMatch(/^blob:/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/builder/components/__tests__/preview-panel.test.tsx --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Rewrite preview-panel.tsx**

Replace entire component with blob URL approach:

```tsx
"use client";

import { useMemo, useEffect } from "react";
import { Loader2, Monitor, AlertCircle } from "lucide-react";
import { cn } from "@/core/utils";
import type { StreamingStatus } from "../hooks/use-streaming";

type DeviceSize = "desktop" | "mobile";

interface PreviewPanelProps {
  bundleHtml: string | null;
  state: StreamingStatus;
  error?: string;
  deviceSize?: DeviceSize;
}

export function PreviewPanel({ bundleHtml, state, error, deviceSize = "desktop" }: PreviewPanelProps) {
  const blobUrl = useMemo(() => {
    if (!bundleHtml) return null;
    const blob = new Blob([bundleHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [bundleHtml]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const hasPreview = !!blobUrl;
  const isGenerating = state === "generating";
  const isFailed = state === "failed";

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/30">
      {hasPreview && (
        <iframe
          title="App preview"
          src={blobUrl}
          sandbox="allow-scripts allow-same-origin"
          className={cn(
            "h-full border-0 bg-white transition-all duration-300",
            deviceSize === "mobile" ? "w-[375px] rounded-2xl shadow-xl" : "w-full",
          )}
        />
      )}

      {isGenerating && !hasPreview && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Building your app...</p>
        </div>
      )}

      {isGenerating && hasPreview && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-4 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating...
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{error ?? "Something went wrong"}</p>
        </div>
      )}

      {!hasPreview && !isGenerating && !isFailed && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Monitor className="h-12 w-12 opacity-20" />
          <p className="text-sm">Your app will appear here</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Remove PostMessage bridge import**

The current preview-panel.tsx imports `usePostMessageBridge`. Remove that import and any `iframeRef` / bridge usage.

- [ ] **Step 5: Update remaining tests**

Update `preview-panel.test.tsx` to remove WebContainer status tests (`wcStatus`, `previewUrl`). Add tests for:
- Generating state shows spinner
- Failed state shows error
- Empty state shows placeholder
- Blob URL cleanup on unmount

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/preview-panel.test.tsx --reporter=verbose`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/builder/components/preview-panel.tsx src/features/builder/components/__tests__/preview-panel.test.tsx
git commit -m "feat: preview panel renders bundle HTML via blob URL iframe"
```

---

## Task 9: Rewire Builder Page (Remove WebContainer)

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`
- Modify: `src/features/builder/components/__tests__/builder-page.test.tsx`

This is the largest change. Remove all WebContainer wiring, add bundle HTML state. Depends on Task 8 (PreviewPanel now accepts `bundleHtml` prop).

- [ ] **Step 1: Remove WebContainer imports and hook call**

In `src/features/builder/components/builder-page.tsx`:

Remove line 22: `import { useWebContainer } from ...`
Remove line 23: `import { getAACTemplate } from ...`

Remove line 72 (the entire destructured hook call):
```typescript
// DELETE:
const { status: wcStatus, previewUrl, writeFile, error: wcError, reloadPreview } = useWebContainer();
```

- [ ] **Step 2: Remove onFileComplete and WebContainer-dependent callbacks**

Remove from `useStreaming` options (line 85):
```typescript
// CHANGE from:
onFileComplete: writeFile,
// TO:
// (remove entirely — no onFileComplete needed)
```

Remove the `reloadPreview()` call (line 93).

Remove session resume `writeFile` loop (around line 128):
```typescript
// DELETE the loop that calls writeFile(file.path, file.contents)
```

Remove placeholder app write (line 150):
```typescript
// DELETE: writeFile("src/App.tsx", PLACEHOLDER_APP)
```

Remove AAC template write (line 180):
```typescript
// DELETE: writeFile("src/App.tsx", getAACTemplate())
```

Note: The `?template=aac` URL param feature is removed. AAC quality now comes from Claude generating into the WAB scaffold with 40+ real components, not from a hardcoded template string.

- [ ] **Step 3: Get bundleHtml from streaming hook**

The `useStreaming` hook now returns `bundleHtml`. Destructure it:
```typescript
const { status, files, generate, bundleHtml, /* ... other fields */ } = useStreaming();
```

- [ ] **Step 4: Update PreviewPanel props**

Replace WebContainer props with bundle HTML:
```typescript
// CHANGE from:
<PreviewPanel previewUrl={previewUrl} wcStatus={wcStatus} state={status} error={wcError} />
// TO:
<PreviewPanel bundleHtml={bundleHtml} state={status} error={error} />
```

Do this for all `PreviewPanel` instances (lines ~342, ~386).

- [ ] **Step 5: Update BuilderToolbar props**

Remove `wcStatus` prop:
```typescript
// CHANGE from:
<BuilderToolbar wcStatus={wcStatus} ... />
// TO:
<BuilderToolbar ... />  // wcStatus removed
```

- [ ] **Step 6: Update tests**

Update `builder-page.test.tsx`:
- Remove mock of `useWebContainer`
- Remove tests that verify `writeFile` calls
- Add/update tests to verify `bundleHtml` is passed to `PreviewPanel`
- Remove AAC template write test
- Remove WebContainer status tests

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/builder-page.test.tsx --reporter=verbose`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/builder/components/builder-page.tsx src/features/builder/components/__tests__/builder-page.test.tsx
git commit -m "feat: builder page uses bundle HTML instead of WebContainer"
```

---

## Task 10: Update Builder Toolbar

**Files:**
- Modify: `src/features/builder/components/builder-toolbar.tsx`
- Modify: `src/features/builder/components/__tests__/builder-toolbar.test.tsx`

Remove WebContainer status dependency.

- [ ] **Step 1: Remove WebContainerStatus import and prop**

In `src/features/builder/components/builder-toolbar.tsx`:
- Remove line 10: `WebContainerStatus` import from `use-webcontainer`
- Remove `wcStatus: WebContainerStatus` from `BuilderToolbarProps` (line 21)
- Update `canPublish` logic (line 58): change from `wcStatus === "ready"` to checking `state === "live"` or similar

- [ ] **Step 2: Update tests**

Update `builder-toolbar.test.tsx` to remove `wcStatus` prop from test renders.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/builder-toolbar.test.tsx --reporter=verbose`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/builder-toolbar.tsx src/features/builder/components/__tests__/builder-toolbar.test.tsx
git commit -m "refactor: remove WebContainer status from toolbar"
```

---

## Task 11: Remove WebContainer Files

**Files:**
- Remove: `src/features/builder/hooks/use-webcontainer.ts`
- Remove: `src/features/builder/hooks/webcontainer-files.ts`
- Remove: `src/features/builder/hooks/webcontainer.ts`
- Remove: `src/features/builder/hooks/use-postmessage-bridge.ts`
- Remove: `src/features/builder/lib/webcontainer-files.ts` (re-export)
- Remove: `src/features/builder/lib/webcontainer.ts` (re-export)
- Remove: `src/features/builder/hooks/__tests__/use-webcontainer.test.ts`
- Remove: `src/features/builder/hooks/__tests__/use-postmessage-bridge.test.ts`
- Remove: `src/features/builder/lib/__tests__/webcontainer-files.test.ts`
- Remove: `src/features/builder/lib/__tests__/webcontainer.test.ts`
- Remove: `scripts/generate-wc-snapshot.ts`

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -r "use-webcontainer\|webcontainer-files\|use-postmessage-bridge\|webcontainer\.ts" src/ --include="*.ts" --include="*.tsx" -l`

Expected: No files should reference these modules (all consumers updated in Tasks 8-10). If any remain, fix them first.

- [ ] **Step 2: Delete WebContainer files**

```bash
rm src/features/builder/hooks/use-webcontainer.ts
rm src/features/builder/hooks/webcontainer-files.ts
rm src/features/builder/hooks/webcontainer.ts
rm src/features/builder/hooks/use-postmessage-bridge.ts
rm src/features/builder/lib/webcontainer-files.ts
rm src/features/builder/lib/webcontainer.ts
rm src/features/builder/hooks/__tests__/use-webcontainer.test.ts
rm src/features/builder/hooks/__tests__/use-postmessage-bridge.test.ts
rm src/features/builder/lib/__tests__/webcontainer-files.test.ts
rm src/features/builder/lib/__tests__/webcontainer.test.ts
rm scripts/generate-wc-snapshot.ts
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass. No import errors from deleted files.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove WebContainer files (replaced by WAB pipeline)"
```

---

## Task 12: End-to-End Smoke Test

**Files:** None (manual testing)

- [ ] **Step 1: Verify scaffold exists**

Run: `ls artifacts/wab-scaffold/node_modules/.package-lock.json`
Expected: File exists (scaffold is set up).

- [ ] **Step 2: Start dev server**

Run: `npm run dev`
Expected: Next.js starts without errors.

- [ ] **Step 3: Generate an AAC app**

Open builder, type: "Build me an AAC communication board for snack time with 12 food items"

Verify:
1. Tokens stream in the chat panel
2. File progress indicators show (file_complete events)
3. "Bundling your app..." status appears
4. App appears in preview iframe
5. App has real shadcn UI components (proper cards, buttons, badges)
6. TTS works when tapping words (Web Speech API)
7. App looks production-quality (gradients, shadows, animations)

- [ ] **Step 4: Test a different app type**

Type: "Build me a star reward board for morning routine with 5 tasks"

Verify: App generates, bundles, and renders correctly.

- [ ] **Step 5: Test error recovery**

Type a very short prompt: "hi"

Verify: Claude generates something (even if small), bundling completes or fails gracefully with a message.

- [ ] **Step 6: Document results**

Note any issues found during smoke testing for follow-up fixes.
