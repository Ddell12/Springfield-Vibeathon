# Plan Verification Report

> **Plan:** `2026-03-24-bridges-ux-overhaul.md` | **Score:** 78/100 | **Verdict:** Needs fixes
>
> Strong plan with accurate line references and solid architecture. Seven concrete issues need fixing before execution — two will cause visible bugs (unstyled publish buttons, potential import failures in sandbox), and two leave schema fields permanently empty (wiring gaps).

---

## Scorecard (MANDATORY)

| Category       | Max     | Score   | Deductions                          |
| -------------- | ------- | ------- | ----------------------------------- |
| Paths & Lines  | 20      | 20      | none                                |
| APIs & Imports | 25      | 17      | A1(-4), A2(-4)                      |
| Wiring         | 15      | 7       | W1(-4), W2(-4)                      |
| Architecture   | 15      | 15      | none                                |
| Dependencies   | 10      | 8       | D1(-2)                              |
| Logic          | 15      | 11      | L1(-4)                              |
| **Total**      | **100** | **78**  |                                     |

---

## Issues (MANDATORY)

| ID  | Severity | Deduction | Category | Issue (one line) | Fix (one line) |
| --- | -------- | --------- | -------- | ---------------- | -------------- |
| A1  | CRITICAL | -4        | APIs     | PublishDialog uses `.btn-primary`/`.btn-secondary` CSS classes that only exist in sandbox template, not main app | Use Tailwind utilities or shadcn Button component instead of custom CSS classes |
| A2  | WARNING  | -4        | APIs     | E2B template specifies `"framer-motion": "^12.0.0"` but v12 was renamed to `motion`; AI-generated code importing `motion/react` will fail | Change to `"motion": "^12.0.0"` in template package.json |
| W1  | WARNING  | -4        | Wiring   | `persistence` field added to projects schema but never saved to Convex — the `updateProject` mutation doesn't accept it and no task saves it | Add `persistence` to `updateProject` args + save after selection |
| W2  | WARNING  | -4        | Wiring   | `publishedUrl` field added to schema but `updateProject` mutation not updated — Task 18 uses `as any` cast and mentions it as a note, not a code step | Add explicit step to update `convex/projects.ts` update mutation args |
| D1  | WARNING  | -2        | Deps     | `VERCEL_DEPLOY_TOKEN` and `VERCEL_TEAM_ID` env vars used in publish route but no setup step documents where to get/set them | Add env var setup step in Task 17 before the route code |
| L1  | WARNING  | -4        | Logic    | File Structure table lists `e2b-templates/vite-therapy/tailwind.config.ts` but no step creates it — and Tailwind v4 + `@tailwindcss/vite` doesn't need it | Remove from File Structure table |
| L2  | SUGGESTION | 0       | Logic    | Task 13 steps say "Same code as in the old plan" without providing actual code — fragile if old plan is modified | Inline the code or at minimum specify the exact section reference |

---

## Correction Manifest (MANDATORY — one entry per issue)

### A1 — PublishDialog uses sandbox-only CSS classes

**Plan says:** Task 18 Step 1 uses `className="btn-primary w-full"` (line 1952) and `className="btn-secondary flex-1"` (line 1986) in the PublishDialog component.

**Codebase has:** `.btn-primary` and `.btn-secondary` are defined in `e2b-templates/vite-therapy/src/therapy-ui.css` (lines 539-577) — a CSS file that only exists inside the E2B sandbox, not in the main app. `src/app/globals.css` has no `.btn-primary` or `.btn-secondary` classes.

**Correction:** Replace custom CSS classes with Tailwind utilities matching the design system, or use shadcn `<Button>`:

```tsx
// Option A: Tailwind utilities
<button className="w-full bg-primary-gradient text-on-primary font-headline font-bold text-sm py-3 px-6 rounded-[var(--radius-xl)] hover:opacity-90 transition-opacity min-h-[48px]" ...>

// Option B: shadcn Button (preferred — already installed)
import { Button } from "@/shared/components/ui/button";
<Button className="w-full" onClick={handlePublish}>Publish Now</Button>
<Button variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(url)}>Copy Link</Button>
```

**Affected plan locations:** Task 18 Step 1 — PublishDialog component (4 button elements)

### A2 — E2B template uses wrong package name for motion

**Plan says:** Task 2 Step 2 specifies `"framer-motion": "^12.0.0"` in `e2b-templates/vite-therapy/package.json`.

**Codebase has:** The main app uses `"motion": "^12.38.0"` in `package.json:36`. The `framer-motion` package was renamed to `motion` at v12. If the system prompt teaches the AI to import from `"motion/react"` (matching the main app pattern), those imports will fail in the sandbox where only `framer-motion` is installed.

