# Marketing Pages Design — Meet Bridges, Platform, Solutions

**Date:** 2026-03-31
**Status:** Approved
**Approach:** Option A — lean inline pages following the Pricing page pattern

## Problem

The nav header has three distinct links ("Meet Bridges", "Platform", "Solutions") that all currently render `ExplorePage` (the template gallery). Users clicking any of these three items get the same experience, which makes the nav misleading and wastes prime real estate for communicating the product's value.

## Solution

Create 3 new unique routes and update the nav links. Each page is a self-contained `page.tsx` with inline content — no new feature directories, no shared layout abstraction. Pattern matches `/pricing/page.tsx`.

## Nav Changes

`src/shared/components/marketing-header.tsx`:
```
{ href: "/meet-bridges", label: "Meet Bridges" }
{ href: "/platform",     label: "Platform"      }
{ href: "/solutions",    label: "Solutions"      }
```

The old `/demo-tools` route keeps its page (it's still linked from the landing page and other places). `/explore` keeps its page too. Only the nav links change.

---

## Page 1: `/meet-bridges`

**File:** `src/app/(marketing)/meet-bridges/page.tsx`
**Title:** "Meet Bridges — AI Therapy App Builder"
**Audience:** First-time visitors who want the story before the pitch

### Sections

**1. Hero (hybrid story + mission)**
- Headline (Fraunces display): "Every child deserves a bridge to communication."
- Sub (2 sentences): What Bridges is + who built it for. Example: "Bridges is an AI-powered app builder made for speech therapists, ABA therapists, and parents of autistic children. Describe the therapy tool you need in plain language — Bridges builds it in seconds."
- Two CTAs: "Start building free" (gradient button → `/sign-up`) + "See examples" (outline → `/explore`)

**2. Who it's for — 3-card row**
Each card: icon, role title, one pain point solved.
- **Speech-Language Pathologists** — "Create custom AAC boards, exercises, and data collection tools without touching code."
- **Caregivers & Parents** — "Build home practice apps, visual schedules, and communication boards tailored to your child."
- **ABA Therapists** — "Generate behavior tracking apps, reinforcement systems, and visual timers for every goal."

**3. What you can build — 3 example types**
Simple icon + title + one-line description grid:
- AAC Communication Boards — core vocabulary, Fitzgerald colors, motor planning
- Visual Schedules — step-by-step routines with images and audio cues
- Behavior Trackers — frequency data, interval recording, ABC logging

**4. CTA strip**
- "Ready to build your first app?" → "Get started free" button

---

## Page 2: `/platform`

**File:** `src/app/(marketing)/platform/page.tsx`
**Title:** "Platform — Bridges"
**Audience:** Technically curious users, administrators, evaluators doing due diligence

### Sections

**1. Hero**
- Headline: "From description to working app — in seconds."
- Sub: "Bridges uses Claude to generate complete, interactive therapy apps from plain-language descriptions. No code required. No templates to fight with."

**2. 4-step pipeline (numbered row)**
1. **Describe** — Tell Bridges what you need in plain language
2. **Generate** — Claude writes a complete React app, purpose-built for therapy
3. **Preview** — Test it live in a sandboxed, accessible preview before anyone else sees it
4. **Publish** — Share a permanent link with families, co-therapists, or students

**3. Capability grid (2×3 or 3×2 cards)**
- AI Code Generation — Claude Sonnet generates full React + Tailwind apps from your description
- Therapy-Aware Templates — 40+ shadcn/ui components pre-wired for therapy use cases
- Text-to-Speech — ElevenLabs child-friendly voices built into every generated app
- Speech-to-Text — ElevenLabs Scribe for voice interaction in apps that need it
- Sandboxed Preview — Every app runs in an isolated iframe — safe, accessible, shareable
- Vercel Publish — One-click permanent deployment with a custom shareable URL

**4. Trust callout (teal-subtle background strip)**
- "Every app is sandboxed, accessible, and runs entirely in your browser — no installs, no downloads, no data leaves your session."

**5. CTA**
- "Try the builder" → `/builder?new=1`

---

## Page 3: `/solutions`

**File:** `src/app/(marketing)/solutions/page.tsx`
**Title:** "Solutions — Bridges"
**Audience:** Visitors evaluating fit for their specific role

### Sections

**1. Hero**
- Headline: "The right tool for every role in the therapy room."
- Sub: "Bridges adapts to how you work — whether you're a clinician, a parent, or both."

**2. Role tabs — SLP | Caregiver | ABA**

Each tab contains:
- **Pain headline** (Fraunces H2)
- **How Bridges solves it** (1–2 sentences)
- **3 app types they'd build** (icon + label list)
- **Pull quote** (italicized, attributed to role type)

**SLP tab:**
- Pain: "Your caseload is full. Creating custom materials takes hours you don't have."
- Solution: "Describe the exercise, the AAC layout, or the data sheet — Bridges builds it in under a minute. Share it instantly with families and co-therapists."
- App types: AAC core boards · Articulation drills · Session data collection sheets
- Quote: *"I built a custom AAC board for a new student in 3 minutes. It would have taken me an afternoon before." — Speech-Language Pathologist*

**Caregiver tab:**
- Pain: "Home practice is hard when your child's tools only exist at the clinic."
- Solution: "Build apps that match exactly what your child is working on, and use them on any device — no app store required."
- App types: Visual morning routines · Home vocabulary boards · Reward/token systems
- Quote: *"My son uses his schedule app every morning. It's the first thing that actually stuck." — Parent of a child with autism*

**ABA tab:**
- Pain: "Tracking data on paper during a session breaks your focus on the child."
- Solution: "Generate a behavior tracking app in minutes — frequency, interval, ABC format. Tap to record, no paper needed."
- App types: Frequency counters · ABC data sheets · Visual reinforcement boards
- Quote: *"Now I track trials on my phone without looking away from my client." — Board-Certified Behavior Analyst*

**3. CTA — role-aware**
- SLP: "Sign up as a therapist" → `/sign-in?role=slp`
- Caregiver: "Sign up as a caregiver" → `/sign-in?role=caregiver`
- ABA: "Sign up as a therapist" → `/sign-in?role=slp`

---

## Implementation Notes

- All pages are Server Components (no `"use client"`)
- Use semantic tokens: `bg-canvas`, `bg-surface`, `text-on-surface`, `text-on-surface-variant`, `text-primary`
- Tabs on Solutions page use a client component for active tab state — extract as `src/app/(marketing)/solutions/_components/role-tabs.tsx` with `"use client"` at the top; the `solutions/page.tsx` stays a Server Component and imports it
- No new feature directories — all content is inline in page files
- Follow existing patterns from `/pricing/page.tsx` for layout structure (`mx-auto max-w-[1180px] px-6`)
- Fraunces headings use `font-headline` class
- Primary CTA uses `variant="gradient"`, secondary uses `variant="outline"`

## Files to Create

1. `src/app/(marketing)/meet-bridges/page.tsx`
2. `src/app/(marketing)/platform/page.tsx`
3. `src/app/(marketing)/solutions/page.tsx`
4. `src/app/(marketing)/solutions/_components/role-tabs.tsx` (client component for tab state)

## Files to Modify

1. `src/shared/components/marketing-header.tsx` — update 3 nav hrefs
2. `src/shared/components/__tests__/marketing-header.test.tsx` — update href assertions for Platform and Solutions

## Out of Scope

- Changing `/demo-tools` or `/explore` routes (they stay as-is)
- Adding imagery or illustrations (text + icons only, following Pricing page pattern)
- Animation (per DESIGN.md: minimal-functional motion only)
