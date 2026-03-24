# Fix: TypeScript errors for `import.meta.glob` in Convex tests

## Context
4 Convex test files use `import.meta.glob()` (a Vite-specific API) to auto-import modules for `convex-test`. TypeScript's `tsc` doesn't know about this API, causing TS2339 errors.

## Fix
Create `convex/__tests__/vite-env.d.ts` with a type declaration that extends `ImportMeta`:

```ts
/// <reference types="vite/client" />
```

This single line pulls in Vite's built-in type definitions which include the `glob` method on `ImportMeta`. Since `tsconfig.json` already includes `**/*.ts` (which matches `.d.ts` files), it will be picked up automatically.

### Files to create
- `convex/__tests__/vite-env.d.ts`

### Verification
```bash
npx tsc --noEmit
```
