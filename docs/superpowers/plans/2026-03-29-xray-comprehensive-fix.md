# X-Ray Comprehensive Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all remaining X-Ray issues — fix cross-slice coupling, decompose route.ts, expand test coverage, tighten schema, build production billing, and expand templates + my-tools.

**Architecture:** Staged worktree execution. ARCH-1 and CHURN-1 run in parallel worktrees (they touch different files). TEST-3/4/5 runs after ARCH-1 merges (depends on new import paths). SCHEMA-1, SLICE-1, SLICE-2 run sequentially on main.

**Tech Stack:** Next.js 16, Convex, Clerk v7, Vitest + RTL, @convex-dev/stripe, Tailwind v4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-29-xray-issues-comprehensive-design.md`

---

## Phase 1: ARCH-1 — Cross-Slice Coupling Fix (Worktree 1)

> Branch: `fix/arch-cross-slice-coupling`

### File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/shared/clinical/use-patient.ts` | Re-export `usePatient` hook for cross-slice use |
| Create | `src/shared/clinical/use-active-goals.ts` | Re-export `useActiveGoals` hook for cross-slice use |
| Create | `src/shared/clinical/patient-utils.ts` | Shared formatters (`formatAge`, `calculateAge`, `getInitials`) |
| Create | `src/shared/clinical/types.ts` | Shared clinical types (Patient, Goal doc types) |
| Create | `src/shared/clinical/index.ts` | Barrel export for all clinical shared modules |
| Move | `src/shared/components/share-dialog.tsx` | ShareDialog moved from sharing feature |
| Modify | `src/features/session-notes/components/structured-data-form.tsx` | Update imports to shared clinical |
| Modify | `src/features/session-notes/components/session-note-editor.tsx` | Update imports to shared clinical |
| Modify | `src/features/patients/components/patient-detail-page.tsx` | Remove cross-slice imports, accept children |
| Modify | `src/app/(app)/patients/[id]/page.tsx` | Compose slices at route level |
| Modify | `src/features/builder/components/builder-page.tsx` | Import ShareDialog from shared |
| Modify | `src/features/patients/hooks/use-patients.ts` | Keep original, add re-export note |
| Modify | `src/features/goals/hooks/use-goals.ts` | Keep original, add re-export note |

---

### Task 1: Create shared clinical hooks

**Files:**
- Create: `src/shared/clinical/use-patient.ts`
- Create: `src/shared/clinical/use-active-goals.ts`
- Create: `src/shared/clinical/patient-utils.ts`
- Create: `src/shared/clinical/types.ts`
- Create: `src/shared/clinical/index.ts`

- [ ] **Step 1: Create `src/shared/clinical/types.ts`**

```typescript
import type { Doc } from "../../../convex/_generated/dataModel";

/** Shared patient document type used across clinical slices */
export type Patient = Doc<"patients">;

/** Shared goal document type used across clinical slices */
export type Goal = Doc<"goals">;
```

- [ ] **Step 2: Create `src/shared/clinical/use-patient.ts`**

This re-exports from the patients feature so other features import from shared, not from patients directly.

```typescript
/**
 * Shared hook: import from here in cross-slice contexts.
 * Canonical implementation lives in @/features/patients/hooks/use-patients.
 */
export { usePatient } from "@/features/patients/hooks/use-patients";
```

- [ ] **Step 3: Create `src/shared/clinical/use-active-goals.ts`**

```typescript
/**
 * Shared hook: import from here in cross-slice contexts.
 * Canonical implementation lives in @/features/goals/hooks/use-goals.
 */
export { useActiveGoals } from "@/features/goals/hooks/use-goals";
```

- [ ] **Step 4: Create `src/shared/clinical/patient-utils.ts`**

```typescript
/**
 * Shared patient utilities: import from here in cross-slice contexts.
 * Canonical implementation lives in @/features/patients/lib/patient-utils.
 */
export {
  calculateAge,
  formatAge,
  getInitials,
} from "@/features/patients/lib/patient-utils";
```

- [ ] **Step 5: Create `src/shared/clinical/index.ts` barrel**

```typescript
export { usePatient } from "./use-patient";
export { useActiveGoals } from "./use-active-goals";
export { calculateAge, formatAge, getInitials } from "./patient-utils";
export type { Patient, Goal } from "./types";
```

- [ ] **Step 6: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/shared/clinical/
git commit -m "feat(shared): add clinical shared layer — hooks, utils, types"
```

---

### Task 2: Update session-notes imports to use shared clinical

**Files:**
- Modify: `src/features/session-notes/components/structured-data-form.tsx:13-17`
- Modify: `src/features/session-notes/components/session-note-editor.tsx:10`

- [ ] **Step 1: Update structured-data-form.tsx imports**

Replace the cross-slice imports (lines 13-17):

```typescript
// OLD:
// Accepted cross-feature dependency: session-notes depends on goals for target linking.
// This is a hub-pattern import where session notes are the aggregation point.
import { useActiveGoals } from "@/features/goals/hooks/use-goals";
import { DurationPresetInput } from "./duration-preset-input";
import { formatAge } from "@/features/patients/lib/patient-utils";

// NEW:
import { useActiveGoals, formatAge } from "@/shared/clinical";
import { DurationPresetInput } from "./duration-preset-input";
```

- [ ] **Step 2: Update session-note-editor.tsx import**

Replace line 10:

```typescript
// OLD:
import { usePatient } from "@/features/patients/hooks/use-patients";

// NEW:
import { usePatient } from "@/shared/clinical";
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Run existing session-notes tests**

Run: `npx vitest run src/features/session-notes/ --reporter=verbose 2>&1 | tail -20`
Expected: All 2 test files pass

- [ ] **Step 5: Commit**

```bash
git add src/features/session-notes/components/structured-data-form.tsx src/features/session-notes/components/session-note-editor.tsx
git commit -m "refactor(session-notes): import clinical hooks from shared layer"
```

---

### Task 3: Refactor patient-detail-page to route-level composition

**Files:**
- Modify: `src/features/patients/components/patient-detail-page.tsx`
- Modify: `src/app/(app)/patients/[id]/page.tsx`

- [ ] **Step 1: Add children prop to patient-detail-page.tsx**

Replace the entire file. The key change: remove `SessionNotesList` and `GoalsList` imports, accept `children` as a ReactNode rendered in the left column. We use `children` (not a render function) because the route page is a Server Component and functions aren't serializable across the server/client boundary.

> **Important:** Since `PatientDetailPage` is a Client Component (`"use client"`) and needs the `patientId` to pass to clinical widgets, but the route page is a Server Component that can't pass functions, we solve this by making the route page a Client Component too. This is acceptable because it's a thin wrapper.

