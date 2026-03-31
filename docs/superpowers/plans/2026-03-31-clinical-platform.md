# Clinical Platform Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix session calendar time overflow on mobile, add video call invite email via Resend, overhaul patient detail page with tabbed layout, overhaul session note editor with card layout, and complete billing E2E (manual records, PDF download, batch mark-billed, route protection).

**Architecture:** Five independent sub-features. Each can ship independently. Start with the smallest fixes (time overflow, billing route guard) and work up to the larger redesigns (patient detail, session note).

**Tech Stack:** Next.js 16, Convex (`@convex-dev/resend`), shadcn/ui (`Tabs`, `Accordion`, `Dialog`), Tailwind v4, Clerk v7 (`auth()` server-side), Vitest + RTL

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/features/sessions/components/calendar-view.tsx` | Modify | Add overflow-hidden + truncate |
| `src/features/sessions/components/appointment-card.tsx` | Modify | Add truncate to time line |
| `src/features/sessions/components/sessions-page.tsx` | Modify | Add Send Invite button |
| `src/features/sessions/components/invite-email-modal.tsx` | Create | Recipient toggle + send form |
| `convex/email.ts` | Create | sendVideoCallInvite action |
| `convex/convex.config.ts` | Modify | Add resend component |
| `src/features/patients/components/patient-detail-page.tsx` | Modify | Tabbed profile layout |
| `src/features/session-notes/components/session-note-editor.tsx` | Modify | Card-based two-column layout |
| `src/features/billing/components/clinical-billing-dashboard.tsx` | Modify | + New Record button, batch checkbox |
| `src/features/billing/components/billing-record-editor.tsx` | Modify | Create mode + patient picker |
| `src/features/billing/components/superbill-viewer.tsx` | Modify | PDF download button + print styles |
| `src/app/(app)/billing/page.tsx` | Modify | Role guard — SLP only |

---

## Task 1: Fix session calendar time overflow (mobile)

**Files:**
- Modify: `src/features/sessions/components/calendar-view.tsx`
- Modify: `src/features/sessions/components/appointment-card.tsx`

- [ ] **Step 1: Fix calendar-view.tsx**

In the day column `<div>`, add `overflow-hidden` to the className:

```tsx
// Find the day column div (around line 70):
<div
  key={dayStart}
  className={cn(
    "flex min-h-[200px] flex-col gap-2 rounded-xl p-3 overflow-hidden",
    isToday ? "bg-primary/5 ring-1 ring-primary/30" : "bg-surface-container",
    isPast && "opacity-60",
  )}
>
```

For the slot `<Button>`, add `truncate` and `min-w-0` to the inner span:

```tsx
<Button
  key={slot.timestamp}
  type="button"
  variant="outline"
  className="h-auto justify-start border-dashed border-[#3B7A57]/40 bg-[#3B7A57]/10 text-left text-on-surface hover:bg-[#3B7A57]/15 w-full overflow-hidden"
  onClick={() => onEmptySlotClick?.(slot.timestamp)}
>
  <span className="truncate text-sm font-medium min-w-0">
    Open · {formatTime(slot.startTime)}
  </span>
</Button>
```

- [ ] **Step 2: Fix appointment-card.tsx**

Add `truncate` to the time text:

```tsx
// Find the formatDateTime line (around line 68):
<p className="text-xs text-on-surface-variant tabular-nums truncate">
  {formatDateTime(appointment.scheduledAt)}
</p>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/sessions/components/calendar-view.tsx \
        src/features/sessions/components/appointment-card.tsx
git commit -m "fix(sessions): truncate time strings in calendar day columns to prevent mobile overflow"
```

---

## Task 2: Billing route protection

**Files:**
- Modify: `src/app/(app)/billing/page.tsx`

- [ ] **Step 1: Add role guard**

```tsx
// src/app/(app)/billing/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ClinicalBillingDashboard } from "@/features/billing/components/clinical-billing-dashboard";

export const metadata = { title: "Clinical Billing" };

export default async function BillingPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== "slp") redirect("/builder");
  return <ClinicalBillingDashboard />;
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(app)/billing/page.tsx"
git commit -m "fix(billing): restrict /billing route to SLP role only"
```

---

## Task 3: Superbill PDF download

**Files:**
- Modify: `src/features/billing/components/superbill-viewer.tsx`

- [ ] **Step 1: Read the current superbill-viewer.tsx**

Open `src/features/billing/components/superbill-viewer.tsx` to understand the current structure.

- [ ] **Step 2: Add print styles and download button**

Add a `<style>` tag with print media query and a Download PDF button to the superbill content area:

```tsx
// Inside the superbill content div, add at the top:
<style>{`
  @media print {
    body > * { display: none !important; }
    #superbill-print-root { display: block !important; }
  }
`}</style>

