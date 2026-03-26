# Plan: Migrate Lucide Icons to Material Symbols + Fix Off-System Colors

## Context

The Bridges design system ("The Digital Sanctuary") mandates **Material Symbols Outlined** for all icons and a strict color token palette defined in `globals.css`. A `MaterialIcon` component already exists at `src/shared/components/material-icon.tsx` and the font is loaded in `layout.tsx`. However, **20 source files** still import Lucide React icons, and **6 files** use hardcoded hex colors or raw Tailwind palette colors (`bg-orange-600`, `bg-green-600`, `bg-slate-800`, etc.) instead of design tokens.

After completing all changes, the browser will be used to visually verify each page.

---

## Step 1: Extend MaterialIcon Sizes

**File:** `src/shared/components/material-icon.tsx`

Add `"xs"` and `"2xl"` to the size map for full coverage of Lucide size equivalents:
```ts
const sizeMap = { xs: "text-base", sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-4xl", "2xl": "text-7xl" };
```
- `xs` (16px) — replaces Lucide `size={14}`/`h-3.5 w-3.5` for small inline indicators
- `2xl` (64px) — replaces Lucide `h-16 w-16` for decorative template card icons

---

## Step 2: Migrate `navigation.ts` + Its Consumer

**Files:**
- `src/shared/lib/navigation.ts` — Change icon field from Lucide component refs to Material Symbols string names
- `src/shared/components/mobile-nav-drawer.tsx` — Switch from `<Icon size={22}/>` to `<MaterialIcon icon={item.icon}/>`

**Icon mapping:**
| Lucide | Material Symbol |
|--------|----------------|
| `Home` | `"home"` |
| `Sparkles` | `"auto_awesome"` |
| `LayoutGrid` | `"grid_view"` |
| `FolderOpen` | `"folder_open"` |

**mobile-nav-drawer.tsx also fixes:**
- `Plus` -> `MaterialIcon icon="add"`
- `X` -> `MaterialIcon icon="close"`
- `bg-orange-600` (avatar, line 61) -> `bg-tertiary`

---

## Step 3: Migrate Shared Components

| File | Lucide Icons | Material Equivalents | Extra Fixes |
|------|-------------|---------------------|-------------|
| `src/shared/components/header.tsx` | `Menu` | `menu` | Remove `border-b border-border` (No-Line Rule) |
| `src/shared/components/marketing-header.tsx` | `Menu` | `menu` | — |
| `src/shared/components/empty-state.tsx` | `AlertCircle, Blocks, FileX, Plus, Users` | `error, widgets, description_off, add, group` | Refactor `VARIANT_CONFIG` icon fields from component refs to strings |

---

## Step 4: Migrate Builder Feature (7 files)

| File | Changes |
|------|---------|
| `chat-panel.tsx` | 7 Lucide icons + **6 color fixes**: `text-amber-500`->`text-tertiary`, `text-green-600`->`text-primary`, `bg-green-50`->`bg-primary/5`, `bg-green-600`->`bg-primary`, `text-green-700`->`text-primary` |
| `code-panel.tsx` | `Copy`->`content_copy`, `Download`->`download`, `Loader2`->`progress_activity`, `X`->`close` |
| `preview-panel.tsx` | `Loader2`->`progress_activity`, `Sparkles`->`auto_awesome` |
| `builder-toolbar.tsx` | `ArrowLeft`->`arrow_back`, `Globe`->`language`, `Loader2`->`progress_activity`, `Monitor`->`desktop_windows`, `Share2`->`share`, `Smartphone`->`smartphone` |
| `delete-confirmation-dialog.tsx` | `AlertTriangle`->`warning` |
| `blueprint-card.tsx` | `Sparkles`->`auto_awesome` |
| `code-drawer.tsx` | `ChevronRight`->`chevron_right`, `File`->`description`, `Folder`->`folder`, `Search`->`search`, `X`->`close` |
| `publish-success-modal.tsx` | `Check`->`check`, `Copy`->`content_copy`, `ExternalLink`->`open_in_new`, `Link`->`link`, `QrCode`->`qr_code`, `Share2`->`share` |

**Sizing strategy:** Lucide `h-4 w-4` -> `size="xs"`, `h-3.5 w-3.5` -> `className="text-sm"`, `size={20-24}` -> `size="md"`, `h-6 w-6` -> `size="md"`

---

## Step 5: Migrate Remaining Features (8 files)