**Correction:** In `e2b-templates/vite-therapy/package.json`, change:
```json
"framer-motion": "^12.0.0"
```
to:
```json
"motion": "^12.0.0"
```

**Affected plan locations:** Task 2 Step 2

### W1 — persistence field in schema but never saved

**Plan says:** Task 1 adds `persistence: v.optional(v.string())` to the projects schema. Task 10 stores persistence in React state via `useState<PersistenceTier>("device")`.

**Codebase has:** `convex/projects.ts` `update` mutation (lines 62-83) accepts: `title`, `description`, `fragment`, `sandboxId`, `messages`. No `persistence` field.

**Correction:** Add two changes:

1. In Task 1 Step 3 (or Task 10), update the `update` mutation in `convex/projects.ts` to accept `persistence`:
```typescript
args: {
  projectId: v.id("projects"),
  // ... existing fields ...
  persistence: v.optional(v.string()),
},
handler: async (ctx, args) => {
  // ... existing logic ...
  if (fields.persistence !== undefined) updates.persistence = fields.persistence;
  // ...
}
```

2. In Task 10 Step 2, after `setPersistence(tier)`, save to Convex:
```tsx
const handlePersistenceSelect = async (tier: PersistenceTier) => {
  setPersistence(tier);
  setShowPersistenceSheet(false);
  if (pendingMessage) {
    // ... existing logic ...
    // Save persistence to project after creation
    if (projectId) {
      await updateProject({ projectId, persistence: tier });
    }
  }
};
```

**Affected plan locations:** Task 1 Step 3, Task 10 Step 2

### W2 — updateProject mutation not updated for publishedUrl

**Plan says:** Task 18 Step 3 contains `await updateProject({ projectId, publishedUrl: url } as any)` and a "Note" saying to update the mutation args. No code step is provided.

**Codebase has:** `convex/projects.ts` `update` mutation args (line 63-70) do not include `publishedUrl`.

**Correction:** Add an explicit step to Task 18 (before Step 3) or to Task 1:

```typescript
// In convex/projects.ts update mutation, add to args:
publishedUrl: v.optional(v.string()),

// In handler, add:
if (fields.publishedUrl !== undefined) updates.publishedUrl = fields.publishedUrl;
```

Then remove the `as any` cast in Task 18 Step 3:
```tsx
await updateProject({ projectId, publishedUrl: url });
```

Alternatively, the dedicated `updatePublishUrl` mutation from Task 1 Step 3 already handles this — use it instead of `updateProject`:
```tsx
await updatePublishUrl({ projectId, publishedUrl: url });
```

**Affected plan locations:** Task 18 Step 3, Task 1 Step 3 (or new step in Task 18)

### D1 — Missing env var setup step for Vercel Deploy

**Plan says:** Task 17 Step 1 uses `process.env.VERCEL_DEPLOY_TOKEN` and `process.env.VERCEL_TEAM_ID` in the publish route.

**Codebase has:** Neither variable is in `.env.local` or documented in any setup step.

**Correction:** Add a Step 0 to Task 17:

```
- [ ] **Step 0: Configure Vercel Deploy credentials**

Add to `.env.local`:
```
VERCEL_DEPLOY_TOKEN=<token from vercel.com/account/tokens>
VERCEL_TEAM_ID=<optional, from vercel.com/teams>
```

Create a Vercel API token at https://vercel.com/account/tokens with "Create Deployment" scope.
```

**Affected plan locations:** Task 17 (new Step 0)

### L1 — File Structure lists phantom tailwind.config.ts

**Plan says:** File Structure table row: `e2b-templates/vite-therapy/tailwind.config.ts` — "Therapy theme (warm colors, large radii)"

**Codebase has:** Tailwind v4 with `@tailwindcss/vite` plugin (Task 2 Step 3) uses CSS-based config via `@theme` in `therapy-ui.css` (Task 2 Step 7). No `tailwind.config.ts` is needed or created in any step.

**Correction:** Remove the row from the File Structure table:
```diff
- | `e2b-templates/vite-therapy/tailwind.config.ts` | Therapy theme (warm colors, large radii) |
```

**Affected plan locations:** File Structure table (line ~25)

### L2 — Task 13 references "old plan" without inline code

**Plan says:** Task 13 Steps 1-2 say "(Same code as in the old plan — Phone/Tablet/Computer with MaterialIcon icons)" and "(Same code as old plan — cn() for device frame, width style)"

**Codebase has:** The old plan at `docs/superpowers/plans/2026-03-24-non-technical-ux-polish.md` exists and is referenced in the plan header as "Supersedes."

