# PWA Kid Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installable PWA play experience where caregivers pin a per-child therapy app grid to a tablet home screen.

**Architecture:** Dual-manifest approach — root `manifest.ts` for "Bridges" + dynamic route handler manifest per child. New `(play)` route group with fullscreen layout (no sidebar). Reuses existing `patientMaterials`, `apps`, `files`, `caregiverLinks`, and `homePrograms` tables with no schema changes.

**Tech Stack:** Next.js 16 App Router, Convex (queries + ConvexHttpClient), Clerk auth, Tailwind v4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-29-pwa-kid-mode-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `public/icon-192.png` | Create | PWA icon 192x192 |
| `public/icon-512.png` | Create | PWA icon 512x512 |
| `src/app/manifest.ts` | Create | Root "Bridges" web app manifest |
| `src/app/layout.tsx` | Modify | Add `manifest` field to metadata export |
| `convex/patients.ts` | Modify | Add `getForPlay` soft-fail query |
| `convex/__tests__/patients.test.ts` | Modify | Tests for `getForPlay` |
| `convex/generated_files.ts` | Modify | Add `getBundleByAppId` query |
| `convex/__tests__/generated_files.test.ts` | Modify | Tests for `getBundleByAppId` |
| `src/features/play/hooks/use-play-data.ts` | Create | Fetches materials + apps + programs for grid |
| `src/features/play/hooks/__tests__/use-play-data.test.ts` | Create | Unit tests for play data hook |
| `src/features/play/components/play-auth-guard.tsx` | Create | Auth guard: caregiverLink check |
| `src/features/play/components/__tests__/play-auth-guard.test.tsx` | Create | Tests for auth guard |
| `src/features/play/components/app-tile.tsx` | Create | Single colorful tile |
| `src/features/play/components/__tests__/app-tile.test.tsx` | Create | Tests for app tile |
| `src/features/play/components/play-grid.tsx` | Create | Responsive grid of tiles + top bar |
| `src/features/play/components/__tests__/play-grid.test.tsx` | Create | Tests for play grid |
| `src/features/play/components/app-viewer.tsx` | Create | Fullscreen iframe app renderer |
| `src/features/play/components/__tests__/app-viewer.test.tsx` | Create | Tests for app viewer |
| `src/app/(play)/layout.tsx` | Create | Fullscreen layout shell |
| `src/app/(play)/family/[patientId]/play/page.tsx` | Create | Thin wrapper → PlayGrid |
| `src/app/(play)/family/[patientId]/play/[appId]/page.tsx` | Create | Thin wrapper → AppViewer |
| `src/app/(play)/family/[patientId]/play/manifest.json/route.ts` | Create | Dynamic per-child manifest |
| `src/proxy.ts` | Modify | Add play manifest to public routes |

---

### Task 1: PWA Icons + Root Manifest

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `src/app/manifest.ts`
- Modify: `src/app/layout.tsx:10-27`

- [ ] **Step 1: Generate PWA icons from existing favicon.svg**

Use the existing `public/favicon.svg` (a bridge icon in `#0d7377` teal) to generate PNG icons. The SVG is 32x32 viewBox. Use a tool or create simple colored-background PNGs:

```bash
# If sharp is available via npx, or use any SVG→PNG tool:
npx --yes sharp-cli -i public/favicon.svg -o public/icon-192.png resize 192 192 -- flatten --background "#f8faf8"
npx --yes sharp-cli -i public/favicon.svg -o public/icon-512.png resize 512 512 -- flatten --background "#f8faf8"
```

If `sharp-cli` doesn't work, create the PNGs manually using any approach that produces valid 192x192 and 512x512 PNGs from the SVG. A simple fallback: use a solid teal square with the bridge shape.

- [ ] **Step 2: Create the root manifest**

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bridges — AI Therapy App Builder",
    short_name: "Bridges",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#f8faf8",
    background_color: "#f8faf8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 3: Verify manifest is served**

Run: `npm run dev` and visit `http://localhost:3000/manifest.webmanifest` in a browser.

Expected: JSON response with `name: "Bridges — AI Therapy App Builder"`, valid icon paths.

- [ ] **Step 4: Commit**

```bash
git add public/icon-192.png public/icon-512.png src/app/manifest.ts
git commit -m "feat: add root PWA manifest and icons"
```

---

### Task 2: Backend Queries — getForPlay + getBundleByAppId

