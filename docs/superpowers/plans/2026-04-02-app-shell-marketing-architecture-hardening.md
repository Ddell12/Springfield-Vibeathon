# App Shell And Marketing Architecture Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the architectural issues found in the eng review by making the app shell fetch bounded data, moving caregiver access control to the server, slimming marketing route files, centralizing brand copy, and removing the fake `shared -> features` dependency layer.

**Architecture:** Keep the diff local and boring. Add one bounded Convex query for sidebar recents, add one server-side role guard helper reused by restricted route subtrees, extract the three oversized marketing routes into feature-owned components, and make `src/shared/clinical` actually shared by removing proxy re-exports that point back into feature internals. Finish by updating the stale architecture docs so the repo instructions match the codebase again.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Convex, Vitest, React Testing Library, Playwright

---

## Scope Check

This is one cohesive plan, not three separate projects. Every issue came from the same failure mode: the route layer and shared layer are carrying feature logic they should not own. Do not turn this into a rewrite. The target state is:

- route files stay thin
- the app shell only fetches data it renders
- access control happens before rendering
- shared code does not depend on feature code
- brand copy comes from one place

Not in scope for this plan:

- a full product rename away from `Vocali`
- moving every route into a new route-group taxonomy
- redesigning the marketing pages
- refactoring the entire `my-tools` surface to pagination on the backend

---

## File Structure Map

### Existing files to modify

- `src/core/config.ts`
  Responsibility: Become the single source of truth for app brand strings and contact copy.
- `src/app/layout.tsx`
  Responsibility: Read metadata and visible product strings from centralized brand config.
- `src/shared/components/header.tsx`
  Responsibility: Read the app brand from config, not hardcoded copy.
- `src/shared/components/marketing-header.tsx`
  Responsibility: Read the marketing brand and CTA copy from config, not hardcoded copy.
- `src/shared/components/__tests__/header.test.tsx`
  Responsibility: Lock in centralized brand rendering for the app header.
- `src/shared/components/__tests__/marketing-header.test.tsx`
  Responsibility: Lock in centralized brand rendering for the marketing header.
- `convex/tools.ts`
  Responsibility: Add a bounded recent-tools query for the shell.
- `convex/__tests__/tools.test.ts`
  Responsibility: Prove the recent-tools query is limited and correctly ordered.
- `src/features/dashboard/components/dashboard-sidebar.tsx`
  Responsibility: Use the bounded recent-tools query and stop owning caregiver redirects.