```typescript
"use client";

import { use, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatient } from "../hooks/use-patients";
import { PatientProfileWidget } from "./patient-profile-widget";
import { ActivityTimeline } from "./activity-timeline";
import { AssignedMaterials } from "./assigned-materials";
import { CaregiverInfo } from "./caregiver-info";
import { HomeProgramsWidget } from "./home-programs-widget";
import { QuickNotes } from "./quick-notes";
import { CreateMaterialButton } from "./create-material-button";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PatientDetailPageProps {
  paramsPromise: Promise<{ id: string }>;
  /** Injected by the route page — cross-slice widgets rendered in left column */
  clinicalWidgets?: (patientId: Id<"patients">) => ReactNode;
}

export function PatientDetailPage({ paramsPromise, clinicalWidgets }: PatientDetailPageProps) {
  const { id } = use(paramsPromise);
  const patient = usePatient(id as Id<"patients">);

  if (patient === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (patient === null) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header with back link + actions */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/patients">
            <MaterialIcon icon="arrow_back" size="sm" />
            Back to Caseload
          </Link>
        </Button>
        <CreateMaterialButton patientId={patient._id} />
      </div>

      {/* Profile card (full width) */}
      <PatientProfileWidget patient={patient} />

      {/* Two-column widget grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column — clinical widgets injected by route */}
        <div className="flex flex-col gap-6">
          {clinicalWidgets?.(patient._id)}
          <ActivityTimeline patientId={patient._id} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <AssignedMaterials patientId={patient._id} />
          <CaregiverInfo patientId={patient._id} />
          <HomeProgramsWidget patientId={patient._id} />
        </div>
      </div>

      {/* Notes (full width) */}
      <QuickNotes patient={patient} />
    </div>
  );
}
```

- [ ] **Step 2: Update the route page to compose slices**

Replace `src/app/(app)/patients/[id]/page.tsx`. This must be a Client Component because it passes a render function (clinicalWidgets) to PatientDetailPage — functions can't cross the server/client boundary.

```typescript
"use client";

import { PatientDetailPage } from "@/features/patients/components/patient-detail-page";
import { GoalsList } from "@/features/goals/components/goals-list";
import { SessionNotesList } from "@/features/session-notes/components/session-notes-list";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function PatientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PatientDetailPage
      paramsPromise={params}
      clinicalWidgets={(patientId: Id<"patients">) => (
        <>
          <GoalsList patientId={patientId} />
          <SessionNotesList patientId={patientId} />
        </>
      )}
    />
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Run patients tests**

Run: `npx vitest run src/features/patients/ --reporter=verbose 2>&1 | tail -30`
Expected: All 14 test files pass (tests mock child components, so render props change is invisible)

- [ ] **Step 5: Commit**

```bash
git add src/features/patients/components/patient-detail-page.tsx src/app/\(app\)/patients/\[id\]/page.tsx
git commit -m "refactor(patients): route-level composition for cross-slice widgets"
```

---

### Task 4: Move ShareDialog to shared

**Files:**
- Create: `src/shared/components/share-dialog.tsx` (copy from sharing)
- Modify: `src/features/builder/components/builder-page.tsx:9`
- Modify: `src/features/sharing/components/share-dialog.tsx` (re-export from shared)

- [ ] **Step 1: Copy ShareDialog to shared**

Copy `src/features/sharing/components/share-dialog.tsx` → `src/shared/components/share-dialog.tsx` (contents identical — no changes needed to the component itself since it only imports from `@/core/` and `@/shared/`).

- [ ] **Step 2: Update sharing feature to re-export from shared**

Replace `src/features/sharing/components/share-dialog.tsx`:

```typescript
/**
 * Re-export from shared — ShareDialog is used by multiple features.
 * Canonical implementation: @/shared/components/share-dialog
 */
export { ShareDialog } from "@/shared/components/share-dialog";
```

- [ ] **Step 3: Update builder-page.tsx import**

Replace line 9:

```typescript
// OLD:
import { ShareDialog } from "@/features/sharing/components/share-dialog";

// NEW:
import { ShareDialog } from "@/shared/components/share-dialog";
```

- [ ] **Step 4: Verify no more cross-slice imports**

Run: `grep -rn "from \"@/features/" src/features/patients/components/patient-detail-page.tsx src/features/session-notes/components/structured-data-form.tsx src/features/session-notes/components/session-note-editor.tsx src/features/builder/components/builder-page.tsx | grep -v "from \"@/features/builder\|from \"@/features/patients\|from \"@/features/session-notes\|from \"@/features/goals\|from \"@/features/sharing" || echo "Clean"`

Then verify the remaining feature imports are only self-referencing:

Run: `grep -rn "from \"@/features/" src/features/patients/components/patient-detail-page.tsx src/features/session-notes/components/ src/features/builder/components/builder-page.tsx`

Expected: Only imports from their own feature directory (e.g., `session-notes` importing from `../hooks/`, `patients` importing from `../hooks/`). No cross-feature imports.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/share-dialog.tsx src/features/sharing/components/share-dialog.tsx src/features/builder/components/builder-page.tsx
git commit -m "refactor: move ShareDialog to shared, eliminate all cross-slice imports"
```

---

## Phase 2: CHURN-1 — Route.ts Decomposition (Worktree 2)

> Branch: `refactor/route-decomposition`
> Runs in parallel with Phase 1.
> **Task ordering:** Tasks 5-9 MUST run sequentially before Task 10. Task 10 imports from all modules created in Tasks 5-9.

### File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/api/generate/lib/authenticate.ts` | Clerk auth + Convex client setup |
| Create | `src/app/api/generate/lib/load-patient-context.ts` | Fetch patient + goals, build context block |
| Create | `src/app/api/generate/lib/stream-generation.ts` | Tool runner loop, LLM streaming |
| Create | `src/app/api/generate/lib/bundle-and-persist.ts` | esbuild bundling + file batch persistence |
| Create | `src/app/api/generate/lib/session-lifecycle.ts` | Session create/recover, state transitions, summary |
| Modify | `src/app/api/generate/route.ts` | Thin orchestrator (~80-100 lines) |

---

### Task 5: Extract authenticate module

**Files:**
- Create: `src/app/api/generate/lib/authenticate.ts`

- [ ] **Step 1: Create authenticate.ts**

Extract lines 59-73 of route.ts into a standalone function:

```typescript
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export interface AuthResult {
  convex: ConvexHttpClient;
  userId: string | undefined;
}

/**
 * Authenticates the request via Clerk and sets up an authenticated Convex client.
 * Returns undefined userId for unauthenticated (demo) users.
 */
export async function authenticate(): Promise<AuthResult> {
  const convex = new ConvexHttpClient(CONVEX_URL);
  const { userId: clerkUserId, getToken } = await auth();
  const userId = clerkUserId ?? undefined;

  const token = await getToken({ template: "convex" }).catch(() => null);
  if (token) {
    convex.setAuth(token);
  }

  return { convex, userId };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/lib/authenticate.ts
git commit -m "refactor(generate): extract authenticate module"
```

---

### Task 6: Extract load-patient-context module

**Files:**
- Create: `src/app/api/generate/lib/load-patient-context.ts`

- [ ] **Step 1: Create load-patient-context.ts**

Extract lines 107-124 of route.ts:

