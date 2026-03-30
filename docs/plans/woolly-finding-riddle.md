# Plan: Fix All Tests, TypeScript Errors, and ESLint Errors

## Context
The codebase has 17 test failures (across 8 files), TypeScript errors from an unexcluded sub-project, and ~282 ESLint errors (mostly auto-fixable import sorting). The root cause for most test failures is a design system refactor that moved from raw Tailwind classes/hex colors to semantic design tokens — tests weren't updated to match.

---

## Phase 1: Exclude `speech-adventures/` and `coverage/` from tooling

**Why:** All TypeScript errors and ~40% of ESLint errors come from `speech-adventures/`, a standalone sub-project with its own build. The `coverage/` and `scripts/` dirs also produce noise.

### 1a. `tsconfig.json` — add `speech-adventures/**` to `exclude`
**File:** `tsconfig.json:34`
```diff
- "exclude": ["node_modules", "src/test/**", "tests/**", "**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "skills/**", "e2b-templates/**", "artifacts/**", "aac-board/**"]
+ "exclude": ["node_modules", "src/test/**", "tests/**", "**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "skills/**", "e2b-templates/**", "artifacts/**", "aac-board/**", "speech-adventures/**"]
```

### 1b. `eslint.config.mjs` — add `speech-adventures/**`, `coverage/**`, `scripts/**` to globalIgnores
**File:** `eslint.config.mjs:30-44`
```diff
  globalIgnores([
    ...existing...,
+   "speech-adventures/**",
+   "coverage/**",
+   "scripts/**",
  ]),
```

---

## Phase 2: Fix 17 Test Failures (8 files)

### 2a. Delete orphan test: `main-prompt-input.test.tsx`
**File:** `src/features/dashboard/components/__tests__/main-prompt-input.test.tsx`
The component `main-prompt-input.tsx` no longer exists. Delete the test file.

### 2b. Fix `goal-utils.test.ts` — update color assertion
**File:** `src/features/goals/__tests__/goal-utils.test.ts:38-41`
Source returns `var(--color-chart-*)` instead of hex. Update:
```ts
it("promptLevelColor returns CSS variable colors", () => {
  expect(promptLevelColor("independent")).toMatch(/^var\(--color-/);
  expect(promptLevelColor(undefined)).toMatch(/^var\(--color-/);
});
```

### 2c. Fix `session-utils.test.ts` — update 3 accuracy color assertions
**File:** `src/features/session-notes/__tests__/session-utils.test.ts:64-84`
Source returns `text-success`, `text-caution`, `text-error` instead of old Tailwind classes. Update:
```ts
it("returns green for 80 and above", () => {
  expect(accuracyColor(80)).toBe("text-success");
  ...
});
it("returns yellow for 60-79", () => {
  expect(accuracyColor(60)).toBe("text-caution");
  ...
});
it("returns red for below 60", () => {
  expect(accuracyColor(59)).toBe("text-error");
  ...
});
```

### 2d. Fix `diagnosis-colors.test.ts` — update getInitialsColor assertions
**File:** `src/features/patients/lib/__tests__/diagnosis-colors.test.ts:66-79`
Source returns `bg-domain-*` tokens. Update:
```ts
expect(getInitialsColor("articulation")).toBe("bg-domain-emerald");
expect(getInitialsColor("language")).toBe("bg-domain-blue");
expect(getInitialsColor("fluency")).toBe("bg-domain-amber");
expect(getInitialsColor("voice")).toBe("bg-domain-purple");
expect(getInitialsColor("aac-complex")).toBe("bg-domain-rose");
expect(getInitialsColor("other")).toBe("bg-domain-neutral");
// fallback
expect(getInitialsColor("unknown-diagnosis")).toBe("bg-domain-neutral");
expect(getInitialsColor("")).toBe("bg-domain-neutral");
```

