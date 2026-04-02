# SLP Tools Builder — Plan 3: Publish Panel + SLP Data Visibility

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the publish sheet to a full QR + patient assignment + "Open in Session" panel; add IEP goal tags; produce auto-generated session note copy; and surface time-filtered tool activity on patient profiles and My Tools.

**Architecture:** The minimal `PublishSheet` from Plan 1 is upgraded in place. Schema gains `goalTags` and `lastActivityAt` on `app_instances`. `logEvent` patches `lastActivityAt` denormalized onto the instance record (avoids cross-patient N+1 joins). A pure `formatSessionNote` utility (no Convex/React) formats session data for EMR copy-paste — it is imported by Plan 2's session overlay. `ToolActivitySummary` (already on patient profile) gets time-filter tabs, a completion rate bar, and goal tag pills. My Tools tool cards get an activity badge from the new `lastActivityAt` field.

**Tech Stack:** React, Convex, `qrcode.react` (new dependency), shadcn/ui (Select, Sheet), Vitest

**Depends on:** Plan 1 (PublishSheet stub), Plan 2 (SessionOverlay calls formatSessionNote)

---

## File Map

**Install:**
- `qrcode.react` — QR code component

**Schema changes:**
- `convex/schema.ts` — add `goalTags`, `lastActivityAt` to `app_instances`; add `sessionId`, `eventSource` to `tool_events`

**Convex changes:**
- `convex/tools.ts` — add `goalTags` + `patientId` to `update` mutation (make `configJson` optional); patch `lastActivityAt` in `logEvent`; add `goalTags` to `getEventSummaryByPatient` return

**New files:**
- `src/features/tools/lib/session-note-formatter.ts` — pure formatter, no deps
- `src/features/tools/lib/__tests__/session-note-formatter.test.ts`
- `src/features/tools/components/builder/goal-tags-editor.tsx`
- `src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx`

**Modify:**
- `src/features/tools/components/builder/publish-sheet.tsx` — full upgrade: QR, patient dropdown, Open in Session, unpublish
- `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx` — update
- `src/features/tools/hooks/use-tool-builder.ts` — add `unpublish` function; extend `PublishSheet` props
- `src/features/tools/components/builder/tool-builder-wizard.tsx` — pass new props to PublishSheet; add GoalTagsEditor to Content tab
- `src/features/patients/components/tool-activity-summary.tsx` — time filter tabs, completion rate bar, goal tag pills
- `src/features/patients/components/__tests__/tool-activity-summary.test.tsx` — update
- `src/features/my-tools/components/my-tools-page.tsx` — activity badge per tool card

---

## Task 1: Install qrcode.react

**Files:**
- `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1.1: Install package**

```bash
cd /Users/desha/Springfield-Vibeathon
pnpm add qrcode.react
```

- [ ] **Step 1.2: Verify it resolves**

```bash
npx tsc --noEmit 2>&1 | grep qrcode
```

Expected: no errors.

- [ ] **Step 1.3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install qrcode.react for publish panel QR code"
```

---

## Task 2: Schema changes — goalTags, lastActivityAt, sessionId, eventSource

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 2.1: Add fields to app_instances and tool_events**

In `convex/schema.ts`, find the `app_instances` table and add after `publishedAt: v.optional(v.number())`:

```typescript
goalTags: v.optional(v.array(v.string())),
lastActivityAt: v.optional(v.number()),
```

Find the `tool_events` table and add after `eventPayloadJson: v.optional(v.string())`:

```typescript
sessionId: v.optional(v.string()),
eventSource: v.optional(v.union(v.literal("child"), v.literal("slp"))),
```

- [ ] **Step 2.2: Verify Convex types regenerate**

```bash
npx convex dev --once 2>&1 | tail -20
```

Expected: no errors, schema deploys.

