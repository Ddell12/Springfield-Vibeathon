# Vibeathon Demo Readiness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. All UI/frontend work MUST use the `/stitch-design` skill and Stitch MCP for component design.

**Goal:** Make Bridges demo-ready for the Springfield Vibeathon (March 27) — clean architecture, working features across all 6 demo screens.

**Architecture:** Builder v2 (E2B sandbox) is the sole builder. Builder v1 is being deleted. The app uses Next.js App Router + Convex + Vercel AI SDK + E2B. Projects are stored in the `projects` Convex table. Templates use the `therapyTemplates` table. Sharing re-spins E2B sandboxes from saved fragment code.

**Tech Stack:** Next.js 15 (App Router), Convex, E2B Code Interpreter SDK, Vercel AI SDK, shadcn/ui, Tailwind v4, Vitest, react-qr-code

**Spec:** `docs/superpowers/specs/2026-03-24-vibeathon-demo-readiness-design.md`

---

## File Structure

### Files to DELETE (Task 1)
- `src/features/builder/` — entire directory (12 files, ~946 LOC)

### Files to MODIFY
- `src/app/(app)/layout.tsx` — remove v1 BuilderSidebar import
- `src/features/builder-v2/lib/__tests__/e2b.test.ts` — fix mock + test assertions
- `src/features/builder-v2/components/__tests__/builder-layout.test.tsx` — update for non-resizable layout
- `src/features/builder-v2/components/builder-header.tsx` — wire share button
- `src/features/builder-v2/components/chat.tsx` — add `initialMessage` prop
- `src/app/(app)/builder/page.tsx` — add template param handling, share dialog
- `convex/projects.ts` — fix list ordering
- `src/features/shared-tool/components/shared-tool-page.tsx` — full rewrite for E2B iframe
- `src/features/templates/components/templates-page.tsx` — rewire to `therapyTemplates` table
- `src/features/my-tools/components/my-tools-page.tsx` — rewire to `projects` table

### Files to CREATE
- `convex/therapy_templates.ts` — queries + seed for therapyTemplates table
- `src/features/builder-v2/hooks/use-template-starter.ts` — template URL param hook

---

## Task 1: Delete Builder V1 & Fix App Layout

**Files:**
- Delete: `src/features/builder/` (entire directory)
- Modify: `src/app/(app)/layout.tsx`

This task removes the dead v1 builder code and fixes the app layout that depends on it. The `(app)` layout currently imports `BuilderSidebar` from v1 — deleting v1 without fixing this breaks every route under `(app)`.

- [ ] **Step 1: Delete the entire builder v1 directory**

```bash
rm -rf src/features/builder/
```

- [ ] **Step 2: Rewrite the app layout to remove v1 import**

Replace `src/app/(app)/layout.tsx` with:

```tsx
"use client";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <main id="main-content" className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

The builder v2 has its own header (`BuilderV2Header`), so the app layout just needs to render children. No sidebar needed.

- [ ] **Step 3: Verify no remaining v1 imports**

Run: `grep -r "@/features/builder/" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".xray"`

Expected: No output (zero matches). If any file still imports from v1, fix the import.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: delete builder v1, simplify app layout"
```

---

## Task 2: Fix 7 Failing Tests

**Files:**
- Modify: `src/features/builder-v2/lib/__tests__/e2b.test.ts`
- Modify: `src/features/builder-v2/components/__tests__/builder-layout.test.tsx`

### E2B test fixes (4 failures)

The `getSandboxUrl` function returns `https://${host}` — it intentionally ignores the port because E2B encodes ports in the hostname. The tests have wrong assumptions.

- [ ] **Step 1: Fix e2b.test.ts mock and assertions**

In `src/features/builder-v2/lib/__tests__/e2b.test.ts`:

1. Add `connect` to the mock (fixes `executeFragment` tests):

Replace the mock block (lines 20-24):
```typescript
vi.mock("@e2b/code-interpreter", () => ({
  Sandbox: {
    create: vi.fn(),
    connect: vi.fn(),
  },
}));
```

2. Fix `getSandboxUrl` test assertions. The function returns `https://${host}` and doesn't include port. Fix the tests:

