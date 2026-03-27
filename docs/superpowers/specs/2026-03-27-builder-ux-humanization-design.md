# Builder UX Humanization Design

**Date:** 2026-03-27
**Status:** Approved
**Goal:** Replace technical jargon in the builder chat journey with warm, accessible language for therapists and parents of ASD children.

## Problem

The builder chat shows developer-facing information during app generation: file paths (`src/App.tsx`), technical event types (`Edited`, `Created`), build terminology (`Bundling`, `Build failed`), and raw error messages. The target audience — ABA therapists, speech therapists, and parents — don't know or care about files being edited. They care about getting a working therapy app with minimal cognitive load.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Code panel | Keep accessible but hide by default — "View source" button for power users |
| Activity message tone | Warm & narrative (friendly assistant narrating progress) |
| Error handling | Auto-retry build silently once; soft error only if retry fails |
| Generation feedback | Auto-advancing warm messages on 5s timer, independent of server events |

## Architecture: Message Translation Layer (Approach A)

Server-side (`agent-tools.ts`, `route.ts`) continues to emit technical SSE events for debugging/logging. A client-side translation layer converts them to user-facing language. This separation keeps server logs useful while giving users a warm experience.

### New File: `src/features/builder/lib/activity-messages.ts`

Pure function `mapActivityToUserMessage()` that translates technical activity events:

**SSE event structure note:** The SSE `event` field and the `type` field inside `activity` payloads are separate. For example, SSE `event: "activity"` with `data.type: "thinking"` is shown below as `activity(thinking)` for readability. The actual code will switch on `sseEvent.event` first, then `sseEvent.type` for activity sub-types.

| SSE Event | Activity Type | Technical Message | User Sees |
|---|---|---|---|
| `activity` | `thinking` | `"Understanding your request..."` | `"Reading your description..."` |
| `activity` | `writing_file` | `"Built src/App.tsx (2 files)"` | *(suppressed — timer narration takes over)* |
| `activity` | `file_written` | `"Built src/components/Foo.tsx (3 files)"` | *(suppressed)* |
| `status` | — | `status: "bundling"` | `"Putting everything together..."` |
| `status` | — | `status: "generating"` | *(no change — timer narration handles it)* |
| `activity` | `thinking` | `"Almost ready..."` | `"Almost there..."` |
| `activity` | `complete` | `"App is live and ready!"` | `"Your app is ready!"` |
| `image_generated` | — | `"Generated image: reward star"` | `"Creating pictures for your app..."` |
| `speech_generated` | — | `"Generated audio: \"Great job!\""` | `"Recording friendly voices..."` |
| `stt_enabled` | — | `"Speech input enabled"` | `"Voice input is ready!"` |
| `activity` | `complete` | `"Build failed: ..."` (message starts with "Build failed") | *(suppressed — auto-retry handles it)* |

**Disambiguating success vs. failure for `activity(complete)`:** The server sends `type: "complete"` for both success and failure. The translation layer distinguishes them by checking if `message.startsWith("Build failed")`. The `done` event's `buildFailed` flag is the authoritative source, but it arrives after the `activity:complete` event. Since the failure case is suppressed (auto-retry), the translation layer only needs to detect it to avoid showing it — the string match is sufficient.

File-level events (`writing_file`, `file_written`) are suppressed from the user entirely.

### New Hook: `src/features/builder/hooks/use-progress-narration.ts`

Runs independently of server events. When `status === "generating"`, cycles through warm messages on a 5-second interval:

```
Stage 1 (0-5s):   "Reading your description..."
Stage 2 (5-10s):  "Designing the layout..."
Stage 3 (10-15s): "Adding the fun parts..."
Stage 4 (15-20s): "Making it interactive..."
Stage 5 (20-25s): "Putting on the finishing touches..."
Stage 6 (25s+):   "Almost there..." (stays here until done)
```

Server events can **override** the timer when something genuinely notable happens (image generated, audio recorded, bundling started). After the override displays for 3 seconds, the timer resumes.

**Interface:**
```ts
// Re-uses existing types from use-streaming.ts — do not duplicate
import type { Activity, StreamingStatus } from "./use-streaming";

function useProgressNarration(
  status: StreamingStatus,
  activities: Activity[]
): string | null;
```

Returns `null` when idle/live. Returns the current warm message during generation.

**Accessibility:** The element displaying the narration message must use `aria-live="polite"` so screen readers announce stage transitions. Given the target audience includes parents who may use assistive technology, this is essential.

## Component Changes

### `chat-panel.tsx`

- **Remove** `FileBadges` import and rendering (currently lines 168-174)
- **Replace** activity message pill (lines 177-184) with narration-driven pill fed by `useProgressNarration`
- **String changes:**

| Current | New |
|---|---|
| `"Starting generation..."` | `"Reading your description..."` |
| `"App is live and ready!"` | `"Your app is ready!"` |
| `"Check the preview panel. Send a message to request changes."` | `"Try it out! Tell me if you'd like any changes."` |
| `"Something went wrong"` | `"We hit a small bump"` |
| raw `{error}` text | `"Want to try again?"` (hide raw error) |

### `preview-panel.tsx`

