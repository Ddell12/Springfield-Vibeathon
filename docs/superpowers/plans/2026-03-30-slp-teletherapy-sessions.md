# SLP Teletherapy Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete teletherapy sessions feature — scheduling, LiveKit video calls, AI-powered transcription/SOAP notes, Resend email notifications, and interactive split-screen content sharing.

**Architecture:** Convex-driven scheduling with computed slot queries, LiveKit Cloud for WebRTC video + data channels, ElevenLabs Scribe v2 for post-call transcription, Claude for SOAP note generation, `@convex-dev/resend` for email notifications. All state flows through Convex with reactive subscriptions.

**Tech Stack:** LiveKit Cloud (`livekit-server-sdk`, `@livekit/components-react`, `livekit-client`), `@convex-dev/resend`, `@react-email/components`, `@react-email/render`, ElevenLabs Scribe v2, Claude (`@anthropic-ai/sdk`)

**Spec:** `docs/superpowers/specs/2026-03-30-slp-teletherapy-sessions-design.md`

---

## File Map

### Convex Backend
| File | Responsibility |
|------|---------------|
| `convex/schema.ts` | Add `availability`, `appointments`, `meetingRecords`, `notifications` tables; extend `sessionNotes` |
| `convex/convex.config.ts` | Register `@convex-dev/resend` component |
| `convex/availability.ts` | CRUD queries/mutations for SLP availability slots |
| `convex/appointments.ts` | Booking, cancellation, status transitions, slot computation query |
| `convex/meetingRecords.ts` | Post-call record queries and status updates |
| `convex/sessionActions.ts` | `"use node"` actions: fetchAudio, transcribeAudio, generateNotes pipeline |
| `convex/notifications.ts` | `"use node"` actions: email sending via Resend; mutations: in-app notification CRUD |

### Next.js API Routes
| File | Responsibility |
|------|---------------|
| `src/app/api/livekit/token/route.ts` | LiveKit JWT token generation with Clerk auth |

### Feature Slice: `src/features/sessions/`
| File | Responsibility |
|------|---------------|
| `types.ts` | Shared TypeScript types for the feature |
| `lib/time-slots.ts` | Slot generation, conflict detection, timezone helpers |
| `lib/data-channel-codec.ts` | Uint8Array ↔ JSON serialization for LiveKit data channels |
| `lib/livekit-config.ts` | LiveKit client configuration constants |
| `hooks/use-calendar.ts` | Calendar navigation state (week/day, current date) |
| `hooks/use-availability.ts` | CRUD hooks for availability slots |
| `hooks/use-appointments.ts` | Booking, cancellation, appointment queries |
| `hooks/use-call-room.ts` | LiveKit connection, token fetch, call lifecycle |
| `hooks/use-interactive-sync.ts` | Data channel state sync for split-screen content |
| `components/calendar-view.tsx` | Weekly/daily calendar with availability + appointments |
| `components/availability-editor.tsx` | Set recurring weekly hours |
| `components/appointment-card.tsx` | Single appointment display |
| `components/booking-modal.tsx` | SLP: pick patient + time slot |
| `components/caregiver-booking.tsx` | Caregiver: self-book from available slots |
| `components/call-room.tsx` | LiveKit video call container |
| `components/call-controls.tsx` | Mute, camera, screen share, end call |
| `components/participant-panel.tsx` | Video tiles for participants |
| `components/interactive-panel.tsx` | Split-screen: flashcards/games/images |
| `components/content-picker.tsx` | SLP-only: select content to share |
| `components/content-renderer.tsx` | Renders synced content on both sides |
| `components/lobby.tsx` | Pre-join screen (camera/mic check) |
| `components/meeting-notes-view.tsx` | Post-call transcript + AI summary |
| `components/notification-bell.tsx` | Header notification bell with dropdown |
| `emails/appointment-booked.tsx` | React Email template |
| `emails/appointment-cancelled.tsx` | React Email template |
| `emails/session-reminder.tsx` | React Email template |
| `emails/notes-ready.tsx` | React Email template |

### Pages (thin wrappers)
| File | Responsibility |
|------|---------------|
| `src/app/(app)/sessions/page.tsx` | Calendar view |
| `src/app/(app)/sessions/[id]/page.tsx` | Appointment detail |
| `src/app/(app)/sessions/[id]/call/page.tsx` | Video call room |
| `src/app/(app)/sessions/[id]/notes/page.tsx` | Post-call notes |
| `src/app/(app)/sessions/book/[slpId]/page.tsx` | Caregiver booking |

### Shared Updates
| File | Responsibility |
|------|---------------|
| `src/core/routes.ts` | Add SESSIONS routes |
| `src/shared/lib/navigation.ts` | Add "Sessions" to SLP and caregiver nav |

---

## Task 1: Install Dependencies & Configure Environment

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (manual — not committed)

- [ ] **Step 1: Install LiveKit packages**

```bash
npm install livekit-server-sdk @livekit/components-react @livekit/components-styles livekit-client
```

- [ ] **Step 2: Install Resend + React Email packages**

```bash
npm install @convex-dev/resend @react-email/components @react-email/render resend
```

- [ ] **Step 3: Add environment variables to `.env.local`**

Add these lines (fill in from LiveKit Cloud dashboard):

```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-app.livekit.cloud
```

- [ ] **Step 4: Add Convex environment variable**

```bash
npx convex env set RESEND_API_KEY your_resend_api_key
```

- [ ] **Step 5: Verify installations**

```bash
npm ls livekit-server-sdk @livekit/components-react livekit-client @convex-dev/resend @react-email/components
```

Expected: All packages listed without errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add LiveKit, Resend, and React Email dependencies"
```

---

## Task 2: Schema — Add New Tables

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/convex.config.ts`

- [ ] **Step 1: Add Resend component to convex.config.ts**

In `convex/convex.config.ts`, add the import and `app.use()` call. The file currently has `rag`, `rateLimiter`, and `stripe`. Add `resend` after `stripe`:

```typescript
import rag from "@convex-dev/rag/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(rag);
app.use(rateLimiter);
app.use(resend);
app.use(stripe);

export default app;
```

- [ ] **Step 2: Add `availability` table to schema.ts**

Add this table definition inside the `defineSchema({})` call in `convex/schema.ts`, after the existing tables:

```typescript
  availability: defineTable({
    slpId: v.string(),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isRecurring: v.boolean(),
    effectiveDate: v.optional(v.string()),
    timezone: v.string(),
  })
    .index("by_slpId", ["slpId"])
    .index("by_slpId_dayOfWeek", ["slpId", "dayOfWeek"]),
```

- [ ] **Step 3: Add `appointments` table to schema.ts**

```typescript
  appointments: defineTable({
    slpId: v.string(),
    patientId: v.id("patients"),
    caregiverId: v.optional(v.string()),
    scheduledAt: v.number(),
    duration: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no-show"),
    ),
    cancelledBy: v.optional(v.string()),
    livekitRoom: v.optional(v.string()),
    joinLink: v.string(),
    notes: v.optional(v.string()),
    timezone: v.optional(v.string()),
  })
    .index("by_slpId", ["slpId"])
    .index("by_patientId", ["patientId"])
    .index("by_scheduledAt", ["scheduledAt"])
    .index("by_status", ["status"])
    .index("by_slpId_scheduledAt", ["slpId", "scheduledAt"]),
```

- [ ] **Step 4: Add `meetingRecords` table to schema.ts**