| File | Icon Changes | Color Fixes |
|------|-------------|-------------|
| `dashboard/main-prompt-input.tsx` | `Send`->`send` | — |
| `dashboard/dashboard-view.tsx` | `Bell`->`notifications`, `HelpCircle`->`help`, `Menu`->`menu`, `Sparkles`->`auto_awesome` | `bg-orange-600`->`bg-tertiary` (avatar) |
| `templates/templates-page.tsx` | `BookOpen`->`menu_book`, `MessageSquare`->`chat`, `Star`->`star`, `Sun`->`light_mode` | 3 hardcoded hex gradients -> `from-tertiary to-tertiary-container`, `from-tertiary-fixed-dim to-tertiary-fixed`, `from-secondary to-secondary-container` |
| `sharing/share-dialog.tsx` | `Copy`->`content_copy`, `Share2`->`share`, `X`->`close` | — |
| `settings/settings-sidebar.tsx` | `ArrowLeft`->`arrow_back`, `Palette`->`palette`, `Shield`->`shield`, `User`->`person` | Remove `border-l-4 border-primary` (No-Line Rule) |
| `settings/settings-page.tsx` | `ArrowLeft`->`arrow_back`, `ChevronDown`->`expand_more` | — |
| `settings/account-section.tsx` | `AlertTriangle`->`warning` | — |
| `settings/profile-section.tsx` | — (no Lucide) | `bg-orange-600`->`bg-tertiary`, inline SVG chevron -> `<MaterialIcon icon="expand_more">` |
| `settings/appearance-section.tsx` | — (no Lucide) | `bg-slate-800`->`bg-inverse-surface`, `bg-slate-700`->`bg-outline` |

---

## Step 6: Minor Violations

| File | Fix |
|------|-----|
| `landing/close-the-gap-hero.tsx` line 24 | `&#9679;` -> `<MaterialIcon icon="circle" size="xs" />` |
| `landing/close-the-gap-hero.tsx` line 64 | `&#8594;` -> `<MaterialIcon icon="arrow_forward" size="sm" />` |

---

## Step 7: Update Test Mocks

Tests that mock `lucide-react` for components that no longer import it need their mocks updated. Pattern:

```ts
// Before
vi.mock("lucide-react", () => ({ Menu: (props) => <span {...props} /> }));
// After
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));
```

Check all `__tests__/` dirs in modified feature folders. Tests that already mock `MaterialIcon` (tool-card, theme-toggle, hero-section, etc.) need no changes.

---

## Files NOT to Change

- `src/shared/components/ui/*` (shadcn/ui primitives use Lucide internally)
- `e2b-templates/` (sandbox apps use Lucide by design)
- `src/features/builder/hooks/webcontainer-files.ts` (template code for AI-generated apps)
- `src/features/builder/lib/agent-prompt.ts` (AI prompt references Lucide for sandbox)

---

## Complete Icon Mapping Reference

| Lucide | Material Symbol |
|--------|----------------|
| AlertCircle | error |
| AlertTriangle | warning |
| ArrowLeft | arrow_back |
| Bell | notifications |
| Blocks | widgets |
| BookOpen | menu_book |
| Check | check |
| CheckCircle2 | check_circle |
| ChevronDown | expand_more |
| ChevronRight | chevron_right |
| Copy | content_copy |
| Download | download |
| ExternalLink | open_in_new |
| File | description |
| FileCode2 | code |
| FileX | description_off |
| Folder | folder |
| FolderOpen | folder_open |
| Globe | language |
| HelpCircle | help |
| Home | home |
| LayoutGrid | grid_view |
| Link | link |
| Loader2 | progress_activity |
| Menu | menu |
| MessageSquare | chat |
| Monitor | desktop_windows |
| Palette | palette |
| Plus | add |
| QrCode | qr_code |
| Search | search |
| Send | send |
| Share2 | share |
| Shield | shield |
| Smartphone | smartphone |
| Sparkles | auto_awesome |
| Star | star |
| Sun | light_mode |
| User | person |
| Users | group |
| Wand2 | auto_fix_high |
| X | close |

---

## Verification

After all changes:
1. Run `npx vitest run` — all 252+ tests must pass
2. Use `agent-browser` to screenshot and visually verify each page:
   - `/` (landing) — MaterialIcon icons in hero, how-it-works, CTA
   - `/dashboard` — Material menu/bell/help icons, no orange avatars, teal tertiary avatar
   - `/builder` — Material icons in toolbar, chat panel; progress steps use primary not green
   - `/templates` — Design system gradient colors, Material decorative icons on cards
   - `/settings` — Material sidebar icons, no orange avatar, no border-l-4, no slate colors
   - `/my-tools` — Material icons in empty/populated states
3. Confirm zero `lucide-react` imports in `src/` (excluding `ui/` and noted exceptions)
