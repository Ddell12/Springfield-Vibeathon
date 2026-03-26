# Fix ESLint Errors & Ensure Deploy Readiness

## Context
All tests pass (625/625), TypeScript compiles cleanly, and `next build` succeeds. Only 2 ESLint errors block a clean lint — both are auto-fixable import sort issues. 68 warnings are non-blocking (mostly `any` in test files, already configured as `warn`).

## Fixes

### 1. Auto-fix import sort errors (2 errors)
- `src/app/api/generate/route.ts` — import order
- `src/core/providers.tsx` — import order
- **Action:** Run `npx eslint --fix` on both files

### 2. Fix flashcard `<img>` element (1 warning, best practice)
- `src/features/flashcards/components/flashcard-card.tsx:38` — uses `<img>` instead of `next/image`
- Line 36 has an unused eslint-disable directive for `@next/next/no-img-element`
- **Action:** Replace `<img>` with `<Image>` from `next/image`, remove stale directive

### 3. Skip (no action needed)
- 65 `@typescript-eslint/no-explicit-any` warnings in test files — already downgraded to `warn` in ESLint config, standard for test mocks
- 1 `@next/next/no-img-element` in test file (JSX in mock, not real rendering)

## Verification
```bash
npm test -- --run          # 625 tests pass
npx tsc --noEmit           # Zero errors
npx eslint src/ convex/    # Zero errors, warnings only
npx next build             # Succeeds
```
