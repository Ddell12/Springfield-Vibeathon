# Fix All Code Review Findings (35 Issues)

## Context

A parallel 4-agent code review of `src/` (440 files) found 35 issues: 1 Critical RCE, 10 High (security + correctness), 13 Medium, and 6 Low. This plan fixes all of them in 7 sequential phases, ordered by severity. 4 items are deferred as large structural refactors.

---

## Phase 1: Critical Security — RCE + Sandbox Escape

### F1: Remove RCE vector via `new Function()` eval

**Files:**
- `src/features/builder/lib/agent-tools.ts:26` — Remove `tailwind.config` from allowlist
- `scripts/bundle-worker.mjs:112-119` — Remove `new Function()`, default to `"{}"`

**Changes:**
1. In `agent-tools.ts:26`, change the `allowedRoots` regex:
   ```
   OLD: /^(src\/|tailwind\.config\.(ts|js|cjs)$|vite\.config\.(ts|js)$|postcss\.config\.(ts|js|cjs)$)/
   NEW: /^(src\/|vite\.config\.(ts|js)$|postcss\.config\.(ts|js|cjs)$)/
   ```
2. In `bundle-worker.mjs:112-119`, replace the `new Function()` block:
   ```js
   // OLD:
   try {
     const evaluated = new Function(`return (${twExtend})`)();
     twExtend = JSON.stringify(evaluated);
   } catch {
     twExtend = "{}";
   }
   // NEW:
   try {
     twExtend = JSON.stringify(JSON.parse(twExtend));
   } catch {
     twExtend = "{}";
   }
   ```
   This safely parses only valid JSON. LLM-generated JS object literals with getters/functions will fall through to `"{}"`.

### F2: Remove `allow-same-origin` from iframe sandboxes

**Files (identical change in each):**
- `src/features/builder/components/preview-panel.tsx:77`
- `src/shared/components/fullscreen-app-view.tsx:68`
- `src/features/explore/components/demo-tool-modal.tsx:72`
- `src/features/play/components/app-viewer.tsx:72`

**Change:** `sandbox="allow-scripts allow-same-origin"` → `sandbox="allow-scripts"`

**QA Note:** Blob URL iframes run inline scripts fine without `allow-same-origin`. The existing CSP in the bundle HTML (`script-src 'unsafe-inline'`) enables this. Verify preview rendering after change.

### Verification
- `isValidFilePath("tailwind.config.js")` returns `false`
- `grep -r "new Function" scripts/` returns no matches
- `grep -r "allow-same-origin" src/` returns no matches
- Build an app end-to-end, confirm preview renders correctly

---

## Phase 2: High Security — Auth, Errors, Rate Limiting, Validation

### F3: Narrow silent auth catch — `src/app/api/generate/lib/authenticate.ts:25`

Replace empty catch with:
```ts
} catch (err) {
  if (err instanceof Error && err.message.includes("Clerk")) {
    console.warn("[auth] Clerk not configured:", err.message);
  } else {
    console.error("[auth] Unexpected auth error:", err);
    throw err;
  }
}
```

### F4: Stop leaking raw errors — 2 files

- `src/app/api/generate-report/route.ts:192-194` — Change `err.message` to `"Report generation failed — please try again"`
- `src/app/api/generate-soap/route.ts:148-150` — Change `err.message` to `"SOAP generation failed — please try again"`
- Add `console.error("[generate-report]", err)` / `console.error("[generate-soap]", err)` before sending

### F5: Fix spoofable rate limit — `src/app/api/generate/route.ts:56-58`

```ts
// OLD:
const ip = request.headers.get("x-real-ip")
  ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? "anonymous";
// NEW:
const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
  ?? request.headers.get("x-real-ip")
  ?? "anonymous";
const rateLimitKey = userId ?? `ip:${ip}`;
```
Update the `checkGenerateLimit` call to use `rateLimitKey` instead of `ip`.

### F6: Validate blueprint schema — `src/features/builder/lib/schemas/generate.ts:8`