- `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
  Responsibility: Verify the sidebar renders recents from the bounded query.
- `src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`
  Responsibility: Remove tests tied to the old client-side redirect behavior.
- `src/app/(app)/billing/page.tsx`
  Responsibility: Use the shared server-side role guard instead of bespoke inline role branching.
- `src/app/(marketing)/platform/page.tsx`
  Responsibility: Become a thin route wrapper.
- `src/app/(marketing)/meet-vocali/page.tsx`
  Responsibility: Become a thin route wrapper.
- `src/app/(marketing)/pricing/page.tsx`
  Responsibility: Become a thin route wrapper.
- `src/features/session-notes/components/structured-data-form.tsx`
  Responsibility: Import `useActiveGoals` from the owning goals feature and keep only true shared utils in `shared/clinical`.
- `src/features/evaluations/components/evaluation-editor.tsx`
  Responsibility: Import `usePatient` from the owning patients feature.
- `src/features/plan-of-care/components/poc-editor.tsx`
  Responsibility: Import `usePatient` and `useActiveGoals` from owning features.
- `src/features/session-notes/components/__tests__/structured-data-form.test.tsx`
  Responsibility: Update mocks to match direct imports.
- `src/features/session-notes/components/__tests__/session-note-editor.test.tsx`
  Responsibility: Update mocks to match direct imports.
- `src/shared/clinical/index.ts`
  Responsibility: Export only genuinely shared clinical utilities and types.
- `docs/architecture/project-structure.md`
  Responsibility: Document the real route/feature ownership pattern after the cleanup.
- `docs/architecture/tech-stack.md`
  Responsibility: Remove stale stack claims and describe the actual app shell and auth posture.
- `tests/e2e/navigation.spec.ts`
  Responsibility: Prove caregivers are denied SLP-only routes before shell-level redirect logic can fire.

### New files to create

- `src/core/__tests__/brand-copy.test.ts`
  Responsibility: Assert brand constants remain internally consistent and usable across app + marketing surfaces.
- `src/features/auth/lib/server-role-guards.ts`
  Responsibility: Provide one boring server helper for requiring SLP-only access.
- `src/features/auth/lib/__tests__/server-role-guards.test.ts`
  Responsibility: Prove caregiver users are redirected and therapist users pass through.
- `src/app/(app)/builder/layout.tsx`
  Responsibility: Guard the entire builder subtree on the server.
- `src/app/(app)/patients/layout.tsx`
  Responsibility: Guard the entire patients subtree on the server.
- `src/app/(app)/tools/layout.tsx`
  Responsibility: Guard the tools editor subtree on the server.
- `src/features/landing/components/platform-page.tsx`
  Responsibility: Own the Platform marketing page UI.
- `src/features/landing/components/meet-vocali-page.tsx`
  Responsibility: Own the Meet Vocali marketing page UI.
- `src/features/landing/components/pricing-page.tsx`
  Responsibility: Own the Pricing marketing page UI.
- `src/features/landing/components/__tests__/platform-page.test.tsx`
  Responsibility: Validate platform page sections and CTA links.
- `src/features/landing/components/__tests__/meet-vocali-page.test.tsx`
  Responsibility: Validate role cards and primary CTA content.
- `src/features/landing/components/__tests__/pricing-page.test.tsx`
  Responsibility: Validate pricing plans and CTA links.
- `src/shared/clinical/__tests__/boundary.test.ts`
  Responsibility: Prevent `src/shared/clinical` from importing any `@/features/*` modules again.

### Files to delete

- `src/shared/clinical/use-active-goals.ts`
  Responsibility removed: It is a proxy to a feature hook, not shared code.
- `src/shared/clinical/use-patient.ts`
  Responsibility removed: It is a proxy to a feature hook, not shared code.

---

## Task 1: Centralize Brand Copy Before Touching Routes

**Files:**
- Create: `src/core/__tests__/brand-copy.test.ts`
- Modify: `src/core/config.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/shared/components/header.tsx`
- Modify: `src/shared/components/marketing-header.tsx`
- Modify: `src/shared/components/__tests__/header.test.tsx`
- Modify: `src/shared/components/__tests__/marketing-header.test.tsx`

- [ ] **Step 1: Write the failing brand-copy tests**

```ts
// src/core/__tests__/brand-copy.test.ts
import { describe, expect, it } from "vitest";

import { APP_BRAND, APP_CONTACT_EMAIL, APP_TAGLINE } from "@/core/config";

describe("brand copy", () => {
  it("keeps the public-facing brand constants aligned", () => {
    expect(APP_BRAND).toBe("Vocali");
    expect(APP_TAGLINE).toContain("speech therapy");
    expect(APP_CONTACT_EMAIL).toBe("hello@vocali.ai");
  });
});
```

```ts
// src/shared/components/__tests__/header.test.tsx
import { APP_NAME } from "@/core/config";

it("renders the configured brand name as a link to home", () => {
  render(<Header />);
  const brand = screen.getByText(APP_NAME);
  expect(brand.closest("a")).toHaveAttribute("href", "/");
});
```

```ts
// src/shared/components/__tests__/marketing-header.test.tsx
import { APP_BRAND } from "@/core/config";

it("renders the configured marketing brand name", () => {
  render(<MarketingHeader />);
  const logo = screen.getByText(APP_BRAND);
  expect(logo.closest("a")).toHaveAttribute("href", "/");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/core/__tests__/brand-copy.test.ts src/shared/components/__tests__/header.test.tsx src/shared/components/__tests__/marketing-header.test.tsx`

Expected: FAIL because `APP_TAGLINE`, `APP_CONTACT_EMAIL`, or updated config-based assertions do not exist yet.

- [ ] **Step 3: Add central brand constants in `src/core/config.ts`**

```ts
export const APP_NAME = "Vocali";
export const APP_BRAND = "Vocali";
export const APP_TAGLINE = "Modern speech therapy for growing voices.";
export const APP_DESCRIPTION =
  "Build interactive therapy apps with AI. Designed for ABA therapists, speech therapists, and parents of autistic children.";
export const APP_CONTACT_EMAIL = "hello@vocali.ai";
export const APP_SIGN_IN_CTA = `Try ${APP_BRAND}`;
```

- [ ] **Step 4: Replace hardcoded brand strings in layout and headers**

```tsx
// src/app/layout.tsx
import {
  APP_BRAND,
  APP_DESCRIPTION,
  APP_TAGLINE,
} from "@/core/config";

export const metadata: Metadata = {
  title: `${APP_BRAND} — ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
  openGraph: {
    title: `${APP_BRAND} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    siteName: APP_BRAND,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_BRAND} — ${APP_TAGLINE}`,
    description: "Build interactive therapy apps with AI.",
  },
};
```

```tsx
// src/shared/components/marketing-header.tsx
import {
  APP_BRAND,
  APP_CONTACT_EMAIL,
  APP_SIGN_IN_CTA,
} from "@/core/config";

<Link href="/" className="font-headline text-[2rem] tracking-[-0.04em] text-on-surface">
  {APP_BRAND}
</Link>

<Link href={`mailto:${APP_CONTACT_EMAIL}`} ...>
  Contact sales
</Link>

<Link href="/sign-in?role=slp" ...>
  {APP_SIGN_IN_CTA}
</Link>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/core/__tests__/brand-copy.test.ts src/shared/components/__tests__/header.test.tsx src/shared/components/__tests__/marketing-header.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/config.ts src/core/__tests__/brand-copy.test.ts src/app/layout.tsx src/shared/components/header.tsx src/shared/components/marketing-header.tsx src/shared/components/__tests__/header.test.tsx src/shared/components/__tests__/marketing-header.test.tsx
git commit -m "refactor: centralize app brand copy"
```

---

## Task 2: Bound Sidebar Recents To Five Records At The Backend

**Files:**
- Modify: `convex/tools.ts`
- Modify: `convex/__tests__/tools.test.ts`
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Modify: `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Write the failing query and sidebar tests**

```ts
// convex/__tests__/tools.test.ts
it("listRecentBySLP returns only the newest five tools for the current therapist", async () => {
  const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
  const { patientId } = await createPatient(t);

  for (const title of ["A", "B", "C", "D", "E", "F"]) {
    await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title,
      patientId,
      configJson: SAMPLE_CONFIG,
    });
  }

  const recent = await t.query(api.tools.listRecentBySLP, { limit: 5 });

  expect(recent).toHaveLength(5);
  expect(recent.map((tool) => tool.title)).toEqual(["F", "E", "D", "C", "B"]);
});
```

```ts
// src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args?: { limit?: number }) =>
    args?.limit === 5
      ? [
          { _id: "tool-1", _creationTime: 2, title: "Newest App" },
          { _id: "tool-2", _creationTime: 1, title: "Older App" },
        ]
      : [],
}));

it("requests exactly five recent tools for the recents section", () => {
  render(<DashboardSidebar />);
  expect(screen.getByText("Newest App")).toBeInTheDocument();
  expect(screen.getByText("Older App")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- convex/__tests__/tools.test.ts src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`

Expected: FAIL because `api.tools.listRecentBySLP` does not exist and the sidebar still queries `listBySLP`.

- [ ] **Step 3: Add the bounded query in `convex/tools.ts`**

```ts
export const listRecentBySLP = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = Math.min(args.limit ?? 5, 10);

    return ctx.db
      .query("app_instances")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", identity.subject))
      .order("desc")
      .take(limit);
  },
});
```

- [ ] **Step 4: Replace the sidebar’s unbounded query**

```tsx
const recentTools = useQuery(api.tools.listRecentBySLP, { limit: 5 }) ?? [];
const { unreadCount } = useUnreadNotificationsCount();

// remove:
// const allTools = useQuery(api.tools.listBySLP) ?? [];
// const recentSessions = [...allTools].sort(...).slice(0, 5);

// render:
{recentTools.length === 0 ? (
  <p className="px-2 text-xs text-on-surface-variant/50">No recent apps</p>
) : (
  recentTools.map((tool) => (
    <Link key={tool._id} href={ROUTES.TOOLS_EDIT(tool._id)} ...>
      <span className="truncate">{tool.title || "Untitled App"}</span>
    </Link>
  ))
)}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- convex/__tests__/tools.test.ts src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/tools.ts convex/__tests__/tools.test.ts src/features/dashboard/components/dashboard-sidebar.tsx src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
git commit -m "perf: bound sidebar recent tools query"
```

---

## Task 3: Move SLP-Only Access Control To The Server

**Files:**
- Create: `src/features/auth/lib/server-role-guards.ts`
- Create: `src/features/auth/lib/__tests__/server-role-guards.test.ts`
- Create: `src/app/(app)/builder/layout.tsx`
- Create: `src/app/(app)/patients/layout.tsx`
- Create: `src/app/(app)/tools/layout.tsx`
- Modify: `src/app/(app)/billing/page.tsx`
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Modify: `src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`
- Modify: `tests/e2e/navigation.spec.ts`

- [ ] **Step 1: Write the failing guard tests**

```ts
// src/features/auth/lib/__tests__/server-role-guards.test.ts
import { describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: () => mockCurrentUser(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("requireSlpUser", () => {
  it("redirects caregivers to /family", async () => {
    mockCurrentUser.mockResolvedValue({
      publicMetadata: { role: "caregiver" },
    });

    const { requireSlpUser } = await import("../server-role-guards");
    await requireSlpUser();

    expect(mockRedirect).toHaveBeenCalledWith("/family");
  });
});
```

```ts
// tests/e2e/navigation.spec.ts
test("caregiver cannot open therapist-only routes", async ({ caregiverPage }) => {
  await caregiverPage.goto("/tools/new");
  await expect(caregiverPage).toHaveURL(/\/family/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/auth/lib/__tests__/server-role-guards.test.ts src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`

Run: `npx playwright test tests/e2e/navigation.spec.ts --grep "caregiver cannot open therapist-only routes"`

Expected: FAIL because the helper does not exist and caregiver redirection still lives in the client sidebar.

- [ ] **Step 3: Add one boring server-side guard helper**

```ts
// src/features/auth/lib/server-role-guards.ts
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireSlpUser() {
  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;

  if (role === "caregiver") {
    redirect("/family");
  }

  return user;
}
```

- [ ] **Step 4: Guard restricted route subtrees and delete shell redirect logic**

```tsx
// src/app/(app)/builder/layout.tsx
import { requireSlpUser } from "@/features/auth/lib/server-role-guards";

export default async function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSlpUser();
  return children;
}
```

```tsx
// src/app/(app)/patients/layout.tsx
import { requireSlpUser } from "@/features/auth/lib/server-role-guards";

export default async function PatientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSlpUser();
  return children;
}
```

```tsx
// src/app/(app)/tools/layout.tsx
import { requireSlpUser } from "@/features/auth/lib/server-role-guards";

export default async function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSlpUser();
  return children;
}
```

```tsx
// src/app/(app)/billing/page.tsx
import { requireSlpUser } from "@/features/auth/lib/server-role-guards";

export default async function BillingPage() {
  await requireSlpUser();
  return <ClinicalBillingDashboard />;
}
```

```tsx
// src/features/dashboard/components/dashboard-sidebar.tsx
// remove CAREGIVER_ALLOWED_PREFIXES, useRouter import, and the redirect useEffect entirely.
```

- [ ] **Step 5: Update tests to match the new contract**

```ts
// src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
it("renders caregiver navigation without client-side redirect side effects", () => {
  render(<DashboardSidebar />);
  const nav = screen.getByRole("navigation", { name: "Primary" });
  expect(nav).toHaveTextContent("Home");
  expect(nav).toHaveTextContent("Settings");
});
```

```ts
// tests/e2e/navigation.spec.ts
test("caregiver cannot open therapist-only routes", async ({ caregiverPage }) => {
  for (const route of ["/tools/new", "/patients", "/billing"]) {
    await caregiverPage.goto(route);
    await expect(caregiverPage).toHaveURL(/\/family/);
  }
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/features/auth/lib/__tests__/server-role-guards.test.ts src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`

Run: `npx playwright test tests/e2e/navigation.spec.ts --grep "caregiver cannot open therapist-only routes"`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/auth/lib/server-role-guards.ts src/features/auth/lib/__tests__/server-role-guards.test.ts src/app/'(app)'/builder/layout.tsx src/app/'(app)'/patients/layout.tsx src/app/'(app)'/tools/layout.tsx src/app/'(app)'/billing/page.tsx src/features/dashboard/components/dashboard-sidebar.tsx src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx tests/e2e/navigation.spec.ts
git commit -m "fix: enforce therapist-only routes on the server"
```

---

## Task 4: Extract Oversized Marketing Routes Into Feature-Owned Components

**Files:**
- Create: `src/features/landing/components/platform-page.tsx`
- Create: `src/features/landing/components/meet-vocali-page.tsx`
- Create: `src/features/landing/components/pricing-page.tsx`
- Create: `src/features/landing/components/__tests__/platform-page.test.tsx`
- Create: `src/features/landing/components/__tests__/meet-vocali-page.test.tsx`
- Create: `src/features/landing/components/__tests__/pricing-page.test.tsx`
- Modify: `src/app/(marketing)/platform/page.tsx`
- Modify: `src/app/(marketing)/meet-vocali/page.tsx`
- Modify: `src/app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Write the failing component tests**

```ts
// src/features/landing/components/__tests__/platform-page.test.tsx
import { render, screen } from "@testing-library/react";

import { PlatformPage } from "../platform-page";

it("renders the pipeline and builder CTA", () => {
  render(<PlatformPage />);
  expect(screen.getByText("How it works")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /try the builder/i })).toHaveAttribute(
    "href",
    "/builder?new=1"
  );
});
```

```ts
// src/features/landing/components/__tests__/meet-vocali-page.test.tsx
import { render, screen } from "@testing-library/react";

import { MeetVocaliPage } from "../meet-vocali-page";

it("renders the three role cards and primary signup CTA", () => {
  render(<MeetVocaliPage />);
  expect(screen.getByText("Speech-Language Pathologists")).toBeInTheDocument();
  expect(screen.getByText("Caregivers & Parents")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /start building free/i })).toHaveAttribute(
    "href",
    "/sign-up"
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/landing/components/__tests__/platform-page.test.tsx src/features/landing/components/__tests__/meet-vocali-page.test.tsx src/features/landing/components/__tests__/pricing-page.test.tsx`

Expected: FAIL because the extracted components do not exist yet.

- [ ] **Step 3: Move the page JSX into feature-owned components**

```tsx
// src/features/landing/components/platform-page.tsx
import { Bot, Eye, ExternalLink, Globe, Layout, MessageSquare, Mic, Shield, Volume2, Wand2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

const PIPELINE_STEPS = [/* move existing constants here unchanged */];
const CAPABILITIES = [/* move existing constants here unchanged */];