Replace the `getSandboxUrl` describe block:
```typescript
describe("getSandboxUrl", () => {
  it("returns a properly formatted URL from host and port", () => {
    const url = getSandboxUrl("abc123.sandbox.e2b.app", 3000);
    expect(url).toBe("https://abc123.sandbox.e2b.app");
  });

  it("returns a string starting with https", () => {
    const url = getSandboxUrl("abc123.sandbox.e2b.app", 3000);
    expect(url).toMatch(/^https:\/\//);
  });

  it("includes the host in the URL", () => {
    const url = getSandboxUrl("host.e2b.app", 3000);
    expect(url).toContain("host.e2b.app");
  });
});
```

3. Fix `executeFragment` tests to use `Sandbox.connect` mock:

In both `executeFragment` tests, replace `vi.mocked(Sandbox.create)` with `vi.mocked(Sandbox.connect)`:
```typescript
vi.mocked(Sandbox.connect).mockResolvedValue(mockSandboxInstance as any);
```

- [ ] **Step 2: Run e2b tests to verify**

Run: `npx vitest run src/features/builder-v2/lib/__tests__/e2b.test.ts`

Expected: All tests pass.

### Builder layout test fixes (3 failures)

The layout component no longer uses ResizablePanel — it uses plain divs with flexbox. The tests mock `@/shared/components/ui/resizable` but the component doesn't import it. The tests expect `panel-group` and `handle` test IDs that don't exist.

- [ ] **Step 3: Rewrite builder-layout.test.tsx**

Replace `src/features/builder-v2/components/__tests__/builder-layout.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BuilderV2Layout } from "../builder-layout";

const mockUseMediaQuery = vi.fn();

vi.mock("usehooks-ts", () => ({
  useMediaQuery: (query: string) => mockUseMediaQuery(query),
}));

describe("BuilderV2Layout", () => {
  const chatContent = <div>Chat Panel</div>;
  const previewContent = <div>Preview Panel</div>;

  it("renders both panels on desktop in side-by-side layout", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
  });

  it("renders stacked layout on mobile", () => {
    mockUseMediaQuery.mockReturnValue(true);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
  });

  it("renders chat panel above preview panel in mobile stacked layout", () => {
    mockUseMediaQuery.mockReturnValue(true);
    const { container } = render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    const text = container.textContent ?? "";
    const chatIndex = text.indexOf("Chat Panel");
    const previewIndex = text.indexOf("Preview Panel");
    expect(chatIndex).toBeLessThan(previewIndex);
  });

  it("uses fixed chat width on desktop", () => {
    mockUseMediaQuery.mockReturnValue(false);
    const { container } = render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    const chatContainer = container.querySelector(".w-\\[400px\\]");
    expect(chatContainer).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run all builder-v2 tests**

Run: `npx vitest run src/features/builder-v2/`

Expected: All tests pass.

- [ ] **Step 5: Run full test suite**

Run: `npm test -- --run`

Expected: All remaining tests pass (0 failures). Some tests were deleted with v1.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "test: fix 7 failing builder-v2 tests (e2b mock + layout assertions)"
```

---

## Task 3: Landing Page Audit

**Files:**
- Read only: `src/features/landing/components/hero-section.tsx`, `close-the-gap-hero.tsx`, `how-it-works.tsx`, `product-preview.tsx`, `landing-footer.tsx`
- Read only: `src/app/(marketing)/page.tsx`

Quick audit — fix only if broken.

- [ ] **Step 1: Verify landing page renders**

Run the dev server and check `/` in a browser, OR read the landing page component:

```bash
# Check which components the landing page uses
cat src/app/\(marketing\)/page.tsx
```

Verify:
- `HeroSection` CTA links to `/builder` ✓ (confirmed: `href="/builder"`)
- `HowItWorks` renders
- `ProductPreview` renders
- `LandingFooter` renders

- [ ] **Step 2: Check for broken imports after v1 deletion**

Run: `npx tsc --noEmit`

If any landing component imported from v1, fix it. Based on research: landing components have no v1 imports — they should be clean.

- [ ] **Step 3: Skip or fix**

If everything compiles and renders, move on. If something broke, fix it and commit:

```bash
git add -A && git commit -m "fix: landing page issues from v1 removal"
```

---

## Task 4: Builder V2 — Share Button Wiring

