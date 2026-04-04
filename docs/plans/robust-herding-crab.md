# Speech Coach E2E Bug Fix Plan

## Context

E2E testing of `src/features/speech-coach/` revealed 11 bugs across backend and frontend. Five were already fixed during the testing session (confetti timer leaks, attempt trail cap, TypeScript errors, missing Convex deploy). This plan addresses the **remaining 11 unfixed issues**, prioritized by severity.

---

## Already Fixed (no action needed)

| Fix | File |
|-----|------|
| Confetti setTimeout leak | `active-session.tsx` — ref-tracked timer + unmount cleanup |
| Confetti + milestone setTimeout leaks | `adventure-session.tsx` — same pattern |
| Attempt trail unbounded state | `adventure-session.tsx` — `.slice(-19)` cap |
| TypeScript circular type inference | `convex/adventureSessionActions.ts:35` — explicit `Id<>` annotation |
| Implicit `any` on goals filter | `convex/sessionActions.ts:131-132` — explicit types |
| Missing listThemes deploy | `convex/adventure_words.ts` — deployed via `npx convex dev --once` |

---

## Step 1: Backend — `convex/speechCoach.ts` (3 fixes)

### 1a. `endSession` idempotency guard (line 97)
Add status check before re-scheduling analysis:

```typescript
// After line 99: if (!session) throw ...
if (session.status === "analyzing") {
  return; // Already analyzing — prevent duplicate scheduling
}
```

**Why:** Without this, a double-call to `endSession` schedules analysis twice, increments `analysisAttempts` twice, and creates duplicate timeout watchers.

### 1b. `getPracticeFrequency` — cap `.collect()` (line 375)
Replace `.collect()` with `.take(500)`:

```typescript
// Line 375
.take(500);  // was: .collect()
```

**Why:** A patient with many sessions (automated testing, long-term use) causes unbounded memory allocation.

### 1c. `logAttempt` — cap `rawAttempts` array (line 432-441)
Add a size guard before appending:

```typescript
const MAX_RAW_ATTEMPTS = 1000;
const newAttempt = {
  targetLabel: args.targetLabel,
  outcome: args.outcome,
  retryCount: args.retryCount,
  timestampMs: args.timestampMs,
};
const capped = existing.length >= MAX_RAW_ATTEMPTS
  ? [...existing.slice(-(MAX_RAW_ATTEMPTS - 1)), newAttempt]
  : [...existing, newAttempt];
await ctx.db.patch(args.sessionId, { rawAttempts: capped });
```

**Why:** Prevents Convex document size bloat on long sessions.

---

## Step 2: Backend — `convex/speechCoachActions.ts` (2 fixes)

### 2a. `analyzeSession` — wrap retry in try/catch (lines 154-159)
The second `callClaude()` call has no error handler. If both attempts fail, `caregiverResult` is undefined and line 185 (`caregiverResult.soundsAttempted`) throws.

```typescript
let caregiverResult: any;
try {
  caregiverResult = await callClaude(anthropic, caregiverPrompt);
} catch (error) {
  console.error("[SpeechCoach] Caregiver analysis failed, retrying:", error);
  try {
    caregiverResult = await callClaude(anthropic, caregiverPrompt);
  } catch (retryError) {
    console.error("[SpeechCoach] Caregiver analysis retry failed:", retryError);
    await ctx.runMutation(internal.speechCoach_lifecycle.markReviewFailed, {
      sessionId: args.sessionId,
      errorMessage: "AI analysis failed after two attempts. Please retry.",
    });
    return;
  }
}
```

**Why:** Without this, a Claude API outage crashes the action and leaves the session stuck in "analyzing" until the 90-second timeout marks it `review_failed` — but with no useful error message.

### 2b. `callClaude` — add timeout (lines 377-396)
Add a 45-second timeout to the Anthropic SDK call:

```typescript
async function callClaude(
  anthropic: Anthropic,
  prompt: string
): Promise<AnalysisResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  }, { timeout: 45_000 }); // 45s timeout
  // ... rest unchanged
}
```

**Why:** Without a timeout, a stalled Claude API call hangs the action for up to Convex's 10-minute limit, wasting resources.

---

## Step 3: Frontend — ThemePicker error handling

**File:** `src/features/speech-coach/components/theme-picker.tsx` (lines 42-51)

Wrap `useQuery` with error boundary awareness. Since Convex `useQuery` throws on server errors (propagating to the nearest error boundary), add a fallback render:

```typescript
import { ErrorBoundary } from "react-error-boundary";

function ThemePickerInner({ selectedSlug, ageRange, onSelect }: Props) {
  const themes = useQuery(api.adventure_words.listThemes);
  // ... existing render logic
}

export function ThemePicker(props: Props) {
  return (
    <ErrorBoundary fallback={
      <p className="text-xs text-muted-foreground py-4">
        Adventure themes unavailable right now.
      </p>
    }>
      <ThemePickerInner {...props} />
    </ErrorBoundary>
  );
}
```

**Why:** Without this, a Convex server error on `listThemes` crashes the entire speech-coach page via the parent error boundary. This contained fallback keeps the rest of the session config usable.

**Check first:** Verify `react-error-boundary` is already a dependency (used elsewhere in the project).

---

## Step 4: Frontend — Template editor validation

**File:** `src/features/speech-coach/components/template-editor.tsx` (lines 88-102)

Add validation before `handleSave()`:

```typescript
function handleSave() {
  if (!name.trim()) return;  // Prevent empty template names
  onSave({
    name: name.trim(),
    description: description.trim(),
    // ... rest unchanged
  });
}
```

And disable the Save button when name is empty (find the Save button in the JSX):

```tsx
<Button onClick={handleSave} disabled={!name.trim()}>
  Save
</Button>
```

**Why:** E2E testing confirmed orphaned template drafts with empty `name: ""` in the `speechCoachTemplates` table.

---

## Step 5: Frontend — Data channel logging

**Files:**
- `src/features/speech-coach/components/active-session.tsx` (line 60-61)
- `src/features/speech-coach/components/adventure-session.tsx` (line 88-89)

Replace empty `catch` blocks with a warning:

```typescript
} catch (e) {
  console.warn("[speech-coach] Malformed data channel message:", e);
}
```

**Why:** Silent drops are a debugging blind spot — when the agent sends invalid JSON, nothing in the UI or console indicates the message was lost.

---

## Step 6: Frontend — Disconnect toast in ActiveSession

**File:** `src/features/speech-coach/components/active-session.tsx` (lines 227-229)

Add a user-facing toast before ending the session on disconnect:

```typescript
onDisconnected={() => {
  if (wasConnected.current) {
    toast.error("Session disconnected", {
      description: "The connection was lost. Your progress has been saved.",
    });
    onEndRef.current();
  }
}}
```

Apply the same pattern in `adventure-session.tsx` (line 231).

**Why:** Users currently see the session end with no explanation. A brief toast provides context.

---

## Step 7: Frontend — Reduce elapsed time re-renders

**File:** `src/features/speech-coach/components/active-session.tsx` (lines 144-152)

Change interval from 1 second to 10 seconds (the guidance strip only needs rough progress):

```typescript
const id = setInterval(() => {
  if (sessionStartTime.current) {
    setElapsedMs(Date.now() - sessionStartTime.current);
  }
}, 10_000); // was: 1000
```

**Why:** Reduces 60 re-renders/minute to 6 — better for mobile battery life. The guidance strip shows phase-level messages (beginning/middle/end), not a second-by-second timer.

---

## Files Modified (summary)

| File | Steps |
|------|-------|
| `convex/speechCoach.ts` | 1a, 1b, 1c |
| `convex/speechCoachActions.ts` | 2a, 2b |
| `src/features/speech-coach/components/theme-picker.tsx` | 3 |
| `src/features/speech-coach/components/template-editor.tsx` | 4 |
| `src/features/speech-coach/components/active-session.tsx` | 5, 6, 7 |
| `src/features/speech-coach/components/adventure-session.tsx` | 5, 6 |

---

## Verification

### 1. TypeScript
```bash
npx tsc --noEmit
```

### 2. Convex deploy
```bash
npx convex dev --once
```

### 3. Unit tests
```bash
npx vitest run src/features/speech-coach
```
All 104 tests should pass (26 test files).

### 4. Manual E2E spot checks
- Navigate to `/speech-coach` → click Adventure → verify no crash (ThemePicker error boundary)
- Navigate to `/speech-coach/templates` → click "New template" → try saving with empty name → verify button is disabled
- Start a session → verify disconnect toast appears when closing LiveKit (if testable)

### 5. Data validation
```bash
npx convex data speechCoachTemplates --limit 5  # Verify no new empty-name drafts
npx convex data speechCoachSessions --limit 5   # Verify rawAttempts capped
```