- [ ] **Step 2.3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add goalTags + lastActivityAt to app_instances; sessionId + eventSource to tool_events"
```

---

## Task 3: Update Convex tools functions

**Files:**
- Modify: `convex/tools.ts`

Three changes:
1. `update` mutation — accept `goalTags` and `patientId`; make `configJson` optional (publish panel sets patient without re-sending config)
2. `logEvent` mutation — patch `lastActivityAt: Date.now()` on the instance
3. `getEventSummaryByPatient` query — include `goalTags` in the returned summaries

- [ ] **Step 3.1: Update the `update` mutation**

```typescript
export const update = mutation({
  args: {
    id: v.id("app_instances"),
    configJson: v.optional(v.string()),        // optional: not required when only updating metadata
    title: v.optional(v.string()),
    patientId: v.optional(v.id("patients")),   // ← new: patient assignment from publish panel
    goalTags: v.optional(v.array(v.string())), // ← new: IEP goal tags
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    await ctx.db.patch(args.id, {
      ...(args.configJson !== undefined ? { configJson: args.configJson } : {}),
      ...(args.title !== undefined ? { title: args.title, titleLower: normalizeTitle(args.title) } : {}),
      ...(args.patientId !== undefined ? { patientId: args.patientId } : {}),
      ...(args.goalTags !== undefined ? { goalTags: args.goalTags } : {}),
    });
  },
});
```

- [ ] **Step 3.2: Update logEvent to patch lastActivityAt**

In the `logEvent` mutation handler, after the `ctx.db.insert("tool_events", ...)` call, add:

```typescript
// Patch lastActivityAt on the instance for the My Tools activity badge
await ctx.db.patch(instance._id, { lastActivityAt: Date.now() });
```

The full updated logEvent handler:

```typescript
export const logEvent = mutation({
  args: {
    shareToken: v.string(),
    eventType: v.union(
      v.literal("app_opened"),
      v.literal("item_tapped"),
      v.literal("answer_correct"),
      v.literal("answer_incorrect"),
      v.literal("activity_completed"),
      v.literal("token_added"),
      v.literal("audio_played"),
      v.literal("app_closed")
    ),
    eventPayloadJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db
      .query("app_instances")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();
    if (!instance) return;

    await ctx.db.insert("tool_events", {
      appInstanceId: instance._id,
      ...(instance.patientId !== undefined ? { patientId: instance.patientId } : {}),
      eventType: args.eventType,
      eventPayloadJson: args.eventPayloadJson,
    });

    await ctx.db.patch(instance._id, { lastActivityAt: Date.now() });
  },
});
```

- [ ] **Step 3.3: Update getEventSummaryByPatient to include goalTags**

In `getEventSummaryByPatient`, the `summaries` map currently returns `{ appInstanceId, title, templateType, status, shareToken, totalEvents, completions, interactions, lastActivityAt }`. Add `goalTags`:

```typescript
return {
  appInstanceId: instance._id,
  title: instance.title,
  templateType: instance.templateType,
  status: instance.status,
  shareToken: instance.shareToken,
  goalTags: instance.goalTags,          // ← add
  totalEvents: events.length,
  completions,
  interactions,
  lastActivityAt: lastEvent?._creationTime ?? null,
};
```

- [ ] **Step 3.4: Verify types**

```bash
npx tsc --noEmit 2>&1 | grep "convex/tools"
```

Expected: no output.

- [ ] **Step 3.5: Commit**

```bash
git add convex/tools.ts
git commit -m "feat(convex): update mutation accepts goalTags+patientId; logEvent patches lastActivityAt; getEventSummaryByPatient includes goalTags"
```

---

## Task 4: Session note formatter

**Files:**
- Create: `src/features/tools/lib/session-note-formatter.ts`
- Create: `src/features/tools/lib/__tests__/session-note-formatter.test.ts`

This pure utility is imported by Plan 2's `SessionOverlay` for the "add note" copy. No Convex or React dependencies.

- [ ] **Step 4.1: Write failing tests**

```typescript
// src/features/tools/lib/__tests__/session-note-formatter.test.ts
import { describe, expect, it } from "vitest";
import { formatSessionNote } from "../session-note-formatter";

