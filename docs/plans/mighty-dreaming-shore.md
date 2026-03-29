# Fix All E2E Issues (22 Findings)

## Context

E2E testing of Bridges uncovered 22 issues across auth, UI, backend, and UX. The most critical is a **dual-role bug** where an SLP visiting a caregiver invite URL gets permanently locked out of all SLP features. This plan organizes fixes into 4 phases by severity.

**Excluded from fixes (no code change needed):**
- Issue 16: Native select overlay — expected browser behavior
- Issue 19: Dialog animation — already consistent at 200ms
- Issue 21: Account deletion — intentionally disabled placeholder
- Issue 4: Builder bundling failures — backend Parcel issue, needs separate investigation

---

## Phase 1: CRITICAL — Auth & Role Safety

### 1A. Guard invite acceptance for SLP users

**File: `src/features/patients/components/invite-landing.tsx`**

- Line 20: Extract `user` from `useUser()` → `const { isSignedIn, isLoaded, user } = useUser();`
- Add derived check:
  ```ts
  const userRole = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isSLP = !userRole || userRole === "slp";
  ```
- Line 27: Add `&& !isSLP` to the useEffect condition
- After the invalid-token block (line 68), add early return for SLP users:
  ```tsx
  if (isLoaded && isSignedIn && isSLP && inviteInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="mx-auto max-w-sm rounded-2xl bg-surface-container p-8 text-center shadow-lg">
          <MaterialIcon icon="info" size="lg" className="text-primary mb-4" />
          <h1 className="mb-2 text-xl font-semibold">This invite is for caregivers</h1>
          <p className="mb-6 text-sm text-on-surface-variant">
            You&apos;re signed in as a therapist. Share this link with {inviteInfo.patientFirstName}&apos;s caregiver instead.
          </p>
          <Button asChild className="w-full"><Link href="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }
  ```

### 1B. Server-side guard in acceptInvite

**File: `convex/caregivers.ts`**

- Line 79, after `const userId = await getAuthUserId(ctx);`:
  ```ts
  const role = await getAuthRole(ctx);
  if (role === "slp" || role === null) {
    // Check if this user owns any patients (null role = default SLP)
    const ownsPatients = await ctx.db
      .query("patients")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
      .first();
    if (ownsPatients) {
      throw new ConvexError("Therapists cannot accept caregiver invites. Please use a separate account.");
    }
  }
  ```
- `getAuthRole` is already importable from `./lib/auth` (line 5 area)

### 1C. Prevent role overwrite in setCaregiverRole

**File: `convex/clerkActions.ts`**