Two new Convex queries needed:

1. `patients.getForPlay` — same as `patients.get` but returns `null` instead of throwing when the user has no access. The existing `patients.get` throws `ConvexError("Not authorized")` which would crash the React component (Convex propagates errors to error boundaries, not as `null` return values).

2. `generated_files.getBundleByAppId` — fetches an app's bundled HTML by `appId` (not `shareSlug`).

**Files:**
- Modify: `convex/patients.ts:85-107`
- Modify: `convex/__tests__/patients.test.ts`
- Modify: `convex/generated_files.ts:105-123`
- Modify: `convex/__tests__/generated_files.test.ts`

- [ ] **Step 1: Add getForPlay query to patients.ts**

Add to `convex/patients.ts` after the existing `get` query:

```ts
/** Returns just the patient's first name without auth. Used by the PWA manifest
 *  route handler which runs server-side without a user session. First names are
 *  not sensitive and the patientId is already in the URL. */
export const getPublicFirstName = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    return patient?.firstName ?? null;
  },
});

/** Soft-fail variant of `get` — returns null instead of throwing when unauthorized.
 *  Used by the play grid where we show a friendly "no access" UI instead of an error boundary. */
export const getForPlay = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;

    if (patient.slpUserId === userId) return patient;

    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .first();
    if (link) return patient;

    return null;
  },
});
```

- [ ] **Step 2: Add tests for getForPlay**

Add to `convex/__tests__/patients.test.ts` in a new describe block:

```ts
describe("patients.getForPlay", () => {
  it("returns patient for authorized caregiver", async () => {
    const t = convexTest(schema, modules);
    // Setup: SLP creates patient, invites caregiver, caregiver accepts
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Ace", lastName: "Test", dateOfBirth: "2020-01-01", diagnosis: "articulation",
    });
    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId, email: "parent@test.com",
    });
    const caregiver = t.withIdentity({ subject: "caregiver-1", issuer: "clerk" });
    await caregiver.mutation(api.caregivers.acceptInvite, { token });

    const result = await caregiver.query(api.patients.getForPlay, { patientId });
    expect(result).not.toBeNull();
    expect(result?.firstName).toBe("Ace");
  });

  it("returns null for unlinked user instead of throwing", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Ace", lastName: "Test", dateOfBirth: "2020-01-01", diagnosis: "articulation",
    });
    const unlinked = t.withIdentity({ subject: "random-user", issuer: "clerk" });

    const result = await unlinked.query(api.patients.getForPlay, { patientId });
    expect(result).toBeNull();
  });

  it("returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Ace", lastName: "Test", dateOfBirth: "2020-01-01", diagnosis: "articulation",
    });

    const result = await t.query(api.patients.getForPlay, { patientId });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run patients tests**

Run: `npx vitest run convex/__tests__/patients.test.ts --reporter=verbose`

Expected: All PASS including 3 new getForPlay tests.

- [ ] **Step 4: Write failing getBundleByAppId tests**

Add to `convex/__tests__/generated_files.test.ts`, in a new `describe("generated_files.getBundleByAppId")` block:

```ts
describe("generated_files.getBundleByAppId", () => {
  it("returns bundle HTML for a valid appId", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity(TEST_IDENTITY);
    const sessionId = await authed.mutation(api.sessions.create, {
      title: "Play Test App",
      query: "test",
    });
    // Use direct db.insert to avoid free-tier limit checks in apps.create
    let appId: any;
    await authed.run(async (ctx) => {
      await ctx.db.insert("files", {
        sessionId,
        path: "_bundle.html",
        contents: "<html><body>Play App</body></html>",
        version: 1,
      });
      appId = await ctx.db.insert("apps", {
        title: "Test App",
        description: "For play grid",
        shareSlug: "play-test-slug",
        sessionId,
        userId: TEST_IDENTITY.subject,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const html = await t.query(api.generated_files.getBundleByAppId, { appId });
    expect(html).toBe("<html><body>Play App</body></html>");
  });

  it("returns null for nonexistent appId", async () => {
    const t = convexTest(schema, modules);
    let appId: any;
    await t.withIdentity(TEST_IDENTITY).run(async (ctx) => {
      appId = await ctx.db.insert("apps", {
        title: "Temp",
        description: "Temp",
        shareSlug: "temp-slug",
        userId: TEST_IDENTITY.subject,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(appId);
    });

    const html = await t.query(api.generated_files.getBundleByAppId, { appId });
    expect(html).toBeNull();
  });

  it("returns null when app has no session", async () => {
    const t = convexTest(schema, modules);
    let appId: any;
    await t.withIdentity(TEST_IDENTITY).run(async (ctx) => {
      appId = await ctx.db.insert("apps", {
        title: "No Session",
        description: "Missing",
        shareSlug: "no-session-play",
        userId: TEST_IDENTITY.subject,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const html = await t.query(api.generated_files.getBundleByAppId, { appId });
    expect(html).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/generated_files.test.ts --reporter=verbose`

Expected: FAIL — `api.generated_files.getBundleByAppId` does not exist

- [ ] **Step 3: Implement getBundleByAppId**

Add to `convex/generated_files.ts` after the `getPublicBundle` query:

```ts
/** Public query — serves bundle HTML by appId. Used by play grid viewer. */
export const getBundleByAppId = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    const sessionId = app?.sessionId;
    if (!sessionId) return null;
    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", "_bundle.html")
      )
      .first();
    return file?.contents ?? null;
  },
});
```

Note: This query has no auth check — bundle HTML is not sensitive (it's the same content served to anyone with the share link). The auth boundary is at the play page level.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/generated_files.test.ts --reporter=verbose`

Expected: All tests PASS including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add convex/generated_files.ts convex/__tests__/generated_files.test.ts
git commit -m "feat: add getBundleByAppId query for play grid viewer"
```

---

### Task 3: use-play-data Hook

Client-side hook that fetches materials, resolves apps, and identifies active home programs for the grid.

**Files:**
- Create: `src/features/play/hooks/use-play-data.ts`
- Create: `src/features/play/hooks/__tests__/use-play-data.test.ts`

- [ ] **Step 1: Write the hook**

Create `src/features/play/hooks/use-play-data.ts`:

```ts
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface PlayApp {
  materialId: Id<"patientMaterials">;
  appId: Id<"apps">;
  title: string;
  description: string;
  assignedAt: number;
  hasPracticeProgram: boolean;
}

export function usePlayData(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const skip = !isAuthenticated ? ("skip" as const) : undefined;

  const materials = useQuery(
    api.patientMaterials.listByPatient,
    skip ?? { patientId }
  );

  const programs = useQuery(
    api.homePrograms.listByPatient,
    skip ?? { patientId }
  );

  if (materials === undefined || programs === undefined) {
    return { apps: undefined, isLoading: true };
  }

  // Filter to materials with appId, map to PlayApp
  const activeProgramMaterialIds = new Set(
    (programs ?? [])
      .filter((p) => p.status === "active" && p.materialId)
      .map((p) => p.materialId!)
  );

  const apps: PlayApp[] = materials
    .filter((m) => m.appId && m.type === "app")
    .map((m) => ({
      materialId: m._id,
      appId: m.appId!,
      title: m.title,
      description: "",
      assignedAt: m.assignedAt,
      hasPracticeProgram: activeProgramMaterialIds.has(m._id),
    }))
    .sort((a, b) => a.assignedAt - b.assignedAt);

  return { apps, isLoading: false };
}
```

This hook reuses existing `patientMaterials.listByPatient` (which already enriches with `title` and `type`) and `homePrograms.listByPatient`. No new backend queries needed.

- [ ] **Step 2: Write tests for the hook**

Create `src/features/play/hooks/__tests__/use-play-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";

// Test the pure logic: filtering and sorting
// The hook itself wraps useQuery (tested via E2E), but the transform logic is testable

describe("usePlayData transform logic", () => {
  const mockMaterials = [
    { _id: "m1", appId: "app1", type: "app" as const, title: "AAC Board", assignedAt: 100 },
    { _id: "m2", appId: null, type: "session" as const, title: "Draft Session", assignedAt: 200 },
    { _id: "m3", appId: "app2", type: "app" as const, title: "Flashcards", assignedAt: 50 },
  ];

  const mockPrograms = [
    { _id: "p1", materialId: "m1", status: "active" as const },
    { _id: "p2", materialId: "m3", status: "paused" as const },
  ];

  it("filters out session-only materials", () => {
    const appMaterials = mockMaterials.filter((m) => m.appId && m.type === "app");
    expect(appMaterials).toHaveLength(2);
    expect(appMaterials.every((m) => m.type === "app")).toBe(true);
  });

  it("sorts by assignedAt ascending", () => {
    const sorted = mockMaterials
      .filter((m) => m.appId && m.type === "app")
      .sort((a, b) => a.assignedAt - b.assignedAt);
    expect(sorted[0].title).toBe("Flashcards");
    expect(sorted[1].title).toBe("AAC Board");
  });

  it("identifies materials with active practice programs", () => {
    const activeProgramMaterialIds = new Set(
      mockPrograms
        .filter((p) => p.status === "active" && p.materialId)
        .map((p) => p.materialId!)
    );
    expect(activeProgramMaterialIds.has("m1")).toBe(true);
    expect(activeProgramMaterialIds.has("m3")).toBe(false); // paused
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/play/hooks/__tests__/use-play-data.test.ts --reporter=verbose`

Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/play/hooks/use-play-data.ts src/features/play/hooks/__tests__/use-play-data.test.ts
git commit -m "feat: add use-play-data hook for play grid"
```

---

### Task 4: PlayAuthGuard Component

Checks caregiver authentication and patient link before rendering children.

**Files:**
- Create: `src/features/play/components/play-auth-guard.tsx`
- Create: `src/features/play/components/__tests__/play-auth-guard.test.tsx`

- [ ] **Step 1: Write the auth guard**

Create `src/features/play/components/play-auth-guard.tsx`:

```tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PlayAuthGuardProps {
  patientId: string;
  children: React.ReactNode;
}

export function PlayAuthGuard({ patientId, children }: PlayAuthGuardProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.replace(`/sign-in?redirect_url=${returnUrl}`);
    }
  }, [authLoading, isAuthenticated, router]);

  // Check caregiver link — patients.get returns null if user has no access
  const patient = useQuery(
    api.patients.getForPlay,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  if (authLoading || (!isAuthenticated)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Still loading patient data
  if (patient === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Patient not found or no access
  if (patient === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-semibold text-foreground font-[family-name:var(--font-manrope)]">
          No access
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Ask your therapist to send you an invite to access this child&apos;s activities.
        </p>
        <Link
          href="/family"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Family Home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
```

Key pattern: `patients.get` (in `convex/patients.ts:85-100`) already checks both SLP ownership and caregiver link via `caregiverLinks`. It returns `null` if the user has no access. We reuse this rather than duplicating the auth check.

- [ ] **Step 2: Write tests**

Create `src/features/play/components/__tests__/play-auth-guard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the convex and next modules
vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../../../../../convex/_generated/api", () => ({
  api: { patients: { getForPlay: "patients.getForPlay" } },
}));

import { useConvexAuth, useQuery } from "convex/react";
import { PlayAuthGuard } from "../play-auth-guard";

describe("PlayAuthGuard", () => {
  it("shows loading spinner while auth is loading", () => {
    vi.mocked(useConvexAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(
      <PlayAuthGuard patientId="test-id">
        <div>Children</div>
      </PlayAuthGuard>
    );

    expect(screen.queryByText("Children")).not.toBeInTheDocument();
  });

  it("shows no-access message when patient is null", () => {
    vi.mocked(useConvexAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue(null);

    render(
      <PlayAuthGuard patientId="test-id">
        <div>Children</div>
      </PlayAuthGuard>
    );

    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.getByText(/Ask your therapist/)).toBeInTheDocument();
  });

  it("renders children when patient data is available", () => {
    vi.mocked(useConvexAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue({ firstName: "Ace" });

    render(
      <PlayAuthGuard patientId="test-id">
        <div>Children</div>
      </PlayAuthGuard>
    );

    expect(screen.getByText("Children")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/play/components/__tests__/play-auth-guard.test.tsx --reporter=verbose`

Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/play/components/play-auth-guard.tsx src/features/play/components/__tests__/play-auth-guard.test.tsx
git commit -m "feat: add PlayAuthGuard — caregiver link verification"
```

---

### Task 5: AppTile Component

A single colorful tile for the play grid.

**Files:**
- Create: `src/features/play/components/app-tile.tsx`
- Create: `src/features/play/components/__tests__/app-tile.test.tsx`

- [ ] **Step 1: Write the tile component**

Create `src/features/play/components/app-tile.tsx`:

```tsx
"use client";

import Link from "next/link";

import { cn } from "@/core/utils";

// Rotation of soft background colors for tiles
const TILE_COLORS = [
  "bg-teal-100 dark:bg-teal-900/30",
  "bg-sky-100 dark:bg-sky-900/30",
  "bg-amber-100 dark:bg-amber-900/30",
  "bg-rose-100 dark:bg-rose-900/30",
  "bg-violet-100 dark:bg-violet-900/30",
  "bg-emerald-100 dark:bg-emerald-900/30",
] as const;

// Simple emoji icons per tile position (deterministic based on index)
const TILE_ICONS = ["🎯", "🧩", "🎨", "📚", "🎵", "⭐"] as const;

interface AppTileProps {
  appId: string;
  patientId: string;
  title: string;
  index: number;
  hasPracticeProgram: boolean;
}

export function AppTile({ appId, patientId, title, index, hasPracticeProgram }: AppTileProps) {
  const colorClass = TILE_COLORS[index % TILE_COLORS.length];
  const icon = TILE_ICONS[index % TILE_ICONS.length];

  return (
    <Link
      href={`/family/${patientId}/play/${appId}`}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl p-6",
        "min-h-[140px] min-w-[140px]",
        "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "active:scale-95 hover:scale-[1.02]",
        "shadow-sm hover:shadow-md",
        colorClass,
      )}
    >
      <span className="text-4xl" role="img" aria-hidden="true">
        {icon}
      </span>
      <span className="text-center text-sm font-semibold text-foreground line-clamp-2 font-[family-name:var(--font-manrope)]">
        {title}
      </span>
      {hasPracticeProgram && (
        <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
          Practice today
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Write tests**

Create `src/features/play/components/__tests__/app-tile.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppTile } from "../app-tile";

describe("AppTile", () => {
  it("renders the app title", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={false}
      />
    );
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
  });

  it("shows practice badge when hasPracticeProgram is true", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={true}
      />
    );
    expect(screen.getByText("Practice today")).toBeInTheDocument();
  });

  it("does not show practice badge when hasPracticeProgram is false", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={false}
      />
    );
    expect(screen.queryByText("Practice today")).not.toBeInTheDocument();
  });

  it("links to the correct play URL", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={false}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/family/patient1/play/app1");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/play/components/__tests__/app-tile.test.tsx --reporter=verbose`

Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/play/components/app-tile.tsx src/features/play/components/__tests__/app-tile.test.tsx
git commit -m "feat: add AppTile component for play grid"
```

---

### Task 6: PlayGrid Component

The main grid page component — top bar with child's name, responsive grid of tiles, empty state.

**Files:**
- Create: `src/features/play/components/play-grid.tsx`
- Create: `src/features/play/components/__tests__/play-grid.test.tsx`

- [ ] **Step 1: Write the grid component**

Create `src/features/play/components/play-grid.tsx`:

```tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { Loader2, Settings } from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { usePlayData } from "../hooks/use-play-data";
import { PlayAuthGuard } from "./play-auth-guard";
import { AppTile } from "./app-tile";

interface PlayGridProps {
  paramsPromise: Promise<{ patientId: string }>;
}

export function PlayGrid({ paramsPromise }: PlayGridProps) {
  const { patientId } = use(paramsPromise);

  return (
    <PlayAuthGuard patientId={patientId}>
      <PlayGridContent patientId={patientId} />
    </PlayAuthGuard>
  );
}

function PlayGridContent({ patientId }: { patientId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const patient = useQuery(
    api.patients.getForPlay,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );
  const { apps, isLoading } = usePlayData(patientId as Id<"patients">);

  if (isLoading || patient === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-teal-50/30 dark:to-teal-950/10">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-manrope)]">
          {patient?.firstName ?? "Activities"}
        </h1>
        <Link
          href={`/family/${patientId}`}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      {/* Grid or empty state */}
      {apps && apps.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 px-6 pb-8 md:grid-cols-3">
          {apps.map((app, index) => (
            <AppTile
              key={app.materialId}
              appId={app.appId}
              patientId={patientId}
              title={app.title}
              index={index}
              hasPracticeProgram={app.hasPracticeProgram}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="text-5xl" role="img" aria-hidden="true">🌟</span>
          <p className="text-lg font-medium text-foreground font-[family-name:var(--font-manrope)]">
            No activities yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your therapist will assign activities here. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write tests**

Create `src/features/play/components/__tests__/play-grid.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    patients: { getForPlay: "patients.getForPlay" },
    patientMaterials: { listByPatient: "patientMaterials.listByPatient" },
    homePrograms: { listByPatient: "homePrograms.listByPatient" },
  },
}));
vi.mock("../../hooks/use-play-data", () => ({
  usePlayData: vi.fn(),
}));

import { useQuery } from "convex/react";
import { usePlayData } from "../../hooks/use-play-data";

// We test PlayGridContent indirectly — mock the auth guard away
vi.mock("../play-auth-guard", () => ({
  PlayAuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import after mocks
const { PlayGrid } = await import("../play-grid");

describe("PlayGrid", () => {
  it("shows empty state when no apps assigned", async () => {
    vi.mocked(useQuery).mockReturnValue({ firstName: "Ace" });
    vi.mocked(usePlayData).mockReturnValue({ apps: [], isLoading: false });

    render(<PlayGrid paramsPromise={Promise.resolve({ patientId: "p1" })} />);

    expect(await screen.findByText("No activities yet")).toBeInTheDocument();
    expect(screen.getByText(/therapist will assign/)).toBeInTheDocument();
  });

  it("renders app tiles when apps are assigned", async () => {
    vi.mocked(useQuery).mockReturnValue({ firstName: "Ace" });
    vi.mocked(usePlayData).mockReturnValue({
      apps: [
        { materialId: "m1", appId: "a1", title: "AAC Board", assignedAt: 100, description: "", hasPracticeProgram: true },
        { materialId: "m2", appId: "a2", title: "Flashcards", assignedAt: 200, description: "", hasPracticeProgram: false },
      ],
      isLoading: false,
    });

    render(<PlayGrid paramsPromise={Promise.resolve({ patientId: "p1" })} />);

    expect(await screen.findByText("Ace")).toBeInTheDocument();
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
    expect(screen.getByText("Flashcards")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/play/components/__tests__/play-grid.test.tsx --reporter=verbose`

Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/play/components/play-grid.tsx src/features/play/components/__tests__/play-grid.test.tsx
git commit -m "feat: add PlayGrid — responsive tile grid with empty state"
```

---

### Task 7: AppViewer Component

Fullscreen iframe renderer for a single therapy app.

**Files:**
- Create: `src/features/play/components/app-viewer.tsx`
- Create: `src/features/play/components/__tests__/app-viewer.test.tsx`

- [ ] **Step 1: Write the viewer component**

Create `src/features/play/components/app-viewer.tsx`:

```tsx
"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { Home, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useTtsBridge } from "../../builder/hooks/use-tts-bridge";
import { PlayAuthGuard } from "./play-auth-guard";

interface AppViewerProps {
  paramsPromise: Promise<{ patientId: string; appId: string }>;
}

export function AppViewer({ paramsPromise }: AppViewerProps) {
  const { patientId, appId } = use(paramsPromise);

  return (
    <PlayAuthGuard patientId={patientId}>
      <AppViewerContent patientId={patientId} appId={appId} />
    </PlayAuthGuard>
  );
}

function AppViewerContent({ patientId, appId }: { patientId: string; appId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Bridge TTS requests from iframe
  useTtsBridge(iframeRef);

  const bundleHtml = useQuery(
    api.generated_files.getBundleByAppId,
    isAuthenticated ? { appId: appId as Id<"apps"> } : "skip"
  );

  const blobUrl = useMemo(() => {
    if (!bundleHtml) return null;
    const blob = new Blob([bundleHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [bundleHtml]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Handle invalid app — bundle loaded but null
  useEffect(() => {
    if (bundleHtml === null) {
      toast.error("This activity couldn't be loaded");
      router.replace(`/family/${patientId}/play`);
    }
  }, [bundleHtml, patientId, router]);

  if (bundleHtml === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-white">
      {blobUrl && (
        <iframe
          ref={iframeRef}
          title="Therapy activity"
          src={blobUrl}
          onLoad={() => setIframeReady(true)}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
        />
      )}

      {!iframeReady && blobUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Floating home button */}
      <button
        onClick={() => router.push(`/family/${patientId}/play`)}
        className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/70 shadow-md backdrop-blur-sm transition-all hover:bg-background/90 active:scale-95"
        aria-label="Back to activities"
      >
        <Home className="h-5 w-5 text-muted-foreground" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write tests**

Create `src/features/play/components/__tests__/app-viewer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    patients: { getForPlay: "patients.getForPlay" },
    generated_files: { getBundleByAppId: "generated_files.getBundleByAppId" },
  },
}));
vi.mock("../../../builder/hooks/use-tts-bridge", () => ({
  useTtsBridge: vi.fn(),
}));
vi.mock("../play-auth-guard", () => ({
  PlayAuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { useQuery } from "convex/react";

const { AppViewer } = await import("../app-viewer");

describe("AppViewer", () => {
  it("shows loading spinner while bundle is loading", async () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<AppViewer paramsPromise={Promise.resolve({ patientId: "p1", appId: "a1" })} />);

    // Should show loader (spinner present, no iframe)
    const container = await screen.findByLabelText("Back to activities");
    expect(container).toBeDefined();
  });

  it("renders iframe when bundle HTML is available", async () => {
    // Mock URL.createObjectURL
    const mockUrl = "blob:test-url";
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => mockUrl, revokeObjectURL: vi.fn() });

    vi.mocked(useQuery).mockReturnValue("<html><body>App</body></html>");

    render(<AppViewer paramsPromise={Promise.resolve({ patientId: "p1", appId: "a1" })} />);

    const iframe = await screen.findByTitle("Therapy activity");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", mockUrl);

    vi.unstubAllGlobals();
  });

  it("has a home button that links back to the grid", async () => {
    vi.mocked(useQuery).mockReturnValue("<html><body>App</body></html>");
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });

    render(<AppViewer paramsPromise={Promise.resolve({ patientId: "p1", appId: "a1" })} />);

    const homeButton = await screen.findByLabelText("Back to activities");
    expect(homeButton).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/play/components/__tests__/app-viewer.test.tsx --reporter=verbose`

Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/play/components/app-viewer.tsx src/features/play/components/__tests__/app-viewer.test.tsx
git commit -m "feat: add AppViewer — fullscreen iframe therapy app renderer"
```

---

### Task 8: Route Pages + Play Layout + Dynamic Manifest

Wire up the Next.js routes: `(play)` layout, play page, app viewer page, and dynamic manifest route handler.

**Files:**
- Create: `src/app/(play)/layout.tsx`
- Create: `src/app/(play)/family/[patientId]/play/page.tsx`
- Create: `src/app/(play)/family/[patientId]/play/[appId]/page.tsx`
- Create: `src/app/(play)/family/[patientId]/play/manifest.json/route.ts`

- [ ] **Step 1: Create the (play) layout**

Create `src/app/(play)/layout.tsx`:

```tsx
import { Toaster } from "@/shared/components/ui/sonner";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
```

Note: `ClerkProvider` and `ConvexClientProvider` are already in the root layout (`src/app/layout.tsx`). The `(play)` layout only needs to add the Toaster (for error toasts in AppViewer) and render children without any sidebar/nav chrome.

- [ ] **Step 2: Create the play grid page**

Create `src/app/(play)/family/[patientId]/play/page.tsx`:

```tsx
import { PlayGrid } from "@/features/play/components/play-grid";

export default function PlayPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <PlayGrid paramsPromise={params} />;
}
```

- [ ] **Step 3: Create the app viewer page**

Create `src/app/(play)/family/[patientId]/play/[appId]/page.tsx`:

```tsx
import { AppViewer } from "@/features/play/components/app-viewer";

export default function PlayAppPage({
  params,
}: {
  params: Promise<{ patientId: string; appId: string }>;
}) {
  return <AppViewer paramsPromise={params} />;
}
```

- [ ] **Step 4: Create the dynamic manifest route handler**

Create `src/app/(play)/family/[patientId]/play/manifest.json/route.ts`:

```ts
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  let childName = "Activities";
  try {
    // getForPlay returns null for unauthenticated users, so we use
    // a direct db lookup via an internal query. Since first names are
    // not sensitive and the patientId is already in the URL, this is safe.
    const patient = await convex.query(api.patients.getPublicFirstName, {
      patientId: patientId as Id<"patients">,
    });
    if (patient) childName = `${patient}'s Activities`;
  } catch {
    // Fallback to generic name
  }

  const manifest = {
    name: `${childName}`,
    short_name: childName,
    start_url: `/family/${patientId}/play`,
    scope: `/family/${patientId}/play`,
    display: "standalone",
    theme_color: "#0d7377",
    background_color: "#faf8f5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
```

Note: The manifest route handler cannot easily call an authenticated Convex query (it runs server-side without a user session). For now, it returns a generic "Activities" name. To get the child's name, we'd need a public/unauthenticated Convex query — that's a minor follow-up. The PWA is still fully functional with a generic name.

- [ ] **Step 5: Add manifest link to play layout head**

Update `src/app/(play)/layout.tsx` to include the manifest link. Since the `patientId` is dynamic and not available in the layout, we handle this in the page-level component. Add a client-side `<head>` injection in the PlayGrid:

Actually, the manifest link needs to be in the `<head>` for the browser to detect installability. The simplest approach: add a `useEffect` in PlayGrid that dynamically sets the manifest link:

Update `src/features/play/components/play-grid.tsx` — add this inside `PlayGridContent`, before the return:

```tsx
// Dynamically set manifest link for PWA installability
useEffect(() => {
  const link = document.querySelector('link[rel="manifest"]');
  const manifestUrl = `/family/${patientId}/play/manifest.json`;
  if (link) {
    link.setAttribute("href", manifestUrl);
  } else {
    const newLink = document.createElement("link");
    newLink.rel = "manifest";
    newLink.href = manifestUrl;
    document.head.appendChild(newLink);
  }
  return () => {
    // Cleanup: remove the play-specific manifest on unmount
    const playLink = document.querySelector(`link[rel="manifest"][href="${manifestUrl}"]`);
    playLink?.remove();
  };
}, [patientId]);
```

Add `useEffect` to the import line.

- [ ] **Step 6: Verify routes work**

Run: `npm run dev`

Test manually:
1. Visit `http://localhost:3000/family/SOME_PATIENT_ID/play` — should show the play grid (or auth redirect)
2. Visit `http://localhost:3000/family/SOME_PATIENT_ID/play/manifest.json` — should return valid JSON manifest
3. Verify no sidebar/nav appears on the play pages

- [ ] **Step 7: Commit**

```bash
git add src/app/\(play\)/ src/features/play/components/play-grid.tsx
git commit -m "feat: add (play) route group, pages, and dynamic manifest"
```

---

### Task 9: Update Root Layout Metadata + Proxy

Add the root manifest reference to the root layout metadata and ensure the play routes are publicly accessible (not blocked by Clerk proxy).

**Files:**
- Modify: `src/app/layout.tsx:10-27`
- Modify: `src/proxy.ts` (if it exists — check first)

- [ ] **Step 1: Check if proxy.ts exists and its contents**

Look for `src/proxy.ts` or `src/middleware.ts`. If proxy.ts exists, the play routes need to be in its public matcher (per memory note: `feedback_clerk_proxy_public_routes`).

- [ ] **Step 2: Add manifest to root layout metadata**

In `src/app/layout.tsx`, add `manifest` to the metadata export:

```ts
export const metadata: Metadata = {
  title: "Bridges — AI Therapy App Builder",
  // ... existing fields ...
  manifest: "/manifest.webmanifest",
};
```

Note: Next.js `manifest.ts` automatically serves at `/manifest.webmanifest`. The metadata `manifest` field adds the `<link rel="manifest">` to the `<head>`.

- [ ] **Step 3: Add play manifest to Clerk proxy public routes**

In `src/proxy.ts`, the manifest.json route must be public for the browser's PWA install checker (which fetches without auth cookies). Add it to `isPublicApiRoute`:

```ts
const isPublicApiRoute = createRouteMatcher([
  "/api/tool/(.*)",
  "/family/(.*)/play/manifest.json",
]);
```

The play pages themselves still require auth (handled by PlayAuthGuard) — only the manifest route is made public.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
# Also add proxy.ts if modified
git commit -m "feat: add manifest to root layout metadata"
```

---

### Task 10: Integration Verification

Run the full test suite and verify everything works together.

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

Run: `npm test`

Expected: All existing tests pass. New tests pass. No regressions.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: No type errors.

- [ ] **Step 3: Run lint**

Run: `npx next lint`

Expected: No lint errors in new files.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

1. Sign in as caregiver test user
2. Navigate to `/family/[patientId]/play`
3. Verify: grid loads, shows assigned apps (or empty state)
4. Tap a tile → app loads fullscreen
5. Tap home button → returns to grid
6. Visit `/manifest.webmanifest` → valid root manifest
7. Visit `/family/[patientId]/play/manifest.json` → valid child manifest

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address integration issues from smoke test"
```
