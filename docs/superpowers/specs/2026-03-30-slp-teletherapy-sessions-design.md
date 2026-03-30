# SLP Teletherapy Sessions — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Full teletherapy platform — scheduling, video calls, transcription, AI notes, notifications, interactive content sharing

---

## 1. Overview

Add a teletherapy sessions feature to Bridges that lets SLPs schedule, host, and document video calls with patients/caregivers — all from within the app. The feature includes:

1. **SLP availability management** — set recurring weekly hours
2. **Appointment scheduling** — SLP manual booking + caregiver self-booking from available slots
3. **Video calls** — LiveKit Cloud WebRTC with lobby, controls, and room lifecycle
4. **Background transcription** — ElevenLabs Scribe v2 processes audio after the call
5. **AI meeting notes + SOAP draft** — Claude generates summary and pre-fills a session note
6. **Notifications** — Resend email + in-app notifications for booking, cancellation, reminders
7. **Split-screen interactive content** — SLP shares flashcards/apps/images during calls, patient interacts in real-time via LiveKit data channels

### Google Meet-Style Flow

SLP creates a scheduled session, gets a shareable link, and waits in a lobby for the client (caregiver/patient) to join at the scheduled time. The SLP is the host.

---

## 2. Data Model

### 2.1 New Table: `availability`

SLP weekly time slots for scheduling.

```typescript
availability: defineTable({
  slpId: v.string(),                        // Clerk user ID
  dayOfWeek: v.number(),                    // 0=Sunday ... 6=Saturday
  startTime: v.string(),                    // "09:00" (24h format)
  endTime: v.string(),                      // "09:30" (30-min slots)
  isRecurring: v.boolean(),                 // true = every week
  effectiveDate: v.optional(v.string()),    // for one-off overrides/blocks (ISO date)
  timezone: v.string(),                     // IANA timezone (e.g., "America/Chicago")
})
  .index("by_slpId", ["slpId"])
  .index("by_slpId_dayOfWeek", ["slpId", "dayOfWeek"])
```

### 2.2 New Table: `appointments`

Scheduled sessions with status machine.

```typescript
appointments: defineTable({
  slpId: v.string(),
  patientId: v.id("patients"),
  caregiverId: v.optional(v.string()),       // Clerk ID of booking caregiver
  scheduledAt: v.number(),                   // Unix timestamp (ms)
  duration: v.number(),                      // minutes (default 30)
  status: v.union(
    v.literal("scheduled"),
    v.literal("in-progress"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("no-show"),
  ),
  cancelledBy: v.optional(v.string()),       // Clerk ID of who cancelled
  livekitRoom: v.optional(v.string()),       // room name, set when call starts
  joinLink: v.string(),                      // shareable link for caregiver
  notes: v.optional(v.string()),             // pre-session notes from SLP
  timezone: v.optional(v.string()),          // IANA timezone (e.g., "America/Chicago"), defaults to SLP's
})
  .index("by_slpId", ["slpId"])
  .index("by_patientId", ["patientId"])
  .index("by_scheduledAt", ["scheduledAt"])
  .index("by_status", ["status"])
  .index("by_slpId_scheduledAt", ["slpId", "scheduledAt"])
```

`joinLink` is generated at creation time as `/sessions/{appointmentId}/call` — a deterministic path using the Convex document ID. No random tokens needed since the call page verifies the user is the SLP or a linked caregiver before issuing a LiveKit token.

**Status machine:**
```
scheduled → in-progress → completed
scheduled → cancelled
scheduled → no-show (SLP marks after time passes)
```

### 2.3 New Table: `meetingRecords`

Post-call artifacts — transcript, summary, linked SOAP note.

```typescript
meetingRecords: defineTable({
  appointmentId: v.id("appointments"),
  slpId: v.string(),
  patientId: v.id("patients"),
  duration: v.number(),                         // actual call duration in seconds
  audioFileId: v.optional(v.id("_storage")),     // audio from Track Egress
  transcript: v.optional(v.string()),            // full transcript text
  transcriptFileId: v.optional(v.id("_storage")),// raw transcript file
  aiSummary: v.optional(v.string()),             // AI-generated meeting summary
  soapNoteId: v.optional(v.id("sessionNotes")),  // link to auto-generated SOAP draft
  interactionLog: v.optional(v.string()),        // JSON: shared content + patient responses
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
  .index("by_patientId", ["patientId"])
```