```typescript
  meetingRecords: defineTable({
    appointmentId: v.id("appointments"),
    slpId: v.string(),
    patientId: v.id("patients"),
    duration: v.number(),
    audioFileId: v.optional(v.id("_storage")),
    transcript: v.optional(v.string()),
    transcriptFileId: v.optional(v.id("_storage")),
    aiSummary: v.optional(v.string()),
    soapNoteId: v.optional(v.id("sessionNotes")),
    interactionLog: v.optional(v.string()),
    status: v.union(
      v.literal("processing"),
      v.literal("transcribing"),
      v.literal("summarizing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
  })
    .index("by_appointmentId", ["appointmentId"])
    .index("by_slpId", ["slpId"])
    .index("by_patientId", ["patientId"]),
```

- [ ] **Step 5: Add `notifications` table to schema.ts**

```typescript
  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("session-booked"),
      v.literal("session-cancelled"),
      v.literal("session-reminder"),
      v.literal("session-starting"),
      v.literal("notes-ready"),
    ),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
    appointmentId: v.optional(v.id("appointments")),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),
```

- [ ] **Step 6: Extend `sessionNotes` table**

Add `meetingRecordId` to the existing `sessionNotes` table definition:

```typescript
    meetingRecordId: v.optional(v.id("meetingRecords")),
```

Add it after the `signedAt` field.

- [ ] **Step 7: Verify schema deploys**

```bash
npx convex dev --once
```

Expected: Schema deployed without errors.

- [ ] **Step 8: Commit**

```bash
git add convex/schema.ts convex/convex.config.ts
git commit -m "feat(schema): add availability, appointments, meetingRecords, notifications tables"
```

---

## Task 3: Routes & Navigation

**Files:**
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`

- [ ] **Step 1: Add session routes to routes.ts**

In `src/core/routes.ts`, add these entries to the `ROUTES` object:

```typescript
  SESSIONS: "/sessions",
  SESSION_DETAIL: (id: string) => `/sessions/${id}` as const,
  SESSION_CALL: (id: string) => `/sessions/${id}/call` as const,
  SESSION_NOTES: (id: string) => `/sessions/${id}/notes` as const,
  SESSION_BOOK: (slpId: string) => `/sessions/book/${slpId}` as const,
```

Add them after the `SPEECH_COACH` entry.

- [ ] **Step 2: Add "Sessions" to SLP navigation**

In `src/shared/lib/navigation.ts`, add this entry to `NAV_ITEMS` after the `Patients` entry (index 1):

```typescript
  { icon: "video_call", label: "Sessions", href: ROUTES.SESSIONS },
```

The full array should now be:
```typescript
export const NAV_ITEMS = [
  { icon: "home", label: "Home", href: ROUTES.DASHBOARD },
  { icon: "group", label: "Patients", href: ROUTES.PATIENTS },
  { icon: "video_call", label: "Sessions", href: ROUTES.SESSIONS },
  { icon: "auto_awesome", label: "Builder", href: ROUTES.BUILDER },
  { icon: "collections_bookmark", label: "Flashcards", href: ROUTES.FLASHCARDS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "grid_view", label: "Templates", href: ROUTES.TEMPLATES },
  { icon: "folder_open", label: "My Apps", href: ROUTES.MY_TOOLS },
  { icon: "settings", label: "Settings", href: ROUTES.SETTINGS },
] as const;
```

- [ ] **Step 3: Add "Sessions" to caregiver navigation**

In `CAREGIVER_NAV_ITEMS`, add after `Home`:

```typescript
export const CAREGIVER_NAV_ITEMS = [
  { icon: "home", label: "Home", href: ROUTES.FAMILY },
  { icon: "video_call", label: "Sessions", href: ROUTES.SESSIONS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "settings", label: "Settings", href: ROUTES.SETTINGS },
] as const;
```

- [ ] **Step 4: Add isNavActive condition**

Add this line inside the `isNavActive` function:

```typescript
  if (href === "/sessions") return pathname.startsWith("/sessions");
```

Add it after the `if (href === "/patients")` line.

- [ ] **Step 5: Commit**

```bash
git add src/core/routes.ts src/shared/lib/navigation.ts
git commit -m "feat(nav): add Sessions route and navigation entries for SLP and caregiver"
```

---

## Task 4: Convex Backend — Availability CRUD

**Files:**
- Create: `convex/availability.ts`

- [ ] **Step 1: Create availability.ts with list query**

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertSLP, getAuthUserId } from "./lib/auth";

export const list = query({
  args: {
    slpId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const targetSlpId = args.slpId ?? userId;

    return await ctx.db
      .query("availability")
      .withIndex("by_slpId", (q) => q.eq("slpId", targetSlpId))
      .collect();
  },
});
```

- [ ] **Step 2: Add create mutation**

```typescript
export const create = mutation({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isRecurring: v.boolean(),
    effectiveDate: v.optional(v.string()),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);

    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("dayOfWeek must be 0-6");
    }
    if (args.startTime >= args.endTime) {
      throw new Error("startTime must be before endTime");
    }

    return await ctx.db.insert("availability", {
      slpId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      isRecurring: args.isRecurring,
      effectiveDate: args.effectiveDate,
      timezone: args.timezone,
    });
  },
});
```

- [ ] **Step 3: Add remove mutation**

```typescript
export const remove = mutation({
  args: {
    availabilityId: v.id("availability"),
  },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);
    const slot = await ctx.db.get(args.availabilityId);
    if (!slot) throw new Error("Availability slot not found");
    if (slot.slpId !== slpId) throw new Error("Not authorized");

    await ctx.db.delete(args.availabilityId);
  },
});
```

- [ ] **Step 4: Verify it deploys**

```bash
npx convex dev --once
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add convex/availability.ts
git commit -m "feat(convex): add availability CRUD — list, create, remove"
```

---

## Task 5: Convex Backend — Appointments & Slot Computation

**Files:**
- Create: `convex/appointments.ts`

- [ ] **Step 1: Create appointments.ts with computed slots query**

```typescript
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { assertSLP, getAuthUserId, assertPatientAccess } from "./lib/auth";

export const getAvailableSlots = query({
  args: {
    slpId: v.string(),
    weekStart: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const weekEnd = args.weekStart + 7 * 24 * 60 * 60 * 1000;

    const availability = await ctx.db
      .query("availability")
      .withIndex("by_slpId", (q) => q.eq("slpId", args.slpId))
      .collect();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) =>
        q.eq("slpId", args.slpId).gte("scheduledAt", args.weekStart)
      )
      .collect();

    const bookedTimes = new Set(
      appointments
        .filter((a) => a.status !== "cancelled")
        .filter((a) => a.scheduledAt < weekEnd)
        .map((a) => a.scheduledAt)
    );

    const slots: Array<{ timestamp: number; startTime: string; dayOfWeek: number }> = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayTimestamp = args.weekStart + dayOffset * 24 * 60 * 60 * 1000;
      const date = new Date(dayTimestamp);
      const dayOfWeek = date.getUTCDay();

      const daySlots = availability.filter((a) => {
        if (a.dayOfWeek !== dayOfWeek) return false;
        if (a.isRecurring) return true;
        if (a.effectiveDate) {
          const dateStr = date.toISOString().split("T")[0];
          return a.effectiveDate === dateStr;
        }
        return false;
      });

      for (const slot of daySlots) {
        const [startHour, startMin] = slot.startTime.split(":").map(Number);
        const [endHour, endMin] = slot.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        for (let m = startMinutes; m < endMinutes; m += 30) {
          const slotTimestamp = dayTimestamp + m * 60 * 1000;
          if (!bookedTimes.has(slotTimestamp) && slotTimestamp > Date.now()) {
            const hour = Math.floor(m / 60);
            const min = m % 60;
            slots.push({
              timestamp: slotTimestamp,
              startTime: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
              dayOfWeek,
            });
          }
        }
      }
    }

    return slots;
  },
});
```

