# Plan: Sign-In Image, Google OAuth, Marketing Routing, Learn Page

## Context

Four improvements to the Bridges marketing and auth experience:
1. The sign-in art panel shows an unrelated character illustration — replace with SLP/speech therapy themed image generated via Gemini (Nano Banana Pro)
2. The Google OAuth button in the custom sign-in card doesn't work — Clerk configuration needs fixing
3. Two marketing nav links point to protected routes that bounce unauthenticated users to sign-in
4. "Learn" nav item points to `/explore` — create a dedicated `/learn` page with SLP educational content

---

## Item 1: Sign-In Art Panel Image

### Generate image

Use the existing `scripts/generate_image.py` with Gemini `gemini-3-pro-image-preview`.

**Prompt:**
```
A warm, flat editorial illustration of a young child and a speech-language pathologist
sitting together at a small table, working with colorful AAC picture communication cards.
Cozy therapy room setting. Warm color palette: teal (#00595c) and terracotta (#c96834)
tones with soft off-white. Flat illustration style, editorial quality, no photorealism.
Clean composition, child-friendly. Minimal background detail. Characters face each other
with connection and warmth.
```

**Command:**
```bash
export $(grep -v '^#' ~/Documents/Life\ Management/.env | xargs)
python scripts/generate_image.py \
  "A warm, flat editorial illustration of a young child and a speech-language pathologist sitting together at a small table, working with colorful AAC picture communication cards. Cozy therapy room setting. Warm color palette: teal and terracotta tones with soft off-white. Flat illustration style, editorial quality, no photorealism. Clean composition, child-friendly. Characters face each other with connection and warmth." \
  -a 3:4 \
  -s 2K \
  -o /Users/desha/Springfield-Vibeathon/public/bridges-auth-slp.png
```

### Update auth-art-panel.tsx

**File:** `src/features/auth/components/auth-art-panel.tsx`

Change image src from `/bridges-auth-editorial.svg` to `/bridges-auth-slp.png`.

```tsx
export function AuthArtPanel() {
  return (
    <div className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] bg-[#c96834] lg:block">
      <img
        src="/bridges-auth-slp.png"
        alt="Speech therapist working with a child using communication cards"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
```

---

## Item 2: Google OAuth Button

### Root cause

The production site renders Clerk's **default hosted UI** (not the custom `claude-sign-in-card.tsx`). This indicates either:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in Vercel is a **test/dev key** (`pk_test_*`) — dev keys render Clerk's default UI
- Google OAuth is not enabled in the Clerk Dashboard under Social Connections

The custom sign-in card's `handleGoogle` implementation is already correct — it calls `signIn.create({ strategy: "oauth_google" })`. No code change needed.

### Fix steps (Clerk Dashboard + Vercel — not code changes)

1. **Clerk Dashboard** → User & Authentication → Social Connections → Enable **Google**
2. **Vercel** → Project Settings → Environment Variables → verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for Production is `pk_live_*` (not `pk_test_*`)
3. If using a test key in production: upgrade Clerk to production mode and swap the key
4. Redeploy after updating env vars

> Note: If the key IS already `pk_live_*` and the default UI is still showing, check that `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` is set in Vercel env vars — this tells Clerk to use the custom page.

---

## Item 3: Marketing Nav Routing Fixes

### Current issues

| Label | Current href | Problem |
|-------|-------------|---------|
| Platform | `/builder` | Protected route — bounces unauthenticated users to sign-in |
| Solutions | `/library?tab=templates` | Protected route — same issue |
| Learn | `/explore` | Will move to `/learn` once created |

### Fix

**File:** `src/shared/components/marketing-header.tsx`

Update `navLinks` array:

```typescript
const navLinks = [
  { href: "/demo-tools", label: "Meet Bridges" },
  { href: "/demo-tools", label: "Platform" },     // was /builder (protected)
  { href: "/explore", label: "Solutions" },         // was /library?tab=templates (protected)
  { href: "/pricing", label: "Pricing" },
  { href: "/learn", label: "Learn" },               // was /explore
];
```

Result:
- **Platform** → `/demo-tools` (public, shows the AI builder in action)
- **Solutions** → `/explore` (public, shows pre-built therapy app demos)
- **Learn** → `/learn` (new educational page)

> "Meet Bridges" and "Platform" both pointing to `/demo-tools` is intentional — they describe the same thing from different angles. Consider collapsing to one or renaming one later.

---

## Item 4: Learn Page

### Create route

**New file:** `src/app/(marketing)/learn/page.tsx`

```typescript
import { LearnPage } from "@/features/learn/components/learn-page";

export const metadata = {
  title: "Learn About Speech Therapy — Bridges",
  description:
    "Understand speech-language pathology, AAC, and how Bridges helps SLPs and families support kids with communication differences.",
};

export default function Page() {
  return <LearnPage />;
}
```

### Create feature slice

**New directory:** `src/features/learn/components/`

**`learn-page.tsx`** — top-level page component composed of sections:
- `LearnHero` — headline + subhead about speech therapy
- `WhatIsSpeechTherapy` — explain SLP role, who it helps, what sessions look like
- `HowBridgesHelps` — connect SLP workflow to Bridges features
- `TherapyApproaches` — cards for AAC, core vocabulary, PECS, social narratives
- `ForParents` — guidance for caregivers supporting speech goals at home
- `LearnCta` — CTA to try Bridges or book a demo

### Design spec

- Follow Bridges design system: Fraunces display font, Instrument Sans body, teal primary, warm canvas `#F6F3EE`
- Section rhythm: alternating `bg-canvas` / `bg-surface` backgrounds (no 1px borders)
- Therapy approach cards: teal-subtle badges, icon + heading + 2-line description
- Mobile-first, `md:` breakpoints for multi-column layouts
- No stock photos — use icons or simple illustrations consistent with the app

---

## Critical Files

| File | Change |
|------|--------|
| `src/features/auth/components/auth-art-panel.tsx` | Update image src to `/bridges-auth-slp.png` |
| `src/shared/components/marketing-header.tsx` | Fix 3 nav link hrefs |
| `src/app/(marketing)/learn/page.tsx` | **Create** — new route |
| `src/features/learn/components/learn-page.tsx` | **Create** — page component |
| `src/features/learn/components/*.tsx` | **Create** — section components |
| `public/bridges-auth-slp.png` | **Generate** via Gemini script |

---

## Verification

1. **Image**: Run the Gemini script, confirm `public/bridges-auth-slp.png` exists, open `localhost:3000/sign-in` and verify the art panel shows the new image
2. **Google OAuth**: Open Clerk Dashboard, confirm Google is toggled ON; open Vercel, confirm `pk_live_*` key; test "Continue with Google" flow end-to-end
3. **Nav routing**: Open `localhost:3000`, click each nav link — Platform, Solutions, Learn — confirm they land on public pages without redirecting to sign-in
4. **Learn page**: Open `localhost:3000/learn`, verify all sections render, check mobile at 375px width