### 2.4 New Table: `notifications`

In-app notification feed.

```typescript
notifications: defineTable({
  userId: v.string(),                            // Clerk ID
  type: v.union(
    v.literal("session-booked"),
    v.literal("session-cancelled"),
    v.literal("session-reminder"),
    v.literal("session-starting"),
    v.literal("notes-ready"),
  ),
  title: v.string(),
  body: v.string(),
  link: v.optional(v.string()),                  // e.g., "/sessions/abc123"
  read: v.boolean(),
  appointmentId: v.optional(v.id("appointments")),
})
  .index("by_userId", ["userId"])
  .index("by_userId_read", ["userId", "read"])
```

### 2.5 Extension: `sessionNotes`

Add one optional field to link SOAP notes back to their source call:

```typescript
meetingRecordId: v.optional(v.id("meetingRecords"))
```

---

## 3. Page Structure & Navigation

### 3.1 Routes

```
src/app/(app)/sessions/page.tsx              — Calendar view (thin wrapper)
src/app/(app)/sessions/[id]/page.tsx         — Appointment detail
src/app/(app)/sessions/[id]/call/page.tsx    — Video call room
src/app/(app)/sessions/[id]/notes/page.tsx   — Post-call transcript + notes view
src/app/(app)/sessions/book/[slpId]/page.tsx — Caregiver booking page
```

### 3.2 Feature Slice

```
src/features/sessions/
├── components/
│   ├── calendar-view.tsx          — Weekly/daily calendar with availability + appointments
│   ├── availability-editor.tsx    — Set recurring weekly hours
│   ├── appointment-card.tsx       — Single appointment display
│   ├── booking-modal.tsx          — SLP: pick patient + time slot
│   ├── caregiver-booking.tsx      — Caregiver: self-book from available slots
│   ├── call-room.tsx              — LiveKit video call container
│   ├── call-controls.tsx          — Mute, camera, screen share, end call, content share
│   ├── participant-panel.tsx      — Video tiles for participants
│   ├── interactive-panel.tsx      — Split-screen: flashcards/games/images
│   ├── content-picker.tsx         — SLP-only: select content to share
│   ├── content-renderer.tsx       — Shared: renders synced content on both sides
│   ├── lobby.tsx                  — Pre-join screen (camera/mic check via LiveKit PreJoin)
│   ├── meeting-notes-view.tsx     — Post-call transcript + AI summary
│   └── notification-banner.tsx    — In-app upcoming session alerts
├── hooks/
│   ├── use-calendar.ts            — Calendar navigation state
│   ├── use-availability.ts        — CRUD for availability slots
│   ├── use-appointments.ts        — Booking, cancellation, status
│   ├── use-call-room.ts           — LiveKit connection, token fetch
│   └── use-interactive-sync.ts    — Data channel state sync for split-screen content
├── emails/
│   ├── appointment-booked.tsx     — React Email: booking confirmation
│   ├── appointment-cancelled.tsx  — React Email: cancellation notice
│   ├── session-reminder.tsx       — React Email: 24h and 1h reminders
│   └── notes-ready.tsx            — React Email: post-call notes available
├── lib/
│   ├── time-slots.ts              — Slot generation, conflict detection, timezone helpers
│   ├── livekit-config.ts          — LiveKit client configuration
│   └── data-channel-codec.ts      — Uint8Array ↔ JSON serialization for data channels
└── types.ts
```

### 3.3 Navigation Updates

**SLP sidebar** (add "Sessions" between Patients and Builder):
```
Home → Patients → Sessions → Builder → Flashcards → Speech Coach → Templates → My Apps → Settings
```

**Caregiver sidebar** (add "Sessions"):
```
Home → Sessions → Settings
```

Update `src/shared/lib/navigation.ts` with the new entry.

---

## 4. Video Call Architecture (LiveKit Cloud)

### 4.1 Token Generation

Next.js App Router API route — the only server-side LiveKit code:

```
src/app/api/livekit/token/route.ts
```

```typescript
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: Request) {
  const { appointmentId, identity, name } = await req.json();

  // Verify: user is SLP or linked caregiver for this appointment (via Clerk auth)

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity, name, ttl: '2h' }
  );
  at.addGrant({
    roomJoin: true,
    room: appointmentId,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,  // required for interactive content sync
  });

  const token = await at.toJwt();  // async in v2!
  return Response.json({ token, serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL });
}
```

