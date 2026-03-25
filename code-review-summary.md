 ---
  Code Review Summary

  Scope: 24 files changed in src/ (~2,069 lines), covering the SSE streaming route, builder UI, streaming hook,
  agent prompt system, and tests.

  Reviewers: security, performance, correctness, quality

  ---
  Critical Issues (1) — Must fix before demo

  ┌─────┬─────────────────────────────────────────────────────────────────┬──────────────────────┬─────────────┐
  │  #  │                             Finding                             │         File         │ Flagged By  │
  ├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────┼─────────────┤
  │     │ One setState per streamed token causes ~100 re-renders/sec —    │                      │             │
  │ 1   │ setStreamingText(prev + token) fires on every SSE chunk,        │ use-streaming.ts:105 │ Performance │
  │     │ triggering full ChatPanel re-renders including scroll effects.  │                      │             │
  │     │ Visible jank guaranteed during generation.                      │                      │             │
  └─────┴─────────────────────────────────────────────────────────────────┴──────────────────────┴─────────────┘

  Fix: Accumulate tokens in a useRef, flush to state via requestAnimationFrame (caps at 60 updates/sec).

  ---
  High Priority (5) — Should fix before merge

  ┌─────┬─────────────────────────────────────────────────────────────┬──────────────────────┬────────────────┐
  │  #  │                           Finding                           │         File         │   Flagged By   │
  ├─────┼─────────────────────────────────────────────────────────────┼──────────────────────┼────────────────┤
  │     │ sessionId in generate deps causes stale closure + identity  │                      │                │
  │ 2   │ churn — generate recreates when sessionId updates           │ use-streaming.ts:228 │ Performance +  │
  │     │ mid-stream, breaking memoization downstream and risking     │                      │ Correctness    │
  │     │ stale refs                                                  │                      │                │
  ├─────┼─────────────────────────────────────────────────────────────┼──────────────────────┼────────────────┤
  │     │ No auth on /api/generate — Completely unauthenticated       │                      │                │
  │ 3   │ endpoint. Anyone can POST and consume Anthropic credits     │ route.ts:20-38       │ Security       │
  │     │ ($$$) and pollute Convex data.                              │                      │                │
  ├─────┼─────────────────────────────────────────────────────────────┼──────────────────────┼────────────────┤
  │     │ Raw error messages leaked to client — error.message sent    │                      │                │
  │ 4   │ via SSE can expose Anthropic request IDs, Convex table      │ route.ts:186-199     │ Security       │
  │     │ names, deployment URLs.                                     │                      │                │
  ├─────┼─────────────────────────────────────────────────────────────┼──────────────────────┼────────────────┤
  │     │ No input length/type validation on query — No typeof check, │                      │                │
  │ 5   │  no max length. A 10MB string would be forwarded to the     │ route.ts:22-23       │ Security       │
  │     │ LLM.                                                        │                      │                │
  ├─────┼─────────────────────────────────────────────────────────────┼──────────────────────┼────────────────┤
  │     │ Duplicate user messages on retry — User message is          │                      │                │
  │ 6   │ persisted unconditionally before generation, so retrying on │ route.ts:52-57       │ Correctness    │
  │     │  the same session creates duplicates.                       │                      │                │
  └─────┴─────────────────────────────────────────────────────────────┴──────────────────────┴────────────────┘

  Fixes:
  - #2: Read sessionId from a useRef inside generate instead of closing over state.
  - #3: Add a basic shared-secret header check (X-Bridges-Key) or origin validation. (Clerk auth deferred to Phase
   6 per CLAUDE.md — flag as known risk.)
  - #4: Map errors to safe categories ("Generation failed — please try again"), log real errors server-side only.
  - #5: Add typeof query !== "string" || query.length > 2000 guard before processing.
  - #6: Check for existing user message before inserting, or only persist on new session creation.

  ---
  Medium Priority (8) — Fix soon

  ┌─────┬─────────────────────────────────────────────┬──────────────────────────────┬───────────────────────┐
  │  #  │                   Finding                   │             File             │      Flagged By       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │     │ ProgressSteps "thinking done" logic         │                              │                       │
  │ 7   │ triggers too early — activities.some(a =>   │ chat-panel.tsx:115-126       │ Correctness           │
  │     │ a.type !== "thinking") jumps visual states  │                              │                       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │     │ Auto-scroll fires on every token + activity │                              │                       │
  │ 8   │  — scrollIntoView("smooth") called tens of  │ chat-panel.tsx:230-232       │ Performance           │
  │     │ times/sec, causing jitter                   │                              │                       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │     │ version not fetched from session —          │                              │                       │
  │ 9   │ Multi-turn generations restart at version   │ route.ts:149                 │ Correctness           │
  │     │ 1, overwriting previous files               │                              │                       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │     │ Module-level activityCounter shared across  │                              │ Performance +         │
  │ 10  │ instances — IDs bleed across mounts,        │ use-streaming.ts:63          │ Correctness + Quality │
  │     │ StrictMode skips numbers                    │                              │                       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │     │ ProgressSteps re-renders on every token —   │                              │                       │
  │ 11  │ Not memoized, runs 4x .some() scans at      │ chat-panel.tsx:115-191       │ Performance           │
  │     │ streaming frequency                         │                              │                       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │ 12  │ as Id<"sessions"> cast bypasses type safety │ null` prop immediately cast  │ chat-panel.tsx:219    │
  │     │  — `string                                  │ back to Convex ID type       │                       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │     │ Prompt injection via raw query — User input │                              │                       │
  │ 13  │  sent verbatim to LLM, WebContainer sandbox │ route.ts:99                  │ Security              │
  │     │  partially mitigates                        │                              │                       │
  ├─────┼─────────────────────────────────────────────┼──────────────────────────────┼───────────────────────┤
  │     │ iframe sandbox uses allow-scripts +         │                              │                       │
  │ 14  │ allow-same-origin — MDN warns this          │ preview-panel.tsx:31-36      │ Security              │
  │     │ combination effectively defeats the sandbox │                              │                       │
  └─────┴─────────────────────────────────────────────┴──────────────────────────────┴───────────────────────┘

  ---
  Low Priority / Suggestions (9)

  ┌─────┬──────────────────────────────────────────────────────────┬──────────────────────────┬───────────────┐
  │  #  │                         Finding                          │           File           │  Flagged By   │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 15  │ Dead export previewUrl always null — Returned from hook  │ use-streaming.ts:73      │ Quality       │
  │     │ but never set; actual URL comes from useWebContainer     │                          │               │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 16  │ Orphaned ThinkingIndicator component — Never imported,   │ thinking-indicator.tsx   │ Quality       │
  │     │ duplicates loading UI in preview-panel                   │                          │               │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 17  │ Dead props onApprove/onEdit on BlueprintCard — From old  │ blueprint-card.tsx:10-11 │ Quality       │
  │     │ pipeline, never passed                                   │                          │               │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 18  │ Terminology: toolTitle should be appTitle per CLAUDE.md  │ share-dialog.tsx:21      │ Quality       │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 19  │ Terminology: projectName should be appName per CLAUDE.md │ builder-page.tsx:65-66   │ Quality       │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 20  │ Hardcoded bridges.app domain — Should use env var or     │ builder-page.tsx:137     │ Security +    │
  │     │ window.location.origin                                   │                          │ Quality       │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 21  │ Dead conditional defaultSize ternary always evaluates to │ builder-page.tsx:111     │ Quality       │
  │     │  70                                                      │                          │               │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 22  │ Streaming text bubble momentary duplicate on generation  │ chat-panel.tsx:300-302   │ Correctness   │
  │     │ complete                                                 │                          │               │
  ├─────┼──────────────────────────────────────────────────────────┼──────────────────────────┼───────────────┤
  │ 23  │ assistantText concatenation redundant —                  │ route.ts:103-106         │ Performance   │
  │     │ finalMessage.content already has the full text           │                          │               │
  └─────┴──────────────────────────────────────────────────────────┴──────────────────────────┴───────────────┘

  ---
  Positive Observations

  - Stream cleanup is correct — AbortController and reader are properly closed on abort. No memory leaks from
  unclosed streams.
  - Test quality is strong — Contracts are well-specified with meaningful assertions on user-visible behaviors.
  Good use of fireEvent over userEvent for clipboard tests (per CLAUDE.md gotcha).
  - Tool input validation improved — The diff adds runtime type checks on write_file tool inputs (typeof
  input.path === "string") with continue on invalid blocks. This is a good defensive pattern.
  - Error handling improved — The nested try/catch around setFailed in the error path prevents cascading failures
  during error persistence.
  - Activity events add observability — The new activity SSE events (thinking, writing_file, file_written,
  complete) give users real-time progress visibility.

  ---
  Priority Matrix for Demo Readiness

  MUST FIX (before demo):
    1. Token batching (rAF throttle)     — visible jank
    5. Input length validation            — cost protection
    4. Error message sanitization         — info leak

  SHOULD FIX (before sharing):
    2. sessionId ref pattern              — subtle bugs
    3. Auth gate (even a shared secret)   — credit abuse
    6. Duplicate message on retry         — data integrity

  NICE TO HAVE (polish):
    7-14. Medium items                    — UX + correctness
    15-23. Low items                      — cleanup + conventions

⏺ Review complete. 23 findings total across 4 reviewers — 1 Critical, 5 High, 8 Medium, 9 Low.

  The three most impactful fixes for your Vibeathon demo:

  1. Token batching (use-streaming.ts) — rAF throttle eliminates visible chat jank
  2. Input validation (route.ts) — typeof + length cap protects Anthropic credits
  3. Error sanitization (route.ts) — swap raw errors for user-safe messages