# Code Analysis Complete: Issues #1, #4, #7, #10

## Executive Summary

Comprehensive analysis of the builder preview pipeline and SSE streaming code has identified four interconnected bugs:

1. **Issue #1 (CRITICAL):** Parcel build exceptions are caught and silently swallowed
2. **Issue #4 (HIGH):** Contradictory state messages sent to client ("ready" + "failed" simultaneously)
3. **Issue #7 (MEDIUM):** Type safety issue with buildDir non-null assertion in flashcard mode
4. **Issue #10 (MEDIUM):** SSE parser coerces null values to empty strings, losing error signals

---

## Quick Reference: Critical Files

| File | Lines | Issue(s) |
|------|-------|----------|
| `src/app/api/generate/route.ts` | 104-106, 131-140, 191-224, 274-278 | #1, #4, #7 |
| `src/features/builder/hooks/use-streaming.ts` | 158-159, 161-166 | #4, #10 |
| `src/core/sse-events.ts` | 34, 46, 48 | #10 |
| `artifacts/wab-scaffold/index.html` | 14 | #1 (supporting) |
| `src/features/builder/lib/agent-prompt.ts` | 250 | #1 (supporting) |

---

## Issue Summaries with Line References

### ISSUE #1: Parcel Build Failure Silently Swallowed

**Location:** `src/app/api/generate/route.ts:191-224` (esp. 215-217)

**The Problem:**
```typescript
215  } catch (buildError) {
216    console.error("[generate] Parcel build failed:", buildError);
217    send("activity", { type: "complete", message: "Build failed — check the Code panel for your files" });
218    // Don't throw — still persist files and send done event
219  }
```

Build errors are:
- Logged to server console only (line 216)
- Sent as activity event (not an error event)
- Never tracked in `buildSucceeded` flag
- Falls through to send "done" event as if successful

