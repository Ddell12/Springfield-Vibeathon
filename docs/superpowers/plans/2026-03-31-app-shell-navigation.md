# App Shell & Navigation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed icon-only sidebar with a Claude.ai-style collapsible panel, remove dead routes, add a shared header, and surface recent builder sessions.

**Architecture:** New `DashboardSidebar` owns collapse state in `localStorage`, renders role-based nav items, recent sessions from Convex, and a custom user menu Popover. A new `AppHeader` component replaces `MobileTopBar` and renders `NotificationBell` + `UserButton` on all breakpoints. Dead routes (`/dashboard`, `/flashcards`, `/templates`, `/my-tools`) are deleted or merged into `/library`.

**Tech Stack:** Next.js 16 App Router, Convex (`useQuery`), Clerk v7 (`useUser`, `useClerk`), shadcn/ui (`Popover`), Tailwind v4, Vitest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Modify (full rebuild) | Collapsible sidebar, nav items, recents, user menu |
| `src/shared/components/app-header.tsx` | Create | Sticky page header with title, NotificationBell, UserButton |
| `src/app/(app)/layout.tsx` | Modify | Add AppHeader, remove MobileTopBar, widen main margin |
| `src/shared/lib/navigation.ts` | Modify | Updated NAV_ITEMS, CAREGIVER_NAV_ITEMS, isNavActive |
| `src/core/routes.ts` | Modify | Add LIBRARY route |
| `convex/sessions.ts` | Modify | Add listRecent query |
| `next.config.ts` | Modify | Add redirects for /dashboard, /flashcards, /templates, /my-tools |
| `src/app/layout.tsx` | Modify | Add afterSignInUrl/afterSignUpUrl to ClerkProvider |
| `src/app/(app)/library/page.tsx` | Create | /library route (thin wrapper) |
| `src/features/library/components/library-page.tsx` | Create | Tabbed Templates + My Apps page |
| `src/app/(app)/dashboard/` | Delete | Entire directory |
| `src/app/(app)/flashcards/` | Delete | Route directory only (feature stays) |
| `src/app/(app)/templates/` | Delete | Entire directory |
| `src/app/(app)/my-tools/` | Delete | Entire directory |
| `src/features/dashboard/components/mobile-top-bar.tsx` | Delete | Replaced by AppHeader |
| `src/shared/components/mobile-nav-drawer.tsx` | Delete | No longer needed |
| `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx` | Modify | Rewrite for new sidebar |
| `src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx` | Modify | Rewrite |
| `src/shared/lib/__tests__/navigation.test.ts` | Modify | Update nav item assertions |

---

## Task 1: Update routes config and navigation data

**Files:**
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`
- Modify: `src/shared/lib/__tests__/navigation.test.ts`

- [ ] **Step 1: Write failing tests for updated navigation**

```ts
// src/shared/lib/__tests__/navigation.test.ts
import { describe, it, expect } from "vitest";
import { NAV_ITEMS, CAREGIVER_NAV_ITEMS, isNavActive } from "../navigation";

describe("NAV_ITEMS", () => {
  it("contains Builder as first item", () => {
    expect(NAV_ITEMS[0].label).toBe("Builder");
    expect(NAV_ITEMS[0].href).toBe("/builder");
  });
  it("contains Library", () => {
    expect(NAV_ITEMS.some((i) => i.label === "Library")).toBe(true);
  });
  it("does not contain Home, Flashcards, Templates, My Apps, Settings", () => {
    const labels = NAV_ITEMS.map((i) => i.label);
    expect(labels).not.toContain("Home");
    expect(labels).not.toContain("Flashcards");
    expect(labels).not.toContain("Templates");
    expect(labels).not.toContain("My Apps");
    expect(labels).not.toContain("Settings");
  });
  it("has exactly 6 SLP items", () => {
    expect(NAV_ITEMS).toHaveLength(6);
  });
  it("caregiver nav has exactly 2 items", () => {
    expect(CAREGIVER_NAV_ITEMS).toHaveLength(2);
  });
});