const now = Date.now();
const events = [
  { type: "item_tapped", payloadJson: JSON.stringify({ label: "more" }), timestamp: now },
  { type: "item_tapped", payloadJson: JSON.stringify({ label: "more" }), timestamp: now },
  { type: "token_added", timestamp: now },
  { type: "activity_completed", timestamp: now },
];

describe("formatSessionNote", () => {
  it("includes tool title and template type", () => {
    const note = formatSessionNote({
      toolTitle: "Marcus Token Board",
      templateType: "token_board",
      durationSeconds: 503,
      events,
    });
    expect(note).toContain("Marcus Token Board");
    expect(note).toContain("Token Board");
  });

  it("formats duration correctly", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 503, events: [],
    });
    expect(note).toContain("8 min 23 sec");
  });

  it("counts total interactions", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events,
    });
    expect(note).toContain("4 total");
  });

  it("counts completions", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events,
    });
    expect(note).toContain("1 completion");
  });

  it("includes goal tags when provided", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events: [],
      goalTags: ["positive reinforcement", "on-task behavior"],
    });
    expect(note).toContain("positive reinforcement");
    expect(note).toContain("on-task behavior");
  });

  it("omits goal tags line when none provided", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events: [],
    });
    expect(note).not.toContain("Goal");
  });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/lib/__tests__/session-note-formatter.test.ts" 2>&1 | tail -15
```

Expected: FAIL — module not found.

- [ ] **Step 4.3: Implement the formatter**

```typescript
// src/features/tools/lib/session-note-formatter.ts

const TEMPLATE_NAMES: Record<string, string> = {
  aac_board: "AAC Communication Board",
  first_then_board: "First / Then Board",
  token_board: "Token Board",
  visual_schedule: "Visual Schedule",
  matching_game: "Matching Game",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} sec`;
}

export interface SessionNoteEvent {
  type: string;
  payloadJson?: string;
  timestamp: number;
}

export function formatSessionNote(args: {
  toolTitle: string;
  templateType: string;
  durationSeconds: number;
  events: SessionNoteEvent[];
  goalTags?: string[];
}): string {
  const { toolTitle, templateType, durationSeconds, events, goalTags } = args;
  const templateName = TEMPLATE_NAMES[templateType] ?? templateType;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const completions = events.filter((e) => e.type === "activity_completed").length;
  const totalInteractions = events.length;

  const lines = [
    `Session date: ${today}`,
    `Tool: ${toolTitle} (${templateName})`,
    `Duration: ${formatDuration(durationSeconds)}`,
    `Data: ${totalInteractions} total interactions · ${completions} completion${completions !== 1 ? "s" : ""}`,
  ];

  if (goalTags && goalTags.length > 0) {
    lines.push(`Goal tags: ${goalTags.join(", ")}`);
  }

  lines.push("Notes: ");

  return lines.join("\n");
}
```

- [ ] **Step 4.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/lib/__tests__/session-note-formatter.test.ts" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/features/tools/lib/session-note-formatter.ts src/features/tools/lib/__tests__/session-note-formatter.test.ts
git commit -m "feat(tools): add pure session note formatter utility"
```

---

## Task 5: GoalTagsEditor component

**Files:**
- Create: `src/features/tools/components/builder/goal-tags-editor.tsx`
- Create: `src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx`
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx` — add GoalTagsEditor below ConfigEditor in Content tab

- [ ] **Step 5.1: Write failing tests**

```typescript
// src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { update: "tools:update" } } }));

import { GoalTagsEditor } from "../goal-tags-editor";
import type { Id } from "@convex/_generated/dataModel";

describe("GoalTagsEditor", () => {
  const instanceId = "inst-1" as Id<"app_instances">;

  it("renders existing tags as pills", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={["articulation", "/s/ production"]} />);
    expect(screen.getByText("articulation")).toBeInTheDocument();
    expect(screen.getByText("/s/ production")).toBeInTheDocument();
  });

  it("adds a new tag on Enter", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={[]} />);
    const input = screen.getByPlaceholderText(/add a goal/i);
    fireEvent.change(input, { target: { value: "requesting" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("requesting")).toBeInTheDocument();
  });

  it("removes a tag when × is clicked", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={["articulation"]} />);
    fireEvent.click(screen.getByRole("button", { name: /remove articulation/i }));
    expect(screen.queryByText("articulation")).not.toBeInTheDocument();
  });

  it("does not add empty or duplicate tags", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={["requesting"]} />);
    const input = screen.getByPlaceholderText(/add a goal/i);
    fireEvent.change(input, { target: { value: "requesting" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByText("requesting").length).toBe(1);
  });
});
```