**Correction:** Either inline the ResponsivePicker code and FragmentWeb width changes, or add a specific reference: "See `docs/superpowers/plans/2026-03-24-non-technical-ux-polish.md`, Task 8, Steps 1-2 for exact code."

**Affected plan locations:** Task 13 Steps 1-2

---

## Wiring Audit (MANDATORY)

| New Module | Wired Into | How | Status |
| ---------- | ---------- | --- | ------ |
| `convex/tool_state.ts` | Not called anywhere | Plan creates CRUD functions but no consumer references them | PARTIAL — schema table + functions created, but no UI or hook consumes them. Acceptable as infrastructure for future sandbox integration. |
| `e2b-templates/vite-therapy/` | `src/features/builder-v2/lib/e2b.ts` | Template name `"vite-therapy"` used in `createSandbox()` | OK — registered via Task 20 Step 1 |
| `persistence-sheet.tsx` | `src/app/(app)/builder/page.tsx` | Imported and rendered with open/onSelect props | OK |
| `confetti.tsx` | `src/app/(app)/builder/page.tsx` | Imported and rendered with trigger prop | OK |
| `responsive-picker.tsx` | `builder-header.tsx` + `builder/page.tsx` | State lifted through page, picker in header, width to preview | OK |
| `publish-dialog.tsx` | `builder/page.tsx` + `builder-header.tsx` | Dialog shown via header button, handler calls publish API | OK |
| `theme-toggle.tsx` | `builder-header.tsx` | Imported into header actions | OK (but not explicitly wired in any task step — implicit) |
| `src/app/api/publish/route.ts` | `builder/page.tsx` | Called via `fetch("/api/publish")` in handlePublish | OK |
| `updatePublishUrl` mutation | Not used | Created in Task 1 but Task 18 uses `updateProject` instead | MISSING (W2) — either use this mutation or update `updateProject` |

---

## Completeness Checklist (MANDATORY)

| #   | Check             | Item                                              | Status | Notes |
| --- | ----------------- | ------------------------------------------------- | ------ | ----- |
| 1   | Schema changes    | `npx convex dev` step after schema modifications? | ✓      | Task 1 Step 2, Task 1 Step 5 |
| 2   | Convex functions  | All new functions exported?                       | ✓      | `saveVersion`, `getLatestVersion`, `updatePublishUrl`, `toolState.get`, `toolState.set` all exported |
| 3   | Bus events        | New events have listeners registered?             | N/A    | No bus events in this plan |
| 4   | Dashboard routes  | New pages have sidebar entries?                   | N/A    | No new pages, only modified existing |
| 5   | Trigger.dev tasks | Deployment step mentioned?                        | N/A    | No Trigger.dev tasks |
| 6   | Barrel exports    | New public APIs in slice `index.ts`?              | N/A    | No barrel files used in this project |
| 7   | npm packages      | `npm install` step for new deps?                  | ✓      | No new main-app deps needed; E2B template has `npm install` in Task 20 |
| 8   | Environment vars  | New env vars documented?                          | ✗      | `VERCEL_DEPLOY_TOKEN`, `VERCEL_TEAM_ID` undocumented (D1) |
| 9   | Convex imports    | Dashboard uses path aliases?                      | N/A    | No dashboard in this project |
| 10  | ESM compliance    | All local imports use `.js` extensions?           | N/A    | Next.js + TypeScript handles module resolution |
| 11  | Test files        | Tests planned alongside implementation?           | ✗      | No test files planned. Existing tests may break from schema/API changes. At minimum, `route.test.ts` for generate route needs updating for new `persistence` param. |

---

## Dependency Verification (MANDATORY)

| Package | Required By | Installed? | Version | API Verified? | Notes |
| ------- | ----------- | ---------- | ------- | ------------- | ----- |
| `@e2b/code-interpreter` | e2b.ts, publish route | ✓ | ^2.4.0 | Codebase read | `Sandbox.create`, `.connect`, `.files.write`, `.commands.run`, `.getHost` all used in existing code |
| `motion` | persistence-sheet, confetti, publish-dialog | ✓ | ^12.38.0 | Codebase read | `motion/react` exports `motion`, `AnimatePresence` — verified in preview.tsx |
| `sonner` | toast calls | ✓ | ^2.0.7 | Codebase read | `toast()` used in share-dialog.tsx already |
| `next-themes` | theme-toggle | ✓ | ^0.4.6 | Codebase read | `useTheme` hook — ThemeProvider already in provider tree per CLAUDE.md gotchas |
| `ai` (Vercel AI SDK) | generate route | ✓ | ^6.0.137 | Reference file | `streamObject` API verified |
| `@ai-sdk/anthropic` | generate route | ✓ | ^3.0.63 | Codebase read | `anthropic()` model constructor verified |
| `zod` | schema.ts | ✓ | ^4.3.6 | Codebase read | `z.enum`, `z.object`, `z.string` all standard |
| `react-qr-code` | share-dialog | ✓ | ^2.0.18 | Codebase read | Already used in share-dialog.tsx |
| `framer-motion` (E2B template) | E2B sandbox only | ✗ (not in main app) | N/A | WARNING | Should be `motion` — see issue A2 |