export function PlatformPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* move existing page JSX here unchanged */}
    </main>
  );
}
```

```tsx
// src/app/(marketing)/platform/page.tsx
import type { Metadata } from "next";

import { APP_BRAND } from "@/core/config";
import { PlatformPage } from "@/features/landing/components/platform-page";

export const metadata: Metadata = {
  title: `Platform — ${APP_BRAND}`,
  description:
    `${APP_BRAND} uses Claude to generate complete, interactive therapy apps from plain-language descriptions. No code required. No templates to fight with.`,
};

export default function Page() {
  return <PlatformPage />;
}
```

Repeat the same pattern for:

- `src/features/landing/components/meet-vocali-page.tsx`
- `src/app/(marketing)/meet-vocali/page.tsx`
- `src/features/landing/components/pricing-page.tsx`
- `src/app/(marketing)/pricing/page.tsx`

The route wrappers should be less than 20 lines of executable code and contain no page-section JSX.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/landing/components/__tests__/platform-page.test.tsx src/features/landing/components/__tests__/meet-vocali-page.test.tsx src/features/landing/components/__tests__/pricing-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/landing/components/platform-page.tsx src/features/landing/components/meet-vocali-page.tsx src/features/landing/components/pricing-page.tsx src/features/landing/components/__tests__/platform-page.test.tsx src/features/landing/components/__tests__/meet-vocali-page.test.tsx src/features/landing/components/__tests__/pricing-page.test.tsx src/app/'(marketing)'/platform/page.tsx src/app/'(marketing)'/meet-vocali/page.tsx src/app/'(marketing)'/pricing/page.tsx
git commit -m "refactor: move marketing pages into landing feature"
```