- [ ] **Step 2: Add list queries**

```typescript
export const listBySlp = query({
  args: {
    weekStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let q = ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) => q.eq("slpId", userId));

    if (args.weekStart) {
      q = ctx.db
        .query("appointments")
        .withIndex("by_slpId_scheduledAt", (q) =>
          q.eq("slpId", userId).gte("scheduledAt", args.weekStart!)
        );
    }

    const appointments = await q.take(200);

    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await ctx.db.get(apt.patientId);
        return { ...apt, patient };
      })
    );

    return enriched;
  },
});

export const listByPatient = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("appointments")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const get = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    const patient = await ctx.db.get(appointment.patientId);
    return { ...appointment, patient };
  },
});
```

- [ ] **Step 3: Add create mutation**

```typescript
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    scheduledAt: v.number(),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpId) throw new ConvexError("Not your patient");

    if (args.scheduledAt < Date.now()) {
      throw new ConvexError("Cannot schedule in the past");
    }

    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) =>
        q.eq("slpId", slpId).eq("scheduledAt", args.scheduledAt)
      )
      .first();

    if (existing && existing.status !== "cancelled") {
      throw new ConvexError("Time slot already booked");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      slpId,
      patientId: args.patientId,
      scheduledAt: args.scheduledAt,
      duration: args.duration ?? 30,
      status: "scheduled",
      joinLink: "",
      notes: args.notes,
      timezone: args.timezone,
    });

    await ctx.db.patch(appointmentId, {
      joinLink: `/sessions/${appointmentId}/call`,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.onAppointmentBooked, {
      appointmentId,
    });

    return appointmentId;
  },
});
```

- [ ] **Step 4: Add caregiver booking mutation**

```typescript
export const bookAsCaregiver = mutation({
  args: {
    slpId: v.string(),
    patientId: v.id("patients"),
    scheduledAt: v.number(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();

    if (!link || link.inviteStatus !== "accepted") {
      throw new ConvexError("Not authorized to book for this patient");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== args.slpId) {
      throw new ConvexError("Patient-SLP mismatch");
    }

    if (args.scheduledAt < Date.now()) {
      throw new ConvexError("Cannot schedule in the past");
    }

    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) =>
        q.eq("slpId", args.slpId).eq("scheduledAt", args.scheduledAt)
      )
      .first();

    if (existing && existing.status !== "cancelled") {
      throw new ConvexError("Time slot already booked");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      slpId: args.slpId,
      patientId: args.patientId,
      caregiverId: userId,
      scheduledAt: args.scheduledAt,
      duration: 30,
      status: "scheduled",
      joinLink: "",
      timezone: args.timezone,
    });

    await ctx.db.patch(appointmentId, {
      joinLink: `/sessions/${appointmentId}/call`,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.onAppointmentBooked, {
      appointmentId,
    });

    return appointmentId;
  },
});
```

- [ ] **Step 5: Add cancel and status mutations**

```typescript
export const cancel = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");

    if (appointment.status !== "scheduled") {
      throw new ConvexError("Can only cancel scheduled appointments");
    }

    const isSLP = appointment.slpId === userId;
    const isCaregiver = appointment.caregiverId === userId;
    if (!isSLP && !isCaregiver) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId_patientId", (q) =>
          q.eq("caregiverUserId", userId).eq("patientId", appointment.patientId)
        )
        .first();
      if (!link || link.inviteStatus !== "accepted") {
        throw new ConvexError("Not authorized");
      }
    }

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      cancelledBy: userId,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.onAppointmentCancelled, {
      appointmentId: args.appointmentId,
      cancelledBy: userId,
    });
  },
});

export const startSession = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");
    if (appointment.slpId !== slpId) throw new ConvexError("Not your appointment");
    if (appointment.status !== "scheduled") throw new ConvexError("Not in scheduled status");

    await ctx.db.patch(args.appointmentId, {
      status: "in-progress",
      livekitRoom: `session-${args.appointmentId}`,
    });
  },
});

export const completeSession = mutation({
  args: {
    appointmentId: v.id("appointments"),
    durationSeconds: v.number(),
    interactionLog: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");
    if (appointment.slpId !== slpId) throw new ConvexError("Not your appointment");

    await ctx.db.patch(args.appointmentId, { status: "completed" });

    const meetingRecordId = await ctx.db.insert("meetingRecords", {
      appointmentId: args.appointmentId,
      slpId,
      patientId: appointment.patientId,
      duration: args.durationSeconds,
      interactionLog: args.interactionLog,
      status: "processing",
    });

    await ctx.scheduler.runAfter(0, internal.sessionActions.fetchAudio, {
      meetingRecordId,
    });

    return meetingRecordId;
  },
});

export const markNoShow = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");
    if (appointment.slpId !== slpId) throw new ConvexError("Not your appointment");
    if (appointment.status !== "scheduled") throw new ConvexError("Not in scheduled status");

    await ctx.db.patch(args.appointmentId, { status: "no-show" });
  },
});
```

- [ ] **Step 6: Verify it deploys**

```bash
npx convex dev --once
```

Expected: No errors. (The `internal.notifications.onAppointmentBooked` and `internal.sessionActions.fetchAudio` references will fail until those files exist — add stub files if needed.)

- [ ] **Step 7: Commit**

```bash
git add convex/appointments.ts
git commit -m "feat(convex): add appointments — slot query, booking, cancellation, session lifecycle"
```

---

## Task 6: Convex Backend — Notifications (In-App + Email)

**Files:**
- Create: `convex/notifications.ts`

- [ ] **Step 1: Create notifications.ts with in-app queries and mutations**

```typescript
import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) return;

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    await Promise.all(
      unread.map((n) => ctx.db.patch(n._id, { read: true }))
    );
  },
});

export const createNotification = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type as "session-booked" | "session-cancelled" | "session-reminder" | "session-starting" | "notes-ready",
      title: args.title,
      body: args.body,
      link: args.link,
      read: false,
      appointmentId: args.appointmentId,
    });
  },
});
```

- [ ] **Step 2: Add internal actions for appointment events**

