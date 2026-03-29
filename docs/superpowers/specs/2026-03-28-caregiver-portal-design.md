# Subsystem 4: Caregiver Portal & Home Programs — Design Spec

**Date:** 2026-03-28
**Status:** Approved design
**Depends on:** Subsystem 1 (patients, caregiverLinks, auth), Subsystem 3 (goals, progressData), Subsystem 5 (patientMaterials with goalId)
**Master roadmap:** `docs/superpowers/specs/2026-03-28-slp-platform-master-roadmap.md`

---

## Problem

Parents want to help their child's speech therapy progress but don't know how. SLPs assign homework ("practice /r/ sounds 10 times") but have no way to track compliance. Communication is fragmented across texts, emails, and paper handouts. Parents feel disconnected from the therapy process.

## Solution

A simplified caregiver dashboard with Duolingo-style engagement mechanics: today's assigned activities, practice logging, streak tracking, and encouraging feedback. Real-time messaging between SLP and parent. No clinical jargon — every screen answers "What should I do today?" and "Is my child making progress?"

## Design Principle

**"Make the parent feel competent, not clinical."** No medical terminology in the caregiver UI. Warm language, encouraging metrics, streak-based engagement.

---

## Decisions Made During Brainstorming

| Decision | Choice | Rationale |
|---|---|---|
| Routing | `/family/[patientId]` with auto-redirect for single-child | Clean URLs, bookmarkable, handles multi-child naturally |
| Practice logging depth | Quick 3-field form (duration, stars, notes) | Sweet spot: enough signal for SLP, low friction for parent |
| Messaging | Full real-time SLP ↔ Parent threads | Convex reactive queries make this nearly free; key differentiator |
| Celebrations | Inline styled cards, no animation library | Emotional payoff via language/design, not particle effects |
| SLP home program UI | Widget on patient detail page | Follows existing widget pattern, SLP sees everything in one place |
| Caregiver layout | Conditional sidebar in existing `(app)` layout | Avoids duplicate provider wrappers, shared Clerk+Convex chain |

---

## Data Model

### `homePrograms` — SLP-defined practice activities

| Field | Type | Notes |
|---|---|---|
| `patientId` | `v.id("patients")` | |
| `slpUserId` | `v.string()` | Creator |
| `title` | `v.string()` | e.g., "Practice /r/ sounds with dinosaur cards" |
| `instructions` | `v.string()` | Parent-friendly, no jargon |
| `materialId` | `v.optional(v.id("patientMaterials"))` | Linked therapy material |
| `goalId` | `v.optional(v.id("goals"))` | IEP goal this supports |
| `frequency` | `"daily"` \| `"3x-week"` \| `"weekly"` \| `"as-needed"` | |
| `status` | `"active"` \| `"paused"` \| `"completed"` | |
| `startDate` | `v.string()` | ISO date |
| `endDate` | `v.optional(v.string())` | |

**Indexes:** `by_patientId`, `by_patientId_status`

### `practiceLog` — Parent-reported practice sessions

| Field | Type | Notes |
|---|---|---|
| `homeProgramId` | `v.id("homePrograms")` | |
| `patientId` | `v.id("patients")` | Denormalized for streak queries |
| `caregiverUserId` | `v.string()` | |
| `date` | `v.string()` | ISO date (client local date) |
| `duration` | `v.optional(v.number())` | Minutes |
| `confidence` | `v.optional(v.number())` | 1-5 stars ("How did it go?") |
| `notes` | `v.optional(v.string())` | |
| `timestamp` | `v.number()` | |

**Indexes:** `by_homeProgramId`, `by_patientId_date`

### `patientMessages` — SLP ↔ Parent messaging (per child)

| Field | Type | Notes |
|---|---|---|
| `patientId` | `v.id("patients")` | Thread scoped to a child |
| `senderUserId` | `v.string()` | |
| `senderRole` | `"slp"` \| `"caregiver"` | |
| `content` | `v.string()` | |
| `timestamp` | `v.number()` | |
| `readAt` | `v.optional(v.number())` | |

**Indexes:** `by_patientId_timestamp`

Note: This is a new table, separate from the existing `messages` table (which stores AI chat history for the builder).

