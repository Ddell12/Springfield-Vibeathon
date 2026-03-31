# SP4: Session Workflow Upgrades --- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add same-day signature warnings, group session notes (CPT 92508), multi-audience progress reports, and physician signature display to make the SLP workflow billing-compliant and multi-audience aware.
**Architecture:** Four incremental enhancements to existing `sessionNotes` and `progressReports` features. Task 1 is frontend-only (no schema changes). Task 2 adds `groupSessionId`/`groupPatientIds` fields to `sessionNotes` and a `createGroup` mutation. Task 3 adds an `audience` field to `progressReports` and modifies the SSE streaming route. Task 4 reads from SP2's `plansOfCare` table (dependency).
**Tech Stack:** Convex (schema, mutations, queries), Next.js App Router, React, Tailwind v4, shadcn/ui, Anthropic SDK (streaming), Vitest + convex-test

---

## Task 1: Same-Day Signature Warning (Frontend Only)

**Files:**
- `src/features/session-notes/lib/session-utils.ts` (add helper)
- `src/features/session-notes/components/session-note-card.tsx` (add late badge)
- `src/features/session-notes/components/session-note-editor.tsx` (add info banner)
- `src/features/session-notes/__tests__/session-utils.test.ts` (new test file)

### Steps

- [ ] **1.1** Write failing tests for the late-signature detection utility.

**File:** `src/features/session-notes/__tests__/session-utils.test.ts`

```typescript
import { describe, expect, it } from "vitest";

import {
  getSignatureDelayDays,
  isLateSignature,
} from "../lib/session-utils";

describe("isLateSignature", () => {
  it("returns false when signedAt is on same day as sessionDate", () => {
    // sessionDate = "2026-03-28", signed at noon on 2026-03-28
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(false);
  });

  it("returns false when signedAt is within 24h of end of sessionDate", () => {
    // sessionDate = "2026-03-28", signed at 11pm on 2026-03-29 (within 24h of EOD)
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-29T22:59:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(false);
  });

  it("returns true when signedAt is >24h after end of sessionDate", () => {
    // sessionDate = "2026-03-25", signed 3 days later
    const sessionDate = "2026-03-25";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(true);
  });

  it("returns false when signedAt is undefined", () => {
    expect(isLateSignature(undefined, "2026-03-28")).toBe(false);
  });

  it("returns false when sessionDate is empty", () => {
    expect(isLateSignature(Date.now(), "")).toBe(false);
  });
});

describe("getSignatureDelayDays", () => {
  it("returns 0 for same-day signature", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-28T18:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(0);
  });

  it("returns 3 for signature 3 days late", () => {
    const sessionDate = "2026-03-25";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(3);
  });

  it("returns null when signedAt is undefined", () => {
    expect(getSignatureDelayDays(undefined, "2026-03-28")).toBeNull();
  });
});
```

