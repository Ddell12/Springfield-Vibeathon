# Bug Fix Plan: Preview, Streaming, UI & Security Issues

## Context

Bridges has 11 bugs discovered during E2E testing and code analysis. They range from blank previews and hanging spinners (HIGH) to missing copy feedback and XSS risks (MEDIUM/LOW). The root causes are well-understood: fire-and-forget mutations, blob URL race conditions, missing SSE error events, unhandled URL params, and absent sanitization.

This plan fixes all 11 issues in 5 grouped batches, ordered by dependency and risk.

---

## Group A — SSE Pipeline (`src/app/api/generate/route.ts`)

### Fix 1: Await bundle persistence (blank preview on resume)
**File:** `src/app/api/generate/route.ts:198-203`

The `_bundle.html` Convex mutation is fire-and-forget. If it fails silently, session resume has no bundle to display.

**Change:** `await` the mutation. On failure, send an activity warning (current session still works because the `send("bundle", ...)` on line 197 already pushed HTML to the client).

```typescript
// Replace lines 198-203:
try {
  await convex.mutation(api.generated_files.upsertAutoVersion, {
    sessionId, path: "_bundle.html", contents: bundleHtml,
  });
} catch (err) {
  console.error("[generate] Failed to persist bundle:", err);
  send("activity", { type: "thinking", message: "Warning: app may not load on resume" });
}
```

### Fix 3a: Surface build failures to client (server side)
**File:** `src/app/api/generate/route.ts:183-209`

When Parcel build fails, an "activity" message is sent but the stream still ends with a `done` event → status goes to `"live"` → blank preview with no explanation.

**Change:** Track build success with a boolean. Include `buildFailed` flag in the `done` event.

- Add `let buildSucceeded = false;` before line 183
- Set `buildSucceeded = true;` after the `send("bundle", ...)` call (line 197)
- Change the catch block activity (line 206) to type `"complete"` with message: `"Build failed — check the Code panel for your files"`
- On line 269, change to: `send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && collectedFiles.size > 0 });`

### Fix 9: Rate limit IP source
**File:** `src/app/api/generate/route.ts:68`

`x-forwarded-for` is user-spoofable. Vercel sets `x-real-ip` which cannot be forged.

**Change line 68:**
```typescript
const ip = request.headers.get("x-real-ip")
  ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? "anonymous";
```

---

## Group B — Preview & Streaming Client

### Fix 2: Blob URL race condition (intermittent error boundary)
**File:** `src/features/builder/components/preview-panel.tsx:22-33`

When `bundleHtml` changes, React creates a new blob URL via `useMemo` then the `useEffect` cleanup revokes the old one — but the iframe may still be loading from it.

**Change:** Replace the current `useEffect` cleanup with delayed revocation using `useRef`:

```typescript
const prevBlobUrlRef = useRef<string | null>(null);

useEffect(() => {
  const prevUrl = prevBlobUrlRef.current;
  prevBlobUrlRef.current = blobUrl;
  if (prevUrl && prevUrl !== blobUrl) {
    const timer = setTimeout(() => URL.revokeObjectURL(prevUrl), 200);
    return () => clearTimeout(timer);
  }
}, [blobUrl]);

// Cleanup on unmount only
useEffect(() => {
  return () => {
    if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current);
  };
}, []);
```

Remove the existing `useEffect` at lines 29-33.

### Fix 3b: Show "build failed" state in preview (client side)
**File:** `src/features/builder/components/preview-panel.tsx:79-84`

Split the empty-state render branch: when `state === "live"` but no `bundleHtml`, show a build-failed message instead of the generic placeholder.

```tsx
{!hasPreview && !isGenerating && !isFailed && state === "live" && (
  <div className="flex flex-col items-center gap-3 text-amber-600">
    <AlertCircle className="h-8 w-8" />
    <p className="text-sm font-medium">Build could not produce a preview</p>
    <p className="text-xs text-muted-foreground">Check the Code panel for your generated files</p>
  </div>
)}

{!hasPreview && !isGenerating && !isFailed && state !== "live" && (
  <div className="flex flex-col items-center gap-3 text-muted-foreground">
    <Monitor className="h-12 w-12 opacity-20" />
    <p className="text-sm">Your app will appear here</p>
  </div>
)}
```

### SSE type update
**File:** `src/core/sse-events.ts:15`

Add `buildFailed?: boolean` to the `done` event type and parser:
- Type: `{ event: "done"; sessionId?: string; files?: ...; buildFailed?: boolean }`
- Parser (line 48): add `buildFailed: d.buildFailed as boolean | undefined`

---

## Group C — Builder Page (`src/features/builder/components/builder-page.tsx`)

### Fix 4: Show actual publish error message
**File:** `src/features/builder/components/builder-page.tsx:197-199`

Currently shows generic "Publishing failed. Please try again." — the actual Convex error (e.g., "Vercel deployment not configured") is swallowed.

**Change:**
- Add import: `import { extractErrorMessage } from "@/core/utils";`
- Line 199: `toast.error(extractErrorMessage(err));`

### Fix 5: Template click creates fresh session
**File:** `src/features/builder/components/builder-page.tsx:136-161` and `src/features/dashboard/components/templates-tab.tsx:67`

Templates link to `/builder?template=token-board` but builder-page only handles `?prompt=` and `?sessionId=`. The `?template=` param is ignored and auto-resume shows the previous session.

