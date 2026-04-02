# SLP Tools Builder — Plan 3: Full Publish Panel + SLP Data Visibility

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the publish sheet to a full QR + patient assignment + "Open in Session" panel, add IEP goal tags, surface SLP data in patient profiles with time-filtered activity views, and produce auto-generated session note copy from session events.

**Architecture:** Six self-contained workstreams: (1) a pure `formatSessionNote` utility with no Convex dependency; (2) Convex schema additions (`goalTags`, `lastActivityAt`) and `tools.ts` mutations updated to persist them; (3) `publish-sheet.tsx` upgraded from a share-link stub into a full slide-over with patient dropdown, QR code, Open in Session, and unpublish; (4) `goal-tags-editor.tsx` added to the editor Content tab; (5) `ToolActivitySummary` enhanced with time filters, completion bars, and goal tags; (6) `my-tools-page.tsx` enhanced with a recent-activity badge on each card. Plan 1 must run first (it creates `publish-sheet.tsx` and the redesigned `use-tool-builder.ts`). Plan 2 (runtime quality + session mode) consumes the `formatSessionNote` utility created here.

**Tech Stack:** Next.js 15 App Router, Convex (schema + mutations/queries), React, shadcn/ui (Sheet, Select, Badge), `qrcode.react` (QRCodeSVG), Vitest + React Testing Library

**Depends on:** Plan 1 (`2026-04-02-slp-tools-builder-plan1-ai-entry-editor.md`) must be merged before starting this plan. The `publish-sheet.tsx` file this plan upgrades is created by Plan 1.

**Spec:** `docs/superpowers/specs/2026-04-02-slp-tools-builder-redesign-design.md` §3 and §5

---

## File Map

**Create:**
- `src/features/tools/lib/session-note-formatter.ts` — pure formatting utility for session notes
- `src/features/tools/lib/__tests__/session-note-formatter.test.ts` — TDD tests for formatter
- `src/features/tools/components/builder/goal-tags-editor.tsx` — free-text IEP goal tag input component
- `src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx` — TDD tests for goal tags editor

**Modify:**
- `convex/schema.ts` — add `goalTags: v.optional(v.array(v.string()))` and `lastActivityAt: v.optional(v.number())` to `app_instances`
- `convex/tools.ts` — add `goalTags` to `update` mutation args; patch `lastActivityAt` in `logEvent`; add `goalTags` to `getEventSummaryByPatient` return; add `patientId` to `update` mutation args
- `src/features/tools/components/builder/publish-sheet.tsx` — upgrade from share-link stub to full panel (patient dropdown, QR code, Open in Session, unpublish)
- `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx` — update tests to cover new features
- `src/features/tools/hooks/use-tool-builder.ts` — add `unpublish` function
- `src/features/tools/components/builder/tool-builder-wizard.tsx` — add GoalTagsEditor to Content tab; pass new PublishSheet props
- `src/features/patients/components/tool-activity-summary.tsx` — add time filter tabs, completion rate bar, goal tag pills
- `src/features/patients/components/__tests__/tool-activity-summary.test.tsx` — update tests
- `src/features/my-tools/components/my-tools-page.tsx` — add "Used recently" activity badge on tool cards

**npm install:**
- `qrcode.react` (and `@types/qrcode.react` if not bundled)

---

## Task 1: Pure session note formatter utility

**Files:**
- Create: `src/features/tools/lib/session-note-formatter.ts`
- Create: `src/features/tools/lib/__tests__/session-note-formatter.test.ts`

This is a pure function — no imports from Convex or React. Plan 2's session overlay imports from `../../lib/session-note-formatter`. Start here so Plan 2 can depend on it.

- [ ] **Step 1.1: Write the failing tests**

Create `src/features/tools/lib/__tests__/session-note-formatter.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { formatSessionNote } from "../session-note-formatter";

describe("formatSessionNote", () => {
  it("formats a basic token board session with no goal tags", () => {
    const result = formatSessionNote({
      toolTitle: "Marcus Token Board",
      templateType: "token_board",
      durationSeconds: 503,
      events: [
        { type: "activity_completed" },
        { type: "activity_completed" },
        { type: "activity_completed" },
        { type: "activity_completed" },
        { type: "token_added" },
        { type: "token_added" },
        { type: "token_added" },
        { type: "item_tapped" },
        { type: "item_tapped" },
      ],
      goalTags: [],
    });

    expect(result).toContain("Session date:");
    expect(result).toContain("Marcus Token Board");
    expect(result).toContain("Token Board");
    expect(result).toContain("8 min 23 sec");
    expect(result).toContain("4 completions");
    expect(result).toContain("Goal tags:");
    expect(result).toContain("Notes:");
  });

  it("formats duration under 60 seconds as seconds only", () => {
    const result = formatSessionNote({
      toolTitle: "AAC Board",
      templateType: "aac_board",
      durationSeconds: 45,
      events: [],
    });
    expect(result).toContain("45 sec");
    expect(result).not.toContain("min");
  });

  it("formats duration with zero seconds cleanly (exact minutes)", () => {
    const result = formatSessionNote({
      toolTitle: "Visual Schedule",
      templateType: "visual_schedule",
      durationSeconds: 120,
      events: [],
    });
    expect(result).toContain("2 min");
    expect(result).not.toContain("0 sec");
  });

  it("includes goal tags when provided", () => {
    const result = formatSessionNote({
      toolTitle: "Snack Requests",
      templateType: "aac_board",
      durationSeconds: 300,
      events: [{ type: "item_tapped" }, { type: "item_tapped" }],
      goalTags: ["requesting", "/s/ production"],
    });
    expect(result).toContain("requesting, /s/ production");
  });

  it("counts completions and interactions from events", () => {
    const result = formatSessionNote({
      toolTitle: "Matching Game",
      templateType: "matching_game",
      durationSeconds: 200,
      events: [
        { type: "answer_correct" },
        { type: "answer_correct" },
        { type: "answer_incorrect" },
        { type: "activity_completed" },
        { type: "item_tapped" },
      ],
    });
    expect(result).toContain("1 completion");
    expect(result).toContain("4 interactions");
  });

  it("omits goal tags line when goalTags is undefined", () => {
    const result = formatSessionNote({
      toolTitle: "First Then",
      templateType: "first_then_board",
      durationSeconds: 60,
      events: [],
    });
    expect(result).not.toContain("Goal tags:");
  });

  it("uses today's date in the output", () => {
    const result = formatSessionNote({
      toolTitle: "Test",
      templateType: "aac_board",
      durationSeconds: 60,
      events: [],
    });
    const year = new Date().getFullYear().toString();
    expect(result).toContain(year);
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/tools/lib/__tests__/session-note-formatter.test.ts 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../session-note-formatter'"

- [ ] **Step 1.3: Implement the formatter**

Create `src/features/tools/lib/session-note-formatter.ts`:

```typescript
/**
 * Pure session note formatter — no Convex or React imports.
 * Used by Plan 2's session overlay after "End Session".
 */

