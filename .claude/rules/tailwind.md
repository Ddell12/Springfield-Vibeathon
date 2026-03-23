# Tailwind v4 Rules

## Core Approach

- Utility-first: compose utilities in JSX `className` rather than writing custom CSS.
- Avoid creating custom CSS classes for single-use styling — use utilities directly.
- Extract reusable multi-utility combos via component abstraction, not `@apply`.

## v4 Syntax Changes

- Configuration is done in CSS via `@theme` inside the main CSS file — no `tailwind.config.js` required.
- Import Tailwind with `@import "tailwindcss"` at the top of your global CSS file.
- Custom tokens: define in `@theme { --color-brand: oklch(60% 0.2 240); }`.
- Utility values reference CSS custom properties: `bg-brand`, `text-brand`.
- `@layer` is still supported: `@layer base`, `@layer components`, `@layer utilities`.

## Responsive Design

- Mobile-first: base styles apply to all sizes; breakpoint prefixes apply at that width and above.
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px), `2xl:` (1536px).
- Never write separate media query CSS blocks — always use responsive prefixes.

## Dark Mode

- Use `dark:` prefix variant for dark mode styles.
- Configure via CSS: add `.dark` class to `<html>` for class-based toggling (default in v4).
- Pair every background color with a `dark:` equivalent; same for text and border colors.

## Common Patterns

- Spacing: use the spacing scale (`p-4`, `m-2`, `gap-6`) — avoid arbitrary values unless necessary.
- Arbitrary values: `w-[340px]`, `bg-[#ff5500]` — use sparingly and only when scale values don't fit.
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` for page-width content.
- Flex layouts: `flex items-center gap-4` for rows; `flex flex-col gap-2` for stacks.
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` for responsive card grids.
- Truncation: `truncate` for single-line overflow; `line-clamp-2` for multi-line.

## Do Not

- Do not use inline `style={{}}` for values that have Tailwind equivalents.
- Do not mix Tailwind with a separate CSS framework (Bootstrap, Bulma).
- Do not use `!important` — increase specificity through component structure instead.