```typescript
import type { ConvexHttpClient } from "convex/browser";
import {
  sanitizePatientContext,
  buildPatientContextBlock,
} from "@/features/builder/lib/patient-context";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Fetches patient and goal data from Convex, sanitizes it, and builds
 * a formatted context block for the LLM system prompt.
 * Returns undefined on error (graceful degradation).
 */
export async function loadPatientContext(
  convex: ConvexHttpClient,
  patientId: Id<"patients"> | undefined,
): Promise<string | undefined> {
  if (!patientId) return undefined;

  try {
    const [patientCtx, activeGoals] = await Promise.all([
      convex.query(api.patients.getForContext, { patientId }),
      convex.query(api.goals.listActive, { patientId }),
    ]);

    if (!patientCtx) return undefined;

    const { patient, goals } = sanitizePatientContext(
      patientCtx,
      activeGoals ?? [],
    );
    return buildPatientContextBlock(patient, goals);
  } catch (err) {
    console.error("[generate] Failed to load patient context:", err);
    return undefined;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/lib/load-patient-context.ts
git commit -m "refactor(generate): extract load-patient-context module"
```

---

### Task 7: Extract session-lifecycle module

**Files:**
- Create: `src/app/api/generate/lib/session-lifecycle.ts`

- [ ] **Step 1: Create session-lifecycle.ts**

Extract session creation (lines 126-134), state transitions (line 316), failure handling (lines 337-345), and summary message (lines 297-314):

```typescript
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface CreateSessionOpts {
  convex: ConvexHttpClient;
  existingSessionId?: Id<"sessions">;
  title: string;
  query: string;
  type: "builder" | "flashcards";
  patientId?: Id<"patients">;
}

/** Create a new session or reuse an existing one. */
export async function createOrReuseSession(
  opts: CreateSessionOpts,
): Promise<Id<"sessions">> {
  if (opts.existingSessionId) return opts.existingSessionId;

  return await opts.convex.mutation(api.sessions.create, {
    title: opts.title.slice(0, 60),
    query: opts.query,
    type: opts.type,
    ...(opts.patientId ? { patientId: opts.patientId } : {}),
  });
}

/** Persist the initial user message for a new session. */
export async function persistUserMessage(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions">,
  content: string,
): Promise<void> {
  await convex.mutation(api.messages.create, {
    sessionId,
    role: "user",
    content,
    timestamp: Date.now(),
  });
}

/** Transition session to live and persist the summary message. */
export async function completeSession(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions">,
  opts: { isFlashcardMode: boolean; buildSucceeded: boolean },
): Promise<void> {
  const friendlyMsg = opts.isFlashcardMode
    ? "Your flashcards are ready! Swipe through them to practice."
    : opts.buildSucceeded
      ? "Your app is ready! Try it out in the preview."
      : "I created your app but the preview needs a small fix. Check the code panel.";

  await Promise.allSettled([
    convex.mutation(api.messages.create, {
      sessionId,
      role: "assistant",
      content: friendlyMsg,
      timestamp: Date.now(),
    }),
  ]);

  await convex.mutation(api.sessions.setLive, { sessionId });
}

/** Mark session as failed with error details. */
export async function failSession(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions"> | undefined,
  error: unknown,
): Promise<void> {
  if (!sessionId) return;
  try {
    const message =
      error instanceof Error ? error.message : String(error);
    await convex.mutation(api.sessions.setFailed, {
      sessionId,
      error: message.slice(0, 500),
    });
  } catch (persistError) {
    console.error("[generate] Failed to persist error state:", persistError);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/lib/session-lifecycle.ts
git commit -m "refactor(generate): extract session-lifecycle module"
```

---

### Task 8: Extract stream-generation module

**Files:**
- Create: `src/app/api/generate/lib/stream-generation.ts`

- [ ] **Step 1: Create stream-generation.ts**

Extract the LLM tool runner loop (lines 170-213), scaffold setup (lines 176-180), and tool creation (lines 182-184):

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { cpSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { ConvexHttpClient } from "convex/browser";
import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { createAgentTools } from "@/features/builder/lib/agent-tools";
import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface StreamOpts {
  anthropic: Anthropic;
  convex: ConvexHttpClient;
  sessionId: Id<"sessions">;
  query: string;
  blueprintData?: object;
  patientContextBlock?: string;
  isFlashcardMode: boolean;
  send: (event: string, data: object) => void;
  isAborted: () => boolean;
}

export interface StreamResult {
  collectedFiles: Map<string, string>;
  buildDir: string | undefined;
}

/**
 * Runs the LLM tool loop — streams tokens and tool calls to the client.
 * Returns collected files and the build directory path.
 */
export async function streamGeneration(opts: StreamOpts): Promise<StreamResult> {
  const {
    anthropic, convex, sessionId, query, blueprintData,
    patientContextBlock, isFlashcardMode, send, isAborted,
  } = opts;

  const collectedFiles = new Map<string, string>();
  let buildDir: string | undefined;

  // Set up scaffold for builder mode
  if (!isFlashcardMode) {
    buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
    cpSync(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, {
      recursive: true,
    });
  }

  // Select prompt and tools based on mode
  const systemPrompt = isFlashcardMode
    ? buildFlashcardSystemPrompt()
    : buildSystemPrompt(patientContextBlock);

  const tools = isFlashcardMode
    ? createFlashcardTools({ send, sessionId, convex })
    : createAgentTools({
        send,
        sessionId,
        collectedFiles,
        convex,
        buildDir: buildDir!,
      });

  // Build user message
  const userContent = blueprintData
    ? `## Pre-Approved Blueprint\n\n${JSON.stringify(blueprintData, null, 2)}\n\n## User Request\n\n${query}`
    : query;

  // Run the tool loop
  const runner = anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-6",
    max_tokens: isFlashcardMode ? 4096 : 32768,
    system: systemPrompt,
    tools,
    messages: [{ role: "user", content: userContent }],
    stream: true,
    max_iterations: 10,
  });

  for await (const messageStream of runner) {
    if (isAborted()) break;
    for await (const event of messageStream) {
      if (isAborted()) break;
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        send("token", { token: event.delta.text });
      }
    }
  }

  return { collectedFiles, buildDir };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/lib/stream-generation.ts
git commit -m "refactor(generate): extract stream-generation module"
```

---

### Task 9: Extract bundle-and-persist module

**Files:**
- Create: `src/app/api/generate/lib/bundle-and-persist.ts`

- [ ] **Step 1: Create bundle-and-persist.ts**

Extract bundling (lines 215-266) and file persistence (lines 269-292):

```typescript
import type { ConvexHttpClient } from "convex/browser";
import { acquireBuildSlot } from "../build-limiter";
import { runBundleWorker } from "../run-bundle-worker";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface BundleOpts {
  convex: ConvexHttpClient;
  sessionId: Id<"sessions">;
  collectedFiles: Map<string, string>;
  buildDir: string;
  send: (event: string, data: object) => void;
}