**Files:**
- Modify: `src/features/builder-v2/components/builder-header.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

The share button in the builder header exists but doesn't do anything. Wire it to open the `ShareDialog`.

- [ ] **Step 1: Pass share handler to header**

In `src/app/(app)/builder/page.tsx`, add share dialog state and pass to header:

Add imports at top:
```tsx
import { useMutation } from "convex/react";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import { api } from "../../../../convex/_generated/api";
```

Add state inside `BuilderPage`:
```tsx
const [showShareDialog, setShowShareDialog] = useState(false);
const [projectId, setProjectId] = useState<string | null>(null);
const [shareSlug, setShareSlug] = useState<string | null>(null);
const createProject = useMutation(api.projects.create);
const updateProject = useMutation(api.projects.update);
```

Update `handleFragmentGenerated` to save the project:
```tsx
const handleFragmentGenerated = async (result: FragmentResult) => {
  setFragment(result);
  setIsPreviewLoading(true);
  try {
    // Save/update project in Convex
    let currentProjectId = projectId;
    if (!currentProjectId) {
      currentProjectId = await createProject({
        title: result.title,
        description: result.description,
      });
      setProjectId(currentProjectId);
    }

    const res = await fetch("/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: result }),
    });
    if (res.ok) {
      const { url, sandboxId } = await res.json();
      setSandboxUrl(url);
      // Persist fragment and sandboxId
      await updateProject({
        projectId: currentProjectId as any,
        title: result.title,
        description: result.description,
        fragment: result,
        sandboxId,
      });
    }
  } finally {
    setIsPreviewLoading(false);
  }
};
```

Query the project reactively to get `shareSlug`. Add after state declarations:
```tsx
const projectData = useQuery(
  api.projects.get,
  projectId ? { projectId: projectId as any } : "skip"
);
```

Add import for `useQuery`:
```tsx
import { useMutation, useQuery } from "convex/react";
```

Pass to header and add share dialog:
```tsx
<BuilderV2Header
  projectName={fragment?.title}
  onNewProject={handleNewProject}
  onShare={() => setShowShareDialog(true)}
  hasProject={!!projectId}
/>