// Wrap the superbill content with:
<div id="superbill-print-root">
  {/* existing superbill content */}
</div>

// Add a Download PDF button in the dialog footer (or near the header):
<Button
  type="button"
  variant="outline"
  onClick={() => window.print()}
  className="gap-2"
>
  <MaterialIcon icon="download" size="sm" />
  Download PDF
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/billing/components/superbill-viewer.tsx
git commit -m "feat(billing): add Download PDF button to superbill viewer via window.print()"
```

---

## Task 4: Manual billing record creation

**Files:**
- Modify: `src/features/billing/components/clinical-billing-dashboard.tsx`
- Modify: `src/features/billing/components/billing-record-editor.tsx`

- [ ] **Step 1: Read billing-record-editor.tsx**

Open `src/features/billing/components/billing-record-editor.tsx` to understand current props and form fields.

- [ ] **Step 2: Add create mode to BillingRecordEditor**

The editor currently takes `recordId: Id<"billingRecords">`. Add optional create-mode props:

```tsx
// In BillingRecordEditorProps, change recordId to optional and add create mode:
interface BillingRecordEditorProps {
  recordId?: Id<"billingRecords"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

When `recordId` is null/undefined, render the form in create mode with an additional patient picker field using the existing `usePatients("active")` hook.

On submit in create mode, call a new Convex mutation `api.billingRecords.create` (check if it exists — if not, add it to `convex/billingRecords.ts`).

- [ ] **Step 3: Add "+ New Record" button to dashboard header**

In `ClinicalBillingDashboard`, add state and button:

```tsx
const [createOpen, setCreateOpen] = useState(false);

// In the header div alongside the existing h1:
<Button type="button" onClick={() => setCreateOpen(true)}>
  <MaterialIcon icon="add" size="sm" />
  New Record
</Button>

// After the existing BillingRecordEditor:
<BillingRecordEditor
  open={createOpen}
  onOpenChange={setCreateOpen}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/billing/components/clinical-billing-dashboard.tsx \
        src/features/billing/components/billing-record-editor.tsx
git commit -m "feat(billing): add manual billing record creation with patient picker"
```

---

## Task 5: Batch mark-billed

**Files:**
- Modify: `src/features/billing/components/clinical-billing-dashboard.tsx`

- [ ] **Step 1: Add checkbox column and batch action to Ready to Bill tab**

```tsx
// Add state in ClinicalBillingDashboard:
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelected = (id: string) =>
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

// Add checkbox header to TABLE_HEADERS (only shown in Ready to Bill tab):
// Conditionally render a <th> checkbox column — pass `showCheckbox` prop to control

// In the Ready to Bill tab, add batch action bar above the table:
{selectedIds.size > 0 && (
  <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-outline-variant/20 bg-background p-3 shadow-lg">
    <p className="text-sm text-on-surface-variant">
      {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
    </p>
    <Button
      type="button"
      onClick={async () => {
        await Promise.all(
          [...selectedIds].map((id) =>
            handleMarkBilled(id as Id<"billingRecords">)
          )
        );
        setSelectedIds(new Set());
      }}
      className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90"
    >
      Mark {selectedIds.size} as billed
    </Button>
  </div>
)}

// In BillingRecordRow for finalized records, add a leading checkbox cell:
// Pass onToggle and isSelected props to BillingRecordRow
```

**Note:** Pass `onToggle` and `isSelected` props to `BillingRecordRow`. Add those props to `BillingRecordRow`'s interface — they are optional (only used in the Ready to Bill tab).

- [ ] **Step 2: Commit**

```bash
git add src/features/billing/components/clinical-billing-dashboard.tsx
git commit -m "feat(billing): batch mark-billed with checkbox selection in Ready to Bill tab"
```

---

## Task 6: Video call invite email

**Files:**
- Modify: `convex/convex.config.ts`
- Create: `convex/email.ts`
- Create: `src/features/sessions/components/invite-email-modal.tsx`
- Modify: `src/features/sessions/components/sessions-page.tsx`

- [ ] **Step 1: Verify @convex-dev/resend is installed**

```bash
grep "@convex-dev/resend" package.json
```

If not present:
```bash
npm install @convex-dev/resend
```

- [ ] **Step 2: Add resend to convex.config.ts**

Open `convex/convex.config.ts` and add:

```ts
import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config";
// ... existing imports ...

const app = defineApp();
// ... existing component registrations ...
app.use(resend);
export default app;
```

- [ ] **Step 3: Create convex/email.ts**

```ts
// convex/email.ts
import { v } from "convex/values";
import { action } from "./_generated/server";
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
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #00595c; margin-bottom: 16px;">You're invited to a therapy session</h2>
          <p>Hi${args.toName ? ` ${args.toName}` : ""},</p>
          <p><strong>${args.slpName}</strong> has invited you to schedule a therapy session.</p>
          <a href="${args.bookingUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#00595c,#0d7377);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
            Book your session
          </a>
          <p style="margin-top:24px;color:#888;font-size:12px;">Powered by Bridges therapy platform</p>
        </div>
      `,
    });
  },
});
```

- [ ] **Step 4: Run convex dev to verify it compiles**

```bash
npx convex dev --once 2>&1 | tail -20
```
Expected: `email:sendVideoCallInvite` registered

- [ ] **Step 5: Create InviteEmailModal**

```tsx
// src/features/sessions/components/invite-email-modal.tsx
"use client";

