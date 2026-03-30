# Vercel React Best Practices — Performance Audit Plan

## Context

Running the `/vercel-react-best-practices` skill against `src/` surfaced three tiers of issues:
a **critical rendering bug** (setState during render), two **quick-win data-fetching fixes** (redundant query, sequential parallel batch), **16 falsy-render risks** (`&&` conditionals), and **zero dynamic imports** across 9 modal/panel candidates that ship eagerly to every user.

No changes to Convex schema, API contracts, or component APIs are required — all fixes are local to component and route files.

---

## Issues & Fixes (Priority Order)

### 1. CRITICAL — setState During Render (profile-section.tsx)
**Rule:** React invariant — calling `setState` unconditionally during render causes an extra render cycle on every re-render, not just once on mount.

**File:** `src/features/settings/components/profile-section.tsx:20-23`

**Current pattern (bug):**
```tsx
if (isLoaded && user && !nameInitialized) {
  setDisplayName(user.firstName ?? user.fullName ?? "");
  setNameInitialized(true);
}
```

**Fix:** Move into `useEffect` with `[isLoaded, user, nameInitialized]` deps. The `nameInitialized` guard ensures it only fires once, matching current intent.

---

### 2. HIGH — Redundant Convex Query (notification-bell.tsx)
**Rule:** `async-suspense-boundaries` / `server-dedup-props` — `unreadCount` is derived data already available in the `notifications` list.

**File:** `src/features/sessions/components/notification-bell.tsx:50`

**Current pattern:**
```tsx
const notifications = useQuery(api.notifications.list);
const unreadCount = useQuery(api.notifications.unreadCount);  // ← redundant round trip
const count = unreadCount ?? 0;
```

**Fix:** Remove the second `useQuery` call. Derive the count client-side:
```tsx
const count = notifications?.filter(n => !n.read).length ?? 0;
```
This eliminates one live Convex subscription.

---

### 3. HIGH — Sequential Query After Parallel Batch (generate-report/route.ts)
**Rule:** `async-api-routes` — promises should be started early and awaited late.

**File:** `src/app/api/generate-report/route.ts:66-108`

**Current pattern:** `patient`, `goals`, `progressData` are fetched in `Promise.all` (line 66), but `previousReports` is started sequentially on line 108 after validation/mapping logic runs (lines 72–106).

**Fix:** Add `previousReports` to the initial `Promise.all` call. Early-exit guards for `!patient` and `goals.length === 0` still work because those checks happen _after_ `await`, not during the Promise construction.

```ts
const [patient, goals, progressData, previousReports] = await Promise.all([
  convex.query(api.patients.get, { patientId: pid }),
  convex.query(api.goals.listActive, { patientId: pid }),
  convex.query(api.progressData.listByPatient, { patientId: pid, periodStart, periodEnd }),
  convex.query(api.progressReports.list, { patientId: pid }),  // ← moved up
]);
```

Remove the standalone `await` on line 108.

---

### 4. MEDIUM — && Conditional Rendering (16 instances)
**Rule:** `rendering-conditional-render` — `{count && <Foo />}` renders the string `"0"` when `count` is `0`.

All 16 instances use string/object conditions (not number), so this is **not an active bug** — but it's a fragile pattern. Fix by converting to ternaries.

**Files and lines:**
| File | Lines |
|------|-------|
| `src/features/patients/components/patient-intake-form.tsx` | 197, 207, 220, 235 |
| `src/features/patients/components/home-program-form.tsx` | 201 |
| `src/features/settings/components/settings-page.tsx` | 106, 107, 108, 109 |
| `src/features/speech-coach/components/speech-coach-page.tsx` | 159 |
| `src/features/speech-coach/components/standalone-speech-coach-page.tsx` | 143 |
| `src/features/builder/components/chat-panel.tsx` | 41, 169 |
| `src/features/builder/components/builder-page.tsx` | 414, 449 |

**Pattern:** `{expr && <Component />}` → `{expr ? <Component /> : null}`

---