```typescript
export const onAppointmentBooked = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.appointments.get, {
      appointmentId: args.appointmentId,
    });
    if (!appointment) return;

    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : "Patient";

    const date = new Date(appointment.scheduledAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    await ctx.runMutation(internal.notifications.createNotification, {
      userId: appointment.slpId,
      type: "session-booked",
      title: "Session Booked",
      body: `Session with ${patientName} on ${date}`,
      link: `/sessions/${args.appointmentId}`,
      appointmentId: args.appointmentId,
    });

    if (appointment.caregiverId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: appointment.caregiverId,
        type: "session-booked",
        title: "Session Booked",
        body: `Session for ${patientName} on ${date}`,
        link: `/sessions/${args.appointmentId}`,
        appointmentId: args.appointmentId,
      });
    }

    // Schedule reminders
    const scheduledAt = appointment.scheduledAt;
    const now = Date.now();
    const twentyFourHoursBefore = scheduledAt - 24 * 60 * 60 * 1000;
    const oneHourBefore = scheduledAt - 60 * 60 * 1000;

    if (twentyFourHoursBefore > now) {
      await ctx.scheduler.runAt(twentyFourHoursBefore, internal.notifications.sendReminder, {
        appointmentId: args.appointmentId,
        type: "24h",
      });
    }

    if (oneHourBefore > now) {
      await ctx.scheduler.runAt(oneHourBefore, internal.notifications.sendReminder, {
        appointmentId: args.appointmentId,
        type: "1h",
      });
    }
  },
});

export const onAppointmentCancelled = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    cancelledBy: v.string(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.appointments.get, {
      appointmentId: args.appointmentId,
    });
    if (!appointment) return;

    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : "Patient";

    const notifyUserId =
      args.cancelledBy === appointment.slpId
        ? appointment.caregiverId
        : appointment.slpId;

    if (notifyUserId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: notifyUserId,
        type: "session-cancelled",
        title: "Session Cancelled",
        body: `Session with ${patientName} has been cancelled`,
        link: `/sessions/${args.appointmentId}`,
        appointmentId: args.appointmentId,
      });
    }
  },
});

export const sendReminder = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.appointments.get, {
      appointmentId: args.appointmentId,
    });
    if (!appointment || appointment.status !== "scheduled") return;

    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : "Patient";

    const label = args.type === "24h" ? "tomorrow" : "in 1 hour";

    await ctx.runMutation(internal.notifications.createNotification, {
      userId: appointment.slpId,
      type: "session-reminder",
      title: "Session Reminder",
      body: `Session with ${patientName} ${label}`,
      link: `/sessions/${args.appointmentId}/call`,
      appointmentId: args.appointmentId,
    });

    if (appointment.caregiverId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: appointment.caregiverId,
        type: "session-reminder",
        title: "Session Reminder",
        body: `Session for ${patientName} ${label}`,
        link: `/sessions/${args.appointmentId}/call`,
        appointmentId: args.appointmentId,
      });
    }
  },
});
```

Note: Email sending via `@convex-dev/resend` will be added in Task 7 (it requires `"use node"` which conflicts with the queries/mutations above). The notification actions above will be updated to also send emails once the email templates are built.

- [ ] **Step 3: Verify it deploys**

```bash
npx convex dev --once
```

- [ ] **Step 4: Commit**

```bash
git add convex/notifications.ts
git commit -m "feat(convex): add in-app notifications — list, unread count, mark read, reminders"
```

---

## Task 7: Convex Backend — Post-Call Pipeline (Session Actions)

**Files:**
- Create: `convex/sessionActions.ts`
- Create: `convex/meetingRecords.ts`

- [ ] **Step 1: Create meetingRecords.ts with queries**

```typescript
import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";

export const getByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("meetingRecords")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .first();
  },
});

export const updateStatus = internalMutation({
  args: {
    meetingRecordId: v.id("meetingRecords"),
    status: v.string(),
    audioFileId: v.optional(v.id("_storage")),
    transcript: v.optional(v.string()),
    transcriptFileId: v.optional(v.id("_storage")),
    aiSummary: v.optional(v.string()),
    soapNoteId: v.optional(v.id("sessionNotes")),
  },
  handler: async (ctx, args) => {
    const { meetingRecordId, status, ...fields } = args;
    const update: Record<string, unknown> = {
      status: status as "processing" | "transcribing" | "summarizing" | "complete" | "failed",
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        update[key] = value;
      }
    }

    await ctx.db.patch(meetingRecordId, update);
  },
});
```

- [ ] **Step 2: Create sessionActions.ts with fetchAudio action**

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const fetchAudio = internalAction({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    try {
      // In production, fetch audio from LiveKit Track Egress storage.
      // For MVP, we skip this step and move directly to transcription
      // with audio captured client-side and uploaded to Convex storage.

      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "transcribing",
      });

      await ctx.scheduler.runAfter(0, internal.sessionActions.transcribeAudio, {
        meetingRecordId: args.meetingRecordId,
      });
    } catch (error) {
      console.error("[fetchAudio] Failed:", error);
      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "failed",
      });
    }
  },
});
```

- [ ] **Step 3: Add transcribeAudio action**

```typescript
export const transcribeAudio = internalAction({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    try {
      const record = await ctx.runQuery(internal.meetingRecords.getInternal, {
        meetingRecordId: args.meetingRecordId,
      });
      if (!record || !record.audioFileId) {
        // No audio file — skip transcription, go to summarizing
        await ctx.runMutation(internal.meetingRecords.updateStatus, {
          meetingRecordId: args.meetingRecordId,
          status: "summarizing",
        });
        await ctx.scheduler.runAfter(0, internal.sessionActions.generateNotes, {
          meetingRecordId: args.meetingRecordId,
        });
        return;
      }

      const audioUrl = await ctx.storage.getUrl(record.audioFileId);
      if (!audioUrl) throw new Error("Audio file URL not found");

      const audioResponse = await fetch(audioUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenLabsApiKey) throw new Error("ElevenLabs API key not configured");

      const formData = new FormData();
      formData.append("file", audioBlob, "session-audio.webm");
      formData.append("model_id", "scribe_v2");
      formData.append("language_code", "en");

      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": elevenLabsApiKey },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`ElevenLabs STT error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as { text: string };

      const transcriptBlob = new Blob([data.text], { type: "text/plain" });
      const transcriptFileId = await ctx.storage.store(transcriptBlob);

      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "summarizing",
        transcript: data.text,
        transcriptFileId,
      });

      await ctx.scheduler.runAfter(0, internal.sessionActions.generateNotes, {
        meetingRecordId: args.meetingRecordId,
      });
    } catch (error) {
      console.error("[transcribeAudio] Failed:", error);
      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "failed",
      });
    }
  },
});
```

- [ ] **Step 4: Add generateNotes action**

```typescript
export const generateNotes = internalAction({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    try {
      const record = await ctx.runQuery(internal.meetingRecords.getInternal, {
        meetingRecordId: args.meetingRecordId,
      });
      if (!record) throw new Error("Meeting record not found");

      const patient = await ctx.runQuery(internal.patients.getInternal, {
        patientId: record.patientId,
      });

      const goals = await ctx.runQuery(internal.goals.listByPatient, {
        patientId: record.patientId,
      });

      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) throw new Error("Anthropic API key not configured");

      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });

      const patientName = patient
        ? `${patient.firstName} ${patient.lastName}`
        : "Patient";
      const patientAge = patient?.dateOfBirth
        ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old`
        : "unknown age";
      const diagnosis = patient?.diagnosis ?? "not specified";
      const activeGoals = goals
        ?.filter((g: { status: string }) => g.status === "active")
        .map((g: { domain: string; targetBehavior: string }) => `${g.domain}: ${g.targetBehavior}`)
        .join("\n  - ") || "none specified";

      const transcript = record.transcript || "No transcript available.";
      const interactionLog = record.interactionLog || "";

      const prompt = `Given this teletherapy session transcript between an SLP and a patient:
- Patient: ${patientName}, ${patientAge}, diagnosis: ${diagnosis}
- Active goals:
  - ${activeGoals}
${interactionLog ? `- Interactive content session data: ${interactionLog}` : ""}

Transcript:
${transcript}

Generate:
1. A concise meeting summary (3-5 bullet points)
2. A SOAP note draft:
   - Subjective: caregiver/patient reports from the conversation
   - Objective: observable behaviors, responses, accuracy noted
   - Assessment: progress toward goals mentioned
   - Plan: next steps discussed, homework assigned

