# Group C: Clinical Platform Improvements

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Session calendar time overflow fix, video call invite email, patient detail redesign, session note redesign, billing E2E completion

---

## Goals

- Fix mobile time overflow in the sessions calendar
- Add video call invite email flow using `@convex-dev/resend`
- Overhaul patient detail page with tabbed profile layout
- Overhaul session note editor with card-based wizard layout
- Complete billing E2E: manual record creation, superbill PDF download, batch mark-billed, route protection

---

## 1. Session Calendar — Time Box Overflow Fix

### Problem

At the `sm` breakpoint (640px+), `CalendarView` renders `grid-cols-7`, giving each day column ~91px. Time strings like "Open · 9:00 AM" and formatted `scheduledAt` values have no overflow constraint and push outside their containers.

### Fix

**`calendar-view.tsx`:**
- Add `overflow-hidden` to the day column `<div>` className
- Add `truncate` to the `<span>` inside the slot `<Button>` (the "Open · {time}" text)

**`appointment-card.tsx`:**
- Add `truncate` to the `formatDateTime` time line (`text-xs text-on-surface-variant tabular-nums`)

Three targeted additions — no layout, color, or spacing changes.

### Affected files
- `src/features/sessions/components/calendar-view.tsx`
- `src/features/sessions/components/appointment-card.tsx`

---

## 2. Sessions Page — Video Call Invite Email

### UI

A **"Send invite"** button added to the `SessionsPage` header actions row (SLP only, alongside the existing "Availability" button). Clicking opens `InviteEmailModal`.

**`InviteEmailModal` contents:**
- **Recipient toggle:** "Existing patient" (shadcn/ui `Select` of active patients showing caregiver email) or "New email" (free-text `Input`)
- **Message preview:** Read-only preview of the invite email copy, including the SLP's booking link (`/sessions/book/[slpId]`)
- **Send button** → calls `api.email.sendVideoCallInvite` action, dismisses modal on success, shows `toast.success`

### Backend

**New file: `convex/email.ts`**

```ts
import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";

const resend = new Resend(components.resend);

export const sendVideoCallInvite = action({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
    slpName: v.string(),
    bookingUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: "Bridges <noreply@bridges.ai>",
      to: args.toEmail,
      subject: `${args.slpName} invited you to a therapy session`,
      html: `
        <p>Hi${args.toName ? ` ${args.toName}` : ""},</p>
        <p>${args.slpName} has invited you to book a therapy session.</p>
        <p><a href="${args.bookingUrl}" style="...teal button styles...">Book your session</a></p>
      `,
    });
  },
});
```

**`convex/convex.config.ts`:** Add `resend` component (same pattern as existing `stripe` component).

**Implementer verify:** Confirm `@convex-dev/resend` is in `package.json`. Confirm `RESEND_API_KEY` is set in Convex dashboard env vars (check Bitwarden `Bridges – Resend` if not).

### Affected files
- `src/features/sessions/components/sessions-page.tsx` — add "Send invite" button
- `src/features/sessions/components/invite-email-modal.tsx` — new component
- `convex/email.ts` — new file
- `convex/convex.config.ts` — add resend component

---

## 3. Patient Detail Page — Visual Overhaul

### Problem

Current layout: flat grid of all widgets (profile, intake, clinical, timeline, materials, caregiver, home programs, child apps) with no hierarchy or scannability.

### New Layout

#### Hero strip (replaces back-button row)

Full-width strip at top:
- **Left:** Back chevron icon (`arrow_back`, icon only, links to `/patients`)
- **Center:** Patient avatar (initials circle, `h-16 w-16`, teal gradient), full name in `font-headline` display font, age + diagnosis tag (`rounded-full bg-surface-container px-2 py-0.5 text-xs`), communication level badge
- **Right:** "Start Session" CTA (teal gradient pill) + overflow menu (`⋮` `DropdownMenu`) containing: Create Material, Edit Profile

#### Tab navigation (sticky below hero)

shadcn/ui `Tabs` with 4 tabs:

| Tab | Content |
|-----|---------|
| **Overview** | `IntakeStatusWidget` + `CaregiverInfo` (left col) · `PatientProfileWidget` condensed (right col) |
| **Clinical** | `clinicalWidgets` slot (goals, plan of care, evaluations) |
| **Materials** | `AssignedMaterials` + `HomeProgramsWidget` + `ChildAppsSection` |
| **Notes** | `ActivityTimeline` + `QuickNotes` |

Two-column layout (`grid-cols-1 lg:grid-cols-2 gap-6`) inside Overview tab. Other tabs are single-column.

#### What doesn't change

All child widget components (`ActivityTimeline`, `AssignedMaterials`, `CaregiverInfo`, `HomeProgramsWidget`, `ChildAppsSection`, `PatientProfileWidget`, `IntakeStatusWidget`, `QuickNotes`) are **unchanged** — only their placement in the page layout changes.

### Affected files
- `src/features/patients/components/patient-detail-page.tsx` — full layout rebuild

---

## 4. New Session Note Page — Visual Overhaul

### Problem

`SessionNoteEditor` is a flat vertical form — date, type, targets, SOAP fields, signature all stack with no grouping, progress sense, or breathing room.

