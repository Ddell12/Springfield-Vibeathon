# Explore Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/explore` page where visitors interact with 6 pre-built therapy tools to see product quality before signing up.

**Architecture:** New `src/features/explore/` feature slice with 6 components + 1 data file. Backend: 3 new fields on `apps` table, 1 new query, 1 seed mutation, 1 CSP fix. Route lives under `(marketing)` layout group — no auth required.

**Tech Stack:** Next.js App Router, Convex (schema + queries), shadcn/ui (Dialog, Sheet, Button), Tailwind v4, Vitest + React Testing Library, convex-test

**Spec:** `docs/superpowers/specs/2026-03-29-explore-page-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/features/explore/lib/demo-tools.ts` | Static metadata + prompts for 6 demo tools |
| Create | `src/features/explore/components/explore-hero.tsx` | Hero section — headline + subtext |
| Create | `src/features/explore/components/demo-tool-card.tsx` | Individual card — gradient, title, desc, tag, "Try It" |
| Create | `src/features/explore/components/demo-tool-grid.tsx` | Responsive grid, Convex query, skeletons, fallback |
| Create | `src/features/explore/components/demo-tool-modal.tsx` | Full-viewport Dialog/Sheet with live iframe + CTAs |
| Create | `src/features/explore/components/explore-cta-section.tsx` | Bottom CTA block |
| Create | `src/features/explore/components/explore-page.tsx` | Main page — assembles all sections |
| Create | `src/app/(marketing)/explore/page.tsx` | Thin route wrapper with metadata |
| Create | `src/features/explore/components/__tests__/demo-tool-card.test.tsx` | Card unit tests |
| Create | `src/features/explore/components/__tests__/demo-tool-grid.test.tsx` | Grid unit tests |
| Create | `src/features/explore/components/__tests__/demo-tool-modal.test.tsx` | Modal unit tests |
| Create | `src/features/explore/components/__tests__/explore-cta-section.test.tsx` | CTA section unit tests |
| Create | `convex/explore_seed.ts` | Internal mutation to mark apps as featured |
| Create | `convex/__tests__/apps_featured.test.ts` | Tests for listFeatured query + seed mutation |
| Modify | `convex/schema.ts:48-61` | Add featured fields + compound index to apps table |
| Modify | `convex/apps.ts` | Add `listFeatured` public query |
| Modify | `src/app/api/tool/[slug]/route.ts:35` | Fix CSP `frame-ancestors 'none'` → `'self'` |
| Modify | `src/shared/components/marketing-header.tsx:16-21` | Add "Explore" to navLinks |
| Modify | `src/features/landing/components/product-preview.tsx` | Add "See them in action →" CTA |
| Create | `tests/e2e/explore.spec.ts` | Playwright E2E tests for /explore page |

---

### Task 1: Schema + Backend — Featured Fields and Query

**Files:**
- Modify: `convex/schema.ts:48-61`
- Modify: `convex/apps.ts`
- Create: `convex/__tests__/apps_featured.test.ts`

- [ ] **Step 1: Write the failing test for `listFeatured` query**

Create `convex/__tests__/apps_featured.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const TEST_IDENTITY = { subject: "admin-user-001", issuer: "clerk" };

describe("apps.listFeatured — public featured apps query", () => {
  it("returns featured apps ordered by featuredOrder", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);

    // Create two sessions
    const sessionA = await t.mutation(api.sessions.create, { title: "A", query: "a" });
    const sessionB = await t.mutation(api.sessions.create, { title: "B", query: "b" });

    // Create apps — one featured (order 2), one featured (order 1), one not featured
    await t.mutation(api.apps.create, {
      title: "Emotion Check-In",
      description: "Feelings picker",
      shareSlug: "feat-emo",
      sessionId: sessionA,
    });
    await t.mutation(api.apps.create, {
      title: "Communication Board",
      description: "AAC board",
      shareSlug: "feat-comm",
      sessionId: sessionB,
    });
    await t.mutation(api.apps.create, {
      title: "User App",
      description: "Not featured",
      shareSlug: "user-app",
    });

    // Manually patch featured fields (simulating seed mutation)
    const allApps = await t.run(async (ctx) => {
      return await ctx.db.query("apps").collect();
    });
    const emoApp = allApps.find((a) => a.shareSlug === "feat-emo")!;
    const commApp = allApps.find((a) => a.shareSlug === "feat-comm")!;

    await t.run(async (ctx) => {
      await ctx.db.patch(emoApp._id, { featured: true, featuredOrder: 2, featuredCategory: "emotional" });
      await ctx.db.patch(commApp._id, { featured: true, featuredOrder: 1, featuredCategory: "communication" });
    });

    // listFeatured is a public query (no auth check) — calling on same `t` instance
    // that has identity is fine; the query itself never reads identity.
    const featured = await t.query(api.apps.listFeatured, {});

    expect(featured).toHaveLength(2);
    expect(featured[0].title).toBe("Communication Board");
    expect(featured[0].featuredCategory).toBe("communication");
    expect(featured[1].title).toBe("Emotion Check-In");
    // Should not expose userId or sessionId
    expect(featured[0]).not.toHaveProperty("userId");
    expect(featured[0]).not.toHaveProperty("sessionId");
  });

  it("returns empty array when no featured apps exist", async () => {
    const t = convexTest(schema, modules);
    const featured = await t.query(api.apps.listFeatured, {});
    expect(featured).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/apps_featured.test.ts`