### Activity Log Expansion

Three new action types added to the `activityLog.action` union:
- `"practice-logged"` — Parent completed a practice session
- `"message-sent"` — SLP or parent sent a message
- `"home-program-assigned"` — SLP created a home program

---

## Routing & Layout

### Caregiver Routes (inside `(app)` group)

| Route | Purpose |
|---|---|
| `/family` | Landing — lists linked children, auto-redirects if only one |
| `/family/[patientId]` | Main dashboard for a specific child |
| `/family/[patientId]/messages` | Message thread with the child's SLP |

All under `src/app/(app)/family/`. The `(app)` layout wraps everything with Clerk + Convex providers.

### Conditional Sidebar

The existing `dashboard-sidebar.tsx` gets a role branch:

- **SLP view (default/current):** Unchanged — Patients, Templates, My Tools, Builder, Settings
- **Caregiver view:** "Home" (→ `/family`), "Messages" (→ `/family/[patientId]/messages`), Settings

Role is read from Clerk's `useUser().publicMetadata.role`. If `"caregiver"`, render the caregiver nav with warm icons (House, MessageCircle, Settings from Lucide). Otherwise, render existing SLP nav.

### Route Protection

- `/family/*` routes: every Convex query uses `assertCaregiverAccess(ctx, patientId)` or the new `assertPatientAccess` dual-role helper.
- **Redirect convenience:** Client-side `useEffect` + `router.replace()` in the sidebar when caregiver navigates to SLP-only paths (e.g., `/patients` → `/family`). Not middleware-level.
- **SLPs on `/family`:** Not blocked — queries return empty data (no `caregiverLinks` for SLP users).

### Practice Activity View

When a parent taps "Start Practice" on an activity card:

1. **Material has a `sessionId`** → Load the session's bundled HTML in the sandboxed iframe (same preview mechanism the builder uses)
2. **Material has an `appId`** → Navigate to `/tool/[shareSlug]` (existing published app viewer)

After the parent closes/finishes, they see the practice log form.

---

## Convex Backend Functions

### `convex/homePrograms.ts`

| Function | Type | Args | Auth | Notes |
|---|---|---|---|---|
| `create` | mutation | patientId, title, instructions, materialId?, goalId?, frequency, startDate, endDate? | `assertSLP` + ownership | Creates program + `home-program-assigned` activity log |
| `update` | mutation | id, partial fields | `assertSLP` + ownership | Edit title, instructions, frequency, status |
| `listByPatient` | query | patientId | `assertPatientAccess` | Both SLP and caregiver |
| `getActiveByPatient` | query | patientId | `assertPatientAccess` | Dashboard "Today's Activities" — filters `status === "active"`. Both SLP (for widget) and caregiver (for dashboard) use this. |

### `convex/practiceLog.ts`

| Function | Type | Args | Auth | Notes |
|---|---|---|---|---|
| `log` | mutation | homeProgramId, date, duration?, confidence?, notes? | `assertCaregiverAccess` (via patient lookup) | Derives `patientId` from `homeProgramId` lookup — never accept `patientId` from client. Creates log + `practice-logged` activity log |
| `listByProgram` | query | homeProgramId | `assertPatientAccess` | SLP sees engagement per program |
| `listByPatientDateRange` | query | patientId, startDate, endDate | `assertPatientAccess` | Streak and weekly summary |
| `getStreakData` | query | patientId | `assertPatientAccess` | Returns `{ currentStreak: number, weeklyPracticeDays: number, weeklyTarget: number }` |

### `convex/patientMessages.ts`

| Function | Type | Args | Auth | Notes |
|---|---|---|---|---|
| `send` | mutation | patientId, content | `assertPatientAccess` | Auto-sets `senderRole` from auth. Logs `message-sent` |
| `list` | query | patientId, limit? (default 50) | `assertPatientAccess` | Paginated by timestamp desc. Convex reactive = real-time |
| `markRead` | mutation | messageId | `assertPatientAccess` + verify caller is not the sender | Sets `readAt` timestamp |
| `getUnreadCount` | query | patientId | `assertPatientAccess` | Count where `readAt` undefined and sender isn't current user |

