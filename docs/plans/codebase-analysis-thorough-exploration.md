# Springfield-Vibeathon: Thorough Codebase Analysis
## Performance & Correctness Issues Discovery

**Date:** March 29, 2026  
**Scope:** Full file-level analysis of Convex backend and frontend  
**Mode:** READ-ONLY discovery for planning performance and correctness fixes

---

## 1. CONVEX BACKEND ANALYSIS

### 1.1 Schema & Indexes Overview

**File:** `/Users/desha/Springfield-Vibeathon/convex/schema.ts` (lines 1-418)

#### Patients Table (lines 132-164)
```
Table: patients
Fields:
  - slpUserId: string (therapist ID)
  - firstName, lastName: string
  - dateOfBirth: string
  - diagnosis: union (articulation|language|fluency|voice|aac-complex|other)
  - status: union (active|on-hold|discharged|pending-intake)
  - parentEmail: optional string
  - interests: optional array[string]
  - communicationLevel: optional union
  - sensoryNotes, behavioralNotes, notes: optional string

Indexes:
  ✓ by_slpUserId: ["slpUserId"]  — ONLY INDEX
```

**ISSUE FOUND:** Single index only. Both `patients.list` and `getStats` use `by_slpUserId` efficiently, but no status-based filtering index exists.

#### CaregiverLinks Table (lines 166-181)
```
Indexes:
  ✓ by_patientId: ["patientId"]
  ✓ by_caregiverUserId: ["caregiverUserId"]
  ✓ by_caregiverUserId_patientId: ["caregiverUserId", "patientId"]
  ✓ by_inviteToken: ["inviteToken"]
  ✓ by_email: ["email"]
```

**GOOD:** Comprehensive indexing for different access patterns.

#### PatientMessages Table (lines 409-417)
```
Indexes:
  ✓ by_patientId_timestamp: ["patientId", "timestamp"]
```

**NOTE:** Composite index on patientId+timestamp covers the query access pattern.

#### Goals Table (lines 267-295)
```
Indexes:
  ✓ by_patientId: ["patientId"]
  ✓ by_patientId_status: ["patientId", "status"]
```

**GOOD:** Status filtering supported by composite index.

#### ProgressData Table (lines 297-321)
```
Indexes:
  ✓ by_goalId: ["goalId"]
  ✓ by_goalId_date: ["goalId", "date"]
  ✓ by_patientId_date: ["patientId", "date"]
```

**GOOD:** Multiple access patterns supported.

#### Apps Table (lines 40-53)
```
Indexes:
  ✓ by_share_slug: ["shareSlug"]
  ✓ by_session: ["sessionId"]
  ✓ by_created: ["createdAt"]
  ✓ by_user: ["userId"]  — EXISTS
```

**GOOD:** `by_user` index exists on apps table.

---

### 1.2 Query Performance Issues

#### Issue A: `patients.list` (lines 62-79)

```typescript
export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
      .take(500);

    if (args.status) {
      return patients.filter((p) => p.status === args.status);  // IN-MEMORY FILTERING
    }
    return patients;
  },
});
```

**Problems:**
1. **In-memory filtering** on status (line 76) instead of query-level
2. Takes ALL 500 patients into memory, then filters
3. Missing index: `by_slpUserId_status` would eliminate the filter pass
4. Potential data leakage: If user has >500 patients, the last ones are silently dropped

#### Issue B: `patients.getStats` (lines 274-292)

```typescript
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { active: 0, onHold: 0, discharged: 0, pendingIntake: 0 };

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
      .take(500);

    return {
      active: patients.filter((p) => p.status === "active").length,
      onHold: patients.filter((p) => p.status === "on-hold").length,
      discharged: patients.filter((p) => p.status === "discharged").length,
      pendingIntake: patients.filter((p) => p.status === "pending-intake").length,
    };
  },
});
```

**Problems:**
1. **Four separate in-memory filter passes** (lines 286-289)
2. Loads all 500 patients just to count by status
3. Could be solved with query-level grouping or better indexes
4. Same >500 patient cutoff issue

---

