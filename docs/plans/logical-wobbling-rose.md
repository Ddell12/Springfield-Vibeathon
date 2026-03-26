# Plan: 10X Perceived Speed, Hide Technical Output, Fix Code Panel

## Context

The Bridges builder has three UX problems that compound to make the experience feel slow and developer-facing rather than therapist-friendly:

1. **Code panel shows empty files** — the `file_complete` SSE event sends only the file path, not contents, so the Code view is blank
2. **Technical jargon floods the chat** — Claude's raw reasoning tokens stream unfiltered into the chat panel, exposing React/TypeScript implementation details to non-technical users
3. **Generation feels slow (~20s)** — a redundant design review pass (second full Claude API call) adds 3-8s, esbuild bundling has zero progress feedback for 2-8s, and the user must manually click to see the preview

All three fixes touch 5 existing files with no new files needed.

---

## Changes

### 1. Fix Code Panel — include file contents in SSE event

**File: `src/features/builder/lib/agent-tools.ts`** (line 129)

```diff
- ctx.send("file_complete", { path }); // path only, no contents
+ ctx.send("file_complete", { path, contents });
```

The `contents` param is already in scope. The SSE type (`sse-events.ts` line 8) already declares `contents?: string`. The client handler (`use-streaming.ts` line 145) already destructures it with a default. This single change flows contents through the entire pipeline.

Also update the activity message (line 130) to include a running file count for perceived speed:

```diff
- ctx.send("activity", { type: "file_written", message: `Wrote ${path}`, path });
+ const fileCount = ctx.collectedFiles.size;
+ ctx.send("activity", { type: "file_written", message: `Built ${path} (${fileCount} file${fileCount > 1 ? "s" : ""})`, path });
```

---

### 2. Hide technical output from chat panel

**File: `src/features/builder/components/chat-panel.tsx`**

Replace the raw streaming text display (lines 168-171) with a friendly activity-based progress indicator:

```diff
- {/* Streaming assistant text */}
- {isGenerating && streamingText && (
-   <AssistantBubble content={streamingText} isStreaming />
- )}
+ {/* Activity-based progress — no raw Claude text */}
+ {isGenerating && activities.length > 0 && (
+   <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3">
+     <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />
+     <span className="text-sm text-on-surface-variant">
+       {activities[activities.length - 1]?.message ?? "Building your app..."}
+     </span>
+   </div>
+ )}
```

Remove the redundant "Thinking..." block (lines 152-157) since the new progress display covers all generation states.

**File: `src/app/api/generate/route.ts`** (lines 404-413)

Replace raw assistantText persistence with a friendly summary:

```diff
- if (assistantText.trim()) {
-   postLlmPromises.push(
-     convex.mutation(api.messages.create, {
-       sessionId,
-       role: "assistant",
-       content: assistantText.trim(),
-       timestamp: Date.now(),
-     }),
-   );
- }
+ if (fileArray.length > 0) {
+   const friendlyMsg = `I built your app with ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. ${buildSucceeded ? "It's ready to use!" : "Check the preview for details."}`;
+   postLlmPromises.push(
+     convex.mutation(api.messages.create, {
+       sessionId,
+       role: "assistant",
+       content: friendlyMsg,
+       timestamp: Date.now(),
+     }),
+   );
+ }
```

---

### 3. Eliminate the design review pass (saves 3-8s)

**File: `src/app/api/generate/route.ts`** (lines 167-191)

Delete the entire design review block:

```diff
  if (!isFlashcardMode) {
-   // Design review pass — re-check generated files for visual polish
-   if (collectedFiles.size > 0) {
-     send("activity", { type: "thinking", message: "Polishing design..." });
-     const reviewTools = tools.filter(t => t.name === "write_file");
-     const reviewRunner = anthropic.beta.messages.toolRunner({
-       model: "claude-sonnet-4-6",
-       max_tokens: 8192,
-       system: DESIGN_REVIEW_PROMPT,
-       tools: reviewTools,
-       messages: buildReviewMessages(collectedFiles),
-       stream: true,
-       max_iterations: 3,
-     });
-     for await (const messageStream of reviewRunner) {
-       for await (const event of messageStream) {
-         if (
-           event.type === "content_block_delta" &&
-           event.delta.type === "text_delta"
-         ) {
-           send("token", { token: event.delta.text });
-         }
-       }
-     }
-   }
```

**Why safe:** The main system prompt already contains extensive design rules (60+ lines covering backgrounds, buttons, icons, typography, layout, animations). The review pass mostly returns "LGTM" and adds a full Claude API round-trip.

Also clean up the now-unused import of `buildReviewMessages` and `DESIGN_REVIEW_PROMPT` from line 13.

---

### 4. Add bundling progress events & auto-switch to preview

**File: `src/app/api/generate/route.ts`**

Add granular activity events inside the esbuild block:

- After `esbuild.build()` completes (~line 246): `send("activity", { type: "thinking", message: "Compiled successfully, assembling preview..." });`
- After CSS processing (~line 273): `send("activity", { type: "thinking", message: "Processing styles..." });`
- Before bundle send (~line 350): `send("activity", { type: "thinking", message: "Almost ready..." });`

**File: `src/features/builder/components/builder-page.tsx`**

Auto-switch to preview when bundle arrives (add after line 62):

```typescript
// Auto-switch to preview when bundle is ready
useEffect(() => {
  if (bundleHtml && viewMode !== "preview") setViewMode("preview");
}, [bundleHtml, viewMode]);

useEffect(() => {
  if (bundleHtml && mobilePanel !== "preview") setMobilePanel("preview");
}, [bundleHtml, mobilePanel]);
```

---

### 5. Prompt refinement — minimize Claude's text output

**File: `src/features/builder/lib/agent-prompt.ts`** (near line 523 in CRITICAL REMINDERS)

Add:

```
- Keep text output MINIMAL. One short, friendly sentence per file at most (e.g., "Creating the main app layout"). Do NOT explain code, describe React patterns, or mention technical details. The user is a therapist or parent, not a developer.
- NEVER output a technical summary, file listing, or explanation after generating files. Just write the files silently.
```

---

## Files Modified (5 total)

| File | Changes |
|------|---------|
| `src/features/builder/lib/agent-tools.ts` | Add `contents` to file_complete event, file count in activity |
| `src/app/api/generate/route.ts` | Remove design review pass, friendly message persistence, bundling progress events |
| `src/features/builder/components/chat-panel.tsx` | Replace raw streaming text with activity progress, remove "Thinking..." block |
| `src/features/builder/components/builder-page.tsx` | Auto-switch to preview on bundle arrival |
| `src/features/builder/lib/agent-prompt.ts` | Add "minimize text output" instruction |

---

## Verification

1. **Code panel**: Generate an app → switch to Code view during generation → files should appear with full contents as they stream in. Copy/Download buttons should produce real code. Session resume should still load files correctly.

2. **No technical output**: Chat panel should show only activity messages during generation ("Built src/App.tsx (1 file)", "Compiled successfully..."), never raw Claude reasoning or code blocks. On session resume, assistant message should be "I built your app with 5 files. It's ready to use!" — not technical text.

3. **Speed**: Generation should be 3-8s faster (no design review pass). Activity messages should progress smoothly through building → bundling → ready. Preview should auto-appear when bundle arrives. Test on mobile too.

4. **Regression**: Generated apps should still be visually polished (the main prompt has all the design rules). Flashcard mode should be unaffected. Error states should still display correctly.