### New Auth Helper — `assertPatientAccess`

To be added to `convex/lib/auth.ts`:

```ts
async function assertPatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<{ userId: string; role: "slp" | "caregiver" }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const patient = await ctx.db.get(patientId);
  if (!patient) throw new ConvexError("Patient not found");
  if (patient.slpUserId === userId) return { userId, role: "slp" };
  const link = await ctx.db.query("caregiverLinks")
    .withIndex("by_caregiverUserId", q => q.eq("caregiverUserId", userId))
    .filter(q => q.eq(q.field("patientId"), patientId))
    .filter(q => q.eq(q.field("inviteStatus"), "accepted"))
    .first();
  if (link) return { userId, role: "caregiver" };
  throw new ConvexError("Not authorized");
}
```

---

## Frontend Components

### Feature Slice: `src/features/family/`

```
src/features/family/
  components/
    family-landing.tsx           — Child picker (multi-child) or auto-redirect (single)
    family-dashboard.tsx         — Main dashboard: streak, activities, progress, messages preview
    streak-tracker.tsx           — Flame icon + count + weekly dot grid
    today-activities.tsx         — List of active home programs due today
    activity-card.tsx            — Title, instructions, "Start Practice" / "Log Practice" CTAs
    practice-log-form.tsx        — Dialog: duration slider, 1-5 star rating, optional notes
    weekly-progress.tsx          — "Practiced 4/7 days" bar + best session highlight
    celebration-card.tsx         — Dismissible congratulatory card for streaks/milestones
    message-thread.tsx           — Real-time message list + compose input
    message-bubble.tsx           — Single message with role, timestamp, read indicator
  hooks/
    use-family-data.ts           — Bundles queries: active programs, streak, unread count
    use-practice-log.ts          — Mutation hook for logging practice
    use-messages.ts              — Query + mutation hooks for messaging
  lib/
    streak-utils.ts              — Calculate streak from practiceLog date array
    encouragement.ts             — Message templates keyed by streak count and confidence
    frequency-utils.ts           — "Is this activity due today?" logic
```

### SLP-Side Additions (existing feature slices)

**`src/features/patients/components/home-programs-widget.tsx`**
- Lists active home programs with parent engagement summary
- "Assign Home Program" button opens dialog
- Engagement alert if no practice logged in 5+ days

**`src/features/patients/components/home-program-form.tsx`**
- Dialog: title, instructions, link material (dropdown), link goal (dropdown), frequency, dates

**`src/features/patients/components/engagement-summary.tsx`**
- Inline card: "Parent practiced 4/7 days, avg confidence 4.2/5"

### Conditional Sidebar Changes

**`src/features/dashboard/components/dashboard-sidebar.tsx`**
- Import `useUser` from `@clerk/nextjs`
- If `publicMetadata.role === "caregiver"`: render Home, Messages, Settings with warm Lucide icons
- Else: render existing SLP nav unchanged

---

## Key Interactions & Edge Cases

### Streak Calculation

1. Query `practiceLog` by `by_patientId_date`, scanning backwards from today
2. Group by date (any log entry = 1 practice day)
3. Count consecutive days backwards from today (or yesterday if today has no entry yet)
4. Weekly count = distinct practice dates in current Mon-Sun week

**Edge cases:**
- Multiple activities logged same day → counts as 1 practice day
- Timezone → Use `date` string field (ISO date, no time), set by client's local date
- Streak reset → Counter drops silently, no penalty messaging

### Practice Activity "Due Today" Logic

| Frequency | Due When |
|---|---|
| `daily` | Always |
| `3x-week` | Fewer than 3 practice logs this week for this program |
| `weekly` | Zero practice logs this week for this program |
| `as-needed` | Always shown, listed after scheduled items |

### Message Read Receipts

- Caregiver opens messages page → `markRead` fires for all unread SLP messages
- SLP opens message preview on widget → `markRead` fires for all unread caregiver messages
- `getUnreadCount` drives badge on sidebar nav (caregiver) and widget header (SLP)

### Celebration Card Triggers

Computed client-side from query data — no server state:

