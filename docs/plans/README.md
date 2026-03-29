# Code Analysis: Builder Pipeline & SSE Streaming Issues

Complete analysis of Issues #1, #4, #7, #10 in the Springfield Vibeathon builder system.

## Documents

### 1. **ANALYSIS_SUMMARY.md** (START HERE)
Quick reference with:
- Executive summary of all 4 issues
- Quick reference table of critical files and line numbers
- Issue summaries with code snippets
- Cross-issue dependencies
- Data flow diagram
- Recommended fix order

**Use this to:** Understand the problems at a glance, see which files need changes

### 2. **code-analysis-issues-1-4-7-10.md** (DETAILED TECHNICAL)
In-depth analysis with:
- Full code path overview for each issue
- Line-by-line breakdown of problem zones
- Root cause chains
- Scaffold file expectations
- Scenario analysis (Issue #4)
- Summary table with severity levels

**Use this to:** Understand the exact mechanics of each bug, see how they interact

### 3. **full-file-contents-reference.md** (COMPLETE SOURCE)
Full file contents with line numbers:
- src/app/api/generate/route.ts (315 lines)
- src/features/builder/hooks/use-streaming.ts (347 lines)
- src/core/sse-events.ts (54 lines)
- src/features/builder/lib/agent-tools.ts (excerpt)
- artifacts/wab-scaffold/index.html (16 lines)
- src/features/builder/lib/agent-prompt.ts (excerpt)

**Use this to:** Reference exact line numbers and code while reviewing

---

## Quick Diagnosis

### Symptom: Blank Preview After Generation

**Code Path:**
1. LLM generates files
2. Parcel bundler runs (lines 191-224 in route.ts)
3. **ERROR:** Parcel fails silently → issue #1
4. **ERROR:** "done" event sent with wrong buildFailed → issue #4
5. Client shows "App is ready!" but bundleHtml is null
6. Preview shows blank

**Root Cause:** 
- Primary: Issue #1 (Parcel exception swallowed in catch block)
- Secondary: Issue #4 (contradictory state messages)
- Tertiary: Issue #10 (bundleHtml coerced to empty string)

---

## Issue Reference Card

| # | Severity | Problem | Location | Fix Priority |
|---|----------|---------|----------|--------------|
| 1 | CRITICAL | Parcel build exceptions caught, not tracked | route.ts:215-217 | 1st |
| 4 | HIGH | buildFailed calculation + premature "ready" message | route.ts:276-278, use-streaming.ts:161-166 | 2nd |
| 7 | MEDIUM | Type safety: non-null assertion on undefined buildDir | route.ts:139 | 4th |
| 10 | MEDIUM | SSE parser coerces null → empty string | sse-events.ts:34,46 | 3rd |

---

## File Change Matrix

| File | Issues | Lines | Change Type |
|------|--------|-------|-------------|
| src/app/api/generate/route.ts | #1, #4, #7 | 104-106, 131-140, 191-224, 274-278 | Logic fix, error handling |
| src/features/builder/hooks/use-streaming.ts | #4, #10 | 158-159, 161-166 | Event handler logic |
| src/core/sse-events.ts | #10 | 14, 34, 46, 48 | Type definition, parser |
| src/features/builder/lib/agent-tools.ts | #1 (supporting) | 24-36 | Validation enforcement |

---

## Related Files (Context Only)

These files don't need changes but help understand the issues:
- artifacts/wab-scaffold/index.html (expected entry point)
- artifacts/wab-scaffold/src/main.tsx (imports App.tsx)
- src/features/builder/lib/agent-prompt.ts (LLM instructions)
- src/core/sse-utils.ts (SSE chunk parsing)

---

## How to Use This Analysis

### For Implementers
1. Read **ANALYSIS_SUMMARY.md** to understand what needs fixing
2. Reference **code-analysis-issues-1-4-7-10.md** for detailed logic
3. Use **full-file-contents-reference.md** to find exact line numbers
4. Fix in recommended order: #1 → #4 → #10 → #7

### For Code Review
1. Check that buildSucceeded is set correctly after Parcel success/failure
2. Verify buildFailed calculation handles all scenarios
3. Ensure error events are sent for failures
4. Check SSE parser doesn't coerce important values

### For Testing
1. Test LLM generation without writing src/App.tsx (should fail gracefully)
2. Test UI messages when build fails (should show error, not "ready")
3. Test bundleHtml state when no bundle event sent
4. Test flashcard mode (should not use buildDir)

---

## Key Code Snippets for Reference

### Issue #1: Catch Block (route.ts:215-217)
```typescript
} catch (buildError) {
  console.error("[generate] Parcel build failed:", buildError);
  send("activity", { type: "complete", message: "Build failed — check the Code panel for your files" });
  // Don't throw — still persist files and send done event
}
```
**FIX:** Set buildSucceeded properly, send "error" event

### Issue #4: Premature "ready" (route.ts:276-278)
```typescript
send("activity", { type: "complete", message: "App is ready!" });
send("status", { status: "live" });
send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && collectedFiles.size > 0 });
```
**FIX:** Only send "ready" if buildSucceeded or no files to bundle

### Issue #7: Non-null Assertion (route.ts:139)
```typescript
: createAgentTools({ send, sessionId, collectedFiles, convex, buildDir: buildDir! });
```
**FIX:** Use type narrowing instead of `!` assertion

### Issue #10: Null Coercion (sse-events.ts:46)
```typescript
case "bundle":
  return { event: "bundle", html: String(d.html ?? "") };
```
**FIX:** Return `html: string | null` and don't coerce

---

## Created: 2026-03-26
Analysis conducted with full-file review of streaming pipeline, SSE events, and builder scaffold.