{/* After the closing div */}
{showShareDialog && projectData && (
  <ShareDialog
    open={showShareDialog}
    onOpenChange={setShowShareDialog}
    shareSlug={projectData.shareSlug}
    toolTitle={projectData.title}
  />
)}
```

- [ ] **Step 2: Update builder header to accept onShare**

In `src/features/builder-v2/components/builder-header.tsx`, update the type and wire the button:

Add to props type:
```tsx
type BuilderV2HeaderProps = {
  projectName?: string;
  shareSlug?: string;
  onNewProject?: () => void;
  onShare?: () => void;
  hasProject?: boolean;
};
```

Update the Share button (around line 41-47):
```tsx
{hasProject && (
  <button
    className="flex items-center gap-2 px-4 py-1.5 text-primary rounded-lg font-bold text-sm hover:bg-primary/5 transition-colors active:scale-95 min-h-[44px]"
    type="button"
    onClick={onShare}
  >
    <MaterialIcon icon="share" size="sm" />
    Share
  </button>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: wire share button in builder to ShareDialog with project persistence"
```

---

## Task 5: Shared Tool View — Full Rewrite for E2B

**Files:**
- Modify: `src/features/shared-tool/components/shared-tool-page.tsx` (full rewrite)
- Modify: `src/app/tool/[toolId]/page.tsx`

The shared tool page currently uses v1's `ToolRenderer`. It needs a complete rewrite to: query the `projects` table, spin up an E2B sandbox from the saved fragment, and render the result in an iframe.

- [ ] **Step 1: Rewrite shared-tool-page.tsx**

Use `/stitch-design` skill and Stitch MCP for the UI design of this page. The component needs:

Replace `src/features/shared-tool/components/shared-tool-page.tsx` entirely:

```tsx
"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";

export function SharedToolPage() {
  const params = useParams();
  const slug = params?.toolId as string;
  const project = useQuery(api.projects.getBySlug, slug ? { slug } : "skip");
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Spin up sandbox when project loads (use _id as stable dep, not fragment object)
  useEffect(() => {
    if (!project?._id || !project?.fragment) return;
    let cancelled = false;

    async function bootSandbox() {
      setIsBooting(true);
      setSandboxError(null);
      try {
        const res = await fetch("/api/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fragment: project!.fragment }),
        });
        if (!res.ok) throw new Error("Failed to start sandbox");
        const { url } = await res.json();
        if (!cancelled) setSandboxUrl(url);
      } catch {
        if (!cancelled) setSandboxError("Unable to load this tool right now. Please try again later.");
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    }

    bootSandbox();
    return () => { cancelled = true; };
  }, [project?._id, retryCount]);

  // Loading — waiting for Convex query
  if (project === undefined) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-4xl w-full px-8">
          <div className="h-10 bg-surface-container-low rounded-xl w-64" />
          <div className="h-[60vh] bg-surface-container-low rounded-xl" />
        </div>
      </div>
    );
  }

  // Not found
  if (project === null) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
        <MaterialIcon icon="search_off" className="text-6xl text-primary/40" />
        <h1 className="font-headline font-bold text-3xl text-on-surface">
          This tool doesn&apos;t exist
        </h1>
        <p className="text-on-surface-variant text-lg">
          It may have been removed, or the link might be incorrect.
        </p>
        <Link
          href="/builder"
          className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95"
        >
          Build Your Own
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      {/* Minimal Header */}
      <header className="flex justify-center items-center w-full px-6 py-4 bg-surface">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <Link href="/" className="text-primary-container font-extrabold tracking-tight font-headline text-lg">
            Bridges
          </Link>
          <span className="hidden md:block text-on-surface-variant font-label text-sm">
            {project.title}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-6">
        {isBooting ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full max-w-5xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary" />
            <p className="text-on-surface-variant font-medium">Loading your therapy tool...</p>
            <p className="text-on-surface-variant/60 text-sm">This usually takes 10-15 seconds</p>
          </div>
        ) : sandboxError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <MaterialIcon icon="error_outline" className="text-5xl text-error/60" />
            <p className="text-on-surface-variant">{sandboxError}</p>
            <button
              onClick={() => { setSandboxError(null); setRetryCount(c => c + 1); }}
              className="text-primary font-semibold hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : sandboxUrl ? (
          <div className="w-full max-w-5xl flex-1">
            <iframe
              src={sandboxUrl}
              title={project.title}
              className="w-full h-[70vh] rounded-xl border border-outline-variant/20 shadow-lg"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : null}
      </main>

      {/* Spacer for sticky footer */}
      <div className="h-24" />

      {/* Bottom Sticky Footer */}
      <footer className="fixed bottom-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-md border-t border-outline-variant/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-on-surface-variant">
            Build your own — powered by{" "}
            <span className="text-primary-container font-bold">Bridges</span>
          </span>
          <Link
            href="/builder"
            className="bg-primary-gradient px-5 py-2 rounded-lg text-white font-label font-semibold text-sm hover:opacity-90 transition-all active:scale-95"
          >
            Create Tool
          </Link>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: rewrite shared-tool page for E2B sandbox iframe"
```

---

## Task 6: Create Therapy Templates Convex Functions + Seed

**Files:**
- Create: `convex/therapy_templates.ts`

The `therapyTemplates` table exists in the schema but has no query functions. The current templates page queries `api.templates.queries.listTemplates` which reads from the `tools` table (v1 pattern). We need new functions for the `therapyTemplates` table.

- [ ] **Step 1: Create convex/therapy_templates.ts**

```typescript
import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("therapyTemplates")
      .withIndex("by_sortOrder")
      .collect();
  },
});