interface PersistOpts {
  convex: ConvexHttpClient;
  sessionId: Id<"sessions">;
  collectedFiles: Map<string, string>;
}

/**
 * Bundles generated files via esbuild worker with retry logic.
 * Returns the HTML bundle string, or empty string on failure.
 */
export async function bundleFiles(opts: BundleOpts): Promise<{
  html: string;
  succeeded: boolean;
}> {
  const { convex, sessionId, collectedFiles, buildDir, send } = opts;

  if (collectedFiles.size === 0) {
    return { html: "", succeeded: false };
  }

  const release = await acquireBuildSlot();

  try {
    let bundleHtml = "";

    try {
      bundleHtml = await runBundleWorker(buildDir);
      if (bundleHtml.length < 200) throw new Error("Bundle too small");
    } catch {
      send("activity", {
        type: "thinking",
        message: "Preview build hiccup — retrying...",
      });
      await new Promise((r) => setTimeout(r, 1000));

      try {
        bundleHtml = await runBundleWorker(buildDir);
        if (bundleHtml.length < 200) throw new Error("Bundle too small");
      } catch {
        send("activity", {
          type: "complete",
          message: "Preview couldn't be built — check the code panel.",
        });
        return { html: "", succeeded: false };
      }
    }

    // Persist bundle
    send("activity", { type: "thinking", message: "Almost ready..." });
    send("bundle", { html: bundleHtml });

    try {
      await convex.mutation(api.generated_files.upsertAutoVersion, {
        sessionId,
        path: "_bundle.html",
        contents: bundleHtml,
      });
    } catch (err) {
      console.error("[generate] Failed to persist bundle:", err);
    }

    return { html: bundleHtml, succeeded: true };
  } finally {
    release();
  }
}

/**
 * Persists all collected files to Convex in batches.
 * Returns the file array for the done event.
 */
export async function persistFiles(
  opts: PersistOpts,
): Promise<Array<{ path: string; contents: string }>> {
  const { convex, sessionId, collectedFiles } = opts;

  const fileArray = [...collectedFiles.entries()].map(([path, contents]) => ({
    path,
    contents,
  }));

  const thunks = fileArray.map(
    ({ path, contents }) => () =>
      convex.mutation(api.generated_files.upsertAutoVersion, {
        sessionId,
        path,
        contents,
      }),
  );

  // Batch to avoid Convex rate limits
  const batchSize = 10;
  for (let i = 0; i < thunks.length; i += batchSize) {
    const batch = thunks.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map((fn) => fn()));
    const failures = settled.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error(
        `[generate] ${failures.length} file persistence failure(s) in batch ${Math.floor(i / batchSize)}`,
      );
    }
  }

  return fileArray;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/lib/bundle-and-persist.ts
git commit -m "refactor(generate): extract bundle-and-persist module"
```

---

### Task 10: Rewrite route.ts as thin orchestrator

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Rewrite route.ts**

Replace the entire file with the thin orchestrator that calls the extracted modules:

```typescript
import "esbuild"; // Force into file trace for bundle worker

import { rmSync } from "fs";
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";
import Anthropic from "@anthropic-ai/sdk";
import { sseEncode } from "./sse";
import { authenticate } from "./lib/authenticate";
import { loadPatientContext } from "./lib/load-patient-context";
import {
  createOrReuseSession,
  persistUserMessage,
  completeSession,
  failSession,
} from "./lib/session-lifecycle";
import { streamGeneration } from "./lib/stream-generation";
import { bundleFiles, persistFiles } from "./lib/bundle-and-persist";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");

const anthropic = new Anthropic();

function jsonErrorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  // 1. Auth
  const { convex, userId } = await authenticate();

  // 2. Validate
  let body: unknown;
  try { body = await request.json(); } catch {
    return jsonErrorResponse("Invalid JSON", 400);
  }
  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) return jsonErrorResponse("Invalid input", 400);

  // 3. Quota check (soft limit — warn but don't block)
  if (userId) {
    try {
      const quota = await convex.query(api.usage.checkQuota, {});
      if (quota && !quota.allowed) {
        // Soft limit: return upgrade prompt, don't hard-block
        return Response.json({ error: "quota_exceeded", reason: quota.reason }, { status: 402 });
      }
    } catch { /* proceed on quota check failure */ }
  }

  // 4. Rate limit
  const rateLimitKey = userId
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "anonymous";
  try {
    await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: rateLimitKey });
  } catch { return jsonErrorResponse("Rate limit exceeded", 429); }

  // 4. Extract input
  const { query: queryField, prompt, blueprint: blueprintData, mode, sessionId: providedSessionId, patientId } = parsed.data;
  const query = (queryField ?? prompt)!;
  const isFlashcardMode = mode === "flashcards";

  // 5. Patient context (graceful degradation)
  const patientContextBlock = await loadPatientContext(convex, patientId as Id<"patients"> | undefined);

  // 6. Session
  const sessionId = await createOrReuseSession({
    convex,
    existingSessionId: providedSessionId as Id<"sessions"> | undefined,
    title: query.slice(0, 60),
    query,
    type: isFlashcardMode ? "flashcards" : "builder",
    patientId: patientId as Id<"patients"> | undefined,
  });

  // 7. Stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (event: string, data: object) => {
        if (isAborted()) return;
        try { controller.enqueue(encoder.encode(sseEncode(event, data))); } catch {}
      };

      let buildDir: string | undefined;
      try {
        send("session", { sessionId });
        if (!providedSessionId) await persistUserMessage(convex, sessionId, query);

        // Stream LLM generation
        const result = await streamGeneration({
          anthropic, convex, sessionId, query, blueprintData,
          patientContextBlock, isFlashcardMode, send, isAborted,
        });
        buildDir = result.buildDir;

        // Bundle (builder mode only)
        let buildSucceeded = false;
        if (!isFlashcardMode && buildDir && result.collectedFiles.size > 0) {
          const bundle = await bundleFiles({ convex, sessionId, collectedFiles: result.collectedFiles, buildDir, send });
          buildSucceeded = bundle.succeeded;
        }

        // Persist files
        const fileArray = await persistFiles({ convex, sessionId, collectedFiles: result.collectedFiles });

        // Complete session
        await completeSession(convex, sessionId, { isFlashcardMode, buildSucceeded });
        send("activity", { type: "complete", message: buildSucceeded ? "App is live and ready!" : "Code generated" });
        send("status", { status: "live" });
        send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && result.collectedFiles.size > 0 });
      } catch (error) {
        const isDisconnect = isAborted() || (error instanceof Error && (
          error.message.includes("aborted") || error.name === "AbortError"
        ));
        if (!isDisconnect) {
          console.error("[generate] Error:", error instanceof Error ? error.stack : error);
          await failSession(convex, sessionId, error);
          send("error", { message: "Generation failed — please try again" });
        }
      } finally {
        if (buildDir) try { rmSync(buildDir, { recursive: true, force: true }); } catch {}
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 4: Manually verify route works**

Run: `npx next dev` and test a generation in the browser (or run E2E test).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "refactor(generate): rewrite route.ts as thin orchestrator (~100 lines)"
```

---

## Phase 3: TEST-3/4/5 — Test Coverage Expansion (Worktree 3)

> Branch: `test/coverage-expansion`
> Runs AFTER Phase 1 (ARCH-1) merges — imports use `@/shared/clinical`.

### Mocking Patterns Reference

All component tests in this phase follow established patterns from `c021467`:
- `vi.mock("convex/react")` for `useQuery`/`useMutation`
- `vi.mock("@clerk/nextjs")` for `useUser`
- Child components mocked as `<div data-testid="child-name" />`
- Test states: loading (`undefined`), empty (`[]`/`null`), populated (mock data)
- Use `render()` + `screen.getBy*` + `fireEvent` from `@testing-library/react`

---

### Task 11: Session-notes — session-note-card tests

**Files:**
- Create: `src/features/session-notes/components/__tests__/session-note-card.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock MaterialIcon
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

import { SessionNoteCard } from "../session-note-card";

const mockNote = (overrides = {}) => ({
  _id: "note1" as any,
  _creationTime: Date.now(),
  patientId: "patient1" as any,
  slpUserId: "user1",
  sessionDate: "2026-03-29",
  sessionDuration: 30,
  sessionType: "in-person" as const,
  status: "draft" as const,
  structuredData: {
    targetsWorkedOn: [
      { targetDescription: "Articulation /s/", trials: 20, correct: 16, promptLevel: "independent" },
    ],
  },
  ...overrides,
});

describe("SessionNoteCard", () => {
  it("renders session date and duration", () => {
    render(<SessionNoteCard note={mockNote()} patientId={"patient1" as any} />);
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it("shows draft status badge", () => {
    render(<SessionNoteCard note={mockNote({ status: "draft" })} patientId={"patient1" as any} />);
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });

  it("shows signed status badge", () => {
    render(<SessionNoteCard note={mockNote({ status: "signed" })} patientId={"patient1" as any} />);
    expect(screen.getByText(/signed/i)).toBeInTheDocument();
  });

  it("calculates and displays accuracy", () => {
    render(<SessionNoteCard note={mockNote()} patientId={"patient1" as any} />);
    expect(screen.getByText(/80%/)).toBeInTheDocument();
  });

  it("renders as a link to the note detail", () => {
    render(<SessionNoteCard note={mockNote()} patientId={"patient1" as any} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", expect.stringContaining("patient1"));
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/features/session-notes/components/__tests__/session-note-card.test.tsx --reporter=verbose`
Expected: PASS (5 tests)

- [ ] **Step 3: Commit**

```bash
git add src/features/session-notes/components/__tests__/session-note-card.test.tsx
git commit -m "test(session-notes): add session-note-card component tests"
```

---

### Task 12: Session-notes — session-notes-list tests

**Files:**
- Create: `src/features/session-notes/components/__tests__/session-notes-list.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../session-note-card", () => ({
  SessionNoteCard: ({ note }: any) => <div data-testid="session-note-card">{note._id}</div>,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

import { useQuery } from "convex/react";
import { SessionNotesList } from "../session-notes-list";

const mockNotes = [
  { _id: "note1", _creationTime: Date.now(), sessionDate: "2026-03-29", status: "draft" },
  { _id: "note2", _creationTime: Date.now() - 1000, sessionDate: "2026-03-28", status: "signed" },
];

describe("SessionNotesList", () => {
  it("shows loading state when data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<SessionNotesList patientId={"patient1" as any} />);
    expect(screen.queryByTestId("session-note-card")).not.toBeInTheDocument();
  });

  it("shows empty state when no notes exist", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<SessionNotesList patientId={"patient1" as any} />);
    expect(screen.getByText(/no session notes/i)).toBeInTheDocument();
  });

  it("renders note cards when data is available", () => {
    vi.mocked(useQuery).mockReturnValue(mockNotes);
    render(<SessionNotesList patientId={"patient1" as any} />);
    expect(screen.getAllByTestId("session-note-card")).toHaveLength(2);
  });

  it("shows header with note count", () => {
    vi.mocked(useQuery).mockReturnValue(mockNotes);
    render(<SessionNotesList patientId={"patient1" as any} />);
    expect(screen.getByText(/session notes/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run src/features/session-notes/components/__tests__/session-notes-list.test.tsx --reporter=verbose`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/session-notes/components/__tests__/session-notes-list.test.tsx
git commit -m "test(session-notes): add session-notes-list component tests"
```

---

### Task 13: Session-notes — soap-preview tests

**Files:**
- Create: `src/features/session-notes/components/__tests__/soap-preview.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

import { SoapPreview } from "../soap-preview";

const mockSoap = {
  subjective: "Patient presented with articulation difficulty.",
  objective: "Produced /s/ with 80% accuracy across 20 trials.",
  assessment: "Steady progress toward articulation goals.",
  plan: "Continue with current treatment plan.",
};

describe("SoapPreview", () => {
  const defaultProps = {
    soapNote: mockSoap,
    streamedText: "",
    status: "complete" as const,
    error: undefined,
    aiGenerated: true,
    onGenerate: vi.fn(),
    onSign: vi.fn(),
    onUnsign: vi.fn(),
    onSaveEdit: vi.fn(),
  };

  it("renders all four SOAP sections", () => {
    render(<SoapPreview {...defaultProps} />);
    expect(screen.getByText(/subjective/i)).toBeInTheDocument();
    expect(screen.getByText(/objective/i)).toBeInTheDocument();
    expect(screen.getByText(/assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/plan/i)).toBeInTheDocument();
  });

  it("displays soap note content", () => {
    render(<SoapPreview {...defaultProps} />);
    expect(screen.getByText(/articulation difficulty/i)).toBeInTheDocument();
    expect(screen.getByText(/80% accuracy/i)).toBeInTheDocument();
  });

  it("shows generating state with streamed text", () => {
    render(
      <SoapPreview
        {...defaultProps}
        soapNote={null}
        status="generating"
        streamedText="Generating SOAP note..."
      />,
    );
    expect(screen.getByText(/generating soap/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(
      <SoapPreview {...defaultProps} soapNote={null} status="error" error="AI service unavailable" />,
    );
    expect(screen.getByText(/error|unavailable/i)).toBeInTheDocument();
  });

  it("shows idle placeholder when no SOAP note exists", () => {
    render(<SoapPreview {...defaultProps} soapNote={null} status="idle" />);
    expect(screen.getByText(/generate/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run src/features/session-notes/components/__tests__/soap-preview.test.tsx --reporter=verbose`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/session-notes/components/__tests__/soap-preview.test.tsx
git commit -m "test(session-notes): add soap-preview component tests"
```

---

### Task 14: Goals — goals-list tests

**Files:**
- Create: `src/features/goals/components/__tests__/goals-list.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

vi.mock("../goal-form", () => ({
  GoalForm: () => <div data-testid="goal-form" />,
}));

import { useQuery } from "convex/react";
import { GoalsList } from "../goals-list";

const mockGoals = [
  {
    _id: "goal1",
    _creationTime: Date.now(),
    domain: "articulation",
    shortDescription: "Produce /s/ in initial position",
    targetAccuracy: 80,
    status: "active",
  },
  {
    _id: "goal2",
    _creationTime: Date.now() - 1000,
    domain: "language-receptive",
    shortDescription: "Follow 2-step directions",
    targetAccuracy: 90,
    status: "active",
  },
];

describe("GoalsList", () => {
  it("shows loading state when data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.queryByText(/produce/i)).not.toBeInTheDocument();
  });

  it("shows empty state when no goals exist", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.getByText(/no goals/i)).toBeInTheDocument();
  });

  it("renders goal cards when data is available", () => {
    vi.mocked(useQuery).mockReturnValue(mockGoals);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.getByText(/Produce \/s\//i)).toBeInTheDocument();
    expect(screen.getByText(/Follow 2-step/i)).toBeInTheDocument();
  });

  it("displays domain badges", () => {
    vi.mocked(useQuery).mockReturnValue(mockGoals);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.getByText(/articulation/i)).toBeInTheDocument();
  });

  it("shows target accuracy", () => {
    vi.mocked(useQuery).mockReturnValue(mockGoals);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.getByText(/80%/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run src/features/goals/components/__tests__/goals-list.test.tsx --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add src/features/goals/components/__tests__/goals-list.test.tsx
git commit -m "test(goals): add goals-list component tests"
```

---

### Task 15: Goals — goal-form tests

**Files:**
- Create: `src/features/goals/components/__tests__/goal-form.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ children, onValueChange }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: any) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

import { GoalForm } from "../goal-form";

describe("GoalForm", () => {
  const defaultProps = {
    patientId: "patient1" as any,
    open: true,
    onOpenChange: vi.fn(),
  };

  it("renders the form when open", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<GoalForm {...defaultProps} open={false} />);
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("shows domain selection options", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("shows description input field", () => {
    render(<GoalForm {...defaultProps} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run src/features/goals/components/__tests__/goal-form.test.tsx --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add src/features/goals/components/__tests__/goal-form.test.tsx
git commit -m "test(goals): add goal-form component tests"
```

---

### Task 16: Family — message-thread tests

**Files:**
- Create: `src/features/family/components/__tests__/message-thread.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { id: "user1", fullName: "Test User" },
    isLoaded: true,
    isSignedIn: true,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

import { useQuery, useMutation } from "convex/react";
import { MessageThread } from "../message-thread";

const mockMessages = [
  {
    _id: "msg1",
    _creationTime: Date.now() - 2000,
    senderUserId: "user1",
    senderRole: "slp",
    content: "How did practice go today?",
    timestamp: Date.now() - 2000,
  },
  {
    _id: "msg2",
    _creationTime: Date.now() - 1000,
    senderUserId: "user2",
    senderRole: "caregiver",
    content: "Great! He said 15 words!",
    timestamp: Date.now() - 1000,
  },
];

describe("MessageThread", () => {
  const paramsPromise = Promise.resolve({ patientId: "patient1" });

  beforeEach(() => {
    vi.mocked(useMutation).mockReturnValue(vi.fn());
  });

  it("shows empty state when no messages", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<MessageThread paramsPromise={paramsPromise} />);
    expect(screen.getByText(/no messages/i)).toBeInTheDocument();
  });

  it("renders messages when data is available", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMessages);
    render(<MessageThread paramsPromise={paramsPromise} />);
    expect(await screen.findByText(/practice go today/i)).toBeInTheDocument();
    expect(screen.getByText(/15 words/i)).toBeInTheDocument();
  });

  it("has a message input field", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMessages);
    render(<MessageThread paramsPromise={paramsPromise} />);
    const input = await screen.findByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("has a send button", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMessages);
    render(<MessageThread paramsPromise={paramsPromise} />);
    const sendButton = await screen.findByRole("button", { name: /send/i });
    expect(sendButton).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run src/features/family/components/__tests__/message-thread.test.tsx --reporter=verbose`

- [ ] **Step 3: Run full test suite to confirm nothing broke**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/features/family/components/__tests__/message-thread.test.tsx
git commit -m "test(family): add message-thread component tests"
```

---

### Task 16b: Session-notes — structured-data-form and session-note-editor tests

**Files:**
- Create: `src/features/session-notes/components/__tests__/structured-data-form.test.tsx`
- Create: `src/features/session-notes/components/__tests__/session-note-editor.test.tsx`

- [ ] **Step 1: Write structured-data-form tests**

Mock `useActiveGoals` (now from `@/shared/clinical`), `formatAge`, child components. Test: renders patient context header with age, renders target entry fields, shows prompt level radio options, renders duration input.

- [ ] **Step 2: Write session-note-editor tests**

Mock `usePatient` (from `@/shared/clinical`), all session-note hooks. Test: renders editor layout, shows patient name, renders StructuredDataForm and SoapPreview children, handles create vs edit mode (with/without noteId prop).

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/session-notes/components/__tests__/ --reporter=verbose`

- [ ] **Step 4: Commit**

```bash
git add src/features/session-notes/components/__tests__/structured-data-form.test.tsx src/features/session-notes/components/__tests__/session-note-editor.test.tsx
git commit -m "test(session-notes): add structured-data-form and session-note-editor tests"
```

---

### Task 16c: Goals — progress-entry-form tests

**Files:**
- Create: `src/features/goals/components/__tests__/progress-entry-form.test.tsx`

- [ ] **Step 1: Write tests**

Mock Convex hooks. Test: renders trial and correct count inputs, calculates accuracy display (correct/trials), shows prompt level selector, validates non-negative numbers.

- [ ] **Step 2: Run test**

Run: `npx vitest run src/features/goals/components/__tests__/progress-entry-form.test.tsx --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add src/features/goals/components/__tests__/progress-entry-form.test.tsx
git commit -m "test(goals): add progress-entry-form component tests"
```

---

### Task 16d: Family — weekly-progress-chart and celebration-cards tests

**Files:**
- Create: `src/features/family/components/__tests__/weekly-progress.test.tsx`
- Create: `src/features/family/components/__tests__/celebration-card.test.tsx`

- [ ] **Step 1: Write weekly-progress tests**

Mock Convex hooks. Test: renders chart container, shows correct number of day columns, handles empty data state.

- [ ] **Step 2: Write celebration-card tests**

Mock props. Test: renders achievement text, displays appropriate icon, shows celebration animation trigger.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/family/components/__tests__/ --reporter=verbose`

- [ ] **Step 4: Commit**

```bash
git add src/features/family/components/__tests__/weekly-progress.test.tsx src/features/family/components/__tests__/celebration-card.test.tsx
git commit -m "test(family): add weekly-progress and celebration-card tests"
```

---

## Phase 4: SCHEMA-1 — Session State Tightening

> Runs on main after Phases 1-3 merge.

### Task 17: Tighten session state to union type (SCHEMA-1)

**Files:**
- Modify: `convex/schema.ts:9-11`

- [ ] **Step 1: Grep for all state string literals used in code**

Run: `grep -rn '"idle"\|"generating"\|"live"\|"failed"\|"blueprinting"\|"planning"\|"phase_implementing"' convex/ src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v __tests__ | head -30`

This identifies all state values actually used — verify they match the union.

- [ ] **Step 2: Update schema.ts**

Replace the `state: v.string()` line (around line 11) with:

```typescript
    state: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("live"),
      v.literal("failed"),
      // Legacy states — existing documents only, not created by new code
      v.literal("blueprinting"),
      v.literal("planning"),
      v.literal("phase_implementing"),
    ),
```

- [ ] **Step 3: Add SessionState type export**

At the bottom of `convex/schema.ts`, add:

```typescript
/** Active session states used by current code. Legacy states are read-only. */
export type SessionState = "idle" | "generating" | "live" | "failed";
```

- [ ] **Step 4: Push schema and verify Convex accepts it**

Run: `npx convex dev --once 2>&1 | tail -10`
Expected: Schema pushed successfully (existing documents with legacy states still validate)

- [ ] **Step 5: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -20`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts
git commit -m "refactor(schema): tighten session state to union type"
```

---

## Phase 5: SLICE-1 — Production Billing

> Runs sequentially after Phase 4.

### Task 18: Add usage table and backend functions

**Files:**
- Modify: `convex/schema.ts` (add usage table)
- Create: `convex/usage.ts`

- [ ] **Step 1: Add usage table to schema.ts**

After the existing table definitions, add:

```typescript
  usage: defineTable({
    userId: v.string(),
    periodStart: v.number(),
    generationCount: v.number(),
    appCount: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_period", ["userId", "periodStart"]),
```

- [ ] **Step 2: Create convex/usage.ts**

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";
import { checkPremiumStatus, FREE_LIMITS } from "./lib/billing";

import type { QueryCtx, MutationCtx } from "./_generated/server";

/** Get the start of the current billing period (1st of the month). */
function getCurrentPeriodStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/** Get or create the current period's usage record. */
async function getOrCreateUsage(ctx: QueryCtx | MutationCtx, userId: string) {
  const periodStart = getCurrentPeriodStart();
  const existing = await ctx.db
    .query("usage")
    .withIndex("by_userId_period", (q) =>
      q.eq("userId", userId).eq("periodStart", periodStart),
    )
    .first();

  if (existing) return existing;

  // Only MutationCtx can insert — callers from queries should handle null
  if (!("db" in ctx && "insert" in ctx.db)) return null;
  const mutCtx = ctx as MutationCtx;
  const id = await mutCtx.db.insert("usage", {
    userId,
    periodStart,
    generationCount: 0,
    appCount: 0,
  });
  return await mutCtx.db.get(id);
}

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await getOrCreateUsage(ctx, userId);
  },
});

export const checkQuota = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { allowed: true };

    const isPremium = await checkPremiumStatus(ctx, userId);
    if (isPremium) return { allowed: true };

    const usage = await getOrCreateUsage(ctx, userId);
    if (usage.appCount >= FREE_LIMITS.maxApps) {
      return { allowed: false, reason: "app_limit" as const };
    }
    if (usage.generationCount >= 20) {
      return { allowed: false, reason: "generation_limit" as const };
    }
    return { allowed: true };
  },
});

export const incrementGeneration = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const usage = await getOrCreateUsage(ctx, userId);
    await ctx.db.patch(usage._id, {
      generationCount: usage.generationCount + 1,
    });
  },
});

export const incrementApp = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const usage = await getOrCreateUsage(ctx, userId);
    await ctx.db.patch(usage._id, { appCount: usage.appCount + 1 });
  },
});
```

- [ ] **Step 3: Push schema**

Run: `npx convex dev --once 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/usage.ts
git commit -m "feat(billing): add usage tracking table and quota functions"
```

---

### Task 19: Add billing backend — invoices, current plan, webhook handlers

**Files:**
- Create: `convex/billing.ts`

- [ ] **Step 1: Create convex/billing.ts with getInvoices action and getCurrentPlan query**

```typescript
"use node";

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Fetch invoices from Stripe API. Must be an action (external HTTP call).
 */
export const getInvoices = action({
  args: {},
  handler: async (ctx): Promise<Array<{
    id: string;
    date: number;
    amount: number;
    status: string;
    pdfUrl: string | null;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // TODO: Look up Stripe customer ID from identity, fetch invoices
    // This requires the @convex-dev/stripe component's customer mapping
    // Placeholder until Stripe customer mapping is wired
    return [];
  },
});

/**
 * Handle payment failure webhooks.
 * Called from the Stripe webhook handler in convex/http.ts.
 */
export const handlePaymentFailed = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Set user status to past_due
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .first();
    if (user) {
      await ctx.db.patch(user._id, { billingStatus: "past_due", pastDueSince: Date.now() });
    }
  },
});

