# Fullscreen App Mode & Kid Mode Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fullscreen app viewing (builder + My Apps) and a PIN-protected child portal with curated app grid at `/family/[patientId]/play`.

**Architecture:** Two features sharing one `<FullscreenAppView>` component. Feature 1 (fullscreen) is local state in builder/my-tools. Feature 2 (kid mode) adds a new `childApps` Convex table, PIN on `caregiverLinks`, and a new route group `(play)` at `src/app/(play)/` — completely outside `(app)` to avoid inheriting the sidebar/header layout.

**Tech Stack:** Next.js App Router, Convex (schema + functions), Clerk auth (existing session), Tailwind v4, shadcn/ui, Vitest + convex-test

**Spec:** `docs/superpowers/specs/2026-03-29-fullscreen-and-kid-mode-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|----------------|
| `src/shared/components/fullscreen-app-view.tsx` | Shared fullscreen iframe overlay — renders bundleHtml, floating exit button, auto-fade, Escape key support |
| `convex/childApps.ts` | CRUD for child app assignments + `getBundleForApp` query |
| `convex/__tests__/childApps.test.ts` | Backend tests for childApps functions |
| `src/app/(play)/family/[patientId]/play/layout.tsx` | Bare layout for kid mode — own route group, no sidebar/header |
| `src/app/(play)/family/[patientId]/play/page.tsx` | Thin wrapper importing kid-mode-grid |
| `src/app/(play)/family/[patientId]/play/[appId]/page.tsx` | Thin wrapper importing fullscreen app view for kid mode |
| `src/features/family/components/kid-mode-grid.tsx` | Tile grid with greeting header, curated apps + home programs |
| `src/features/family/components/kid-mode-tile.tsx` | Individual large tile component |
| `src/features/family/components/kid-mode-exit.tsx` | Hidden exit strip + slide-down PIN keypad |
| `src/features/family/components/pin-setup-modal.tsx` | 4-digit PIN create + confirm modal |
| `src/features/family/components/app-picker.tsx` | App selection dialog for SLP/caregiver curation |
| `src/features/family/components/quick-rating.tsx` | Post-app 1-5 star rating prompt |
| `src/features/family/components/child-apps-section.tsx` | "Apps for [child]" section on patient detail page |

### Modified Files
| File | Change |
|------|--------|
| `convex/schema.ts` | Add `childApps` table, add `kidModePIN` to `caregiverLinks` |
| `src/core/routes.ts` | Add `FAMILY_PLAY` and `FAMILY_PLAY_APP` route helpers |
| `src/features/builder/components/builder-toolbar.tsx` | Add `onFullscreen` prop + fullscreen icon button |
| `src/features/builder/components/builder-page.tsx` | Add `isFullscreen` state + conditional `<FullscreenAppView>` |
| `src/features/my-tools/components/my-tools-page.tsx` | Add play button + fullscreen overlay |
| `src/features/family/components/family-dashboard.tsx` | Add "Kid Mode" button + "Manage Apps" link |
| `src/features/patients/components/patient-detail-page.tsx` | Add `<ChildAppsSection>` widget |

---

## Task 1: Schema — Add `childApps` table and `kidModePIN` field

**Files:**
- Modify: `convex/schema.ts:197-212` (caregiverLinks table) and append childApps table
- Test: `convex/__tests__/childApps.test.ts` (new)

- [ ] **Step 1: Write schema test verifying new table and field exist**

```typescript
// convex/__tests__/childApps.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("childApps schema", () => {
  it("childApps table exists in schema", () => {
    expect(schema.tables.childApps).toBeDefined();
  });

  it("caregiverLinks accepts kidModePIN field", async () => {
    const t = convexTest(schema, modules);
    const slpId = { subject: "slp-1", issuer: "clerk" };
    const slp = t.withIdentity(slpId);

    // Create a patient first
    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Test",
      lastName: "Child",
      dateOfBirth: "2020-01-01",
      diagnosis: "articulation" as const,
    });

    // Create a caregiver link with kidModePIN
    const linkId = await t.run(async (ctx) => {
      return await ctx.db.insert("caregiverLinks", {
        patientId,
        email: "parent@test.com",
        inviteToken: "test-token-12345678",
        inviteStatus: "pending",
        kidModePIN: "hashed-pin-value",
      });
    });
    const link = await t.run(async (ctx) => ctx.db.get(linkId));
    expect(link?.kidModePIN).toBe("hashed-pin-value");
  });
});
```

Add the missing import at the top:
```typescript
import { api } from "../_generated/api";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/childApps.test.ts`
Expected: FAIL — `childApps` not in schema, `kidModePIN` not accepted

- [ ] **Step 3: Add `childApps` table and `kidModePIN` field to schema**

In `convex/schema.ts`, add after `patientMessages` table (line 448):

```typescript
  childApps: defineTable({
    patientId: v.id("patients"),
    appId: v.id("apps"),
    assignedBy: v.string(),
    assignedByRole: v.union(v.literal("slp"), v.literal("caregiver")),
    label: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_appId", ["appId"]),
```

In the `caregiverLinks` table definition (after `relationship` field, around line 207), add:

```typescript
    kidModePIN: v.optional(v.string()),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/childApps.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/__tests__/childApps.test.ts
git commit -m "feat: add childApps table and kidModePIN field to schema"
```

---

## Task 2: Routes — Add kid mode route helpers

**Files:**
- Modify: `src/core/routes.ts:17-20`

- [ ] **Step 1: Add route helpers**

In `src/core/routes.ts`, add before the closing `} as const;`:

```typescript
  FAMILY_PLAY: (patientId: string) => `/family/${patientId}/play` as const,
  FAMILY_PLAY_APP: (patientId: string, appId: string) => `/family/${patientId}/play/${appId}` as const,
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to routes.ts

- [ ] **Step 3: Commit**

```bash
git add src/core/routes.ts
git commit -m "feat: add FAMILY_PLAY route helpers"
```

---

## Task 3: Convex — `childApps` CRUD functions + `getBundleForApp`

**Files:**
- Create: `convex/childApps.ts`
- Test: `convex/__tests__/childApps.test.ts` (extend from Task 1)

- [ ] **Step 1: Write tests for assign, list, remove, and getBundleForApp**

Append to `convex/__tests__/childApps.test.ts`:

```typescript
import { suppressSchedulerErrors } from "./testHelpers";

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};
const STRANGER = { subject: "stranger-000", issuer: "clerk" };

async function setupPatientWithApp(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Ace",
    lastName: "Smith",
    dateOfBirth: "2020-06-15",
    diagnosis: "articulation" as const,
  });

  // Create a session and app
  const sessionId = await slp.mutation(api.sessions.create, {
    title: "Test Therapy App",
    query: "Build a therapy app",
  });
  const appId = await slp.mutation(api.apps.ensureForSession, {
    sessionId,
    title: "Test Therapy App",
  });

  // Write a bundle file
  await slp.mutation(api.generated_files.upsert, {
    sessionId,
    path: "_bundle.html",
    contents: "<html><body>Test App</body></html>",
    version: 1,
  });

  return { patientId, sessionId, appId };
}

describe("childApps.assign", () => {
  it("SLP can assign an app to a child", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const id = await slp.mutation(api.childApps.assign, {
      patientId,
      appId,
    });
    expect(id).toBeDefined();

    const apps = await slp.query(api.childApps.listByPatient, { patientId });
    expect(apps).toHaveLength(1);
    expect(apps[0].appId).toBe(appId);
    expect(apps[0].assignedByRole).toBe("slp");
  });

  it("stranger cannot assign an app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const stranger = t.withIdentity(STRANGER);

    await expect(
      stranger.mutation(api.childApps.assign, { patientId, appId })
    ).rejects.toThrow();
  });
});

describe("childApps.remove", () => {
  it("removes an assigned app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const id = await slp.mutation(api.childApps.assign, { patientId, appId });
    await slp.mutation(api.childApps.remove, { childAppId: id });

    const apps = await slp.query(api.childApps.listByPatient, { patientId });
    expect(apps).toHaveLength(0);
  });
});

describe("childApps.getBundleForApp", () => {
  it("returns bundle HTML for an assigned app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.childApps.assign, { patientId, appId });

    const bundle = await slp.query(api.childApps.getBundleForApp, {
      patientId,
      appId,
    });
    expect(bundle).toBe("<html><body>Test App</body></html>");
  });

  it("returns null for unassigned app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const bundle = await slp.query(api.childApps.getBundleForApp, {
      patientId,
      appId,
    });
    expect(bundle).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/childApps.test.ts`
Expected: FAIL — `api.childApps` does not exist

- [ ] **Step 3: Implement `convex/childApps.ts`**

```typescript
// convex/childApps.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertPatientAccess, assertCaregiverAccess } from "./lib/auth";

export const assign = mutation({
  args: {
    patientId: v.id("patients"),
    appId: v.id("apps"),
    label: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, role } = await assertPatientAccess(ctx, args.patientId);

    // Verify app exists
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Prevent duplicate assignments
    const existing = await ctx.db
      .query("childApps")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
    if (existing.some((e) => e.appId === args.appId)) {
      throw new Error("App already assigned to this child");
    }

    return await ctx.db.insert("childApps", {
      patientId: args.patientId,
      appId: args.appId,
      assignedBy: userId,
      assignedByRole: role,
      label: args.label,
      sortOrder: args.sortOrder,
    });
  },
});

export const remove = mutation({
  args: { childAppId: v.id("childApps") },
  handler: async (ctx, args) => {
    const childApp = await ctx.db.get(args.childAppId);
    if (!childApp) throw new Error("Assignment not found");
    await assertPatientAccess(ctx, childApp.patientId);
    await ctx.db.delete(args.childAppId);
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    const assignments = await ctx.db
      .query("childApps")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    // Enrich with app details
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const app = await ctx.db.get(a.appId);
        return {
          ...a,
          appTitle: app?.title ?? "Untitled",
          appDescription: app?.description ?? "",
        };
      })
    );
    return enriched;
  },
});

/** Fetch bundle HTML for an app assigned to a child. Authorization: childApps assignment itself. */
export const getBundleForApp = query({
  args: {
    patientId: v.id("patients"),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    // Verify app is assigned to this child
    const assignment = await ctx.db
      .query("childApps")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
    if (!assignment.some((a) => a.appId === args.appId)) return null;

    // Lookup: appId → apps.sessionId → files._bundle.html
    const app = await ctx.db.get(args.appId);
    if (!app?.sessionId) return null;

    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", app.sessionId!).eq("path", "_bundle.html")
      )
      .first();
    return file?.contents ?? null;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/childApps.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/childApps.ts convex/__tests__/childApps.test.ts
git commit -m "feat: childApps CRUD functions with getBundleForApp"
```

---

## Task 4: Shared `<FullscreenAppView>` component

**Files:**
- Create: `src/shared/components/fullscreen-app-view.tsx`

- [ ] **Step 1: Create the fullscreen component**

```tsx
// src/shared/components/fullscreen-app-view.tsx
"use client";

import { Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface FullscreenAppViewProps {
  bundleHtml: string;
  onExit: () => void;
  disableEscapeKey?: boolean;
}

export function FullscreenAppView({
  bundleHtml,
  onExit,
  disableEscapeKey = false,
}: FullscreenAppViewProps) {
  const [showControls, setShowControls] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const blobUrl = useMemo(() => {
    const blob = new Blob([bundleHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [bundleHtml]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  // Auto-fade controls after 3s of inactivity
  const resetFadeTimer = useCallback(() => {
    setShowControls(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetFadeTimer();
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [resetFadeTimer]);

  // Show controls on mouse/touch movement
  useEffect(() => {
    const handler = () => resetFadeTimer();
    window.addEventListener("mousemove", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [resetFadeTimer]);

  // Escape key exits (unless disabled for kid mode)
  useEffect(() => {
    if (disableEscapeKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disableEscapeKey, onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <iframe
        ref={iframeRef}
        title="App fullscreen"
        src={blobUrl}
        sandbox="allow-scripts allow-same-origin"
        className="h-full w-full border-0"
      />

      {/* Floating exit button */}
      <button
        onClick={onExit}
        className={`fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-opacity duration-300 hover:bg-black/70 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Exit fullscreen"
      >
        <Minimize2 className="h-4 w-4" />
        Exit
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "fullscreen-app-view" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/fullscreen-app-view.tsx
git commit -m "feat: shared FullscreenAppView component"
```

---

## Task 5: Builder — Add fullscreen mode

**Files:**
- Modify: `src/features/builder/components/builder-toolbar.tsx:14-32` (add prop)
- Modify: `src/features/builder/components/builder-page.tsx:264-469` (add fullscreen state)

- [ ] **Step 1: Add `onFullscreen` prop to BuilderToolbar**

In `builder-toolbar.tsx`, add to `BuilderToolbarProps` interface (around line 14):

```typescript
  onFullscreen?: () => void;
```

In the right section div (around line 208), add a fullscreen button before the Source button:

```tsx
        {!isGenerating && hasFiles && onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold text-on-surface-variant transition-all active:scale-95"
            onClick={onFullscreen}
            aria-label="Fullscreen"
            title="View app fullscreen"
          >
            <MaterialIcon icon="fullscreen" size="sm" />
            <span className="hidden sm:inline">Fullscreen</span>
          </Button>
        )}