### 2e. Fix `demo-tool-grid.test.tsx` — add `useRouter` mock
**File:** `src/features/explore/components/__tests__/demo-tool-grid.test.tsx`
Component uses `useRouter()` from `next/navigation`. Add mock:
```ts
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
```

### 2f. Fix `marketing-header.test.tsx` — add missing mock exports
**File:** `src/shared/components/__tests__/marketing-header.test.tsx:34-42`
Component imports `SheetDescription` and `SheetTitle` but mock doesn't provide them. Add:
```ts
vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ...,
  SheetTrigger: ...,
  SheetContent: ...,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
```

### 2g. Fix `marketing-header-a11y.test.tsx` — add missing mock exports
**File:** `src/shared/components/__tests__/marketing-header-a11y.test.tsx:34-42`
Same issue — add `SheetTitle` and `SheetDescription` to the sheet mock. Also the `Button` mock needs to forward `aria-label` and other props.

### 2h. Fix `navigation.test.ts` — update NAV_ITEMS expectations
**File:** `src/shared/lib/__tests__/navigation.test.ts:4-14`
NAV_ITEMS now has `/speech-coach` instead of `/family` (family moved to caregiver nav). Update:
```ts
it("exports an array with 8 items", () => {
  expect(NAV_ITEMS).toHaveLength(8);
  expect(NAV_ITEMS[0].href).toBe("/dashboard");
  expect(NAV_ITEMS[1].href).toBe("/patients");
  expect(NAV_ITEMS[2].href).toBe("/builder");
  expect(NAV_ITEMS[3].href).toBe("/flashcards");
  expect(NAV_ITEMS[4].href).toBe("/speech-coach");
  expect(NAV_ITEMS[5].href).toBe("/templates");
  expect(NAV_ITEMS[6].href).toBe("/my-tools");
  expect(NAV_ITEMS[7].href).toBe("/settings");
});
```

---

## Phase 3: Auto-fix ESLint Import Sorting

Run `npx eslint . --fix` to auto-fix ~250 `simple-import-sort` errors.

---

## Phase 4: Fix Remaining Manual ESLint Errors

After auto-fix, address remaining non-auto-fixable errors:

### 4a. `share-dialog.tsx:38` — `set-state-in-effect`
Restructure the effect to avoid synchronous setState. The `setTimedOut(false)` early return should use a ref or guard instead.

### 4b. `tests/e2e/fixtures.ts` — `rules-of-hooks` false positive
The `use()` calls are React 19's `use()` API in Playwright fixture functions, not React hooks. Suppress with `// eslint-disable-next-line react-hooks/rules-of-hooks`.

### 4c. `tests/e2e/session-notes.spec.ts:51` — unused variable
Remove or prefix with `_`: `const _patientDetailUrl = ...` or remove the line.

### 4d. Other `set-state-in-effect` and `impure function` errors
These are in various component files — review each and apply minimal fixes (useMemo for Math.random, restructure effects for setState).

---

## Phase 5: Verify

```bash
npx tsc --noEmit           # 0 errors
npx eslint .               # 0 errors, 0 warnings (or warnings-only)
npm test -- --run           # 1374 tests pass, 0 failures
```

---

## Critical Files
- `tsconfig.json`
- `eslint.config.mjs`
- `src/features/dashboard/components/__tests__/main-prompt-input.test.tsx` (delete)
- `src/features/goals/__tests__/goal-utils.test.ts`
- `src/features/session-notes/__tests__/session-utils.test.ts`
- `src/features/patients/lib/__tests__/diagnosis-colors.test.ts`
- `src/features/explore/components/__tests__/demo-tool-grid.test.tsx`
- `src/shared/components/__tests__/marketing-header.test.tsx`
- `src/shared/components/__tests__/marketing-header-a11y.test.tsx`
- `src/shared/lib/__tests__/navigation.test.ts`
- `src/shared/components/share-dialog.tsx`
- `tests/e2e/fixtures.ts`
- `tests/e2e/session-notes.spec.ts`
