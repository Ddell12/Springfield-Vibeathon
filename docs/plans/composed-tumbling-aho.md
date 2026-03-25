# Fix All TypeScript & ESLint Errors

## Context
TypeScript compiles cleanly (0 errors). ESLint reports **56 problems** (36 errors, 20 warnings) across ~20 files. The issues fall into 5 categories — all are straightforward fixes with no logic changes required.

## Approach

### Step 1: Auto-fix import sorting (6 errors)
Run `npx eslint src/ --fix` to auto-sort imports. This resolves all `simple-import-sort/imports` errors in:
- `src/features/builder-v2/components/chat-message.tsx`
- `src/features/builder-v2/components/loading-carousel.tsx`
- `src/features/builder-v2/components/thinking-state.tsx`
- `src/features/dashboard/components/dashboard-sidebar.tsx`
- `src/features/dashboard/components/dashboard-view.tsx`
- `src/features/dashboard/components/main-prompt-input.tsx`

### Step 2: Fix unused variables (warnings → clean removal)
Remove or properly suppress unused variables:

| File | Variable | Fix |
|------|----------|-----|
| `src/app/error.tsx` | `error` | Prefix with underscore: `_error` (required by Next.js error boundary signature) |
| `src/features/builder-v2/components/builder-header.tsx` | `_shareSlug` | Remove from destructuring |
| `src/features/builder-v2/components/chat-message.tsx` | `cn`, `isUser` | Remove unused imports/assignments |
| `src/features/builder-v2/components/chat.tsx` | `_projectId` | Remove from destructuring |
| `src/features/builder-v2/lib/e2b.ts` | `port` | Prefix with underscore: `_port` (part of public API signature) |
| `src/features/dashboard/components/main-prompt-input.tsx` | `cn` | Remove unused import |
| `src/features/builder-v2/lib/__tests__/schema.test.ts` | `_title`, `_desc`, `_tmpl`, `_code`, `_fp` | Already underscore-prefixed — need ESLint config fix (Step 5) |
| `src/features/therapy-tools/types/__tests__/tool-configs.test.ts` | `_` | Already underscore-prefixed — same config fix |
| `src/features/builder-v2/components/__tests__/preview.test.tsx` | `content` | Remove or use |
| `src/shared/components/__tests__/marketing-header.test.tsx` | `container` | Remove unused assignment |
| `src/shared/components/__tests__/header.test.tsx` | `asChild` | Remove from mock destructuring |
| `src/shared/components/__tests__/marketing-header-a11y.test.tsx` | `asChild` | Remove from mock destructuring |

### Step 3: Replace `any` types in test mocks (24 errors)
Replace `any` with proper types in mock function signatures. Common pattern across test files:

**Mock component props pattern** (header.test.tsx, marketing-header.test.tsx, marketing-header-a11y.test.tsx, tool-card.test.tsx):
```tsx
// Before
({ children, href, ...rest }: any) => ...
// After
({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => ...
```

**E2B sandbox mock** (e2b.test.ts): Type `mockSandboxInstance` with `Partial<Sandbox>` at declaration instead of `as any` at each call site.

**DnD event mock** (visual-schedule.test.tsx): Replace `any` with `{ active: { id: string }; over: { id: string } | null }` matching the actual usage shape.

### Step 4: Fix unescaped entity (1 error)
- `src/features/dashboard/components/dashboard-view.tsx` line 20: Replace `'` with `&apos;`

### Step 5: Update ESLint config for underscore-prefixed vars
Add `argsIgnorePattern` and `varsIgnorePattern` to `@typescript-eslint/no-unused-vars` in `eslint.config.mjs`:
```js
"@typescript-eslint/no-unused-vars": ["warn", {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  destructuredArrayPattern: "^_",
}]
```
This is the standard convention — underscore prefix signals intentional non-use.

### Step 6: Address remaining warnings
- `src/features/shared-tool/components/shared-tool-page.tsx`: Review useEffect deps — add missing `project` dependency or wrap in a ref to avoid re-renders
- `src/app/layout.tsx`: Custom font warnings from `@next/next/no-page-custom-font` — these are false positives in App Router (rule is for Pages Router). Suppress with inline `// eslint-disable-next-line` if desired, or ignore.

## Critical Files
- `eslint.config.mjs` — ESLint configuration (Step 5)
- `src/features/builder-v2/components/chat-message.tsx`
- `src/features/builder-v2/components/builder-header.tsx`
- `src/features/builder-v2/components/chat.tsx`
- `src/features/builder-v2/lib/e2b.ts`
- `src/features/dashboard/components/dashboard-view.tsx`
- `src/features/dashboard/components/main-prompt-input.tsx`
- `src/features/shared-tool/components/shared-tool-page.tsx`
- `src/shared/components/__tests__/header.test.tsx`
- `src/shared/components/__tests__/marketing-header.test.tsx`
- `src/shared/components/__tests__/marketing-header-a11y.test.tsx`
- `src/shared/components/__tests__/tool-card.test.tsx`
- `src/features/builder-v2/lib/__tests__/e2b.test.ts`
- `src/features/therapy-tools/components/__tests__/visual-schedule.test.tsx`

## Verification
1. Run `npx tsc --noEmit` — should remain 0 errors
2. Run `npx eslint src/` — should report 0 errors, 0 warnings (or only the 2 layout.tsx font warnings which are false positives)
3. Run `npx vitest run` — all existing tests should still pass
