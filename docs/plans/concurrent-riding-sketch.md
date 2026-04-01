# Fix All TypeScript Errors, ESLint Errors, and Failing Tests

## Context

Three clusters of issues found across the codebase:
1. **Schema drift** — `practiceProfiles` schema uses `address`/`phone` but some component code reads `practiceAddress`/`practicePhone` (which don't exist on the query result type)
2. **Convex mutation arg drift** — `use-intake-forms.ts` passes `signerIP` to mutations that don't declare it, and passes the full `IntakeFormType` union (which includes `"telehealth-consent"`) to `signForm` which only accepts the 5 non-telehealth types
3. **Missing `useSearchParams` mock** — two test files mock `next/navigation` without `useSearchParams`, causing test-time crashes

---

## Fix 1: TypeScript Errors (11 errors in 6 files)

### A. `src/features/builder/components/chat-panel.tsx`
**Error:** `narrationMessage` prop passed from `chat-column.tsx` but missing from `ChatPanelProps`.
**Fix:** Add `narrationMessage?: string | null` to the `ChatPanelProps` interface (line ~70) and destructure it in the component.

### B. `src/features/evaluations/components/evaluation-editor.tsx`
**Error:** Parameter `t` implicitly has `any` type in `.map((t) => ...)` at line 78.
**Fix:** Type `t` explicitly as `AssessmentTool` (already imported from `./assessment-tools-form`).

### C. `src/features/evaluations/components/evaluation-list.tsx`
**Errors:** Parameters `evalDoc` (line 42) and `d` (line 53) implicitly `any`.
**Fix:** Since `useEvaluations` uses `anyApi`, the result is untyped. Add inline explicit types:
- `evalDoc` → import `Doc<"evaluations">` from generated dataModel, or inline as the known shape
- `d` → `{ code: string }` inline type annotation

### D. `src/features/intake/components/practice-profile-form.tsx`
**Errors:** `profile.practiceAddress` and `profile.practicePhone` don't exist; schema has `address` and `phone`.
**Fix:** Change lines 47-48:
```ts
practiceAddress: profile.address ?? "",
practicePhone: profile.phone ?? "",
```
(The local `FormFields` interface keeps `practiceAddress`/`practicePhone` as form state names — this is intentional mapping between internal form state and schema field names.)

### E. `src/features/intake/components/telehealth-consent-gate.tsx`
**Errors:** Same `practiceAddress`/`practicePhone` on query result.
**Fix:** Lines 57-58: `profile.practiceAddress` → `profile.address`, `profile.practicePhone` → `profile.phone`.

### F. `src/features/intake/hooks/use-intake-forms.ts`
**Error 1 (line 38):** `IntakeFormType` includes `"telehealth-consent"` but `signForm` mutation only accepts 5 non-telehealth types.
**Fix:** Cast to the narrower type in the call:
```ts
formType: formType as Exclude<IntakeFormType, "telehealth-consent">,
```
Or alternatively, narrow the `signForm` function's parameter type.

**Error 2 (lines 49, 81):** `signerIP` passed to `signFormMutation` and `signTelehealthMutation`, but neither declares this arg.
**Fix:** Remove `signerIP` from both mutation call argument objects. Keep `signerIP` as a function parameter (it's accepted from callers) but don't forward it.

---

## Fix 2: ESLint Errors

### A. Import Sort (dozens of files) — Autofix
Run `npx eslint --fix` targeting all affected files. The `simple-import-sort` rule is fully auto-fixable with no semantic impact.
```bash
npx eslint --fix src --ext .ts,.tsx
```

### B. `react-hooks/set-state-in-effect` (8 occurrences in 7 files)
All affected setState calls inside `useEffect` should be wrapped with `startTransition` from React. `import { startTransition } from "react"` is already imported in some files.

Files and lines:
| File | Line | setState call |
|------|------|--------------|
| `src/features/builder/components/builder-page.tsx` | 135 | `setPreviewVisible(true)` |
| `src/features/discharge/components/discharge-form.tsx` | 57 | `setNarrative(...)` + `setRecommendations(...)` |
| `src/features/evaluations/components/evaluation-editor.tsx` | 69, 91 | multiple setState calls in both useEffects |
| `src/features/flashcards/components/flashcard-page.tsx` | 198 | `setPendingPrompt(promptFromUrl)` |
| `src/features/plan-of-care/components/poc-editor.tsx` | 55 | multiple setState calls |
| `src/features/sessions/components/content-picker.tsx` | 66 | `setPendingDeckId(null)` |
| `src/features/sessions/components/content-renderer.tsx` | 29 | `setCardRevealed(...)` |

Pattern — wrap the entire setState block in `startTransition`:
```ts
// Before
useEffect(() => {
  if (condition) {
    setFoo(value);
    setBar(value2);
  }
}, [deps]);

// After
useEffect(() => {
  if (condition) {
    startTransition(() => {
      setFoo(value);
      setBar(value2);
    });
  }
}, [deps]);
```

Add `import { startTransition } from "react"` where not already present.

### C. `@typescript-eslint/no-explicit-any` in `src/test/setup.ts`
`src/test/setup.ts` doesn't match the test-file glob, so it gets the stricter `error` level for `no-explicit-any`.
**Fix:** Replace `React.ComponentType<any>` with `React.ComponentType<Record<string, unknown>>` and `props as any` with `props as Record<string, unknown>`.

---

## Fix 3: Failing Tests (11 failures in 2 files)

### A. `src/shared/components/__tests__/header.test.tsx`
**Error:** `useSearchParams` is not exported from the `next/navigation` mock (Header component was recently updated to call `useSearchParams()`).
**Fix:** Add `useSearchParams` to the existing mock:
```ts
vi.mock("next/navigation", () => ({
  usePathname: () => "/builder",
  useSearchParams: () => new URLSearchParams(),
}));
```

### B. `src/features/flashcards/components/__tests__/flashcard-page.test.tsx`
**Error:** No `next/navigation` mock at all; `useSearchParams()` returns null, crashing `.get("sessionId")`.
**Fix:** Add mock near the top of the test file:
```ts
vi.mock("next/navigation", () => ({
  usePathname: () => "/flashcards",
  useSearchParams: () => new URLSearchParams(),
}));
```

---

## Execution Order

1. Fix TypeScript errors (6 files) — enables clean type checking
2. Fix failing tests (2 files) — restore test suite to green
3. Run ESLint autofix for import sort — large volume, zero risk
4. Fix `react-hooks/set-state-in-effect` (7 files) — wrap with `startTransition`
5. Fix `no-explicit-any` in `src/test/setup.ts`

## Verification

```bash
# TypeScript clean
npx tsc --noEmit

# Tests pass
npm test -- --run

# ESLint clean (no errors, no warnings)
npx eslint src --ext .ts,.tsx --max-warnings=0
```

Expected outcome: 0 TypeScript errors, 0 ESLint errors, 11 fewer test failures.

## Critical Files to Modify

- `src/features/builder/components/chat-panel.tsx` — add `narrationMessage` to props
- `src/features/evaluations/components/evaluation-editor.tsx` — type `t`, wrap setState
- `src/features/evaluations/components/evaluation-list.tsx` — type `evalDoc` and `d`
- `src/features/intake/components/practice-profile-form.tsx` — `address`/`phone` fix
- `src/features/intake/components/telehealth-consent-gate.tsx` — `address`/`phone` fix
- `src/features/intake/hooks/use-intake-forms.ts` — type cast + remove `signerIP`
- `src/features/builder/components/builder-page.tsx` — wrap setState in startTransition
- `src/features/discharge/components/discharge-form.tsx` — wrap setState
- `src/features/flashcards/components/flashcard-page.tsx` — wrap setState
- `src/features/plan-of-care/components/poc-editor.tsx` — wrap setState
- `src/features/sessions/components/content-picker.tsx` — wrap setState
- `src/features/sessions/components/content-renderer.tsx` — wrap setState
- `src/test/setup.ts` — replace `any` types
- `src/shared/components/__tests__/header.test.tsx` — add `useSearchParams` to mock
- `src/features/flashcards/components/__tests__/flashcard-page.test.tsx` — add nav mock
- 60+ files with import sort issues (ESLint autofix)
