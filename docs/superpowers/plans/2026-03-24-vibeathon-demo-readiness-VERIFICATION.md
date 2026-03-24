# Plan Verification Report

> **Plan:** `2026-03-24-vibeathon-demo-readiness.md` | **Score:** 86/100 | **Verdict:** Needs fixes
>
> Solid plan with correct file paths, valid API usage, and proper architecture. Two issues need fixing before execution: the internal seed function can't be run from CLI, and a missing directory needs creation. Both are quick fixes.

---

## Scorecard (MANDATORY)

| Category       | Max     | Score   | Deductions                          |
| -------------- | ------- | ------- | ----------------------------------- |
| Paths & Lines  | 20      | 18      | P1(-2)                              |
| APIs & Imports | 25      | 25      | none                                |
| Wiring         | 15      | 15      | none                                |
| Architecture   | 15      | 15      | none                                |
| Dependencies   | 10      | 6       | D1(-4)                              |
| Logic          | 15      | 7       | L1(-4), L2(-4)                      |
| **Total**      | **100** | **86**  |                                     |

---

## Issues (MANDATORY)

| ID  | Severity   | Deduction | Category     | Issue (one line)                                                            | Fix (one line)                                                                 |
| --- | ---------- | --------- | ------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| P1  | WARNING    | -2        | Paths        | Task 9: `src/features/builder-v2/hooks/` directory doesn't exist            | Add `mkdir -p src/features/builder-v2/hooks/` before creating the hook file    |
| D1  | WARNING    | -4        | Dependencies | Task 6: `seed` is `internalMutation` — can't call via `npx convex run`     | Change to dashboard "Run Function" or make seed a public mutation              |
| L1  | WARNING    | -4        | Logic        | Task 10: My Tools still references `api.tools.list`/`api.tools.remove` in tests | Verify/update `convex/__tests__/tools.test.ts` won't break after data shift  |
| L2  | SUGGESTION | -4        | Logic        | Task 8: Two parallel queries fired (allTemplates + categoryTemplates)       | Use single query with conditional args to avoid unnecessary Convex subscription |

---

## Correction Manifest (MANDATORY — one entry per issue)

### P1 — Missing hooks directory for builder-v2

**Plan says:** Create `src/features/builder-v2/hooks/use-template-starter.ts` (Task 9, Step 1)

**Codebase has:** `src/features/builder-v2/hooks/` does not exist. Only `src/features/builder-v2/components/` and `src/features/builder-v2/lib/` exist.

**Correction:** Add before the file creation in Task 9 Step 1:
```bash
mkdir -p src/features/builder-v2/hooks
```

**Affected plan locations:** Task 9, Step 1

### D1 — Internal seed function not callable from CLI

**Plan says:** Task 6, Step 3: `npx convex run --no-push therapy_templates:seed`

**Codebase has:** The `seed` function is defined as `internalMutation` which cannot be called via `npx convex run` (CLI only runs public `query`/`mutation`/`action` functions). Additionally, `--no-push` is not a valid flag for `npx convex run`.

**Correction:** Replace Task 6 Step 3 with:
```markdown
Run the seed via the Convex dashboard: navigate to Functions → therapy_templates → seed → Run.
Alternatively, change `internalMutation` to `mutation` temporarily, run `npx convex run therapy_templates:seed`, then change back.
```

**Affected plan locations:** Task 6, Step 3

### L1 — My Tools data shift may break existing tools tests

**Plan says:** Task 10 rewires My Tools from `api.tools.list` to `api.projects.list`

**Codebase has:** `convex/__tests__/tools.test.ts` has 7 tests that exercise `tools.create`, `tools.get`, `tools.list`, `tools.update`, `tools.remove`. These tests still pass but the `tools` table is now only used for v1 config-based tools. The my-tools page no longer reads from `tools`, making these backend tests disconnected from any UI consumer.

**Correction:** This is informational — the tests don't break, but they test dead code paths post-migration. Add a note to Task 10:
> Note: `convex/__tests__/tools.test.ts` still tests the `tools` table CRUD. These tests pass but are now disconnected from any UI consumer. Consider removing or archiving in Task 12 cleanup.

**Affected plan locations:** Task 10, Task 12

### L2 — Double Convex subscription in templates page

**Plan says:** Task 8 uses two `useQuery` calls:
```tsx
const allTemplates = useQuery(api.therapy_templates.list);
const categoryTemplates = useQuery(api.therapy_templates.getByCategory, ...);
```

**Codebase has:** N/A (new code)

**Correction:** Use a single query pattern to avoid maintaining two subscriptions:
```tsx
const templates = useQuery(
  active === "all" ? api.therapy_templates.list : api.therapy_templates.getByCategory,
  active === "all" ? {} : { category: active }
);
```
This fires only one Convex subscription at a time.

**Affected plan locations:** Task 8, Step 1

---

## Wiring Audit (MANDATORY)

| New Module                                              | Wired Into                                    | How                          | Status |
| ------------------------------------------------------- | --------------------------------------------- | ---------------------------- | ------ |
| `convex/therapy_templates.ts`                           | Templates page (Task 8)                       | `useQuery(api.therapy_templates.list)` | OK     |
| `convex/therapy_templates.ts` (`get`)                   | Template starter hook (Task 9)                | `useQuery(api.therapy_templates.get)` | OK     |
| `src/features/builder-v2/hooks/use-template-starter.ts` | Builder page (Task 9, Step 3)                 | `useTemplateStarter()` hook  | OK     |