Expected: FAIL — `api.apps.listFeatured` does not exist, schema missing fields

- [ ] **Step 3: Add featured fields to schema**

In `convex/schema.ts`, modify the `apps` table definition. After `updatedAt: v.number(),` (line 56), add:

```typescript
    featured: v.optional(v.boolean()),
    featuredOrder: v.optional(v.number()),
    featuredCategory: v.optional(v.string()),
```

After the existing `.index("by_user", ["userId"])` (line 61), add:

```typescript
    .index("by_featured_order", ["featured", "featuredOrder"])
```

- [ ] **Step 4: Add `listFeatured` query to `convex/apps.ts`**

Add at the bottom of the file:

```typescript
/** Public query — returns featured apps for the /explore page. No auth required. */
export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_featured_order", (q) => q.eq("featured", true))
      .collect();
    return apps.map((app) => ({
      title: app.title,
      description: app.description,
      shareSlug: app.shareSlug,
      featuredCategory: app.featuredCategory,
      featuredOrder: app.featuredOrder,
    }));
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/apps_featured.test.ts`
Expected: PASS — both tests green

- [ ] **Step 6: Run full backend test suite**

Run: `npx vitest run convex/`
Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/apps.ts convex/__tests__/apps_featured.test.ts
git commit -m "feat(convex): add featured fields to apps table + listFeatured query"
```

---

### Task 2: CSP Fix — Allow Same-Origin Iframe Embedding

**Files:**
- Modify: `src/app/api/tool/[slug]/route.ts:35`

- [ ] **Step 1: Fix CSP header**

In `src/app/api/tool/[slug]/route.ts`, line 35, change `frame-ancestors 'none'` to `frame-ancestors 'self'`:

```typescript
// Before:
"Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src blob: data: https:; connect-src blob: data:; frame-ancestors 'none';",
// After:
"Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src blob: data: https:; connect-src blob: data:; frame-ancestors 'self';",
```

- [ ] **Step 2: Verify existing shared-tool page still works**

Run: `npx vitest run src/ --reporter=verbose 2>&1 | head -50`
Expected: No regressions in existing tests

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tool/\\[slug\\]/route.ts
git commit -m "fix: allow same-origin iframe embedding for tool bundles (CSP frame-ancestors)"
```

---

### Task 3: Demo Tools Data — Static Metadata + Prompts

**Files:**
- Create: `src/features/explore/lib/demo-tools.ts`

- [ ] **Step 1: Create the demo tools constant**

Create `src/features/explore/lib/demo-tools.ts`:

```typescript
export type DemoToolCategory =
  | "communication"
  | "schedule"
  | "reward"
  | "social-story"
  | "emotional"
  | "speech";

export interface DemoTool {
  id: string;
  title: string;
  description: string;
  category: DemoToolCategory;
  categoryLabel: string;
  prompt: string;
  icon: string;
  gradient: string;
}

/**
 * Static metadata for the 6 featured demo tools on /explore.
 * Prompts for tools 1-4 are copied from therapy_seeds.ts (not imported —
 * explore owns its copy so the two features evolve independently).
 */
export const EXPLORE_DEMO_TOOLS: DemoTool[] = [
  {
    id: "communication-board",
    title: "Communication Board",
    description:
      "A picture-based AAC board with tap-to-speak cards and a sentence builder strip.",
    category: "communication",
    categoryLabel: "Communication",
    prompt:
      "Build a communication board for a nonverbal child. Include a 3x3 grid with core words (I want, help, more, stop, yes, no, eat, drink, play). Each card has a picture and label. Tapping a card speaks the word aloud and adds it to a sentence strip at the top. The sentence strip has a play button to speak the full sentence and a clear button.",
    icon: "chat",
    gradient: "from-primary to-primary-container",
  },
  {
    id: "morning-routine",
    title: "Morning Routine",
    description:
      "A step-by-step morning routine with pictures, progress tracking, and celebration.",
    category: "schedule",
    categoryLabel: "Daily Living",
    prompt:
      "Build a morning routine visual schedule for a 5-year-old. Include 6 steps: wake up, use toilet, brush teeth, get dressed, eat breakfast, put on shoes. Each step has a picture, label, and a checkmark button. Completed steps show a green checkmark. A 'Now' arrow highlights the current step. When all steps are done, show a calm celebration.",
    icon: "light_mode",
    gradient: "from-tertiary to-tertiary-container",
  },
  {
    id: "token-board",
    title: "5-Star Reward Board",
    description:
      "A reward system where children earn stars toward a chosen prize.",
    category: "reward",
    categoryLabel: "Behavior",
    prompt:
      "Build a 5-star token board. The therapist taps to award a gold star when the child completes a task. Stars fill in left to right with a pop animation. Before starting, the child picks a reward from 3 options (screen time, snack, playground). When all 5 stars are earned, show the chosen reward with a celebration animation and a reset button.",
    icon: "star",
    gradient: "from-tertiary-fixed-dim to-tertiary-fixed",
  },
  {
    id: "social-story",
    title: "Going to the Dentist",
    description:
      "A page-by-page social story with illustrations and read-aloud narration.",
    category: "social-story",
    categoryLabel: "Social Skills",
    prompt:
      "Build a social story about going to the dentist for a young child with autism. Include 6 pages: 1) Today I am going to the dentist, 2) The waiting room has chairs and magazines, 3) The dentist will look at my teeth with a small mirror, 4) I might hear buzzing sounds -- that's okay, 5) I will try to sit still and the dentist will be gentle, 6) When it's done, I did a great job! Each page has a large illustration on top and 1-2 sentences below, with a read-aloud button.",
    icon: "menu_book",
    gradient: "from-secondary to-secondary-container",
  },
  {
    id: "emotion-checkin",
    title: "Emotion Check-In",
    description:
      "A feelings picker with body mapping and coping strategy suggestions.",
    category: "emotional",
    categoryLabel: "Emotional",
    prompt:
      "Build an emotion check-in tool for a child in therapy. Show 6 feeling faces (happy, sad, angry, scared, tired, calm) in a grid. When the child taps a feeling, it highlights and asks 'Where do you feel it in your body?' with a simple body outline they can tap. After selecting, show 3 coping strategies (deep breaths, squeeze a pillow, ask for a hug) with pictures. Include a 'I'm ready' button that resets for the next check-in.",
    icon: "mood",
    gradient: "from-error to-error-container",
  },
  {
    id: "articulation-practice",
    title: "Articulation Practice",
    description:
      "Speech sound practice cards with recording, playback, and therapist scoring.",
    category: "speech",
    categoryLabel: "Speech",
    prompt:
      "Build an articulation practice tool for the 'S' sound. Show a card with a large picture and the target word below (sun, soap, sock, bus, house, yes — 6 words total). The child taps a microphone button to record themselves saying the word, then taps play to hear it back. Include a star button the therapist taps to mark it correct. Show progress as filled stars at the top. When all 6 words are complete, show a celebration.",
    icon: "record_voice_over",
    gradient: "from-primary-fixed-dim to-primary-fixed",
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/features/explore/lib/demo-tools.ts
git commit -m "feat(explore): add demo tools static metadata and prompts"
```

---

### Task 4: Card Component — `demo-tool-card`

**Files:**
- Create: `src/features/explore/components/demo-tool-card.tsx`
- Create: `src/features/explore/components/__tests__/demo-tool-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/explore/components/__tests__/demo-tool-card.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { DemoToolCard } from "../demo-tool-card";

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`}>{icon}</span>
  ),
}));