---

## Task 5: Remove The Fake Shared Clinical Proxy Layer

**Files:**
- Create: `src/shared/clinical/__tests__/boundary.test.ts`
- Modify: `src/shared/clinical/index.ts`
- Delete: `src/shared/clinical/use-active-goals.ts`
- Delete: `src/shared/clinical/use-patient.ts`
- Modify: `src/features/session-notes/components/structured-data-form.tsx`
- Modify: `src/features/evaluations/components/evaluation-editor.tsx`
- Modify: `src/features/plan-of-care/components/poc-editor.tsx`
- Modify: `src/features/session-notes/components/__tests__/structured-data-form.test.tsx`
- Modify: `src/features/session-notes/components/__tests__/session-note-editor.test.tsx`

- [ ] **Step 1: Write the failing boundary and consumer tests**

```ts
// src/shared/clinical/__tests__/boundary.test.ts
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("shared clinical boundary", () => {
  it("does not import feature modules", () => {
    const dir = path.resolve(process.cwd(), "src/shared/clinical");
    const files = readdirSync(dir).filter((file) => file.endsWith(".ts"));

    for (const file of files) {
      const source = readFileSync(path.join(dir, file), "utf8");
      expect(source).not.toContain("@/features/");
    }
  });
});
```

```ts
// src/features/session-notes/components/__tests__/structured-data-form.test.tsx
vi.mock("@/features/goals/hooks/use-goals", () => ({
  useActiveGoals: vi.fn(() => []),
}));

vi.mock("@/shared/clinical", () => ({
  formatAge: vi.fn(() => "5y 2m"),
}));
```