Return as JSON:
{
  "summary": "bullet point summary",
  "soap": {
    "subjective": "...",
    "objective": "...",
    "assessment": "...",
    "plan": "..."
  }
}`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("");

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");

      const parsed = JSON.parse(jsonMatch[0]) as {
        summary: string;
        soap: { subjective: string; objective: string; assessment: string; plan: string };
      };

      const appointment = await ctx.runQuery(internal.appointments.getInternal, {
        appointmentId: record.appointmentId,
      });

      const soapNoteId = await ctx.runMutation(internal.sessionNotes.createFromMeeting, {
        patientId: record.patientId,
        slpUserId: record.slpId,
        sessionDate: new Date(appointment?.scheduledAt ?? Date.now()).toISOString().split("T")[0],
        sessionDuration: Math.round(record.duration / 60),
        soap: parsed.soap,
        meetingRecordId: args.meetingRecordId,
      });

      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "complete",
        aiSummary: parsed.summary,
        soapNoteId,
      });

      await ctx.runMutation(internal.notifications.createNotification, {
        userId: record.slpId,
        type: "notes-ready",
        title: "Session Notes Ready",
        body: `AI-generated notes for your session with ${patientName} are ready for review`,
        link: `/sessions/${record.appointmentId}/notes`,
        appointmentId: record.appointmentId,
      });
    } catch (error) {
      console.error("[generateNotes] Failed:", error);
      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "failed",
      });
    }
  },
});
```

- [ ] **Step 5: Add `getInternal` query to meetingRecords.ts**

Add this to `convex/meetingRecords.ts`:

```typescript
import { internalQuery } from "./_generated/server";

export const getInternal = internalQuery({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.meetingRecordId);
  },
});
```

- [ ] **Step 6: Add `getInternal` query to appointments.ts**

Add this to `convex/appointments.ts`:

```typescript
import { internalQuery } from "./_generated/server";

export const getInternal = internalQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;
    const patient = await ctx.db.get(appointment.patientId);
    return { ...appointment, patient };
  },
});
```

- [ ] **Step 7: Add `createFromMeeting` mutation to sessionNotes.ts**

Add this internal mutation to the existing `convex/sessionNotes.ts`:

```typescript
import { internalMutation } from "./_generated/server";

export const createFromMeeting = internalMutation({
  args: {
    patientId: v.id("patients"),
    slpUserId: v.string(),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    soap: v.object({
      subjective: v.string(),
      objective: v.string(),
      assessment: v.string(),
      plan: v.string(),
    }),
    meetingRecordId: v.id("meetingRecords"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessionNotes", {
      patientId: args.patientId,
      slpUserId: args.slpUserId,
      sessionDate: args.sessionDate,
      sessionDuration: args.sessionDuration,
      sessionType: "teletherapy",
      status: "draft",
      structuredData: {
        targetsWorkedOn: [],
        behaviorNotes: undefined,
        parentFeedback: undefined,
        homeworkAssigned: undefined,
        nextSessionFocus: undefined,
      },
      soapNote: args.soap,
      aiGenerated: true,
      meetingRecordId: args.meetingRecordId,
    });
  },
});
```

- [ ] **Step 8: Add internal queries for goals and patients**

Add to `convex/patients.ts` (if not already there):

```typescript
import { internalQuery } from "./_generated/server";

export const getInternal = internalQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.patientId);
  },
});
```

Add to `convex/goals.ts` (if not already there):

```typescript
export const listByPatient = internalQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});
```

- [ ] **Step 9: Verify it all deploys**

```bash
npx convex dev --once
```

- [ ] **Step 10: Commit**

```bash
git add convex/sessionActions.ts convex/meetingRecords.ts convex/sessionNotes.ts convex/patients.ts convex/goals.ts
git commit -m "feat(convex): add post-call pipeline — fetch audio, transcribe, generate SOAP notes"
```

---

## Task 8: LiveKit Token API Route

**Files:**
- Create: `src/app/api/livekit/token/route.ts`

- [ ] **Step 1: Create the token route**

```bash
mkdir -p src/app/api/livekit/token
```

- [ ] **Step 2: Write the route handler**

Create `src/app/api/livekit/token/route.ts`:

```typescript
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { appointmentId } = body as { appointmentId: string };

  if (!appointmentId) {
    return Response.json({ error: "appointmentId required" }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return Response.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    ttl: "2h",
  });

  at.addGrant({
    roomJoin: true,
    room: `session-${appointmentId}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return Response.json({ token, serverUrl });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/livekit/token/route.ts
git commit -m "feat(api): add LiveKit token generation route with Clerk auth"
```

---

## Task 9: Feature Types & Utility Libraries

**Files:**
- Create: `src/features/sessions/types.ts`
- Create: `src/features/sessions/lib/time-slots.ts`
- Create: `src/features/sessions/lib/data-channel-codec.ts`
- Create: `src/features/sessions/lib/livekit-config.ts`

- [ ] **Step 1: Create types.ts**

```bash
mkdir -p src/features/sessions/lib src/features/sessions/hooks src/features/sessions/components src/features/sessions/emails
```

Create `src/features/sessions/types.ts`:

```typescript
export type AppointmentStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show";

export type MeetingRecordStatus =
  | "processing"
  | "transcribing"
  | "summarizing"
  | "complete"
  | "failed";

export type NotificationType =
  | "session-booked"
  | "session-cancelled"
  | "session-reminder"
  | "session-starting"
  | "notes-ready";

export type ContentType = "flashcard" | "app" | "image";

export type ContentUpdate = {
  type: "content-update";
  contentType: ContentType;
  payload: Record<string, unknown>;
};

export type ContentControl = {
  type: "content-next" | "content-previous" | "content-clear";
};

export type Interaction = {
  type: "interaction";
  action: string;
  target: string;
  value?: unknown;
  timestamp: number;
};

export type InteractiveMessage = ContentUpdate | ContentControl | Interaction;

export type TimeSlot = {
  timestamp: number;
  startTime: string;
  dayOfWeek: number;
};
```

- [ ] **Step 2: Create data-channel-codec.ts**

Create `src/features/sessions/lib/data-channel-codec.ts`:

```typescript
import type { InteractiveMessage } from "../types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encode(message: InteractiveMessage): Uint8Array {
  return encoder.encode(JSON.stringify(message));
}

export function decode(payload: Uint8Array): InteractiveMessage {
  return JSON.parse(decoder.decode(payload)) as InteractiveMessage;
}
```

- [ ] **Step 3: Create time-slots.ts**

Create `src/features/sessions/lib/time-slots.ts`:

```typescript
export function getWeekStart(date: Date): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getTime();
}

export function getWeekDays(weekStart: number): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * 24 * 60 * 60 * 1000));
}

export function formatTime(time24: string): string {
  const [hour, min] = time24.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${String(min).padStart(2, "0")} ${period}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}
```

- [ ] **Step 4: Create livekit-config.ts**

Create `src/features/sessions/lib/livekit-config.ts`:

```typescript
export const LIVEKIT_DATA_TOPICS = {
  CONTENT: "content",
  INTERACTION: "interaction",
} as const;
```

- [ ] **Step 5: Commit**

```bash
git add src/features/sessions/types.ts src/features/sessions/lib/
git commit -m "feat(sessions): add types, time-slot utilities, data channel codec, LiveKit config"
```

---

## Task 10: Hooks — Calendar, Availability, Appointments

**Files:**
- Create: `src/features/sessions/hooks/use-calendar.ts`
- Create: `src/features/sessions/hooks/use-availability.ts`
- Create: `src/features/sessions/hooks/use-appointments.ts`

- [ ] **Step 1: Create use-calendar.ts**

```typescript
"use client";