- Before the PATCH at line 15, add a GET to check existing role:
  ```ts
  const userRes = await fetch(
    `https://api.clerk.com/v1/users/${args.userId}`,
    { headers: { Authorization: `Bearer ${clerkSecretKey}` } }
  );
  if (userRes.ok) {
    const userData = await userRes.json();
    const existingRole = userData.public_metadata?.role;
    if (existingRole === "slp") {
      console.warn(`Skipping setCaregiverRole: user ${args.userId} already has SLP role`);
      return;
    }
  }
  ```

### 1D. Add sign-out button to account settings

**File: `src/features/settings/components/account-section.tsx`**

- Add import: `import { useClerk } from "@clerk/nextjs";`
- Inside component: `const { signOut } = useClerk();`
- Before the Danger Zone div (line 16), add:
  ```tsx
  <div className="bg-surface-container-low p-6 rounded-xl">
    <h3 className="font-headline font-bold text-on-surface mb-3">Session</h3>
    <Button
      variant="outline"
      onClick={() => signOut({ redirectUrl: "/" })}
      className="w-full py-3 rounded-lg"
    >
      <MaterialIcon icon="logout" size="sm" className="mr-2" />
      Sign out
    </Button>
  </div>
  ```

---

## Phase 2: HIGH — Backend Safety & Interaction Fixes

### 2A. Add aria-label to patient row

**File: `src/features/patients/components/patient-row.tsx`**

- Line 20, add to `<button>`:
  ```
  aria-label={`Toggle details for ${patient.firstName} ${patient.lastName}`}
  ```

### 2B. Remove no-op Skip button from builder toast

**File: `src/features/builder/components/builder-page.tsx`**

- Lines 203-206: Delete the entire `cancel: { label: "Skip", onClick: () => {} }` block. Sonner auto-dismisses the toast.

### 2C. Fix unbounded collect in seed

**File: `convex/templates/seed.ts`**

- Lines 65-70: Replace the `.collect()` + `.find()` pattern with:
  ```ts
  const existing = await ctx.db
    .query("therapyTemplates")
    .withIndex("by_category", (q) => q.eq("category", template.category))
    .filter((q) => q.eq(q.field("name"), template.name))
    .first();
  if (existing) continue;
  ```

### 2D. Fix getUnreadCount unbounded query

**File: `convex/patientMessages.ts`**

- Line 88: Replace `.take(500)` approach with filtered query:
  ```ts
  const unread = await ctx.db
    .query("patientMessages")
    .withIndex("by_patientId_timestamp", (q) =>
      q.eq("patientId", args.patientId)
    )
    .filter((q) =>
      q.and(
        q.neq(q.field("senderUserId"), userId),
        q.eq(q.field("readAt"), undefined)
      )
    )
    .collect();
  return unread.length;
  ```

---

## Phase 3: MEDIUM — UX Polish

### 3A. Fix bundle recovery race condition

**File: `src/features/builder/components/builder-page.tsx`**

- Lines 100-106: Add `.catch()` to `resumeSession` call:
  ```ts
  resumeSession({...}).catch(() => {
    bundleRecoveredRef.current = false;
  });
  ```

### 3B. Improve form error handling

**File: `src/features/patients/components/patient-intake-form.tsx`**

- Add import: `import { ConvexError } from "convex/values";`
- Lines 104-106: Replace catch block:
  ```ts
  } catch (err) {
    let msg = "Failed to create patient";
    if (err instanceof ConvexError) {
      msg = typeof err.data === "string" ? err.data : msg;
    } else if (err instanceof Error) {
      msg = err.message;
    }
    toast.error(msg);
  }
  ```

### 3C. Use Skeleton component in dashboard

**File: `src/features/dashboard/components/dashboard-view.tsx`**

- Add import: `import { Skeleton } from "@/shared/components/ui/skeleton";`
- Lines 182-187: Replace raw divs:
  ```tsx
  {[0, 1, 2].map((i) => (
    <Skeleton key={i} className="h-64 rounded-2xl" />
  ))}
  ```

### 3D. Add flashcard empty state

**File: `src/features/flashcards/components/flashcard-swiper.tsx`**

- Line 33: Replace `return null` with:
  ```tsx
  if (cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-6">
        <MaterialIcon icon="style" size="lg" className="text-on-surface-variant/40" />
        <p className="text-sm text-on-surface-variant">No cards yet</p>
      </div>
    );
  }
  ```

### 3E. Update mobile preview width

**File: `src/features/builder/components/preview-panel.tsx`**

- Line 80: Change `w-[375px]` to `w-[390px]`

---

## Phase 4: LOW — Minor Polish

### 4A. Persist builder view preferences

**File: `src/features/builder/components/builder-page.tsx`**

- Lines 49-50: Initialize from localStorage with lazy initializer:
  ```ts
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("bridges-viewMode") as ViewMode) || "preview" : "preview"
  );
  const [deviceSize, setDeviceSize] = useState<DeviceSize>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("bridges-deviceSize") as DeviceSize) || "desktop" : "desktop"
  );
  ```
- Add two persist effects:
  ```ts
  useEffect(() => { localStorage.setItem("bridges-viewMode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("bridges-deviceSize", deviceSize); }, [deviceSize]);
  ```

### 4B. Add focus ring to goal links

**File: `src/features/goals/components/goals-list.tsx`**

- Line 51: Add to the Link's `cn()` call:
  ```
  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
  ```

### 4C. Add accessibility to star rating

**File: `src/features/family/components/practice-log-form.tsx`** (star rating container)

- Add `role="radiogroup"` and `aria-label="How did it go? Confidence rating"` to the star button container div

---

## Files Modified (Summary)

| Phase | File | Change |
|-------|------|--------|
| 1 | `src/features/patients/components/invite-landing.tsx` | SLP guard + informative UI |
| 1 | `convex/caregivers.ts` | Server-side SLP check in acceptInvite |
| 1 | `convex/clerkActions.ts` | GET-before-PATCH to prevent role overwrite |
| 1 | `src/features/settings/components/account-section.tsx` | Add sign-out button |
| 2 | `src/features/patients/components/patient-row.tsx` | aria-label |
| 2 | `src/features/builder/components/builder-page.tsx` | Remove no-op cancel |
| 2 | `convex/templates/seed.ts` | Replace unbounded collect |
| 2 | `convex/patientMessages.ts` | Fix getUnreadCount query |
| 3 | `src/features/builder/components/builder-page.tsx` | Fix recovery race |
| 3 | `src/features/patients/components/patient-intake-form.tsx` | ConvexError handling |
| 3 | `src/features/dashboard/components/dashboard-view.tsx` | Use Skeleton component |
| 3 | `src/features/flashcards/components/flashcard-swiper.tsx` | Empty state |
| 3 | `src/features/builder/components/preview-panel.tsx` | Mobile width 390px |
| 4 | `src/features/builder/components/builder-page.tsx` | localStorage persistence |
| 4 | `src/features/goals/components/goals-list.tsx` | Focus ring |
| 4 | `src/features/family/components/practice-log-form.tsx` | Star rating a11y |

---

## Verification

### Phase 1 verification
1. Sign in as SLP → visit `/invite/[token]` → should see "This invite is for caregivers" message, NOT auto-accept
2. Verify SLP can still access `/dashboard`, `/patients`, `/builder` after visiting invite page
3. Verify sign-out button works in Settings > Account
4. Run: `npx convex run caregivers:acceptInvite '{"token": "test"}'` as SLP user → should throw error

### Phase 2 verification
1. Run `npm test` to ensure no regressions
2. Navigate to patients list → verify screen reader announces "Toggle details for [name]"
3. Check builder toast no longer shows Skip button

### Phase 3 verification
1. Navigate to dashboard → verify Skeleton components render during loading
2. Open flashcard swiper with empty deck → verify empty state shows
3. Check builder preview → verify mobile width shows 390px frame

### Phase 4 verification
1. In builder, switch to code view → refresh → verify view persists
2. Tab through goal list → verify focus ring appears
3. Run full test suite: `npm test`
