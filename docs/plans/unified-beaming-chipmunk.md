# Fix All Teletherapy Sessions Bugs

## Context

A full QA pass on the teletherapy sessions feature (2026-03-30) surfaced 12 bugs across three subsystems: sidebar/routing, timezone/data-layer, and UI polish. This plan fixes all of them in priority order: critical blockers first (caregiver can't access sessions, sidebar bell unreachable, wrong timestamps), then functional gaps (missing join link, unstyled lobby button), then visual polish (card color, today highlight, borders, copy).

All root causes were traced before fixes were designed (systematic-debugging discipline).

---

## Files to Modify

| File | Bugs Fixed |
|------|-----------|
| `src/features/dashboard/components/dashboard-sidebar.tsx` | #1 caregiver redirect, #2 sidebar overflow, #10 mobile "N" leak |
| `src/features/sessions/lib/time-slots.ts` | #3 timezone (getWeekStart) |
| `convex/appointments.ts` | #3 timezone (getAvailableSlots) |
| `src/features/sessions/components/calendar-view.tsx` | #3 timezone (display), #7 today/past muting, #8 1px border |
| `src/features/sessions/components/appointment-card.tsx` | #3 timezone (display), #6 card color |
| `src/features/sessions/components/appointment-detail-page.tsx` | #4 missing join link |
| `src/features/sessions/components/lobby.tsx` | #5 Join Session button style |
| `src/features/sessions/components/meeting-notes-view.tsx` | #9 empty state copy |

---

## Fix 1 — Caregiver redirect blocks /sessions (Critical)

**Root cause:** `dashboard-sidebar.tsx` lines 24–29. The `useEffect` redirects caregivers away from any path that isn't `/family`, `/settings`, or `/speech-coach`. The `/sessions` and `/sessions/book` routes are missing from the allow-list.

**Fix:** Add `/sessions` to the allowed paths.

```diff
// dashboard-sidebar.tsx line 26
- if (isCaregiver && !pathname.startsWith("/family") && !pathname.startsWith("/settings") && !pathname.startsWith("/speech-coach")) {
+ if (isCaregiver && !pathname.startsWith("/family") && !pathname.startsWith("/settings") && !pathname.startsWith("/speech-coach") && !pathname.startsWith("/sessions")) {
```

---

## Fix 2 — Sidebar overflow: notification bell clipped off-screen (Critical)

**Root cause:** `dashboard-sidebar.tsx` line 44. The `<nav>` uses `flex flex-1 flex-col items-center gap-6` with 9 SLP nav items. Total height: 48px padding + 80px logo + 9×40px items + 8×24px gaps = ~560px of content in a rigid flex column, pushing the bottom section (bell + avatar) to y≈782px — beyond the 720px viewport. No overflow handling.

**Fix:** Add `min-h-0 overflow-y-auto` to the nav so it scrolls within the fixed-height sidebar, keeping bell and avatar always pinned at bottom.

```diff
// dashboard-sidebar.tsx line 44
- <nav className="flex flex-1 flex-col items-center gap-6">
+ <nav className="flex flex-1 flex-col items-center gap-6 min-h-0 overflow-y-auto">
```

Also change `gap-6` → `gap-4` on the nav to give breathing room:

```diff
- <nav className="flex flex-1 flex-col items-center gap-6 min-h-0 overflow-y-auto">
+ <nav className="flex flex-1 flex-col items-center gap-4 min-h-0 overflow-y-auto">
```

---

## Fix 3 — Timezone: slots show wrong time and date (Critical)

**Root cause (two parts):**

**Part A — `getWeekStart` uses UTC methods on a local Date** (`time-slots.ts` lines 1–6). `setUTCHours(0,0,0,0)` zeros out UTC midnight, not local midnight. For a CDT user (UTC-5), "local Sunday midnight" and "UTC Sunday midnight" differ by 5 hours, which cascades into wrong `dayTimestamp` values and wrong dates.

**Part B — `getAvailableSlots` computes `slotTimestamp` relative to UTC midnight** (`appointments.ts` line 69). When `weekStart` is UTC Sunday midnight, the 9:00 slot is UTC 09:00 = CDT 04:00 AM.

**Fix A:** Change `getWeekStart` to use local time methods:

```diff
// time-slots.ts lines 1–6
 export function getWeekStart(date: Date): number {
   const d = new Date(date);
-  d.setUTCHours(0, 0, 0, 0);
-  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
+  d.setHours(0, 0, 0, 0);
+  d.setDate(d.getDate() - d.getDay());
   return d.getTime();
 }
```

**Fix B:** Replace `date.getUTCDay()` with `dayOffset` directly (dayOffset 0=Sun…6=Sat maps 1:1 to JS dayOfWeek when weekStart is local Sunday midnight):

```diff
// appointments.ts line 49–50
   const date = new Date(dayTimestamp);
-  const dayOfWeek = date.getUTCDay();
+  const dayOfWeek = dayOffset; // dayOffset 0–6 = Sun–Sat, same as JS getDay()
```

**Fix C:** `calendar-view.tsx` line 62 — `dayDate.getUTCDay()` used for day name display. Change to local:

```diff
// calendar-view.tsx line 62
-  const dow = dayDate.getUTCDay();
+  const dow = dayDate.getDay();
```

**Fix D:** `formatDateTime` in `time-slots.ts` uses `toLocaleDateString` which is correct — no change needed. `formatDateTime` displays local time, and once timestamps are local-midnight-based, they display correctly.

---

## Fix 4 — Missing shareable join link on appointment detail (Functional)

**Root cause:** `appointment-detail-page.tsx` lines 124–220. The `appointment.joinLink` field is fetched (it exists in schema and is set at creation time as `/sessions/${appointmentId}/call`) but is never rendered.

**Fix:** Add a "Share join link" row in the detail card, below Notes and above Actions. Use a copy-to-clipboard button:

```tsx
// appointment-detail-page.tsx — add after the Notes block (line ~165)
{appointment.joinLink && (
  <div>
    <h2 className="font-headline mb-1 text-sm font-semibold text-on-surface">Join link</h2>
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg bg-surface-container-high px-3 py-2 font-mono text-xs text-on-surface-variant">
        {`${window.location.origin}${appointment.joinLink}`}
      </code>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}${appointment.joinLink}`);
          toast.success("Link copied!");
        }}
      >
        <MaterialIcon icon="content_copy" size="sm" />
      </Button>
    </div>
  </div>
)}
```

---

## Fix 5 — "Join Session" button unstyled (uses LiveKit default) (Functional)

**Root cause:** `lobby.tsx` line 38. `<PreJoin>` renders LiveKit's default `.lk-join-button` which has `background: transparent`. The design system gradient teal is not applied.

**Fix:** Add a `<style>` block inside the Lobby component that overrides the LiveKit CSS for the join button scoped to this component:

```tsx
// lobby.tsx — add inside the outer wrapper div, before the header
<style>{`
  .lk-join-button {
    background: linear-gradient(135deg, #00595c, #0d7377) !important;
    color: white !important;
    border: none !important;
    border-radius: 0.75rem !important;
    font-weight: 600 !important;
    padding: 0.625rem 1.25rem !important;
    width: 100% !important;
    cursor: pointer !important;
    transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1) !important;
  }
  .lk-join-button:hover { opacity: 0.9 !important; }
`}</style>
```

---

## Fix 6 — Appointment card too light (10% opacity) (Design)

**Root cause:** `appointment-card.tsx` line 43: `bg-primary/10 hover:bg-primary/15` is barely visible.

**Fix:** Increase to `bg-primary/20 hover:bg-primary/25` for clearly visible teal tint that still reads as tonal:

```diff
// appointment-card.tsx line 43
- "bg-primary/10 hover:bg-primary/15",
+ "bg-primary/20 hover:bg-primary/25",
```

---

## Fix 7 — No today/past-day visual differentiation on calendar (Design)

**Root cause:** `calendar-view.tsx` — all 7 day columns use identical `bg-surface-container`. No `isToday` or `isPast` logic exists.

**Fix:** Add date comparison inside the `displayDays.map()` and apply conditional classes:

```tsx
// calendar-view.tsx — inside displayDays.map(), after line 62
const todayStart = (() => { const t = new Date(); t.setHours(0,0,0,0); return t.getTime(); })();
const isToday = dayStart === todayStart;
const isPast = dayStart < todayStart;
```

Apply to the column container (line 65–67):

```diff
- className="flex min-h-[200px] flex-col gap-2 rounded-xl bg-surface-container p-3"
+ className={cn(
+   "flex min-h-[200px] flex-col gap-2 rounded-xl p-3",
+   isToday ? "bg-primary/5 ring-1 ring-primary/30" : "bg-surface-container",
+   isPast && "opacity-60",
+ )}
```

Apply to the date header text (make today's date bold teal):

```diff
// date number paragraph (line 73)
- <p className="text-sm font-semibold text-on-surface tabular-nums">
+ <p className={cn("text-sm font-semibold tabular-nums", isToday ? "text-primary" : "text-on-surface")}>
```

---

## Fix 8 — 1px `border-b` inside day header (Design)

**Root cause:** `calendar-view.tsx` line 69: `<div className="border-b border-border pb-2">` creates a visible 1px rule between the day label and the content below it, violating the "no 1px borders for sectioning" rule.

**Fix:** Remove `border-b border-border`, increase padding:

```diff
// calendar-view.tsx line 69
- <div className="border-b border-border pb-2">
+ <div className="pb-3">
```

---

## Fix 9 — Notes empty state copy too technical (Design)

**Root cause:** `meeting-notes-view.tsx` line 52: `"Processing has not started."` is developer jargon.

**Fix:**

```diff
- <span className="font-body text-sm">Processing has not started.</span>
+ <span className="font-body text-sm">Notes will be ready after the session ends.</span>
```

---

## Fix 10 — Mobile "N" avatar leaks outside hidden sidebar (Design)

**Root cause:** `dashboard-sidebar.tsx` lines 70–73. The Clerk `<Show when="signed-in">` component renders its children into a portal outside the `<aside>` DOM, so the `hidden md:flex` on the parent `<aside>` does NOT hide the `UserButton`. It floats at its natural stacking position on mobile.

**Fix:** Wrap the bottom section in a conditional that hides it on mobile (the `MobileTopBar` already provides a UserButton for mobile):

```diff
// dashboard-sidebar.tsx line 69
- <div className="mt-auto flex flex-col items-center gap-6">
+ <div className="mt-auto hidden md:flex flex-col items-center gap-6">
```

---

## Execution Order

1. Fix 1 (caregiver redirect) — unblocks caregiver QA
2. Fix 3 A+B+C (timezone) — foundational, everything downstream depends on correct timestamps
3. Fix 2 (sidebar overflow) — unblocks notification bell
4. Fix 4 (join link) — one new UI element
5. Fix 5 (lobby button style) — CSS override
6. Fix 10 (mobile avatar) — one-liner
7. Fix 6 + 7 + 8 (card color, today highlight, border) — all in calendar-view and appointment-card
8. Fix 9 (empty state copy) — one string change

---

## Verification

After each fix, verify:

1. **Fix 1:** Sign in as caregiver → click Sessions in nav → should land on `/sessions` showing caregiver appointments (not family dashboard)
2. **Fix 2:** On desktop 1280×720 — notification bell must be visible and clickable in sidebar
3. **Fix 3:** Add Thursday availability → slots show "Open · 9:00 AM" → click slot → modal shows "Thursday, April 1 at 9:00 AM" (not 4:00 AM, not April 2)
4. **Fix 4:** Open appointment detail → join link row visible with copy button → click copy → paste confirms correct URL
5. **Fix 5:** Navigate to `/sessions/[id]/call` → "Join Session" button renders with gradient teal background
6. **Fix 6:** Calendar shows appointment card with clearly visible teal tint (not barely-there)
7. **Fix 7:** Today's column has subtle teal ring and tint; past columns dimmed at 60% opacity
8. **Fix 8:** No horizontal line between day name and appointment list in each column
9. **Fix 9:** `/sessions/[id]/notes` before call shows "Notes will be ready after the session ends."
10. **Fix 10:** Mobile 375px — no floating "N" avatar in bottom-left corner

Full E2E smoke: `npm test` (636 unit tests should pass), then manual walkthrough of SLP booking flow and caregiver /sessions access.