import { useCallback, useState } from "react";
import { getWeekStart } from "../lib/time-slots";

type CalendarView = "week" | "day";

export function useCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("week");

  const weekStart = getWeekStart(currentDate);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - (view === "week" ? 7 : 1));
      return d;
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (view === "week" ? 7 : 1));
      return d;
    });
  }, [view]);

  return {
    currentDate,
    weekStart,
    view,
    setView,
    goToToday,
    goToPrevious,
    goToNext,
  };
}
```

- [ ] **Step 2: Create use-availability.ts**

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useAvailability(slpId?: string) {
  const slots = useQuery(api.availability.list, slpId ? { slpId } : {});
  const createSlot = useMutation(api.availability.create);
  const removeSlot = useMutation(api.availability.remove);

  return {
    slots: slots ?? [],
    createSlot,
    removeSlot: (availabilityId: Id<"availability">) =>
      removeSlot({ availabilityId }),
  };
}
```

- [ ] **Step 3: Create use-appointments.ts**

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useAppointments(weekStart?: number) {
  const appointments = useQuery(
    api.appointments.listBySlp,
    weekStart ? { weekStart } : {}
  );

  return appointments ?? [];
}

export function useAppointment(appointmentId: Id<"appointments"> | null) {
  return useQuery(
    api.appointments.get,
    appointmentId ? { appointmentId } : "skip"
  );
}

export function useAvailableSlots(slpId: string | null, weekStart: number) {
  return useQuery(
    api.appointments.getAvailableSlots,
    slpId ? { slpId, weekStart } : "skip"
  );
}

export function useAppointmentActions() {
  const create = useMutation(api.appointments.create);
  const bookAsCaregiver = useMutation(api.appointments.bookAsCaregiver);
  const cancel = useMutation(api.appointments.cancel);
  const startSession = useMutation(api.appointments.startSession);
  const completeSession = useMutation(api.appointments.completeSession);
  const markNoShow = useMutation(api.appointments.markNoShow);

  return { create, bookAsCaregiver, cancel, startSession, completeSession, markNoShow };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/sessions/hooks/use-calendar.ts src/features/sessions/hooks/use-availability.ts src/features/sessions/hooks/use-appointments.ts
git commit -m "feat(sessions): add calendar, availability, and appointments hooks"
```

---

## Task 11: Hooks — Call Room & Interactive Sync

**Files:**
- Create: `src/features/sessions/hooks/use-call-room.ts`
- Create: `src/features/sessions/hooks/use-interactive-sync.ts`

- [ ] **Step 1: Create use-call-room.ts**

```typescript
"use client";

import { useCallback, useRef, useState } from "react";

type CallState = "idle" | "connecting" | "connected" | "disconnected";

export function useCallRoom(appointmentId: string) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const fetchToken = useCallback(async () => {
    setCallState("connecting");
    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get token");
      }

      const data = (await response.json()) as { token: string; serverUrl: string };
      setToken(data.token);
      setServerUrl(data.serverUrl);
      startTimeRef.current = Date.now();
      setCallState("connected");
    } catch (error) {
      console.error("[useCallRoom] Token fetch failed:", error);
      setCallState("idle");
    }
  }, [appointmentId]);

  const getDurationSeconds = useCallback(() => {
    if (startTimeRef.current === 0) return 0;
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  }, []);

  const handleDisconnected = useCallback(() => {
    setCallState("disconnected");
  }, []);

  return {
    callState,
    token,
    serverUrl,
    fetchToken,
    getDurationSeconds,
    handleDisconnected,
  };
}
```

- [ ] **Step 2: Create use-interactive-sync.ts**

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import { useDataChannel } from "@livekit/components-react";
import type { ReceivedDataMessage } from "@livekit/components-core";
import { encode, decode } from "../lib/data-channel-codec";
import { LIVEKIT_DATA_TOPICS } from "../lib/livekit-config";
import type { ContentUpdate, ContentControl, Interaction, InteractiveMessage } from "../types";

export function useInteractiveSync() {
  const [currentContent, setCurrentContent] = useState<ContentUpdate | null>(null);
  const [lastInteraction, setLastInteraction] = useState<Interaction | null>(null);
  const interactionLogRef = useRef<Interaction[]>([]);

  const handleContentMessage = useCallback((msg: ReceivedDataMessage) => {
    const decoded = decode(msg.payload);
    if (decoded.type === "content-update") {
      setCurrentContent(decoded as ContentUpdate);
    } else if (decoded.type === "content-clear") {
      setCurrentContent(null);
    }
  }, []);

  const handleInteractionMessage = useCallback((msg: ReceivedDataMessage) => {
    const decoded = decode(msg.payload);
    if (decoded.type === "interaction") {
      const interaction = decoded as Interaction;
      setLastInteraction(interaction);
      interactionLogRef.current.push(interaction);
    }
  }, []);

  const { send: sendContentRaw } = useDataChannel(
    LIVEKIT_DATA_TOPICS.CONTENT,
    handleContentMessage
  );

  const { send: sendInteractionRaw } = useDataChannel(
    LIVEKIT_DATA_TOPICS.INTERACTION,
    handleInteractionMessage
  );

  const sendContent = useCallback(
    (message: ContentUpdate | ContentControl) => {
      sendContentRaw(encode(message), { reliable: true });
    },
    [sendContentRaw]
  );

  const sendInteraction = useCallback(
    (interaction: Interaction) => {
      sendInteractionRaw(encode(interaction), { reliable: true });
    },
    [sendInteractionRaw]
  );

  const getInteractionLog = useCallback(() => {
    return JSON.stringify(interactionLogRef.current);
  }, []);

  return {
    currentContent,
    lastInteraction,
    sendContent,
    sendInteraction,
    getInteractionLog,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/sessions/hooks/use-call-room.ts src/features/sessions/hooks/use-interactive-sync.ts
git commit -m "feat(sessions): add call room and interactive sync hooks"
```

---

## Task 12: UI Components — Calendar & Scheduling

**Files:**
- Create: `src/features/sessions/components/calendar-view.tsx`
- Create: `src/features/sessions/components/availability-editor.tsx`
- Create: `src/features/sessions/components/appointment-card.tsx`
- Create: `src/features/sessions/components/booking-modal.tsx`
- Create: `src/features/sessions/components/sessions-page.tsx`

This is a large task. The implementing agent should:

1. Build `sessions-page.tsx` as the main page component (thin orchestrator)
2. Build `calendar-view.tsx` showing a weekly grid with time slots
3. Build `availability-editor.tsx` as a sheet/modal where SLP sets their hours
4. Build `appointment-card.tsx` to display a single appointment in the calendar
5. Build `booking-modal.tsx` for SLP to select patient + time slot

**Key implementation notes:**
- Use `useCalendar()` hook for navigation state
- Use `useAvailability()` hook for slot data
- Use `useAppointments()` hook for appointment data
- Use `useQuery(api.patients.list, {})` to get patient caseload for booking
- Follow DESIGN.md tokens: Fraunces for headings, Instrument Sans for body, `#00595c` primary, `#F6F3EE` canvas
- Use shadcn/ui components: `Sheet` for availability editor, `Dialog` for booking modal, `Button`, `Select`
- Calendar grid: 7 columns (days) with time rows (30-min increments)
- Color coding: available slots green tonal, booked teal, past muted

