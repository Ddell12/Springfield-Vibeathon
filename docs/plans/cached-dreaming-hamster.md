# Plan: Iterative Multi-Turn Builder Chat

## Context

The builder chat currently operates as a one-shot pipeline: each message triggers a full regeneration from scratch with no awareness of prior code or conversation. Users can't say "change the background color" — Claude starts over every time. Additionally, follow-up user messages and Claude's actual responses are never persisted, so chat history is lost.

**Root causes:**
1. `stream-generation.ts:68` sends Claude `messages: [{ role: "user", content }]` — a single message, no history, no existing files
2. `route.ts:95` only calls `persistUserMessage()` on the first message (`!providedSessionId`)
3. `session-lifecycle.ts:54-58` saves canned strings ("Your app is ready!") instead of Claude's actual response
4. `stream-generation.ts:39-42` copies a fresh WAB scaffold each time — existing files are never loaded into the build dir
5. `use-streaming.ts:148-161` `START_GENERATION` clears all files/bundle on every request

**Goal:** Convert to a Lovable-style iterative chat where follow-ups edit specific files, not rebuild from scratch.

---

## Changes (ordered by dependency)

### 1. Remove canned assistant messages
**File:** `src/app/api/generate/lib/session-lifecycle.ts`

- In `completeSession()`, remove the block that creates "Your app is ready!" / "Your flashcards are ready!" messages (lines 53-67)
- The UI already shows a green "Your app is ready!" banner in `chat-panel.tsx:183-196`, so this is redundant
- These canned messages pollute conversation history sent to Claude on follow-ups

### 2. Always persist user messages + save Claude's actual response
**File:** `src/app/api/generate/route.ts`

- **Remove** the `if (!providedSessionId)` guard on line 95 — always call `persistUserMessage(convex, sessionId, query)`
- **After** `streamGeneration()` returns, persist Claude's accumulated text as an assistant message:
  ```ts
  if (result.streamingText.trim()) {
    await convex.mutation(api.messages.create, {
      sessionId, role: "assistant",
      content: result.streamingText,
      timestamp: Date.now(),
    });
  }
  ```

### 3. Build conversation history + pre-populate files (core change)
**File:** `src/app/api/generate/lib/stream-generation.ts`

**3a. Update `StreamResult` to include streaming text:**
```ts
export interface StreamResult {
  collectedFiles: Map<string, string>;
  buildDir: string | undefined;
  streamingText: string; // NEW
}
```

**3b. Accumulate Claude's text in the streaming loop:**
- Add `let streamingText = ""` alongside `collectedFiles`
- In the event loop, when `text_delta` fires, append to `streamingText`
- Return it in the result

**3c. Fetch conversation history + existing files:**
Before constructing the Claude `messages` array:
```ts
const history = await convex.query(api.messages.list, { sessionId });
const existingFiles = await convex.query(api.generated_files.list, { sessionId });
const isFollowUp = existingFiles.some(f => f.path !== "_bundle.html");
```

**3d. Pre-populate build directory with existing files:**
If `isFollowUp`, write existing session files into the temp dir so Claude's `read_file`/`list_files` tools see the current state and esbuild can bundle the full file set:
```ts
for (const file of existingFiles) {
  if (file.path === "_bundle.html") continue;
  const fullPath = join(buildDir, file.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, file.contents, "utf-8");
  collectedFiles.set(file.path, file.contents);
}
```

**3e. Construct multi-turn `messages` array:**
```ts
// Filter out canned/system messages
const CANNED = ["Your app is ready!", "Your flashcards are ready!", "preview needs a small fix"];
const conversationMsgs = history
  .filter(m => m.role === "user" || m.role === "assistant")
  .filter(m => !CANNED.some(c => m.content.includes(c)))
  .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

let messages: Array<{ role: "user" | "assistant"; content: string }>;

if (isFollowUp) {
  // Include file context as the first user message
  const fileContext = existingFiles
    .filter(f => f.path !== "_bundle.html")
    .map(f => `### ${f.path}\n\`\`\`tsx\n${f.contents}\n\`\`\``)
    .join("\n\n");

  messages = [
    { role: "user", content: `Here are the current files in my app:\n\n${fileContext}` },
    { role: "assistant", content: "I can see all your current files. What would you like me to change?" },
    ...conversationMsgs.slice(1), // skip original prompt (redundant with file context)
    { role: "user", content: query },
  ];
} else {
  messages = [{ role: "user", content: userContent }];
}
```

**3f. Context size guard:**
Cap total message content at ~120K characters. If exceeded, keep only the file context message + last 10 conversation turns.

### 4. Add edit-mode instructions to system prompt
**File:** `src/features/builder/lib/agent-prompt.ts`

- Add `isFollowUp?: boolean` parameter to `buildSystemPrompt()`
- When `isFollowUp`, append this section to the system prompt:

```
## Edit Mode — Modifying an Existing App

