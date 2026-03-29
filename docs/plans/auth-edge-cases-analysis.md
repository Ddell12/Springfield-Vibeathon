# Authentication & Authorization Edge Cases Analysis
**Springfield Vibeathon / Bridges App**  
**Date:** March 26, 2026

## Executive Summary

This audit examines authentication and authorization patterns in a Next.js + Clerk + Convex application. The analysis reveals **CRITICAL GAPS** in route protection, auth state synchronization, and session handling that could allow unauthorized access to protected resources.

---

## 1. UNPROTECTED ROUTES - CRITICAL ISSUE

### Finding: Missing Server-Side Auth Enforcement

**Problem**: While middleware protects routes at the edge, several protected pages lack server-side auth checks in their components.

#### Affected Routes
All routes under `(app)/` folder:
- `/dashboard` - Displays user sessions via Convex queries
- `/builder` - Creates and edits sessions
- `/builder/[sessionId]` - Opens specific session for editing
- `/flashcards` - Manages flashcard decks
- `/my-tools` - Lists user apps
- `/settings` - User account settings
- `/templates` - Browses templates

#### Root Cause
Pages are simple wrapper components that immediately render feature components without verifying auth state:

```typescript
// NO auth verification, relies entirely on middleware
export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
```

#### Risk
- **If middleware is bypassed or fails**: Routes become accessible to unauthenticated users
- **Hydration mismatches**: Server renders protected content; client hydrates with auth context from Clerk
- **Auth state delays**: Components may render before Clerk auth context is available

#### Remediation
- Add `auth()` check at page level using @clerk/nextjs/server
- Redirect unauthenticated users to /sign-in before rendering
- Verify Clerk auth before calling Convex queries

---

## 2. AUTH STATE MISMATCH - HIGH PRIORITY

### Finding: No Client-Side Auth State Verification

**Problem**: Components don't verify useAuth() before accessing protected data.

#### Example: DashboardView.tsx
```typescript
export function DashboardView() {
  // NO VERIFICATION of auth state
  const sessions = useQuery(api.sessions.list);
  // returns [] if not authenticated
}
```

#### Risk Scenario
1. Unauthenticated user bypasses middleware
2. Component renders with sessions = undefined (loading state)
3. User sees loading skeleton, not "sign in" prompt
4. Convex returns empty array []
5. UI shows "No apps yet" instead of "Please sign in"

#### Affected Components
- DashboardView
- FlashcardPage
- BuilderPage
- SettingsPage

---

## 3. MISSING CONVEX AUTH IN QUERIES

### Finding: Soft Auth Failures Return Empty Data

**Problem**: Convex queries use "soft" auth (return null/[] on auth failure) without proper UI handling.

#### Example: sessions.list
```typescript
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];  // Silent failure
    return await ctx.db.query("sessions")...
  },
});
```

#### Risk
- Unauthenticated users see empty state instead of sign-in prompt
- No distinction between "no data" and "not authenticated"

#### Affected Queries
- api.sessions.list
- api.sessions.listByState
- api.flashcardDecks.list
- api.apps.list

---

## 4. CLERK MIDDLEWARE CONFIGURATION

### Status: VERIFIED GOOD

File: /src/proxy.ts
```typescript
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
```

**Strengths**: Comprehensive route coverage, proper redirect to sign-in

**Limitations**: Middleware alone doesn't prevent component-level auth bypass

---

## 5. SIGN-IN/SIGN-UP FLOW - CRITICAL GAPS

### Finding: No Post-Auth Redirect Configuration

**Problem**: Sign-in and sign-up pages have no redirect configuration.

#### Current Implementation
```typescript
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn signUpUrl="/sign-up" />  // NO afterSignIn callback
    </div>
  );
}
```

#### Risk Scenario
1. User signs in via Clerk UI
2. No explicit redirect configured
3. Clerk defaults to unknown destination
4. Possible infinite loop if defaults to /sign-in

#### Remediation
Add redirectUrl parameter to SignIn component

---

## 6. SIGN-OUT BEHAVIOR

### Finding: UserButton Uses Clerk Default Sign-Out

**Current Implementation**
```typescript
<Show when="signed-in">
  <UserButton />
</Show>
```

#### Risk
- Sign-out destination depends on Clerk dashboard config
- User may stay on protected page momentarily
- No explicit client-side sign-out handling

---

## 7. PROTECTED CONVEX QUERIES

### Status: VERIFIED GOOD

#### Pattern: Hard Assertion for Mutations
```typescript
const session = (await assertSessionOwner(ctx, args.sessionId))!;
// Throws on auth failure
```

