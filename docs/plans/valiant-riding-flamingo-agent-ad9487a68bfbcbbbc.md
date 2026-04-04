# Role-Based Routing & Post-Auth Redirect Logic - Analysis Report

## Summary
The app uses a role-based routing system where users are categorized as either "SLP" (Speech-Language Pathologist/Therapist) or "Caregiver", with different post-auth redirects and UI layouts for each role.

---

## 1. Role Determination - How the App Knows the User's Role

### Storage Location
**File:** `/Users/desha/Springfield-Vibeathon/convex/schema.ts` (lines 11-20)
```
users: defineTable({
  ...
  role: v.optional(v.union(v.literal("slp"), v.literal("caregiver"))),
})
```

### Role is Optional
- **Default:** `null`/`undefined` (defaults to SLP behavior)
- **SLP:** Explicitly set to `"slp"` or left unset (new sign-ups)
- **Caregiver:** Set to `"caregiver"` after accepting an invite

### How Role is Checked Post-Auth
**File:** `/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts` (lines 68-75)

Function `getAuthRole()`:
```typescript
export async function getAuthRole(
  ctx: QueryCtx | MutationCtx,
): Promise<UserRole | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId as any) as { role?: string } | null;
  return (user?.role as UserRole) ?? null;
}
```

Returns: `"slp"` | `"caregiver"` | `null` (treated as SLP)

---

## 2. Post-Auth Redirect Logic

### Primary Redirect Point
**File:** `/Users/desha/Springfield-Vibeathon/src/app/(app)/dashboard/page.tsx`

```typescript
export default async function DashboardPage() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/sign-in");
  }

  const user = await fetchQuery(api.users.currentUser, {}, { token });
  const role = user?.role;

  redirect(role === "caregiver" ? "/family" : "/builder");
}
```