### New Layout

#### Two-column structure (desktop)

| Left (2/3) | Right (1/3) |
|-----------|------------|
| Form cards | Context panel |

Single column on mobile (right column hidden).

#### Left column — form cards

**Card 1 — Session header:**
- Date picker + session type selector + duration in one compact row
- Background: `bg-surface-container rounded-2xl p-4`

**Card 2 — Targets:**
- Header: "Targets worked on" label + count badge
- Body: `StructuredDataForm` (unchanged)
- Footer: "Add target" button

**Card 3 — SOAP Note:**
- Header: "SOAP Note" label + "Generate with AI" button (teal gradient, right-aligned)
- Body: shadcn/ui `Accordion` with four items: Subjective, Objective, Assessment, Plan
- `SoapPreview` renders inline below accordion when SOAP is generated

**Signature strip (sticky bottom):**
- Full width, `bg-background border-t`
- Left: Late-signature warning in amber (`AlertCircle` icon + days-late text) when applicable
- Right: "Sign & Save" primary button (teal gradient)

#### Right column — context panel

- Patient name + avatar (read-only, links to `/patients/[id]`)
- "Recent notes" — last 3 session note summaries (date + one-line SOAP snippet)
- "Active goals" — list of patient's current goals (links to goals tab on patient detail)

Right column data: `usePatient(patientId)` for name/avatar; `useSessionNotes({ patientId, limit: 3 })` for recent notes; goals from existing `useGoals` hook.

#### What doesn't change

`StructuredDataForm`, `SoapPreview`, `GroupPatientPicker`, `DurationPresetInput` — all unchanged, slot into new layout.

### Affected files
- `src/features/session-notes/components/session-note-editor.tsx` — layout rebuild

---

## 5. Clinical Billing — E2E Completion

### Gap 1: Manual Record Creation

**Problem:** Billing records only auto-create from signed session notes. No way to add a record for evals, consultations, phone calls, etc.

**Fix:** Add **"+ New Record"** button in `ClinicalBillingDashboard` header. Clicking opens `BillingRecordEditor` in **create mode** (currently only supports edit mode).

`BillingRecordEditor` in create mode adds:
- Patient picker (`Select` of active patients)
- Date input (defaults to today)
- CPT code + fee + modifiers (already present in edit mode)
- Creates a new `billingRecords` document with `status: "draft"` on submit

### Gap 2: Superbill PDF Download

**Problem:** `SuperbillViewer` shows the superbill but has no export.

**Fix:** Add **"Download PDF"** button using `window.print()` with a `@media print` CSS block scoped to the superbill content div.

Print styles:
```css
@media print {
  body > * { display: none; }
  #superbill-print-root { display: block !important; }
}
```

The superbill content div gets `id="superbill-print-root"`. No external PDF library needed.

### Gap 3: Batch Mark-Billed

**Problem:** No way to bulk-mark multiple finalized records as billed.

**Fix (Ready to Bill tab only):**
- Add a checkbox column (leftmost) to the finalized records table
- A `selectedIds: Set<Id<"billingRecords">>` state in `ClinicalBillingDashboard`
- When `selectedIds.size > 0`, a **"Mark X as billed"** action bar appears above the table (`sticky bottom-0 bg-background border-t p-3 flex justify-between`)
- Calls `markBilled` in a `Promise.all` loop

### Gap 4: Route Protection

**Problem:** `/billing` page is accessible to caregivers (QA critical bug, 2026-03-31).

**Fix:** One-line guard in `src/app/(app)/billing/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function BillingPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "slp") redirect("/builder");
  return <ClinicalBillingDashboard />;
}
```

### Affected files
- `src/app/(app)/billing/page.tsx` — role guard
- `src/features/billing/components/clinical-billing-dashboard.tsx` — "+ New Record" button, batch checkbox UI, action bar
- `src/features/billing/components/billing-record-editor.tsx` — create mode + patient picker
- `src/features/billing/components/superbill-viewer.tsx` — PDF download button + print styles

---

## 6. Affected Files Summary

### New files
- `src/features/sessions/components/invite-email-modal.tsx`
- `convex/email.ts`

### Modified files
- `src/features/sessions/components/sessions-page.tsx`
- `src/features/sessions/components/calendar-view.tsx`
- `src/features/sessions/components/appointment-card.tsx`
- `src/features/patients/components/patient-detail-page.tsx`
- `src/features/session-notes/components/session-note-editor.tsx`
- `src/features/billing/components/clinical-billing-dashboard.tsx`
- `src/features/billing/components/billing-record-editor.tsx`
- `src/features/billing/components/superbill-viewer.tsx`
- `src/app/(app)/billing/page.tsx`
- `convex/convex.config.ts`

### Test updates
- `calendar-view` tests — add mobile overflow assertions
- `session-note-editor` tests — update for new layout structure
- `patient-detail-page` tests — update for tab structure
- `clinical-billing-dashboard` tests — add create mode + batch tests

---

## 7. Out of Scope

- Group A (sidebar, routes, header)
- Group B (builder artifact, publish, flashcard picker)
- Group D (caregiver QA screenshots)
- Insurance clearinghouse / EDI claim submission
- Resend email template styling beyond functional HTML