#### Issue C: `apps.list` (lines 92-104)

```typescript
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const all = await ctx.db
      .query("apps")
      .withIndex("by_created")  // NO USER FILTER
      .order("desc")
      .take(50);
    return all.filter((app) => app.userId === identity.subject);  // POST-FILTER
  },
});
```

**Problems:**
1. **Queries by_created index** (global, not user-scoped)
2. Takes 50 most recent apps (by anyone), filters to current user
3. **SEVERE:** If user has few apps and others create many, user may see 0 apps
4. Correct pattern: `withIndex("by_user", (q) => q.eq("userId", identity.subject)).take(50)`
5. Index exists (`by_user`) but isn't used

---

#### Issue D: `patientMessages.getUnreadCount` (lines 74-92)

```typescript
export const getUnreadCount = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertPatientAccess(ctx, args.patientId);

    const messages = await ctx.db
      .query("patientMessages")
      .withIndex("by_patientId_timestamp", (q) =>
        q.eq("patientId", args.patientId)
      )
      .take(500);  // HARD LIMIT

    return messages.filter(
      (m) => m.senderUserId !== userId && m.readAt === undefined
    ).length;
  },
});
```

**Problems:**
1. Takes 500 messages into memory
2. Filters by sender AND readAt in-memory (2 conditions)
3. Composite filter not pushable to index
4. If patient has >500 messages, unread count is wrong
5. **Correctness bug:** Unread count incomplete for high-message threads

---

#### Issue E: `caregivers.listByPatient` (lines 143-165)

```typescript
export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const patient = await ctx.db.get(args.patientId);
    if (!patient) return [];
    if (patient.slpUserId !== userId) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
        .filter((q) => q.eq(q.field("patientId"), args.patientId))
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .first();
      if (!link) return [];
    }

    return await ctx.db
      .query("caregiverLinks")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(50);
  },
});
```

**NOTE:** Does NOT return `inviteToken` in results (line 164 `.take(50)`). If frontend needs the token for actions like revoking invites, this is a data completeness issue.

---

#### Issue F: `sessions.setBlueprint` (lines 209-218)

```typescript
export const setBlueprint = mutation({
  args: {
    sessionId: v.id("sessions"),
    blueprint: v.any(),  // NO VALIDATION
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    await ctx.db.patch(args.sessionId, { blueprint: args.blueprint });
  },
});
```

**Problems:**
1. **`blueprint: v.any()`** — No schema validation
2. Comment says "Validated via TherapyBlueprintSchema (Zod) at app layer before persistence"
3. **Risk:** App layer validation is not guaranteed; malformed data can persist
4. Should use explicit schema or at least type hint

---

#### Issue G: `progressData.listByGoal` (lines 15-29)

```typescript
export const listByGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("progressData")
      .withIndex("by_goalId_date", (q) => q.eq("goalId", args.goalId))
      .order("desc")
      .take(200);
  },
});
```

**GOOD:** Efficient use of by_goalId_date composite index with ordered retrieval.

---

### Summary: Backend Issues

| Issue | Severity | Type | Recommendation |
|-------|----------|------|---|
| patients.list in-memory filter | HIGH | Performance | Add `by_slpUserId_status` index, push filter to query layer |
| patients.getStats multiple passes | HIGH | Performance | Refactor to single pass or use aggregation |
| apps.list wrong index | CRITICAL | Correctness | Switch to `by_user` index, ensures user sees their apps |
| patientMessages.getUnreadCount 500 limit | HIGH | Correctness | Add compound index `by_patientId_readAt_senderUserId` or paginate properly |
| caregivers.listByPatient inviteToken | MEDIUM | Completeness | Return full caregiverLinks docs including inviteToken |
| sessions.setBlueprint no validation | MEDIUM | Security | Add explicit schema validation (v.object with fields) |

---

## 2. FRONTEND ANALYSIS

### 2.1 Goal Form: Missing Error Handling

**File:** `/Users/desha/Springfield-Vibeathon/src/features/goals/components/goal-form.tsx` (lines 75-108)

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSaving(true);
  try {
    if (editGoal) {
      await updateGoal({
        goalId: editGoal._id,
        domain,
        shortDescription,
        fullGoalText,
        targetAccuracy,
        targetConsecutiveSessions,
        startDate,
        targetDate: targetDate || undefined,
        notes: notes || undefined,
      });
    } else {
      await createGoal({
        patientId,
        domain,
        shortDescription,
        fullGoalText,
        targetAccuracy,
        targetConsecutiveSessions,
        startDate,
        targetDate: targetDate || undefined,
        notes: notes || undefined,
      });
    }
    onOpenChange(false);
  } finally {
    setSaving(false);
  }
}
```

**Issue:** No `catch` block (lines 75-108)
- Errors are silently swallowed
- User sees "Saving..." disabled button indefinitely if error occurs
- No toast notification on failure
- Form does not stay open on error (line 104 executes regardless)

**Fix:** Add catch block:
```typescript
} catch (err) {
  toast.error(err instanceof Error ? err.message : "Failed to save goal");
  // Don't call onOpenChange(false) — let user fix and retry
}
```

---

### 2.2 Invite Landing: Auto-Accept Closure Bug

**File:** `/Users/desha/Springfield-Vibeathon/src/features/patients/components/invite-landing.tsx` (lines 25-38)

```typescript
useEffect(() => {
  if (isLoaded && isSignedIn && inviteInfo && !isAccepting) {
    setIsAccepting(true);
    acceptInvite({ token })
      .then(() => {
        toast.success("You're connected!");
        router.push("/dashboard");
      })
      .catch(() => {
        toast.error("Failed to accept invite");
        setIsAccepting(false);
      });
  }
}, [isLoaded, isSignedIn, inviteInfo, token, acceptInvite, router, isAccepting]);
```

**Issues:**
1. **Missing dependency:** `acceptInvite` is a function from hook but not memoized with useCallback
2. **Effect may trigger multiple times:** If `acceptInvite` reference changes, effect runs again with `isAccepting=false`
3. **Race condition:** Multiple simultaneous calls to acceptInvite if effect re-runs
4. **Closure:** The `then()` callback captures `router` from closure; if router changes, old reference used

**Current safeguard:** `!isAccepting` gate (line 26), but fragile  
**Risk:** Race where invite accepted twice in parallel

---

### 2.3 Engagement Summary: Date Denominator Issue

**File:** `/Users/desha/Springfield-Vibeathon/src/features/patients/components/engagement-summary.tsx` (lines 93-96)

```typescript
<p className="text-xs text-muted-foreground">
  Parent practiced{" "}
  <span className="font-semibold text-foreground">{daysPracticed}/7</span>{" "}
  days this week
```

**Issue:**
- Always shows `/7` denominator
- Calculation at line 43-44:
  ```typescript
  const monday = getMondayOfCurrentWeek();  // line 43
  const today = getTodayIso();  // line 44
  ```
- But `getMondayOfCurrentWeek()` (lines 14-21) has a **potential off-by-one error**:
  ```typescript
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  ```
- On **Sunday:** `dayOfWeek = 0`, offset = -6, shows Monday of PREVIOUS week
- **Correctness bug:** If viewed on Sunday, shows partial week (1 day) as `/7`

**Fix:** Use ISO week date or adjust logic:
```typescript
const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;  // Wrong on Sunday
// Better:
const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
// Or: use Monday of CURRENT week always
```

Also, denominator should be `daysPracticed / daysInRange` where range is Mon-Today (variable, not fixed 7).

---

### 2.4 Home Program Form: Date Validation Missing

**File:** `/Users/desha/Springfield-Vibeathon/src/features/patients/components/home-program-form.tsx` (lines 50-88)

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (!title.trim()) {
    toast.error("Title is required");
    return;
  }
  if (!instructions.trim()) {
    toast.error("Instructions are required");
    return;
  }
  if (!frequency) {
    toast.error("Frequency is required");
    return;
  }
  if (!startDate) {
    toast.error("Start date is required");
    return;
  }
  // NO VALIDATION for endDate > startDate
  // NO VALIDATION that startDate is not in past
  
  setIsSubmitting(true);
  try {
    await createProgram({
      patientId,
      title: title.trim(),
      instructions: instructions.trim(),
      frequency,
      startDate,
      endDate: endDate || undefined,  // Could be before startDate
    });
    toast.success("Home program assigned");
    resetForm();
    onOpenChange(false);
  } catch (err) {
    toast.error("Failed to create home program");
  } finally {
    setIsSubmitting(false);
  }
}
```