/**
 * Auto-downgrade users past_due for more than 3 days.
 * Should be called by a scheduled Convex cron.
 */
export const autoDowngradePastDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const pastDueUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("billingStatus"), "past_due"))
      .collect();

    for (const user of pastDueUsers) {
      if (user.pastDueSince && user.pastDueSince < threeDaysAgo) {
        await ctx.db.patch(user._id, { billingStatus: "free" });
      }
    }
  },
});
```

> **Note:** The `getInvoices` action is a placeholder — it requires wiring the `@convex-dev/stripe` component's customer ID mapping, which depends on how the existing checkout flow stores customer references. The implementing agent should check the existing Stripe component setup.

- [ ] **Step 2: Push to verify**

Run: `npx convex dev --once 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add convex/billing.ts
git commit -m "feat(billing): add invoices action, payment failure handler, auto-downgrade"
```

---

### Task 20: Add billing frontend components (SLICE-1 UI)

**Files:**
- Create: `src/features/billing/components/plan-comparison-card.tsx`
- Create: `src/features/billing/components/usage-meter.tsx`
- Create: `src/features/billing/components/billing-history.tsx`
- Create: `src/features/billing/components/upgrade-confirmation-dialog.tsx`
- Create: `src/features/billing/components/downgrade-warning-dialog.tsx`

Due to plan length, these components follow the standard shadcn/ui + Convex patterns established in the codebase. Each component:
- Uses `useQuery` for data, `useMutation` for actions
- Uses shadcn/ui primitives (Card, Dialog, Button, Badge)
- Uses semantic tokens (`bg-background`, `text-foreground`)
- Follows mobile-first responsive design

- [ ] **Step 1: Create plan-comparison-card.tsx**

A card showing Free vs Premium features side-by-side. Uses `useEntitlements()` to highlight current plan. Features listed: app limit, generation limit, custom templates, priority support, published apps.

- [ ] **Step 2: Create usage-meter.tsx**

Visual progress bar showing current usage against limits. Uses `useQuery(api.usage.getUsage)`. Shows "X of Y apps" and "X of Y generations this month". Bar color shifts from green → yellow → red as usage approaches limit.

- [ ] **Step 3: Create billing-history.tsx**

Table of invoices. Uses `useQuery(api.billing.getInvoices)` (action-backed). Shows date, amount, status badge (paid/failed/pending), PDF download link. Empty state: "No billing history yet."

- [ ] **Step 4: Create upgrade-confirmation-dialog.tsx**

shadcn Dialog confirming upgrade. Shows price ($9.99/mo), what they get, proration info. Calls `createCheckoutSession` mutation on confirm.

- [ ] **Step 5: Create downgrade-warning-dialog.tsx**

shadcn Dialog warning about feature loss. Lists what they'll lose. Calls portal session for cancellation on confirm.

- [ ] **Step 6: Update billing-section.tsx to compose new components**

Add `PlanComparisonCard`, `UsageMeter`, and `BillingHistory` to the billing section layout.

- [ ] **Step 7: Run build**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 8: Commit**

```bash
git add src/features/billing/components/
git commit -m "feat(billing): add plan comparison, usage meter, billing history, upgrade/downgrade dialogs"
```

---

### Task 21: Add billing component tests

**Files:**
- Create: `src/features/billing/components/__tests__/plan-comparison-card.test.tsx`
- Create: `src/features/billing/components/__tests__/usage-meter.test.tsx`

- [ ] **Step 1: Write plan-comparison-card tests**

Test: renders both plans, highlights current plan, shows upgrade button for free users, hides upgrade for premium users.

- [ ] **Step 2: Write usage-meter tests**

Test: loading state, renders progress bars, shows correct counts, shows warning color at 80%+ usage, shows upgrade prompt at 100%.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/billing/ --reporter=verbose`