describe("isNavActive", () => {
  it("matches /library exactly", () => {
    expect(isNavActive("/library", "/library", null)).toBe(true);
    expect(isNavActive("/library", "/library?tab=my-apps", null)).toBe(false);
  });
  it("matches /builder prefix", () => {
    expect(isNavActive("/builder", "/builder/abc123", null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test -- src/shared/lib/__tests__/navigation.test.ts
```
Expected: FAIL — assertions about Library, missing Settings, length 6

- [ ] **Step 3: Update routes.ts**

```ts
// src/core/routes.ts
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  BUILDER: "/builder",
  BUILDER_SESSION: (sessionId: string) => `/builder/${sessionId}` as const,
  MY_TOOLS: "/my-tools",
  TEMPLATES: "/templates",
  LIBRARY: "/library",
  FLASHCARDS: "/flashcards",
  SETTINGS: "/settings",
  TOOL_VIEW: (toolId: string) => `/tool/${toolId}` as const,
  PATIENTS: "/patients",
  PATIENT_DETAIL: (id: string) => `/patients/${id}` as const,
  PATIENT_NEW: "/patients/new",
  INVITE: (token: string) => `/invite/${token}` as const,
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  FAMILY: "/family",
  SPEECH_COACH: "/speech-coach",
  SESSIONS: "/sessions",
  SESSION_DETAIL: (id: string) => `/sessions/${id}` as const,
  BILLING: "/billing",
  SESSION_CALL: (id: string) => `/sessions/${id}/call` as const,
  SESSION_NOTES: (id: string) => `/sessions/${id}/notes` as const,
  SESSION_BOOK: (slpId: string) => `/sessions/book/${slpId}` as const,
  FAMILY_CHILD: (patientId: string) => `/family/${patientId}` as const,
  FAMILY_MESSAGES: (patientId: string) => `/family/${patientId}/messages` as const,
  FAMILY_PLAY: (patientId: string) => `/family/${patientId}/play` as const,
  FAMILY_PLAY_APP: (patientId: string, appId: string) => `/family/${patientId}/play/${appId}` as const,
} as const;
```

- [ ] **Step 4: Update navigation.ts**

```ts
// src/shared/lib/navigation.ts
import { ROUTES } from "@/core/routes";

export const NAV_ITEMS = [
  { icon: "auto_awesome",          label: "Builder",      href: ROUTES.BUILDER },
  { icon: "group",                 label: "Patients",     href: ROUTES.PATIENTS },
  { icon: "video_call",            label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "receipt_long",          label: "Billing",      href: ROUTES.BILLING },
  { icon: "record_voice_over",     label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "collections_bookmark",  label: "Library",      href: ROUTES.LIBRARY },
] as const;

export const CAREGIVER_NAV_ITEMS = [
  { icon: "video_call",        label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
] as const;

export function isNavActive(
  href: string,
  pathname: string,
  _tab: string | null
): boolean {
  if (href === "/builder")      return pathname.startsWith("/builder");
  if (href === "/patients")     return pathname.startsWith("/patients");
  if (href === "/sessions")     return pathname.startsWith("/sessions");
  if (href === "/billing")      return pathname.startsWith("/billing");
  if (href === "/speech-coach") return pathname.startsWith("/speech-coach");
  if (href === "/family")       return pathname.startsWith("/family");
  if (href === "/library")      return pathname === "/library";
  return pathname === href;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- src/shared/lib/__tests__/navigation.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/routes.ts src/shared/lib/navigation.ts src/shared/lib/__tests__/navigation.test.ts
git commit -m "feat(nav): add LIBRARY route, rebuild NAV_ITEMS without home/flashcards/settings"
```

---

## Task 2: Add Convex listRecent query

**Files:**
- Modify: `convex/sessions.ts`

**Note:** The `sessions` table uses index `"by_user"` (not `"by_userId"`) — confirmed in schema.ts line 28.

- [ ] **Step 1: Add listRecent export to convex/sessions.ts**

Open `convex/sessions.ts` and add this export at the end of the file (after the last existing export):

```ts
export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(8);
  },
});
```

- [ ] **Step 2: Verify Convex dev compiles without errors**

```bash
npx convex dev --once 2>&1 | tail -20
```
Expected: no TypeScript errors, function registered as `sessions:listRecent`

- [ ] **Step 3: Commit**

```bash
git add convex/sessions.ts
git commit -m "feat(convex): add sessions.listRecent query for sidebar recents"
```

---

## Task 3: Add redirects to next.config.ts and update Clerk afterSignInUrl

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add redirects to next.config.ts**

In `next.config.ts`, add an `async redirects()` method inside `nextConfig`:

```ts
// Add before the closing `};` of nextConfig:
async redirects() {
  return [
    { source: "/dashboard", destination: "/builder", permanent: true },
    { source: "/flashcards", destination: "/builder", permanent: true },
    { source: "/templates", destination: "/library?tab=templates", permanent: true },
    { source: "/my-tools",   destination: "/library?tab=my-apps", permanent: true },
  ];
},
```

- [ ] **Step 2: Update ClerkProvider with afterSignInUrl**

In `src/app/layout.tsx`, update the `<ClerkProvider>` tag:

```tsx
<ClerkProvider afterSignInUrl="/builder" afterSignUpUrl="/builder">
```

- [ ] **Step 3: Commit**

```bash
git add next.config.ts src/app/layout.tsx
git commit -m "feat(routing): redirect dashboard/flashcards/templates/my-tools, sign-in lands on /builder"
```

---

## Task 4: Create AppHeader component

**Files:**
- Create: `src/shared/components/app-header.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/shared/components/app-header.tsx
"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { NotificationBell } from "@/features/sessions/components/notification-bell";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-outline-variant/20 bg-background/80 px-4 backdrop-blur-sm">
      {title && (
        <h1 className="text-sm font-semibold text-on-surface font-headline truncate">
          {title}
        </h1>
      )}
      <div className="flex-1" />
      <Show when="signed-in">
        <NotificationBell />
        {/* UserButton visible on mobile only — desktop uses sidebar user menu */}
        <div className="md:hidden">
          <UserButton />
        </div>
      </Show>
      <Show when="signed-out">
        <Link href="/sign-in" className="text-sm font-semibold text-primary">
          Sign in
        </Link>
      </Show>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/app-header.tsx
git commit -m "feat(layout): add AppHeader with NotificationBell and mobile UserButton"
```

---

## Task 5: Create Library page

**Files:**
- Create: `src/app/(app)/library/page.tsx`
- Create: `src/features/library/components/library-page.tsx`

- [ ] **Step 1: Create the feature component**

```tsx
// src/features/library/components/library-page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

// Reuse existing page content components
import { MyToolsPage } from "@/features/my-tools/components/my-tools-page";
import { TemplatesPage } from "@/features/templates/components/templates-page";

export function LibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "templates";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Library</h1>
        <p className="text-sm text-on-surface-variant mt-1">Templates to start from and apps you've built</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => router.replace(`/library?tab=${v}`)}
      >
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="my-apps">My Apps</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <TemplatesPage embedded />
        </TabsContent>
        <TabsContent value="my-apps">
          <MyToolsPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Note:** `TemplatesPage` and `MyToolsPage` need an `embedded?: boolean` prop added to hide their own page headers (the `LibraryPage` renders its own `<h1>`). Add that prop to each — if `embedded` is true, skip rendering the header.

- [ ] **Step 2: Create the route page**

```tsx
// src/app/(app)/library/page.tsx
import { Suspense } from "react";
import { LibraryPage } from "@/features/library/components/library-page";

export const metadata = { title: "Library" };

export default function Page() {
  return (
    <Suspense>
      <LibraryPage />
    </Suspense>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/library/page.tsx src/features/library/components/library-page.tsx
git commit -m "feat(library): add /library page merging templates and my-apps tabs"
```

---

## Task 6: Rebuild DashboardSidebar

**Files:**
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Modify: `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
- Modify: `src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardSidebar } from "../dashboard-sidebar";

vi.mock("convex/react", () => ({
  useQuery: () => [],
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Jane", lastName: "SLP", email: "jane@test.com", publicMetadata: { role: "slp" } } }),
  useClerk: () => ({ signOut: vi.fn() }),
  Show: ({ when, children }: any) => (when === "signed-in" ? <>{children}</> : null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/builder",
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe("DashboardSidebar (SLP)", () => {
  it("renders New App button linking to /builder?new=1", () => {
    render(<DashboardSidebar />);
    expect(screen.getByRole("link", { name: /new app/i })).toHaveAttribute("href", "/builder?new=1");
  });
  it("renders Builder, Patients, Sessions, Billing, Speech Coach, Library nav items", () => {
    render(<DashboardSidebar />);
    ["Builder", "Patients", "Sessions", "Billing", "Speech Coach", "Library"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
  it("does not render Home, Flashcards, Settings as nav items", () => {
    render(<DashboardSidebar />);
    expect(screen.queryByRole("link", { name: /^home$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /flashcards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^settings$/i })).not.toBeInTheDocument();
  });
  it("toggles collapsed state when hamburger is clicked", () => {
    render(<DashboardSidebar />);
    const toggle = screen.getByRole("button", { name: /toggle sidebar/i });
    fireEvent.click(toggle);
    // After collapse, nav labels should not be visible
    expect(screen.queryByText("Patients")).not.toBeVisible();
  });
  it("shows Recents section when expanded", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText(/recents/i)).toBeInTheDocument();
  });
  it("shows user name in user menu trigger when expanded", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Jane SLP")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Rewrite DashboardSidebar**

```tsx
// src/features/dashboard/components/dashboard-sidebar.tsx
"use client";

import { useClerk, useUser, Show } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import { cn } from "@/core/utils";
import { ROUTES } from "@/core/routes";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { CAREGIVER_NAV_ITEMS, isNavActive, NAV_ITEMS } from "@/shared/lib/navigation";

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isCaregiver = role === "caregiver";
  const navItems = isCaregiver ? CAREGIVER_NAV_ITEMS : NAV_ITEMS;

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("bridges_sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("bridges_sidebar_collapsed", String(!prev));
      return !prev;
    });
  };

  const recentSessions = useQuery(api.sessions.listRecent) ?? [];

  // Redirect caregivers away from SLP-only routes
  useEffect(() => {
    if (
      isCaregiver &&
      !pathname.startsWith("/family") &&
      !pathname.startsWith("/settings") &&
      !pathname.startsWith("/speech-coach") &&
      !pathname.startsWith("/sessions")
    ) {
      router.replace("/family");
    }
  }, [isCaregiver, pathname, router]);

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "U";

  const planLabel = (user?.publicMetadata as { plan?: string } | undefined)?.plan ?? "Free";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 hidden h-screen flex-col bg-surface-container transition-all duration-300 md:flex overflow-hidden",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* Collapse toggle + wordmark */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-outline-variant/10 px-3">
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={toggleCollapsed}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <MaterialIcon icon="menu" size="sm" />
        </button>
        {!collapsed && (
          <span className="text-sm font-bold text-on-surface tracking-tight">Bridges</span>
        )}
      </div>

      {/* New App button */}
      <div className="shrink-0 px-2 py-3">
        <Link
          href="/builder?new=1"
          aria-label="New App"
          className={cn(
            "flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white shadow-sm transition-all hover:opacity-90 active:scale-95",
            collapsed ? "h-10 w-10 justify-center" : "px-3 py-2",
          )}
        >
          <MaterialIcon icon="add" size="sm" />
          {!collapsed && <span className="text-sm font-semibold">New App</span>}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = isNavActive(item.href, pathname, tab);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2 py-2 transition-all duration-200 active:scale-95",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              <MaterialIcon icon={item.icon} filled={isActive} size="sm" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Recents */}
      {!collapsed && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden px-2">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">
            Recents
          </p>
          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {recentSessions.length === 0 ? (
              <p className="px-2 text-xs text-on-surface-variant/50">No recent apps</p>
            ) : (
              recentSessions.map((s) => {
                const isActive = pathname === ROUTES.BUILDER_SESSION(s._id);
                return (
                  <Link
                    key={s._id}
                    href={ROUTES.BUILDER_SESSION(s._id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors",
                      isActive && "bg-surface-container-high text-on-surface font-medium",
                    )}
                  >
                    {s.state === "generating" && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
                    )}
                    <span className="truncate">{s.title || "Untitled App"}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* User menu */}
      <div className="mt-auto shrink-0 border-t border-outline-variant/10 p-2">
        <Show when="signed-in">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-container-high",
                  collapsed ? "justify-center" : "",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-xs font-bold text-white">
                  {initials}
                </div>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-on-surface">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/60">{planLabel} plan</p>
                    </div>
                    <MaterialIcon icon="expand_more" size="xs" className="text-on-surface-variant/40" />
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
              <div className="my-1 border-t border-outline-variant/20" />
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MaterialIcon icon="settings" size="sm" />
                Settings
              </Link>
              <div className="my-1 border-t border-outline-variant/20" />
              <button
                type="button"
                onClick={() => signOut(() => router.push("/sign-in"))}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MaterialIcon icon="logout" size="sm" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </Show>
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <MaterialIcon icon="login" size="sm" />
            {!collapsed && <span>Sign in</span>}
          </Link>
        </Show>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
```
Expected: PASS

- [ ] **Step 5: Update caregiver sidebar test**

```tsx
// src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
import { render, screen } from "@testing-library/react";
import { DashboardSidebar } from "../dashboard-sidebar";

vi.mock("convex/react", () => ({ useQuery: () => [] }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Parent", lastName: "User", publicMetadata: { role: "caregiver" } } }),
  useClerk: () => ({ signOut: vi.fn() }),
  Show: ({ when, children }: any) => (when === "signed-in" ? <>{children}</> : null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/sessions",
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));

describe("DashboardSidebar (caregiver)", () => {
  it("renders Sessions and Speech Coach only", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Speech Coach")).toBeInTheDocument();
    expect(screen.queryByText("Patients")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
    expect(screen.queryByText("Library")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test -- src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/dashboard/components/dashboard-sidebar.tsx \
        src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx \
        src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
git commit -m "feat(sidebar): rebuild as collapsible Claude.ai-style panel with recents and user menu"
```

---

## Task 7: Update AppLayout and delete dead files

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Delete: `src/features/dashboard/components/mobile-top-bar.tsx`
- Delete: `src/shared/components/mobile-nav-drawer.tsx`
- Delete: `src/app/(app)/dashboard/` (entire directory)
- Delete: `src/app/(app)/flashcards/` (route directory only)
- Delete: `src/app/(app)/templates/` (entire directory)
- Delete: `src/app/(app)/my-tools/` (entire directory)

- [ ] **Step 1: Update layout.tsx**

```tsx
// src/app/(app)/layout.tsx
import { Suspense } from "react";

import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { AppHeader } from "@/shared/components/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Suspense>
        <DashboardSidebar />
      </Suspense>
      <main
        id="main-content"
        className="flex flex-1 flex-col overflow-y-auto md:ml-14 transition-[margin] duration-300"
      >
        <AppHeader />
        {children}
      </main>
    </div>
  );
}
```

**Note:** `md:ml-14` matches the collapsed sidebar width. When expanded the sidebar overlays on top — this is the same pattern Claude.ai uses (sidebar doesn't push content, it overlays). If the product prefers push behavior, change to `md:ml-14` and add a CSS variable approach. For now overlay is simpler.

- [ ] **Step 2: Delete dead route directories**

```bash
rm -rf "src/app/(app)/dashboard"
rm -rf "src/app/(app)/flashcards"
rm -rf "src/app/(app)/templates"
rm -rf "src/app/(app)/my-tools"
rm -f src/features/dashboard/components/mobile-top-bar.tsx
rm -f src/shared/components/mobile-nav-drawer.tsx
```

- [ ] **Step 3: Delete dead test files**

```bash
rm -f "src/shared/components/__tests__/mobile-nav-drawer.test.tsx"
```

- [ ] **Step 4: Run the full test suite to catch any broken imports**

```bash
npm test 2>&1 | grep -E "FAIL|Cannot find|import" | head -20
```
Fix any broken import errors (files that imported `MobileTopBar`, `mobile-nav-drawer`, or the deleted routes).

- [ ] **Step 5: Start dev server and verify sidebar renders**

```bash
npm run dev 2>&1 &
sleep 5
curl -s http://localhost:3000/builder | grep -c "Bridges" || echo "dev server not ready"
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(layout): add AppHeader, update AppLayout, delete dashboard/flashcards/templates/my-tools routes"
```

---

## Task 8: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
npm test 2>&1 | tail -20
```
Expected: All existing tests pass (some may need mock updates for deleted `MobileTopBar` — fix those)

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: No errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "test: fix any broken test mocks after Group A navigation overhaul"
```