---

## Completeness Checklist (MANDATORY)

| #   | Check             | Item                                              | Status | Notes                                                                    |
| --- | ----------------- | ------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| 1   | Schema changes    | `npx convex dev` step after schema modifications? | ✓      | No schema changes — new file uses existing table                         |
| 2   | Convex functions  | All new functions exported?                       | ✓      | `list`, `getByCategory`, `get`, `seed` all exported                      |
| 3   | Bus events        | New events have listeners registered?             | N/A    | No bus events in this project                                            |
| 4   | Dashboard routes  | New pages have sidebar entries?                   | N/A    | No new routes — existing pages being rewired                             |
| 5   | Trigger.dev tasks | Deployment step mentioned?                        | N/A    | No Trigger.dev in this project                                           |
| 6   | Barrel exports    | New public APIs in slice `index.ts`?              | N/A    | No barrel files in this project's feature slices                         |
| 7   | npm packages      | `npm install` step for new deps?                  | ✓      | No new packages needed — all deps already installed                      |
| 8   | Environment vars  | New env vars documented?                          | ✓      | No new env vars — E2B key already configured                             |
| 9   | Convex imports    | Dashboard uses path aliases?                      | N/A    | No dashboard — Next.js uses relative imports (consistent with codebase)  |
| 10  | ESM compliance    | All local imports use `.js` extensions?           | N/A    | Next.js + TypeScript — `.js` extensions not required                     |
| 11  | Test files        | Tests planned alongside implementation?           | ✓      | Task 2 fixes existing tests. No new test files needed for polish work.   |

---

## Dependency Verification (MANDATORY)

| Package                  | Required By      | Installed? | Version   | API Verified?  | Notes                             |
| ------------------------ | ---------------- | ---------- | --------- | -------------- | --------------------------------- |
| `react-qr-code`         | ShareDialog      | ✓          | ^2.0.18   | Codebase read  | Already used in share-dialog.tsx  |
| `usehooks-ts`            | BuilderV2Layout  | ✓          | ^3.1.1    | Codebase read  | `useMediaQuery` confirmed         |
| `sonner`                 | ShareDialog      | ✓          | ^2.0.7    | Codebase read  | `toast()` confirmed               |
| `nanoid`                 | projects.create  | ✓          | ^5.1.7    | Codebase read  | `customAlphabet` confirmed        |
| `@e2b/code-interpreter`  | E2B sandbox      | ✓          | ^2.4.0    | SDK types read | `Sandbox.create`, `.connect` confirmed |
| `convex`                 | All Convex code  | ✓          | ^1.34.0   | Codebase read  | Schema, queries, mutations all valid |

---

## API Spot-Checks (MANDATORY when 3+ external library calls)

| Library                  | API Used in Plan                    | Verified Via    | Correct? | Notes                                           |
| ------------------------ | ----------------------------------- | --------------- | -------- | ----------------------------------------------- |
| `@e2b/code-interpreter`  | `Sandbox.create()`, `Sandbox.connect()` | SDK types file | ✓        | Both static methods confirmed in `.d.ts`         |
| `convex/react`           | `useQuery`, `useMutation`           | Codebase read   | ✓        | Pattern matches existing usage across 5+ files   |
| `next/navigation`        | `useParams`, `useSearchParams`      | Codebase read   | ✓        | Already used in shared-tool-page.tsx, other pages |
| `react-qr-code`          | `<QRCode value={url} size={160} />` | Codebase read   | ✓        | Already used in share-dialog.tsx                 |

---

## Reuse Opportunities (IF APPLICABLE)

| Existing Code                        | Location                              | Replaces Plan Code In | Replacement Code                                          |
| ------------------------------------ | ------------------------------------- | --------------------- | --------------------------------------------------------- |
| `convex/templates/queries.ts` exists | `convex/templates/queries.ts`         | None (different table) | N/A — queries `tools` table not `therapyTemplates`. Keep both until cleanup. |

---

## Verified Correct (MANDATORY)

- **All file paths exist** — every referenced source file verified via Glob/Read (12 existing files checked)
- **Convex schema indexes match plan** — `by_sortOrder`, `by_category`, `by_createdAt`, `by_shareSlug` all confirmed in `convex/schema.ts`
- **All Convex functions exported** — `projects.ts` exports `create`, `get`, `getBySlug`, `list`, `update`, `remove` (6 public functions)
- **Import paths are correct** — `../../../../convex/_generated/api` verified for 4-level-deep feature component files
- **E2B SDK API confirmed** — `Sandbox.create()` and `Sandbox.connect()` both exist as static methods in `@e2b/code-interpreter` types
- **No v1 imports outside app layout** — `grep` confirmed only `src/app/(app)/layout.tsx` imports from `@/features/builder/`
- **ShareDialog component exports match** — `ShareDialog` exported from `share-dialog.tsx` with matching props (`open`, `onOpenChange`, `shareSlug`, `toolTitle`)
- **Convex file naming valid** — `therapy_templates.ts` uses underscores (CLAUDE.md requires no hyphens in `convex/` file names)