**Root Cause Chain:**
1. LLM skips writing `src/App.tsx` (despite line 250 prompt instruction)
2. Parcel runs (line 191: `if (collectedFiles.size > 0)`)
3. Parcel fails finding App.tsx
4. Exception caught (line 215), logged, but not handled
5. "done" event sent with wrong buildFailed value (see Issue #4)
6. Client shows blank preview

**What Files Are Missing:**
- `artifacts/wab-scaffold/index.html` (line 14) expects `/src/main.tsx`
- `artifacts/wab-scaffold/src/main.tsx` (line 4) imports `./App.tsx`
- **LLM must write `src/App.tsx`** but validation in `agent-tools.ts:24-36` doesn't enforce it

---

### ISSUE #4: Contradictory State Messages

**Location 1:** `src/app/api/generate/route.ts:274-278`
**Location 2:** `src/features/builder/hooks/use-streaming.ts:161-166`

**The Problem:**
```typescript
// route.ts line 276-278:
send("activity", { type: "complete", message: "App is ready!" });
send("status", { status: "live" });
send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && collectedFiles.size > 0 });

// use-streaming.ts line 161-166:
case "done":
  // Flush any buffered tokens before marking as live
  ...
  setStatus("live");
  if (sseEvent.sessionId) setSessionId(sseEvent.sessionId);
  break;
```

**Contradiction Scenario:**
1. Files written to `collectedFiles` Map
2. Parcel build fails (Issue #1)
3. Line 276: "App is ready!" activity sent
4. Line 277: status="live" sent
5. Line 278: buildFailed=true sent (correct calculation)
6. Hook receives "done" and sets status="live"
7. **UI shows:** "Ready" + status="live" + buildFailed=true
8. **User sees:** CONTRADICTION

**Root Cause:**
- Line 276-277 sent before checking buildFailed
- buildFailed is in "done" event but not checked by hook before setting "live"
- No "error" event sent for build failures

**The Wrong Calculation (Line 278):**
```typescript
buildFailed: !buildSucceeded && collectedFiles.size > 0
```
- ✗ False when build fails but no files written
- ✓ True when build fails and files exist
- Cannot distinguish generation-only vs build-failed

---

### ISSUE #7: Undefined buildDir in Flashcard Mode

**Location:** `src/app/api/generate/route.ts:104-140` (esp. 139)

**The Problem:**
```typescript
104  let buildDir: string | undefined;
105  let buildSucceeded = false;

131  if (!isFlashcardMode) {
132    buildDir = mkdtempSync(...);
133    await cp(..., buildDir, ...);
134  }

138  const tools = isFlashcardMode
139    ? createFlashcardTools({ send, sessionId, convex })
140    : createAgentTools({ send, sessionId, collectedFiles, convex, buildDir: buildDir! });
```

**The Issue:**
- Line 139: Non-null assertion `buildDir!` forces TypeScript to ignore undefined
- In flashcard mode, buildDir **remains undefined**
- Line 140 passes undefined buildDir to `createAgentTools` (though not used)
- This is a **type safety lie** — assertion says "definitely a string" but isn't

**Why No Runtime Error:**
- Flashcard mode (line 138) doesn't call createAgentTools
- Builder mode (line 140) does, and buildDir is defined
- Different tools based on mode hide the problem

**Risk:**
- If refactored to use buildDir elsewhere or for flashcard tools, **will crash**
- TypeScript's type safety is compromised by the `!` assertion

---

### ISSUE #10: SSE Parser Null Coercion

**Location 1:** `src/core/sse-events.ts:22-54` (esp. lines 34, 46)
**Location 2:** `src/features/builder/hooks/use-streaming.ts:158-159`

**The Problem:**
```typescript
// sse-events.ts line 34:
case "file_complete":
  return { event: "file_complete", path: String(d.path ?? ""), contents: String(d.contents ?? "") };

// sse-events.ts line 46:
case "bundle":
  return { event: "bundle", html: String(d.html ?? "") };

// use-streaming.ts line 158-159:
case "bundle":
  setBundleHtml(sseEvent.html);  // Could be ""
  onBundleRef.current?.(sseEvent.html);
  break;
```

**The Coercion:**
- `String(null ?? "")` → `""`
- `String(undefined ?? "")` → `""`
- `String(value ?? "")` where value is undefined → `""`

**Consequence:**
Cannot distinguish:
- No bundle event sent → bundleHtml stays `undefined`
- Server sent `{ "html": null }` → bundleHtml becomes `""`
- Server sent `{ "html": "" }` → bundleHtml becomes `""`

**Impact:**
- UI cannot reliably show "no bundle" vs "empty bundle" vs "error during bundle"
- Empty string is truthy in conditionals: `if (bundleHtml)` would be true even for error case
- Type signature (line 14 of sse-events.ts) requires `html: string` (never null), so type system doesn't warn about this

---

## Cross-Issue Dependencies

**Issue #1 → Issue #4:**
- Build failure (Issue #1) doesn't set buildSucceeded=true
- buildFailed calculation (Issue #4) depends on buildSucceeded value
- Together they cause contradictory messages

**Issue #4 → Issue #10:**
- buildFailed flag would be communicated via "done" event
- But if bundleHtml is coerced to "" (Issue #10), UI can't tell if bundle is empty or missing

**Issue #7 is isolated but risky:**
- Doesn't cause bugs today (different tools branch)
- Will cause crashes if refactored

---

## Data Flow Diagram

```
LLM Generation (Agent Prompt line 250)
    ↓ (LLM may skip writing src/App.tsx)
    ↓
collectedFiles Map populated
    ↓
Parcel Build (line 191-224)
    ├─ Try: execAsync("parcel build...")
    ├─ Success: buildSucceeded=true, send "bundle" (GOOD PATH)
    └─ Fail: catch block logs, falls through silently (ISSUE #1)
    ↓
Send "done" event (line 278)
    ├─ buildFailed = !buildSucceeded && collectedFiles.size > 0
    ├─ Send "status"="live" (line 277)
    └─ Send "activity"="ready" (line 276) ← PREMATURE (ISSUE #4)
    ↓
Hook receives "done" (use-streaming.ts line 161)
    ├─ Sets status="live" (line 165)
    └─ Already shows "ready" message (ISSUE #4)
    ↓
Bundle event (line 158-159)
    ├─ If received: setBundleHtml(coerced string) (ISSUE #10)
    └─ If not received: bundleHtml stays undefined
```

---

## Recommended Fix Order

1. **CRITICAL:** Fix Issue #1 (Parcel error handling)
   - Track buildSucceeded properly
   - Send "error" event on Parcel failure
   - Don't send "done" as success if build failed

2. **HIGH:** Fix Issue #4 (State machine)
   - Don't send "ready" message until build confirmed
   - Only send "live" status after bundle or confirmed no files

3. **MEDIUM:** Fix Issue #10 (SSE coercion)
   - Return `html: string | null` in SSEEvent type
   - Don't coerce null to empty string
   - Update use-streaming.ts to handle null

4. **LOW:** Fix Issue #7 (Type safety)
   - Use proper type narrowing instead of `!` assertion
   - Move buildDir creation into ternary or conditional block

---

## Files for Review (with absolute paths)

### Code Paths to Fix
- `/Users/desha/Springfield-Vibeathon/src/app/api/generate/route.ts` (lines 104-106, 131-140, 191-224, 274-278)
- `/Users/desha/Springfield-Vibeathon/src/features/builder/hooks/use-streaming.ts` (lines 158-159, 161-166)
- `/Users/desha/Springfield-Vibeathon/src/core/sse-events.ts` (lines 22-54)
- `/Users/desha/Springfield-Vibeathon/src/features/builder/lib/agent-tools.ts` (lines 24-36)

### Supporting Files
- `/Users/desha/Springfield-Vibeathon/artifacts/wab-scaffold/index.html` (lines 1-16)
- `/Users/desha/Springfield-Vibeathon/artifacts/wab-scaffold/src/main.tsx` (lines 1-10)
- `/Users/desha/Springfield-Vibeathon/artifacts/wab-scaffold/src/App.tsx` (template)
- `/Users/desha/Springfield-Vibeathon/src/features/builder/lib/agent-prompt.ts` (line 250)

---

## Analysis Documents Location

- Main Analysis: `/Users/desha/Springfield-Vibeathon/Docs/plans/code-analysis-issues-1-4-7-10.md`
- File Contents: `/Users/desha/Springfield-Vibeathon/Docs/plans/full-file-contents-reference.md`
- This Summary: `/Users/desha/Springfield-Vibeathon/Docs/plans/ANALYSIS_SUMMARY.md`