- [ ] **Step 5.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx" 2>&1 | tail -15
```

Expected: FAIL — module not found.

- [ ] **Step 5.3: Implement GoalTagsEditor**

```tsx
// src/features/tools/components/builder/goal-tags-editor.tsx
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useCallback, useState } from "react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface GoalTagsEditorProps {
  instanceId: Id<"app_instances">;
  initialTags: string[];
}

export function GoalTagsEditor({ instanceId, initialTags }: GoalTagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const updateTool = useMutation(api.tools.update);

  const persist = useCallback(
    (nextTags: string[]) => {
      void updateTool({ id: instanceId, goalTags: nextTags });
    },
    [instanceId, updateTool]
  );

  const addTag = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setInput("");
      return;
    }
    const next = [...tags, trimmed];
    setTags(next);
    persist(next);
    setInput("");
  }, [input, tags, persist]);

  const removeTag = useCallback(
    (tag: string) => {
      const next = tags.filter((t) => t !== tag);
      setTags(next);
      persist(next);
    },
    [tags, persist]
  );

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium">Goal tags</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.map((tag) => (
          <span key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {tag}
            <button
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-primary/60 hover:text-primary transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        placeholder="Add a goal tag… (press Enter)"
        className="h-8 text-xs"
      />
    </div>
  );
}
```

- [ ] **Step 5.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5.5: Add GoalTagsEditor to Content tab in tool-builder-wizard.tsx**

In `src/features/tools/components/builder/tool-builder-wizard.tsx`, import GoalTagsEditor and add it below ConfigEditor in the Content tab. The Content tab's `TabsContent` becomes:

```tsx
import { GoalTagsEditor } from "./goal-tags-editor";

// Inside Content TabsContent:
<TabsContent value="content" className="flex-1 overflow-y-auto p-4 mt-0">
  <ConfigEditor
    templateType={builder.templateType}
    config={builder.config}
    onChange={builder.updateConfig}
  />
  {builder.instanceId && (
    <div className="mt-6 pt-4 border-t border-border">
      <GoalTagsEditor
        instanceId={builder.instanceId}
        initialTags={(builder.config as { goalTags?: string[] })?.goalTags ?? []}
      />
    </div>
  )}
</TabsContent>
```

- [ ] **Step 5.6: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "goal-tags\|tool-builder-wizard"
```

Expected: no output.

- [ ] **Step 5.7: Commit**

```bash
git add src/features/tools/components/builder/goal-tags-editor.tsx src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx src/features/tools/components/builder/tool-builder-wizard.tsx
git commit -m "feat(tools): add GoalTagsEditor component + integrate into Content tab"
```

---

## Task 6: Full PublishSheet upgrade

**Files:**
- Modify: `src/features/tools/components/builder/publish-sheet.tsx`
- Modify: `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx`
- Modify: `src/features/tools/hooks/use-tool-builder.ts` — add `unpublish` function
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx` — pass new PublishSheet props

The Plan 1 stub PublishSheet had props: `{ open, onClose, isSaving, publishedShareToken, onPublish }`. This task adds: `{ instanceId, patientId, onSelectPatient, onUnpublish }`.

- [ ] **Step 6.1: Write failing tests**

Replace `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx` entirely:

```typescript
// src/features/tools/components/builder/__tests__/publish-sheet.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => [
    { _id: "patient-1", firstName: "Liam", lastName: "Chen" },
  ]),
}));
vi.mock("@convex/_generated/api", () => ({
  api: { patients: { list: "patients:list" } },
}));
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr-code" data-value={value} />,
}));