- [ ] **1.2** Verify tests fail (functions don't exist yet).

```bash
npx vitest run src/features/session-notes/__tests__/session-utils.test.ts
```

- [ ] **1.3** Implement the late-signature utility functions.

**File:** `src/features/session-notes/lib/session-utils.ts` -- add at the end:

```typescript
/**
 * Determine if a session note was signed late (more than 24 hours after
 * the end of the session date). Medicare and most payers expect same-day
 * signatures; late signatures can be flagged in audits.
 */
export function isLateSignature(
  signedAt: number | undefined,
  sessionDate: string,
): boolean {
  if (!signedAt || !sessionDate) return false;
  const sessionEnd = new Date(sessionDate + "T23:59:59").getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return signedAt - sessionEnd > TWENTY_FOUR_HOURS;
}

/**
 * Returns the number of full days between the session date and signature.
 * Returns 0 for same-day, null if signedAt is undefined.
 */
export function getSignatureDelayDays(
  signedAt: number | undefined,
  sessionDate: string,
): number | null {
  if (!signedAt || !sessionDate) return null;
  const sessionStart = new Date(sessionDate + "T00:00:00").getTime();
  const diffMs = signedAt - sessionStart;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}
```

- [ ] **1.4** Verify utility tests pass.

```bash
npx vitest run src/features/session-notes/__tests__/session-utils.test.ts
```

- [ ] **1.5** Add late-signature badge to `SessionNoteCard`.

**File:** `src/features/session-notes/components/session-note-card.tsx`

After the existing status chip (the `<span>` with `statusStyle.bg`), add a conditional late-signature badge. Add the import at the top:

```typescript
import {
  accuracyColor,
  accuracyLabel,
  calculateAccuracy,
  formatDuration,
  getSignatureDelayDays,
  isLateSignature,
} from "../lib/session-utils";
```

Inside the `SessionNoteCard` component, after the `statusStyle` line, add:

```typescript
const lateSign = isLateSignature(note.signedAt, note.sessionDate);
const delayDays = getSignatureDelayDays(note.signedAt, note.sessionDate);
```

After the status chip `</span>`, add:

```tsx
{lateSign && delayDays !== null && (
  <span className="flex shrink-0 items-center gap-1 rounded-full bg-caution-container px-2 py-0.5 text-[10px] font-medium text-on-caution-container">
    <MaterialIcon icon="schedule" size="xs" />
    {delayDays}d late
  </span>
)}
```

- [ ] **1.6** Add late-signature info banner to `SessionNoteEditor`.

**File:** `src/features/session-notes/components/session-note-editor.tsx`

Add import:

```typescript
import { getSignatureDelayDays, isLateSignature } from "../lib/session-utils";
```

In the derived state section (after `const canSign = ...`), add:

```typescript
const lateSign = existingNote
  ? isLateSignature(existingNote.signedAt, existingNote.sessionDate)
  : false;
const delayDays = existingNote
  ? getSignatureDelayDays(existingNote.signedAt, existingNote.sessionDate)
  : null;
```

Inside the return JSX, immediately after the header `<div className="mb-6 flex flex-col gap-3">` block closes, add:

```tsx
{lateSign && delayDays !== null && (
  <div className="mb-4 flex items-center gap-2 rounded-xl bg-caution-container/50 px-4 py-3 text-sm text-on-caution-container">
    <MaterialIcon icon="warning" size="sm" />
    <span>
      This note was signed <strong>{delayDays} day{delayDays !== 1 ? "s" : ""}</strong> after the session date.
      Medicare and most payers require same-day signatures.
    </span>
  </div>
)}
```

- [ ] **1.7** Verify the app builds without errors.

```bash
npx next build 2>&1 | tail -20
```

- [ ] **1.8** Commit.

```
feat(session-notes): add same-day signature warning badge and banner

Late-signed notes (>24h after session date) now show an amber badge
on the session notes list and an info banner in the note editor,
helping SLPs maintain billing compliance.
```

---

## Task 2: Group Session Notes (CPT 92508)

**Files:**
- `convex/schema.ts` (extend sessionNotes table)
- `convex/sessionNotes.ts` (add `createGroup` mutation, modify `list` return)
- `convex/__tests__/sessionNotes.test.ts` (add group tests)
- `src/features/session-notes/components/group-patient-picker.tsx` (new)
- `src/features/session-notes/components/session-note-editor.tsx` (add group mode)
- `src/features/session-notes/components/session-notes-list.tsx` (group display)
- `src/features/session-notes/hooks/use-session-notes.ts` (add hook)

### Steps

- [ ] **2.1** Write failing backend tests for `createGroup` mutation.

**File:** `convex/__tests__/sessionNotes.test.ts` -- add at the end:

```typescript
// ── createGroup ────────────────────────────────────────────────────────────

describe("sessionNotes.createGroup", () => {
  it("creates one note per patient with shared groupSessionId", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    // Create 3 patients
    const { patientId: p1 } = await t.mutation(api.patients.create, VALID_PATIENT);
    const { patientId: p2 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Bella",
    });
    const { patientId: p3 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Charlie",
    });

    const result = await t.mutation(api.sessionNotes.createGroup, {
      patientIds: [p1, p2, p3],
      sessionDate: today,
      sessionDuration: 45,
      sessionType: "in-person" as const,
      structuredData: {
        targetsWorkedOn: [
          { target: "Turn-taking in conversation", trials: 10, correct: 7 },
        ],
      },
    });

    expect(result.noteIds).toHaveLength(3);
    expect(result.groupSessionId).toBeDefined();

    // All notes should share the same groupSessionId
    const note1 = await t.query(api.sessionNotes.get, { noteId: result.noteIds[0] });
    const note2 = await t.query(api.sessionNotes.get, { noteId: result.noteIds[1] });
    const note3 = await t.query(api.sessionNotes.get, { noteId: result.noteIds[2] });

    expect(note1!.groupSessionId).toBe(result.groupSessionId);
    expect(note2!.groupSessionId).toBe(result.groupSessionId);
    expect(note3!.groupSessionId).toBe(result.groupSessionId);

    // All notes should have all patient IDs in groupPatientIds
    expect(note1!.groupPatientIds).toHaveLength(3);
    expect(note1!.groupPatientIds).toContain(p1);
    expect(note1!.groupPatientIds).toContain(p2);
    expect(note1!.groupPatientIds).toContain(p3);
  });

  it("rejects fewer than 2 patients", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId: p1 } = await t.mutation(api.patients.create, VALID_PATIENT);

    await expect(
      t.mutation(api.sessionNotes.createGroup, {
        patientIds: [p1],
        sessionDate: today,
        sessionDuration: 45,
        sessionType: "in-person" as const,
        structuredData: {
          targetsWorkedOn: [{ target: "Test" }],
        },
      }),
    ).rejects.toThrow("2");
  });

  it("rejects more than 6 patients", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    const ids = [];
    for (let i = 0; i < 7; i++) {
      const { patientId } = await t.mutation(api.patients.create, {
        ...VALID_PATIENT,
        firstName: `Patient${i}`,
      });
      ids.push(patientId);
    }

    await expect(
      t.mutation(api.sessionNotes.createGroup, {
        patientIds: ids,
        sessionDate: today,
        sessionDuration: 45,
        sessionType: "in-person" as const,
        structuredData: {
          targetsWorkedOn: [{ target: "Test" }],
        },
      }),
    ).rejects.toThrow("6");
  });

  it("rejects patient not owned by SLP", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const slp2 = base.withIdentity(OTHER_SLP);

    const { patientId: p1 } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const { patientId: p2 } = await slp2.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Bella",
    });

    // slp1 tries to create group with slp2's patient
    await expect(
      slp1.mutation(api.sessionNotes.createGroup, {
        patientIds: [p1, p2],
        sessionDate: today,
        sessionDuration: 45,
        sessionType: "in-person" as const,
        structuredData: {
          targetsWorkedOn: [{ target: "Test" }],
        },
      }),
    ).rejects.toThrow("Not authorized");
  });
});
```

- [ ] **2.2** Verify tests fail (mutation doesn't exist yet).

```bash
npx vitest run convex/__tests__/sessionNotes.test.ts
```

- [ ] **2.3** Add schema fields to `sessionNotes` table.

**File:** `convex/schema.ts`

In the `sessionNotes` table definition, after the `meetingRecordId` field (line 296), add:

```typescript
groupSessionId: v.optional(v.string()),
groupPatientIds: v.optional(v.array(v.id("patients"))),
```

After the existing `.index("by_slpUserId", ["slpUserId"])` index, add:

```typescript
.index("by_groupSessionId", ["groupSessionId"])
```

- [ ] **2.4** Implement the `createGroup` mutation.

**File:** `convex/sessionNotes.ts`

Add at the top of the file (imports section):

```typescript
import { v4 as uuidv4 } from "uuid";
```

> **Note:** If `uuid` is not available in the Convex runtime, use `crypto.randomUUID()` instead. The `"use node"` directive is NOT needed since `crypto.randomUUID` is available in Convex's V8 runtime. If neither works, use a simple UUID generator:
> ```typescript
> function generateGroupId(): string {
>   return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
> }
> ```

Add the mutation after the existing `create` mutation:

```typescript
export const createGroup = slpMutation({
  args: {
    patientIds: v.array(v.id("patients")),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    sessionType: sessionTypeValidator,
    structuredData: structuredDataValidator,
  },
  handler: async (ctx, args) => {
    // Validate group size (CPT 92508: 2-6 patients)
    if (args.patientIds.length < 2) {
      throw new ConvexError("Group sessions require at least 2 patients");
    }
    if (args.patientIds.length > 6) {
      throw new ConvexError("Group sessions support a maximum of 6 patients");
    }

    // Validate all patients belong to this SLP
    for (const patientId of args.patientIds) {
      const patient = await ctx.db.get(patientId);
      if (!patient) throw new ConvexError("Patient not found");
      if (patient.slpUserId !== ctx.slpUserId) {
        throw new ConvexError("Not authorized — all patients must belong to the same SLP");
      }
    }

    validateSessionDate(args.sessionDate);
    validateSessionDuration(args.sessionDuration);
    validateTargets(args.structuredData.targetsWorkedOn);

    // Generate a shared group session ID
    const groupSessionId = crypto.randomUUID();

    // Create one note per patient with shared data
    const noteIds = [];
    for (const patientId of args.patientIds) {
      const noteId = await ctx.db.insert("sessionNotes", {
        patientId,
        slpUserId: ctx.slpUserId,
        sessionDate: args.sessionDate,
        sessionDuration: args.sessionDuration,
        sessionType: args.sessionType,
        status: "draft",
        structuredData: args.structuredData,
        aiGenerated: false,
        groupSessionId,
        groupPatientIds: args.patientIds,
      });
      noteIds.push(noteId);

      await ctx.db.insert("activityLog", {
        patientId,
        actorUserId: ctx.slpUserId,
        action: "session-documented",
        details: `Created group session note for ${args.sessionDate} (${args.patientIds.length} patients)`,
        timestamp: Date.now(),
      });
    }

    return { noteIds, groupSessionId };
  },
});
```

- [ ] **2.5** Verify backend tests pass.

```bash
npx vitest run convex/__tests__/sessionNotes.test.ts
```

- [ ] **2.6** Add the `useCreateGroupSessionNote` hook.

**File:** `src/features/session-notes/hooks/use-session-notes.ts`

Add after the existing `useCreateSessionNote`:

```typescript
export function useCreateGroupSessionNote() {
  return useMutation(api.sessionNotes.createGroup);
}
```

- [ ] **2.7** Create the `GroupPatientPicker` component.

**File:** `src/features/session-notes/components/group-patient-picker.tsx`

```tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GroupPatientPickerProps {
  slpUserId: string;
  selectedIds: Id<"patients">[];
  onChange: (ids: Id<"patients">[]) => void;
  disabled?: boolean;
}

export function GroupPatientPicker({
  slpUserId,
  selectedIds,
  onChange,
  disabled,
}: GroupPatientPickerProps) {
  const { isAuthenticated } = useConvexAuth();
  const patients = useQuery(
    api.patients.list,
    isAuthenticated ? { status: "active" } : "skip",
  );

  function togglePatient(id: Id<"patients">) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((pid) => pid !== id));
    } else if (selectedIds.length < 6) {
      onChange([...selectedIds, id]);
    }
  }

  if (patients === undefined) {
    return <p className="text-sm text-muted-foreground">Loading patients...</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Select Patients (2-6)
        </p>
        <Badge variant="secondary">
          {selectedIds.length}/6 selected
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {patients.map((patient) => {
          const isSelected = selectedIds.includes(patient._id);
          return (
            <button
              key={patient._id}
              type="button"
              onClick={() => togglePatient(patient._id)}
              disabled={disabled || (!isSelected && selectedIds.length >= 6)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all duration-300",
                isSelected
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-surface-container hover:bg-surface-container-high",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <MaterialIcon
                icon={isSelected ? "check_circle" : "circle"}
                size="sm"
                className={isSelected ? "text-primary" : "text-muted-foreground"}
              />
              <span>{patient.firstName} {patient.lastName}</span>
            </button>
          );
        })}
      </div>
      {selectedIds.length > 0 && selectedIds.length < 2 && (
        <p className="text-xs text-caution">
          Select at least 2 patients for a group session.
        </p>
      )}
    </div>
  );
}
```

- [ ] **2.8** Add group mode toggle to `SessionNoteEditor`.

**File:** `src/features/session-notes/components/session-note-editor.tsx`

Add imports:

```typescript
import { GroupPatientPicker } from "./group-patient-picker";
import { useCreateGroupSessionNote } from "../hooks/use-session-notes";
```

In the component, add state:

```typescript
const [isGroupMode, setIsGroupMode] = useState(false);
const [groupPatientIds, setGroupPatientIds] = useState<Id<"patients">[]>([]);
const createGroupNote = useCreateGroupSessionNote();
```

Add a mode toggle UI before the `StructuredDataForm`, inside the left column `<div className="flex flex-col gap-4">`:

```tsx
{/* Group mode toggle — only show in create mode (no existing note) */}
{!noteId && (
  <div className="flex items-center gap-3 rounded-xl bg-surface-container/50 px-4 py-3">
    <button
      type="button"
      onClick={() => setIsGroupMode(false)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300",
        !isGroupMode
          ? "bg-primary text-white"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      Individual
    </button>
    <button
      type="button"
      onClick={() => setIsGroupMode(true)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300",
        isGroupMode
          ? "bg-primary text-white"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <MaterialIcon icon="group" size="xs" className="mr-1 inline" />
      Group (CPT 92508)
    </button>
  </div>
)}

{/* Group patient picker — only show in group mode during creation */}
{isGroupMode && !noteId && (
  <GroupPatientPicker
    slpUserId=""
    selectedIds={groupPatientIds}
    onChange={setGroupPatientIds}
    disabled={isSigned}
  />
)}
```

Modify the `doSave` callback: when in group mode on first save, call `createGroupNote` instead of `createNote`. Add a new function before `doSave`:

```typescript
const doGroupSave = useCallback(
  async (
    date: string,
    duration: number,
    type: SessionType,
    data: StructuredData,
    patientIds: Id<"patients">[],
  ) => {
    if (isSaving.current) return;
    if (patientIds.length < 2) return;
    isSaving.current = true;
    try {
      const result = await createGroupNote({
        patientIds,
        sessionDate: date,
        sessionDuration: duration,
        sessionType: type,
        structuredData: data,
      });
      // Navigate to the first note in the group
      setCurrentNoteId(result.noteIds[0]);
      router.replace(`/patients/${patientId}/sessions/${result.noteIds[0]}`);
      toast.success(`Created ${result.noteIds.length} group session notes`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group session");
    } finally {
      isSaving.current = false;
    }
  },
  [createGroupNote, patientId, router],
);
```

In `scheduleAutoSave`, at the start check if group mode:

```typescript
// Inside scheduleAutoSave, before the timeout:
if (isGroupMode && !currentNoteIdRef.current) {
  // In group mode, don't auto-save — wait for explicit save
  return;
}
```

Add a "Create Group Session" button that appears when in group mode:

```tsx
{isGroupMode && !currentNoteId && (
  <Button
    onClick={() =>
      doGroupSave(
        sessionDate,
        sessionDuration,
        sessionType,
        structuredData,
        groupPatientIds,
      )
    }
    disabled={groupPatientIds.length < 2 || !structuredData.targetsWorkedOn.some(t => t.target.trim().length > 0)}
    className="w-full bg-primary-gradient text-white transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
  >
    <MaterialIcon icon="group_add" size="sm" />
    Create Group Session ({groupPatientIds.length} patients)
  </Button>
)}
```

- [ ] **2.9** Add group note rendering to `SessionNotesList`.

**File:** `src/features/session-notes/components/session-notes-list.tsx`

Modify the rendering logic to group notes by `groupSessionId`. In the component body, before the return:

```typescript
// Group notes by groupSessionId for display
const groupedNotes = notes ? (() => {
  const groups = new Map<string, typeof notes>();
  const ungrouped: typeof notes = [];
  for (const note of notes) {
    if (note.groupSessionId) {
      const existing = groups.get(note.groupSessionId) ?? [];
      existing.push(note);
      groups.set(note.groupSessionId, existing);
    } else {
      ungrouped.push(note);
    }
  }
  return { groups, ungrouped };
})() : null;
```

Replace the existing `{notes.map(...)}` block with:

```tsx
{groupedNotes && (
  <div className="flex flex-col gap-2">
    {/* Ungrouped (individual) notes */}
    {groupedNotes.ungrouped.map((note) => (
      <SessionNoteCard
        key={note._id}
        note={note}
        patientId={patientId}
      />
    ))}
    {/* Group session cards */}
    {Array.from(groupedNotes.groups.entries()).map(([groupId, groupNotes]) => (
      <div key={groupId} className="rounded-xl bg-surface-container/50 p-2">
        <div className="mb-1 flex items-center gap-2 px-2 py-1">
          <MaterialIcon icon="group" size="sm" className="text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Group Session ({groupNotes.length} patients)
          </span>
        </div>
        {groupNotes.map((note) => (
          <SessionNoteCard
            key={note._id}
            note={note}
            patientId={patientId}
          />
        ))}
      </div>
    ))}
  </div>
)}
```

- [ ] **2.10** Verify the app builds without errors.

```bash
npx next build 2>&1 | tail -20
```

- [ ] **2.11** Run all session notes tests.

```bash
npx vitest run convex/__tests__/sessionNotes.test.ts
```

- [ ] **2.12** Commit.

```
feat(session-notes): add group session notes for CPT 92508

SLPs can now create group session notes for 2-6 patients. Notes are
linked by a shared groupSessionId and displayed as grouped cards in
the session notes list. Schema extended with groupSessionId and
groupPatientIds fields.
```

---

## Task 3: Multi-Audience Progress Reports

**Files:**
- `convex/schema.ts` (extend progressReports table)
- `convex/progressReports.ts` (modify create mutation)
- `convex/__tests__/progressReports.test.ts` (add audience tests)
- `src/features/goals/lib/progress-prompt.ts` (add audience-specific prompts)
- `src/app/api/generate-report/route.ts` (accept audience param)
- `src/features/goals/components/progress-report-generator.tsx` (add audience selector)
- `src/features/goals/components/progress-report-viewer.tsx` (show audience badge)
- `src/features/goals/hooks/use-report-generation.ts` (pass audience)

### Steps

- [ ] **3.1** Write failing backend tests for audience field.

**File:** `convex/__tests__/progressReports.test.ts` -- add at the end:

```typescript
describe("progressReports audience field", () => {
  it("creates report with audience field", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const reportId = await t.mutation(api.progressReports.create, {
      patientId,
      reportType: "weekly-summary" as const,
      periodStart: "2026-03-21",
      periodEnd: "2026-03-28",
      goalSummaries: [VALID_GOAL_SUMMARY],
      overallNarrative: "Overall good progress this week.",
      audience: "parent",
    });
    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.audience).toBe("parent");
  });

  it("defaults to undefined audience for backward compatibility", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.audience).toBeUndefined();
  });

  it("accepts all three audience values", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Test",
    });

    for (const audience of ["clinical", "parent", "iep-team"] as const) {
      const reportId = await t.mutation(api.progressReports.create, {
        patientId,
        reportType: "monthly-summary" as const,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-28",
        goalSummaries: [VALID_GOAL_SUMMARY],
        overallNarrative: `Report for ${audience}`,
        audience,
      });
      const report = await t.query(api.progressReports.get, { reportId });
      expect(report.audience).toBe(audience);
    }
  });
});
```

- [ ] **3.2** Verify tests fail (audience field not in schema yet).

```bash
npx vitest run convex/__tests__/progressReports.test.ts
```

- [ ] **3.3** Add `audience` field to `progressReports` schema.

**File:** `convex/schema.ts`

In the `progressReports` table definition, after the `signedAt` field (line 479), add:

```typescript
audience: v.optional(v.union(
  v.literal("clinical"),
  v.literal("parent"),
  v.literal("iep-team"),
)),
```

- [ ] **3.4** Update the `create` mutation to accept `audience`.

**File:** `convex/progressReports.ts`

Add a validator near the top with the other validators:

```typescript
const audienceValidator = v.optional(v.union(
  v.literal("clinical"),
  v.literal("parent"),
  v.literal("iep-team"),
));
```

In the `create` mutation's `args`, add:

```typescript
audience: audienceValidator,
```

In the `create` mutation's handler, include `audience` in the insert:

```typescript
return await ctx.db.insert("progressReports", {
  patientId: args.patientId,
  slpUserId: ctx.slpUserId,
  reportType: args.reportType,
  periodStart: args.periodStart,
  periodEnd: args.periodEnd,
  goalSummaries: args.goalSummaries,
  overallNarrative: args.overallNarrative,
  status: "draft",
  audience: args.audience,
});
```

- [ ] **3.5** Verify backend tests pass.

```bash
npx vitest run convex/__tests__/progressReports.test.ts
```

- [ ] **3.6** Add audience-specific prompt variants to `progress-prompt.ts`.

**File:** `src/features/goals/lib/progress-prompt.ts`

Modify the `buildReportPrompt` function signature to accept an optional `audience` parameter:

```typescript
export function buildReportPrompt(
  patient: PatientContext,
  goals: GoalWithData[],
  reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report",
  periodStart: string,
  periodEnd: string,
  previousNarrative?: string,
  audience?: "clinical" | "parent" | "iep-team",
): string {
```

After the existing `reportTypeInstructions` object, add audience-specific instructions:

```typescript
const audienceInstructions: Record<string, string> = {
  "clinical":
    "Write in formal clinical language using standard scores and medical terminology. Include medical necessity justification, measurable outcomes, and clinician credentials language. Reference ASHA documentation standards.",
  "parent":
    "Write in clear, plain language that a parent with no clinical background can understand. Summarize goals in everyday terms. Celebrate progress enthusiastically. Describe next steps in accessible language. Avoid all jargon, abbreviations, and technical terms.",
  "iep-team":
    "Write using IDEA-aligned educational framing. Reference impact on educational access and classroom participation. Use phrases appropriate for school district documentation. Tie progress to educational benchmarks. Include how speech-language needs affect the student's ability to access the general education curriculum.",
};

const selectedAudience = audience ?? "clinical";
```

In the prompt construction, after the `${reportTypeInstructions[reportType]}` line, add:

```typescript
prompt += `\n\n## Audience: ${selectedAudience}
${audienceInstructions[selectedAudience]}`;
```

- [ ] **3.7** Modify the API route to accept and pass the `audience` parameter.

**File:** `src/app/api/generate-report/route.ts`

Update the Zod schema:

```typescript
const ReportInputSchema = z.object({
  patientId: z.string().min(1),
  reportType: z.enum(["weekly-summary", "monthly-summary", "iep-progress-report"]),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  audience: z.enum(["clinical", "parent", "iep-team"]).optional(),
});
```

Destructure `audience` from the parsed body:

```typescript
const { patientId, reportType, periodStart, periodEnd, audience } = parsedBody.data;
```

Pass `audience` to `buildReportPrompt`:

```typescript
const systemPrompt = buildReportPrompt(
  patient,
  goalsWithData,
  reportType,
  periodStart,
  periodEnd,
  previousNarrative,
  audience,
);
```

Pass `audience` when saving the report to Convex:

```typescript
const reportId = await convex.mutation(api.progressReports.create, {
  patientId: pid,
  reportType,
  periodStart,
  periodEnd,
  goalSummaries,
  overallNarrative: parsed.overallNarrative,
  audience: audience ?? "clinical",
});
```

- [ ] **3.8** Update the `useReportGeneration` hook to accept `audience`.

**File:** `src/features/goals/hooks/use-report-generation.ts`

Update the `generate` callback's args type:

```typescript
const generate = useCallback(
  async (args: {
    patientId: string;
    reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report";
    periodStart: string;
    periodEnd: string;
    audience?: "clinical" | "parent" | "iep-team";
  }) => {
```

No other changes needed -- `args` is already passed directly to `JSON.stringify(args)`.

- [ ] **3.9** Add audience selector to `ProgressReportGenerator`.

**File:** `src/features/goals/components/progress-report-generator.tsx`

Add state:

```typescript
type Audience = "clinical" | "parent" | "iep-team";
```

```typescript
const [audience, setAudience] = useState<Audience>("clinical");
```

Add import for RadioGroup (if not available, use buttons):

```typescript
import { cn } from "@/core/utils";
```

In the form area (inside `{!reportId && status !== "generating" && (...)}`), after the period date inputs and before the error display, add:

```tsx
<div className="flex flex-col gap-2">
  <Label>Audience</Label>
  <div className="flex gap-2">
    {([
      { value: "clinical" as Audience, label: "Clinical", icon: "medical_services" },
      { value: "parent" as Audience, label: "Parent-Friendly", icon: "family_restroom" },
      { value: "iep-team" as Audience, label: "IEP Team", icon: "school" },
    ]).map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => setAudience(opt.value)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
          audience === opt.value
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground hover:text-foreground",
        )}
      >
        <MaterialIcon icon={opt.icon} size="xs" />
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

Pass `audience` in `handleGenerate`:

```typescript
async function handleGenerate() {
  await generate({
    patientId: patientId as string,
    reportType,
    periodStart,
    periodEnd,
    audience,
  });
}
```

- [ ] **3.10** Display audience badge in `ProgressReportViewer`.

**File:** `src/features/goals/components/progress-report-viewer.tsx`

Add a helper near the top of the file:

```typescript
const AUDIENCE_LABELS: Record<string, { label: string; icon: string }> = {
  clinical: { label: "Clinical", icon: "medical_services" },
  parent: { label: "Parent-Friendly", icon: "family_restroom" },
  "iep-team": { label: "IEP Team", icon: "school" },
};
```

In the report header section (inside the `<div className="flex items-center justify-between print:hidden">`), after the report type / period display, add:

```tsx
{report.audience && AUDIENCE_LABELS[report.audience] && (
  <span className="flex items-center gap-1 rounded-full bg-info-container px-2.5 py-0.5 text-xs font-medium text-on-info-container">
    <MaterialIcon icon={AUDIENCE_LABELS[report.audience].icon} size="xs" />
    {AUDIENCE_LABELS[report.audience].label}
  </span>
)}
```

- [ ] **3.11** Verify the app builds without errors.

```bash
npx next build 2>&1 | tail -20
```

- [ ] **3.12** Run all progress report tests.

```bash
npx vitest run convex/__tests__/progressReports.test.ts
```

- [ ] **3.13** Commit.

```
feat(progress-reports): add multi-audience report generation

Progress reports can now be generated for three audiences: Clinical
(formal language), Parent-Friendly (plain language), and IEP Team
(educational framing). Audience selector added to generator, badge
displayed on viewer, and prompt variants switch AI output style.
```

---

## Task 4: Physician Signature Display on Reports

> **DEPENDENCY:** This task requires SP2's `plansOfCare` table to exist in the schema. If SP2 has not been implemented yet, this task must be deferred until SP2 lands. The `plansOfCare` table should have at minimum: `patientId`, `physicianSignatureOnFile` (boolean), `physicianName` (string), `physicianNPI` (string), and `physicianSignatureDate` (string).

**Files:**
- `src/features/goals/components/progress-report-viewer.tsx` (add physician sig display)
- `src/features/goals/hooks/use-report-generation.ts` (add plan-of-care query hook)
- `convex/plansOfCare.ts` (query -- assumed to exist from SP2)

### Steps

- [ ] **4.1** Verify SP2's `plansOfCare` table exists in the schema.

```bash
grep -n "plansOfCare" convex/schema.ts
```

If this returns no results, **STOP** -- SP2 must be implemented first. Add a comment in the codebase and skip to the commit step.

- [ ] **4.2** Add a hook to query the latest Plan of Care for a patient.

**File:** `src/features/goals/hooks/use-report-generation.ts`

Add at the end of the file:

```typescript
export function usePlanOfCare(patientId: Id<"patients"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.plansOfCare.getLatestForPatient,
    isAuthenticated && patientId ? { patientId } : "skip",
  );
}
```

> **Note:** If `api.plansOfCare.getLatestForPatient` does not exist in SP2's implementation, the query name may differ. Check `convex/plansOfCare.ts` for the correct export name. If SP2 uses a different query pattern, create a simple query:

**File:** `convex/plansOfCare.ts` (only if the query doesn't already exist -- add this query)

```typescript
export const getLatestForPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;
    if (patient.slpUserId !== ctx.slpUserId) return null;

    const plans = await ctx.db
      .query("plansOfCare")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(1);

    return plans[0] ?? null;
  },
});
```

- [ ] **4.3** Add physician signature display to `ProgressReportViewer`.

**File:** `src/features/goals/components/progress-report-viewer.tsx`

Add the hook import:

```typescript
import { usePlanOfCare } from "../hooks/use-report-generation";
```

Inside the component, after the `report` query, add:

```typescript
const planOfCare = usePlanOfCare(report?.patientId ?? null);
```

After the overall summary section and before the action buttons, add:

```tsx
{/* Physician Signature Status */}
<div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-4 py-3 print:break-inside-avoid">
  <h4 className="text-sm font-semibold">Physician Signature</h4>
  {planOfCare?.physicianSignatureOnFile ? (
    <div className="flex items-center gap-2 text-sm text-success">
      <MaterialIcon icon="verified" size="sm" />
      <span>
        Signature on file — {planOfCare.physicianName}
        {planOfCare.physicianNPI && ` (NPI: ${planOfCare.physicianNPI})`}
        {planOfCare.physicianSignatureDate && (
          <span className="text-muted-foreground">
            {" "}— signed {planOfCare.physicianSignatureDate}
          </span>
        )}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <MaterialIcon icon="pending" size="sm" />
      <span>Physician signature: Not on file</span>
    </div>
  )}