Replace `z.any()` with the existing `TherapyBlueprintSchema`:
```ts
import { TherapyBlueprintSchema } from "./index";
// ...
blueprint: TherapyBlueprintSchema.optional(),
```
This reuses the already-defined schema at `src/features/builder/lib/schemas/index.ts:15-58`.

### F23: Normalize Zod refine — same file, line 10-12

```ts
// OLD: (data) => data.query || data.prompt,
// NEW: (data) => data.query?.trim() || data.prompt?.trim(),
```

### Verification
- Trigger auth infrastructure error → confirm it throws (not swallowed)
- Trigger report/SOAP error → confirm generic message in SSE
- Send request with spoofed `x-forwarded-for` → confirm `x-vercel-forwarded-for` is preferred
- Send malformed blueprint → confirm 400 rejection
- Send whitespace-only prompt → confirm rejection

---

## Phase 3: High Correctness — Streaming, State, Roles

### F7: Fix sessionIdRef race — `src/features/builder/hooks/use-streaming.ts:462`

After `sessionIdRef.current = args.sessionId;` (line 462), add:
```ts
statusRef.current = "live";
```

### F8: Wrap setAppName mutation — `src/features/builder/lib/agent-tools.ts:82`

```ts
// OLD:
run: async ({ name }) => {
  await ctx.convex.mutation(api.sessions.updateTitle, { ... });
// NEW:
run: async ({ name }) => {
  try {
    await ctx.convex.mutation(api.sessions.updateTitle, { ... });
  } catch (err) {
    console.error("[set_app_name] Failed to update title:", err);
    return `App name "${name}" noted (save failed, will retry)`;
  }
```

### F9: Add terminal state to flashcard streaming — `use-flashcard-streaming.ts`

Add a local tracking variable at the top of the callback and check it after the buffer processing:
```ts
// At top of useCallback (inside the async function):
let reachedTerminal = false;

// Inside the switch cases, after setStatus("live") and setStatus("failed"):
reachedTerminal = true;

// After line 103 (after buffer processing, before catch):
if (!reachedTerminal) {
  setStatus("failed");
  setActivityMessage("Generation ended unexpectedly.");
}
```

### F10: Fix StrictMode speech coach remount — `active-session.tsx:68-72`

```ts
// Add ref alongside hasStarted (line 40):
const wasConnected = useRef(false);

// Add effect to track connection (after line 47):
useEffect(() => {
  if (status === "connected") wasConnected.current = true;
}, [status]);

// Update disconnection check (line 69):
if (wasConnected.current && status === "disconnected") {
```

### F11: Fix isSLP inversion — `invite-landing.tsx:26`

```ts
// OLD: const isSLP = !userRole || userRole === "slp";
// NEW: const isSLP = userRole === "slp";
```

### Verification
- Resume a session → send follow-up → confirm `START_FOLLOW_UP` dispatched (not `START_GENERATION`)
- Fail a Convex mutation in setAppName → stream continues
- Interrupt flashcard generation → UI shows "failed" not infinite "generating"
- Start speech coach in dev (StrictMode) → session doesn't end on mount
- Visit invite link with no role → caregiver flow works

---

## Phase 4: Convex Performance — Schema + Query Optimization

**Requires `npx convex dev` to push schema changes.**

### F13: Add compound index for standalone speech history

**Schema** (`convex/schema.ts`): Add to `speechCoachSessions` table:
```ts
.index("by_userId_mode_startedAt", ["userId", "mode", "startedAt"])
```

**Query** (`convex/speechCoach.ts:356-370`): Use new index:
```ts
const sessions = await ctx.db
  .query("speechCoachSessions")
  .withIndex("by_userId_mode_startedAt", (q) =>
    q.eq("userId", userId).eq("mode", "standalone"))
  .order("desc")
  .take(50);
return sessions; // no more .filter().reverse()
```

### F14: Use existing compound index for caregiver auth — `convex/activityLog.ts:43-48`