**Auth check:** Clerk session → look up appointment in Convex → verify user is the SLP or a caregiver linked to the patient.

### 4.2 Room Lifecycle

```
SLP clicks "Start Session"
  → Convex mutation: appointment.status → "in-progress", sets livekitRoom
  → Frontend fetches token from /api/livekit/token
  → SLP enters PreJoin lobby (camera/mic check)
  → SLP joins LiveKit room

Caregiver clicks join link → /sessions/[id]/call
  → Verifies appointment.status === "in-progress"
  → Fetches token
  → Enters PreJoin lobby → joins room

SLP clicks "End Session"
  → LiveKit room closed (all participants disconnected)
  → Convex mutation: appointment.status → "completed"
  → Post-call pipeline scheduled (see Section 6)
```

### 4.3 Client Components

```tsx
// call-room.tsx — simplified structure
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

<LiveKitRoom
  token={token}
  serverUrl={serverUrl}
  connect={true}
  audio={true}
  video={true}
  onDisconnected={() => handleCallEnd()}
>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="lg:col-span-2">
      <ParticipantPanel />
      <CallControls />
    </div>
    <div className="lg:col-span-1">
      <InteractivePanel />  {/* Split-screen content */}
    </div>
  </div>
  <RoomAudioRenderer />
</LiveKitRoom>
```

### 4.4 Recording via Track Egress

Use **Track Egress** (audio-only) instead of Room Composite — faster and cheaper for transcription:

- Configure Track Egress in LiveKit Cloud dashboard to export audio tracks
- Audio saved to cloud storage (S3 or GCS)
- After call ends, Convex action fetches the audio file for transcription

---

## 5. Scheduling & Availability

### 5.1 SLP Availability Management

The availability editor on `/sessions` lets SLPs define recurring weekly blocks:

- Set time blocks per day of week (e.g., Monday 9:00-12:00, 1:00-4:00)
- Add one-off overrides: block a specific date or add extra hours
- 30-minute slot granularity (standard therapy session length)
- Timezone stored per SLP — all times displayed in viewer's local timezone

### 5.2 Slot Generation (Computed Query)

Available slots are computed on-read, not pre-generated:

```typescript
availableSlots = recurringSlots(week)
  + oneOffAdditions(week)
  - oneOffBlocks(week)
  - bookedAppointments(week)
```

This runs as a Convex query — reactive via subscriptions. If someone books a slot while a caregiver is browsing, it disappears in real-time.

### 5.3 Booking Flows

**SLP books manually:**
1. SLP clicks empty slot on calendar
2. Booking modal: pick patient from caseload dropdown
3. Optional pre-session notes
4. Confirms → appointment created → caregiver notified

**Caregiver self-books:**
1. Caregiver clicks "Sessions" or opens `/sessions/book/[slpId]`
2. Sees weekly calendar of SLP's open slots
3. Taps a slot → confirmation modal
4. Confirms → appointment created → SLP notified

### 5.4 Cancellation

- **Caregiver cancels:** status → "cancelled", `cancelledBy` set. SLP notified. Slot reopens automatically.
- **SLP cancels:** same flow, caregiver notified.
- **No-show:** SLP marks after scheduled time passes. Tracked for documentation.
- Caregivers can cancel but cannot reschedule — they must rebook from available slots.

### 5.5 Calendar View

Weekly calendar (default) on `/sessions`:
- Color-coded blocks: available (green tonal), booked (primary teal), past (muted), cancelled (strikethrough)
- Toggle between week and day view
- Quick nav: today, previous/next week
- SLP sees all appointments across patients
- Caregiver sees only their own appointments

---

## 6. Post-Call Pipeline

### 6.1 Chained Action Pipeline

When the SLP ends the call, an asynchronous pipeline processes the recording:

```
Call ends
  → Convex mutation: appointment → "completed"
  → Create meetingRecord (status: "processing")
  → ctx.scheduler.runAfter(0, internal.sessions.fetchAudio, { meetingRecordId })

fetchAudio (Convex action, "use node")
  → Fetch audio file from LiveKit Track Egress storage
  → Store in Convex file storage
  → Update meetingRecord.audioFileId, status → "transcribing"
  → ctx.scheduler.runAfter(0, internal.sessions.transcribeAudio, { meetingRecordId })

transcribeAudio (Convex action, "use node")
  → Send audio to ElevenLabs Scribe v2 (existing STT integration pattern)
  → Store raw transcript in Convex file storage
  → Save transcript text to meetingRecord
  → Update status → "summarizing"
  → ctx.scheduler.runAfter(0, internal.sessions.generateNotes, { meetingRecordId })

generateNotes (Convex action, "use node")
  → Fetch patient context (name, age, diagnosis, active goals, last session)
  → Send transcript + context to Claude:
    1. Meeting summary (3-5 bullet points)
    2. SOAP note draft (Subjective, Objective, Assessment, Plan)
  → Save aiSummary to meetingRecord
  → Create sessionNote draft:
      - sessionType: "teletherapy"
      - status: "draft"
      - meetingRecordId: link back to source
      - Pre-filled SOAP fields from Claude output
  → Update meetingRecord → "complete"
  → Create in-app notification (type: "notes-ready")
  → Send "notes ready" email via @convex-dev/resend
```

### 6.2 Claude Prompt for SOAP Generation

```
Given this teletherapy session transcript between an SLP and a patient:
- Patient: {name}, {age}, {diagnosis}
- Active goals: {goal domains + targets}
- Previous session summary: {last session note}

Generate:
1. A concise meeting summary (3-5 bullet points)
2. A SOAP note draft:
   - Subjective: caregiver/patient reports from the conversation
   - Objective: observable behaviors, responses, accuracy noted
   - Assessment: progress toward goals mentioned
   - Plan: next steps discussed, homework assigned
```

### 6.3 Post-Call Notes View (`/sessions/[id]/notes`)

- **Processing indicator** — real-time status via Convex subscription
- **Meeting summary** — AI-generated bullet points
- **Full transcript** — scrollable, searchable
- **SOAP draft** — editable, same form as manual session notes. Review, adjust, sign.
- **Interaction log** — if content was shared: what was shown, patient responses

### 6.4 Error Handling

- If any step fails: `meetingRecord.status` → `"failed"`
- SLP sees "Processing failed — retry" button
- Retry re-schedules from the failed step (checks which artifacts already exist)
- Each step is independent — transcript can succeed while summary fails

---

## 7. Notifications

### 7.1 Email via `@convex-dev/resend` Component

```typescript
// convex/convex.config.ts
import resend from "@convex-dev/resend/convex.config.js";

const app = defineApp();
app.use(resend);
```

```typescript
// convex/notifications.ts
"use node";
import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";
import { render } from "@react-email/render";

export const resend = new Resend(components.resend, { testMode: false });
```

Email triggers:

| Event | Recipient | Timing |
|-------|-----------|--------|
| Appointment booked | Caregiver + SLP | Immediate |
| Appointment cancelled | Other party | Immediate |
| Upcoming reminder | Caregiver | 24 hours before |
| Upcoming reminder | Caregiver + SLP | 1 hour before |
| Session notes ready | SLP | When pipeline completes |

Email templates: React Email components in `src/features/sessions/emails/`, rendered to HTML via `@react-email/render` in Convex actions.

### 7.2 In-App Notifications

Notification bell in header/sidebar:
- Badge count of unread (Convex subscription — real-time)
- Dropdown panel with recent notifications
- Click to navigate to relevant page
- "Mark all read" action

### 7.3 Reminder Scheduling

```typescript
// Inside createAppointment mutation:
ctx.scheduler.runAt(scheduledAt - 24 * 60 * 60 * 1000, internal.notifications.sendReminder, {
  appointmentId, type: "24h"
});
ctx.scheduler.runAt(scheduledAt - 60 * 60 * 1000, internal.notifications.sendReminder, {
  appointmentId, type: "1h"
});
```

Each reminder action checks `appointment.status !== "cancelled"` before sending — no need to cancel scheduled functions on appointment cancellation.

---

## 8. Split-Screen Interactive Content

### 8.1 Content Sources

During a call, the SLP can share:

1. **Flashcards** — from existing flashcard feature. SLP picks a deck, cards sync to both screens.
2. **Therapy apps** — apps built in the Bridges builder. Bundled HTML loads in sandboxed iframes on both sides.
3. **Images** — from image library or AI-generated therapy images.

### 8.2 Data Channel Protocol

LiveKit data channels transport content state between participants. Payloads are `Uint8Array` — JSON must be serialized:

```typescript
// data-channel-codec.ts
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encode(message: InteractiveMessage): Uint8Array {
  return encoder.encode(JSON.stringify(message));
}

export function decode(payload: Uint8Array): InteractiveMessage {
  return JSON.parse(decoder.decode(payload));
}
```

**Topics** (filter messages on the single data channel):
- `"content"` — SLP → patient: content updates and controls
- `"interaction"` — patient → SLP: responses and interactions

**Message types:**

```typescript
// SLP → Patient
type ContentUpdate = {
  type: "content-update"
  contentType: "flashcard" | "app" | "image"
  payload: {
    // Flashcard: { front, back, imageUrl?, revealed }
    // App: { bundleUrl, appId }
    // Image: { url, alt, caption? }
  }
}

type ContentControl = {
  type: "content-next" | "content-previous" | "content-clear"
}

// Patient → SLP
type Interaction = {
  type: "interaction"
  action: string        // "tapped", "selected", "spoke", "dragged"
  target: string        // what they interacted with
  value?: unknown       // selection value, position, etc.
  timestamp: number
}
```

### 8.3 Hook: `use-interactive-sync.ts`

```typescript
import { useDataChannel } from '@livekit/components-react';

// SLP sends content updates
const { send: sendContent } = useDataChannel('content', onContentMessage);

// Patient sends interactions
const { send: sendInteraction } = useDataChannel('interaction', onInteractionMessage);
```

### 8.4 Layout

```
┌─────────────────────────────────────────┐
│  Video Tiles (SLP + Caregiver/Patient)  │
│  ┌──────────────┐  ┌──────────────┐     │
│  │   SLP cam    │  │ Patient cam  │     │
│  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────┤
│  Interactive Panel (synced via data ch) │
│  ┌─────────────────────────────────┐    │
│  │  Flashcard: "Apple"             │    │
│  │  [Show Next]  [Patient tapped!] │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

On desktop: side-by-side (video 2/3, content 1/3). On mobile: stacked.

### 8.5 App Sharing

For therapy apps built in the Bridges builder:
- SLP selects an app → both sides load the bundled HTML in a sandboxed iframe
- The iframe communicates with parent via `postMessage` (same pattern as `use-postmessage-bridge.ts`)
- App interactions relayed through data channels so SLP sees patient responses

### 8.6 Interaction Logging

All interactions buffered and saved to `meetingRecords.interactionLog` when the call ends. Feeds into SOAP note generation — Claude can reference accuracy data in the Assessment section.

---

## 9. Environment Variables

### Next.js (`.env.local`)

```
LIVEKIT_API_KEY=             # LiveKit Cloud dashboard
LIVEKIT_API_SECRET=          # LiveKit Cloud dashboard
NEXT_PUBLIC_LIVEKIT_URL=     # wss://your-app.livekit.cloud
```

### Convex Dashboard

```
RESEND_API_KEY=              # Resend dashboard (for @convex-dev/resend)
```

Existing keys (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`) are already configured.

---

## 10. New Dependencies

```json
{
  "livekit-server-sdk": "^2.15.0",
  "@livekit/components-react": "^2.x",
  "@livekit/components-styles": "^2.x",
  "livekit-client": "^2.x",
  "@convex-dev/resend": "latest",
  "@react-email/components": "latest",
  "@react-email/render": "latest",
  "resend": "latest"
}
```

---

## 11. Verification Notes

Verified against latest sources (2026-03-30):

1. **`useDataChannel`** — payloads must be `Uint8Array`, not JSON. Use `TextEncoder`/`TextDecoder` wrapper. Single data channel with topic filtering.
2. **`livekit-server-sdk` v2** — `toJwt()` is async (was sync `toJWT()` in v1). Import `AccessToken` from `livekit-server-sdk`.
3. **`LiveKitRoom` vs `SessionProvider`** — `SessionProvider`/`useSession` is `@beta` for AI agent use cases. `LiveKitRoom` + `VideoConference` is the stable path for video conferencing.
4. **Track Egress** — audio-only export is more efficient than Room Composite for transcription. Configure in LiveKit Cloud dashboard.
5. **`@convex-dev/resend`** — config import needs `.js` extension: `@convex-dev/resend/convex.config.js`. Requires `"use node"` in action files. Supports React Email rendering.
6. **`PreJoin`** — LiveKit's prefab handles lobby/camera-mic check. Props: `onSubmit`, `onValidate`, `persistUserChoices`.