---

## API Spot-Checks (MANDATORY when 3+ external library calls)

| Library | API Used in Plan | Verified Via | Correct? | Notes |
| ------- | ---------------- | ------------ | -------- | ----- |
| `@e2b/code-interpreter` | `Sandbox.create(template, opts)` | Codebase read (e2b.ts:15) | ✓ | Same pattern as existing code |
| `@e2b/code-interpreter` | `Sandbox.connect(sandboxId)` | Codebase read (e2b.ts:43) | ✓ | Same pattern as existing code |
| `@e2b/code-interpreter` | `sb.files.list(dir)` → `entry.type === "directory"` | Not verified | ⚠ | E2B SDK v2 may use `"dir"` not `"directory"` — verify before executing Task 17 |
| `@e2b/code-interpreter` | `sb.files.read(fullPath)` returns string | Not verified | ⚠ | Likely correct for text files but verify return type |
| Vercel Deploy API | `POST /v13/deployments` with base64 files | WebSearch needed | ⚠ | File upload format plausible but should verify exact schema |
| `motion/react` | `<motion.div initial/animate/exit>` | Codebase read (preview.tsx:74) | ✓ | Same pattern used throughout |
| `next-themes` | `useTheme()` → `{ theme, setTheme }` | Codebase read (CLAUDE.md gotchas) | ✓ | ThemeProvider confirmed in provider tree |
| `ai` SDK | `streamObject({ model, system, schema, messages })` | Codebase read (generate/route.ts:17) | ✓ | Exact same call pattern |

---

## Reuse Opportunities (IF APPLICABLE)

| Existing Code | Location | Replaces Plan Code In | Replacement Code |
| ------------- | -------- | --------------------- | ---------------- |
| `updatePublishUrl` mutation | Created in Task 1 Step 3 | Task 18 Step 3 `updateProject({...publishedUrl} as any)` | `await updatePublishUrl({ projectId, publishedUrl: url })` — already created, no `as any` needed |

---

## Over-Engineering Flags (IF APPLICABLE)

| Location | Pattern | Recommendation |
| -------- | ------- | -------------- |
| Task 2 Step 9 | `useConvexData` hook is identical to `useLocalStorage` with `convex_` prefix | Acceptable as placeholder — plan explicitly notes this. Consider removing until actual Convex client integration is planned. |
| Task 1 Step 4 | `toolState` table + CRUD functions created but never consumed | Acceptable as infrastructure — will be consumed when sandbox ↔ Convex bridge is built. |
| Task 17 | Publish route builds code in a new sandbox then deploys | The route creates a fresh sandbox just to build — could reuse the existing sandbox. Consider `sb.commands.run("npx vite build")` on the current sandbox instead of `createSandbox()`. |

---

## Verified Correct (MANDATORY)

- **All 20+ file paths verified** — every existing file reference resolves to the correct location. Glob + Read confirmed.
- **All line number references accurate** — schema.ts:54-65, builder-header.tsx:34-53/85-90, chat-input.tsx:36-48/65-110, preview.tsx:20-28/38-67/84-105, file-progress.tsx:33, prompt.ts:34-67, globals.css:72, my-tools-page.tsx:112 — all match actual content within ±0 lines.
- **VSA boundaries respected** — new files placed correctly: builder-v2 components in `src/features/builder-v2/components/`, shared theme-toggle in `src/shared/components/`, API route in `src/app/api/publish/`.
- **Convex conventions correct** — all functions use named exports, `v` validators on all args, proper index naming, `mutation`/`query` used correctly, no `.filter()` usage.
- **Dependency chain sound** — Group A (foundation) → Group C (core features) → Group E (publish) dependency ordering is correct. Groups A and B are correctly identified as parallelizable.
- **Schema changes are additive** — new fields are all `v.optional()`, new table `toolState` doesn't affect existing tables. Safe migration.
- **`getCodeGenSystemPrompt` signature change is backward-compatible** — new `persistence` param is optional, existing callers unaffected.
- **Generate route change is correct** — `body.persistence ?? "device"` fallback handles missing field gracefully.

---