**Missing validations:**
1. No check: `endDate > startDate` if both provided
2. No check: `startDate` not in past
3. No check: `endDate` not before `today`
4. Error handling exists but doesn't distinguish validation from network errors

---

### 2.5 Progress Report Generator: Period State Management

**File:** `/Users/desha/Springfield-Vibeathon/src/features/goals/components/progress-report-generator.tsx` (lines 54-86)

```typescript
export function ProgressReportGenerator({
  patientId,
  open,
  onOpenChange,
}: ProgressReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>("weekly-summary");
  const period = defaultPeriod(reportType);  // LINE 60: RECALCULATED EVERY RENDER
  const [periodStart, setPeriodStart] = useState(period.start);  // LINE 61
  const [periodEnd, setPeriodEnd] = useState(period.end);  // LINE 62

  const { status, streamedText, reportId, error, generate, reset } = useReportGeneration();

  function handleTypeChange(type: ReportType) {
    setReportType(type);
    const p = defaultPeriod(type);
    setPeriodStart(p.start);  // LINE 69
    setPeriodEnd(p.end);  // LINE 70
  }
```

**Issues:**
1. **Line 60:** `defaultPeriod(reportType)` called at render time, not in effect
2. **Stale state:** If reportType changes, period is recalculated but state vars may be out of sync
3. **Better pattern:** Use `useEffect` to sync period when reportType changes
4. Current workaround (handleTypeChange) only works if user clicks dropdown — not if reportType prop changes

---

### 2.6 Session Note Editor: Auto-Save Closure Leak

**File:** `/Users/desha/Springfield-Vibeathon/src/features/session-notes/components/session-note-editor.tsx` (lines 155-170)

```typescript
const scheduleAutoSave = useCallback(
  (
    date: string,
    duration: number,
    type: SessionType,
    data: StructuredData
  ) => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    autoSaveTimeout.current = setTimeout(() => {
      doSave(date, duration, type, data, currentNoteId);  // LINE 166: STALE CLOSURE
    }, 1000);
  },
  [doSave, currentNoteId]  // LINE 169: Dependency includes currentNoteId
);
```

**Issues:**
1. **Stale closure:** The `setTimeout` callback (line 165-167) captures `currentNoteId` from closure
2. **Dependency array includes currentNoteId** (line 169), so if noteId changes, scheduleAutoSave memoization is recreated
3. **But then:** Old setTimeout callbacks may still reference old `currentNoteId`
4. **Race:** User edits note, ID changes (first save), then old setTimeout fires with stale ID

**Example scenario:**
- User in create mode, edits → auto-save schedules with currentNoteId=null
- First edit creates note → setCurrentNoteId(newId) called
- Old setTimeout fires 1s later with currentNoteId=null in closure
- Save fails or creates duplicate

**Better:** Capture at scheduling time:
```typescript
autoSaveTimeout.current = setTimeout(() => {
  doSave(date, duration, type, data, currentNoteId);  // Use the CURRENT value
}, 1000);
```

Or use ref to avoid dependency:
```typescript
const noteIdRef = useRef(currentNoteId);
useEffect(() => { noteIdRef.current = currentNoteId; }, [currentNoteId]);
// Then use noteIdRef.current in setTimeout
```

---

### 2.7 Build Limiter: Semaphore Implementation

**File:** `/Users/desha/Springfield-Vibeathon/src/app/api/generate/build-limiter.ts` (entire file, 55 lines)

