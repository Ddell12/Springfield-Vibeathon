# shadcn/ui + Tailwind CSS v4

Last updated: 2026-03-06

---

## shadcn/ui

### Quick Reference

- **Not a package.** Components copied into `components/ui/` via `npx shadcn@latest add <name>`.
- **Required peer deps:** `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
- **Class merging:** Always use `cn()` from `lib/utils.ts`. Never template-literal concatenation.
- **Theming:** CSS custom properties in `globals.css` (`:root` / `.dark`). Semantic tokens: `bg-background`, `text-foreground`, `border-border`. Customize via CSS vars, not component source.
- **Toast:** `sonner` via `<Toaster>` in root layout.
- **Forms:** `react-hook-form` + `zod` + shadcn `Form` components.
- **Data tables:** shadcn `DataTable` recipe with `@tanstack/react-table`.

### Best Practices

- Use sub-components (`Card`, `CardHeader`, `CardContent`, `CardFooter`), not raw divs.
- Never create custom modals. Compose from `Dialog`, `Sheet`, or `Drawer`.
- `<Button asChild>` to render as a different element (e.g., `<Link>`) with button styles.
- Responsive Dialog/Drawer: `Dialog` on desktop, `Drawer` on mobile via `useMediaQuery`.
- Always pair `<Label>` with inputs via `htmlFor`/`id`. Every `Dialog` needs `<DialogTitle>` + `<DialogDescription>`.
- CSS hover states (`group` + `group-hover`) over React state for hover effects.

### Known Gotchas

1. **Components are mutable code.** CLI updates may overwrite customizations.
2. **`cn()` is required.** String concat doesn't handle Tailwind class conflicts.
3. **Dialog without description** → console warning + a11y violation. Use `<VisuallyHidden>` if no visible description.
4. **`Select` controlled mode:** `value` + `onValueChange`, not `onChange`.
5. **`asChild`:** child must accept and forward all props including `ref` (needs `forwardRef`).
6. **Sheet/Dialog z-index stacking.** Test overlay nesting carefully.

### Common Plan Mistakes

- Installing as npm package (there is no `shadcn-ui` package — use CLI).
- Overriding component source for theming (edit CSS vars instead).
- Creating custom modal/drawer (compose from Dialog/Sheet).
- Using raw Tailwind colors (`bg-white`) instead of semantic tokens (`bg-background`).

---

## Tailwind CSS v4

### Key v3→v4 Changes

| v3                                    | v4                                              |
| ------------------------------------- | ----------------------------------------------- |
| `tailwind.config.js`                  | `@theme { }` block in CSS                       |
| `@tailwind base/components/utilities` | `@import "tailwindcss"`                         |
| `theme.extend.colors` in JS           | `@theme { --color-brand: oklch(60% 0.2 240); }` |
| `bg-opacity-50`                       | Removed. Use `bg-black/50`                      |
| `flex-shrink-0`                       | `shrink-0` (alias removed)                      |
| Default `border` color: `gray-200`    | Default: `currentColor`                         |
| Default `ring`: 3px blue-500          | Default: 1px currentColor                       |
| PostCSS plugin: `tailwindcss`         | `@tailwindcss/postcss`                          |
| Content paths in config               | Auto-detected                                   |

### Known Gotchas

1. **Border color default changed.** Must add explicit `border-gray-200` everywhere.
2. **Ring defaults changed.** `ring` = 1px currentColor. Need `ring-3 ring-blue-500` for v3 behavior.
3. **Removed opacity utilities.** Use slash syntax: `bg-black/50`, `text-white/75`.
4. **`theme()` function deprecated.** Use `var(--color-blue-500)`.
5. **PostCSS plugin renamed.** `tailwindcss` → `@tailwindcss/postcss`.
6. **`@theme` is top-level only.** Cannot nest inside selectors/media queries.
7. **Third-party v3 plugins may not work in v4.** Check compatibility.

### Common Plan Mistakes

- Keeping `tailwind.config.js` (delete it — config goes in CSS).
- Using `@tailwind` directives (use `@import "tailwindcss"`).
- Using `bg-opacity-*` utilities (use slash syntax).
- Assuming border/ring defaults match v3.
- Using `!important` (increase specificity via structure).
- Using inline `style={{}}` for Tailwind-equivalent values.

---

Sources: [shadcn/ui Docs](https://ui.shadcn.com/docs), [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4), [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
