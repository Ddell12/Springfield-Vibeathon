# Bug Fix Plan: Hydration, Hooks, Generation State, and Upgrade UX

## Context

Four bugs surfaced from browser console logs on 2026-03-31:

1. **Hydration mismatch** on every page using `AppLayout` — React's SSR HTML doesn't match client because `DashboardSidebar` reads `localStorage` in its `useState` initializer.
2. **"Rendered more hooks than during the previous render"** on `/family` — hook count violation when a caregiver signs in and gets redirected through `/dashboard → /family`.
3. **"Cannot start generation from state 'generating'"** — the generate route is not idempotent; retrying a generation on a session that got stuck in `"generating"` throws a state machine error.
4. **Free plan limit shows generic toast** — when `ensureApp` throws the plan-limit error, the builder shows "Could not save — please try again" instead of the upgrade dialog.

---

## Fix 1 — Hydration mismatch in `DashboardSidebar`

**File:** `src/features/dashboard/components/dashboard-sidebar.tsx`

**Root cause:** The `collapsed` state is initialized with a `useState` lazy initializer that reads `localStorage`. On the server `window` is undefined so it returns `false`. On the client it may return `true`. This produces different `className` values and conditional child elements (`<span>Bridges</span>`, "New App" text, Recents section, etc.), triggering React's hydration mismatch.

**Fix:**
1. Change `useState` initializer to always return `false` (matches server).
2. Add a `useEffect(() => { setCollapsed(localStorage.getItem(...) === "true"); }, [])` to sync from localStorage after hydration.

```ts
// Before
const [collapsed, setCollapsed] = useState(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("bridges_sidebar_collapsed") === "true";
});

// After
const [collapsed, setCollapsed] = useState(false);
useEffect(() => {
  setCollapsed(localStorage.getItem("bridges_sidebar_collapsed") === "true");
}, []);
```

This causes a brief uncollapsed flash on first load for users who had the sidebar collapsed, which is acceptable and the correct SSR pattern.

---

## Fix 2 — "Rendered more hooks" on `/family`

**File:** `src/features/family/components/family-landing.tsx`

**Root cause:** The agent exploration found hooks are called before early returns (technically valid), but the deeper issue is that `useQuery` is called with a conditional second argument: `isAuthenticated ? {} : "skip"`. When `isAuthenticated` is `false` on the first render and then becomes `true` on a re-render without a full remount, the Convex query subscription changes internally in a way that conflicts with React's strict hook-count invariant.

**Fix:**
- Wrap the conditional query argument in a stable variable so the skip condition is crystal clear:
  ```ts
  const queryArgs = isAuthenticated ? {} : "skip" as const;
  const links = useQuery(api.caregivers.listByCaregiver, queryArgs);
  ```
- Additionally, add a `mounted` guard to the loading state so the component doesn't render anything during the SSR hydration window (prevents a flicker-induced re-render cycle):
  ```ts
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || links === undefined) return <LoadingSpinner />;
  ```

> **Note during implementation:** If the above doesn't resolve the error, do a broader audit — check if any child component of `FamilyLanding` or `AppLayout` (e.g., `NotificationBell`) uses hooks conditionally based on auth state.

---

## Fix 3 — Generation double-submit state machine error

**File:** `src/app/api/generate/lib/session-lifecycle.ts`

**Root cause:** If a session gets stuck in `"generating"` (e.g., the first generation completed but the `"live"` state transition failed), a second `POST /api/generate` call calls `startGeneration` again. The Convex mutation guards against `generating → generating` and throws. The client receives a non-200-body error mid-stream.

**Fix:** Make `startGeneration` in `session-lifecycle.ts` idempotent — catch the specific state error and treat it as a no-op (the session is already in the desired generating state):

```ts
export async function startGeneration(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions">,
): Promise<void> {
  try {
    await convex.mutation(api.sessions.startGeneration, { sessionId });
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("Cannot start generation from state")
    ) {
      // Session is already generating — treat as idempotent success
      console.warn("[session] startGeneration: session already generating, continuing");
      return;
    }
    throw err;
  }
}
```

---

## Fix 4 — Free plan limit: upgrade dialog instead of generic toast

**File:** `src/features/builder/components/builder-page.tsx`

**Root cause:** The `ensureApp` mutation throws a Convex error with message "Free plan limit reached. Upgrade to Premium for unlimited apps." Both the auto-save path (line ~268) and manual save path (line ~280) catch this as a generic error and show a generic toast.

**Fix:**
1. Add an `upgradeOpen` state to `BuilderPage`:
   ```ts
   const [upgradeOpen, setUpgradeOpen] = useState(false);
   ```
2. Add a helper to detect the plan-limit error:
   ```ts
   function isPlanLimitError(err: unknown) {
     return err instanceof Error && err.message.includes("Free plan limit reached");
   }
   ```
3. In both catch blocks, check for this error and set `upgradeOpen = true` instead of showing the generic toast.
4. Render `<UpgradeConfirmationDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />` (or wrap a hidden trigger) near the component root.

> **Check `UpgradeConfirmationDialog` props:** The current component uses `children` as a `DialogTrigger`. If it doesn't support a controlled `open` prop, add one or wrap it in a programmatic trigger button that auto-clicks.

**Files to verify:**
- `src/features/billing/components/upgrade-confirmation-dialog.tsx` — check if controlled `open` prop exists or needs adding

---

## Critical Files

| File | Change |
|------|--------|
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Move localStorage read from `useState` initializer to `useEffect` |
| `src/features/family/components/family-landing.tsx` | Stabilize conditional query arg; add `mounted` guard |
| `src/app/api/generate/lib/session-lifecycle.ts` | Catch "Cannot start generation from state" error in `startGeneration` |
| `src/features/builder/components/builder-page.tsx` | Detect plan-limit error and show upgrade dialog |
| `src/features/billing/components/upgrade-confirmation-dialog.tsx` | Add controlled `open`/`onOpenChange` props if missing |

---

## Verification

1. **Hydration fix:** Open `/builder` and `/patients` in a browser where the sidebar was previously collapsed. No hydration warning in DevTools console.
2. **Hooks fix:** Sign in as the caregiver test account (`e2e+clerk_test+caregiver@bridges.ai`). Navigate through `/dashboard → /family`. No "Rendered more hooks" error in console.
3. **Generation fix:** Start a generation, let it complete. Immediately click Generate again on the same session. The second generation should proceed without a console error about state.
4. **Upgrade fix:** Exhaust the free-plan app limit (5 apps). Try to save a new app. The upgrade dialog should open, not a generic toast.