import { useAction } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

import { api } from "../../../../convex/_generated/api";
import { usePatients } from "@/features/patients/hooks/use-patients";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { ROUTES } from "@/core/routes";

interface InviteEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteEmailModal({ open, onOpenChange }: InviteEmailModalProps) {
  const { user } = useUser();
  const slpName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Your therapist";
  const bookingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${ROUTES.SESSION_BOOK(user?.id ?? "")}`;

  const patients = usePatients("active");
  const sendInvite = useAction(api.email.sendVideoCallInvite);

  const [recipientType, setRecipientType] = useState<"patient" | "new">("patient");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [customEmail, setCustomEmail] = useState("");
  const [sending, setSending] = useState(false);

  const selectedPatient = patients?.find((p) => p._id === selectedPatientId);
  const toEmail =
    recipientType === "patient"
      ? selectedPatient?.caregiverEmail ?? ""
      : customEmail;
  const toName =
    recipientType === "patient"
      ? `${selectedPatient?.firstName ?? ""} ${selectedPatient?.lastName ?? ""}`.trim()
      : undefined;

  const handleSend = async () => {
    if (!toEmail) return;
    setSending(true);
    try {
      await sendInvite({ toEmail, toName, slpName, bookingUrl });
      toast.success("Invite sent!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to send invite — please try again");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send video call invite</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex gap-2">
            {(["patient", "new"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRecipientType(t)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  recipientType === t
                    ? "border-primary bg-primary text-white"
                    : "border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {t === "patient" ? "Existing patient" : "New email"}
              </button>
            ))}
          </div>

          {recipientType === "patient" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="patient-select">Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger id="patient-select">
                  <SelectValue placeholder="Select a patient…" />
                </SelectTrigger>
                <SelectContent>
                  {(patients ?? []).map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.firstName} {p.lastName}
                      {p.caregiverEmail && (
                        <span className="ml-2 text-xs text-on-surface-variant">
                          ({p.caregiverEmail})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-email">Email address</Label>
              <Input
                id="custom-email"
                type="email"
                placeholder="caregiver@example.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            </div>
          )}

          <div className="rounded-xl bg-surface-container p-3 text-xs text-on-surface-variant">
            <p className="font-medium text-on-surface mb-1">Preview</p>
            <p>From: {slpName}</p>
            <p>To: {toEmail || "—"}</p>
            <p className="mt-1">Subject: {slpName} invited you to a therapy session</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!toEmail || sending}
            className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90"
          >
            {sending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Note:** `patients` must have a `caregiverEmail` field. Check the Convex `patients` schema — if `caregiverEmail` isn't a top-level field, read from the `caregiverInfo` relation. Adjust the field access accordingly.

- [ ] **Step 6: Add Send Invite button to SessionsPage**

In `sessions-page.tsx`, import `InviteEmailModal` and add state + button:

```tsx
import { InviteEmailModal } from "./invite-email-modal";

// Add state:
const [inviteOpen, setInviteOpen] = useState(false);

// In the header actions div, after the Availability button (SLP only):
{isSLP && (
  <Button type="button" variant="outline" onClick={() => setInviteOpen(true)}>
    <MaterialIcon icon="send" size="sm" />
    Send invite
  </Button>
)}

// At end of return, before closing </div>:
<InviteEmailModal open={inviteOpen} onOpenChange={setInviteOpen} />
```

- [ ] **Step 7: Commit**

```bash
git add convex/email.ts convex/convex.config.ts \
        src/features/sessions/components/invite-email-modal.tsx \
        src/features/sessions/components/sessions-page.tsx
git commit -m "feat(sessions): add Send Invite button with Resend email via @convex-dev/resend"
```

---

## Task 7: Patient detail page — tabbed layout

**Files:**
- Modify: `src/features/patients/components/patient-detail-page.tsx`

- [ ] **Step 1: Update patient-detail-page.tsx**

```tsx
// src/features/patients/components/patient-detail-page.tsx
"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, use, useState } from "react";

import { ChildAppsSection } from "@/shared/components/child-apps-section";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { cn } from "@/core/utils";

import type { Id } from "../../../../convex/_generated/dataModel";
import { IntakeStatusWidget } from "@/features/intake/components/intake-status-widget";
import { usePatient } from "../hooks/use-patients";
import { ActivityTimeline } from "./activity-timeline";
import { AssignedMaterials } from "./assigned-materials";
import { CaregiverInfo } from "./caregiver-info";
import { CreateMaterialButton } from "./create-material-button";
import { HomeProgramsWidget } from "./home-programs-widget";
import { PatientProfileWidget } from "./patient-profile-widget";
import { QuickNotes } from "./quick-notes";

interface PatientDetailPageProps {
  paramsPromise: Promise<{ id: string }>;
  clinicalWidgets?: (patientId: Id<"patients">) => ReactNode;
}

export function PatientDetailPage({ paramsPromise, clinicalWidgets }: PatientDetailPageProps) {
  const { id } = use(paramsPromise);
  const patient = usePatient(id as Id<"patients">);
  const [tab, setTab] = useState("overview");

  if (patient === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (patient === null) notFound();

  const initials = [patient.firstName?.[0], patient.lastName?.[0]]
    .filter(Boolean).join("").toUpperCase() || "P";

  return (
    <div className="flex flex-col">
      {/* Hero strip */}
      <div className="flex items-center gap-4 border-b border-outline-variant/10 bg-surface-container/40 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/patients" aria-label="Back to Caseload">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MaterialIcon icon="arrow_back" size="sm" />
          </Button>
        </Link>

        {/* Avatar + name */}
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-xl font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="font-headline text-xl font-semibold text-on-surface truncate">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {patient.dateOfBirth && (
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                  {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} yrs
                </span>
              )}
              {patient.communicationLevel && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {patient.communicationLevel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90">
            <Link href={`/patients/${patient._id}/collect`}>
              <MaterialIcon icon="play_circle" size="sm" />
              Start Session
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MaterialIcon icon="more_vert" size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <CreateMaterialButton patientId={patient._id} asMenuItem />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1">
        <TabsList className="sticky top-14 z-30 w-full justify-start rounded-none border-b border-outline-variant/10 bg-background px-4 sm:px-6 lg:px-8 h-11">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <IntakeStatusWidget patientId={patient._id} />
              <CaregiverInfo patientId={patient._id} />
            </div>
            <div>
              <PatientProfileWidget patient={patient} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="p-4 sm:p-6 lg:p-8">
          {clinicalWidgets?.(patient._id) ?? (
            <p className="text-sm text-on-surface-variant">No clinical data yet.</p>
          )}
        </TabsContent>

        <TabsContent value="materials" className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            <AssignedMaterials patientId={patient._id} />
            <HomeProgramsWidget patientId={patient._id} />
            <ChildAppsSection patientId={patient._id} />
          </div>
        </TabsContent>

        <TabsContent value="notes" className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            <ActivityTimeline patientId={patient._id} />
            <QuickNotes patient={patient} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Note:** `CreateMaterialButton` may need an `asMenuItem?: boolean` prop to render as a `DropdownMenuItem` child. Check its current implementation — if it renders a `<Button>`, wrap it with `DropdownMenuItem` directly in the `DropdownMenuContent` instead.

- [ ] **Step 2: Run patient detail tests**

```bash
npm test -- src/features/patients/components/__tests__/ 2>&1 | tail -20
```
Fix any snapshot or assertion failures from the layout change.

- [ ] **Step 3: Commit**

```bash
git add src/features/patients/components/patient-detail-page.tsx
git commit -m "feat(patients): tabbed profile layout — Overview, Clinical, Materials, Notes"
```

---

## Task 8: Session note editor — card-based layout

**Files:**
- Modify: `src/features/session-notes/components/session-note-editor.tsx`

- [ ] **Step 1: Read the full session-note-editor.tsx**

Open `src/features/session-notes/components/session-note-editor.tsx` and map all current state variables and form fields before rewriting the layout.

- [ ] **Step 2: Restructure the layout**

The session note editor has complex state — preserve all existing state variables, hooks, and submit logic exactly. Only change the JSX layout structure.

Wrap the existing content in a two-column grid:

```tsx
// Replace the return JSX structure with:
return (
  <div className="flex flex-col min-h-full">
    {/* Main content area */}
    <div className="flex flex-1 flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8 pb-20">

      {/* Left column — form cards (2/3) */}
      <div className="flex flex-1 flex-col gap-4 lg:max-w-[66%]">

        {/* Card 1: Session header */}
        <div className="rounded-2xl bg-surface-container p-4 flex flex-col gap-4">
          {/* Existing: date input + session type select + duration */}
          {/* Move existing date/type/duration fields here */}
        </div>

        {/* Card 2: Targets */}
        <div className="rounded-2xl bg-surface-container p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-on-surface">Targets worked on</h2>
          </div>
          <StructuredDataForm {/* existing props */} />
        </div>

        {/* Card 3: SOAP Note */}
        <div className="rounded-2xl bg-surface-container p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-on-surface">SOAP Note</h2>
            {/* Existing generate SOAP button — move here, apply teal gradient */}
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateSoap}
              disabled={isGeneratingSoap}
              className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90 h-8 text-xs"
            >
              {isGeneratingSoap ? "Generating…" : "Generate with AI"}
            </Button>
          </div>
          <Accordion type="multiple" defaultValue={["subjective"]}>
            <AccordionItem value="subjective">
              <AccordionTrigger className="text-sm">Subjective</AccordionTrigger>
              <AccordionContent>{/* existing S field */}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="objective">
              <AccordionTrigger className="text-sm">Objective</AccordionTrigger>
              <AccordionContent>{/* existing O field */}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="assessment">
              <AccordionTrigger className="text-sm">Assessment</AccordionTrigger>
              <AccordionContent>{/* existing A field */}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="plan">
              <AccordionTrigger className="text-sm">Plan</AccordionTrigger>
              <AccordionContent>{/* existing P field */}</AccordionContent>
            </AccordionItem>
          </Accordion>
          {soapNote && <SoapPreview soap={soapNote} />}
        </div>
      </div>

      {/* Right column — context panel (1/3), hidden on mobile */}
      <div className="hidden lg:flex lg:w-80 shrink-0 flex-col gap-4">
        {/* Patient card */}
        <div className="rounded-2xl bg-surface-container p-4">
          <Link href={`/patients/${patientId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-white">
              {patientInitials}
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">{patient?.firstName} {patient?.lastName}</p>
              <p className="text-xs text-on-surface-variant">View profile →</p>
            </div>
          </Link>
        </div>
        {/* Recent notes — rendered as simple list of date + first line of SOAP */}
        {/* Active goals list */}
      </div>
    </div>

    {/* Signature strip — sticky bottom */}
    <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-outline-variant/10 bg-background px-4 py-3 sm:px-6 lg:px-8">
      {isLateSignature(note) && (
        <div className="flex items-center gap-2 text-amber-600">
          <MaterialIcon icon="warning" size="sm" />
          <span className="text-xs">{getSignatureDelayDays(note)} days late</span>
        </div>
      )}
      <div className="ml-auto">
        <Button
          type="button"
          onClick={handleSign}
          disabled={isSigning}
          className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90"
        >
          {isSigning ? "Signing…" : "Sign & Save"}
        </Button>
      </div>
    </div>
  </div>
);
```

**Important:** The `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` must be imported from `@/shared/components/ui/accordion`. Add them with `npx shadcn@latest add accordion` if not present.

- [ ] **Step 3: Add accordion if not installed**

```bash
grep -r "AccordionItem" src/shared/components/ui/ | head -3
# If no output:
npx shadcn@latest add accordion
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/features/session-notes/components/__tests__/ 2>&1 | tail -20
```
Fix layout-related test failures.

- [ ] **Step 5: Commit**

```bash
git add src/features/session-notes/components/session-note-editor.tsx
git commit -m "feat(session-notes): card-based two-column layout with SOAP accordion and sticky signature strip"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test 2>&1 | tail -20
```
Expected: All tests pass

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors
