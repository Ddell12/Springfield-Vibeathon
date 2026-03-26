# Plan: Add Clerk Auth + Convex Integration

## Context

Bridges is a vibeathon demo app with no auth — all data is globally visible. We need the simplest possible Clerk integration to gate user-specific routes and tie sessions/apps to authenticated users. This is Phase 6 work that the codebase was pre-wired for (optional `userId` fields, `by_user` indexes, placeholder comments).

## Steps

### 1. Install + Environment Setup

```bash
npm install @clerk/nextjs
```

**`.env.local`** — add:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

**Convex env** (via dashboard or CLI):
```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<instance>.clerk.accounts.dev
```

**Clerk dashboard**: Create a JWT template named **"convex"** with issuer = your Clerk domain.

---

### 2. Create `convex/auth.config.ts` (NEW)

Tells Convex how to verify Clerk JWTs.

```ts
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
export default authConfig;
```

---

### 3. Create `src/middleware.ts` (NEW)

Public-first strategy — only protect app routes. Templates stay accessible without login.

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/builder(.*)",
  "/dashboard(.*)",
  "/my-tools(.*)",
  "/settings(.*)",
  "/flashcards(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

Route group names `(app)` and `(marketing)` are stripped by Next.js — `/builder` is the real URL.

---

### 4. Modify `src/core/providers.tsx`

Replace `ConvexProvider` with `ClerkProvider` + `ConvexProviderWithClerk`.

```ts
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useMemo } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const convex = useMemo(
    () =>
      new ConvexReactClient(
        process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
      ),
    []
  );

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

This automatically syncs the Clerk JWT into Convex so `ctx.auth.getUserIdentity()` works.

---

### 5. Create Sign-in / Sign-up Pages (2 NEW files)

**`src/app/sign-in/[[...sign-in]]/page.tsx`**:
```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

**`src/app/sign-up/[[...sign-up]]/page.tsx`**:
```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
```

Clerk's `[[...catch-all]]` handles multi-step auth flows (MFA, OAuth callbacks).

---

### 6. Add Auth to Convex Functions

#### `convex/sessions.ts` — 3 functions

**`create`**: Remove `userId` arg, derive from identity:
```ts
export const create = mutation({
  args: { title: v.string(), query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("sessions", {
      userId: identity.subject,
      title: args.title,
      query: args.query,
      state: SESSION_STATES.IDLE,
    });
  },
});
```

**`list`**: Filter by authenticated user:
```ts
handler: async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return [];
  return await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", identity.subject))
    .order("desc")
    .take(50);
},
```

**`remove`**: Verify ownership:
```ts
handler: async (ctx, args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const session = await ctx.db.get(args.sessionId);
  if (!session || session.userId !== identity.subject) throw new Error("Not authorized");
  // ... existing cascade delete unchanged ...
},
```

#### `convex/apps.ts` — 2 functions

**`list`**: Filter by user (in-memory filter on ≤50 rows — no index needed for demo):
```ts
handler: async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return [];
  const all = await ctx.db.query("apps").withIndex("by_created").order("desc").take(50);
  return all.filter((app) => app.userId === identity.subject);
},
```

**`ensureForSession`**: Stamp userId on new records:
```ts
// Inside the insert call, add:
userId: identity?.subject,
```

#### `convex/publish.ts` — 1 function

**`publishApp`**: Auth guard at top of handler:
```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

---

### 7. Auth in SSE API Route

**`src/app/api/generate/route.ts`** — forward Clerk JWT to ConvexHttpClient:

```ts
import { auth } from "@clerk/nextjs/server";

// At top of POST handler, before any Convex calls:
const { userId, getToken } = await auth();
if (!userId) return jsonErrorResponse("Unauthorized", 401);

const token = await getToken({ template: "convex" });
if (token) convex.setAuth(token);
```

This passes the Clerk session to the server-side ConvexHttpClient so `sessions.create` can read `ctx.auth.getUserIdentity()`.

---

## What Stays Unauthenticated (No Changes)

- `(marketing)/` — public landing page
- `(app)/templates/` — not in `isProtectedRoute`, stays public
- `tool/[toolId]/` — outside `(app)` group, public
- `apps.getByShareSlug` — public app lookup
- `sessions.get` — read-only session fetch (used by builder iframe)
- `therapy_templates.*`, `ttsCache`, `imageCache` — internal/public
- `messages.*`, `generated_files.*` — session-scoped, not user-scoped (fine for demo)

---

## Callers That Need Updating

| Caller | Change |
|--------|--------|
| `src/app/api/generate/route.ts:83` | Remove `userId` from `sessions.create` args (already absent) |
| `convex/__tests__/sessions.test.ts` | Tests call `sessions.create` — need mock identity via `convex-test` |
| `convex/__tests__/apps.test.ts` | Same — tests create sessions |

Test updates: Use `t.withIdentity({ subject: "test-user" })` in convex-test to mock auth.

---

## File Summary

| File | Action |
|------|--------|
| `convex/auth.config.ts` | CREATE |
| `src/middleware.ts` | CREATE |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | CREATE |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | CREATE |
| `src/core/providers.tsx` | MODIFY |
| `convex/sessions.ts` | MODIFY |
| `convex/apps.ts` | MODIFY |
| `convex/publish.ts` | MODIFY |
| `src/app/api/generate/route.ts` | MODIFY |

---

## Verification

1. `npx convex dev` — confirm schema + auth.config deploy without errors
2. `npm run dev` — visit `/builder`, should redirect to `/sign-in`
3. Sign in via Clerk → redirect back to `/builder`
4. Create a session → check Convex dashboard that `userId` is populated
5. Visit `/templates` without signing in → should work (public)
6. Visit `/tool/[slug]` without signing in → should work (public)
7. `npm test` — fix any test failures from auth changes (add mock identity)
