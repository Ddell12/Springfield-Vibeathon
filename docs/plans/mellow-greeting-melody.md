# Plan: Post-AI-Build Toast + Preview Device Frame Toggle

**Context:** Plan 1 verification found two spec items from §1-§2 that were not implemented. This plan adds both.

---

## Gap 1: Post-AI-Build Toast

**Spec:** After AI builds a tool, show toast: "Built a Token Board — looks wrong? Change type ↓"

**Approach:** Call `toast()` from `sonner` just before `router.push()` in `handleBuildIt`. Sonner toasts survive Next.js App Router navigations (mounted at root level in `src/app/layout.tsx`), so the toast will appear on the editor page.

**Files:**
- `src/features/tools/components/entry/tool-entry-page.tsx`

**Change:** After destructuring `{ templateType, configJson, suggestedTitle }` from the API response and before `router.push()`, add:
```typescript
import { toast } from "sonner";

// in handleBuildIt, after getting the API response:
const friendlyType = registration?.meta.name ?? templateType;
toast.success(`Built a ${friendlyType}`, {
  description: "Looks wrong? You can change the type in the editor.",
  duration: 5000,
});
router.push(`/tools/${id as Id<"app_instances">}`);
```

Use `templateRegistry[templateType]?.meta.name` to get the friendly name (e.g. "Token Board" not "token_board"). Fall back to raw `templateType` if registry lookup fails.

**No toast for quick-start path** — quick-start skips AI entirely, toast is only for the AI creation path.

**Test:** Add one test to `tool-entry-page.test.tsx` verifying `toast.success` is called with a string containing the template name after a successful AI build. Mock `sonner` with `vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))`.

---

## Gap 2: Device Frame Toggle in PreviewPanel

**Spec:** Device toggle (tablet / phone) in the preview panel. Most children use iPads; some parents use phones.

**Files:**
- `src/features/tools/components/builder/preview-panel.tsx`

**Approach:** Add local state for device frame. Two toggle buttons in the preview header strip (where "Preview" label and fullscreen buttons live). Toggle changes the max-width of the preview container.

**Device widths:**
- **Tablet** (default): `max-w-[768px]` — iPad width
- **Phone**: `max-w-[390px]` — iPhone 14 width

**Implementation:**
```typescript
const [device, setDevice] = useState<"tablet" | "phone">("tablet");

// In the preview header bar, add toggle buttons:
<button onClick={() => setDevice("tablet")} aria-pressed={device === "tablet"}>
  Tablet
</button>
<button onClick={() => setDevice("phone")} aria-pressed={device === "phone"}>
  Phone
</button>

// Container class:
<div className={cn("mx-auto", device === "tablet" ? "max-w-[768px]" : "max-w-[390px]")}>
```

Use Lucide `Tablet` and `Smartphone` icons. Style the active button with `text-primary` / `bg-primary/10`, inactive with `text-muted-foreground`. These are small icon buttons, not full-width.

**No tests needed** — purely local UI state, covered by type-check.

---

## File Map

**Modify:**
- `src/features/tools/components/entry/tool-entry-page.tsx` — add toast call in `handleBuildIt`
- `src/features/tools/components/entry/__tests__/tool-entry-page.test.tsx` — add toast test
- `src/features/tools/components/builder/preview-panel.tsx` — add device toggle state + buttons

---

## Verification

1. `npm test -- --run src/features/tools/components/entry/__tests__/tool-entry-page.test.tsx` — all tests pass including new toast test
2. `npx tsc --noEmit` — no errors
3. Navigate to `/tools/new`, type a description, click "Build it" — toast appears on the editor page with template name
4. In the editor preview panel, verify Tablet/Phone toggle buttons appear in the header; clicking Phone narrows the preview to ~390px; clicking Tablet widens it back
