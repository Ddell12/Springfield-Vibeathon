# Design Tokens — Bridges

> **Source of truth:** `DESIGN.md` (project root). This file is a quick-reference extraction.
> **Implementation:** `src/app/globals.css` (Tailwind v4 `@theme` block, all values in OKLCH).

## Tailwind v4 Theme Reference

Defined in `src/app/globals.css` via `@theme`. All colors use OKLCH for Tailwind v4 opacity modifier support.

```css
/* Font loading — add to layout <head> or CSS @import */
https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Instrument+Sans:wght@400;500;600;700&family=Commit+Mono&display=swap
```

## Color Reference

### Surfaces — Warm Linen Palette
| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| background / surface-container | `#F6F3EE` | `oklch(0.965 0.007 81)` | Canvas — warm off-white |
| surface | `#FFFFFF` | `oklch(1 0 0)` | Cards, panels |
| surface-bright / surface-container-low | `#FAF8F5` | `oklch(0.980 0.004 78)` | Hover states, raised containers |
| surface-dim / secondary-container | `#EDEAE4` | `oklch(0.938 0.009 85)` | Sidebar, recessed zones |

### Text — Warm Grays (no cool grays)
| Token | Hex | Usage |
|-------|-----|-------|
| on-surface / foreground | `#1A1917` | Primary text — warm near-black |
| on-surface-variant / muted | `#6B6560` | Secondary text, labels |
| outline | `#9C9590` | Placeholders, timestamps, tertiary text |

### Primary — Teal (calming, therapeutic)
| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#00595c` | Actions, links, active states |
| primary-container | `#0d7377` | Hover, gradient end |
| primary-fixed / on-primary-container | `#e6f2f2` | Badges, tags, soft indicators (teal-subtle) |

### Primary CTA Gradient
The **only** gradient in the system. Reserved for the primary call-to-action button.
```css
background: linear-gradient(135deg, #00595c 0%, #0d7377 100%);
/* In OKLCH: */
background: linear-gradient(135deg, oklch(0.352 0.055 192) 0%, oklch(0.441 0.063 190) 100%);
```

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| success | `#3B7A57` | Forest green — positive states |
| caution / tertiary | `#C49A2A` | Aged gold — warnings |
| error / destructive | `#B8433A` | Brick red — errors, danger |
| info | `#00595c` | Teal (same as primary) |

### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| outline-variant / border | `#E2DED8` | Warm, visible but not harsh |
| ring | `#00595c` | Focus ring (teal primary) |

## Typography

| Role | Font | Weight | Size | Line-height | Notes |
|------|------|--------|------|-------------|-------|
| Display/Hero | Fraunces (variable serif) | 400 | 48px | 1.15 | letter-spacing -0.02em, optical size + wonk axes |
| H2 | Fraunces | 400 | 32px | 1.3 | |
| H3 | Instrument Sans | 500 | 24px | 1.35 | |
| Body | Instrument Sans | 400 | 16px | 1.6 | |
| UI Label | Instrument Sans | 600 (active) / 400 (inactive) | 14px | 1.4 | |
| Caption | Instrument Sans | 400 | 12px | 1.4 | |
| Mono/Status | Commit Mono | 400 | 13px | 1.5 | No ligatures |
| Section Label | Commit Mono | 400 | 11px | — | letter-spacing 0.1em, uppercase |

**CSS custom properties:**
```css
--font-headline: 'Fraunces', Georgia, serif;
--font-body: 'Instrument Sans', system-ui, sans-serif;
--font-mono: 'Commit Mono', monospace;
```

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable — generous tap targets for therapy users, breathing room for autistic users
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Min tap target:** 44px x 44px

## Border Radius

```css
--radius-sm: 4px;   /* small elements */
--radius: 6px;      /* inputs, buttons */
--radius-lg: 8px;   /* cards */
--radius-xl: 12px;  /* modals, dialogs */
/* full: 9999px — pills, avatars */
```

## Layout

- **Max content width:** 1120px (`max-w-5xl` or custom)
- **Content padding:** `px-4 sm:px-6 lg:px-8`
- **Builder:** 360px fixed chat panel + fluid preview
- **Template grid:** 1 col mobile, 2 col tablet, 3 col desktop
- **Mobile builder:** stacked, chat/preview toggle

## Motion

- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (aliased as `--ease-sanctuary`)
- **Micro (toggles, hover):** 50-100ms
- **Short (dropdowns, tooltips):** 150-250ms
- **Medium (page transitions, modals):** 300-400ms
- **Long (celebration only):** 400-700ms
- **Minimum noticeable duration:** 300ms
- **Principle:** Minimal-functional. Autistic users can be motion-sensitive. `prefers-reduced-motion` is respected globally.

## Component Patterns

**Button Primary (CTA):** `bg-primary-gradient text-on-primary rounded-md px-4 py-2.5 text-sm font-medium`
**Button Secondary:** `bg-surface border border-border text-foreground hover:bg-surface-bright rounded-md px-4 py-2.5 text-sm font-medium`
**Button Ghost:** `text-primary hover:bg-on-primary-container rounded-md px-4 py-2.5 text-sm font-medium`
**Card:** `bg-surface border border-border rounded-lg shadow-sm p-4`
**Input:** `bg-surface border border-border rounded-md px-3 py-2.5 text-base focus:ring-2 focus:ring-ring min-h-[44px]`

## Anti-Patterns (never use)

- Purple/violet gradients as default accent
- 3-column icon grids with colored circles
- Centered everything with uniform spacing
- Uniform bubbly border-radius on all elements
- Cool grays (use warm grays only)
- Decorative blobs or abstract shapes
- Hero images or stock photos on landing page
- Inline `style={{}}` when Tailwind has an equivalent
- Gradients on UI elements (gradient reserved for primary CTA only)
- 1px borders for sectioning (use tonal background shifts instead)