**Simplest fix:** Change `templates-tab.tsx` to use `?prompt=` with the template description as the prompt text. This leverages the existing prompt auto-submit flow with zero changes to builder-page.

**Change in `templates-tab.tsx` line 67:**
```tsx
href={`/builder?prompt=${encodeURIComponent(`Build me a ${template.title}: ${template.subtitle}`)}`}
```

**Also** add `!searchParams.get("prompt")` is already in the auto-resume guard (line 153 checks `!promptFromUrl`), so no changes needed there.

---

## Group D — UI Polish

### Fix 6: Copy button visual feedback
**File:** `src/features/sharing/components/share-dialog.tsx`

The `copyToClipboard` utility already shows a toast, but the button itself has no visual state change.

**Changes:**
- Add `const [copied, setCopied] = useState(false);` after line 33
- Update `handleCopy`: add `setCopied(true); setTimeout(() => setCopied(false), 2000);`
- Update copy button (line 119): icon `{copied ? "check" : "content_copy"}`, text `{copied ? "Copied!" : "Copy Link"}`

### Fix 7: Dropdown event propagation on project cards
**File:** `src/features/dashboard/components/project-card.tsx:55-141`

The entire card is a `<Link>`, so clicks inside the dropdown sometimes navigate instead of opening the menu.

**Change:** Replace `<Link>` wrapper with `<div>` using programmatic navigation:
- Add `import { useRouter } from "next/navigation";`
- Replace `<Link href={...}>` with `<div role="link" tabIndex={0} onClick={() => router.push(...)} onKeyDown={...}>`
- The dropdown's existing `e.stopPropagation()` will now reliably prevent navigation

### Fix 8: XSS in markdown rendering
**File:** `src/features/builder/components/chat-panel.tsx:38`

`ReactMarkdown` has no sanitization — LLM output could inject malicious HTML.

**Changes:**
- Install: `npm install rehype-sanitize`
- Add import: `import rehypeSanitize from "rehype-sanitize";`
- Line 38: `<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>`

---

## Group E — Backend (`convex/sessions.ts`)

### Fix 11: Cascade delete may leave orphans
**File:** `convex/sessions.ts:92-125`

The `remove` mutation uses `.take(1000)` for messages — sessions with >1000 messages leave orphans.

**Change:** Replace single `.take()` with a `while` loop:
```typescript
while (true) {
  const batch = await ctx.db.query("messages")
    .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
    .take(500);
  if (batch.length === 0) break;
  for (const msg of batch) await ctx.db.delete(msg._id);
}
```
Same pattern for files. Apps can keep `.take(10)` since sessions have at most 1 app.

---

## Out of Scope (Deferred)

These are acknowledged but intentionally deferred:

| Issue | Reason |
|-------|--------|
| Missing auth checks on mutations | Phase 6 auth milestone — single-user demo mode by design |
| No ownership verification on publish | Depends on auth implementation |
| My Apps tab empty (no userId) | Depends on auth — "Recent" tab shows all sessions meanwhile |
| Unsafe iframe sandbox | Current `allow-scripts allow-same-origin` is documented and CSP-restricted; revisit in Phase 6 |
| Flashcard cardCount race conditions | Convex mutations are serialized per-document, so OCC handles this; low real-world risk |
| Unbounded query results | `.take(50)` is sufficient for demo; pagination is Phase 5 |

---

## Implementation Order

1. **Group A** (route.ts) — server-side fixes, lowest risk
2. **Group E** (sessions.ts) — backend cascade fix, isolated
3. **Group D** (share-dialog, project-card, chat-panel) — UI polish, independent
4. **Group B** (preview-panel, sse-events) — blob URL fix + build-failed state
5. **Group C** (builder-page, templates-tab) — publish error + template flow

## Verification

### Automated
```bash
npm install rehype-sanitize        # Fix 8 dependency
npm test                           # All 627+ unit tests must pass
npx playwright test                # E2E regression suite
```

### Manual (via /agent-browser after implementation)
1. **Fix 1/3:** Generate an app → verify preview loads. Resume the session → verify preview still loads
2. **Fix 2:** Rapidly switch between sessions → verify no error boundary crash
3. **Fix 4:** Attempt publish without VERCEL_TOKEN → verify toast shows "Vercel deployment not configured"
4. **Fix 5:** Click a template card from dashboard → verify fresh generation starts (not auto-resume)
5. **Fix 6:** Click "Copy Link" in share dialog → verify checkmark icon appears for 2 seconds
6. **Fix 7:** Hover project card → click dropdown → verify card does NOT navigate
7. **Fix 8:** Verify markdown renders safely (no script tags in output)
8. **Fix 9:** Verify rate limiting still works
9. **Fix 11:** Delete a session → verify no orphaned records

## Critical Files

| File | Fixes |
|------|-------|
| `src/app/api/generate/route.ts` | 1, 3a, 9 |
| `src/features/builder/components/preview-panel.tsx` | 2, 3b |
| `src/core/sse-events.ts` | 3 (type update) |
| `src/features/builder/components/builder-page.tsx` | 4 |
| `src/features/dashboard/components/templates-tab.tsx` | 5 |
| `src/features/sharing/components/share-dialog.tsx` | 6 |
| `src/features/dashboard/components/project-card.tsx` | 7 |
| `src/features/builder/components/chat-panel.tsx` | 8 |
| `convex/sessions.ts` | 11 |