| Trigger | Message |
|---|---|
| Streak hits 3 | "3-day streak! You're building a great routine." |
| Streak hits 7 | "One full week! [Child] is lucky to have you." |
| Weekly target met | "All activities complete this week!" |
| Goal marked "met" | "[Child] met their /r/ sounds goal! Your practice helped." |

Cards dismissible via `localStorage` key. No server persistence needed.

### Error Handling

| Scenario | Behavior |
|---|---|
| No linked children | Friendly empty state: "No children linked yet" with invite explanation |
| Link revoked | Queries return empty, "Access removed — contact your therapist" |
| Practice log fails | Toast error with retry, form stays open |
| Message send fails | Optimistic UI reverts, toast error |

---

## Testing Strategy

### Convex Backend Tests (`convex-test`)

| Test | Verifies |
|---|---|
| `homePrograms.create` | SLP auth, ownership, fields persisted, activity log created |
| `homePrograms.listByPatient` | SLP sees own patient, caregiver sees linked patient, stranger denied |
| `practiceLog.log` | Caregiver auth, log created, activity log created |
| `practiceLog.getStreakData` | Consecutive days correct, gap resets streak, multi-log same day = 1 |
| `patientMessages.send` | Both roles can send, `senderRole` auto-set, activity log created |
| `patientMessages.markRead` | Only recipient can mark, sets timestamp |
| `assertPatientAccess` | SLP via ownership, caregiver via link, revoked fails, stranger fails |

### Component Tests (Vitest + RTL)

| Component | Key Assertions |
|---|---|
| `streak-tracker` | Correct count, flame icon at 3+, "Start your streak!" at 0 |
| `practice-log-form` | Slider updates, stars clickable, submit calls mutation with args |
| `activity-card` | Title/instructions shown, "Start Practice" vs "Logged" states |
| `celebration-card` | Correct message per trigger, dismiss persists to localStorage |
| `message-thread` | Order, read indicator, compose sends on enter |
| `dashboard-sidebar` | Caregiver role shows Home/Messages/Settings, hides SLP nav |

### E2E (Stretch Goal)

Playwright smoke test:
1. SLP creates home program for patient
2. Caregiver signs in (Clerk email code flow), lands on `/family`
3. Sees assigned activity, taps "Log Practice"
4. Fills duration + stars, submits
5. Streak updates to 1
6. SLP's patient detail shows engagement summary

---

## Integration Points

| Subsystem | Integration |
|---|---|
| 1 (Patients) | `caregiverLinks` for auth, patient profile for dashboard header, `patientMaterials` for activity links |
| 2 (Session Notes) | `parentFeedback` field auto-populated from recent `practiceLog` entries (future enhancement) |
| 3 (Goals) | `goalId` on `homePrograms` links practice to IEP goals; goal "met" triggers celebration card |
| 5 (Materials) | Personalized materials assigned via `patientMaterials` show up as practice activities |

---

## File Summary

### New Files (~23)

**Convex (3 files):**
- `convex/homePrograms.ts`
- `convex/practiceLog.ts`
- `convex/patientMessages.ts`

**Feature slice (16 files):**
- `src/features/family/components/` — 10 components
- `src/features/family/hooks/` — 3 hooks
- `src/features/family/lib/` — 3 utility files

**SLP-side additions (3 files):**
- `src/features/patients/components/home-programs-widget.tsx`
- `src/features/patients/components/home-program-form.tsx`
- `src/features/patients/components/engagement-summary.tsx`

**Routes (4 files):**
- `src/app/(app)/family/page.tsx`
- `src/app/(app)/family/[patientId]/page.tsx`
- `src/app/(app)/family/[patientId]/messages/page.tsx`
- `src/app/(app)/family/layout.tsx` (optional — can inherit `(app)` layout directly)

### Modified Files (~4)

- `convex/schema.ts` — Add 3 new tables + 3 activity log action types + compound index `by_caregiverUserId_patientId` on `caregiverLinks` (optimizes `assertPatientAccess` to direct lookup instead of scan+filter)
- `convex/lib/auth.ts` — Add `assertPatientAccess` helper
- `src/features/dashboard/components/dashboard-sidebar.tsx` — Conditional caregiver nav
- `src/features/patients/components/patient-detail-page.tsx` — Add Home Programs widget