const TEMPLATE_LABELS: Record<string, string> = {
  aac_board: "AAC Communication Board",
  token_board: "Token Board",
  visual_schedule: "Visual Schedule",
  matching_game: "Matching Game",
  first_then_board: "First/Then Board",
};

const INTERACTION_EVENT_TYPES = new Set([
  "item_tapped",
  "answer_correct",
  "answer_incorrect",
  "token_added",
]);

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} sec`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSessionNote(args: {
  toolTitle: string;
  templateType: string;
  durationSeconds: number;
  events: Array<{ type: string; payloadJson?: string }>;
  goalTags?: string[];
}): string {
  const { toolTitle, templateType, durationSeconds, events, goalTags } = args;

  const completions = events.filter((e) => e.type === "activity_completed").length;
  const interactions = events.filter((e) => INTERACTION_EVENT_TYPES.has(e.type)).length;

  const templateLabel = TEMPLATE_LABELS[templateType] ?? templateType;
  const date = formatDate(new Date());
  const duration = formatDuration(durationSeconds);

  const completionText =
    completions === 1 ? "1 completion" : `${completions} completions`;
  const interactionText =
    interactions === 1 ? "1 interaction" : `${interactions} interactions`;

  const lines: string[] = [
    `Session date: ${date}`,
    `Tool: ${toolTitle} (${templateLabel})`,
    `Duration: ${duration}`,
    `Data: ${completionText}. ${interactionText}.`,
  ];

  if (goalTags !== undefined && goalTags.length > 0) {
    lines.push(`Goal tags: ${goalTags.join(", ")}`);
  } else if (goalTags !== undefined) {
    lines.push("Goal tags:");
  }

  lines.push("Notes:");

  return lines.join("\n");
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/tools/lib/__tests__/session-note-formatter.test.ts 2>&1 | tail -20
```

Expected: All 7 tests pass, 0 failures.

- [ ] **Step 1.5: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/tools/lib/session-note-formatter.ts src/features/tools/lib/__tests__/session-note-formatter.test.ts && git commit -m "feat: add pure session note formatter utility"
```

---

## Task 2: Convex schema + backend changes

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/tools.ts`

Add `goalTags` and `lastActivityAt` to `app_instances`, wire them through `update`/`logEvent`/`getEventSummaryByPatient`, and add `patientId` as an update-able field.

- [ ] **Step 2.1: Add new fields to app_instances in schema.ts**

In `convex/schema.ts`, find the `app_instances` table block. The current tail of the field list is:

```typescript
    version: v.number(),
    shareToken: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
```

Replace it with:

```typescript
    version: v.number(),
    shareToken: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    goalTags: v.optional(v.array(v.string())),
    lastActivityAt: v.optional(v.number()),
```

Note: if Plan 1 has already added `originalDescription` between `version` and `shareToken`, place the new fields after `publishedAt` just the same.

- [ ] **Step 2.2: Add goalTags and patientId to the update mutation**

In `convex/tools.ts`, the `update` mutation currently has:

```typescript
export const update = mutation({
  args: {
    id: v.id("app_instances"),
    configJson: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    await ctx.db.patch(args.id, {
      configJson: args.configJson,
      ...(args.title !== undefined
        ? { title: args.title, titleLower: normalizeTitle(args.title) }
        : {}),
    });
  },
});
```

Replace the entire `update` mutation with:

```typescript
export const update = mutation({
  args: {
    id: v.id("app_instances"),
    configJson: v.string(),
    title: v.optional(v.string()),
    patientId: v.optional(v.id("patients")),
    goalTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    await ctx.db.patch(args.id, {
      configJson: args.configJson,
      ...(args.title !== undefined
        ? { title: args.title, titleLower: normalizeTitle(args.title) }
        : {}),
      ...(args.patientId !== undefined ? { patientId: args.patientId } : {}),
      ...(args.goalTags !== undefined ? { goalTags: args.goalTags } : {}),
    });
  },
});
```

- [ ] **Step 2.3: Patch lastActivityAt in logEvent**

In `convex/tools.ts`, the `logEvent` mutation handler currently does:

```typescript
    await ctx.db.insert("tool_events", {
      appInstanceId: instance._id,
      ...(instance.patientId !== undefined ? { patientId: instance.patientId } : {}),
      eventType: args.eventType,
      eventPayloadJson: args.eventPayloadJson,
    });
```

Replace with:

```typescript
    await ctx.db.insert("tool_events", {
      appInstanceId: instance._id,
      ...(instance.patientId !== undefined ? { patientId: instance.patientId } : {}),
      eventType: args.eventType,
      eventPayloadJson: args.eventPayloadJson,
    });

    // Update lastActivityAt on the instance for quick badge queries
    await ctx.db.patch(instance._id, { lastActivityAt: Date.now() });
```

- [ ] **Step 2.4: Add goalTags to getEventSummaryByPatient return**

In `convex/tools.ts`, the `getEventSummaryByPatient` handler currently returns:

```typescript
        return {
          appInstanceId: instance._id,
          title: instance.title,
          templateType: instance.templateType,
          status: instance.status,
          shareToken: instance.shareToken,
          totalEvents: events.length,
          completions,
          interactions,
          lastActivityAt: lastEvent?._creationTime ?? null,
        };
```

Replace that object literal with:

```typescript
        return {
          appInstanceId: instance._id,
          title: instance.title,
          templateType: instance.templateType,
          status: instance.status,
          shareToken: instance.shareToken,
          goalTags: instance.goalTags ?? [],
          totalEvents: events.length,
          completions,
          interactions,
          lastActivityAt: lastEvent?._creationTime ?? null,
        };
```

- [ ] **Step 2.5: Verify Convex types compile**

```bash
cd /Users/desha/Springfield-Vibeathon && npx convex dev --once 2>&1 | tail -30
```

Expected: "Convex functions ready" with no TypeScript errors. If there is an error about `goalTags` not existing on the document type, confirm that Step 2.1 was saved correctly before proceeding.

- [ ] **Step 2.6: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add convex/schema.ts convex/tools.ts && git commit -m "feat: add goalTags and lastActivityAt to app_instances; expose goalTags in getEventSummaryByPatient"
```

---

## Task 3: Upgrade PublishSheet

**Files:**
- Create (or upgrade from Plan 1): `src/features/tools/components/builder/publish-sheet.tsx`
- Create (or upgrade from Plan 1): `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx`
- Modify: `src/features/tools/hooks/use-tool-builder.ts`
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx`

Plan 1 creates a minimal `publish-sheet.tsx` with share link only. This task replaces its body with the full panel: patient dropdown, QR code, Open in Session CTA, and unpublish.

- [ ] **Step 3.1: Install qrcode.react**

```bash
cd /Users/desha/Springfield-Vibeathon && npm install qrcode.react 2>&1 | tail -5
```

Expected: `added N packages` — no peer dependency errors.

- [ ] **Step 3.2: Write failing tests for the new PublishSheet**

Create (or overwrite) `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(null)),
  useQuery: vi.fn(() => [
    { _id: "p1", firstName: "Liam", lastName: "Chen" },
    { _id: "p2", firstName: "Mia", lastName: "Park" },
  ]),
}));
vi.mock("@convex/_generated/api", () => ({
  api: { tools: { update: "tools:update" }, patients: { list: "patients:list" } },
}));
// qrcode.react renders an SVG — stub it to avoid canvas errors in JSDOM
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr-code" data-value={value} />,
}));

import { PublishSheet } from "../publish-sheet";

const baseProps = {
  open: true,
  onClose: vi.fn(),
  isSaving: false,
  publishedShareToken: null,
  onPublish: vi.fn().mockResolvedValue("tok_abc123"),
  instanceId: "inst1" as any,
  patientId: null,
  onSelectPatient: vi.fn(),
  onUnpublish: vi.fn().mockResolvedValue(undefined),
};

describe("PublishSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Publish button and description when not yet published", () => {
    render(<PublishSheet {...baseProps} publishedShareToken={null} />);
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
    expect(screen.queryByTestId("qr-code")).not.toBeInTheDocument();
  });

  it("shows QR code when published", () => {
    render(<PublishSheet {...baseProps} publishedShareToken="tok_abc123" />);
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });

  it("shows patient dropdown when published", () => {
    render(<PublishSheet {...baseProps} publishedShareToken="tok_abc123" />);
    expect(screen.getByText(/assign to child/i)).toBeInTheDocument();
  });

  it("shows Open in Session button when published", () => {
    render(<PublishSheet {...baseProps} publishedShareToken="tok_abc123" />);
    expect(screen.getByRole("button", { name: /open in session/i })).toBeInTheDocument();
  });

  it("shows Unpublish link when published", () => {
    render(<PublishSheet {...baseProps} publishedShareToken="tok_abc123" />);
    expect(screen.getByRole("button", { name: /unpublish/i })).toBeInTheDocument();
  });

  it("calls onPublish when Publish button clicked", async () => {
    const onPublish = vi.fn().mockResolvedValue("tok_new");
    render(<PublishSheet {...baseProps} onPublish={onPublish} publishedShareToken={null} />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    await waitFor(() => expect(onPublish).toHaveBeenCalledOnce());
  });

  it("calls onUnpublish when Unpublish clicked", async () => {
    const onUnpublish = vi.fn().mockResolvedValue(undefined);
    render(<PublishSheet {...baseProps} publishedShareToken="tok_abc123" onUnpublish={onUnpublish} />);
    fireEvent.click(screen.getByRole("button", { name: /unpublish/i }));
    await waitFor(() => expect(onUnpublish).toHaveBeenCalledOnce());
  });

  it("passes session=true in the Open in Session href", () => {
    render(<PublishSheet {...baseProps} publishedShareToken="tok_abc123" />);
    const btn = screen.getByRole("link", { name: /open in session/i });
    expect(btn.getAttribute("href")).toContain("session=true");
  });
});
```

- [ ] **Step 3.3: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/tools/components/builder/__tests__/publish-sheet.test.tsx 2>&1 | tail -20
```

Expected: FAIL — either "Cannot find module" or multiple assertion failures because the component doesn't have these features yet.

- [ ] **Step 3.4: Write the upgraded PublishSheet**

Create/overwrite `src/features/tools/components/builder/publish-sheet.tsx`:

```typescript
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

export interface PublishSheetProps {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  publishedShareToken: string | null;
  onPublish: () => Promise<string | null>;
  instanceId: Id<"app_instances"> | null;
  patientId: Id<"patients"> | null;
  onSelectPatient: (id: Id<"patients">) => void;
  onUnpublish: () => Promise<void>;
}

export function PublishSheet({
  open,
  onClose,
  isSaving,
  publishedShareToken,
  onPublish,
  instanceId,
  patientId,
  onSelectPatient,
  onUnpublish,
}: PublishSheetProps) {
  const [copied, setCopied] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  const updateInstance = useMutation(api.tools.update);
  const patients = useQuery(api.patients.list) ?? [];

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

  const handlePatientSelect = async (id: string) => {
    onSelectPatient(id as Id<"patients">);
    if (instanceId) {
      await updateInstance({
        id: instanceId,
        configJson: "", // configJson is required — pass empty to signal no config change
        patientId: id as Id<"patients">,
      });
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const canvas = document.createElement("canvas");
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = "tool-qr-code.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    try {
      await onUnpublish();
    } finally {
      setIsUnpublishing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="font-headline text-xl">
            {publishedShareToken ? "App published" : "Publish app"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {!publishedShareToken ? (
            /* Pre-publish state */
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <p className="text-on-surface-variant text-sm max-w-xs">
                Publishing creates a shareable link. No login required for children or caregivers to use it.
              </p>
              <Button
                size="lg"
                variant="gradient"
                disabled={isSaving}
                onClick={() => void onPublish()}
                className="w-full"
              >
                {isSaving ? "Publishing…" : "Publish app"}
              </Button>
            </div>
          ) : (
            <>
              {/* ASSIGN TO CHILD */}
              <section className="flex flex-col gap-2">
                <p className="text-xs font-mono uppercase tracking-[0.08em] text-on-surface-variant">
                  Assign to child (optional)
                </p>
                <Select
                  value={patientId ?? ""}
                  onValueChange={(v) => void handlePatientSelect(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select from your caseload…" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.firstName} {p.lastName}
                        {patientId === p._id && (
                          <Check className="ml-auto h-3.5 w-3.5 text-primary" />
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-on-surface-variant">
                  Attaches usage data to the child's profile.
                </p>
              </section>

              {/* SHARE LINK */}
              <section className="flex flex-col gap-2">
                <p className="text-xs font-mono uppercase tracking-[0.08em] text-on-surface-variant">
                  Share link
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2">
                  <span className="flex-1 truncate font-mono text-xs text-on-surface-variant">
                    {shareUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 w-7 p-0"
                    onClick={() => void handleCopy()}
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </section>

              {/* QR CODE */}
              <section className="flex flex-col items-center gap-3">
                <p className="text-xs font-mono uppercase tracking-[0.08em] text-on-surface-variant self-start">
                  QR code
                </p>
                <div className="rounded-xl border border-border p-4 bg-white">
                  <QRCodeSVG
                    ref={qrRef}
                    value={shareUrl!}
                    size={120}
                    level="M"
                  />
                </div>
                <p className="text-xs text-on-surface-variant text-center">
                  Scan to open on child's device
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadQR}
                  className="text-xs"
                >
                  Download QR as PNG
                </Button>
              </section>

              {/* OPEN IN SESSION — primary CTA */}
              <section>
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <a
                    href={sessionUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open in Session"
                  >
                    Open in Session
                  </a>
                </Button>
                <p className="text-xs text-on-surface-variant text-center mt-2">
                  Opens fullscreen — immediately ready for the child
                </p>
              </section>
            </>
          )}
        </div>

        {/* FOOTER: unpublish */}
        {publishedShareToken && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">
              Family link auto-updates on republish
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-on-surface-variant hover:text-destructive"
              onClick={() => void handleUnpublish()}
              disabled={isUnpublishing}
              aria-label="Unpublish"
            >
              {isUnpublishing ? "Unpublishing…" : "Unpublish"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

**Important:** The `handlePatientSelect` sends an empty `configJson: ""`. This works with the current `update` mutation signature (which requires `configJson`) only if we patch the mutation to make `configJson` optional, OR we fetch the current configJson first. The cleanest fix: make `configJson` optional in the `update` mutation args and handler. Update `convex/tools.ts` `update` mutation args:

```typescript
// In update mutation args, change:
    configJson: v.string(),
// To:
    configJson: v.optional(v.string()),
```

And in the handler patch:

```typescript
    await ctx.db.patch(args.id, {
      ...(args.configJson !== undefined ? { configJson: args.configJson } : {}),
      ...(args.title !== undefined
        ? { title: args.title, titleLower: normalizeTitle(args.title) }
        : {}),
      ...(args.patientId !== undefined ? { patientId: args.patientId } : {}),
      ...(args.goalTags !== undefined ? { goalTags: args.goalTags } : {}),
    });
```

This is a backwards-compatible change — all existing callers pass `configJson`, so they continue to work.

- [ ] **Step 3.5: Make configJson optional in update mutation**

In `convex/tools.ts`, apply the change from Step 3.4's important note — make `configJson: v.optional(v.string())` and update the patch accordingly. (Already shown in Step 3.4 above.)

- [ ] **Step 3.6: Add `unpublish` to use-tool-builder.ts**

In `src/features/tools/hooks/use-tool-builder.ts`, add the `archiveInstance` mutation and an `unpublish` function. After Plan 1 runs, the hook will have `isPublishOpen`, `openPublish`, `closePublish`. Add `unpublish` alongside them.

Find the line:

```typescript
  const publishInstance = useMutation(api.tools.publish);
```

Add after it:

```typescript
  const archiveInstance = useMutation(api.tools.archive);
```

Then add the `unpublish` callback. Find the `publish` callback definition and add after it:

```typescript
  const unpublish = useCallback(async (): Promise<void> => {
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
```

In the return statement, add `unpublish` to the returned object:

```typescript
  return { ...state, selectPatient, selectTemplate, nextStep, prevStep, updateConfig, updateAppearance, saveAndAdvance, publish, unpublish, openPublish, closePublish };
```

(The exact set of keys in the return depends on what Plan 1 added — include `unpublish` alongside whatever is already there.)

- [ ] **Step 3.7: Wire new props into ToolBuilderWizard**

In `src/features/tools/components/builder/tool-builder-wizard.tsx`, the `PublishSheet` invocation (added by Plan 1) currently has only the Plan 1 props. Add the three new props:

```typescript
<PublishSheet
  open={builder.isPublishOpen}
  onClose={builder.closePublish}
  isSaving={builder.isSaving}
  publishedShareToken={builder.publishedShareToken}
  onPublish={builder.publish}
  instanceId={builder.instanceId}
  patientId={builder.patientId}
  onSelectPatient={builder.selectPatient}
  onUnpublish={builder.unpublish}
/>
```

- [ ] **Step 3.8: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/tools/components/builder/__tests__/publish-sheet.test.tsx 2>&1 | tail -20
```

Expected: All 8 tests pass.

- [ ] **Step 3.9: Run full test suite to check for regressions**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run 2>&1 | tail -20
```

Expected: Same pass count as before this task (±2 for the new test file). Zero new failures.

- [ ] **Step 3.10: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/tools/components/builder/publish-sheet.tsx src/features/tools/components/builder/__tests__/publish-sheet.test.tsx src/features/tools/hooks/use-tool-builder.ts src/features/tools/components/builder/tool-builder-wizard.tsx convex/tools.ts && git commit -m "feat: upgrade PublishSheet with QR code, patient assignment, Open in Session, and unpublish"
```

---

## Task 4: GoalTagsEditor component

**Files:**
- Create: `src/features/tools/components/builder/goal-tags-editor.tsx`
- Create: `src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx`
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx`

- [ ] **Step 4.1: Write failing tests**

Create `src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(null)),
}));
vi.mock("@convex/_generated/api", () => ({
  api: { tools: { update: "tools:update" } },
}));

import { GoalTagsEditor } from "../goal-tags-editor";

const INSTANCE_ID = "inst1" as any;

describe("GoalTagsEditor", () => {
  it("renders existing tags as pills", () => {
    render(
      <GoalTagsEditor
        instanceId={INSTANCE_ID}
        goalTags={["requesting", "/s/ production"]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("requesting")).toBeInTheDocument();
    expect(screen.getByText("/s/ production")).toBeInTheDocument();
  });

  it("calls onChange with new tag when Enter pressed", () => {
    const onChange = vi.fn();
    render(
      <GoalTagsEditor
        instanceId={INSTANCE_ID}
        goalTags={[]}
        onChange={onChange}
      />
    );
    const input = screen.getByPlaceholderText(/add a goal tag/i);
    fireEvent.change(input, { target: { value: "token economy" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["token economy"]);
  });

  it("trims whitespace from new tags", () => {
    const onChange = vi.fn();
    render(
      <GoalTagsEditor
        instanceId={INSTANCE_ID}
        goalTags={[]}
        onChange={onChange}
      />
    );
    const input = screen.getByPlaceholderText(/add a goal tag/i);
    fireEvent.change(input, { target: { value: "  requesting  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["requesting"]);
  });

  it("ignores empty or duplicate tags", () => {
    const onChange = vi.fn();
    render(
      <GoalTagsEditor
        instanceId={INSTANCE_ID}
        goalTags={["requesting"]}
        onChange={onChange}
      />
    );
    const input = screen.getByPlaceholderText(/add a goal tag/i);
    fireEvent.change(input, { target: { value: "requesting" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes tag when × button clicked", () => {
    const onChange = vi.fn();
    render(
      <GoalTagsEditor
        instanceId={INSTANCE_ID}
        goalTags={["requesting", "/s/ production"]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove "requesting"'));
    expect(onChange).toHaveBeenCalledWith(["/s/ production"]);
  });

  it("renders a label 'Goal tags'", () => {
    render(
      <GoalTagsEditor
        instanceId={INSTANCE_ID}
        goalTags={[]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/goal tags/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module '../goal-tags-editor'"

- [ ] **Step 4.3: Implement GoalTagsEditor**

Create `src/features/tools/components/builder/goal-tags-editor.tsx`:

```typescript
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface GoalTagsEditorProps {
  instanceId: Id<"app_instances">;
  goalTags: string[];
  /** Called with the new full array after any add/remove */
  onChange: (tags: string[]) => void;
}

export function GoalTagsEditor({ instanceId, goalTags, onChange }: GoalTagsEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const updateInstance = useMutation(api.tools.update);
  const inputRef = useRef<HTMLInputElement>(null);

  const persist = useCallback(
    (tags: string[]) => {
      onChange(tags);
      void updateInstance({ id: instanceId, goalTags: tags });
    },
    [instanceId, updateInstance, onChange]
  );

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || goalTags.includes(trimmed)) return;
    const next = [...goalTags, trimmed];
    persist(next);
    setInputValue("");
  }, [inputValue, goalTags, persist]);

  const removeTag = useCallback(
    (tag: string) => {
      persist(goalTags.filter((t) => t !== tag));
    },
    [goalTags, persist]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="goal-tags-input" className="text-sm font-medium">
        Goal tags
      </Label>
      <p className="text-xs text-on-surface-variant -mt-1">
        Tag IEP goals this tool supports. Press Enter to add.
      </p>

      {goalTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {goalTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pl-2.5 pr-1.5 py-0.5 text-xs"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove "${tag}"`}
                className="ml-0.5 rounded hover:bg-surface-container-high p-0.5 transition-colors"
                onClick={() => removeTag(tag)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Input
        id="goal-tags-input"
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a goal tag…"
        className="text-sm"
      />
    </div>
  );
}
```

- [ ] **Step 4.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx 2>&1 | tail -10
```

Expected: All 6 tests pass.

- [ ] **Step 4.5: Add GoalTagsEditor to the Content tab in ToolBuilderWizard**

In `src/features/tools/components/builder/tool-builder-wizard.tsx`, Plan 1 restructures the editor into Content/Appearance tabs. After Plan 1, the Content tab renders `<ConfigEditor>`. Add `GoalTagsEditor` below it.

Find the import block and add:

```typescript
import { GoalTagsEditor } from "./goal-tags-editor";
```

In the Content tab JSX, after `<ConfigEditor .../>`, add:

```tsx
{builder.instanceId && (
  <div className="px-4 pb-4 pt-2 border-t border-border">
    <GoalTagsEditor
      instanceId={builder.instanceId}
      goalTags={builder.goalTags ?? []}
      onChange={(tags) => builder.setGoalTags(tags)}
    />
  </div>
)}
```

Note: `builder.goalTags` and `builder.setGoalTags` need to be added to the hook (Step 4.6).

- [ ] **Step 4.6: Add goalTags state to use-tool-builder.ts**

In `src/features/tools/hooks/use-tool-builder.ts`, add `goalTags` to `BuilderState`:

```typescript
// In BuilderState interface, add:
  goalTags: string[];
```

Initialize it in the default state:

```typescript
  goalTags: [],
```

Seed it from the existing instance when loading (in the `useEffect` that seeds from `existingInstance`):

```typescript
      goalTags: existingInstance.goalTags ?? [],
```

Add the `setGoalTags` callback:

```typescript
  const setGoalTags = useCallback(
    (tags: string[]) => setState((s) => ({ ...s, goalTags: tags })),
    []
  );
```

Include `goalTags` and `setGoalTags` in the return statement.

- [ ] **Step 4.7: Run full test suite**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run 2>&1 | tail -15
```

Expected: All passing before this task still pass. New goal-tags tests pass.

- [ ] **Step 4.8: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/tools/components/builder/goal-tags-editor.tsx src/features/tools/components/builder/__tests__/goal-tags-editor.test.tsx src/features/tools/components/builder/tool-builder-wizard.tsx src/features/tools/hooks/use-tool-builder.ts && git commit -m "feat: add GoalTagsEditor component with IEP goal tag management"
```

---

## Task 5: Enhance ToolActivitySummary

**Files:**
- Modify: `src/features/patients/components/tool-activity-summary.tsx`
- Modify: `src/features/patients/components/__tests__/tool-activity-summary.test.tsx`

Add three enhancements: time filter tabs, a completion rate bar, and goal tag pills per tool row.

- [ ] **Step 5.1: Write failing tests for the new features**

Append these tests to `src/features/patients/components/__tests__/tool-activity-summary.test.tsx`. The full file becomes:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

import { useQuery } from "convex/react";

import { ToolActivitySummary } from "../tool-activity-summary";

const PATIENT_ID = "pat123" as any;

const MOCK_DATA = [
  {
    appInstanceId: "app1",
    title: "Snack Board",
    templateType: "aac_board",
    status: "published",
    shareToken: "tok123",
    goalTags: ["requesting", "/s/ production"],
    totalEvents: 12,
    completions: 3,
    interactions: 9,
    lastActivityAt: Date.now(),
  },
  {
    appInstanceId: "app2",
    title: "Morning Schedule",
    templateType: "visual_schedule",
    status: "published",
    shareToken: "tok456",
    goalTags: [],
    totalEvents: 5,
    completions: 1,
    interactions: 4,
    lastActivityAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
  },
];

describe("ToolActivitySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when data is empty", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    const { container } = render(<ToolActivitySummary patientId={PATIENT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders tool cards with activity data", () => {
    vi.mocked(useQuery).mockReturnValue(MOCK_DATA);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    expect(screen.getByText("Tool Activity")).toBeInTheDocument();
    expect(screen.getByText("Snack Board")).toBeInTheDocument();
    expect(screen.getByText(/3 completion/)).toBeInTheDocument();
    expect(screen.getByText(/9 interaction/)).toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    // Skeleton renders — no crash
  });

  it("renders time filter tabs: Last 7 days, Last 30 days, All time", () => {
    vi.mocked(useQuery).mockReturnValue(MOCK_DATA);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    expect(screen.getByRole("button", { name: /last 7 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /last 30 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all time/i })).toBeInTheDocument();
  });

  it("filters to Last 7 days — only shows tools with lastActivityAt in the last 7 days", () => {
    vi.mocked(useQuery).mockReturnValue(MOCK_DATA);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    fireEvent.click(screen.getByRole("button", { name: /last 7 days/i }));
    expect(screen.getByText("Snack Board")).toBeInTheDocument();
    expect(screen.queryByText("Morning Schedule")).not.toBeInTheDocument();
  });

  it("shows goal tag pills for tools with goalTags", () => {
    vi.mocked(useQuery).mockReturnValue(MOCK_DATA);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    expect(screen.getByText("requesting")).toBeInTheDocument();
    expect(screen.getByText("/s/ production")).toBeInTheDocument();
  });

  it("shows a completion rate progress bar for tools with completions", () => {
    vi.mocked(useQuery).mockReturnValue(MOCK_DATA);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    // ProgressRail renders with role="progressbar" or a data-testid
    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("defaults to All time filter showing all tools", () => {
    vi.mocked(useQuery).mockReturnValue(MOCK_DATA);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    expect(screen.getByText("Snack Board")).toBeInTheDocument();
    expect(screen.getByText("Morning Schedule")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/patients/components/__tests__/tool-activity-summary.test.tsx 2>&1 | tail -20
```

Expected: The 3 original tests pass; the 5 new tests fail (no time filter tabs, no goal tags, no progress bar).

- [ ] **Step 5.3: Rewrite ToolActivitySummary with all enhancements**

Replace the full content of `src/features/patients/components/tool-activity-summary.tsx`:

```typescript
"use client";

import { useQuery } from "convex/react";
import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DuplicateToolDialog } from "@/features/tools/components/builder/duplicate-tool-dialog";
import { ProgressRail } from "@/features/tools/lib/runtime/premium-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ToolActivitySummaryProps {
  patientId: Id<"patients">;
}

type TimeFilter = "7d" | "30d" | "all";

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

function formatTemplateType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(timestamp)
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function cutoffForFilter(filter: TimeFilter): number {
  if (filter === "all") return 0;
  const days = filter === "7d" ? 7 : 30;
  return Date.now() - days * DAY_MS;
}

export function ToolActivitySummary({ patientId }: ToolActivitySummaryProps) {
  const summary = useQuery(api.tools.getEventSummaryByPatient, { patientId });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [duplicateState, setDuplicateState] = useState<{
    open: boolean;
    appInstanceId: string | null;
  }>({ open: false, appInstanceId: null });

  const filtered = useMemo(() => {
    if (!summary) return summary;
    const cutoff = cutoffForFilter(timeFilter);
    if (cutoff === 0) return summary;
    return summary.filter((item) =>
      item.lastActivityAt !== null && item.lastActivityAt >= cutoff
    );
  }, [summary, timeFilter]);

  const maxCompletions = useMemo(() => {
    if (!filtered || filtered.length === 0) return 0;
    return Math.max(...filtered.map((item) => item.completions), 1);
  }, [filtered]);

  if (summary === undefined) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (summary.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-headline text-lg font-semibold">Tool Activity</h2>
        <div className="flex gap-1" role="group" aria-label="Time filter">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTimeFilter(f.value)}
              className={[
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-200",
                timeFilter === f.value
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!filtered || filtered.length === 0 ? (
        <p className="text-xs text-on-surface-variant py-4 text-center">
          No tool activity in this time range.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <li
              key={item.appInstanceId}
              className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-col gap-1 flex-1">
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
                  {item.lastActivityAt !== null && (
                    <> · Last: {formatDate(item.lastActivityAt)}</>
                  )}
                </p>

                {item.completions > 0 && (
                  <ProgressRail
                    current={item.completions}
                    total={maxCompletions}
                    label={`${item.completions} completion${item.completions !== 1 ? "s" : ""}`}
                  />
                )}

                {item.goalTags && item.goalTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.goalTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs px-1.5 py-0 font-normal text-on-surface-variant"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Duplicate ${item.title}`}
                  onClick={() =>
                    setDuplicateState({ open: true, appInstanceId: item.appInstanceId })
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {item.shareToken && (
                  <Link
                    href={`/apps/${item.shareToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
                    aria-label={`Open ${item.title} in new tab`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {duplicateState.appInstanceId && (
        <DuplicateToolDialog
          appInstanceId={duplicateState.appInstanceId as Id<"app_instances">}
          open={duplicateState.open}
          onOpenChange={(open) =>
            setDuplicateState((prev) => ({ ...prev, open }))
          }
        />
      )}
    </div>
  );
}
```

**Note on `ProgressRail`:** The current implementation in `premium-primitives.tsx` does not emit `role="progressbar"`. To make the test pass, add `role="progressbar"` to `ProgressRail`'s outer div. Read `src/features/tools/lib/runtime/premium-primitives.tsx` lines 43-80 and add `role="progressbar"` to the container div of `ProgressRail`.

- [ ] **Step 5.4: Add role="progressbar" to ProgressRail**

In `src/features/tools/lib/runtime/premium-primitives.tsx`, find the `ProgressRail` component. Read lines 43-80 to find the exact JSX. The container div likely looks like:

```tsx
<div className="...">
```

Add `role="progressbar"` to that div:

```tsx
<div role="progressbar" aria-valuenow={current} aria-valuemax={total} className="...">
```

- [ ] **Step 5.5: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/patients/components/__tests__/tool-activity-summary.test.tsx 2>&1 | tail -15
```

Expected: All 8 tests pass.

- [ ] **Step 5.6: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/patients/components/tool-activity-summary.tsx src/features/patients/components/__tests__/tool-activity-summary.test.tsx src/features/tools/lib/runtime/premium-primitives.tsx && git commit -m "feat: enhance ToolActivitySummary with time filters, completion rate bars, and goal tags"
```

---

## Task 6: My Tools activity badge

**Files:**
- Modify: `src/features/my-tools/components/my-tools-page.tsx`

Show a green dot + "Used today" or "Used this week" badge on tool cards when `lastActivityAt` is within the last 7 days. The `lastActivityAt` field is now returned on `app_instances` records from `listPageBySLP` (because it's a schema field, Convex returns all fields automatically).

- [ ] **Step 6.1: Add the activity badge helper and badge JSX to my-tools-page.tsx**

In `src/features/my-tools/components/my-tools-page.tsx`, add a helper function near the top (after the imports):

```typescript
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getActivityBadge(lastActivityAt: number | undefined | null): string | null {
  if (!lastActivityAt) return null;
  const age = Date.now() - lastActivityAt;
  if (age < 0) return null;
  if (age < 24 * 60 * 60 * 1000) return "Used today";
  if (age < SEVEN_DAYS_MS) return "Used this week";
  return null;
}
```

Then, in the `ProjectCard` block (inside the `{pageItems?.map(...)}` loop), add the badge directly above the existing published-tool "Open Tool" button. Find the `<>` block that wraps `<ProjectCard>` and the published button:

```tsx
<>
  <ProjectCard ... />
  {/* activity badge */}
  {(() => {
    const badge = getActivityBadge((tool as any).lastActivityAt);
    return badge ? (
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-1 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
        {badge}
      </div>
    ) : null;
  })()}
  {tool.status === "published" && tool.shareToken && (
    <Button ... >Open Tool</Button>
  )}
</>
```

The `(tool as any).lastActivityAt` cast is needed because the TypeScript type for `listPageBySLP` items may not yet include `lastActivityAt` from the generated API types until `convex dev --once` regenerates them. Once Convex regenerates, replace the cast with `tool.lastActivityAt`.

- [ ] **Step 6.2: Verify it compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep -i "my-tools" | head -10
```

Expected: No errors related to `my-tools-page.tsx`. Any `(tool as any)` suppresses the type error until Convex regenerates types.

- [ ] **Step 6.3: Run full test suite to confirm no regressions**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run 2>&1 | tail -15
```

Expected: Same pass count as before Task 6. No new failures.

- [ ] **Step 6.4: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/my-tools/components/my-tools-page.tsx && git commit -m "feat: add recent activity badge to tool cards on My Tools page"
```

---

## Task 7: Final verification

- [ ] **Step 7.1: Full test suite run**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run 2>&1 | tail -20
```

Expected: All tests pass. The pre-existing 2 always-failing tests on main (ElevenLabs voice ID, settings bg-white) may still fail — those are known pre-existing failures documented in MEMORY and are not regressions.

- [ ] **Step 7.2: TypeScript check**

```bash
cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | head -30
```

Expected: Zero new TypeScript errors introduced by Plan 3. Ignore any pre-existing errors present before this plan was started.

- [ ] **Step 7.3: Convex type check**

```bash
cd /Users/desha/Springfield-Vibeathon && npx convex dev --once 2>&1 | tail -15
```

Expected: "Convex functions ready" — no function type errors.

- [ ] **Step 7.4: Final commit (if any stray changes)**

```bash
cd /Users/desha/Springfield-Vibeathon && git status
```

If any files remain unstaged:

```bash
cd /Users/desha/Springfield-Vibeathon && git add -p && git commit -m "chore: plan 3 final cleanup"
```

---

## Self-Review: Spec Coverage Checklist

| Spec requirement | Task that covers it |
|---|---|
| §3 Patient assignment dropdown in publish | Task 3 — PublishSheet patient Select |
| §3 "Attaches usage data to child's profile" label | Task 3 — PublishSheet label text |
| §3 QR code for child's tablet | Task 3 — QRCodeSVG, download PNG |
| §3 "Open in Session" primary CTA | Task 3 — gradient Button as `<a>` with `?session=true` |
| §3 Unpublish footer link | Task 3 — unpublish Button calling archive mutation |
| §3 `onUnpublish` clears publishedShareToken state | Task 3 — `unpublish` in use-tool-builder |
| §5 `goalTags` on app_instances schema | Task 2 — schema.ts |
| §5 `goalTags` in update mutation | Task 2 — tools.ts update |
| §5 Goal tags editor in Content tab | Task 4 — GoalTagsEditor + wizard wiring |
| §5 IEP tag pills in patient profile | Task 5 — ToolActivitySummary goalTags render |
| §5 Time filter tabs on patient profile | Task 5 — "Last 7 days / Last 30 days / All time" |
| §5 Completion rate bar | Task 5 — ProgressRail per tool row |
| §5 "Used today" / "Used this week" badge on tool cards | Task 6 — my-tools-page badge |
| §5 `lastActivityAt` updated on event log | Task 2 — logEvent patches lastActivityAt |
| §5 Auto-generated session note copy | Task 1 — formatSessionNote utility |
| §5 `goalTags` returned from getEventSummaryByPatient | Task 2 — query return object |

All spec requirements from §3 and §5 are covered. No gaps found.