export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("therapyTemplates")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("therapyTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotent: skip if templates already exist
    const existing = await ctx.db.query("therapyTemplates").first();
    if (existing) return;

    const templates = [
      {
        name: "Snack Request Board",
        description: "A picture communication board with 8 common snack requests for children to express food preferences",
        category: "Communication",
        starterPrompt: "Build a picture communication board with 8 common snack requests like goldfish crackers, apple slices, juice box, and more. Make it colorful and child-friendly with large tap targets.",
        sortOrder: 1,
      },
      {
        name: "Feelings Check-In",
        description: "An emotions board with 6 feelings for daily emotional check-ins and social-emotional learning",
        category: "Communication",
        starterPrompt: "Create a feelings check-in board with 6 emotions — happy, sad, angry, scared, tired, excited — with emoji-style pictures and large labels. Include a sentence starter like 'I feel...'",
        sortOrder: 2,
      },
      {
        name: "5-Star Token Board",
        description: "A token reward system with 5 stars for reinforcing positive behaviors during therapy sessions",
        category: "Behavior Support",
        starterPrompt: "Build a token board with 5 stars where a child earns tokens for positive behavior. Show a fun animation when each token is earned, and reveal a reward choice screen when all 5 are collected.",
        sortOrder: 3,
      },
      {
        name: "First-Then Transition Board",
        description: "A two-panel visual showing what to do first and what comes next, helping with activity transitions",
        category: "Behavior Support",
        starterPrompt: "Create a first-then board for transitioning between activities — first finish homework, then play outside. Use two large panels side-by-side with clear icons and a progress indicator.",
        sortOrder: 4,
      },
      {
        name: "Morning Routine Schedule",
        description: "A step-by-step visual schedule for morning routines with checkable items",
        category: "Daily Routines",
        starterPrompt: "Build a visual schedule for a morning routine: wake up, brush teeth, get dressed, eat breakfast, pack backpack. Each step should be tappable to mark complete with a satisfying checkmark animation.",
        sortOrder: 5,
      },
      {
        name: "Bedtime Schedule",
        description: "A calming bedtime routine visual schedule to help children wind down independently",
        category: "Daily Routines",
        starterPrompt: "Create a visual bedtime routine: bath time, put on pajamas, brush teeth, read a story, lights out. Use calming colors (blues, purples) and gentle animations. Steps should be tappable to complete.",
        sortOrder: 6,
      },
      {
        name: "Letter Choice Board",
        description: "An interactive letter recognition activity with 4 uppercase letters for early literacy",
        category: "Academic",
        starterPrompt: "Build a choice board with 4 uppercase letters (A, B, C, D) for a letter recognition activity. When a child taps a letter, show it large with a fun animation and say the letter name.",
        sortOrder: 7,
      },
      {
        name: "Color Matching Board",
        description: "An interactive color matching game with 6 colors for learning color names",
        category: "Academic",
        starterPrompt: "Create an interactive color matching activity with 6 colors (red, blue, green, yellow, orange, purple) and their names. The child taps a color swatch and it highlights with the color name shown prominently.",
        sortOrder: 8,
      },
    ];

    for (const template of templates) {
      await ctx.db.insert("therapyTemplates", template);
    }
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Run the seed**

The `seed` function is an `internalMutation` — it cannot be called from the CLI (`npx convex run` only works with public functions). Use one of these approaches:

1. **Convex Dashboard (recommended):** Navigate to Functions → `therapy_templates` → `seed` → click "Run"
2. **Temporary public mutation:** Change `internalMutation` to `mutation`, run `npx convex run therapy_templates:seed`, then change back to `internalMutation`

Verify: Check the Convex dashboard Data tab — `therapyTemplates` should have 8 rows.

- [ ] **Step 4: Commit**

```bash
git add convex/therapy_templates.ts && git commit -m "feat: add therapyTemplates Convex functions + seed 8 templates"
```

---

## Task 7: Fix Projects List Ordering

**Files:**
- Modify: `convex/projects.ts` (line 49-54)

- [ ] **Step 1: Update projects.list to use index**

In `convex/projects.ts`, replace the `list` query:

```typescript
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/projects.ts && git commit -m "fix: order projects list by newest first"
```

---

## Task 8: Rewire Templates Page to therapyTemplates Table

**Files:**
- Modify: `src/features/templates/components/templates-page.tsx`

The current templates page queries `api.templates.queries.listTemplates` which reads from the `tools` table. Rewire to use the new `api.therapy_templates` functions.

- [ ] **Step 1: Update templates page**

Use `/stitch-design` skill for UI refinements. Key changes to `templates-page.tsx`:

0. Remove unused imports: `ToolCard`, `Skeleton`, `Doc` — these were for the v1 `tools` table pattern and are no longer needed.

1. Update categories to match seed data:
```tsx
type Category = "all" | "Communication" | "Behavior Support" | "Daily Routines" | "Academic";

const categories: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Communication", label: "Communication" },
  { value: "Behavior Support", label: "Behavior Support" },
  { value: "Daily Routines", label: "Daily Routines" },
  { value: "Academic", label: "Academic" },
];
```

2. Update the query (single subscription, not two):
```tsx
const templates = useQuery(
  active === "all" ? api.therapy_templates.list : api.therapy_templates.getByCategory,
  active === "all" ? {} : { category: active }
);
const isLoading = templates === undefined;
```

3. Update the template card rendering — `therapyTemplates` has `name` (not `title`) and no `toolType`:
```tsx
{templates?.map((template) => (
  <Link
    key={template._id}
    href={`/builder?template=${template._id}`}
    className="group bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/10 hover:ring-primary/30 transition-all hover:shadow-lg"
  >
    <div className="mb-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
        {template.category}
      </span>
    </div>
    <h3 className="font-headline font-bold text-lg text-on-surface mb-2 group-hover:text-primary transition-colors">
      {template.name}
    </h3>
    <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
      {template.description}
    </p>
    <span className="text-primary font-semibold text-sm flex items-center gap-1">
      Use Template
      <MaterialIcon icon="arrow_forward" size="sm" className="transition-transform group-hover:translate-x-1" />
    </span>
  </Link>
))}
```

4. Update the empty state to remove the `Doc<"tools">` cast.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: rewire templates page to therapyTemplates table with categories"
```

---

## Task 9: Builder Template Auto-Start

**Files:**
- Create: `src/features/builder-v2/hooks/use-template-starter.ts`
- Modify: `src/features/builder-v2/components/chat.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

When a user clicks "Use Template", the builder should auto-send the template's `starterPrompt`.

- [ ] **Step 1: Create the template starter hook**

First create the hooks directory (it doesn't exist yet):
```bash
mkdir -p src/features/builder-v2/hooks
```

Create `src/features/builder-v2/hooks/use-template-starter.ts`:

```typescript
"use client";

import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useTemplateStarter() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");

  const template = useQuery(
    api.therapy_templates.get,
    templateId ? { id: templateId as Id<"therapyTemplates"> } : "skip"
  );

  return {
    starterPrompt: template?.starterPrompt ?? null,
    templateName: template?.name ?? null,
    isLoading: templateId !== null && template === undefined,
  };
}
```

- [ ] **Step 2: Add initialMessage prop to Chat component**

In `src/features/builder-v2/components/chat.tsx`, add `initialMessage` to the props:

```tsx
type ChatProps = {
  projectId?: string;
  onFragmentGenerated?: (fragment: FragmentResult) => void;
  currentCode?: string;
  initialMessage?: string | null;
};
```

Add a `useEffect` that auto-sends the initial message once:

```tsx
const [hasAutoSent, setHasAutoSent] = useState(false);

// eslint-disable-next-line react-hooks/exhaustive-deps -- handleSubmit is stable enough, including it would cause re-fires
useEffect(() => {
  if (initialMessage && !hasAutoSent && !isLoading) {
    setHasAutoSent(true);
    handleSubmit(initialMessage);
  }
}, [initialMessage, hasAutoSent, isLoading]);
```

Update the component signature:
```tsx
export function Chat({
  projectId: _projectId,
  onFragmentGenerated,
  currentCode,
  initialMessage,
}: ChatProps) {
```

- [ ] **Step 3: Wire it up in the builder page**

**IMPORTANT (Next.js best practice):** `useSearchParams()` requires a `<Suspense>` boundary to avoid opting the entire page out of static optimization. Since the hook is called inside `useTemplateStarter`, wrap the builder page content in Suspense.

In `src/app/(app)/builder/page.tsx`, add imports:

```tsx
import { Suspense } from "react";
import { useTemplateStarter } from "@/features/builder-v2/hooks/use-template-starter";
```

The simplest approach: since the page is already `"use client"`, extract the content into an inner component and wrap with Suspense:

```tsx
function BuilderContent() {
  const { starterPrompt } = useTemplateStarter();
  // ... all existing BuilderPage state and JSX moves here ...

  return (
    <div className="flex flex-col h-full">
      <BuilderV2Header ... />
      <div className="flex-1 overflow-hidden">
        <BuilderV2Layout
          chatPanel={
            <Chat
              onFragmentGenerated={handleFragmentGenerated}
              currentCode={fragment?.code}
              initialMessage={starterPrompt}
            />
          }
          previewPanel={<Preview ... />}
        />
      </div>
      {/* ShareDialog here */}
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
      <BuilderContent />
    </Suspense>
  );
}
```

This follows the [Next.js docs recommendation](https://nextjs.org/docs/app/api-reference/functions/use-search-params) for `useSearchParams`.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: auto-send template starterPrompt when builder opens from template"
```

---

## Task 10: Rewire My Tools Page to Projects Table

**Files:**
- Modify: `src/features/my-tools/components/my-tools-page.tsx`

The My Tools page currently queries `api.tools.list` (v1). Rewire to `api.projects.list` (v2).

- [ ] **Step 1: Update my-tools-page.tsx**

Use `/stitch-design` skill for UI design. Key changes:

1. Update imports:
```tsx
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { ShareDialog } from "@/features/sharing/components/share-dialog";
import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
```

2. Update query to `projects`:
```tsx
const projects = useQuery(api.projects.list);
const removeProject = useMutation(api.projects.remove);
const [sharingProject, setSharingProject] = useState<Doc<"projects"> | null>(null);
```

3. Update the grid to render projects:
```tsx
{projects?.map((project) => (
  <div
    key={project._id}
    className="group bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/10 hover:ring-primary/30 transition-all hover:shadow-lg"
  >
    <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
      {project.title}
    </h3>
    {project.description && (
      <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">
        {project.description}
      </p>
    )}
    <p className="text-on-surface-variant/60 text-xs mb-4">
      Created {new Date(project.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
    </p>
    <div className="flex gap-2">
      <Link
        href={`/builder?project=${project._id}`}
        className="flex items-center gap-1 text-primary font-semibold text-sm hover:underline"
      >
        <MaterialIcon icon="open_in_new" size="sm" />
        Open
      </Link>
      <button
        onClick={() => setSharingProject(project)}
        className="flex items-center gap-1 text-on-surface-variant font-medium text-sm hover:text-primary transition-colors"
      >
        <MaterialIcon icon="share" size="sm" />
        Share
      </button>
      <button
        onClick={() => {
          if (confirm("Delete this tool?")) {
            removeProject({ projectId: project._id });
          }
        }}
        className="flex items-center gap-1 text-on-surface-variant font-medium text-sm hover:text-error transition-colors ml-auto"
      >
        <MaterialIcon icon="delete" size="sm" />
      </button>
    </div>
  </div>
))}
```

4. Update loading/empty states to reference `projects` instead of `tools`.

5. Update the share dialog:
```tsx
{sharingProject && (
  <ShareDialog
    open={!!sharingProject}
    onOpenChange={(open) => { if (!open) setSharingProject(null); }}
    shareSlug={sharingProject.shareSlug}
    toolTitle={sharingProject.title}
  />
)}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: rewire My Tools page to projects table"
```

---

## Task 11: Full Integration Verification

**Files:** None (read-only verification)

- [ ] **Step 1: Run full test suite**

Run: `npm test -- --run`

Expected: All tests pass.

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Build check**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Manual smoke test**

If dev server available, check these routes:
- `/` — landing page loads
- `/builder` — chat + preview work
- `/templates` — 8 templates with category tabs
- `/my-tools` — projects grid (may be empty)
- `/tool/[some-slug]` — shared view boots sandbox

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: integration issues from demo readiness pass"
```

---

## Task 12 (Optional): Dependency Updates & Cleanup

**Only if time remains after Tasks 1-11.**

- [ ] **Step 1: Check outdated deps**

Run: `npm outdated`

- [ ] **Step 2: Update patch/minor versions only**

```bash
npm update
```

Run tests after: `npm test -- --run`

- [ ] **Step 3: Remove orphaned v1 template code**

Delete `convex/templates/` directory (queries `tools` table — dead code after Task 8 rewired to `therapyTemplates`). Also consider removing `convex/__tests__/tools.test.ts` if the `tools` table is no longer used by any UI.

- [ ] **Step 4: Add optional userId to projects schema**

In `convex/schema.ts`, add to the projects table:
```typescript
userId: v.optional(v.string()),
```

Add index:
```typescript
.index("by_userId", ["userId"])
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: update deps, add optional userId to projects schema"
```