**Redirect Flow:**
- **Caregiver:** → `/family` (family workspace/landing page)
- **SLP:** → `/builder` (app builder - the SLP's main workspace)

### Sidebar Additional Redirect
**File:** `/Users/desha/Springfield-Vibeathon/src/features/dashboard/components/dashboard-sidebar.tsx` (lines 31-35)

Client-side guard in the SLP sidebar (DashboardSidebar):
```typescript
useEffect(() => {
  if (user?.role === "caregiver") {
    router.replace("/family");  // Re-routes caregivers if they somehow reach SLP sidebar
  }
}, [user?.role, router]);
```

---

## 3. Protected Routes & Middleware

**File:** `/Users/desha/Springfield-Vibeathon/src/proxy.ts`

Protected routes (require authentication):
```typescript
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/my-tools(.*)",
  "/settings(.*)",
  "/patients(.*)",
  "/family(.*)",
  "/sessions(.*)",
  "/billing(.*)",
  "/speech-coach(.*)",
]);
```

Public API routes (bypass auth):
```typescript
const isPublicApiRoute = createRouteMatcher([
  "/api/tool/(.*)",
  "/family/(.*)/play/manifest.json",
  "/apps/(.*)",
]);
```

Middleware redirects unauthenticated users to `/sign-in`.

---

## 4. Sidebar & Navigation Detection

**File:** `/Users/desha/Springfield-Vibeathon/src/features/dashboard/components/dashboard-sidebar.tsx` (lines 27-29)

Role-based nav items:
```typescript
const role = user?.role;
const isCaregiver = role === "caregiver";
const navItems = isCaregiver ? CAREGIVER_NAV_ITEMS : NAV_ITEMS;
```

Uses:
- **`NAV_ITEMS`:** SLP/therapist navigation (My Tools, Templates, Patients, etc.)
- **`CAREGIVER_NAV_ITEMS`:** Caregiver navigation (Family Workspace, Messages, etc.)

---

## 5. User/Role Fields in Schema

**File:** `/Users/desha/Springfield-Vibeathon/convex/schema.ts` (lines 11-22)

```typescript
users: defineTable({
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  role: v.optional(v.union(v.literal("slp"), v.literal("caregiver"))),
})
  .index("email", ["email"])
  .index("phone", ["phone"]),
```

---

## 6. How Role is Set & Updated

### SLP Role (Default)
**File:** `/Users/desha/Springfield-Vibeathon/convex/auth.ts` (lines 8-25)

Auth callback creates user without explicit role:
```typescript
async createOrUpdateUser(ctx, { existingUserId, profile }) {
  if (existingUserId) {
    return existingUserId;  // Don't overwrite role on re-sign-in
  }
  return ctx.db.insert("users", {
    email: profile.email ?? undefined,
    name: profile.name ?? undefined,
    image: profile.picture ?? undefined,
    // role is undefined; treated as SLP
  });
}
```

### Caregiver Role (Set via Invite Acceptance)
**File:** `/Users/desha/Springfield-Vibeathon/convex/caregivers.ts` (lines 78-136)

`acceptInvite` mutation:
```typescript
await ctx.db.patch(link._id, {
  caregiverUserId: userId,
  inviteStatus: "accepted",
});

// Schedule async role update
await ctx.scheduler.runAfter(0, internal.users.setCaregiverRole, {
  userId,
});
```

Then calls internal mutation:

**File:** `/Users/desha/Springfield-Vibeathon/convex/users.ts` (lines 24-37)

```typescript
export const setCaregiverRole = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any) as { role?: string } | null;
    if (!user) throw new Error(`User not found: ${args.userId}`);
    if (user.role) {
      console.warn(
        `Skipping setCaregiverRole: user ${args.userId} already has role "${user.role}"`
      );
      return;
    }
    await ctx.db.patch(args.userId as any, { role: "caregiver" });
  },
});
```

---

## 7. Default Landing Routes

| Role | Landing Route | Component | Notes |
|------|---------------|-----------|-------|
| **SLP** | `/builder` | SLP's app/tool builder interface | Primary workspace for creating therapy apps |
| **Caregiver** | `/family` | Family dashboard with patient list | Access to assigned children's therapy materials |
| **Unauthenticated** | `/sign-in` | Sign-in page with role selector | Can choose "SLP" or "Caregiver" mode |

---

## 8. Sign-In/Sign-Up Flow

### Sign-Up Page
**File:** `/Users/desha/Springfield-Vibeathon/src/app/sign-up/[[...sign-up]]/page.tsx`

Redirects to sign-in with role param:
```typescript
const role = params.role === "caregiver" ? "caregiver" : "slp";
redirect(`/sign-in?role=${role}`);
```

### Sign-In Page
**File:** `/Users/desha/Springfield-Vibeathon/src/app/sign-in/[[...sign-in]]/page.tsx`

Passes role param to sign-in screen (for UI hints only):
```typescript
const params = await searchParams;
return <SignInScreen role={getAuthRole(params.role)} />;
```

**URL examples:**
- SLP: `/sign-in?role=slp` (or just `/sign-in`)
- Caregiver: `/sign-in?role=caregiver`
- Caregiver from invite: `/invite/{token}` → auto-populates email

---

## 9. Key Auth Guards

**File:** `/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts`

### `assertSLP()`
Protects SLP-only mutations. Allows `null` role (defaults to SLP):
```typescript
export async function assertSLP(ctx: QueryCtx | MutationCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const role = await getAuthRole(ctx);
  if (role !== null && role !== "slp") {
    throw new ConvexError("Only SLPs can perform this action");
  }
  return userId;
}
```

### `assertCaregiverAccess()`
Verifies caregiver has accepted invite for patient:
```typescript
export async function assertCaregiverAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<string> {
  const authIdentifiers = await getCurrentAuthIdentifiers(ctx);
  if (authIdentifiers.length === 0) throw new ConvexError("Not authenticated");

  for (const authIdentifier of authIdentifiers) {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", authIdentifier).eq("patientId", patientId)
      )
      .first();
    if (link?.inviteStatus === "accepted") {
      return link.caregiverUserId ?? authIdentifier;
    }
  }
  throw new ConvexError("Not authorized to access this patient");
}
```

---

## 10. Route Definitions

**File:** `/Users/desha/Springfield-Vibeathon/src/core/routes.ts`

Key routes:
```typescript
DASHBOARD: "/dashboard",        // Redirect logic lives here
BUILDER: "/builder",            // SLP main workspace
FAMILY: "/family",              // Caregiver main workspace
FAMILY_CHILD: (patientId) => `/family/${patientId}`,
FAMILY_PLAY: (patientId) => `/family/${patientId}/play`,
PATIENTS: "/patients",          // SLP-only patient management
SETTINGS: "/settings",
SESSIONS: "/sessions",          // SLP session/booking management
BILLING: "/billing",            // SLP billing
SPEECH_COACH: "/speech-coach",  // SLP tools
```

---

## Summary of Key Files

| File Path | Purpose |
|-----------|---------|
| `/convex/schema.ts` | Defines `users.role` field (optional, "slp" \| "caregiver") |
| `/convex/lib/auth.ts` | `getAuthRole()`, `assertSLP()`, `assertCaregiverAccess()` |
| `/convex/users.ts` | `setCaregiverRole()` internal mutation |
| `/convex/caregivers.ts` | `acceptInvite()` → schedules role assignment |
| `/convex/auth.ts` | Auth callback (role stays undefined for new SLPs) |
| `/src/proxy.ts` | Protected routes & middleware |
| `/src/app/(app)/dashboard/page.tsx` | **MAIN REDIRECT:** `/family` for caregiver, `/builder` for SLP |
| `/src/features/dashboard/components/dashboard-sidebar.tsx` | Sidebar role detection & nav items |
| `/src/core/routes.ts` | Route constants |
| `/src/features/auth/lib/auth-content.ts` | `getAuthRole()` helper for UI |

---

## Authorization Flow Diagram

```
Sign-In/Sign-Up
    ↓
Auth Callback (convex/auth.ts)
    ├→ Existing user: return (keep role)
    └→ New user: insert with role=undefined (defaults to SLP)
    ↓
User navigates to /dashboard
    ↓
DashboardPage (src/app/(app)/dashboard/page.tsx)
    ├→ role === "caregiver" ? redirect("/family")
    └→ role !== "caregiver" ? redirect("/builder")
    ↓
DashboardSidebar (client)
    ├→ Load NAV_ITEMS or CAREGIVER_NAV_ITEMS based on role
    └→ If role changes to "caregiver", route.replace("/family")
    ↓
[SLP: /builder] or [Caregiver: /family]
    ↓
Protected endpoints guarded by assertSLP() or assertCaregiverAccess()

Optional: Caregiver Invite Flow
    ↓
createInvite() → generates invite token
    ↓
acceptInvite(token) → validates & sets inviteStatus="accepted"
    ↓
scheduler.runAfter() → users.setCaregiverRole(userId)
    ↓
role set to "caregiver" in users table
```