#### Pattern: Soft Assertion for Queries
```typescript
return await assertSessionOwner(ctx, args.sessionId, { soft: true });
// Returns null on auth failure
```

**Strengths**: Proper authorization checks, legacy session handling

**Concern**: Legacy sessions (no userId) accessible by any authenticated user

---

## 8. GRACEFUL DEGRADATION

### Finding: Missing "Not Logged In" States

**Problem**: Components handle loading/error but not "not authenticated" state.

#### Example: DashboardView
- "No apps yet" empty state shown to both unauthenticated AND authenticated users with no projects
- Should distinguish between them

---

## 9. TOKEN EXPIRATION HANDLING

### Finding: No Explicit Token Refresh Configuration

**Current Setup**
```typescript
<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
  // Assumes automatic token refresh
</ConvexProviderWithClerk>
```

#### Questions
- Does ConvexProviderWithClerk auto-refresh? Likely yes
- What happens if token expires mid-operation?
- Does Convex retry or show error?

#### Risk
- Long-running sessions may lose auth mid-operation
- No visible error to user

---

## 10. DEEP LINKING - HIGH PRIORITY ISSUE

### Finding: No Session Ownership Check When Reopening /builder/[sessionId]

**Risk Scenario**
1. User creates app at /builder/abc123
2. Signs out
3. Bookmarks the URL
4. Later visits /builder/abc123 again
5. Middleware redirects to /sign-in
6. User signs in with DIFFERENT account
7. User redirected back to /builder/abc123
8. BuilderPage has no ownership verification
9. Shows empty state instead of "not authorized"

#### Current Implementation
```typescript
export default function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  return (
    <ErrorBoundary FallbackComponent={BuilderErrorFallback}>
      <BuilderPage initialSessionId={sessionId} />  // NO verification
    </ErrorBoundary>
  );
}
```

#### Remediation
- Add auth check at page level
- Verify session owner before rendering
- Show explicit "Session not found" error

---

## 11. PUBLIC SHARED APPS

### Status: INTENTIONAL DESIGN

File: /convex/apps.ts
```typescript
/** Intentionally public — shared apps are accessible by anyone with the slug. */
export const getByShareSlug = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("apps")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();
  },
});
```

**Design Decision**: Share slugs are 12 random alphanumeric characters (collision risk ~1 in 3.6 trillion)

**Concern**: No rate limiting on slug guessing - could enumerate all apps

---

## 12. API ROUTE PROTECTION

### Status: ACCEPTABLE (Demo Mode)

File: /src/app/api/generate/route.ts
```typescript
export async function POST(request: Request) {
  // Try Clerk auth if available, but don't block generation
  try {
    const { userId: clerkUserId, getToken } = await auth();
    if (clerkUserId) {
      const token = await getToken({ template: "convex" });
      if (token) convex.setAuth(token);
    }
  } catch {
    // Auth not configured yet — allow unauthenticated generation for demo
  }

  // Rate limiting by IP
  const ip = request.headers.get("x-real-ip") ?? "anonymous";
  await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: ip });
}
```

**Strengths**: IP-based rate limiting, graceful auth handling

**Concern**: Unauthenticated users can generate apps; IP rate limiting can be spoofed

---

## Risk Assessment Summary

### CRITICAL (Fix Immediately)
1. Sign-in/Sign-up redirect - No post-auth destination
2. Deep linking to protected sessions - No ownership verification at page level
3. Auth state mismatch - Components don't verify useAuth()

### HIGH (Fix Soon)
4. Unprotected routes - Pages lack server-side auth checks
5. Missing "not logged in" states - Empty state instead of sign-in prompt
6. Rate limiting on shared apps - Slug enumeration possible

### MEDIUM (Monitor)
7. Token expiration - No explicit error handling
8. Legacy sessions - Any authenticated user can access
9. Middleware-only protection - Edge middleware is single point of failure

### LOW (Acceptable)
10. Public API generation - IP rate limiting in place
11. Soft Convex auth failures - Graceful degradation design

---

## Action Items

### Phase 1: Critical
- Configure Clerk redirectUrl for sign-in/sign-up
- Add auth check to /builder/[sessionId] page
- Add useAuth() verification in protected components
- Replace "No apps" with "Sign in required"

### Phase 2: Robustness
- Add error boundaries for Convex failures
- Implement "Session not found" error state
- Add token expiration error handling
- Add rate limiting to slug guessing

### Phase 3: Enhancement
- Add session access logs
- Add email confirmation for sign-up
- Implement session expiration
- Migrate legacy sessions

