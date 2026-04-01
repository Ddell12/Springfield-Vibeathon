# Marketing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create three unique marketing pages (`/meet-bridges`, `/platform`, `/solutions`) and update the nav links that currently point all three to the same template gallery.

**Architecture:** Four new files: three `page.tsx` Server Components and one `role-tabs.tsx` Client Component for Solutions tab state. All pages follow the inline-content pattern from `/pricing/page.tsx` — no new feature directories. Nav updated in `marketing-header.tsx`.

**Tech Stack:** Next.js 15 App Router, Tailwind v4, shadcn/ui (`Button`), lucide-react icons, Vitest + React Testing Library

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/shared/components/marketing-header.tsx` | Modify | Fix 3 nav hrefs |
| `src/shared/components/__tests__/marketing-header.test.tsx` | Modify | Update stale href assertions |
| `src/app/(marketing)/meet-bridges/page.tsx` | Create | Meet Bridges story + mission page |
| `src/app/(marketing)/platform/page.tsx` | Create | How-it-works + capabilities page |
| `src/app/(marketing)/solutions/_components/role-tabs.tsx` | Create | Client component: tab switcher for 3 roles |
| `src/app/(marketing)/solutions/page.tsx` | Create | Solutions page — wraps RoleTabs |

---

## Task 1: Update nav links and fix the stale test

**Files:**
- Modify: `src/shared/components/marketing-header.tsx:20-22`
- Modify: `src/shared/components/__tests__/marketing-header.test.tsx:82-98`

- [ ] **Step 1: Update `navLinks` in `marketing-header.tsx`**

Replace lines 19–25:

```tsx
const navLinks = [
  { href: "/meet-bridges", label: "Meet Bridges" },
  { href: "/platform", label: "Platform" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/learn", label: "Learn" },
];
```

- [ ] **Step 2: Update the stale test**

The existing test at line 80–98 mocks `usePathname` to `/demo-tools` and checks that "Platform" has `href="/demo-tools"`. After our change Platform points to `/platform`. Replace the `"highlights active nav link"` test:

```tsx
it("highlights active nav link when pathname matches", async () => {
  const { usePathname } = await import("next/navigation");
  vi.mocked(usePathname).mockReturnValue("/platform");

  render(<MarketingHeader />);

  const platformLinks = screen.getAllByText("Platform");
  const desktopLink = platformLinks.find(
    (el) => el.closest("a")?.getAttribute("href") === "/platform"
  );
  expect(desktopLink).toBeDefined();
  expect(desktopLink?.className).toContain("bg-surface");

  const learnLinks = screen.getAllByText("Learn");
  const learnLink = learnLinks.find(
    (el) => el.closest("a")?.getAttribute("href") === "/learn"
  );
  expect(learnLink?.className).toContain("text-on-surface-variant");
});
```

- [ ] **Step 3: Run the header tests**

```bash
npx vitest run src/shared/components/__tests__/marketing-header.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/marketing-header.tsx \
        src/shared/components/__tests__/marketing-header.test.tsx
git commit -m "fix(nav): route Meet Bridges, Platform, Solutions to unique pages"
```

---

## Task 2: Create the `/meet-bridges` page

**Files:**
- Create: `src/app/(marketing)/meet-bridges/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
import { GraduationCap, Heart, ClipboardList, Grid2x2, Calendar, BarChart2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Meet Bridges — AI Therapy App Builder",
  description:
    "Bridges is an AI-powered app builder made for speech therapists, ABA therapists, and parents of autistic children. Describe the therapy tool you need — Bridges builds it in seconds.",
};

const ROLES = [
  {
    icon: GraduationCap,
    title: "Speech-Language Pathologists",
    description:
      "Create custom AAC boards, exercises, and data collection tools without touching code.",
  },
  {
    icon: Heart,
    title: "Caregivers & Parents",
    description:
      "Build home practice apps, visual schedules, and communication boards tailored to your child.",
  },
  {
    icon: ClipboardList,
    title: "ABA Therapists",
    description:
      "Generate behavior tracking apps, reinforcement systems, and visual timers for every goal.",
  },
];

const APP_TYPES = [
  {
    icon: Grid2x2,
    title: "AAC Communication Boards",
    description: "Core vocabulary, Fitzgerald colors, and motor planning built in.",
  },
  {
    icon: Calendar,
    title: "Visual Schedules",
    description: "Step-by-step routines with images and audio cues.",
  },
  {
    icon: BarChart2,
    title: "Behavior Trackers",
    description: "Frequency data, interval recording, and ABC logging.",
  },
];

export default function MeetBridgesPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-headline text-5xl leading-[1.15] tracking-tight text-on-surface">
          Every child deserves a bridge to communication.
        </h1>
        <p className="mt-6 text-lg leading-7 text-on-surface-variant">
          Bridges is an AI-powered app builder made for speech therapists, ABA therapists, and
          parents of autistic children. Describe the therapy tool you need in plain language —
          Bridges builds it in seconds.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="gradient" className="rounded-xl px-6 font-semibold">
            <Link href="/sign-up">Start building free</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl px-6">
            <Link href="/explore">See examples</Link>
          </Button>
        </div>
      </div>

      {/* Who it's for */}
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">Who it&apos;s for</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl bg-surface p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-subtle">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What you can build */}
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">
          What you can build
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {APP_TYPES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl bg-surface p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-subtle">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA strip */}
      <div className="mt-20 rounded-3xl bg-surface px-8 py-12 text-center">
        <p className="font-headline text-2xl text-on-surface">
          Ready to build your first app?
        </p>
        <Button asChild variant="gradient" className="mt-6 rounded-xl px-8 font-semibold">
          <Link href="/sign-up">Get started free</Link>
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npx tsc --noEmit 2>&1 | grep "meet-bridges"
```

Expected: no output (no type errors in this file).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(marketing\)/meet-bridges/page.tsx
git commit -m "feat: add /meet-bridges marketing page"
```

---

## Task 3: Create the `/platform` page

**Files:**
- Create: `src/app/(marketing)/platform/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
import { MessageSquare, Wand2, Eye, Globe, Bot, Layout, Volume2, Mic, Shield, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Platform — Bridges",
  description:
    "Bridges uses Claude to generate complete, interactive therapy apps from plain-language descriptions. No code required. No templates to fight with.",
};

const PIPELINE_STEPS = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Describe",
    description: "Tell Bridges what you need in plain language.",
  },
  {
    number: "02",
    icon: Wand2,
    title: "Generate",
    description: "Claude writes a complete React app, purpose-built for therapy.",
  },
  {
    number: "03",
    icon: Eye,
    title: "Preview",
    description: "Test it live in a sandboxed, accessible preview before anyone else sees it.",
  },
  {
    number: "04",
    icon: Globe,
    title: "Publish",
    description: "Share a permanent link with families, co-therapists, or students.",
  },
];

const CAPABILITIES = [
  {
    icon: Bot,
    title: "AI Code Generation",
    description: "Claude Sonnet generates full React + Tailwind apps from your description.",
  },
  {
    icon: Layout,
    title: "Therapy-Aware Templates",
    description: "40+ shadcn/ui components pre-wired for therapy use cases.",
  },
  {
    icon: Volume2,
    title: "Text-to-Speech",
    description: "ElevenLabs child-friendly voices built into every generated app.",
  },
  {
    icon: Mic,
    title: "Speech-to-Text",
    description: "ElevenLabs Scribe for voice interaction in apps that need it.",
  },
  {
    icon: Shield,
    title: "Sandboxed Preview",
    description: "Every app runs in an isolated iframe — safe, accessible, shareable.",
  },
  {
    icon: ExternalLink,
    title: "Vercel Publish",
    description: "One-click permanent deployment with a custom shareable URL.",
  },
];

export default function PlatformPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-headline text-5xl leading-[1.15] tracking-tight text-on-surface">
          From description to working app — in seconds.
        </h1>
        <p className="mt-6 text-lg leading-7 text-on-surface-variant">
          Bridges uses Claude to generate complete, interactive therapy apps from plain-language
          descriptions. No code required. No templates to fight with.
        </p>
      </div>

      {/* 4-step pipeline */}
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map(({ number, icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl bg-surface p-8">
              <span className="font-mono text-xs tracking-widest text-on-surface-variant">
                {number}
              </span>
              <div className="mt-3 flex size-12 items-center justify-center rounded-2xl bg-teal-subtle">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capability grid */}
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">
          Built for therapy, from the ground up
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl bg-surface p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-subtle">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust callout */}
      <div className="mt-14 rounded-3xl bg-teal-subtle px-8 py-10 text-center">
        <p className="text-base leading-7 text-on-surface">
          Every app is sandboxed, accessible, and runs entirely in your browser —
          no installs, no downloads, no data leaves your session.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-14 text-center">
        <Button asChild variant="gradient" className="rounded-xl px-8 font-semibold">
          <Link href="/builder?new=1">Try the builder</Link>
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npx tsc --noEmit 2>&1 | grep "platform"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(marketing\)/platform/page.tsx
git commit -m "feat: add /platform marketing page"
```

---

## Task 4: Create the `RoleTabs` client component

**Files:**
- Create: `src/app/(marketing)/solutions/_components/role-tabs.tsx`

- [ ] **Step 1: Create the `_components` directory and the component**

```tsx
"use client";

import { Grid2x2, Calendar, BarChart2, BookOpen, Home, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

type Role = "slp" | "caregiver" | "aba";

const ROLES: { id: Role; label: string }[] = [
  { id: "slp", label: "Speech-Language Pathologist" },
  { id: "caregiver", label: "Caregiver / Parent" },
  { id: "aba", label: "ABA Therapist" },
];

const CONTENT: Record<
  Role,
  {
    pain: string;
    solution: string;
    apps: { icon: React.ElementType; label: string }[];
    quote: string;
    attribution: string;
    ctaLabel: string;
    ctaHref: string;
  }
> = {
  slp: {
    pain: "Your caseload is full. Creating custom materials takes hours you don't have.",
    solution:
      "Describe the exercise, the AAC layout, or the data sheet — Bridges builds it in under a minute. Share it instantly with families and co-therapists.",
    apps: [
      { icon: Grid2x2, label: "AAC core boards" },
      { icon: BookOpen, label: "Articulation drills" },
      { icon: BarChart2, label: "Session data collection sheets" },
    ],
    quote:
      "I built a custom AAC board for a new student in 3 minutes. It would have taken me an afternoon before.",
    attribution: "Speech-Language Pathologist",
    ctaLabel: "Sign up as a therapist",
    ctaHref: "/sign-in?role=slp",
  },
  caregiver: {
    pain: "Home practice is hard when your child's tools only exist at the clinic.",
    solution:
      "Build apps that match exactly what your child is working on, and use them on any device — no app store required.",
    apps: [
      { icon: Calendar, label: "Visual morning routines" },
      { icon: Grid2x2, label: "Home vocabulary boards" },
      { icon: Star, label: "Reward / token systems" },
    ],
    quote: "My son uses his schedule app every morning. It's the first thing that actually stuck.",
    attribution: "Parent of a child with autism",
    ctaLabel: "Sign up as a caregiver",
    ctaHref: "/sign-in?role=caregiver",
  },
  aba: {
    pain: "Tracking data on paper during a session breaks your focus on the child.",
    solution:
      "Generate a behavior tracking app in minutes — frequency, interval, ABC format. Tap to record, no paper needed.",
    apps: [
      { icon: BarChart2, label: "Frequency counters" },
      { icon: Home, label: "ABC data sheets" },
      { icon: Grid2x2, label: "Visual reinforcement boards" },
    ],
    quote: "Now I track trials on my phone without looking away from my client.",
    attribution: "Board-Certified Behavior Analyst",
    ctaLabel: "Sign up as a therapist",
    ctaHref: "/sign-in?role=slp",
  },
};

export function RoleTabs() {
  const [active, setActive] = useState<Role>("slp");
  const content = CONTENT[active];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active === id
                ? "bg-primary text-white"
                : "bg-surface text-on-surface-variant hover:text-on-surface"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-8 rounded-3xl bg-surface p-8 sm:p-10">
        <h2 className="font-headline text-3xl text-on-surface">{content.pain}</h2>
        <p className="mt-4 text-base leading-7 text-on-surface-variant">{content.solution}</p>

        <ul className="mt-8 space-y-3">
          {content.apps.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-on-surface">
              <div className="flex size-8 items-center justify-center rounded-lg bg-teal-subtle">
                <Icon className="size-4 text-primary" />
              </div>
              {label}
            </li>
          ))}
        </ul>

        <blockquote className="mt-8 border-l-2 border-primary pl-4">
          <p className="text-sm italic leading-6 text-on-surface-variant">
            &ldquo;{content.quote}&rdquo;
          </p>
          <footer className="mt-2 text-xs text-on-surface-variant">— {content.attribution}</footer>
        </blockquote>

        <Button asChild variant="gradient" className="mt-8 rounded-xl font-semibold">
          <Link href={content.ctaHref}>{content.ctaLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "solutions"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(marketing\)/solutions/_components/role-tabs.tsx
git commit -m "feat: add RoleTabs client component for /solutions page"
```

---

## Task 5: Create the `/solutions` page

**Files:**
- Create: `src/app/(marketing)/solutions/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
import type { Metadata } from "next";

import { RoleTabs } from "./_components/role-tabs";

export const metadata: Metadata = {
  title: "Solutions — Bridges",
  description:
    "Bridges adapts to how you work — whether you're a clinician, a parent, or both. See how Bridges fits each role in the therapy room.",
};

export default function SolutionsPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-headline text-5xl leading-[1.15] tracking-tight text-on-surface">
          The right tool for every role in the therapy room.
        </h1>
        <p className="mt-6 text-lg leading-7 text-on-surface-variant">
          Bridges adapts to how you work — whether you&apos;re a clinician, a parent, or both.
        </p>
      </div>

      {/* Role tabs */}
      <div className="mt-16">
        <RoleTabs />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npx tsc --noEmit 2>&1 | grep "solutions"
```

Expected: no output.

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
npx vitest run
```

Expected: all tests pass (existing suite has 636 tests across 77 files).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(marketing\)/solutions/page.tsx
git commit -m "feat: add /solutions marketing page with role-based tabs"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - ✅ Nav links updated (`/meet-bridges`, `/platform`, `/solutions`)
  - ✅ `/meet-bridges`: hero, 3-role cards, 3 app types, CTA strip
  - ✅ `/platform`: hero, 4-step pipeline, 6-capability grid, trust callout, CTA
  - ✅ `/solutions`: hero, role tabs (SLP/Caregiver/ABA), pain + solution + app types + quote + CTA per tab
  - ✅ `/demo-tools` and `/explore` left untouched
  - ✅ Tests updated for header
  - ✅ `RoleTabs` is a separate `"use client"` file, page is Server Component

- **No placeholders:** All code is complete in every step.

- **Type consistency:** `Role` type is `"slp" | "caregiver" | "aba"` — used consistently in `CONTENT` record and `useState` default. `React.ElementType` used for icon prop type, consistent with lucide usage pattern.