</div>
```

- [ ] **4.4** Verify the app builds without errors.

```bash
npx next build 2>&1 | tail -20
```

- [ ] **4.5** Commit.

```
feat(progress-reports): display physician signature status from Plan of Care

Progress report viewer now shows whether a physician signature is on
file (from SP2's plansOfCare table), including physician name, NPI,
and signature date. Displays "Not on file" when no POC exists.
```

---

## Verification

- [ ] **V.1** Run the full test suite to ensure no regressions.

```bash
npx vitest run
```

- [ ] **V.2** Run a build to verify no TypeScript or compilation errors.

```bash
npx next build
```

---

## Task Summary

| # | Task | Type | Files Changed | Tests Added | Dependencies |
|---|------|------|--------------|-------------|--------------|
| 1 | Same-day signature warning | Frontend only | 3 modified, 1 new test | 7 unit tests | None |
| 2 | Group session notes (CPT 92508) | Schema + Backend + Frontend | 2 schema, 2 backend, 4 frontend | 4 backend tests | None |
| 3 | Multi-audience progress reports | Schema + API route + Frontend | 1 schema, 2 backend, 3 frontend, 1 route | 3 backend tests | None |
| 4 | Physician signature display | Frontend (read-only) | 2 frontend, 0-1 backend query | 0 (display only) | **SP2 `plansOfCare` table** |

**Total estimated tests added:** 14
**Schema changes:** `sessionNotes` (+2 fields, +1 index), `progressReports` (+1 field)
**New files:** `group-patient-picker.tsx`, `session-utils.test.ts`
