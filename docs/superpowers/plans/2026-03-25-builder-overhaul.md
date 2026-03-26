# Builder Feature Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the builder into a Lovable-style experience with real-time preview (<5s first file), persistent auto-resume sessions, Lovable-matched 3-phase UI flow, and dramatically improved generated app quality.

**Architecture:** Four independent workstreams — (1) WebContainer snapshot boot to eliminate npm install, (2) chat panel layout overhaul matching Lovable's flow, (3) Convex-backed auto-resume persistence, (4) system prompt quality improvements for richer generated apps. All changes are additive to the existing streaming builder architecture.

**Tech Stack:** Next.js App Router, Convex, WebContainer API, @webcontainer/snapshot, Anthropic SDK, Tailwind v4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-25-builder-overhaul-design.md`

---

## Task 1: Add `by_state` Index to Sessions Schema

**Files:**
- Modify: `convex/schema.ts:19` (add index)
- Modify: `convex/sessions.ts` (add `getMostRecent` query)

- [ ] **Step 1: Add the index to the sessions table**

In `convex/schema.ts`, find the sessions table definition. Line 19 reads `}).index("by_user", ["userId"]),` — change the full line to:

```typescript
  }).index("by_user", ["userId"])
    .index("by_state", ["state"]),
```

Note: The `})` closes the `defineTable({...})` call. Keep it intact.

- [ ] **Step 2: Add the `getMostRecent` query**

In `convex/sessions.ts`, add this exported query:

```typescript
export const getMostRecent = query({
  args: {},
  handler: async (ctx) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_state", (q) => q.eq("state", "live"))
      .order("desc")
      .first();
    return session;
  },
});
```

- [ ] **Step 3: Verify Convex deploys successfully**

Run: `npx convex dev` (should auto-deploy)
Expected: No errors. New index `by_state` appears in dashboard.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/sessions.ts
git commit -m "feat: add by_state index + getMostRecent query for auto-resume"
```

---

## Task 2: WebContainer Snapshot Boot (Skip npm install)

**Files:**
- Create: `scripts/generate-wc-snapshot.ts`
- Modify: `src/features/builder/hooks/use-webcontainer.ts`
- Modify: `src/features/builder/hooks/webcontainer.ts` (the singleton boot module)
- Modify: `package.json` (add devDep + script)
- Create: `.gitignore` entry for `public/wc-snapshot.bin`

- [ ] **Step 1: Install @webcontainer/snapshot**

Run: `npm install -D @webcontainer/snapshot`

- [ ] **Step 2: Create the snapshot generation script**

Create `scripts/generate-wc-snapshot.ts`:

