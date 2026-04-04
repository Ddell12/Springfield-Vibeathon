# Fix: Double GET /tools/new on Builder Navigation

## Context

Every navigation to `/builder` or `/tools/new` logs two sequential GET requests:
```
GET /tools/new 200 in 163ms
GET /tools/new 200 in 194ms
```

This happens because Next.js App Router **dev mode** intentionally double-invokes async Server Components (same rationale as StrictMode for client components). Each invocation goes through the full middleware stack, showing as two entries in logs.

Root cause: `ToolsLayout` (and `BuilderLayout`) are async Server Components calling `requireSlpUser()`, which internally calls `fetchQuery(api.users.currentUser)` to Convex — making two Convex round-trips per navigation in dev.

This is dev-only behavior; production builds are unaffected.

## Fix

Wrap `requireSlpUser` with React's `cache()` in:
- `src/features/auth/lib/server-role-guards.ts`

`cache()` memoizes the result per request scope — the Convex query runs once even when React double-invokes the Server Component.

```ts
import { cache } from "react";

export const requireSlpUser = cache(async function requireSlpUser() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect("/sign-in");

  const user = await fetchQuery(api.users.currentUser, {}, { token });
  if (!user) redirect("/sign-in");
  if (user.role === "caregiver") redirect("/family");

  return user;
});
```

## Verification

1. In dev: navigate to `/builder` → logs should still show two requests (React still double-invokes) but the Convex fetch only fires once
2. Run `next build && next start` → only one GET /tools/new per navigation
3. Auth guard still works: unauthenticated → `/sign-in`, caregiver → `/family`