```typescript
const MAX_CONCURRENT = 2;
const QUEUE_TIMEOUT_MS = 30_000;

let active = 0;
const queue: QueueEntry[] = [];

function createRelease(): () => void {
  let released = false;
  return () => {
    if (released) return;  // Idempotent
    released = true;
    active--;
    const next = queue.shift();
    if (next) {
      active++;
      next.resolve(createRelease());  // RECURSIVE: new release for next waiter
    }
  };
}

export async function acquireBuildSlot(): Promise<() => void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return createRelease();
  }

  return new Promise<() => void>((resolve, reject) => {
    const entry: QueueEntry = { resolve, reject };

    const timer = setTimeout(() => {
      const idx = queue.indexOf(entry);
      if (idx >= 0) queue.splice(idx, 1);
      reject(new Error("Server busy — too many concurrent builds. Please try again in a moment."));
    }, QUEUE_TIMEOUT_MS);

    entry.resolve = (release) => {
      clearTimeout(timer);
      resolve(release);
    };

    queue.push(entry);
  });
}
```

**Observations:**
1. **Correct pattern:** Module-level semaphore with queue
2. **Idempotent release:** Line 22 guard prevents double-release
3. **Timeout handling:** Both queue removal (line 45) and timer clear (line 49)
4. **Recursive release:** Each released slot pulls next from queue (line 28)

**Potential issues:**
1. **Race on active counter:** If request timeout fires while release is executing, active could go negative
2. **Better:** Use atomic check in timeout cleanup:
   ```typescript
   const timer = setTimeout(() => {
     const idx = queue.indexOf(entry);
     if (idx >= 0) {
       queue.splice(idx, 1);
       reject(...);
     } else {
       // Entry was processed, don't reject
     }
   }, QUEUE_TIMEOUT_MS);
   ```
3. Current implementation is likely OK because Promises resolve only once, but defensive is better

---

### 2.8 Agent Tools: Path Traversal Guards

**File:** `/Users/desha/Springfield-Vibeathon/src/features/builder/lib/agent-tools.ts` (lines 1-180)

#### writeFile (lines 91-134)
```typescript
const writeFile = betaZodTool({
  run: async ({ path, contents }) => {
    if (!isValidFilePath(path)) {
      throw new ToolError("Error: Invalid file path...");
    }

    // Path traversal guard
    const fullPath = join(ctx.buildDir, path);  // LINE 113
    const resolved = resolve(fullPath);  // LINE 114
    if (!resolved.startsWith(resolve(ctx.buildDir))) {  // LINE 115
      throw new ToolError(`Path traversal blocked: ${path}`);
    }

    // Scaffold file protection
    if (PROTECTED_PATHS.some((p) => path.startsWith(p) || path === p)) {  // LINE 120
      throw new ToolError(`Cannot overwrite scaffold file: ${path}`);
    }

    mkdirSync(dirname(fullPath), { recursive: true });  // LINE 125
    writeFileSync(fullPath, contents, "utf-8");  // LINE 126
    ctx.collectedFiles.set(path, contents);
  },
});
```

**Validation layers:**
1. **Line 106:** `isValidFilePath(path)` — allowlist check
   ```typescript
   const allowedRoots = /^(src\/|tailwind\.config\.(ts|js|cjs)$|...)/;
   if (!/^[a-zA-Z0-9\-_.\/]+$/.test(path)) return false;  // No special chars
   if (path.includes("..") || path.includes("//")) return false;  // No path traversal tokens
   if (!/\.(tsx|ts|css|json|cjs|js)$/.test(path)) return false;  // Extension whitelist
   ```

2. **Lines 113-115:** Symlink/traversal check using `resolve()`
   - Prevents: `../../etc/passwd`, symlink escapes

3. **Line 120:** Protected paths check

**Assessment:** GOOD defensive layers, but order matters:
- ✓ Early exit for invalid paths (fast)
- ✓ Extension whitelist (prevents .sh, .exe, etc.)
- ✓ Traversal guard (catches edge cases)
- ✓ Protected paths (scaffold preservation)