- [ ] **Step 4: Commit**

```bash
git add src/features/billing/components/__tests__/
git commit -m "test(billing): add plan comparison and usage meter tests"
```

---

## Phase 6: SLICE-2 — Templates & My-Tools Expansion

> Runs sequentially after Phase 5.

### Task 22: Expand templates page with filtering and search

**Files:**
- Modify: `src/features/templates/components/templates-page.tsx`
- Modify: `convex/schema.ts` (add `usageCount` to therapyTemplates)

- [ ] **Step 1: Add usageCount field to schema**

In `convex/schema.ts`, add `usageCount: v.optional(v.number())` to the `therapyTemplates` table definition.

- [ ] **Step 2: Push schema**

Run: `npx convex dev --once`

- [ ] **Step 3: Rewrite templates-page.tsx**

Add:
- Category filter bar (horizontal pills using existing `category` field)
- Debounced search input (filter by name + description)
- Sort dropdown (Popular, Newest, Alphabetical)
- Template preview card with hover description overlay

Key implementation details:
- `useState` for `selectedCategory`, `searchQuery`, `sortBy`
- `useMemo` to filter + sort the template list client-side
- Debounce search with 300ms delay via `useEffect` + `setTimeout`
- Category pills: `["All", "Communication", "Social Skills", "Daily Living", "Academic", "Sensory"]`