- [ ] **Step 1: Build sessions-page.tsx**
- [ ] **Step 2: Build calendar-view.tsx**
- [ ] **Step 3: Build availability-editor.tsx**
- [ ] **Step 4: Build appointment-card.tsx**
- [ ] **Step 5: Build booking-modal.tsx**
- [ ] **Step 6: Verify components render without errors**
- [ ] **Step 7: Commit**

```bash
git add src/features/sessions/components/
git commit -m "feat(sessions): add calendar view, availability editor, booking modal UI"
```

---

## Task 13: UI Components — Video Call Room

**Files:**
- Create: `src/features/sessions/components/lobby.tsx`
- Create: `src/features/sessions/components/call-room.tsx`
- Create: `src/features/sessions/components/call-controls.tsx`
- Create: `src/features/sessions/components/participant-panel.tsx`

**Key implementation notes:**
- `lobby.tsx` uses LiveKit's `PreJoin` prefab component for camera/mic check
- `call-room.tsx` wraps `LiveKitRoom` with `token` and `serverUrl` from `useCallRoom()`
- `participant-panel.tsx` uses `useTracks` and `TrackLoop` from `@livekit/components-react`
- `call-controls.tsx` uses `TrackToggle` for mute/camera and `DisconnectButton`
- Import `@livekit/components-styles` in `call-room.tsx`
- All components must be `"use client"` — LiveKit requires browser APIs

- [ ] **Step 1: Build lobby.tsx with PreJoin**
- [ ] **Step 2: Build call-room.tsx wrapping LiveKitRoom**
- [ ] **Step 3: Build participant-panel.tsx with video tiles**
- [ ] **Step 4: Build call-controls.tsx with mute/camera/disconnect**
- [ ] **Step 5: Commit**

```bash
git add src/features/sessions/components/lobby.tsx src/features/sessions/components/call-room.tsx src/features/sessions/components/call-controls.tsx src/features/sessions/components/participant-panel.tsx
git commit -m "feat(sessions): add video call UI — lobby, room, controls, participant tiles"
```

---

## Task 14: UI Components — Interactive Split-Screen

**Files:**
- Create: `src/features/sessions/components/interactive-panel.tsx`
- Create: `src/features/sessions/components/content-picker.tsx`
- Create: `src/features/sessions/components/content-renderer.tsx`

**Key implementation notes:**
- `content-picker.tsx` (SLP only): sheet/panel to select flashcard decks, apps, or images
- Query flashcard decks via `api.flashcard_decks.listBySession` or similar
- Query apps via existing app list queries
- `content-renderer.tsx`: renders the shared content — flashcard card, image, or iframe for apps
- `interactive-panel.tsx`: orchestrates picker + renderer + interaction indicators
- Uses `useInteractiveSync()` hook for data channel communication
- Layout: on desktop side-by-side with video (1/3 width), on mobile stacked below

- [ ] **Step 1: Build content-picker.tsx**
- [ ] **Step 2: Build content-renderer.tsx**
- [ ] **Step 3: Build interactive-panel.tsx**
- [ ] **Step 4: Commit**

```bash
git add src/features/sessions/components/interactive-panel.tsx src/features/sessions/components/content-picker.tsx src/features/sessions/components/content-renderer.tsx
git commit -m "feat(sessions): add interactive split-screen — content picker, renderer, sync panel"
```

---

## Task 15: UI Components — Post-Call Notes & Caregiver Booking

**Files:**
- Create: `src/features/sessions/components/meeting-notes-view.tsx`
- Create: `src/features/sessions/components/caregiver-booking.tsx`

**Key implementation notes:**
- `meeting-notes-view.tsx`: subscribes to `meetingRecords.getByAppointment` — shows real-time processing status, then transcript + AI summary + SOAP draft when complete
- SOAP draft uses the same form fields as the existing session notes feature
- "Retry" button if status is "failed"
- `caregiver-booking.tsx`: uses `useAvailableSlots(slpId, weekStart)` to show open slots, click to book via `bookAsCaregiver` mutation

- [ ] **Step 1: Build meeting-notes-view.tsx**
- [ ] **Step 2: Build caregiver-booking.tsx**
- [ ] **Step 3: Commit**

```bash
git add src/features/sessions/components/meeting-notes-view.tsx src/features/sessions/components/caregiver-booking.tsx
git commit -m "feat(sessions): add meeting notes view and caregiver booking UI"
```

---

## Task 16: Notification Bell Component

**Files:**
- Create: `src/features/sessions/components/notification-bell.tsx`
- Modify: sidebar/header component (wherever `UserButton` lives)

**Key implementation notes:**
- `notification-bell.tsx`: uses `useQuery(api.notifications.list)` and `useQuery(api.notifications.unreadCount)`
- Renders a bell icon with badge count
- Click opens a `Popover` with notification list
- Each notification: title, body, time ago, click navigates to `link`
- "Mark all read" button at bottom
- Add the bell to the app header/sidebar next to the user avatar

- [ ] **Step 1: Build notification-bell.tsx**
- [ ] **Step 2: Add notification bell to app header**
- [ ] **Step 3: Commit**

```bash
git add src/features/sessions/components/notification-bell.tsx
git commit -m "feat(sessions): add notification bell with unread count and dropdown"
```

---

## Task 17: Email Templates

**Files:**
- Create: `src/features/sessions/emails/appointment-booked.tsx`
- Create: `src/features/sessions/emails/appointment-cancelled.tsx`
- Create: `src/features/sessions/emails/session-reminder.tsx`
- Create: `src/features/sessions/emails/notes-ready.tsx`

**Key implementation notes:**
- Use `@react-email/components`: `Html`, `Head`, `Body`, `Container`, `Text`, `Heading`, `Button`, `Hr`
- Each template is a React component that takes props (patientName, date, joinLink, etc.)
- Styles should match DESIGN.md: Instrument Sans body, `#00595c` primary, `#F6F3EE` background
- Templates are rendered to HTML in Convex actions via `render()` from `@react-email/render`
- Keep templates simple — plain HTML email compatible

- [ ] **Step 1: Build appointment-booked.tsx**
- [ ] **Step 2: Build appointment-cancelled.tsx**
- [ ] **Step 3: Build session-reminder.tsx**
- [ ] **Step 4: Build notes-ready.tsx**
- [ ] **Step 5: Commit**

```bash
git add src/features/sessions/emails/
git commit -m "feat(sessions): add React Email templates for booking, cancellation, reminders, notes"
```

---

## Task 18: Wire Up Email Sending in Notifications

**Files:**
- Create: `convex/emailActions.ts`

This file contains the `"use node"` email sending actions that import the React Email templates and use `@convex-dev/resend`.

- [ ] **Step 1: Create emailActions.ts**

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";

export const resend = new Resend(components.resend, { testMode: false });

export const sendBookingEmail = internalAction({
  args: {
    to: v.string(),
    patientName: v.string(),
    dateTime: v.string(),
    joinLink: v.string(),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: "Bridges <sessions@bridges.ai>",
      to: args.to,
      subject: `Session Booked: ${args.patientName}`,
      html: `
        <div style="font-family: 'Instrument Sans', Arial, sans-serif; background: #F6F3EE; padding: 40px;">
          <div style="background: white; border-radius: 12px; padding: 32px; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #00595c; margin: 0 0 16px;">Session Booked</h2>
            <p>A session for <strong>${args.patientName}</strong> has been scheduled.</p>
            <p><strong>When:</strong> ${args.dateTime}</p>
            <a href="https://bridgeai-iota.vercel.app${args.joinLink}"
               style="display: inline-block; background: #00595c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
              View Session
            </a>
          </div>
        </div>
      `,
    });
  },
});