import { PublishSheet } from "../publish-sheet";
import type { Id } from "@convex/_generated/dataModel";

const onPublish = vi.fn().mockResolvedValue("tok-abc");
const onClose = vi.fn();
const onSelectPatient = vi.fn();
const onUnpublish = vi.fn();

const baseProps = {
  open: true,
  onClose,
  isSaving: false,
  publishedShareToken: null,
  instanceId: "inst-1" as Id<"app_instances">,
  patientId: null,
  onSelectPatient,
  onPublish,
  onUnpublish,
};

describe("PublishSheet — unpublished state", () => {
  it("shows Publish app button when not yet published", () => {
    render(<PublishSheet {...baseProps} />);
    expect(screen.getByRole("button", { name: /publish app/i })).toBeInTheDocument();
  });

  it("calls onPublish when button clicked", async () => {
    render(<PublishSheet {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /publish app/i }));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
  });
});

describe("PublishSheet — published state", () => {
  const published = { ...baseProps, publishedShareToken: "tok-abc" };

  it("shows QR code", () => {
    render(<PublishSheet {...published} />);
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });

  it("shows patient dropdown", () => {
    render(<PublishSheet {...published} />);
    expect(screen.getByText(/assign to child/i)).toBeInTheDocument();
    expect(screen.getByText("Liam Chen")).toBeInTheDocument();
  });

  it("shows Open in Session button that links to ?session=true URL", () => {
    render(<PublishSheet {...published} />);
    const btn = screen.getByRole("link", { name: /open in session/i });
    expect(btn).toHaveAttribute("href", expect.stringContaining("?session=true"));
  });

  it("shows unpublish button", () => {
    render(<PublishSheet {...published} />);
    expect(screen.getByRole("button", { name: /unpublish/i })).toBeInTheDocument();
  });

  it("calls onUnpublish when unpublish clicked", () => {
    render(<PublishSheet {...published} />);
    fireEvent.click(screen.getByRole("button", { name: /unpublish/i }));
    expect(onUnpublish).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/publish-sheet.test.tsx" 2>&1 | tail -15
```

Expected: FAIL — missing props, no QR code, no patient dropdown.

- [ ] **Step 6.3: Implement the upgraded PublishSheet**

```tsx
// src/features/tools/components/builder/publish-sheet.tsx
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/shared/components/ui/sheet";

interface PublishSheetProps {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  publishedShareToken: string | null;
  instanceId: Id<"app_instances"> | null;
  patientId: Id<"patients"> | null;
  onSelectPatient: (id: Id<"patients">) => void;
  onPublish: () => Promise<string | null>;
  onUnpublish: () => Promise<void>;
}

export function PublishSheet({
  open, onClose, isSaving, publishedShareToken,
  instanceId: _instanceId, patientId, onSelectPatient,
  onPublish, onUnpublish,
}: PublishSheetProps) {
  const [copied, setCopied] = useState(false);
  const patients = useQuery(api.patients.list, {}) ?? [];

  const shareUrl = publishedShareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/apps/${publishedShareToken}`
    : null;
  const sessionUrl = shareUrl ? `${shareUrl}?session=true` : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Publish app</SheetTitle>
          <SheetDescription>
            Share with caregivers or open directly in your session.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 mt-6">
          {!publishedShareToken ? (
            <Button className="w-full" disabled={isSaving} onClick={() => void onPublish()}>
              {isSaving ? "Publishing…" : "Publish app"}
            </Button>
          ) : (
            <>
              {/* Open in Session — primary CTA */}
              <a
                href={sessionUrl!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Session"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-[#00595c] to-[#0d7377] hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Session
              </a>

              {/* Share link */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Share link
                </Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <span className="flex-1 truncate font-mono text-xs">{shareUrl}</span>
                  <Button variant="ghost" size="sm" onClick={() => void handleCopy()}>
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* QR code */}
              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG value={shareUrl!} size={120} />
                <p className="text-xs text-muted-foreground">Scan to open on child&apos;s tablet</p>
              </div>

              {/* Assign to child */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium">Assign to child (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Attaches usage data to their profile for session notes.
                </p>
                <Select
                  value={patientId ?? "__none__"}
                  onValueChange={(v) => {
                    if (v !== "__none__") onSelectPatient(v as Id<"patients">);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from caseload…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {patients.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unpublish */}
              <div className="pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void onUnpublish()}
                >
                  Unpublish
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 6.4: Add `unpublish` to useToolBuilder and pass new props**

In `src/features/tools/hooks/use-tool-builder.ts`, add the `archive` mutation and `unpublish` function:

```typescript
// Add import at top
import { api } from "@convex/_generated/api";

// Inside useToolBuilder, add:
const archiveInstance = useMutation(api.tools.archive);

const unpublish = useCallback(async () => {
  const { instanceId } = state;
  if (!instanceId) return;
  setState((s) => ({ ...s, isSaving: true }));
  try {
    await archiveInstance({ id: instanceId });
    setState((s) => ({ ...s, publishedShareToken: null, isSaving: false }));
  } catch {
    setState((s) => ({ ...s, isSaving: false }));
  }
}, [state, archiveInstance]);

// Return it from the hook:
return { ...state, selectPatient, selectTemplate, openPublish, closePublish, updateConfig, updateAppearance, saveAndAdvance, publish, unpublish };
```

- [ ] **Step 6.5: Update ToolBuilderWizard to pass new props to PublishSheet**

In `src/features/tools/components/builder/tool-builder-wizard.tsx`, update the PublishSheet invocation:

```tsx
<PublishSheet
  open={builder.isPublishOpen}
  onClose={builder.closePublish}
  isSaving={builder.isSaving}
  publishedShareToken={builder.publishedShareToken}
  instanceId={builder.instanceId}
  patientId={builder.patientId}
  onSelectPatient={builder.selectPatient}
  onPublish={builder.publish}
  onUnpublish={builder.unpublish}
/>
```

- [ ] **Step 6.6: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/publish-sheet.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 6.7: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep publish-sheet
```

Expected: no output.

- [ ] **Step 6.8: Commit**

```bash
git add src/features/tools/components/builder/publish-sheet.tsx src/features/tools/components/builder/__tests__/publish-sheet.test.tsx src/features/tools/hooks/use-tool-builder.ts src/features/tools/components/builder/tool-builder-wizard.tsx
git commit -m "feat(publish): upgrade PublishSheet with QR code, patient assignment, Open in Session, unpublish"
```

---

## Task 7: Enhance ToolActivitySummary — time filter + completion rate bar + goal tags

**Files:**
- Modify: `src/features/patients/components/tool-activity-summary.tsx`
- Modify: `src/features/patients/components/__tests__/tool-activity-summary.test.tsx`

The component already exists and shows completions, interactions, last activity, and a duplicate button. This task adds: time filter tabs (Last 7 days / Last 30 days / All time), a `ProgressRail` completion rate bar per tool, and goal tag pills.

- [ ] **Step 7.1: Write failing tests**

Add to `src/features/patients/components/__tests__/tool-activity-summary.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => [
    {
      appInstanceId: "inst-1",
      title: "Marcus Token Board",
      templateType: "token_board",
      status: "published",
      shareToken: "tok-abc",
      goalTags: ["positive reinforcement"],
      totalEvents: 10,
      completions: 4,
      interactions: 8,
      lastActivityAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    },
    {
      appInstanceId: "inst-2",
      title: "Old Board",
      templateType: "aac_board",
      status: "published",
      shareToken: null,
      goalTags: [],
      totalEvents: 3,
      completions: 1,
      interactions: 2,
      lastActivityAt: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
    },
  ]),
}));
vi.mock("@convex/_generated/api", () => ({
  api: { tools: { getEventSummaryByPatient: "tools:getEventSummaryByPatient" } },
}));

import { ToolActivitySummary } from "../tool-activity-summary";
import type { Id } from "@convex/_generated/dataModel";

describe("ToolActivitySummary — time filter", () => {
  it("shows both tools on 'All time' (default)", () => {
    render(<ToolActivitySummary patientId={"patient-1" as Id<"patients">} />);
    expect(screen.getByText("Marcus Token Board")).toBeInTheDocument();
    expect(screen.getByText("Old Board")).toBeInTheDocument();
  });

  it("hides old tool when 'Last 7 days' selected", () => {
    render(<ToolActivitySummary patientId={"patient-1" as Id<"patients">} />);
    fireEvent.click(screen.getByRole("button", { name: /last 7 days/i }));
    expect(screen.getByText("Marcus Token Board")).toBeInTheDocument();
    expect(screen.queryByText("Old Board")).not.toBeInTheDocument();
  });
});

describe("ToolActivitySummary — goal tags", () => {
  it("shows goal tag pills", () => {
    render(<ToolActivitySummary patientId={"patient-1" as Id<"patients">} />);
    expect(screen.getByText("positive reinforcement")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/patients/components/__tests__/tool-activity-summary.test.tsx" 2>&1 | tail -15
```

Expected: FAIL — no time filter buttons, no goal tag pills.

- [ ] **Step 7.3: Update ToolActivitySummary**

```tsx
// src/features/patients/components/tool-activity-summary.tsx
"use client";

import { useQuery } from "convex/react";
import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DuplicateToolDialog } from "@/features/tools/components/builder/duplicate-tool-dialog";
import { ProgressRail } from "@/features/tools/lib/runtime/premium-primitives";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type TimeFilter = "7d" | "30d" | "all";

interface ToolActivitySummaryProps {
  patientId: Id<"patients">;
}

function formatTemplateType(type: string): string {
  return type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(timestamp));
}

const FILTER_MS: Record<TimeFilter, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "all": Infinity,
};

const FILTER_LABELS: Record<TimeFilter, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "all": "All time",
};

export function ToolActivitySummary({ patientId }: ToolActivitySummaryProps) {
  const summary = useQuery(api.tools.getEventSummaryByPatient, { patientId });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [duplicateState, setDuplicateState] = useState<{ open: boolean; appInstanceId: string | null }>({
    open: false, appInstanceId: null,
  });

  if (summary === undefined) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (summary.length === 0) return null;

  const cutoff = timeFilter === "all" ? 0 : Date.now() - FILTER_MS[timeFilter];
  const filtered = summary.filter((item) =>
    timeFilter === "all" || (item.lastActivityAt !== null && item.lastActivityAt >= cutoff)
  );

  const maxCompletions = Math.max(...summary.map((s) => s.completions), 1);

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Tool Activity</h2>
        <div className="flex items-center gap-1">
          {(["7d", "30d", "all"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                timeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity in this time period.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <li key={item.appInstanceId} className="flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {formatTemplateType(item.templateType)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.completions} completion{item.completions !== 1 ? "s" : ""}
                    {" · "}
                    {item.interactions} interaction{item.interactions !== 1 ? "s" : ""}
                    {item.lastActivityAt !== null && <> · Last: {formatDate(item.lastActivityAt)}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    aria-label={`Duplicate ${item.title}`}
                    onClick={() => setDuplicateState({ open: true, appInstanceId: item.appInstanceId })}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {item.shareToken && (
                    <Link href={`/apps/${item.shareToken}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
                      aria-label={`Open ${item.title} in new tab`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Completion rate bar */}
              {item.completions > 0 && (
                <ProgressRail current={item.completions} total={maxCompletions} />
              )}

              {/* Goal tag pills */}
              {item.goalTags && item.goalTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.goalTags.map((tag) => (
                    <span key={tag}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {duplicateState.appInstanceId && (
        <DuplicateToolDialog
          appInstanceId={duplicateState.appInstanceId as Id<"app_instances">}
          open={duplicateState.open}
          onOpenChange={(open) => setDuplicateState((prev) => ({ ...prev, open }))}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/patients/components/__tests__/tool-activity-summary.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/features/patients/components/tool-activity-summary.tsx src/features/patients/components/__tests__/tool-activity-summary.test.tsx
git commit -m "feat(patients): time filter tabs, completion rate bar, goal tag pills in ToolActivitySummary"
```

---

## Task 8: My Tools — activity badge on tool cards

**Files:**
- Modify: `src/features/my-tools/components/my-tools-page.tsx`

`listPageBySLP` returns `app_instances` records which now include `lastActivityAt` (patched by `logEvent` in Task 3). Show a green dot + label on each card if `lastActivityAt` is within 7 days.

- [ ] **Step 8.1: Add badge logic to MyToolsPage**

In `src/features/my-tools/components/my-tools-page.tsx`, the tool card rendering iterates over `allTools`. Find where each tool card is rendered (look for `ProjectCard` usage or the tool `title`) and add a badge.

Add the helper function before the component:

```typescript
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getActivityBadge(tool: { lastActivityAt?: number }): string | null {
  if (!tool.lastActivityAt) return null;
  const diff = Date.now() - tool.lastActivityAt;
  if (diff < 24 * 60 * 60 * 1000) return "Used today";
  if (diff < SEVEN_DAYS_MS) return "Used this week";
  return null;
}
```

Then in the card render, wherever a tool title/card is rendered, add:

```tsx
{(() => {
  const badge = getActivityBadge(tool as { lastActivityAt?: number });
  return badge ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
      {badge}
    </span>
  ) : null;
})()}
```

The exact insertion point depends on where tool cards are rendered in the file. Look for the section that maps over `allTools` (or the paginated display) and add the badge inside each card's content area.

- [ ] **Step 8.2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "my-tools-page"
```

Expected: no output (the `lastActivityAt` field may need a type cast if Convex API types haven't regenerated; use `(tool as Record<string, unknown>).lastActivityAt as number | undefined`).

- [ ] **Step 8.3: Commit**

```bash
git add src/features/my-tools/components/my-tools-page.tsx
git commit -m "feat(my-tools): add 'Used today / Used this week' activity badge on tool cards"
```

---

## Task 9: Full verification

- [ ] **Step 9.1: Full test run**

```bash
npm test -- --run 2>&1 | tail -30
```

Expected: all tests pass. Known pre-existing failures on `main` (ElevenLabs voice ID, settings bg-white) are not regressions.

- [ ] **Step 9.2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 9.3: Verify Convex deploys**

```bash
npx convex dev --once 2>&1 | tail -20
```

Expected: no errors, all functions register.

- [ ] **Step 9.4: Commit pnpm lockfile if not already committed**

```bash
git status --short | grep pnpm-lock
```

If `pnpm-lock.yaml` shows as modified, commit it:

```bash
git add pnpm-lock.yaml && git commit -m "chore: sync pnpm-lock.yaml after qrcode.react install"
```

---

## Self-Review

| Spec §3 requirement | Task |
|---|---|
| Patient dropdown in publish panel | Task 6 |
| QR code in publish panel | Tasks 1, 6 |
| "Open in Session" primary CTA | Task 6 |
| Unpublish in panel footer | Task 6 |
| Versioning visibility | Out of scope (version field exists in schema; surfacing it is a small follow-up) |

| Spec §5 requirement | Task |
|---|---|
| IEP goal linking via goalTags field | Tasks 2, 3, 5 |
| GoalTagsEditor in Content tab | Task 5 |
| Goal tags shown on patient profile | Task 7 |
| Time-filtered tool activity panel | Task 7 |
| Completion rate per tool | Task 7 |
| Auto-generated session note | Task 4 (formatter); Plan 2 wires it into SessionOverlay |
| My Tools activity badges | Tasks 3, 8 |

**Note on session note wiring:** `formatSessionNote` is implemented here (Task 4). Plan 2's `SessionOverlay` should import it from `@/features/tools/lib/session-note-formatter` and display the formatted note in the post-session summary modal. If Plan 2 was executed before Plan 3, add that import to `SessionOverlay` as a follow-up step after Plan 3 completes.
