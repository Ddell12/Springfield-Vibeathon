# Plan: Fix Shared ConvexHttpClient Singleton in 3 API Routes

## Problem

All three route files declare `const convex = new ConvexHttpClient(...)` at module scope (outside the POST handler). When `convex.setAuth(token)` is called inside the handler, it mutates the shared singleton. Under concurrent requests, request A's Convex calls can run with request B's auth token — cross-user auth race condition on patient data.

## Fix

Move `const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)` from module scope to the first line inside each POST handler function body. The `anthropic` client is stateless and stays as a module-level singleton.

---

## File 1: `src/app/api/generate/route.ts`

**Current state (line 38):**
```ts
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
```
(note: no `!` non-null assertion — already validated by guard above)

**POST handler starts at line 61:**
```ts
export async function POST(request: Request): Promise<Response> {
  // Authenticate via Clerk — required unless demo mode is enabled
  let clerkUserId: string | undefined;
```

**Change:**
- Delete line 38: `const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);`
- Add as the first line inside POST (after the opening `{`):
  ```ts
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  ```

---

## File 2: `src/app/api/generate-soap/route.ts`

**Current state (line 23):**
```ts
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
```

**POST handler starts at line 26:**
```ts
export async function POST(request: Request): Promise<Response> {
  const { userId, getToken } = await auth();
```

**Change:**
- Delete line 23: `const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);`
- Add as the first line inside POST (after the opening `{`):
  ```ts
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  ```

---

## File 3: `src/app/api/generate-report/route.ts`

**Current state (line 24):**
```ts
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
```

**POST handler starts at line 27:**
```ts
export async function POST(request: Request): Promise<Response> {
  const { userId, getToken } = await auth();
```

**Change:**
- Delete line 24: `const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);`
- Add as the first line inside POST (after the opening `{`):
  ```ts
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  ```

---

## Verification

1. No other code in any of these files references the module-level `convex` variable outside the POST handler — the variable is used only within the handler via `convex.setAuth(token)` and subsequent `convex.query(...)` / `convex.mutation(...)` calls.
2. The env var guard (`if (!process.env.NEXT_PUBLIC_CONVEX_URL)`) remains at module scope in all three files, so startup-time validation is preserved.
3. After edits: run `npx vitest run` from the worktree to confirm no test regressions.
4. Commit with message describing the security fix.

## Notes

- Using `!` non-null assertion inside the handlers is safe because the module-level guard throws before any handler is invoked if the env var is missing.
- `anthropic` singleton stays at module scope — the Anthropic SDK client holds no per-request mutable state (no `setAuth` equivalent is called on it).
