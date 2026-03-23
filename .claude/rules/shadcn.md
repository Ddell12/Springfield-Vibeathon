# shadcn/ui Rules

## Installation

- Add components via CLI: `npx shadcn@latest add <component-name>`.
- Components are copied into `components/ui/` — they are your code, not a dependency.
- Do not install `shadcn-ui` as an npm package; always use the CLI workflow.
- Required peer dependencies: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.

## Composition

- shadcn/ui components are primitives — compose them to build complex UI.
- Use the exported sub-components (e.g., `Card`, `CardHeader`, `CardContent`, `CardFooter`) rather than nesting raw divs inside a component.
- Extend with `className` prop using `cn()` helper (re-exported from `lib/utils.ts`).
- Always use `cn()` to merge class names — never template-literal concatenation.

```tsx
import { cn } from "@/lib/utils";
<Button className={cn("w-full", isLoading && "opacity-50")} />;
```

## Theming

- Colors are CSS custom properties defined in `globals.css` under `:root` and `.dark`.
- Use semantic tokens (`bg-background`, `text-foreground`, `border-border`) instead of Tailwind raw colors.
- Customise the theme by editing CSS variables, not by overriding component source.
- Radius is `--radius` CSS variable; components use `rounded-[var(--radius)]`.

## Accessibility

- All interactive components (Dialog, Sheet, Popover, DropdownMenu) include Radix UI ARIA attributes — do not strip them.
- Use `<Label>` from shadcn/ui paired with form inputs; always set `htmlFor` matching the input `id`.
- Provide descriptive `<DialogTitle>` and `<DialogDescription>` (or `<VisuallyHidden>`) for every dialog.
- Use `<Button asChild>` to render a button as a different element (e.g., `<Link>`) while keeping button styles.

## Patterns

- Forms: use `react-hook-form` + `zod` schema validation + shadcn/ui `Form` components.
- Data tables: use the shadcn/ui `DataTable` recipe with `@tanstack/react-table`.
- Toast/notifications: use `sonner` (recommended by shadcn/ui) via `<Toaster>` in root layout.
- Sheet for slide-over panels; Dialog for modal confirmations; Popover for inline overlays.
- Never create a custom modal from scratch — always compose from Dialog or Sheet.