```ts
// src/features/session-notes/components/__tests__/session-note-editor.test.tsx
vi.mock("@/features/patients/hooks/use-patients", () => ({
  usePatient: (...args: any[]) => mockUsePatient(...args),
}));
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/shared/clinical/__tests__/boundary.test.ts src/features/session-notes/components/__tests__/structured-data-form.test.tsx src/features/session-notes/components/__tests__/session-note-editor.test.tsx`

Expected: FAIL because `src/shared/clinical` still contains `@/features/*` imports and consumers still import the proxy layer.

- [ ] **Step 3: Change consumer imports to point at owning features**

```tsx
// src/features/session-notes/components/structured-data-form.tsx
import { useActiveGoals } from "@/features/goals/hooks/use-goals";
import { formatAge } from "@/shared/clinical";
```

```tsx
// src/features/evaluations/components/evaluation-editor.tsx
import { usePatient } from "@/features/patients/hooks/use-patients";
```

```tsx
// src/features/plan-of-care/components/poc-editor.tsx
import { useActiveGoals } from "@/features/goals/hooks/use-goals";
import { usePatient } from "@/features/patients/hooks/use-patients";
```

- [ ] **Step 4: Trim `src/shared/clinical` down to true shared code**

```ts
// src/shared/clinical/index.ts
export { calculateAge, formatAge, getInitials } from "./patient-utils";
export type { Goal, Patient } from "./types";
```