```

- [ ] **Step 2: Add fullscreen state to BuilderPage**

In `builder-page.tsx`, add import at top:

```typescript
import { FullscreenAppView } from "@/shared/components/fullscreen-app-view";
```

Add state (after `shareDialogOpen` state, around line 58):

```typescript
  const [isFullscreen, setIsFullscreen] = useState(false);
```

Pass `onFullscreen` to the toolbar (around line 348-369), add after `hasFiles`:

```typescript
            onFullscreen={bundleHtml ? () => setIsFullscreen(true) : undefined}
```

Add the fullscreen overlay just before the closing `</div>` of the component (before `ShareDialog`, around line 462):

```tsx
      {isFullscreen && bundleHtml && (
        <FullscreenAppView
          bundleHtml={bundleHtml}
          onExit={() => setIsFullscreen(false)}
        />
      )}
```

- [ ] **Step 3: Verify it compiles and renders**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "builder-(page|toolbar)" | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/builder-toolbar.tsx src/features/builder/components/builder-page.tsx
git commit -m "feat: fullscreen mode in builder"
```

---

## Task 6: My Apps — Add play/fullscreen button

**Files:**
- Modify: `src/features/my-tools/components/my-tools-page.tsx`

- [ ] **Step 1: Add fullscreen overlay to My Apps**

