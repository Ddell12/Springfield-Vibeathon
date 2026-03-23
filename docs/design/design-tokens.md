# Design Tokens — Bridges

## Tailwind v4 Theme Config

Paste this into `src/app/globals.css`:

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');

@theme {
  --color-primary: #0D7377;
  --color-primary-hover: #0A5C5F;
  --color-primary-light: #E6F3F3;
  --color-secondary: #5B5FC7;
  --color-secondary-hover: #4A4EB0;
  --color-background: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F5F5F5;
  --color-foreground: #1A1A1A;
  --color-muted: #6B7280;
  --color-border: #E5E7EB;
  --color-border-strong: #D1D5DB;
  --color-success: #059669;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #2563EB;

  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius: 8px;
  --radius-xl: 16px;
}
```

## Color Reference

| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#0D7377` | Actions, links, active states |
| primary-hover | `#0A5C5F` | Hover on primary |
| primary-light | `#E6F3F3` | Subtle primary backgrounds |
| secondary | `#5B5FC7` | Accent elements |
| background | `#FAFAFA` | Page background |
| surface | `#FFFFFF` | Cards, panels |
| surface-raised | `#F5F5F5` | Elevated surfaces |
| foreground | `#1A1A1A` | Primary text |
| muted | `#6B7280` | Secondary text, placeholders |
| border | `#E5E7EB` | Borders, dividers |
| success | `#059669` | Positive states |
| warning | `#D97706` | Caution |
| error | `#DC2626` | Errors |

## Typography

- Heading + Body: Inter (400, 500, 600, 700)
- Mono: JetBrains Mono (400) — minimal use

## Spacing

4px base unit. Use Tailwind scale: `p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, etc.

## Component Styles

**Button Primary:** `bg-primary text-white hover:bg-primary-hover rounded-lg px-4 py-2.5 text-sm font-medium`
**Button Secondary:** `bg-surface border border-border text-foreground hover:bg-surface-raised rounded-lg px-4 py-2.5 text-sm font-medium`
**Button Ghost:** `text-primary hover:bg-primary-light rounded-lg px-4 py-2.5 text-sm font-medium`
**Card:** `bg-surface border border-border rounded-lg shadow-sm p-4`
**Input:** `bg-surface border border-border rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-primary min-h-[44px]`
**Chat User Msg:** `bg-primary text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%] ml-auto`
**Chat AI Msg:** `bg-surface-raised text-foreground rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%]`

## Layout

- Max width: `max-w-7xl` (1280px)
- Content padding: `px-4 sm:px-6 lg:px-8`
- Builder: 400px chat sidebar + fluid preview
- Mobile: stacked, chat/preview toggle
- Min tap target: 44px x 44px
- Therapy tool radius: `rounded-2xl` (16px)

## Transitions

- Fast (hover/focus): `150ms ease-out`
- Normal (content): `250ms ease-out`
- Slow (page): `300ms ease-in-out`