| Current | New |
|---|---|
| `"Building your app..."` | `"Creating your app..."` |
| `"Preview build failed"` | `"Something didn't look right"` |
| `"Build could not produce a preview"` | `"We're having trouble showing your app"` |
| `"The generated code had build errors. Try sending a follow-up message like \"fix the build errors\" to resolve."` | `"Want to try again? Just tap the button below."` |
| `"Check the Code panel for your generated files."` | *(remove)* |

`activityMessage` prop continues to be passed but now contains warm narration text.

### `builder-toolbar.tsx`

- **Remove** "Code" from the segmented control (`Preview` / `Code` toggle becomes just `Preview`)
- **Add** a small `<button>` with `code` icon and tooltip `"View source"` in the right section next to Share — only visible when `status === "live"` and files exist
- The `ViewMode` type (`"preview" | "code"`) and `onViewChange` prop remain unchanged — the "View source" button still calls `onViewChange("code")`. Only the UI entry point changes from a tab to a button.
- **String change:** `"Loading Live Preview..."` → `"Building your app..."`

### `code-panel.tsx`

Minimal change (now a power-user view):
- `"Generating your files..."` → `"Building..."`

### `builder-page.tsx`

- Wire `useProgressNarration` hook, pass its output instead of raw activities to `ChatPanel` and `PreviewPanel`
- Update `viewMode` logic: default to `"preview"` always, `"code"` only when user clicks "View source"

### `file-badges.tsx`

Not rendered in `ChatPanel` anymore. Left in codebase (tests reference it); can be cleaned up later.

## Auto-Retry on Build Failure

### Flow

```
Build fails → Wait 1s → Auto-retry bundle worker (same buildDir, no new LLM call)
  → Success? → Send bundle to client normally, user never knows
  → Fail again? → Show soft error: "We hit a small bump. Want to try again?"
                   "Try again" button triggers full re-generation
```

### Implementation in `route.ts`

The retry happens **inside** the existing `try` block that holds the build slot (before `release()` is called in `finally`). This means the slot is held for both attempts — no risk of another concurrent build stealing the slot between attempts. The trade-off is slightly longer slot hold time (~1s extra), which is acceptable since builds are fast and the limiter exists to cap memory, not latency.

```
try {
  const bundleHtml = await runBundleWorker(buildDir);
  // ... success path ...
} catch (buildError) {
  // First failure — retry silently
  try {
    await new Promise(r => setTimeout(r, 1000));
    const bundleHtml = await runBundleWorker(buildDir);
    // ... success path (same as above) ...
  } catch {
    // Second failure — give up gracefully
    // ... soft error path ...
  }
} finally {
  release(); // slot released after both attempts
}
```

Steps:
1. On first build failure, **don't send any error activity to the client**
2. Wait 1 second, then call `runBundleWorker(buildDir)` again (still holding the build slot)
3. If retry succeeds — proceed normally (send bundle, mark `buildSucceeded = true`)
4. If retry also fails — set `buildSucceeded = false`, send a soft activity: `"We're having a little trouble — your app may need a small tweak"`
5. The `done` event still carries `buildFailed: true` so the preview panel shows the retry button
6. The build slot is released in `finally` after both attempts complete

### Persisted Messages

- **Remove** the system message that lists file paths (`"Built 3 files: src/App.tsx, ..."`)
- **Keep** the assistant message but change to: `"Your app is ready! Try it out and let me know if you'd like any changes."`

## Files Touched

| File | Action |
|------|--------|
| `src/features/builder/lib/activity-messages.ts` | **New** — translation layer |
| `src/features/builder/hooks/use-progress-narration.ts` | **New** — timer-based warm narration |
| `src/features/builder/components/chat-panel.tsx` | **Modified** — remove FileBadges, use narration, soften strings |
| `src/features/builder/components/preview-panel.tsx` | **Modified** — soften all error/status strings |
| `src/features/builder/components/builder-toolbar.tsx` | **Modified** — Code tab → "View source" button |
| `src/features/builder/components/code-panel.tsx` | **Modified** — minimal string cleanup |
| `src/features/builder/components/builder-page.tsx` | **Modified** — wire narration hook, update viewMode logic |
| `src/app/api/generate/route.ts` | **Modified** — auto-retry, remove file list system message, soften assistant message |

### Persisted Messages (detail)

Two `messages.create` calls exist in `route.ts`:
1. **Assistant message** (lines 246-253): `"I built your app with N files..."` → **Change to:** `"Your app is ready! Try it out and let me know if you'd like any changes."`
2. **System message** (lines 258-265): `"Built 3 files: src/App.tsx, ..."` → **Remove entirely.** The file list serves no user purpose.

## Testing

- Existing unit tests for `FileBadges`, `ChatPanel`, `PreviewPanel`, `CodePanel`, `ThinkingIndicator`, `BuilderToolbar`, **`BuilderPage`** will need updates to match new strings and wiring changes
- New unit tests for `activity-messages.ts` (translation mapping, success/failure disambiguation)
- New unit tests for `useProgressNarration` hook (timer stages, override behavior, accessibility attributes)
- Manual E2E: verify generation flow shows warm messages, no file paths leak through, build failure auto-retries