```ts
// OLD:
.withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
.filter((q) => q.eq(q.field("patientId"), args.patientId))
.filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
// NEW:
.withIndex("by_caregiverUserId_patientId", (q) =>
  q.eq("caregiverUserId", userId).eq("patientId", args.patientId))
.filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
```

### F15: Add index for non-archived sessions

**Schema** (`convex/schema.ts`): Add to `sessions` table:
```ts
.index("by_user_archived", ["userId", "archived"])
```

**Query** (`convex/sessions.ts:38-50`): Use new index:
```ts
const sessions = await ctx.db
  .query("sessions")
  .withIndex("by_user_archived", (q) =>
    q.eq("userId", identity.subject).eq("archived", false))
  .order("desc")
  .take(100);
return sessions; // no more .filter()
```

**Note on F15:** Sessions without an `archived` field will have `archived === undefined`, not `false`. Either: (a) backfill existing sessions with `archived: false`, or (b) query twice (one for `false`, one for `undefined`) and merge. Option (a) is cleaner — add a migration.

### F12: Optimize getStats — `convex/patients.ts:309-334`

The `.take(500).length` pattern is idiomatic Convex (no native count). Keep current structure but add a comment explaining the limitation. No code change needed — mark as "won't fix" with documentation.

### Verification
- Push schema with `npx convex dev`
- Query standalone history → confirm new index used (Convex dashboard)
- Query activity log as caregiver → faster (compound index)
- List sessions → archived filtered at index level

---

## Phase 5: Client Performance

### F16: Memoize code-panel split — `code-panel.tsx:46`

```ts
// OLD: const lines = selectedFile?.contents.split("\n") ?? [];
// NEW: const lines = useMemo(() => selectedFile?.contents.split("\n") ?? [], [selectedFile?.contents]);
```

### F17: Remove overlapping dashboard query — `dashboard-view.tsx:31-32`

```ts
// REMOVE: const liveSessions = useQuery(api.sessions.listByState, { state: "live" });
// ADD:
const liveSessions = useMemo(
  () => sessions?.filter(s => s.state === "live") ?? [],
  [sessions]
);
```

### F18: Singleton ConvexHttpClient — `authenticate.ts:12`

Move to module scope:
```ts
const sharedConvex = new ConvexHttpClient(CONVEX_URL);

export async function authenticate(): Promise<AuthResult> {
  const convex = sharedConvex;
  convex.clearAuth();
  // ... rest unchanged
```

### Verification
- Profile code-panel during streaming → no unnecessary split calls
- Dashboard network tab → single Convex subscription for sessions
- Multiple concurrent generations → no ConvexHttpClient explosion

---

## Phase 6: Medium Correctness + Low Priority

### F20: Build limiter HMR resilience — `build-limiter.ts`

Use `globalThis` to survive HMR:
```ts
const state = ((globalThis as Record<string, unknown>).__buildLimiter ??= {
  active: 0,
  queue: [] as QueueEntry[],
  lastActivity: Date.now(),
}) as { active: number; queue: QueueEntry[]; lastActivity: number };
```
Replace module-level `active` and `queue` with `state.active` and `state.queue`.

### F21: Session resume timeout — `use-session-resume.ts:106-109`

Add timeout fallback after the existing redirect effect:
```ts
useEffect(() => {
  if (!initialSessionId) return;
  const timeout = setTimeout(() => {
    if (resumeSessionData === undefined && resumeFiles === undefined) {
      router.replace("/builder");
    }
  }, 10_000);
  return () => clearTimeout(timeout);
}, [initialSessionId, resumeSessionData, resumeFiles, router]);
```

### F22: Fix null draftBlueprint type — `use-interview.ts:33`

```ts
// OLD: (followUpQuestions: InterviewQuestion[], draftBlueprint: TherapyBlueprint) =>
// NEW: (followUpQuestions: InterviewQuestion[], draftBlueprint: TherapyBlueprint | null) =>
```
Also update the `SET_FOLLOWUPS` action type in the reducer to accept `TherapyBlueprint | null`.