export const sendCancellationEmail = internalAction({
  args: {
    to: v.string(),
    patientName: v.string(),
    dateTime: v.string(),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: "Bridges <sessions@bridges.ai>",
      to: args.to,
      subject: `Session Cancelled: ${args.patientName}`,
      html: `
        <div style="font-family: 'Instrument Sans', Arial, sans-serif; background: #F6F3EE; padding: 40px;">
          <div style="background: white; border-radius: 12px; padding: 32px; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #00595c; margin: 0 0 16px;">Session Cancelled</h2>
            <p>The session for <strong>${args.patientName}</strong> on ${args.dateTime} has been cancelled.</p>
          </div>
        </div>
      `,
    });
  },
});

export const sendReminderEmail = internalAction({
  args: {
    to: v.string(),
    patientName: v.string(),
    dateTime: v.string(),
    joinLink: v.string(),
    reminderType: v.string(),
  },
  handler: async (ctx, args) => {
    const label = args.reminderType === "24h" ? "Tomorrow" : "Starting Soon";
    await resend.sendEmail(ctx, {
      from: "Bridges <sessions@bridges.ai>",
      to: args.to,
      subject: `Session ${label}: ${args.patientName}`,
      html: `
        <div style="font-family: 'Instrument Sans', Arial, sans-serif; background: #F6F3EE; padding: 40px;">
          <div style="background: white; border-radius: 12px; padding: 32px; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #00595c; margin: 0 0 16px;">Session ${label}</h2>
            <p>Your session with <strong>${args.patientName}</strong> is ${args.reminderType === "24h" ? "tomorrow" : "starting in 1 hour"}.</p>
            <p><strong>When:</strong> ${args.dateTime}</p>
            <a href="https://bridgeai-iota.vercel.app${args.joinLink}"
               style="display: inline-block; background: #00595c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
              Join Session
            </a>
          </div>
        </div>
      `,
    });
  },
});
```

- [ ] **Step 2: Verify it deploys**

```bash
npx convex dev --once
```

- [ ] **Step 3: Commit**

```bash
git add convex/emailActions.ts
git commit -m "feat(convex): add email sending actions via @convex-dev/resend"
```

---

## Task 19: Page Wrappers

**Files:**
- Create: `src/app/(app)/sessions/page.tsx`
- Create: `src/app/(app)/sessions/[id]/page.tsx`
- Create: `src/app/(app)/sessions/[id]/call/page.tsx`
- Create: `src/app/(app)/sessions/[id]/notes/page.tsx`
- Create: `src/app/(app)/sessions/book/[slpId]/page.tsx`

- [ ] **Step 1: Create sessions page**

```bash
mkdir -p "src/app/(app)/sessions/[id]/call" "src/app/(app)/sessions/[id]/notes" "src/app/(app)/sessions/book/[slpId]"
```

Create `src/app/(app)/sessions/page.tsx`:

```typescript
import { SessionsPage } from "@/features/sessions/components/sessions-page";

export default function SessionsRoute() {
  return <SessionsPage />;
}
```

- [ ] **Step 2: Create appointment detail page**

Create `src/app/(app)/sessions/[id]/page.tsx`:

```typescript
import { AppointmentDetailPage } from "@/features/sessions/components/appointment-detail-page";

export default function AppointmentRoute({ params }: { params: Promise<{ id: string }> }) {
  return <AppointmentDetailPage paramsPromise={params} />;
}
```

- [ ] **Step 3: Create call page**

Create `src/app/(app)/sessions/[id]/call/page.tsx`:

```typescript
import { CallPage } from "@/features/sessions/components/call-page";

export default function CallRoute({ params }: { params: Promise<{ id: string }> }) {
  return <CallPage paramsPromise={params} />;
}
```

- [ ] **Step 4: Create notes page**

Create `src/app/(app)/sessions/[id]/notes/page.tsx`:

```typescript
import { NotesPage } from "@/features/sessions/components/notes-page";

export default function NotesRoute({ params }: { params: Promise<{ id: string }> }) {
  return <NotesPage paramsPromise={params} />;
}
```

- [ ] **Step 5: Create caregiver booking page**

Create `src/app/(app)/sessions/book/[slpId]/page.tsx`:

```typescript
import { CaregiverBookingPage } from "@/features/sessions/components/caregiver-booking-page";

export default function BookingRoute({ params }: { params: Promise<{ slpId: string }> }) {
  return <CaregiverBookingPage paramsPromise={params} />;
}
```

- [ ] **Step 6: Create the page-level feature components**

The implementing agent needs to create these thin client components that unwrap params and delegate:
- `appointment-detail-page.tsx` — shows appointment info, "Start Session" / "Cancel" buttons
- `call-page.tsx` — wraps lobby → call-room transition
- `notes-page.tsx` — wraps meeting-notes-view
- `caregiver-booking-page.tsx` — wraps caregiver-booking

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/sessions/"
git commit -m "feat(sessions): add page routes — calendar, detail, call, notes, booking"
```

---

## Task 20: Integration Testing & Smoke Test

- [ ] **Step 1: Verify Convex deploys cleanly**

```bash
npx convex dev --once
```

- [ ] **Step 2: Verify Next.js builds**

```bash
npm run build
```

Fix any type errors or import issues.

- [ ] **Step 3: Verify navigation renders**

Start dev server and confirm "Sessions" appears in the SLP sidebar.

```bash
npm run dev
```

Navigate to `/sessions` — should render the calendar page without errors.

- [ ] **Step 4: Smoke test scheduling flow**

1. As SLP: set availability (e.g., Monday 9:00-12:00)
2. As SLP: book a session for a patient
3. Verify appointment appears on calendar
4. Verify in-app notification appears

- [ ] **Step 5: Smoke test video call**

1. Click "Start Session" on an appointment
2. Verify lobby renders with camera/mic preview
3. Join the room — verify video tiles appear
4. End the session — verify status transitions to "completed"

- [ ] **Step 6: Fix any issues found**

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "fix: resolve integration issues from smoke testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install dependencies | package.json |
| 2 | Schema + Convex config | convex/schema.ts, convex/convex.config.ts |
| 3 | Routes + navigation | src/core/routes.ts, src/shared/lib/navigation.ts |
| 4 | Availability CRUD | convex/availability.ts |
| 5 | Appointments + slot query | convex/appointments.ts |
| 6 | Notifications (in-app) | convex/notifications.ts |
| 7 | Post-call pipeline | convex/sessionActions.ts, convex/meetingRecords.ts |
| 8 | LiveKit token route | src/app/api/livekit/token/route.ts |
| 9 | Types + utilities | src/features/sessions/types.ts, lib/* |
| 10 | Calendar/availability/appointment hooks | hooks/* |
| 11 | Call room + interactive sync hooks | hooks/* |
| 12 | Calendar + scheduling UI | components/* |
| 13 | Video call room UI | components/* |
| 14 | Interactive split-screen UI | components/* |
| 15 | Notes view + caregiver booking UI | components/* |
| 16 | Notification bell | components/* |
| 17 | Email templates | emails/* |
| 18 | Email sending actions | convex/emailActions.ts |
| 19 | Page wrappers | src/app/(app)/sessions/* |
| 20 | Integration testing | — |
