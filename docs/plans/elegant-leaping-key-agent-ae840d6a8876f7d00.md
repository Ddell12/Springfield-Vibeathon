# Task 2: Fix VSA Violations and SSE Re-export Cleanup

## Summary

Two issues to fix:
1. Move `ProjectCard` to `src/shared/components/` and update 5 import sites
2. Delete SSE re-export shim and update 2 import sites

## Verification of Current State

All files confirmed read. No surprises found.

### Task 1: ProjectCard move

**Source file:** `src/features/dashboard/components/project-card.tsx` (147 lines, exports `ProjectCard` and `ProjectData`)

**5 import sites to update:**
- `src/features/dashboard/components/projects-grid.tsx:5` — `from "./project-card"` → `from "@/shared/components/project-card"`
- `src/features/dashboard/components/dashboard-view.tsx:18` — `from "./project-card"` → `from "@/shared/components/project-card"`
- `src/features/dashboard/components/__tests__/projects-grid.test.tsx:3` — `from "../project-card"` → `from "@/shared/components/project-card"` (and vi.mock path too: line 6)
- `src/features/dashboard/components/__tests__/project-card.test.tsx:3` — `from "../project-card"` → `from "@/shared/components/project-card"`
- `src/features/my-tools/components/my-tools-page.tsx:7` — `from "@/features/dashboard/components/project-card"` → `from "@/shared/components/project-card"`

**Note:** `projects-grid.test.tsx` has BOTH a type import AND a `vi.mock("../project-card", ...)` on line 6 — both must be updated.

### Task 2: SSE shim deletion

**Delete:** `src/features/builder/lib/sse-events.ts`

**2 import sites to update:**
- `src/features/builder/hooks/use-streaming.ts:8` — `from "@/features/builder/lib/sse-events"` → `from "@/core/sse-events"`
- `src/features/flashcards/hooks/use-flashcard-streaming.ts:6` — `from "@/features/builder/lib/sse-events"` → `from "@/core/sse-events"`

## Execution Steps

1. Write `src/shared/components/project-card.tsx` (copy content from dashboard version — identical)
2. Delete `src/features/dashboard/components/project-card.tsx`
3. Update `projects-grid.tsx` import
4. Update `dashboard-view.tsx` import
5. Update `projects-grid.test.tsx` import + vi.mock path
6. Update `project-card.test.tsx` import
7. Update `my-tools-page.tsx` import
8. Update `use-streaming.ts` import
9. Update `use-flashcard-streaming.ts` import
10. Delete `src/features/builder/lib/sse-events.ts`
11. Run `npx vitest run`
12. Commit

## Risks

- None significant. The moves are mechanical. The component content stays identical.
- Test files use relative paths AND vi.mock — both need updating.
