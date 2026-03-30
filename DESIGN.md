# Design System — Bridges

## Product Context
- **What this is:** AI-powered therapy app builder where therapists and parents describe tools in plain language and get working interactive apps
- **Who it's for:** Speech-Language Pathologists (SLPs), ABA therapists, parents of autistic children
- **Space/industry:** Therapy tech / assistive technology / edtech, peers include Proloquo2Go, TouchChat, Spoken AAC
- **Project type:** Web app (builder + chat interface, template gallery, published app pages)

## Aesthetic Direction
- **Direction:** Warm Professional — the third lane between clinical therapy tech and toylike edtech
- **Decoration level:** Intentional — subtle warm texture on backgrounds, tonal surface shifts instead of borders. No decorative blobs, no gradients on UI elements (gradient reserved for primary CTA only).
- **Mood:** A well-organized therapy room, not a SaaS dashboard. Calm confidence. Not sterile, not playful... steady. Like a space where a therapist and a parent both feel they belong.
- **Reference sites:** AssistiveWare (Proloquo2Go), Spoken AAC, Lovable, Duolingo, Khan Academy

## Typography
- **Display/Hero:** Fraunces (variable, optical size axis + wonk axis) — soft serif that signals expertise without coldness. No SaaS product in therapy tech or AI builders uses a variable serif. Differentiator.
- **Body:** Instrument Sans — tighter than Inter, more personality than DM Sans. Excellent at 14-16px for form labels, session metadata, and dense UI text.
- **UI/Labels:** Instrument Sans at 600 weight for active states, 400 for inactive
- **Data/Tables:** Instrument Sans with tabular-nums feature enabled
- **Code/Status:** Commit Mono — for generation stream status, code display. Neutral, no ligatures.
- **Loading:** Google Fonts CDN: `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Instrument+Sans:wght@400;500;600;700&family=Commit+Mono&display=swap`
- **Scale:**
  - Display: 48px / weight 400 / line-height 1.15 / letter-spacing -0.02em
  - H2: 32px / weight 400 / line-height 1.3
  - H3: 24px / weight 500 / line-height 1.35
  - Body: 16px / weight 400 / line-height 1.6
  - UI Label: 14px / weight 600 (active) or 400 (inactive) / line-height 1.4
  - Caption: 12px / weight 400 / line-height 1.4
  - Mono: 13px / weight 400 / line-height 1.5
  - Section Label: 11px / weight 400 / letter-spacing 0.1em / uppercase / mono

## Color

### Approach: Restrained
Teal primary (proven calming/therapeutic association), warm neutral surfaces, warm grays for text. No cool grays anywhere. One accent color, no gradients on interactive elements except the primary CTA.

### Light Mode
```css
/* Surfaces */
--bg-canvas: #F6F3EE;          /* warm off-white, like unbleached paper */
--bg-surface: #FFFFFF;          /* cards and panels */
--bg-surface-raised: #FAF8F5;  /* hover states, nested containers */
--bg-recessed: #EDEAE4;        /* sidebar, secondary zones */

/* Text */
--text-primary: #1A1917;       /* near-black with warm undertone */
--text-secondary: #6B6560;     /* muted warm gray */
--text-tertiary: #9C9590;      /* placeholders, timestamps */

/* Primary — teal */
--teal-primary: #00595c;
--teal-hover: #0d7377;
--teal-subtle: #e6f2f2;        /* badges, tags, soft indicators */

/* Semantic */
--success: #3B7A57;            /* forest green */
--caution: #C49A2A;            /* aged gold */
--danger: #B8433A;             /* brick red */
--info: #00595c;               /* teal */

/* Borders */
--border-default: #E2DED8;     /* warm, visible but not harsh */
--border-focus: #00595c;       /* accent ring on focus */
```

### Dark Mode
Reduce saturation 10-20%, warm up surfaces, maintain contrast ratios.
```css
--bg-canvas: #1A1917;
--bg-surface: #252320;
--bg-surface-raised: #2D2B28;
--bg-recessed: #141311;
--text-primary: #F0ECE6;
--text-secondary: #A39E98;
--text-tertiary: #6B6560;
--teal-primary: #4DB8BB;
--teal-hover: #6DCACD;
--teal-subtle: #1a3233;
--border-default: #3A3734;
--border-focus: #4DB8BB;
```

### Primary CTA Gradient
The only gradient in the system. Reserved for the primary call-to-action button.
```css
background: linear-gradient(135deg, #00595c 0%, #0d7377 100%);
```

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — therapy users need generous tap targets, autistic users benefit from breathing room
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Grid-disciplined for the app (builder, templates, my-apps), asymmetric editorial for landing/marketing pages
- **Grid:** 1 column mobile, 2 columns tablet, 3 columns desktop for template gallery. Builder: fixed 360px chat panel + fluid preview.
- **Max content width:** 1120px
- **Border radius:** sm: 4px, md: 6px (inputs/buttons), lg: 8px (cards), xl: 12px (modals/dialogs), full: 9999px (pills/avatars)

### Builder Layout
```
[Chat panel: 360px fixed] | [Live preview: fluid, full remaining width]
                          | [Status bar: single mono line, bottom edge]
```
Chat panel has no header chrome. Messages flow top to bottom with pinned input at bottom. Preview takes all remaining space. No tabs, no file tree, no settings panel visible by default. Generation status is a single monospace line: `writing App.tsx · 47 lines · 3.2s`

### Landing Page Composition
First viewport is a poster, not a document. Headline + input prompt left-of-center at optical center. Ghosted template previews at 40% opacity bleeding off right edge. Sign-in bottom-left, small. The input field IS the product demo.

## Motion
- **Approach:** Minimal-functional — transitions aid comprehension only. No choreography, no scroll-driven animations. Autistic users can be motion-sensitive; restraint is respect.
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1) for all transitions (the existing --ease-sanctuary)
- **Duration:** micro: 50-100ms (toggles, hover) / short: 150-250ms (dropdowns, tooltips) / medium: 300-400ms (page transitions, modals) / long: 400-700ms (only for celebration moments like token earn animations)
- **Minimum duration:** 300ms for any transition users notice

## Anti-Patterns (never use)
- Purple/violet gradients as default accent
- 3-column icon grids with colored circles ("Features" sections)
- Centered everything with uniform spacing
- Uniform bubbly border-radius on all elements
- Inline `style={{}}` when Tailwind has an equivalent
- Cool grays (use warm grays only)
- Decorative blobs or abstract shapes
- Hero images or stock photos on landing page

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Initial design system created | Created by /design-consultation with competitive research (Proloquo2Go, Spoken AAC, Lovable, Duolingo, Khan Academy) + independent Claude design voice. Key insight: therapy tech is clinical or toylike, AI builders are dev-facing. Bridges occupies the "warm professional" third lane. |
| 2026-03-29 | Fraunces over Manrope for display | Variable serif differentiates from every SaaS product using geometric sans. Signals expertise without coldness. |
| 2026-03-29 | Instrument Sans over Inter for body | Tighter, more personality, better at 14-16px dense UI. Inter is overused. |
| 2026-03-29 | Warm canvas (#F6F3EE) over pure white | Creates material paper-like quality. Breaks from clinical white and dark-mode-first dev tools. Inspired by Reggio Emilia therapy environments. |
| 2026-03-29 | Kept teal primary (#00595c) | Proven calming/therapeutic association. Strong accessibility contrast. Already established in the codebase. |
| 2026-03-29 | Minimal-functional motion | Autistic users can be motion-sensitive. Restraint communicates respect. Only celebration moments (token animations) get expressive motion. |