### F33: PWA manifest caching — `src/app/(play)/family/.../manifest.json/route.ts`

Add `Cache-Control` header to the `NextResponse.json()` call:
```ts
return NextResponse.json(manifest, {
  headers: { "Cache-Control": "public, max-age=3600" },
});
```

### F34: Add ESLint disable comment — `interview-controller.tsx:178`

Add: `// Only re-fetch when phase changes, not on full state updates`

### F36: Replace raw `<button>` with shadcn Button — 2 files

- `patient-profile-widget.tsx:104` — `<Button variant="ghost" size="icon" type="button">`
- `patient-intake-form.tsx:297` — Same pattern

### Verification
- HMR during active build → build limiter recovers
- Navigate to invalid session ID → redirects after 10s
- TypeScript compilation passes with null blueprint
- Manifest response has `Cache-Control` header

---

## Phase 7: Quality — VSA + Duplication Cleanup

### F24: Move ChildAppsSection to shared

Move `src/features/family/components/child-apps-section.tsx` → `src/shared/components/child-apps-section.tsx`
Update import in `patient-detail-page.tsx:16`.

### F25: Move THERAPY_SUGGESTIONS to shared

Create `src/shared/lib/therapy-constants.ts` with the constant.
Update imports in:
- `dashboard-chat-box.tsx:12`
- `builder/components/chat-panel.tsx`
- `builder/components/builder-page.tsx`

### F26: Refactor SSE parsing to use shared utility

Refactor `use-soap-generation.ts` and `use-report-generation.ts` to use `parseSSEChunks` from `@/core/sse-utils`. Follow the pattern in `use-flashcard-streaming.ts:68`.

### F28: Extract selection toggle — `my-tools-page.tsx:232-281`

Extract `toggleSelection` callback using `useCallback`.

### F29: Shared ErrorFallback — `src/shared/components/generic-error-fallback.tsx`

Create shared component, replace inline implementations in:
- `src/app/(app)/builder/page.tsx`
- `src/app/(app)/builder/[sessionId]/page.tsx`
- `src/app/(app)/flashcards/page.tsx`
- `src/app/(app)/family/[patientId]/speech-coach/page.tsx`

### F35: Move todayString to shared — `session-note-editor.tsx:34`

Move to `src/shared/lib/date-utils.ts`.

### Verification
- TypeScript compilation passes
- All imports resolve
- SSE streaming works in SOAP/report generation
- Error boundaries render correctly
- `npm test` passes

---

## Deferred Items (Separate PRs)

| ID | Issue | Reason |
|----|-------|--------|
| F19 | 5-7 Convex subscriptions on builder page | Structural refactor, low impact |
| F27 | BuilderPage 512-line god component | Large refactor, own PR |
| F30 | ROUTES constant inconsistency | Incremental adoption, needs convention discussion |
| F31 | Near-duplicate SpeechCoachPage components | Structural refactor |
| F32 | Mixed design tokens (muted-foreground vs on-surface-variant) | Needs design review, ~395 replacements |

---

## Execution Summary

| Phase | Fixes | Key Files | Risk |
|-------|-------|-----------|------|
| 1 | F1, F2 | agent-tools.ts, bundle-worker.mjs, 4 iframe files | **High** — test preview rendering after sandbox change |
| 2 | F3-F6, F23 | authenticate.ts, route.ts, generate.ts | Medium |
| 3 | F7-F11 | use-streaming.ts, agent-tools.ts, active-session.tsx, invite-landing.tsx | Medium — state machine changes |
| 4 | F13-F15 | convex/schema.ts, speechCoach.ts, activityLog.ts, sessions.ts | Medium — schema migration |
| 5 | F16-F18 | code-panel.tsx, dashboard-view.tsx, authenticate.ts | Low |
| 6 | F20-F22, F33-F34, F36 | build-limiter.ts, use-session-resume.ts, misc | Low |
| 7 | F24-F26, F28-F29, F35 | Shared components, SSE hooks, constants | Low — mostly file moves |

**Total: 31 fixes implemented, 5 deferred.**