You are modifying an existing therapy app, NOT creating a new one.

### Rules:
- The user's current files are provided at the start of the conversation.
- Only rewrite files that need to change. Do NOT regenerate untouched files.
- Do NOT call set_app_name unless the user explicitly asks to rename.
- Use read_file to inspect files before modifying if unsure of current state.
- Write COMPLETE file contents when modifying — no partial snippets.
- For small changes (color, text, image), modify only the affected file(s).
- Preserve all existing functionality unless told to remove it.
- Keep explanation text SHORT — one sentence about what you changed.
```

### 5. Frontend: preserve state on follow-up generations
**File:** `src/features/builder/hooks/use-streaming.ts`

**5a. Add `START_FOLLOW_UP` action to reducer:**
```ts
case "START_FOLLOW_UP":
  return {
    ...state,
    error: null,
    status: "generating",
    streamingText: "",
    activities: [],
    buildFailed: false,
    notableMessage: null,
    // files, bundleHtml, appName, sessionId PRESERVED
  };
```

**5b. Add `statusRef` to track current status:**
```ts
const statusRef = useRef(state.status);
useEffect(() => { statusRef.current = state.status; }, [state.status]);
```

**5c. In `generate()`, choose action based on follow-up detection:**
```ts
const isFollowUp = sessionIdRef.current != null && statusRef.current === "live";
dispatch({ type: isFollowUp ? "START_FOLLOW_UP" : "START_GENERATION" });
```

This keeps the preview visible during follow-up edits instead of flashing blank.

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/generate/lib/session-lifecycle.ts` | Remove canned assistant messages |
| `src/app/api/generate/route.ts` | Always persist user messages + save Claude's response |
| `src/app/api/generate/lib/stream-generation.ts` | Conversation history, file pre-population, text accumulation |
| `src/features/builder/lib/agent-prompt.ts` | Add edit-mode prompt section |
| `src/features/builder/hooks/use-streaming.ts` | `START_FOLLOW_UP` action, statusRef |

## Files NOT Modified (no changes needed)

- `convex/schema.ts` — messages + files tables already support this
- `convex/messages.ts` — CRUD mutations already exist
- `convex/generated_files.ts` — upsertAutoVersion already handles updates
- `convex/sessions.ts` — `live → generating` already permitted
- `src/features/builder/components/chat-panel.tsx` — already reads from Convex messages, already has follow-up UI
- `src/features/builder/lib/agent-tools.ts` — read_file/write_file/list_files already work
- `scripts/bundle-worker.mjs` — esbuild bundles whatever is in the build dir

## Edge Cases

1. **Old sessions with canned messages**: The `CANNED` filter strips them from history sent to Claude
2. **Large file context**: 120K char cap with truncation to last 10 turns
3. **Backward compatibility**: No schema changes; existing sessions work unchanged
4. **Concurrent generation**: State machine already blocks `generating → generating`
5. **First message vs follow-up**: Clean detection via `existingFiles.length > 0`

## Verification

1. **New session**: Create a new app from scratch — should work identically to today
2. **Follow-up edit**: After app is live, type "change the background to blue" — should modify only affected file(s), not rebuild everything
3. **Chat persistence**: Reload the page, navigate back to session — all user messages and Claude's responses should appear
4. **Preview continuity**: During follow-up generation, the existing preview should stay visible (not flash blank)
5. **Multiple iterations**: Send 3-4 follow-ups in a row — conversation history should accumulate correctly
6. **Run tests**: `npm test` to verify no regressions