### 5. MEDIUM — Zero Dynamic Imports (9 candidates)
**Rule:** `bundle-dynamic-imports`, `bundle-conditional` — heavy components loaded eagerly when only needed on user interaction or behind feature flags.

Use `next/dynamic` for each. All are client components, so `ssr: false` is appropriate.

**Candidates (ordered by value):**

| Component | File to edit | Size | Trigger |
|-----------|-------------|------|---------|
| `ChatPanel` | `builder/components/builder-page.tsx:29` | 264 lines | `viewMode !== "preview"` |
| `CodePanel` | `builder/components/builder-page.tsx:30` | 145 lines | `viewMode !== "code"` |
| `BookingModal` | `sessions/components/sessions-page.tsx:16` | 143 lines | user click |
| `PinSetupModal` | `family/components/family-dashboard.tsx:20` | 138 lines | first login |
| `DemoToolModal` | `explore/components/demo-tool-grid.tsx:10` | 121 lines | card click |
| `RenameDeckDialog` | `flashcards/components/flashcard-page.tsx:39` | 104 lines | user click |
| `DowngradeWarningDialog` | `billing/components/billing-section.tsx:11` | 94 lines | premium users only |
| `UpgradeConfirmationDialog` | `billing/components/billing-section.tsx:13` | 93 lines | free users only |
| `DeleteConfirmationDialog` (shared) | `my-tools-page.tsx`, `flashcard-page.tsx`, `dashboard-view.tsx` | ~80 lines | user click |

**Pattern for each:**
```tsx
// Replace:
import { BookingModal } from "./booking-modal";
// With:
const BookingModal = dynamic(
  () => import("./booking-modal").then(m => ({ default: m.BookingModal })),
  { ssr: false }
);
```

Builder panels get a loading skeleton since they're large and above-the-fold:
```tsx
const ChatPanel = dynamic(() => import("./chat-panel").then(m => ({ default: m.ChatPanel })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-surface-container-low h-full rounded-2xl" />,
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/settings/components/profile-section.tsx` | setState → useEffect |
| `src/features/sessions/components/notification-bell.tsx` | Remove `unreadCount` query |
| `src/app/api/generate-report/route.ts` | Add `previousReports` to Promise.all |
| `src/features/patients/components/patient-intake-form.tsx` | 4× && → ternary |
| `src/features/patients/components/home-program-form.tsx` | 1× && → ternary |
| `src/features/settings/components/settings-page.tsx` | 4× && → ternary |
| `src/features/speech-coach/components/speech-coach-page.tsx` | 1× && → ternary |
| `src/features/speech-coach/components/standalone-speech-coach-page.tsx` | 1× && → ternary |
| `src/features/builder/components/chat-panel.tsx` | 2× && → ternary |
| `src/features/builder/components/builder-page.tsx` | 2× && → ternary + dynamic ChatPanel/CodePanel |
| `src/features/sessions/components/sessions-page.tsx` | Dynamic BookingModal |
| `src/features/family/components/family-dashboard.tsx` | Dynamic PinSetupModal |
| `src/features/explore/components/demo-tool-grid.tsx` | Dynamic DemoToolModal |
| `src/features/flashcards/components/flashcard-page.tsx` | Dynamic RenameDeckDialog |
| `src/features/billing/components/billing-section.tsx` | Dynamic Downgrade/UpgradeDialogs |
| `src/features/my-tools/components/my-tools-page.tsx` | Dynamic DeleteConfirmationDialog |
| `src/features/dashboard/components/dashboard-view.tsx` | Dynamic DeleteConfirmationDialog |

---

## Verification

```bash
# 1. Type-check — no regressions
npx tsc --noEmit

# 2. Unit tests
npm test

# 3. Dev server smoke test
npm run dev
# Open /settings → profile saves correctly (no extra re-renders)
# Open /notifications → bell shows correct unread count
# Open /builder → chat and code panels load on demand (check Network tab)
# Open /explore → demo modal lazy-loads on first card click

# 4. Bundle analysis (optional)
npx @next/bundle-analyzer
```
