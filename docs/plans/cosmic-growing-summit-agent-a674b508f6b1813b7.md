# Research: Convex + Clerk Auth Race Conditions & Best Practices

## 1. The Race Condition Problem

When a page loads with `ConvexProviderWithClerk`, there is a window where:
1. Clerk has not yet fetched/validated the JWT
2. Convex queries start executing (they are reactive and fire immediately)
3. `ctx.auth.getUserIdentity()` returns `null` because no token has been sent yet
4. If the query throws on null identity, the user sees a flash error on every page load

This is the **auth race condition** -- queries fire before the JWT propagates from Clerk to the Convex WebSocket.

---

## 2. The `useConvexAuth()` Hook

**Source:** [Convex React API Docs](https://docs.convex.dev/api/modules/react)

Returns two booleans:
```typescript
const { isLoading, isAuthenticated } = useConvexAuth();
```

- `isLoading: boolean` -- true while auth state is being determined (JWT fetch in progress)
- `isAuthenticated: boolean` -- true once Convex has received and validated the JWT

**Critical:** Use `useConvexAuth()` from `convex/react`, NOT `useAuth()` from `@clerk/nextjs`. Clerk's `useAuth()` reports authenticated as soon as Clerk has the token locally, but Convex may not have received it via the WebSocket yet. `useConvexAuth()` reflects when Convex actually has the token.

---

## 3. The `"skip"` Pattern for useQuery

**Source:** [Convex React Client Docs](https://docs.convex.dev/client/react)

Pass `"skip"` as the second argument to `useQuery` to prevent the query from executing:

```typescript
const data = useQuery(api.myModule.myQuery, shouldRun ? { arg1: "val" } : "skip");
```

When `"skip"` is passed, the query returns `undefined` and no backend call is made. This is the official way to conditionally run queries without violating React's rules of hooks.

**Current codebase usage (already correct):**
- `src/features/builder/hooks/use-session.ts` -- skips when `sessionId` is null
- `src/features/goals/hooks/use-goals.ts` -- skips when `goalId` is null
- `src/features/goals/hooks/use-report-generation.ts` -- skips when `reportId` is null

---

## 4. Three Strategies for Handling Auth in Queries

### Strategy A: Throw on null identity (Official Recommendation)

```typescript
export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    // ... use identity
  },
});
```

**Requirement:** The calling component MUST be wrapped in `<Authenticated>` from `convex/react`:

```tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

function App() {
  return (
    <>
      <AuthLoading>Loading...</AuthLoading>
      <Authenticated><ProtectedContent /></Authenticated>
      <Unauthenticated><SignInButton /></Unauthenticated>
    </>
  );
}
```

Components inside `<Authenticated>` only render after `useConvexAuth()` reports `isAuthenticated: true`, so the query never fires unauthenticated.

**Pros:** Clean, simple, enforces auth at backend level.
**Cons:** If a developer forgets `<Authenticated>`, users see error flashes on page load.

### Strategy B: Return null on null identity (Graceful Degradation)

```typescript
export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null; // or return [] for list queries
    }
    // ... use identity
  },
});
```

**Pros:** No error flashes, works anywhere in component tree.
**Cons:** Every caller must handle `null` -- easy to forget, weaker enforcement.

### Strategy C: Skip on client side with useConvexAuth

```typescript
function ProtectedContent() {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.myModule.getForCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  // data is undefined while skipped or loading
}
```

**Pros:** Query never fires unauthenticated, no wrapper components needed.
**Cons:** Boilerplate in every component, easy to forget.

---

## 5. Recommended Combined Pattern (Best Practice)

The official Convex + Clerk documentation recommends a **defense-in-depth** approach:

### Layer 1: Provider Setup (already done in this codebase)
```tsx
// src/core/providers.tsx
<ClerkProvider>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    {children}
  </ConvexProviderWithClerk>
</ClerkProvider>
```

### Layer 2: Component-level gating with `<Authenticated>`
```tsx
<Authenticated>
  <MyProtectedPage />  {/* queries here can safely throw */}
</Authenticated>
<AuthLoading>
  <Spinner />
</AuthLoading>
```

### Layer 3: Backend enforcement (throw pattern)
```typescript
const identity = await ctx.auth.getUserIdentity();
if (identity === null) throw new Error("Not authenticated");
```

### Layer 4: For mixed-auth pages, use `"skip"`
```typescript
const { isAuthenticated } = useConvexAuth();
const myData = useQuery(api.foo.bar, isAuthenticated ? {} : "skip");
```

---

## 6. Findings Specific to This Codebase

### Current Auth Utility (`convex/lib/auth.ts`)
- `getAuthUserId()` returns `null` on no auth (Strategy B -- graceful)
- `assertSessionOwner()` has `{ soft: true }` option (returns null) vs default (throws)
- `assertSLP()` throws `ConvexError("Not authenticated")`
- This is a good hybrid approach

### Identity Key Issue
The Convex AI guidelines at `convex/_generated/ai/guidelines.md` state:

> Prefer `identity.tokenIdentifier` over `identity.subject`. Do NOT use `identity.subject` alone as a global identity key.

**However, the codebase uses `identity.subject` everywhere** (sessions, apps, flashcard_decks, subscriptions, entitlements). The `tokenIdentifier` is `{issuer}|{subject}` and is guaranteed stable. Using `subject` alone works fine with a single auth provider (Clerk) but would break if a second provider were added. This is a low-risk issue for now but worth noting.

### Missing `<Authenticated>` Wrappers
The codebase should be audited to ensure pages that call authenticated queries are wrapped in `<Authenticated>` or use the `"skip"` pattern. Currently the `"skip"` pattern is used for ID-based lookups but not for auth-gated queries.

---

## 7. Summary Table

| Pattern | Where | When to Use |
|---------|-------|-------------|
| `<Authenticated>` wrapper | Client component tree | Pages that are fully auth-gated |
| `<AuthLoading>` wrapper | Client component tree | Show spinner during JWT propagation |
| `useConvexAuth()` + `"skip"` | Client hooks | Mixed-auth pages, optional auth features |
| `throw new Error("Not authenticated")` | Convex query/mutation handler | Strict auth-required endpoints |
| `return null` on no identity | Convex query handler | Queries that should degrade gracefully |
| `assertSessionOwner(ctx, id, { soft: true })` | Convex query handler | Ownership checks in queries |

---

## Sources

- [Convex Auth in Functions](https://docs.convex.dev/auth/functions-auth) -- `ctx.auth.getUserIdentity()` patterns
- [Convex React API: useConvexAuth](https://docs.convex.dev/api/modules/react) -- `isLoading` / `isAuthenticated`
- [Convex React Client: useQuery skip](https://docs.convex.dev/client/react) -- `"skip"` parameter
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk) -- provider setup, `<Authenticated>` components
- [Clerk Docs: Convex Integration](https://clerk.com/docs/guides/development/integrations/databases/convex) -- full Next.js setup
- [Authentication Best Practices: Convex, Clerk and Next.js (Stack)](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs) -- race conditions, middleware patterns
- [Convex Debugging Authentication](https://docs.convex.dev/auth/debug) -- troubleshooting auth issues
- [Authorization Best Practices (Stack)](https://stack.convex.dev/authorization) -- server-side authorization patterns
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices) -- `getCurrentUser` pattern