const mockTool = {
  title: "Communication Board",
  description: "A picture-based AAC board",
  categoryLabel: "Communication",
  icon: "chat",
  gradient: "from-primary to-primary-container",
};

describe("DemoToolCard", () => {
  test("renders title and description", () => {
    render(<DemoToolCard {...mockTool} onTryIt={() => {}} />);
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("A picture-based AAC board")).toBeInTheDocument();
  });

  test("renders category tag", () => {
    render(<DemoToolCard {...mockTool} onTryIt={() => {}} />);
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  test("calls onTryIt when 'Try It' button is clicked", () => {
    const onTryIt = vi.fn();
    render(<DemoToolCard {...mockTool} onTryIt={onTryIt} />);
    fireEvent.click(screen.getByRole("button", { name: /try it/i }));
    expect(onTryIt).toHaveBeenCalledOnce();
  });

  test("renders disabled state with Coming Soon badge", () => {
    render(<DemoToolCard {...mockTool} onTryIt={() => {}} disabled />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/explore/components/__tests__/demo-tool-card.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the card component**

Create `src/features/explore/components/demo-tool-card.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

interface DemoToolCardProps {
  title: string;
  description: string;
  categoryLabel: string;
  icon: string;
  gradient: string;
  disabled?: boolean;
  onTryIt: () => void;
}

export function DemoToolCard({
  title,
  description,
  categoryLabel,
  icon,
  gradient,
  disabled,
  onTryIt,
}: DemoToolCardProps) {
  return (
    <div className="group relative bg-surface-container rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-lg hover:-translate-y-1">
      {/* Gradient thumbnail area */}
      <div
        className={cn(
          "h-40 bg-gradient-to-br flex items-center justify-center relative",
          gradient
        )}
      >
        <MaterialIcon
          icon={icon}
          className="text-5xl text-white/80"
        />
        {disabled && (
          <span className="absolute top-3 right-3 px-2 py-0.5 bg-surface/90 text-on-surface text-xs font-bold rounded-full">
            Coming Soon
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3">
        <div>
          <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full mb-2">
            {categoryLabel}
          </span>
          <h3 className="font-headline font-bold text-lg text-on-surface">
            {title}
          </h3>
          <p className="text-on-surface-variant text-sm mt-1 line-clamp-2">
            {description}
          </p>
        </div>
        <Button
          onClick={onTryIt}
          disabled={disabled}
          className="w-full bg-primary-gradient text-on-primary font-semibold hover:opacity-90 transition-all duration-300 active:scale-95"
        >
          Try It
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/explore/components/__tests__/demo-tool-card.test.tsx`
Expected: PASS — all 4 tests green

- [ ] **Step 5: Commit**

```bash
git add src/features/explore/components/demo-tool-card.tsx src/features/explore/components/__tests__/demo-tool-card.test.tsx
git commit -m "feat(explore): add DemoToolCard component with tests"
```

---

### Task 5: Modal Component — `demo-tool-modal`

**Files:**
- Create: `src/features/explore/components/demo-tool-modal.tsx`
- Create: `src/features/explore/components/__tests__/demo-tool-modal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/explore/components/__tests__/demo-tool-modal.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { DemoToolModal } from "../demo-tool-modal";

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock shadcn Dialog and Sheet to render children directly for testing
vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

// Mock window.matchMedia for useIsDesktop hook — default to desktop
Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

describe("DemoToolModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: "Communication Board",
    description: "A picture-based AAC board",
    shareSlug: "feat-comm",
    prompt: "Build a communication board...",
  };

  test("renders iframe with correct src when open", () => {
    render(<DemoToolModal {...defaultProps} />);
    const iframe = screen.getByTitle("Communication Board");
    expect(iframe).toHaveAttribute("src", "/api/tool/feat-comm");
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
  });

  test("renders 'Customize This' link with encoded prompt", () => {
    render(<DemoToolModal {...defaultProps} />);
    const link = screen.getByRole("link", { name: /customize this/i });
    expect(link).toHaveAttribute(
      "href",
      `/builder?prompt=${encodeURIComponent("Build a communication board...")}`
    );
  });

  test("does not render when closed", () => {
    render(<DemoToolModal {...defaultProps} open={false} />);
    expect(screen.queryByTitle("Communication Board")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/explore/components/__tests__/demo-tool-modal.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the modal component**

Create `src/features/explore/components/demo-tool-modal.tsx`.

This uses `Dialog` on desktop (md+) and `Sheet` on mobile (< md) to avoid scroll-fighting with the iframe on small screens. A `useMediaQuery` hook switches between the two. CTA buttons are pinned in a sticky bar on mobile.

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

interface DemoToolModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  shareSlug: string;
  prompt: string;
}

function ModalHeader({ title, description, prompt }: { title: string; description: string; prompt: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/10 bg-surface sticky top-0 z-10">
      <div className="min-w-0">
        <h2 className="font-headline font-bold text-lg text-on-surface truncate">
          {title}
        </h2>
        <p className="text-on-surface-variant text-sm truncate">
          {description}
        </p>
      </div>
      <Link
        href={`/builder?prompt=${encodeURIComponent(prompt)}`}
        className="shrink-0 ml-4"
      >
        <Button variant="outline" className="font-semibold text-sm">
          Customize This
        </Button>
      </Link>
    </div>
  );
}

function ModalIframe({ shareSlug, title }: { shareSlug: string; title: string }) {
  return (
    <div className="flex-1 bg-surface-container-low">
      <iframe
        src={`/api/tool/${shareSlug}`}
        title={title}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
      />
    </div>
  );
}

export function DemoToolModal({
  open,
  onClose,
  title,
  description,
  shareSlug,
  prompt,
}: DemoToolModalProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className={cn(
            "max-w-5xl w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl"
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
          <ModalHeader title={title} description={description} prompt={prompt} />
          <ModalIframe shareSlug={shareSlug} title={title} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col gap-0 p-0 rounded-t-2xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <ModalHeader title={title} description={description} prompt={prompt} />
        <ModalIframe shareSlug={shareSlug} title={title} />
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/explore/components/__tests__/demo-tool-modal.test.tsx`
Expected: PASS — all 3 tests green

- [ ] **Step 5: Commit**

```bash
git add src/features/explore/components/demo-tool-modal.tsx src/features/explore/components/__tests__/demo-tool-modal.test.tsx
git commit -m "feat(explore): add DemoToolModal component with tests"
```

---

### Task 6: Grid Component — `demo-tool-grid`

**Files:**
- Create: `src/features/explore/components/demo-tool-grid.tsx`
- Create: `src/features/explore/components/__tests__/demo-tool-grid.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/explore/components/__tests__/demo-tool-grid.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { EXPLORE_DEMO_TOOLS } from "../../lib/demo-tools";

// Mock Convex useQuery
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`}>{icon}</span>
  ),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Must import after mocks
import { DemoToolGrid } from "../demo-tool-grid";

describe("DemoToolGrid", () => {
  test("renders 6 skeleton cards while loading", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<DemoToolGrid />);
    const skeletons = screen.getAllByTestId("skeleton-card");
    expect(skeletons).toHaveLength(6);
  });

  test("renders cards from query data with shareSlug", () => {
    mockUseQuery.mockReturnValue([
      {
        title: "Communication Board",
        description: "AAC board",
        shareSlug: "feat-comm",
        featuredCategory: "communication",
        featuredOrder: 1,
      },
    ]);
    render(<DemoToolGrid />);
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it/i })).toBeEnabled();
  });

  test("falls back to static data with disabled cards on empty result", () => {
    mockUseQuery.mockReturnValue([]);
    render(<DemoToolGrid />);
    // Should render all 6 tools from static data
    EXPLORE_DEMO_TOOLS.forEach((tool) => {
      expect(screen.getByText(tool.title)).toBeInTheDocument();
    });
    // All Try It buttons should be disabled
    const buttons = screen.getAllByRole("button", { name: /try it/i });
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/explore/components/__tests__/demo-tool-grid.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the grid component**

Create `src/features/explore/components/demo-tool-grid.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { EXPLORE_DEMO_TOOLS } from "../lib/demo-tools";
import { DemoToolCard } from "./demo-tool-card";
import { DemoToolModal } from "./demo-tool-modal";

export function DemoToolGrid() {
  const featuredApps = useQuery(api.apps.listFeatured, {});
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const isLoading = featuredApps === undefined;
  const hasFeatured = featuredApps && featuredApps.length > 0;

  // Build display data — merge Convex data with static metadata by category+title
  const displayTools = hasFeatured
    ? featuredApps.map((app) => {
        const staticTool = EXPLORE_DEMO_TOOLS.find(
          (t) => t.category === app.featuredCategory && t.title === app.title
        );
        return {
          ...app,
          icon: staticTool?.icon ?? "auto_awesome",
          gradient: staticTool?.gradient ?? "from-primary to-primary-container",
          categoryLabel: staticTool?.categoryLabel ?? app.featuredCategory ?? "",
          prompt: staticTool?.prompt ?? "",
          disabled: false,
        };
      })
    : EXPLORE_DEMO_TOOLS.map((tool) => ({
        title: tool.title,
        description: tool.description,
        shareSlug: "",
        featuredCategory: tool.category,
        icon: tool.icon,
        gradient: tool.gradient,
        categoryLabel: tool.categoryLabel,
        prompt: tool.prompt,
        disabled: true,
      }));

  const selectedTool = displayTools.find((t) => t.shareSlug === selectedSlug);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            className="animate-pulse rounded-2xl bg-surface-container"
          >
            <div className="h-40 bg-surface-container-low rounded-t-2xl" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-surface-container-low rounded w-20" />
              <div className="h-5 bg-surface-container-low rounded w-3/4" />
              <div className="h-4 bg-surface-container-low rounded w-full" />
              <div className="h-10 bg-surface-container-low rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTools.map((tool) => (
          <DemoToolCard
            key={tool.title}
            title={tool.title}
            description={tool.description}
            categoryLabel={tool.categoryLabel}
            icon={tool.icon}
            gradient={tool.gradient}
            disabled={tool.disabled}
            onTryIt={() => setSelectedSlug(tool.shareSlug)}
          />
        ))}
      </div>

      {selectedTool && (
        <DemoToolModal
          open={!!selectedSlug}
          onClose={() => setSelectedSlug(null)}
          title={selectedTool.title}
          description={selectedTool.description}
          shareSlug={selectedTool.shareSlug}
          prompt={selectedTool.prompt}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/explore/components/__tests__/demo-tool-grid.test.tsx`
Expected: PASS — all 3 tests green

- [ ] **Step 5: Commit**

```bash
git add src/features/explore/components/demo-tool-grid.tsx src/features/explore/components/__tests__/demo-tool-grid.test.tsx
git commit -m "feat(explore): add DemoToolGrid component with Convex query and fallback"
```

---

### Task 7: Hero + CTA Section + Page Assembly

**Files:**
- Create: `src/features/explore/components/explore-hero.tsx`
- Create: `src/features/explore/components/explore-cta-section.tsx`
- Create: `src/features/explore/components/__tests__/explore-cta-section.test.tsx`
- Create: `src/features/explore/components/explore-page.tsx`
- Create: `src/app/(marketing)/explore/page.tsx`

- [ ] **Step 1: Write the failing CTA section test**

Create `src/features/explore/components/__tests__/explore-cta-section.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ExploreCtaSection } from "../explore-cta-section";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

describe("ExploreCtaSection", () => {
  test("renders primary CTA linking to /builder", () => {
    render(<ExploreCtaSection />);
    const link = screen.getByRole("link", { name: /start building/i });
    expect(link).toHaveAttribute("href", "/builder");
  });

  test("renders secondary CTA linking to /templates", () => {
    render(<ExploreCtaSection />);
    const link = screen.getByRole("link", { name: /browse templates/i });
    expect(link).toHaveAttribute("href", "/templates");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/explore/components/__tests__/explore-cta-section.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create explore-hero.tsx**

```tsx
export function ExploreHero() {
  return (
    <section className="text-center py-16 px-6">
      <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface mb-4">
        See What You Can Build
      </h1>
      <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto">
        These therapy tools were built entirely by AI — just describe what you
        need and we&apos;ll build it for you.
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Create explore-cta-section.tsx**

```tsx
import Link from "next/link";

export function ExploreCtaSection() {
  return (
    <section className="text-center py-20 px-6">
      <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface mb-4">
        These are just examples
      </h2>
      <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-8">
        Describe what YOU need and we&apos;ll build a custom therapy tool —
        tailored to your client, your goals, your workflow.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/builder"
          className="bg-primary-gradient text-on-primary px-8 py-4 rounded-lg font-semibold text-lg shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 active:scale-95"
        >
          Start Building — It&apos;s Free
        </Link>
        <Link
          href="/templates"
          className="px-8 py-4 rounded-lg font-semibold text-lg text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-all duration-300"
        >
          Browse Templates
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run CTA test to verify it passes**

Run: `npx vitest run src/features/explore/components/__tests__/explore-cta-section.test.tsx`
Expected: PASS — both tests green

- [ ] **Step 6: Create explore-page.tsx**

Note: No `"use client"` — this is a Server Component. The client boundary is already established by `DemoToolGrid` (which uses `useQuery`). `ExploreHero` and `ExploreCtaSection` are pure markup and benefit from server rendering for SEO.

```tsx
import { ExploreHero } from "./explore-hero";
import { DemoToolGrid } from "./demo-tool-grid";
import { ExploreCtaSection } from "./explore-cta-section";

export function ExplorePage() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <ExploreHero />
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <DemoToolGrid />
      </section>
      <ExploreCtaSection />
    </div>
  );
}
```

- [ ] **Step 7: Create the route page**

Create `src/app/(marketing)/explore/page.tsx`:

```tsx
import { ExplorePage } from "@/features/explore/components/explore-page";

export const metadata = {
  title: "Explore Therapy Tools — Bridges",
  description:
    "Try 6 pre-built therapy tools created by AI. See what you can build with Bridges before you start.",
};

export default function Page() {
  return <ExplorePage />;
}
```

- [ ] **Step 8: Run all explore tests**

Run: `npx vitest run src/features/explore/`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/features/explore/components/explore-hero.tsx src/features/explore/components/explore-cta-section.tsx src/features/explore/components/__tests__/explore-cta-section.test.tsx src/features/explore/components/explore-page.tsx src/app/\(marketing\)/explore/page.tsx
git commit -m "feat(explore): add hero, CTA section, page assembly, and route"
```

---

### Task 8: Navigation Integration — Header + Landing Page

**Files:**
- Modify: `src/shared/components/marketing-header.tsx:16-21`
- Modify: `src/features/landing/components/product-preview.tsx`

- [ ] **Step 1: Add "Explore" to marketing header navLinks**

In `src/shared/components/marketing-header.tsx`, line 16-21, change:

```typescript
const navLinks = [
  { href: "/builder", label: "Builder" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/templates", label: "Templates" },
  { href: "/my-tools", label: "My Apps" },
];
```

to:

```typescript
const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/builder", label: "Builder" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/templates", label: "Templates" },
  { href: "/my-tools", label: "My Apps" },
];
```

- [ ] **Step 2: Add "See them in action" CTA to ProductPreview**

In `src/features/landing/components/product-preview.tsx`, add a Link import at the top:

```typescript
import Link from "next/link";
```

Then after the closing `</div>` of the grid (line 55), before the `</section>` tag (line 56), add:

```tsx
      <div className="mt-8 text-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-primary font-headline font-bold text-lg hover:underline transition-colors"
        >
          See them in action →
        </Link>
      </div>
```

- [ ] **Step 3: Run existing tests to check for regressions**

Run: `npx vitest run src/shared/components/ src/features/landing/`
Expected: All existing tests still pass

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/marketing-header.tsx src/features/landing/components/product-preview.tsx
git commit -m "feat(nav): add Explore to marketing header + landing page CTA"
```

---

### Task 9: Seed Mutation — Mark Apps as Featured

**Files:**
- Create: `convex/explore_seed.ts`

- [ ] **Step 1: Create the seed mutation**

Create `convex/explore_seed.ts`:

```typescript
import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/** One-time seed mutation to mark generated demo apps as featured.
 *  Run via Convex dashboard after generating the 6 demo tools. */
export const markFeatured = internalMutation({
  args: {
    items: v.array(
      v.object({
        sessionId: v.id("sessions"),
        category: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const app = await ctx.db
        .query("apps")
        .withIndex("by_session", (q) => q.eq("sessionId", item.sessionId))
        .first();
      if (app) {
        await ctx.db.patch(app._id, {
          featured: true,
          featuredOrder: item.order,
          featuredCategory: item.category,
        });
      }
    }
  },
});
```

- [ ] **Step 2: Add test for markFeatured**

Add a new test at the bottom of `convex/__tests__/apps_featured.test.ts`:

```typescript
describe("explore_seed.markFeatured — seed mutation", () => {
  it("marks apps as featured by sessionId", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);

    const sessionA = await t.mutation(api.sessions.create, { title: "A", query: "a" });
    const sessionB = await t.mutation(api.sessions.create, { title: "B", query: "b" });

    await t.mutation(api.apps.create, {
      title: "Tool A",
      description: "desc",
      shareSlug: "seed-a",
      sessionId: sessionA,
    });
    await t.mutation(api.apps.create, {
      title: "Tool B",
      description: "desc",
      shareSlug: "seed-b",
      sessionId: sessionB,
    });

    // Run the internal seed mutation
    await t.mutation(internal.explore_seed.markFeatured, {
      items: [
        { sessionId: sessionA, category: "communication", order: 1 },
        { sessionId: sessionB, category: "emotional", order: 2 },
      ],
    });

    const featured = await t.query(api.apps.listFeatured, {});
    expect(featured).toHaveLength(2);
    expect(featured[0].featuredCategory).toBe("communication");
    expect(featured[1].featuredCategory).toBe("emotional");
  });
});
```

Also add this import at the top of the test file:

```typescript
import { internal } from "../_generated/api";
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/apps_featured.test.ts`
Expected: PASS — all tests green (including new seed mutation test)

- [ ] **Step 4: Commit**

```bash
git add convex/explore_seed.ts convex/__tests__/apps_featured.test.ts
git commit -m "feat(convex): add explore_seed.markFeatured internal mutation with test"
```

---

### Task 10: Full Test Suite Verification

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new explore tests)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `npx next lint`
Expected: No lint errors

- [ ] **Step 4: Verify dev server starts**

Run: `npx next dev` (manual check — navigate to `http://localhost:3000/explore`)
Expected: Page renders with 6 cards in fallback/disabled mode (no featured apps in DB yet). Hero and CTA sections visible.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: fix any issues found during full verification"
```

---

### Task 11: E2E Tests — Playwright

**Files:**
- Create: `tests/e2e/explore.spec.ts`

- [ ] **Step 1: Create E2E test file**

Create `tests/e2e/explore.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Explore page", () => {
  test("page loads with hero heading", async ({ page }) => {
    await page.goto("/explore");

    const heading = page.getByRole("heading", { name: /see what you can build/i });
    await expect(heading).toBeVisible();
  });

  test("renders 6 demo tool cards", async ({ page }) => {
    await page.goto("/explore");

    // Wait for either real cards or fallback cards to render
    const cards = page.getByRole("button", { name: /try it/i });
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await expect(cards).toHaveCount(6);
  });

  test("'Start Building' CTA links to /builder", async ({ page }) => {
    await page.goto("/explore");

    const cta = page.getByRole("link", { name: /start building/i });
    await expect(cta.first()).toBeVisible();
    const href = await cta.first().getAttribute("href");
    expect(href).toContain("/builder");
  });

  test("'Browse Templates' CTA links to /templates", async ({ page }) => {
    await page.goto("/explore");

    const cta = page.getByRole("link", { name: /browse templates/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toContain("/templates");
  });

  test("header includes Explore nav link", async ({ page }) => {
    await page.goto("/explore");

    const navLink = page.locator("header").getByRole("link", { name: /explore/i });
    await expect(navLink.first()).toBeVisible();
  });

  test("cards stack to single column on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/explore");

    const cards = page.getByRole("button", { name: /try it/i });
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // On mobile (375px), grid should be single column — first two cards should
    // have roughly the same x position
    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();
    // Same column = similar x position (within 10px)
    expect(Math.abs(firstBox!.x - secondBox!.x)).toBeLessThan(10);
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test tests/e2e/explore.spec.ts`
Expected: All tests pass (page loads in fallback mode with 6 disabled cards)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/explore.spec.ts
git commit -m "test(e2e): add Playwright tests for /explore page"
```

---

## Post-Implementation: Demo Tool Generation

After all code is merged, generate the 6 demo tools:

1. Sign in as admin account
2. Open `/builder` and paste each prompt from `EXPLORE_DEMO_TOOLS` (one at a time)
3. Wait for generation to complete → app record created with share slug
4. Note the `sessionId` for each (visible in Convex dashboard)
5. Run `explore_seed.markFeatured` via Convex dashboard with the 6 session IDs
6. Verify `/explore` shows all 6 tools with working "Try It" modals