```typescript
/**
 * Generates a WebContainer binary snapshot including node_modules.
 * Run: npx tsx scripts/generate-wc-snapshot.ts
 * Output: public/wc-snapshot.bin
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { snapshot } from "@webcontainer/snapshot";

const TEMPLATE_DIR = join(import.meta.dirname, "../.wc-template");
const OUTPUT_PATH = join(import.meta.dirname, "../public/wc-snapshot.bin");

async function main() {
  console.log("1/4 Creating temp template directory...");
  if (!existsSync(TEMPLATE_DIR)) mkdirSync(TEMPLATE_DIR, { recursive: true });

  // Write template files — import the same source of truth used at runtime
  console.log("2/4 Writing template files...");
  // We need to extract the file contents from webcontainer-files.ts
  // Since it's a TypeScript module, we'll use a simpler approach:
  // copy the package.json and key files, then npm install
  const packageJson = {
    name: "vite-therapy",
    private: true,
    type: "module",
    scripts: { dev: "vite --host 0.0.0.0", build: "vite build", preview: "vite preview" },
    dependencies: {
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "lucide-react": "^0.469.0",
      motion: "^12.0.0",
      react: "19.0.0",
      "react-dom": "19.0.0",
      "tailwind-merge": "^3.5.0",
    },
    devDependencies: {
      "@tailwindcss/vite": "^4.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "@vitejs/plugin-react": "^4.4.0",
      tailwindcss: "^4.0.0",
      typescript: "^5.7.0",
      vite: "^6.0.0",
    },
    overrides: { react: "19.0.0", "react-dom": "19.0.0" },
  };

  writeFileSync(join(TEMPLATE_DIR, "package.json"), JSON.stringify(packageJson, null, 2));

  console.log("3/4 Running npm install...");
  execSync("npm install", { cwd: TEMPLATE_DIR, stdio: "inherit" });

  console.log("4/4 Generating snapshot...");
  const snapshotBuffer = await snapshot(TEMPLATE_DIR);
  writeFileSync(OUTPUT_PATH, snapshotBuffer);

  const sizeMB = (snapshotBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`Snapshot written to ${OUTPUT_PATH} (${sizeMB} MB)`);
}

main().catch((err) => {
  console.error("Snapshot generation failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Add npm script and gitignore**

In `package.json`, add to `"scripts"`:
```json
"snapshot": "npx tsx scripts/generate-wc-snapshot.ts"
```

Add to `.gitignore`:
```
public/wc-snapshot.bin
.wc-template/
```

- [ ] **Step 4: Generate the snapshot**

Run: `npm run snapshot`
Expected: `public/wc-snapshot.bin` created, size ~20-40 MB.

- [ ] **Step 5: Update use-webcontainer.ts to mount snapshot**

Replace the boot sequence in `src/features/builder/hooks/use-webcontainer.ts`. Change the `WebContainerStatus` type on line 8:

```typescript
export type WebContainerStatus = "booting" | "ready" | "error";
```

Replace the `boot()` function (lines 33-86) with:

```typescript
async function boot() {
  try {
    const wc = await getWebContainer();
    wcRef.current = wc;

    // Register server-ready before mounting so we don't miss the event
    const off = wc.on("server-ready", (_port: number, url: string) => {
      setPreviewUrl(url);
      setStatus("ready");
    });
    unsubscribeServerReady = off;

    // Try snapshot-first boot (has node_modules, skip npm install)
    let snapshotMounted = false;
    try {
      const res = await fetch("/wc-snapshot.bin");
      if (res.ok) {
        const buf = await res.arrayBuffer();
        // mount() accepts ArrayBuffer or Uint8Array — wrap for safety
        await wc.mount(new Uint8Array(buf));
        snapshotMounted = true;
      }
    } catch {
      // Snapshot not available — fall back below
    }

    // Mount template files (index.html, vite.config, therapy-ui.css, etc.)
    // These are always needed — the snapshot only provides node_modules
    await wc.mount(templateFiles);

    if (!snapshotMounted) {
      // No snapshot — need npm install
      const installProcess = await wc.spawn("npm", ["install"]);
      const exitCode = await Promise.race([
        installProcess.exit,
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error("npm install timed out after 60s")), 60_000)
        ),
      ]);
      if (exitCode !== 0) {
        setStatus("error");
        setError("npm install failed");
        return;
      }
    }

    // Start dev server — deps are already present
    await wc.spawn("npm", ["run", "dev"]);
    // status will transition to "ready" when server-ready fires
  } catch (err) {
    setStatus("error");
    setError(extractErrorMessage(err, "WebContainer boot failed"));
  }
}
```

- [ ] **Step 6: Update all `installing` references**

In `src/features/builder/components/preview-panel.tsx` line 50, change:
```typescript
) : wcStatus === "installing" || isGenerating ? (
```
to:
```typescript
) : wcStatus === "booting" || isGenerating ? (
```

Search for any other `installing` references in `builder-toolbar.tsx` and update them similarly. If none found, no change needed.

- [ ] **Step 7: Update the test file**

In `src/features/builder/components/__tests__/preview-panel.test.tsx`, update all `wcStatus="installing"` to `wcStatus="booting"`.

- [ ] **Step 8: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass (some may need the `installing` → `booting` update).

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-wc-snapshot.ts src/features/builder/hooks/use-webcontainer.ts src/features/builder/components/preview-panel.tsx src/features/builder/components/__tests__/preview-panel.test.tsx package.json .gitignore
git commit -m "feat: WebContainer snapshot boot — skip npm install for <2s startup"
```

---

## Task 3: Chat Panel Overflow Fix + Lovable-Style Layout

**Files:**
- Modify: `src/features/builder/components/chat-panel.tsx`
- Modify: `src/features/builder/components/builder-page.tsx`

- [ ] **Step 1: Fix ScrollArea overflow — replace with native scroll**

In `chat-panel.tsx`, remove the `ScrollArea` import (line 12):
```typescript
// Remove: import { ScrollArea } from "@/shared/components/ui/scroll-area";
```

Replace line 228:
```tsx
<ScrollArea className="min-h-0 flex-1 p-4">
```
with:
```tsx
<div className="min-h-0 flex-1 overflow-y-auto p-4">
```

Replace the matching closing tag (line 333):
```tsx
</ScrollArea>
```
with:
```tsx
</div>
```

- [ ] **Step 2: Simplify auto-scroll**

Replace the auto-scroll effect (lines 207-213):

```typescript
// Auto-scroll to bottom on new content — throttled to 200ms to avoid jitter during streaming
useEffect(() => {
  const now = Date.now();
  if (now - lastScrollRef.current < 200) return;
  lastScrollRef.current = now;
  scrollEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
}, [messages, streamingText, activities, status]);
```

with:

```typescript
// Auto-scroll to bottom when new messages arrive or streaming updates
useEffect(() => {
  scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
}, [messages?.length, streamingText, activities.length]);
```

Remove the `lastScrollRef` declaration (line 196):
```typescript
// Remove: const lastScrollRef = useRef(0);
```

- [ ] **Step 3: Replace ProgressSteps with Lovable-style file badges**

Replace the `ProgressSteps` component (lines 92-169) with a simpler `FileBadges` component:

```tsx
const FileBadges = memo(function FileBadges({
  activities,
}: {
  activities: Activity[];
}) {
  const fileActivities = activities.filter((a) => a.type === "file_written");
  const [expanded, setExpanded] = useState(false);
  if (fileActivities.length === 0) return null;

  const visible = expanded ? fileActivities : fileActivities.slice(0, 3);
  const hiddenCount = fileActivities.length - 3;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((activity) => (
        <div key={activity.id} className="flex items-center gap-2 text-sm text-on-surface-variant">
          <MaterialIcon icon="check_circle" size="xs" className="text-primary" filled />
          <span>Edited</span>
          <code className="rounded bg-surface-container-low px-1.5 py-0.5 text-xs font-mono">
            {activity.path}
          </code>
        </div>
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start"
        >
          {expanded ? "Hide" : `Show all (${fileActivities.length})`}
        </button>
      )}
    </div>
  );
});
```

- [ ] **Step 4: Update the chat panel render to use FileBadges**

Replace the ProgressSteps usage (lines 267-278):

```tsx
{/* Progress steps during generation */}
{isGenerating && activities.length > 0 && (
  <ProgressSteps activities={activities} />
)}

{/* Activity feed during generation */}
{isGenerating &&
  activities
    .filter((a) => a.type === "file_written")
    .map((activity) => (
      <ActivityCard key={activity.id} activity={activity} />
    ))}
```

with:

```tsx
{/* Thinking indicator */}
{isGenerating && activities.some((a) => a.type === "thinking") && (
  <div className="flex items-center gap-2 py-1">
    <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />
    <span className="text-sm text-on-surface-variant">Thinking...</span>
  </div>
)}

{/* Lovable-style file badges */}
{activities.length > 0 && <FileBadges activities={activities} />}
```

Remove the now-unused `ProgressSteps`, `ActivityCard`, and `ACTIVITY_ICONS` (lines 62-169). Keep the `Activity` type import.

- [ ] **Step 5: Add Phase 1 full-width prompt layout to BuilderPage**

First, add these imports to the top of `builder-page.tsx` (some may already exist — skip duplicates):

```typescript
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MaterialIcon } from "@/shared/components/material-icon";
import { SuggestionChips } from "./suggestion-chips";
```

Before the `return` statement, add a computed flag (use a different name than `isEmpty` which is used in chat-panel.tsx):

```typescript
const showPromptScreen = !sessionId && status === "idle" && !sessionIdFromUrl;
```

Then restructure the return JSX. The key change: when `showPromptScreen` is true, render the full-width prompt layout WITHOUT the `BuilderToolbar`. When false, render the existing split-panel layout WITH the toolbar. The full return becomes:

```tsx
return (
  <div className="flex flex-1 flex-col overflow-hidden">
    {showPromptScreen ? (
      /* Phase 1: Full-width centered prompt — no toolbar */
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <h1 className="font-headline text-3xl font-bold text-foreground">
            What would you like to build?
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Describe a therapy tool and I&apos;ll build it for you.
          </p>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector("input") as HTMLInputElement;
          if (input.value.trim()) {
            handleGenerate(input.value.trim());
            input.value = "";
          }
        }} className="w-full max-w-xl">
          <div className="flex gap-2 rounded-2xl border border-border/40 bg-surface-container-lowest p-2 shadow-lg">
            <Input
              placeholder="Ask Bridges to create a therapy tool..."
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="Describe the therapy tool you want to build"
            />
            <Button type="submit" size="icon" className="shrink-0 rounded-xl">
              <MaterialIcon icon="arrow_upward" size="xs" />
            </Button>
          </div>
        </form>
        <SuggestionChips
          suggestions={[
            "Token board with star rewards for completing morning tasks",
            "Visual daily schedule with drag-to-reorder steps",
            "Communication picture board with text-to-speech",
            "Feelings check-in tool with emoji faces and journaling",
          ]}
          onSelect={handleGenerate}
        />
      </div>
    ) : (
      /* Phase 2 & 3: Split panel view with toolbar */
      <>
        {/* Move the EXISTING <BuilderToolbar .../> here unchanged — copy all its props exactly as they are in the current code (lines 165-182) */}
        <BuilderToolbar
          view={viewMode}
          onViewChange={setViewMode}
          deviceSize={deviceSize}
          onDeviceSizeChange={setDeviceSize}
          status={status}
          wcStatus={wcStatus}
          isPublishing={isPublishing}
          projectName={appName}
          isEditingName={isEditingName}
          onNameEditStart={() => setIsEditingName(true)}
          onNameEditEnd={handleNameEditEnd}
          onShare={() => setShareDialogOpen(true)}
          onPublish={handlePublish}
          isMobile={isMobile}
          mobilePanel={mobilePanel}
          onMobilePanelChange={setMobilePanel}
        />
        {/* Keep the EXISTING <div className="min-h-0 flex-1 ..."> with ResizablePanelGroup exactly as-is (lines 184-258) */}
        <div className="min-h-0 flex-1 bg-surface-container-low p-2">
          {/* ... existing mobile/desktop ResizablePanelGroup unchanged ... */}
        </div>
      </>
    )}

    {/* ShareDialog and PublishSuccessModal stay outside the condition — unchanged */}
    <ShareDialog ... />
    <PublishSuccessModal ... />
  </div>
);
```

**Important:** The inner `<div className="min-h-0 flex-1 bg-surface-container-low p-2">` and everything inside it (mobile/desktop ResizablePanelGroup) stays EXACTLY as it currently is in lines 184-258. Only the wrapping condition and toolbar placement are new.

- [ ] **Step 6: Run tests and verify**

Run: `npx vitest run --reporter=verbose`
Expected: Tests pass. Manual check: scroll the chat panel and verify messages are not cut off.

- [ ] **Step 7: Commit**

```bash
git add src/features/builder/components/chat-panel.tsx src/features/builder/components/builder-page.tsx
git commit -m "feat: Lovable-style 3-phase layout + chat overflow fix + file badges"
```

---

## Task 4: Auto-Resume Persistence

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`

- [ ] **Step 1: Add auto-resume logic**

In `builder-page.tsx`, add the `getMostRecent` query and auto-resume effect:

```typescript
import { api } from "../../../../convex/_generated/api";

// Near the top of BuilderPage component, after existing queries:
const mostRecent = useQuery(api.sessions.getMostRecent);
const autoResumed = useRef(false);

// Auto-resume: redirect to most recent session if no sessionId in URL
useEffect(() => {
  if (
    !sessionIdFromUrl &&
    mostRecent &&
    status === "idle" &&
    wcStatus === "ready" &&
    !autoResumed.current
  ) {
    autoResumed.current = true;
    router.replace(`?sessionId=${mostRecent._id}`);
  }
}, [sessionIdFromUrl, mostRecent, status, wcStatus, router]);
```

- [ ] **Step 2: Persist sessionId to localStorage**

Modify the existing `useEffect` that updates the URL (lines 135-139 in current code) to also persist to localStorage. This replaces the current effect:

```typescript
useEffect(() => {
  if (sessionId) {
    localStorage.setItem("bridges_last_session", sessionId);
    if (!sessionIdFromUrl) {
      router.replace(`?sessionId=${sessionId}`);
    }
  }
}, [sessionId, sessionIdFromUrl, router]);
```

- [ ] **Step 3: Add stale session guard**

If auto-resume redirects to a session that was deleted, the `resumeSessionData` query will return `null`. Add a guard after the existing resume effect (lines 71-96) to handle this:

```typescript
// Clear stale localStorage if session doesn't exist in Convex
useEffect(() => {
  if (sessionIdFromUrl && resumeSessionData === null && resumeFiles !== undefined) {
    // Session was deleted — clear localStorage and reset URL
    localStorage.removeItem("bridges_last_session");
    autoResumed.current = false;
    router.replace("/builder");
  }
}, [sessionIdFromUrl, resumeSessionData, resumeFiles, router]);
```

Note: `resumeSessionData === null` (not `undefined`) means the query loaded and returned nothing. `undefined` means still loading.

- [ ] **Step 3: Verify manually**

1. Go to `/builder`, submit a prompt, wait for generation to complete.
2. Navigate to another page (e.g., `/`).
3. Navigate back to `/builder` — should auto-resume the previous session with the app visible in the preview.
4. Hard refresh the page — should also auto-resume.

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/builder-page.tsx
git commit -m "feat: auto-resume most recent session on builder page load"
```

---

## Task 5: Immediate Placeholder Scaffold

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`

- [ ] **Step 1: Write placeholder to WebContainer on prompt submit**

In `builder-page.tsx`, modify the `handleGenerate` function:

```typescript
const PLACEHOLDER_APP = `export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        <p className="text-lg font-medium text-teal-800">Building your app...</p>
        <p className="mt-1 text-sm text-teal-600/70">This usually takes 10-20 seconds</p>
      </div>
    </div>
  );
}`;

// Queue placeholder write if WebContainer isn't ready yet
const pendingPlaceholderRef = useRef(false);

const handleGenerate = (prompt: string) => {
  lastPromptRef.current = prompt;

  // Write placeholder immediately so preview shows something within 1-2s
  if (wcStatus === "ready") {
    writeFile("src/App.tsx", PLACEHOLDER_APP).catch(() => {});
  } else {
    // Queue it — the effect below will write when wcStatus becomes "ready"
    pendingPlaceholderRef.current = true;
  }

  generate(prompt);
};

// Drain queued placeholder write when WebContainer becomes ready
useEffect(() => {
  if (wcStatus === "ready" && pendingPlaceholderRef.current) {
    pendingPlaceholderRef.current = false;
    writeFile("src/App.tsx", PLACEHOLDER_APP).catch(() => {});
  }
}, [wcStatus, writeFile]);
```

- [ ] **Step 2: Verify the placeholder renders**

Manual test:
1. Load `/builder` (fresh, no session)
2. Type a prompt and submit
3. Expected: within 1-2 seconds, the preview shows "Building your app..." spinner
4. Expected: within 5-10 seconds, the real app starts replacing the placeholder via HMR

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/components/builder-page.tsx
git commit -m "feat: write placeholder App.tsx immediately on prompt submit for instant preview"
```

---

## Task 6: System Prompt — Single-File-Per-Turn + Quality Boost

**Files:**
- Modify: `src/features/builder/lib/agent-prompt.ts`

- [ ] **Step 1: Add single-file-per-turn instruction**

In `agent-prompt.ts`, find the "Generation Workflow" section (line 157) and add after the existing workflow steps:

```
### CRITICAL: One File Per Turn

Write ONE file per response. After calling \`write_file\`, STOP immediately — do not call write_file again in the same response. Wait for the tool result, then continue with the next file in your next response. This ensures the user sees real-time progress as each file appears in the preview.

Workflow per turn:
1. Decide which file to write next
2. Call \`write_file\` with the complete file contents
3. STOP — do not write another file
4. Receive tool result, then write the next file
```

- [ ] **Step 2: Strengthen visual quality rules**

In the "Visual Quality Bar" section (line 63), add these additional anti-patterns:

```
- Small text in main content areas — minimum text-base (16px) for body, text-lg for interactive labels
- Missing empty states — always show a friendly message + illustration when lists are empty
- Generic "Loading..." text — use skeleton placeholders with animate-pulse instead
```

Add to the "Motion & Delight" section (line 104):

```
- Empty states: include a calming illustration or icon with an encouraging message
- State transitions: use AnimatePresence for mount/unmount animations on dynamic content
- Interactive cards: always include whileHover={{ y: -2 }} and whileTap={{ scale: 0.98 }} via motion.div
```

- [ ] **Step 3: Add multi-component structure guidance**

In the "Recommended File Structure for Complex Apps" section (line 209), replace the existing guidance with:

```
### Code Structure Rules

For ANY app, create a well-organized multi-file structure:

1. **src/App.tsx** — main layout, state management, routing between views
2. **src/types.ts** — all TypeScript interfaces and types
3. **src/data.ts** — all sample data, constants, configuration
4. **src/components/** — one file per custom component (Header.tsx, TaskCard.tsx, etc.)

A typical therapy app should have 4-6 files minimum. Single-file apps look unpolished.

When writing files, follow this order:
1. First: \`set_app_name\` + any \`generate_image\`/\`generate_speech\` calls
2. Then: \`src/types.ts\` (types first — other files import from here)
3. Then: \`src/data.ts\` (sample data)
4. Then: \`src/components/[Name].tsx\` (one file per component, bottom-up)
5. Last: \`src/App.tsx\` (imports everything above)
```

- [ ] **Step 4: Run a manual generation test**

Submit a prompt like "Token board with star rewards" and verify:
1. Claude writes one file per turn (check SSE events in Network tab)
2. Preview updates incrementally as each file arrives
3. Final app has multiple files (types, data, components, App.tsx)
4. Visual quality is noticeably better than before

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/agent-prompt.ts
git commit -m "feat: single-file-per-turn prompt + quality boost for richer generated apps"
```

---

## Task 7: Template Design System Enrichment

**Files:**
- Modify: `src/features/builder/hooks/webcontainer-files.ts`

- [ ] **Step 1: Add additional fonts to index.html template**

In `webcontainer-files.ts`, find the `index.html` template string and update the Google Fonts `<link>` to include Playfair Display:

```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Add enriched CSS utility classes**

Find the therapy-ui.css section in `webcontainer-files.ts` and add these utilities:

```css
/* Enhanced layout utilities */
.hero-section {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: white;
  border-radius: 1.5rem;
  padding: 2rem;
  text-align: center;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

/* Therapy-specific utilities */
.tap-target-lg {
  min-height: 56px;
  min-width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  border-radius: 9999px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Reward animation */
@keyframes reward-burst {
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
.reward-burst {
  animation: reward-burst 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Typography helpers */
.heading-display {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.heading-serif {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
}
```

- [ ] **Step 3: Update the system prompt to reference new utilities**

In `agent-prompt.ts`, update the "Pre-Built CSS Classes" section (line 184) to include the new classes:

Add to the list:
```
- \`.hero-section\` — gradient header banner (primary → primary-light)
- \`.feature-grid\` — responsive auto-fit grid (min 280px columns)
- \`.glass-card\` — frosted glass card with backdrop blur
- \`.tap-target-lg\` — 56px minimum touch target for child-facing elements
- \`.reward-burst\` — scale-pop animation for reward moments
- \`.heading-display\` — Nunito 800 with tight tracking for large headings
- \`.heading-serif\` — Playfair Display for elegant heading variety
```

- [ ] **Step 4: Commit**

Note: The CSS and font changes live in `webcontainer-files.ts`, which is mounted as a `FileSystemTree` on top of the snapshot (the snapshot only provides `node_modules`). No snapshot regeneration needed — these changes take effect immediately.

```bash
git add src/features/builder/hooks/webcontainer-files.ts src/features/builder/lib/agent-prompt.ts
git commit -m "feat: enrich template design system — fonts, glass cards, reward animations"
```

---

## Task 8: Preview Panel Polish

**Files:**
- Modify: `src/features/builder/components/preview-panel.tsx`

- [ ] **Step 1: Update the "Getting ready" state to match Lovable**

In `preview-panel.tsx`, find lines 50-54 (the `installing || isGenerating` branch). Replace the entire ternary branch from `) : wcStatus === "installing"` through to the closing `</div>` and `)` of that branch:

Find:
```tsx
        ) : wcStatus === "installing" || isGenerating ? (
          <div role="status" className="flex flex-col items-center gap-3 text-center">
            <MaterialIcon icon="progress_activity" size="md" className="animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant">Setting up your preview&#8230;</p>
          </div>
```

Replace with:
```tsx
        ) : wcStatus === "booting" || isGenerating ? (
          <div role="status" className="flex flex-col items-center gap-4 text-center">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-outline-variant/20 border-t-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">Getting ready...</p>
              <p className="mt-0.5 text-xs text-on-surface-variant/60">
                {wcStatus === "booting" ? "Starting preview environment" : "Building your app"}
              </p>
            </div>
          </div>
```

Note: This replaces only the inner content of that ternary branch. The `) : ... ? (` opening and the `) : isFailed ? (` continuation remain unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/features/builder/components/preview-panel.tsx
git commit -m "feat: Lovable-style preview loading state"
```

---

## Task 9: Integration Testing

**Files:** No new files — manual verification

- [ ] **Step 1: Full flow test — fresh session**

1. Navigate to `/builder` (no query params)
2. Verify: Phase 1 full-width prompt layout shows
3. Type "Token board with star rewards for completing tasks"
4. Verify: Layout transitions to split view (chat left, preview right)
5. Verify: Preview shows "Building your app..." placeholder within 2s
6. Verify: Chat shows "Thinking..." indicator
7. Verify: File badges appear as files are written ("Edited src/types.ts", etc.)
8. Verify: Preview updates incrementally as files arrive
9. Verify: Final app is visually polished with gradients, animations, proper spacing

- [ ] **Step 2: Persistence test**

1. After the app is live, note the session ID in the URL
2. Navigate to `/` (home page)
3. Navigate back to `/builder`
4. Verify: Previous session auto-resumes with the app visible in preview
5. Hard refresh the page
6. Verify: Session still resumes

- [ ] **Step 3: Chat scroll test**

1. Send multiple follow-up messages to create a long chat history
2. Resize the chat panel (drag the handle)
3. Verify: Messages are never cut off, always scrollable
4. Verify: Auto-scroll follows new messages

- [ ] **Step 4: Commit final snapshot**

If not already generated:
Run: `npm run snapshot`

No code changes in this task — integration testing only. If any fixes were needed during testing, they should have been committed in the relevant task above.