Delete the proxy files:

```text
src/shared/clinical/use-active-goals.ts
src/shared/clinical/use-patient.ts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/shared/clinical/__tests__/boundary.test.ts src/features/session-notes/components/__tests__/structured-data-form.test.tsx src/features/session-notes/components/__tests__/session-note-editor.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/clinical/index.ts src/shared/clinical/__tests__/boundary.test.ts src/features/session-notes/components/structured-data-form.tsx src/features/evaluations/components/evaluation-editor.tsx src/features/plan-of-care/components/poc-editor.tsx src/features/session-notes/components/__tests__/structured-data-form.test.tsx src/features/session-notes/components/__tests__/session-note-editor.test.tsx
git rm src/shared/clinical/use-active-goals.ts src/shared/clinical/use-patient.ts
git commit -m "refactor: remove shared clinical feature proxies"
```

---

## Task 6: Update Architecture Docs And Run Full Verification

**Files:**
- Modify: `docs/architecture/project-structure.md`
- Modify: `docs/architecture/tech-stack.md`

- [ ] **Step 1: Write the failing documentation checklist into the plan branch notes**

```md
- `docs/architecture/project-structure.md` must say marketing route files are thin wrappers around feature components.
- `docs/architecture/project-structure.md` must stop describing the app as only builder + therapy-tools + knowledge.
- `docs/architecture/tech-stack.md` must not say Clerk is deferred.
- `docs/architecture/tech-stack.md` must describe server-side route guards for protected surfaces.
```