#### readFile (lines 136-154)
```typescript
const readFile = betaZodTool({
  run: async ({ path }) => {
    // Path traversal guard (matches write_file)
    const fullPath = join(ctx.buildDir, path);
    const resolved = resolve(fullPath);
    if (!resolved.startsWith(resolve(ctx.buildDir))) {
      throw new ToolError(`Path traversal blocked: ${path}`);
    }
    if (!existsSync(fullPath)) {
      throw new ToolError(`Error: File not found: ${path}`);
    }
    return readFileSync(fullPath, "utf-8");
  },
});
```

**Issue:** NO `isValidFilePath()` check before resolve()
- writeFile has it (line 106), readFile does not
- Allows reading any file with traversal: `../../.env`, `../../convex/schema.ts`, etc.
- The resolve() guard catches `../../../`, but not relative escapes in bounds

**Fix:** Add `isValidFilePath(path)` check, OR relax and document readFile as "read scaffold source only"

#### listFiles (lines 157-176)
```typescript
const listFiles = betaZodTool({
  run: async ({ directory }) => {
    const fullPath = join(ctx.buildDir, directory);
    if (!existsSync(fullPath)) return "Directory not found";
    const entries = readdirSync(fullPath, { withFileTypes: true });
    return entries
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .join("\n");
  },
});
```

**Issues:**
1. **No path validation:** `directory` param not validated for traversal
2. **Allows:** `../../`, list entire file system
3. **No resolve() guard** like readFile/writeFile

**Fix:** Add same traversal check:
```typescript
const fullPath = join(ctx.buildDir, directory);
const resolved = resolve(fullPath);
if (!resolved.startsWith(resolve(ctx.buildDir))) {
  throw new ToolError(`Path traversal blocked: ${directory}`);
}
```

---

## Summary: Frontend Issues

| Issue | Severity | Type | File | Lines |
|-------|----------|------|------|-------|
| goal-form: no error catch | HIGH | UX | goal-form.tsx | 75-108 |
| invite-landing: closure bug | MEDIUM | Correctness | invite-landing.tsx | 25-38 |
| engagement-summary: date logic | MEDIUM | Correctness | engagement-summary.tsx | 14-96 |
| home-program-form: no date validation | MEDIUM | Data Quality | home-program-form.tsx | 50-88 |
| progress-report: period state | LOW | UX | progress-report-generator.tsx | 54-86 |
| session-note-editor: stale closure | MEDIUM | Correctness | session-note-editor.tsx | 155-170 |
| agent-tools readFile: no validation | HIGH | Security | agent-tools.ts | 136-154 |
| agent-tools listFiles: no validation | HIGH | Security | agent-tools.ts | 157-176 |

---

## 3. RECOMMENDED FIXES BY PRIORITY

### Phase 1: Critical (Correctness/Security)
1. **apps.list index bug** — Switch to `by_user` index (1-line fix, massive correctness impact)
2. **agent-tools security** — Add path validation to readFile and listFiles
3. **patientMessages.getUnreadCount** — Handle >500 messages case
4. **goal-form error handling** — Add catch block with toast

### Phase 2: High (Performance)
1. **patients.list/getStats** — Add `by_slpUserId_status` index, refactor filters
2. **sessions.setBlueprint validation** — Add explicit schema
3. **caregivers.listByPatient token** — Return full objects including inviteToken

### Phase 3: Medium (Data Quality/UX)
1. **home-program-form validation** — Add date range checks
2. **engagement-summary date logic** — Fix Monday calculation for Sunday
3. **invite-landing closure** — Use useCallback for acceptInvite
4. **progress-report periods** — Move defaultPeriod calculation to useEffect
5. **session-note-editor closure** — Protect currentNoteId capture

---

## 4. INDEX CREATION ROADMAP

Add these indexes to schema.ts:

```typescript
// patients table
.index("by_slpUserId_status", ["slpUserId", "status"])

// patientMessages table  
.index("by_patientId_readAt", ["patientId", "readAt"])
.index("by_patientId_senderUserId_readAt", ["patientId", "senderUserId", "readAt"])
```

These unlock:
- Query-level filtering for patients by status
- Proper unread message counting without >500 limit
- Reduced in-memory processing from current O(n) to O(1) lookups