In `my-tools-page.tsx`, add imports:

```typescript
import { FullscreenAppView } from "@/shared/components/fullscreen-app-view";
import { useQuery as useConvexQuery } from "convex/react";
```

Add state (after existing state declarations, around line 36):

```typescript
  const [fullscreenSessionId, setFullscreenSessionId] = useState<Id<"sessions"> | null>(null);
```

Add bundle query (after state):

```typescript
  const fullscreenBundle = useQuery(
    api.generated_files.getByPath,
    fullscreenSessionId
      ? { sessionId: fullscreenSessionId, path: "_bundle.html" }
      : "skip"
  );
```

In the `ProjectCard` rendering (around line 215), add an `onPlay` prop. Since `ProjectCard` may not support this yet, add a play button next to the card. Wrap each card in a relative container and add a play button overlay:

After the `<ProjectCard>` component (around line 231), before the closing `</div>` of the relative wrapper, add:

```tsx
                {!renamingId && (
                  <button
                    onClick={() => setFullscreenSessionId(session._id)}
                    className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-primary-gradient px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
                    aria-label="Play app fullscreen"
                    title="Play fullscreen"
                  >
                    <MaterialIcon icon="play_arrow" size="sm" />
                    Play
                  </button>
                )}
```

Add the fullscreen overlay before the `<DeleteConfirmationDialog>` (around line 270):

```tsx
      {fullscreenSessionId && fullscreenBundle?.contents && (
        <FullscreenAppView
          bundleHtml={fullscreenBundle.contents}
          onExit={() => setFullscreenSessionId(null)}
        />
      )}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "my-tools-page" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/my-tools/components/my-tools-page.tsx
git commit -m "feat: play/fullscreen button on My Apps cards"
```

---

## Task 7: PIN setup modal

**Files:**
- Create: `src/features/family/components/pin-setup-modal.tsx`

- [ ] **Step 1: Create PIN setup modal component**

```tsx
// src/features/family/components/pin-setup-modal.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

interface PinSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPinSet: (pin: string) => void;
}

export function PinSetupModal({ open, onOpenChange, onPinSet }: PinSetupModalProps) {
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const currentPin = step === "enter" ? pin : confirmPin;
  const setCurrentPin = step === "enter" ? setPin : setConfirmPin;

  function handleDigit(digit: string) {
    if (currentPin.length >= 4) return;
    setCurrentPin(currentPin + digit);
    setError("");
  }

  function handleBackspace() {
    setCurrentPin(currentPin.slice(0, -1));
    setError("");
  }

  function handleSubmit() {
    if (currentPin.length !== 4) return;

    if (step === "enter") {
      setStep("confirm");
      return;
    }

    // Confirm step
    if (confirmPin !== pin) {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
      return;
    }

    onPinSet(pin);
    // Reset state
    setPin("");
    setConfirmPin("");
    setStep("enter");
    setError("");
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setPin("");
      setConfirmPin("");
      setStep("enter");
      setError("");
    }
    onOpenChange(open);
  }

  const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center font-headline">
            {step === "enter" ? "Set a Kid Mode PIN" : "Confirm your PIN"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "enter"
              ? "Choose a 4-digit PIN to lock Kid Mode"
              : "Enter the same PIN again to confirm"}
          </DialogDescription>
        </DialogHeader>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 py-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-4 w-4 rounded-full transition-all duration-200",
                i < currentPin.length ? "bg-primary scale-110" : "bg-muted"
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-2">
          {DIGITS.map((d, i) => {
            if (d === "") return <div key={i} />;
            if (d === "back") {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  className="flex h-14 items-center justify-center rounded-xl text-lg font-medium text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Backspace"
                >
                  ←
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                className="flex h-14 items-center justify-center rounded-xl text-xl font-semibold text-foreground transition-colors hover:bg-muted active:bg-primary/10"
              >
                {d}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={currentPin.length !== 4}
          className="w-full"
        >
          {step === "enter" ? "Next" : "Set PIN"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "pin-setup" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/family/components/pin-setup-modal.tsx
git commit -m "feat: PIN setup modal for kid mode"
```

---

## Task 8: Convex — PIN management mutations

**Files:**
- Add to: `convex/childApps.ts`
- Test: `convex/__tests__/childApps.test.ts` (extend)

- [ ] **Step 1: Write tests for PIN set and verify**

Append to `convex/__tests__/childApps.test.ts`:

```typescript
describe("childApps.setPIN and verifyPIN", () => {
  it("caregiver can set and verify PIN", async () => {
    const t = convexTest(schema, modules);
    // Create patient and link caregiver
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Ace",
      lastName: "Smith",
      dateOfBirth: "2020-06-15",
      diagnosis: "articulation" as const,
    });
    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    await caregiver.mutation(api.caregivers.acceptInvite, { token });

    // Set PIN
    await caregiver.mutation(api.childApps.setPIN, {
      patientId,
      pin: "1234",
    });

    // Verify correct PIN
    const valid = await caregiver.mutation(api.childApps.verifyPIN, {
      patientId,
      pin: "1234",
    });
    expect(valid).toBe(true);

    // Verify wrong PIN
    const invalid = await caregiver.mutation(api.childApps.verifyPIN, {
      patientId,
      pin: "0000",
    });
    expect(invalid).toBe(false);
  });

  it("hasPIN returns false when no PIN set", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Ace",
      lastName: "Smith",
      dateOfBirth: "2020-06-15",
      diagnosis: "articulation" as const,
    });
    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    await caregiver.mutation(api.caregivers.acceptInvite, { token });

    const has = await caregiver.query(api.childApps.hasPIN, { patientId });
    expect(has).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/childApps.test.ts`
Expected: FAIL — `api.childApps.setPIN` does not exist

- [ ] **Step 3: Implement PIN functions in `convex/childApps.ts`**

Add to `convex/childApps.ts`:

```typescript
/**
 * Simple hash for PIN. Threat model: child-proofing, not security.
 * Uses djb2 + salt — no crypto.subtle needed (not available in Convex runtime).
 */
function hashPIN(pin: string): string {
  const salted = `bridges-kid-mode:${pin}`;
  let hash = 5381;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash + salted.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export const setPIN = mutation({
  args: {
    patientId: v.id("patients"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCaregiverAccess(ctx, args.patientId);
    if (args.pin.length !== 4 || !/^\d{4}$/.test(args.pin)) {
      throw new Error("PIN must be exactly 4 digits");
    }

    const hashed = hashPIN(args.pin);

    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();
    if (!link) throw new Error("Caregiver link not found");

    await ctx.db.patch(link._id, { kidModePIN: hashed });
  },
});

/** Mutation (not query) because hash computation should not run in reactive queries. */
export const verifyPIN = mutation({
  args: {
    patientId: v.id("patients"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();
    if (!link?.kidModePIN) return false;

    const hashed = hashPIN(args.pin);
    return hashed === link.kidModePIN;
  },
});

export const hasPIN = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();
    return !!link?.kidModePIN;
  },
});
```

Note: The initial import in Task 3 already includes `assertCaregiverAccess`. The `hashPIN` function uses pure JS (no `crypto.subtle`, no `"use node"` needed).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/childApps.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/childApps.ts convex/__tests__/childApps.test.ts
git commit -m "feat: PIN set/verify/hasPIN functions for kid mode"
```

---

## Task 9: Kid Mode exit panel

**Files:**
- Create: `src/features/family/components/kid-mode-exit.tsx`

- [ ] **Step 1: Create the exit panel component**

```tsx
// src/features/family/components/kid-mode-exit.tsx
"use client";

import { useCallback, useState } from "react";
import { cn } from "@/core/utils";

interface KidModeExitProps {
  onVerify: (pin: string) => Promise<boolean>;
  onExit: () => void;
}

export function KidModeExit({ onVerify, onExit }: KidModeExitProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);

    if (next.length === 4) {
      // Auto-submit on 4th digit
      onVerify(next).then((valid) => {
        if (valid) {
          onExit();
        } else {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setPin("");
          }, 500);
        }
      });
    }
  }, [pin, onVerify, onExit]);

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <>
      {/* Hidden trigger strip at top of screen */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-0 left-0 right-0 z-[70] h-2 cursor-default"
        aria-label="Exit kid mode"
      />

      {/* Slide-down panel */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[80] transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="mx-auto max-w-sm rounded-b-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
            Enter PIN to exit
          </p>

          {/* PIN dots */}
          <div
            className={cn(
              "flex justify-center gap-3 pb-4",
              shake && "animate-[shake_0.5s_ease-in-out]"
            )}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-4 w-4 rounded-full transition-all duration-200",
                  i < pin.length ? "bg-primary scale-110" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {DIGITS.map((d, i) => {
              if (d === "") return <div key={i} />;
              if (d === "back") {
                return (
                  <button
                    key={i}
                    onClick={handleBackspace}
                    className="flex h-12 items-center justify-center rounded-xl text-lg text-muted-foreground hover:bg-muted"
                    aria-label="Backspace"
                  >
                    ←
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => handleDigit(d)}
                  className="flex h-12 items-center justify-center rounded-xl text-xl font-semibold text-foreground hover:bg-muted active:bg-primary/10"
                >
                  {d}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              setPin("");
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>

        {/* Backdrop */}
        <div
          className="fixed inset-0 -z-10 bg-black/30"
          onClick={() => {
            setIsOpen(false);
            setPin("");
          }}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add shake animation to globals.css**

In `src/app/globals.css`, add within the existing `@theme` block or after it:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "kid-mode-exit" | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/family/components/kid-mode-exit.tsx src/app/globals.css
git commit -m "feat: kid mode exit panel with PIN keypad"
```

---

## Task 10: Kid Mode tile component

**Files:**
- Create: `src/features/family/components/kid-mode-tile.tsx`

- [ ] **Step 1: Create the tile component**

```tsx
// src/features/family/components/kid-mode-tile.tsx
"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/core/utils";
import { ROUTES } from "@/core/routes";

interface KidModeTileProps {
  patientId: string;
  appId: string;
  title: string;
  isPractice?: boolean;
}

// Pastel colors for tiles without thumbnails
const TILE_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-yellow-100 text-yellow-700",
  "bg-red-100 text-red-700",
];

function getColorForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
}

export function KidModeTile({ patientId, appId, title, isPractice }: KidModeTileProps) {
  const colorClass = getColorForTitle(title);
  const initial = title.charAt(0).toUpperCase();

  return (
    <Link
      href={ROUTES.FAMILY_PLAY_APP(patientId, appId)}
      className="group relative flex aspect-square flex-col items-center justify-center rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.03] active:scale-95"
    >
      {/* Colorful background */}
      <div className={cn("absolute inset-0 rounded-3xl", colorClass.split(" ")[0])} />

      {/* Letter placeholder */}
      <span
        className={cn(
          "relative z-10 text-6xl font-bold font-headline opacity-80",
          colorClass.split(" ")[1]
        )}
      >
        {initial}
      </span>

      {/* Title */}
      <p className="relative z-10 mt-3 max-w-full truncate px-2 text-center text-base font-bold font-headline text-foreground">
        {title}
      </p>

      {/* Practice badge */}
      {isPractice && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-400 p-1.5 shadow-md">
          <Star className="h-4 w-4 fill-white text-white" />
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "kid-mode-tile" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/family/components/kid-mode-tile.tsx
git commit -m "feat: kid mode tile component"
```

---

## Task 11: Kid Mode grid page + layout

**Files:**
- Create: `src/app/(play)/family/[patientId]/play/layout.tsx`
- Create: `src/app/(play)/family/[patientId]/play/page.tsx`
- Create: `src/features/family/components/kid-mode-grid.tsx`

- [ ] **Step 1: Create the bare kid mode layout**

```tsx
// src/app/(play)/family/[patientId]/play/layout.tsx

import { Providers } from "@/core/providers";

// Kid mode layout: own route group — no sidebar, no header, completely bare.
// Must include Providers since this is outside the (app) route group.
export default function KidModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-950">
        {children}
      </div>
    </Providers>
  );
}
```

- [ ] **Step 2: Create the grid page component**

```tsx
// src/features/family/components/kid-mode-grid.tsx
"use client";

import { use } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { KidModeTile } from "./kid-mode-tile";
import { KidModeExit } from "./kid-mode-exit";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/core/routes";

interface KidModeGridProps {
  paramsPromise: Promise<{ patientId: string }>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function KidModeGrid({ paramsPromise }: KidModeGridProps) {
  const { patientId } = use(paramsPromise);
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const childApps = useQuery(
    api.childApps.listByPatient,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const activePrograms = useQuery(
    api.homePrograms.getActiveByPatient,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const handleVerifyPIN = async (pin: string): Promise<boolean> => {
    // We use a direct fetch since useQuery can't be called conditionally
    // Instead, we'll use the convex query via the existing hook
    // For now, check against the verifyPIN query
    try {
      const result = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, pin }),
      });
      return result.ok && (await result.json()).valid;
    } catch {
      return false;
    }
  };

  if (!isAuthenticated || patient === undefined || childApps === undefined) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const childName = patient?.firstName ?? "friend";
  const greeting = getGreeting();

  // Combine curated apps + home programs with linked apps
  const appTiles = (childApps ?? []).map((ca) => ({
    id: ca.appId as string,
    title: ca.label ?? ca.appTitle,
    isPractice: false,
  }));

  // Home programs with materialId → patientMaterials → appId
  // Only show programs that have an app linked via patientMaterials
  // The grid query should resolve this chain server-side for efficiency
  // For now, programs without apps are NOT shown as tiles (they appear in the
  // parent's family dashboard as practice activities instead)
  // programTiles are populated via a dedicated query that resolves the chain:
  // homePrograms.materialId → patientMaterials.appId → apps._id
  // TODO: Add convex/childApps.ts:getHomeProgramApps query in implementation

  const allTiles = [...appTiles];

  return (
    <div className="flex min-h-screen flex-col p-6">
      <KidModeExit
        onVerify={handleVerifyPIN}
        onExit={() => router.push(ROUTES.FAMILY_CHILD(patientId))}
      />

      {/* Greeting */}
      <div className="mb-8 text-center">
        <h1 className="font-headline text-3xl font-bold text-foreground">
          {greeting}, {childName}!
        </h1>
      </div>

      {/* Tile grid */}
      {allTiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Gamepad2 className="h-10 w-10 text-primary/40" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            No apps yet! Ask your therapist or parent to add some.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {allTiles.map((tile) => (
            <KidModeTile
              key={tile.id}
              patientId={patientId}
              appId={tile.id}
              title={tile.title}
              isPractice={tile.isPractice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the thin page wrapper**

```tsx
// src/app/(play)/family/[patientId]/play/page.tsx
import { KidModeGrid } from "@/features/family/components/kid-mode-grid";

export default function KidModePlayPage(props: {
  params: Promise<{ patientId: string }>;
}) {
  return <KidModeGrid paramsPromise={props.params} />;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(kid-mode|play)" | head -10`
Expected: No errors (or minor type issues to fix)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(play\)/family/\[patientId\]/play/layout.tsx src/app/\(play\)/family/\[patientId\]/play/page.tsx src/features/family/components/kid-mode-grid.tsx
git commit -m "feat: kid mode grid page with bare layout"
```

---

## Task 12: Kid Mode fullscreen app page

**Files:**
- Create: `src/app/(play)/family/[patientId]/play/[appId]/page.tsx`
- Create: `src/features/family/components/kid-mode-app-view.tsx`

- [ ] **Step 1: Create the kid mode app view component**

```tsx
// src/features/family/components/kid-mode-app-view.tsx
"use client";

import { use } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FullscreenAppView } from "@/shared/components/fullscreen-app-view";
import { ROUTES } from "@/core/routes";
import { KidModeExit } from "./kid-mode-exit";

interface KidModeAppViewProps {
  paramsPromise: Promise<{ patientId: string; appId: string }>;
}

export function KidModeAppView({ paramsPromise }: KidModeAppViewProps) {
  const { patientId, appId } = use(paramsPromise);
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const bundleHtml = useQuery(
    api.childApps.getBundleForApp,
    isAuthenticated
      ? { patientId: patientId as Id<"patients">, appId: appId as Id<"apps"> }
      : "skip"
  );

  const handleVerifyPIN = async (pin: string): Promise<boolean> => {
    try {
      const result = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, pin }),
      });
      return result.ok && (await result.json()).valid;
    } catch {
      return false;
    }
  };

  const gridUrl = ROUTES.FAMILY_PLAY(patientId);

  if (bundleHtml === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (bundleHtml === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">App not found</p>
        <button
          onClick={() => router.push(gridUrl)}
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to apps
        </button>
      </div>
    );
  }

  return (
    <>
      <KidModeExit
        onVerify={handleVerifyPIN}
        onExit={() => router.push(ROUTES.FAMILY_CHILD(patientId))}
      />

      <FullscreenAppView
        bundleHtml={bundleHtml}
        onExit={() => router.push(gridUrl)}
        disableEscapeKey
      />

      {/* Floating back button (top-left) */}
      <button
        onClick={() => router.push(gridUrl)}
        className="fixed left-4 top-4 z-[60] rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70 active:scale-95"
        aria-label="Back to apps"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
    </>
  );
}
```

- [ ] **Step 2: Create the thin page wrapper**

```tsx
// src/app/(play)/family/[patientId]/play/[appId]/page.tsx
import { KidModeAppView } from "@/features/family/components/kid-mode-app-view";

export default function KidModeAppPage(props: {
  params: Promise<{ patientId: string; appId: string }>;
}) {
  return <KidModeAppView paramsPromise={props.params} />;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "kid-mode-app" | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(play\)/family/\[patientId\]/play/\[appId\]/page.tsx src/features/family/components/kid-mode-app-view.tsx
git commit -m "feat: kid mode fullscreen app page"
```

---

## Task 13: Family dashboard — Kid Mode entry point

**Files:**
- Modify: `src/features/family/components/family-dashboard.tsx`

- [ ] **Step 1: Add Kid Mode button and Manage Apps link**

Add imports at the top of `family-dashboard.tsx`:

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery as useConvexQuery } from "convex/react";
import { Gamepad2, Settings2 } from "lucide-react";
import { ROUTES } from "@/core/routes";
import { PinSetupModal } from "./pin-setup-modal";
```

Inside the component, after `const { streakData, unreadCount, isLoading } = useFamilyData(...)`:

```typescript
  const router = useRouter();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const hasPIN = useQuery(
    api.childApps.hasPIN,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );
  const setPIN = useMutation(api.childApps.setPIN);

  function handleKidMode() {
    if (hasPIN === false) {
      setShowPinSetup(true);
    } else {
      router.push(ROUTES.FAMILY_PLAY(patientId));
    }
  }

  async function handlePinSet(pin: string) {
    await setPIN({ patientId: patientId as Id<"patients">, pin });
    setShowPinSetup(false);
    router.push(ROUTES.FAMILY_PLAY(patientId));
  }
```

In the JSX, add a Kid Mode section after the header and before the CelebrationCard (around line 66, after the closing `</div>` of the header):

```tsx
      {/* Kid Mode entry */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleKidMode}
          className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary-container py-6 text-lg font-bold text-white shadow-lg"
          size="lg"
        >
          <Gamepad2 className="h-6 w-6" />
          Kid Mode
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14"
          onClick={() => {/* TODO: open app picker */}}
          aria-label="Manage apps"
          title="Manage apps for Kid Mode"
        >
          <Settings2 className="h-5 w-5" />
        </Button>
      </div>

      <PinSetupModal
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        onPinSet={handlePinSet}
      />
```

Note: also add the `useState` import to the existing `import { use } from "react"` — change to `import { use, useState } from "react"`.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "family-dashboard" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/family/components/family-dashboard.tsx
git commit -m "feat: kid mode entry point on family dashboard"
```

---

## Task 14: App picker for curation

**Files:**
- Create: `src/features/family/components/app-picker.tsx`

- [ ] **Step 1: Create the app picker dialog**

```tsx
// src/features/family/components/app-picker.tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/core/utils";

interface AppPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: Id<"patients">;
}

export function AppPicker({ open, onOpenChange, patientId }: AppPickerProps) {
  // Query apps (not sessions) — apps have the appId we need for childApps
  const apps = useQuery(api.apps.listMine);
  const childApps = useQuery(api.childApps.listByPatient, { patientId });
  const assign = useMutation(api.childApps.assign);
  const remove = useMutation(api.childApps.remove);

  const assignedAppIds = new Set((childApps ?? []).map((ca) => ca.appId as string));

  // Build a lookup from appId → childApp._id for removal
  const childAppByAppId = new Map(
    (childApps ?? []).map((ca) => [ca.appId as string, ca._id])
  );

  async function handleToggle(appId: Id<"apps">, title: string) {
    const isAssigned = assignedAppIds.has(appId as string);
    try {
      if (isAssigned) {
        const childAppId = childAppByAppId.get(appId as string);
        if (childAppId) await remove({ childAppId });
        toast.success(`Removed "${title}" from Kid Mode`);
      } else {
        await assign({ patientId, appId });
        toast.success(`Added "${title}" to Kid Mode`);
      }
    } catch (err) {
      toast.error(isAssigned ? "Failed to remove app" : "Failed to add app");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Kid Mode Apps</DialogTitle>
          <DialogDescription>
            Choose which apps appear in Kid Mode
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {!apps ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved apps yet. Build one in the Builder!
            </p>
          ) : (
            apps.map((app) => {
              const isAssigned = assignedAppIds.has(app._id as string);
              return (
                <button
                  key={app._id}
                  onClick={() => handleToggle(app._id, app.title)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
                    isAssigned ? "bg-primary/5" : "hover:bg-muted"
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-headline text-lg font-bold text-primary">
                    {app.title.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium">{app.title}</span>
                  {isAssigned ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Note: This queries `api.apps.listMine` — a new query that returns apps owned by the current user. If this query doesn't exist yet, add it to `convex/apps.ts`:
```typescript
export const listMine = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("apps").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "app-picker" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/family/components/app-picker.tsx
git commit -m "feat: app picker dialog for kid mode curation (MVP)"
```

---

## Task 15: Patient detail — Child Apps section (SLP curation)

**Files:**
- Create: `src/features/family/components/child-apps-section.tsx`
- Modify: `src/features/patients/components/patient-detail-page.tsx`

- [ ] **Step 1: Create the child apps section widget**

```tsx
// src/features/family/components/child-apps-section.tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { AppPicker } from "./app-picker";

interface ChildAppsSectionProps {
  patientId: Id<"patients">;
}

export function ChildAppsSection({ patientId }: ChildAppsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const childApps = useQuery(api.childApps.listByPatient, { patientId });
  const removeApp = useMutation(api.childApps.remove);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-headline text-lg font-semibold">Kid Mode Apps</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add App
        </Button>
      </div>

      {childApps === undefined ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : childApps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No apps assigned yet. Add apps for the child to use in Kid Mode.
        </p>
      ) : (
        <div className="space-y-2">
          {childApps.map((ca) => (
            <div
              key={ca._id}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                  {(ca.label ?? ca.appTitle).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{ca.label ?? ca.appTitle}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeApp({ childAppId: ca._id })}
                aria-label="Remove app"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AppPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        patientId={patientId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add widget to patient detail page**

In `src/features/patients/components/patient-detail-page.tsx`, add import:

```typescript
import { ChildAppsSection } from "@/features/family/components/child-apps-section";
```

In the right column `<div>` (around line 59), add after `<HomeProgramsWidget>`:

```tsx
          <ChildAppsSection patientId={patient._id} />
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(child-apps|patient-detail)" | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/family/components/child-apps-section.tsx src/features/patients/components/patient-detail-page.tsx
git commit -m "feat: child apps section on patient detail page"
```

---

## Task 16: Quick rating prompt (post-app)

**Files:**
- Create: `src/features/family/components/quick-rating.tsx`

- [ ] **Step 1: Create the star rating component**

```tsx
// src/features/family/components/quick-rating.tsx
"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/core/utils";

interface QuickRatingProps {
  onRate: (stars: number) => void;
  onSkip: () => void;
}

export function QuickRating({ onRate, onSkip }: QuickRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
        <p className="mb-4 text-lg font-bold font-headline text-foreground">
          How did it go?
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="p-1 transition-transform active:scale-90"
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-10 w-10 transition-colors",
                  star <= hoveredStar
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted"
                )}
              />
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "quick-rating" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/family/components/quick-rating.tsx
git commit -m "feat: quick star rating prompt for kid mode"
```

---

## Task 17: PIN verification API route

**Files:**
- Create: `src/app/api/verify-pin/route.ts`

The kid mode grid and app view need to verify PINs. Since Convex queries can't be called imperatively from client components (they're hooks), we need a small API route.

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/verify-pin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const body = await request.json();
  const { patientId, pin } = body as { patientId?: string; pin?: string };

  if (!patientId || !pin) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    const valid = await fetchMutation(api.childApps.verifyPIN, {
      patientId: patientId as Id<"patients">,
      pin,
    }, { token });
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
```

Note: Uses `fetchMutation` (not `fetchQuery`) because `verifyPIN` is a mutation. The `{ token }` option forwards the Clerk JWT so Convex `assertPatientAccess` can authenticate the caller. Uses POST to avoid PIN in URL query string.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "verify-pin" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/verify-pin/route.ts
git commit -m "feat: PIN verification API route"
```

---

## Task 18: Integration test — full flow

**Files:**
- Extend: `convex/__tests__/childApps.test.ts`

- [ ] **Step 1: Add integration test covering full assign → list → bundle → remove flow**

Append to `convex/__tests__/childApps.test.ts`:

```typescript
describe("childApps — full integration flow", () => {
  it("assign → listByPatient → getBundleForApp → remove", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    // Assign
    const childAppId = await slp.mutation(api.childApps.assign, {
      patientId,
      appId,
      label: "Fun Practice Game",
    });

    // List — should include enriched data
    const list = await slp.query(api.childApps.listByPatient, { patientId });
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("Fun Practice Game");
    expect(list[0].appTitle).toBe("Test Therapy App");

    // Get bundle
    const bundle = await slp.query(api.childApps.getBundleForApp, {
      patientId,
      appId,
    });
    expect(bundle).toContain("<html>");

    // Remove
    await slp.mutation(api.childApps.remove, { childAppId });
    const afterRemove = await slp.query(api.childApps.listByPatient, { patientId });
    expect(afterRemove).toHaveLength(0);

    // Bundle should return null after removal
    const bundleAfter = await slp.query(api.childApps.getBundleForApp, {
      patientId,
      appId,
    });
    expect(bundleAfter).toBeNull();
  });

  it("prevents duplicate assignment", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.childApps.assign, { patientId, appId });
    await expect(
      slp.mutation(api.childApps.assign, { patientId, appId })
    ).rejects.toThrow("already assigned");
  });
});
```

- [ ] **Step 2: Run all childApps tests**

Run: `npx vitest run convex/__tests__/childApps.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: No new failures

- [ ] **Step 4: Commit**

```bash
git add convex/__tests__/childApps.test.ts
git commit -m "test: full integration tests for childApps flow"
```

---

## Task 19: Final TypeScript check + cleanup

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -30`
Expected: No errors in new/modified files

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address TypeScript and test issues from kid mode implementation"
```