This step is intentionally manual. The failure condition is “docs are visibly stale compared with the code.”

- [ ] **Step 2: Update the docs with the post-cleanup structure**

```md
<!-- docs/architecture/project-structure.md -->
- `src/app/(marketing)/*/page.tsx` files stay thin and render feature-owned components from `src/features/landing/components/`.
- `src/app/(app)/builder`, `src/app/(app)/patients`, and `src/app/(app)/tools` enforce therapist-only access in route-level layouts.
- `src/shared/clinical/` contains only cross-feature clinical types/utilities. Feature hooks stay in their owning slices.
```

```md
<!-- docs/architecture/tech-stack.md -->
| Auth | Clerk v7 + server-side role guards | Sign-in UI, JWT-backed identity, route-level therapist gating |

- **Auth + Next.js:** Clerk `currentUser()` is used in server components/layouts for route-level redirects before restricted UI renders.
- **Convex + shell UI:** Large shell widgets should fetch bounded result sets for navigation surfaces.
```

- [ ] **Step 3: Run the focused verification suite**

Run:

```bash
npm test -- src/core/__tests__/brand-copy.test.ts src/shared/components/__tests__/header.test.tsx src/shared/components/__tests__/marketing-header.test.tsx src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx src/features/auth/lib/__tests__/server-role-guards.test.ts src/features/landing/components/__tests__/platform-page.test.tsx src/features/landing/components/__tests__/meet-vocali-page.test.tsx src/features/landing/components/__tests__/pricing-page.test.tsx src/shared/clinical/__tests__/boundary.test.ts src/features/session-notes/components/__tests__/structured-data-form.test.tsx src/features/session-notes/components/__tests__/session-note-editor.test.tsx convex/__tests__/tools.test.ts
npx playwright test tests/e2e/navigation.spec.ts
```

Expected: all targeted Vitest suites PASS, Playwright navigation PASS.

- [ ] **Step 4: Run lint on touched files**

Run: `npx eslint src/core/config.ts src/app/layout.tsx src/shared/components/header.tsx src/shared/components/marketing-header.tsx src/features/dashboard/components/dashboard-sidebar.tsx src/features/auth/lib/server-role-guards.ts src/features/landing/components/platform-page.tsx src/features/landing/components/meet-vocali-page.tsx src/features/landing/components/pricing-page.tsx src/features/session-notes/components/structured-data-form.tsx src/features/evaluations/components/evaluation-editor.tsx src/features/plan-of-care/components/poc-editor.tsx convex/tools.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/project-structure.md docs/architecture/tech-stack.md
git commit -m "docs: align architecture docs with app shell cleanup"
```

---

## Self-Review

### Spec coverage

- Brand drift: covered in Task 1.
- Sidebar full-collection fetch: covered in Task 2.
- Client-side caregiver redirect: covered in Task 3.
- Fat marketing routes: covered in Task 4.
- Fake `shared/clinical` abstraction: covered in Task 5.
- Stale architecture docs: covered in Task 6.

### Placeholder scan

- No `TODO`, `TBD`, or “handle appropriately” placeholders remain.
- Every task lists exact files and exact commands.
- Every code step includes concrete snippets.

### Type consistency

- Brand constants use `APP_BRAND`, `APP_TAGLINE`, `APP_CONTACT_EMAIL`, `APP_SIGN_IN_CTA` consistently.
- Server access helper is named `requireSlpUser` everywhere.
- Bounded sidebar query is named `listRecentBySLP` everywhere.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-02-app-shell-marketing-architecture-hardening.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
