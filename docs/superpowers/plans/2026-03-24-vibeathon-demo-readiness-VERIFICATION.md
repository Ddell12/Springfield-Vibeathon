# Plan Verification Report

> **Plan:** `2026-03-24-vibeathon-demo-readiness.md` | **Score:** 100/100 | **Verdict:** Ship it
>
> All prior issues have been fixed. File paths verified, APIs confirmed, architecture compliant, dependencies installed, wiring complete. Plan is ready for execution.

---

## Scorecard (MANDATORY)

| Category       | Max     | Score    | Deductions |
| -------------- | ------- | -------- | ---------- |
| Paths & Lines  | 20      | 20       | none       |
| APIs & Imports | 25      | 25       | none       |
| Wiring         | 15      | 15       | none       |
| Architecture   | 15      | 15       | none       |
| Dependencies   | 10      | 10       | none       |
| Logic          | 15      | 15       | none       |
| **Total**      | **100** | **100**  |            |

---

## Issues (MANDATORY)

No issues found.

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
| 11  | Test files        | Tests planned alongside implementation?           | ✓      | Task 2 fixes existing tests. Task 12 cleans dead test files.             |

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

## Verified Correct (MANDATORY)

- **All file paths exist** — every referenced source file verified via Glob/Read (12 existing files checked)
- **Convex schema indexes match plan** — `by_sortOrder`, `by_category`, `by_createdAt`, `by_shareSlug` all confirmed in `convex/schema.ts`
- **All Convex functions exported** — `projects.ts` exports `create`, `get`, `getBySlug`, `list`, `update`, `remove` (6 public functions)
- **Import paths are correct** — `../../../../convex/_generated/api` verified for 4-level-deep feature component files
- **E2B SDK API confirmed** — `Sandbox.create()` and `Sandbox.connect()` both exist as static methods in `@e2b/code-interpreter` types
- **No v1 imports outside app layout** — `grep` confirmed only `src/app/(app)/layout.tsx` imports from `@/features/builder/`
- **ShareDialog component exports match** — `ShareDialog` exported from `share-dialog.tsx` with matching props (`open`, `onOpenChange`, `shareSlug`, `toolTitle`)
- **Convex file naming valid** — `therapy_templates.ts` uses underscores (CLAUDE.md requires no hyphens in `convex/` file names)

---

## Re-verification Delta

| Status | ID  | Prior Issue                                         | Current State                                          |
| ------ | --- | --------------------------------------------------- | ------------------------------------------------------ |
| FIXED  | P1  | Missing `hooks/` directory for builder-v2           | `mkdir -p` added before file creation in Task 9        |
| FIXED  | D1  | `seed` is `internalMutation`, can't run from CLI    | Replaced with Convex Dashboard instructions            |
| FIXED  | L1  | Dead `tools.test.ts` after migration                | Cleanup added to Task 12 Step 3                        |
| FIXED  | L2  | Double Convex subscription in templates page        | Single conditional query pattern applied               |

**Prior score:** 86/100 → **Current score:** 100/100 (+14)

**Score change breakdown:**

- Fixed issues recovered: +14 points (P1:+2, D1:+4, L1:+4, L2:+4)
- Persisting issues: -0 points
- New issues: -0 points
- Net change: +14