- [ ] **Step 4: Add incrementTemplateUsage mutation**

In the appropriate Convex file, add a mutation that increments `usageCount` when a template is used to start a session.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts src/features/templates/
git commit -m "feat(templates): add category filter, search, sort, preview cards"
```

---

### Task 23: Expand my-tools page with actions

**Files:**
- Modify: `src/features/my-tools/components/my-tools-page.tsx`
- Modify: `convex/schema.ts` (add `archived` to sessions)
- Create: `convex/sessions.ts` additions (duplicateSession, archive)

- [ ] **Step 1: Add archived field to sessions schema**

In `convex/schema.ts`, add `archived: v.optional(v.boolean())` to the sessions table.

- [ ] **Step 2: Add backend mutations**

In `convex/sessions.ts`, add:
- `archive` mutation — sets `archived: true` on a session (soft delete)
- `duplicateSession` mutation — copies session data to a new session

- [ ] **Step 3: Update list query to filter archived**

In `convex/sessions.ts`, update the `list` query to filter out `archived === true` sessions.

- [ ] **Step 4: Push schema**

Run: `npx convex dev --once`

- [ ] **Step 5: Rewrite my-tools-page.tsx**

Add:
- Search bar (filter by app name, debounced)
- Sort dropdown (Last edited, Alphabetical, Most shared)
- Action menu per card: Rename (inline edit), Delete (confirmation dialog → archive), Duplicate
- Improved empty state with illustration + CTA

Key implementation:
- `useState` for `searchQuery`, `sortBy`, `editingId`, `deleteTarget`
- `DeleteConfirmationDialog` from `@/shared/components/delete-confirmation-dialog`
- Inline rename via `Input` with save on blur/Enter
- Duplicate calls `duplicateSession` mutation then navigates to new session

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/sessions.ts src/features/my-tools/
git commit -m "feat(my-tools): add search, sort, rename, delete, duplicate actions"
```

---

### Task 24: Add templates and my-tools tests

**Files:**
- Create: `src/features/templates/components/__tests__/templates-page.test.tsx`
- Create: `src/features/my-tools/components/__tests__/my-tools-page.test.tsx`

- [ ] **Step 1: Write templates-page tests**

Test: renders template cards, category filter toggles work, search filters by name, sort changes order, empty search shows "no results" message.

- [ ] **Step 2: Write my-tools-page tests**

Test: loading state, empty state with CTA, renders project cards, search filters, delete confirmation dialog appears, duplicate triggers mutation.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/templates/ src/features/my-tools/ --reporter=verbose`

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/features/templates/components/__tests__/ src/features/my-tools/components/__tests__/
git commit -m "test: add templates and my-tools component tests"
```

---

## Final Verification

### Task 25: Full verification pass

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -50`
Expected: All tests pass, test count increased by ~20 files

- [ ] **Step 2: Verify zero cross-slice violations**

Run this command — it finds any feature-to-feature imports (excluding self-imports and test files):

```bash
grep -rn 'from "@/features/' src/features/ --include='*.tsx' --include='*.ts' | grep -v __tests__ | grep -v node_modules | while IFS=: read -r file line content; do
  source_feature=$(echo "$file" | sed 's|src/features/||' | cut -d/ -f1)
  imported_feature=$(echo "$content" | grep -o '@/features/[^/"]*' | sed 's|@/features/||')
  if [ "$source_feature" != "$imported_feature" ]; then
    echo "VIOLATION: $file:$line imports from $imported_feature"
  fi
done
```

Expected: No output (zero violations). The only cross-feature imports should be re-exports in `src/shared/clinical/`.

- [ ] **Step 3: Verify route.ts line count**

Run: `wc -l src/app/api/generate/route.ts`
Expected: Under 120 lines

- [ ] **Step 4: TypeScript compile check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Build check**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds
