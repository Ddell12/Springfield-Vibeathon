# Fix Share Flow E2E + Remove Publish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Share flow serve generated app HTML at `/tool/{slug}` and remove the broken Publish flow.

**Architecture:** Add a public Convex query that resolves share slugs to bundle HTML, a Next.js API route that serves that HTML, and update the shared tool page to use it. Strip all publish-related code.

**Tech Stack:** Convex (queries), Next.js API routes, React (component updates), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-03-27-share-flow-fix-design.md`

---

### Task 1: Add `getPublicBundle` query to Convex

**Files:**
- Modify: `convex/generated_files.ts:1-103` — add new export at end
- Test: `convex/__tests__/generated_files.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the end of `convex/__tests__/generated_files.test.ts`, inside a new `describe` block:

```typescript
describe("getPublicBundle — public bundle serving via share slug", () => {
  it("returns bundle HTML when app and _bundle.html exist", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    // Create an app record with a share slug
    await t.mutation(api.apps.create, {
      title: "Shared App",
      description: "Test app",
      shareSlug: "bundle-test-slug",
      sessionId,
    });
    // Create the _bundle.html file
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "_bundle.html",
      contents: "<html><body>Hello World</body></html>",
      version: 1,
    });
    // Query without identity — this is a public query
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "bundle-test-slug",
    });
    expect(html).toBe("<html><body>Hello World</body></html>");
  });

  it("returns null when share slug does not exist", async () => {
    const t = convexTest(schema, modules);
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "nonexistent-slug",
    });
    expect(html).toBeNull();
  });

  it("returns null when app has no sessionId", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    // Create app without sessionId
    await t.mutation(api.apps.create, {
      title: "No Session App",
      description: "Missing session",
      shareSlug: "no-session-slug",
    });
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "no-session-slug",
    });
    expect(html).toBeNull();
  });

  it("returns null when _bundle.html does not exist for session", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.apps.create, {
      title: "No Bundle App",
      description: "No bundle yet",
      shareSlug: "no-bundle-slug",
      sessionId,
    });
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "no-bundle-slug",
    });
    expect(html).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/generated_files.test.ts --reporter=verbose`
Expected: FAIL — `api.generated_files.getPublicBundle` does not exist

- [ ] **Step 3: Write the implementation**

Add to the end of `convex/generated_files.ts`:

```typescript
/** Public query — serves bundle HTML for shared apps. No auth required. */
export const getPublicBundle = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();
    if (!app?.sessionId) return null;
    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", app.sessionId).eq("path", "_bundle.html")
      )
      .first();
    return file?.contents ?? null;
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/generated_files.test.ts --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add convex/generated_files.ts convex/__tests__/generated_files.test.ts
git commit -m "feat: add getPublicBundle query for share flow"
```

---

### Task 2: Create API route to serve bundle HTML

**Files:**
- Create: `src/app/api/tool/[slug]/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/tool/[slug]/route.ts`:

```typescript
import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return new Response("Not found", { status: 404 });
  }

  const html = await convex.query(api.generated_files.getPublicBundle, {
    shareSlug: slug,
  });

  if (!html) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}
```

Note: Next.js 16 uses `Promise<{ slug: string }>` for params (async params).

- [ ] **Step 2: Verify the file was created**

Run: `ls -la src/app/api/tool/\[slug\]/route.ts`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tool/\[slug\]/route.ts
git commit -m "feat: add API route to serve shared tool HTML"
```

---

### Task 3: Update SharedToolPage to use API route

**Files:**
- Modify: `src/features/shared-tool/components/shared-tool-page.tsx`
- Modify: `src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx`

- [ ] **Step 1: Update the test for the new iframe behavior**

The test at `src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx` needs a new test case. Add after the existing tests:

```typescript
test("renders iframe with /api/tool/{slug} src when app exists", () => {
  vi.mocked(convexReact.useQuery).mockReturnValue({
    ...mockProject,
    sessionId: "session123",
  });

  render(<SharedToolPage />);

  const iframe = document.querySelector("iframe");
  expect(iframe).not.toBeNull();
  expect(iframe?.getAttribute("src")).toBe("/api/tool/abc123");
});
```

Also update the existing `mockProject` to include `sessionId: "session123"` in its fields.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx --reporter=verbose`
Expected: FAIL — iframe src still points at the old previewUrl

- [ ] **Step 3: Rewrite shared-tool-page.tsx**

Replace `src/features/shared-tool/components/shared-tool-page.tsx` entirely:

```tsx
"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";

export function SharedToolPage() {
  const params = useParams();
  const slug = typeof params?.toolId === "string" ? params.toolId : "";
  const app = useQuery(api.apps.getByShareSlug, slug ? { shareSlug: slug } : "skip");

  if (app === undefined) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center">
        <div data-testid="loading-skeleton" className="animate-pulse space-y-4 max-w-4xl w-full px-8">
          <div className="h-10 bg-surface-container-low rounded-xl w-64" />
          <div className="h-[60vh] bg-surface-container-low rounded-xl" />
        </div>
      </div>
    );
  }

  if (app === null) {
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

  // Serve bundle HTML via API route — works for any shared app with a session
  const bundleUrl = app.sessionId ? `/api/tool/${slug}` : null;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <header className="flex justify-center items-center w-full px-6 py-4 bg-surface">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <Link href="/" className="text-primary-container font-extrabold tracking-tight font-headline text-lg">
            Bridges
          </Link>
          <span className="hidden md:block text-on-surface-variant font-label text-sm">
            {app.title}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6">
        {bundleUrl ? (
          <div className="w-full max-w-5xl flex-1">
            <iframe
              src={bundleUrl}
              title={app.title}
              className="w-full h-[70vh] rounded-xl border border-outline-variant/20 shadow-lg"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <MaterialIcon icon="construction" className="text-5xl text-primary/60" />
            <p className="text-on-surface-variant text-lg">This tool is still being built.</p>
            <p className="text-on-surface-variant text-sm">Check back soon!</p>
          </div>
        )}
      </main>

      <div className="h-24" />

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/shared-tool/components/shared-tool-page.tsx src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx
git commit -m "feat: shared tool page serves bundle HTML via API route"
```

---

### Task 4: Simplify ShareDialog — remove tab toggle

**Files:**
- Modify: `src/features/sharing/components/share-dialog.tsx`
- Modify: `src/features/sharing/components/__tests__/share-dialog.test.tsx`

- [ ] **Step 1: Update the share-dialog.tsx**

Replace `src/features/sharing/components/share-dialog.tsx` — remove `publishedUrl` prop, `activeTab` state, and the tab toggle UI. The component becomes simpler:

```tsx
"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

import { copyToClipboard } from "@/core/clipboard";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareSlug: string;
  appTitle: string;
};

export function ShareDialog({
  open,
  onOpenChange,
  shareSlug,
  appTitle,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareSlug ? `${origin}/tool/${shareSlug}` : "";
  const isLoading = !shareUrl;

  async function handleCopy() {
    await copyToClipboard(shareUrl, "Link copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await navigator.share({ title: appTitle, url: shareUrl });
    } catch {
      // User cancelled or share not supported — no-op
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 gap-6 sm:max-w-[420px]" showCloseButton={false}>
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="font-headline font-semibold text-lg text-on-surface">
            Share &apos;{appTitle}&apos;
          </DialogTitle>
          <DialogDescription className="sr-only">
            Share your app via link or QR code
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-surface-container transition-colors rounded-full text-on-surface-variant"
            aria-label="Close"
          >
            <MaterialIcon icon="close" size="sm" />
          </button>
        </DialogHeader>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="w-40 h-40 border border-surface-container-low rounded-xl p-2 flex items-center justify-center">
            {isLoading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <QRCode value={shareUrl} size={140} />
            )}
          </div>
        </div>

        {/* URL Input Row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-lg flex items-center">
            <span className="text-sm text-on-surface truncate">
              {isLoading ? "Creating share link..." : shareUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-primary font-medium text-sm hover:bg-primary-fixed/20 transition-all rounded-lg disabled:opacity-50"
          >
            <MaterialIcon icon={copied ? "check" : "content_copy"} size="xs" />
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            Close
          </Button>
          {"share" in navigator && typeof navigator.share === "function" && (
            <Button
              onClick={handleShare}
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 shadow-sm"
            >
              <MaterialIcon icon="share" size="xs" />
              Share
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update the tests**

In `src/features/sharing/components/__tests__/share-dialog.test.tsx`:

1. Remove `publishedUrl` from `defaultProps` (it shouldn't be there, but verify)
2. Delete these test cases entirely:
   - `"renders 'Preview Link' tab when no publishedUrl is provided"` (line 135-139)
   - `"renders 'Published Link' tab when publishedUrl is provided"` (line 141-149)
   - `"'Published Link' tab displays the Vercel URL when clicked"` (line 151-166)
   - `"switching tabs changes the displayed URL"` (line 168-186)
   - `"clicking 'Preview Link' tab sets activeTab to preview"` (line 224-243)

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/features/sharing/components/__tests__/share-dialog.test.tsx --reporter=verbose`
Expected: All remaining tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/sharing/components/share-dialog.tsx src/features/sharing/components/__tests__/share-dialog.test.tsx
git commit -m "refactor: simplify ShareDialog — remove tab toggle and publishedUrl"
```

---

### Task 5: Remove Publish from BuilderToolbar

**Files:**
- Modify: `src/features/builder/components/builder-toolbar.tsx`
- Modify: `src/features/builder/components/__tests__/builder-toolbar.test.tsx`

- [ ] **Step 1: Update builder-toolbar.tsx**

In `src/features/builder/components/builder-toolbar.tsx`:

1. Remove from `BuilderToolbarProps` interface: `isPublishing`, `onPublish`
2. Remove from destructured props: `isPublishing`, `onPublish`
3. Remove: `const canPublish = !isGenerating && !isPublishing;`
4. Remove the Publish `<Button>` block (lines 232-239)
5. Update the comment `{/* Right section: View Source + Share + Publish */}` → `{/* Right section: View Source + Share */}`

- [ ] **Step 2: Update tests**

In `src/features/builder/components/__tests__/builder-toolbar.test.tsx`:

1. Remove `isPublishing: false` from `baseProps`
2. Delete these test cases:
   - `"Publish button is enabled when not generating and not publishing"` (line 98-108)
   - `"Publish button is disabled when isPublishing=true"` (line 110-123)
   - `"isPublishing=true shows spinner icon instead of 'Publish' text"` (line 125-129)

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/__tests__/builder-toolbar.test.tsx --reporter=verbose`
Expected: All remaining tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/builder-toolbar.tsx src/features/builder/components/__tests__/builder-toolbar.test.tsx
git commit -m "refactor: remove Publish button from BuilderToolbar"
```

---

### Task 6: Remove Publish from BuilderPage

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`

- [ ] **Step 1: Update builder-page.tsx**

In `src/features/builder/components/builder-page.tsx`:

1. Remove import: `import { usePublishing } from "../hooks/use-publishing";`
2. Remove import: `import { PublishSuccessModal } from "./publish-success-modal";`
3. Remove the entire `usePublishing` hook call (lines 146-153)
4. Remove from `<BuilderToolbar>` props: `isPublishing={isPublishing}`, `onPublish={handlePublish}`
5. Remove the `publishedUrl` prop from `<ShareDialog>`: change line 395 from `publishedUrl={appRecord?.publishedUrl ?? publishedUrl ?? undefined}` to just remove the prop entirely
6. Remove the entire `<PublishSuccessModal>` JSX block (lines 398-407)

- [ ] **Step 2: Run the full test suite for builder**

Run: `npx vitest run src/features/builder/components/__tests__/ --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/components/builder-page.tsx
git commit -m "refactor: remove publish integration from BuilderPage"
```

---

### Task 7: Remove publishedUrl from Convex schema and mutations

**Files:**
- Modify: `convex/schema.ts:39-52` — remove `publishedUrl` from `apps`
- Modify: `convex/apps.ts:14,42,77,90` — remove `publishedUrl` from `create` and `update`
- Modify: `convex/__tests__/apps.test.ts:63-77` — delete `publishedUrl` test

- [ ] **Step 1: Remove `publishedUrl` from schema**

In `convex/schema.ts`, remove line 46:
```
    publishedUrl: v.optional(v.string()),
```
from the `apps` table definition.

- [ ] **Step 2: Remove `publishedUrl` from `create` mutation**

In `convex/apps.ts`:
- Remove `publishedUrl: v.optional(v.string()),` from `create` args (line 14)
- Remove `publishedUrl: args.publishedUrl,` from the insert object (line 42)

- [ ] **Step 3: Remove `publishedUrl` from `update` mutation**

In `convex/apps.ts`:
- Remove `publishedUrl: v.optional(v.string()),` from `update` args (line 77)
- Remove `if (fields.publishedUrl !== undefined) patch.publishedUrl = fields.publishedUrl;` (line 90)

- [ ] **Step 4: Remove the `publishedUrl` test**

In `convex/__tests__/apps.test.ts`, delete the entire test case `"update patches publishedUrl without touching title"` (lines 63-77).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/apps.test.ts --reporter=verbose`
Expected: All remaining tests PASS

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/apps.ts convex/__tests__/apps.test.ts
git commit -m "refactor: remove publishedUrl from apps schema and mutations"
```

---

### Task 8: Delete publish-related files

**Files:**
- Delete: `convex/publish.ts`
- Delete: `src/features/builder/hooks/use-publishing.ts`
- Delete: `src/features/builder/components/publish-success-modal.tsx`
- Delete: `src/features/builder/lib/template-files.ts`

- [ ] **Step 1: Delete the files**

```bash
git rm convex/publish.ts
git rm src/features/builder/hooks/use-publishing.ts
git rm src/features/builder/components/publish-success-modal.tsx
git rm src/features/builder/lib/template-files.ts
```

- [ ] **Step 2: Verify no remaining imports reference deleted files**

Run: `grep -r "publish-success-modal\|use-publishing\|template-files\|convex/publish" src/ convex/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v __tests__`
Expected: No results (all references were removed in Tasks 5-6)

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete publish-related files (publish.ts, use-publishing, publish-success-modal, template-files)"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`
Expected: All 636+ tests pass (some may be removed, total may drop slightly)

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run the dev server briefly to verify no runtime crashes**

Run: `npm run dev` and verify no startup errors. Kill after confirming.

- [ ] **Step 4: Final commit if any fixes were needed**

If any type errors or test failures required fixes, commit them:
```bash
git add -A
git commit -m "fix: resolve type errors and test failures from publish removal"
```
