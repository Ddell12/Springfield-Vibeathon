# Non-Technical UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Bridges feel purpose-built for non-technical therapists and parents by stripping developer-facing UI, removing broken stub buttons, and adding only the Lovable features that serve a non-technical workflow.

**Architecture:** Two-phase approach — Phase A removes developer jargon and dead UI (stub buttons, code view, dev labels). Phase B adds four polish features filtered through a "would a therapist use this?" lens: responsive preview (iPads in clinics), simple undo (recover from a bad prompt), dark mode (accessibility), and message persistence (return to a tool later). No new packages except `next-themes` (already installed).

**Tech Stack:** Next.js App Router, Tailwind v4, Convex (schema + mutations), next-themes (installed), motion (animations)

---

## File Structure

### Files to Modify
| File | Responsibility | Changes |
|------|---------------|---------|
| `src/features/builder-v2/components/builder-header.tsx` | Top bar with project name + actions | Remove 5 stub view toggles, remove "Publish" stub, rename download title, add responsive breakpoint picker + undo button + dark mode toggle |
| `src/features/builder-v2/components/chat-input.tsx` | Text input for chat | Remove 4 stub buttons (+, Visual edits, Chat, mic), remove commented notification banner |
| `src/features/builder-v2/components/preview.tsx` | Preview panel | Remove Code tab + code view mode, add responsive width + device frame, accept breakpoint + undo props |
| `src/features/builder-v2/components/fragment-web.tsx` | iframe wrapper | Accept width prop for responsive sizing |
| `src/features/builder-v2/components/file-progress.tsx` | Build progress steps | Fix "Writing component code" → "Creating your tool" |
| `src/features/builder-v2/components/chat.tsx` | Chat conversation + API calls | Add onMessagesChange callback for persistence |
| `src/features/builder-v2/lib/prompt.ts` | System prompts for Claude | Strengthen code gen prompt for first-try usability |
| `src/app/(app)/builder/page.tsx` | Builder page orchestrator | Wire message persistence, undo/version state, responsive state, live iteration |
| `convex/schema.ts` | Database schema | Add `versions` field to projects table |
| `convex/projects.ts` | Project CRUD | Add `saveVersion` mutation, `listVersions` query |
| `src/app/globals.css` | Theme tokens | Add `.dark` class with inverted Material 3 tokens |

### Files to Create
| File | Responsibility |
|------|---------------|
| `src/shared/components/theme-toggle.tsx` | Sun/moon dark mode toggle button |
| `src/features/builder-v2/components/responsive-picker.tsx` | Phone/Tablet/Computer breakpoint buttons |

---

## Phase A: Strip Developer-Facing UI

### Task 1: Remove Stub View Toggles from Header

**Files:**
- Modify: `src/features/builder-v2/components/builder-header.tsx:34-53`

The header has 5 stub buttons (Cloud, Code, Analytics, divider, Plus) that do nothing when clicked. Non-technical users will click them, get confused, and think the app is broken. The active "Preview" button also loses meaning when it's the only option.

- [ ] **Step 1: Read the current header and verify stub buttons**

Confirm lines 34-53 contain the center view toggles section with 5 non-functional buttons + 1 Preview button.

- [ ] **Step 2: Remove the entire center view toggles section**

Replace lines 34-53 (the `{/* Center: View Toggles */}` div and everything inside) with an empty fragment or nothing. The header should only have Left (logo + breadcrumb) and Right (actions).

In `src/features/builder-v2/components/builder-header.tsx`, replace:

```tsx
      {/* Center: View Toggles */}
      <div className="hidden md:flex items-center bg-surface-container-low rounded-lg p-1 border border-surface-container-high/50">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-primary font-semibold text-sm bg-surface-container-lowest shadow-sm">
          <MaterialIcon icon="preview" size="sm" />
          Preview
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="cloud" size="sm" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="code" size="sm" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="analytics" size="sm" />
        </button>
        <div className="w-[1px] h-4 bg-surface-container-high mx-2" />
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="add" size="sm" />
        </button>
      </div>
```

With nothing (just remove the entire block).

- [ ] **Step 3: Remove "Publish" stub button**

The "Publish" button at lines 85-90 is a primary CTA with no `onClick` handler. A therapist will click it expecting something to happen and nothing will. Remove it entirely.

Replace:

```tsx
        <button
          className="flex items-center gap-2 px-4 py-1.5 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm active:scale-95 min-h-[36px]"
          type="button"
        >
          <span className="text-sm font-bold">Publish</span>
        </button>
```

With nothing.

- [ ] **Step 4: Rename download button title**

Change `title="Download Code"` (line 62) to `title="Save my tool"`. A parent doesn't think in terms of "code."

- [ ] **Step 5: Verify the header renders with only Logo, breadcrumb, Download, New, Share**

Run: `npm run build`
Expected: No build errors. Header shows: [Bridges logo] [project name pill] ... [download] [New] [Share]

- [ ] **Step 6: Commit**

```bash
git add src/features/builder-v2/components/builder-header.tsx
git commit -m "fix(ux): remove stub buttons and developer jargon from builder header

Strip 5 non-functional view toggle buttons (Cloud, Code, Analytics, divider, Plus),
remove broken Publish CTA, rename 'Download Code' to 'Save my tool'.
Non-technical users should never see buttons that don't work."
```

---

### Task 2: Simplify Chat Input

**Files:**
- Modify: `src/features/builder-v2/components/chat-input.tsx:36-86`

The chat input has 4 stub buttons that appear clickable but do nothing: `+` (no handler), "Visual edits" (no handler), "Chat" (no handler), and microphone (no handler). There's also a commented-out notification banner. For a therapist, the input should be dead simple: type + send.

- [ ] **Step 1: Remove the commented notification banner**

Delete lines 36-48 (the entire `{/* Optional Notification Toast */}` block including the `{/* ... */}` comment wrapper).

- [ ] **Step 2: Remove all stub buttons from the footer bar**

Replace the entire footer bar (lines 65-110, the `<div className="flex items-center justify-between px-1">` and everything inside) with a minimal version that only has the send/stop button on the right:

```tsx
        <div className="flex items-center justify-end px-1">
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center bg-foreground text-background hover:opacity-80 transition-opacity"
                onClick={onStop}
                type="button"
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-background" />
              </button>
            ) : (
              <button
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center bg-foreground text-background transition-opacity",
                  isDisabled ? "opacity-30 cursor-not-allowed" : "hover:opacity-80"
                )}
                onClick={handleSubmit}
                disabled={isDisabled}
                type="button"
              >
                <MaterialIcon icon="arrow_upward" size="sm" />
              </button>
            )}
          </div>
        </div>
```

This removes: `+` button, "Visual edits" button, "Chat" button, and microphone button.

- [ ] **Step 3: Verify chat input renders cleanly**

Run: `npm run build`
Expected: No build errors. Chat input shows: [textarea] [send button]. No other buttons.

- [ ] **Step 4: Commit**

```bash
git add src/features/builder-v2/components/chat-input.tsx
git commit -m "fix(ux): strip stub buttons from chat input for non-technical users

Remove +, Visual edits, Chat, and mic buttons (all had no onClick handlers).
Remove commented notification banner. Chat input is now just: type + send."
```

---

### Task 3: Remove Code View from Preview

**Files:**
- Modify: `src/features/builder-v2/components/preview.tsx:20-67`

The Preview/Code toggle exposes raw HTML source code to therapists who have no use for it. Removing it simplifies the preview to just show the interactive tool.

- [ ] **Step 1: Remove the `viewMode` state and `handleCopy` function**

Delete lines 20-28:
```tsx
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!fragment?.code) return;
    navigator.clipboard.writeText(fragment.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
```

Also remove the `useState` import if it becomes unused (it will — the component no longer uses any state).

- [ ] **Step 2: Remove the Preview/Code toggle buttons from the header**

Replace lines 38-67 (the `{fragment && (` block with the two toggle buttons) with nothing. The header should just show the title on the left.

- [ ] **Step 3: Remove the code view render branch**

Delete the entire code view branch (lines 84-105, the `fragment && viewMode === "code"` motion.div block). This includes the Copy button, the `<pre>` tag, and the code display.

- [ ] **Step 4: Simplify the preview branch condition**

Change `fragment && viewMode === "code" ? (...)` → removed. Change the next branch from `fragment && sandboxUrl ? (` to just `fragment && sandboxUrl ? (` (it already is — just make sure the conditions chain correctly after removing the code branch).

The final ternary in AnimatePresence should be:
```
isLoading ? <LoadingCarousel> : fragment && sandboxUrl ? <FragmentWeb> : <EmptyState>
```

Also fix the remaining developer jargon in the empty state text. Change:
- `"Your app preview will appear here"` → `"Your tool preview will appear here"`
- `"Describe a therapy tool in the chat to get started"` is already good (keep it)

- [ ] **Step 5: Verify preview renders without code tab**

Run: `npm run build`
Expected: No build errors. Preview panel shows tool title and live preview only. No Preview/Code toggle.

- [ ] **Step 6: Commit**

```bash
git add src/features/builder-v2/components/preview.tsx
git commit -m "fix(ux): remove code view from preview panel

Non-technical therapists don't need to see raw HTML source code.
Preview now always shows the interactive tool. Removed viewMode state,
copy handler, Preview/Code toggle, and code display."
```

---

### Task 4: Fix Developer Jargon in Progress Labels

**Files:**
- Modify: `src/features/builder-v2/components/file-progress.tsx:33`

One progress label says "Writing component code" — "component" is developer jargon.

- [ ] **Step 1: Change the label**

In `file-progress.tsx` line 33, change:
```tsx
  "code-started": "Writing component code",
```
To:
```tsx
  "code-started": "Creating your tool",
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: No build errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/builder-v2/components/file-progress.tsx
git commit -m "fix(ux): replace 'Writing component code' with 'Creating your tool'

Non-technical users don't know what a 'component' is."
```

---

## Phase B: Non-Technical Polish Features

### Task 5: Responsive Preview Breakpoints

**Files:**
- Create: `src/features/builder-v2/components/responsive-picker.tsx`
- Modify: `src/features/builder-v2/components/preview.tsx`
- Modify: `src/features/builder-v2/components/fragment-web.tsx`

Therapy tools are used on iPads and phones in clinics. Therapists need to see "will this look right on my iPad?" — but they don't think in pixels. Use friendly labels: Phone, Tablet, Computer.

- [ ] **Step 1: Create the ResponsivePicker component**

Create `src/features/builder-v2/components/responsive-picker.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

export type Breakpoint = "phone" | "tablet" | "computer";

type ResponsivePickerProps = {
  value: Breakpoint;
  onChange: (bp: Breakpoint) => void;
};

const BREAKPOINTS: { key: Breakpoint; icon: string; label: string }[] = [
  { key: "phone", icon: "phone_iphone", label: "Phone" },
  { key: "tablet", icon: "tablet_mac", label: "Tablet" },
  { key: "computer", icon: "desktop_windows", label: "Computer" },
];

export function ResponsivePicker({ value, onChange }: ResponsivePickerProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-0.5">
      {BREAKPOINTS.map(({ key, icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          aria-label={`Preview on ${label}`}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
            value === key
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          <MaterialIcon icon={icon} size="sm" />
          <span className="hidden lg:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update FragmentWeb to accept a width prop**

In `src/features/builder-v2/components/fragment-web.tsx`, replace the entire file:

```tsx
import { cn } from "@/core/utils";

type FragmentWebProps = {
  url: string;
  title?: string;
  width?: number | "100%";
};

export function FragmentWeb({ url, title, width = "100%" }: FragmentWebProps) {
  const isConstrained = typeof width === "number";

  return (
    <div className={cn("h-full flex items-start justify-center", isConstrained && "pt-4")}>
      <div
        className={cn(
          "h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isConstrained && "rounded-xl border border-surface-container shadow-lg"
        )}
        style={{ width: typeof width === "number" ? `${width}px` : "100%" }}
      >
        <iframe
          src={url}
          title={title ?? "Tool Preview"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>
    </div>
  );
}
```

When width is a pixel value (phone/tablet), the iframe gets a rounded border frame to suggest a device. When "100%" (computer), it's full-bleed like today.

- [ ] **Step 3: Wire responsive state into Preview**

Update `src/features/builder-v2/components/preview.tsx` to accept a `breakpoint` prop and pass the corresponding width to FragmentWeb.

Add the import and type:
```tsx
import type { Breakpoint } from "./responsive-picker";
```

Add to PreviewProps:
```tsx
  breakpoint?: Breakpoint;
```

Add a width map inside the component:
```tsx
  const WIDTHS: Record<Breakpoint, number | "100%"> = {
    phone: 375,
    tablet: 768,
    computer: "100%",
  };
  const previewWidth = WIDTHS[breakpoint ?? "computer"];
```

Pass to FragmentWeb:
```tsx
<FragmentWeb url={sandboxUrl} title={fragment.title} width={previewWidth} />
```

- [ ] **Step 4: Verify responsive preview works**

Run: `npm run build`
Expected: No build errors. (Manual test: setting breakpoint="phone" should constrain iframe to 375px with a border frame.)

- [ ] **Step 5: Commit**

```bash
git add src/features/builder-v2/components/responsive-picker.tsx src/features/builder-v2/components/fragment-web.tsx src/features/builder-v2/components/preview.tsx
git commit -m "feat(ux): add responsive preview with Phone/Tablet/Computer breakpoints

Therapists need to see how tools look on iPads and phones.
Uses friendly labels (not pixels). Device frame border appears
when previewing smaller sizes."
```

---

### Task 6: Simple Undo (Version History)

**Files:**
- Modify: `convex/schema.ts:54-65`
- Modify: `convex/projects.ts`
- Modify: `src/app/(app)/builder/page.tsx`
- Modify: `src/features/builder-v2/components/builder-header.tsx`

Lovable has a full Git timeline. Non-technical users don't need that — they need a single "Undo" button that restores the previous version of their tool. One button, one action, zero jargon.

**Limitation (intentional):** This is a single-step undo, not multi-step. After undoing once, the button disappears until the user makes another change. This matches the mental model of non-technical users ("oops, go back") without introducing timeline complexity.

- [ ] **Step 1: Add versions field to schema**

In `convex/schema.ts`, add `versions` to the projects table definition (after `messages`):

```tsx
    versions: v.optional(v.array(v.object({
      fragment: v.any(),
      title: v.string(),
      timestamp: v.number(),
    }))),
```

- [ ] **Step 2: Push schema change**

Run: `npx convex dev --once`
Expected: Schema updated successfully, no errors.

- [ ] **Step 3: Add saveVersion and getLatestVersion to projects.ts**

Add two new functions to `convex/projects.ts`:

```tsx
export const saveVersion = mutation({
  args: {
    projectId: v.id("projects"),
    fragment: v.any(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const versions = (project.versions ?? []) as Array<{
      fragment: unknown;
      title: string;
      timestamp: number;
    }>;

    // Keep last 10 versions (FIFO)
    const updated = [
      ...versions.slice(-9),
      { fragment: args.fragment, title: args.title, timestamp: Date.now() },
    ];

    await ctx.db.patch(args.projectId, { versions: updated });
  },
});

export const getLatestVersion = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<{
    fragment: unknown;
    title: string;
    timestamp: number;
  } | null> => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const versions = (project.versions ?? []) as Array<{
      fragment: unknown;
      title: string;
      timestamp: number;
    }>;

    // Return second-to-last (the one BEFORE current)
    if (versions.length < 2) return null;
    return versions[versions.length - 2] ?? null;
  },
});
```

- [ ] **Step 4: Wire version saving into builder page**

In `src/app/(app)/builder/page.tsx`, inside `handleFragmentGenerated`:

After `setProjectId(currentProjectId)` or when the project already exists, save the PREVIOUS fragment as a version before updating:

```tsx
// Save previous fragment as version before updating
if (fragment && currentProjectId) {
  await saveVersion({
    projectId: currentProjectId,
    fragment,
    title: fragment.title,
  });
}
```

Import `saveVersion`:
```tsx
const saveVersion = useMutation(api.projects.saveVersion);
```

- [ ] **Step 5: Add undo handler to builder page**

Add undo state and handler to `BuilderContent`:

```tsx
const getLatestVersion = useQuery(
  api.projects.getLatestVersion,
  projectId ? { projectId } : "skip"
);

const handleUndo = async () => {
  if (!getLatestVersion || !projectId) return;
  const prevFragment = getLatestVersion.fragment as FragmentResult;
  setFragment(prevFragment);
  setIsPreviewLoading(true);

  try {
    const res = await fetch("/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: prevFragment }),
    });
    if (res.ok) {
      const { url, sandboxId } = await res.json();
      setSandboxUrl(url);
      await updateProject({
        projectId,
        title: prevFragment.title,
        description: prevFragment.description,
        fragment: prevFragment,
        sandboxId,
      });
    }
  } finally {
    setIsPreviewLoading(false);
  }
};
```

- [ ] **Step 6: Add onUndo prop to header and wire it**

In `builder-header.tsx`, add `onUndo?: () => void` and `canUndo?: boolean` to the props type.

Add an Undo button next to the download button (only shown when `canUndo` is true):

```tsx
{canUndo && onUndo && (
  <button
    className="flex items-center gap-2 w-9 h-9 justify-center text-on-surface-variant rounded-full hover:bg-surface-container-high hover:text-primary transition-colors border border-surface-container"
    type="button"
    onClick={onUndo}
    title="Undo last change"
  >
    <MaterialIcon icon="undo" size="sm" />
  </button>
)}
```

Pass from builder page:
```tsx
<BuilderV2Header
  ...
  onUndo={handleUndo}
  canUndo={!!getLatestVersion}
/>
```

- [ ] **Step 7: Verify undo works**

Run: `npx convex dev --once && npm run build`
Expected: Schema deploys, build passes. (Manual test: generate tool, iterate, click undo — previous version restores.)

- [ ] **Step 8: Commit**

```bash
git add convex/schema.ts convex/projects.ts src/app/\(app\)/builder/page.tsx src/features/builder-v2/components/builder-header.tsx
git commit -m "feat(ux): add simple undo button for non-technical users

Saves up to 10 previous versions in Convex. Single 'Undo' button
in header restores the previous tool version. No timeline, no Git
jargon — just one button to go back."
```

---

### Task 7: Dark Mode

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/shared/components/theme-toggle.tsx`
- Modify: `src/features/builder-v2/components/builder-header.tsx`

Dark mode is an accessibility feature, not a developer feature. Many therapists work in dimly-lit rooms or have light sensitivity. `next-themes` is already installed and ThemeProvider is already wired.

- [ ] **Step 1: Add dark mode tokens to globals.css**

Add after the closing `}` of `@theme { ... }` (after line 72) and before `.bg-primary-gradient`:

```css
.dark {
  --color-primary: #81d4d8;
  --color-primary-container: #004f52;
  --color-on-primary: #003739;
  --color-on-primary-container: #9df0f4;
  --color-on-primary-fixed: #002021;
  --color-on-primary-fixed-variant: #004f52;

  --color-secondary: #c0c1ff;
  --color-secondary-container: #3639a1;
  --color-on-secondary: #1c1f90;
  --color-on-secondary-container: #e1e0ff;

  --color-tertiary: #ffb68e;
  --color-tertiary-container: #6f3814;
  --color-on-tertiary: #4a2800;
  --color-on-tertiary-container: #ffdbca;

  --color-error: #ffb4ab;
  --color-error-container: #93000a;
  --color-on-error: #690005;
  --color-on-error-container: #ffdad6;

  --color-surface: #111318;
  --color-surface-dim: #111318;
  --color-surface-bright: #37393e;
  --color-surface-container: #1d2024;
  --color-surface-container-low: #1a1c20;
  --color-surface-container-lowest: #0c0e13;
  --color-surface-container-high: #282a2f;
  --color-surface-container-highest: #33353a;
  --color-surface-tint: #81d4d8;
  --color-surface-variant: #3e4949;
  --color-on-surface: #e2e2e9;
  --color-on-surface-variant: #bec9c9;
  --color-inverse-surface: #e2e2e9;
  --color-inverse-on-surface: #2e3036;

  --color-outline: #889393;
  --color-outline-variant: #3e4949;
  --color-on-background: #e2e2e9;
  --color-background: #111318;

  --color-foreground: #e2e2e9;
  --color-muted: #bec9c9;
  --color-border: #3e4949;
}
```

Also update the dark gradient utility:
```css
.dark .bg-primary-gradient {
  background: linear-gradient(135deg, #004f52 0%, #0d7377 100%);
}

.dark .sanctuary-shadow {
  box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.3);
}

.dark .glass-effect {
  background: rgba(17, 19, 24, 0.8);
  backdrop-filter: blur(20px);
}
```

- [ ] **Step 2: Create the ThemeToggle component**

Create `src/shared/components/theme-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { MaterialIcon } from "./material-icon";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — next-themes needs client-side mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors border border-surface-container"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <MaterialIcon icon={isDark ? "light_mode" : "dark_mode"} size="sm" />
    </button>
  );
}
```

- [ ] **Step 3: Add ThemeToggle to builder header**

In `builder-header.tsx`, import and add the toggle in the right actions area, before the Download button:

```tsx
import { ThemeToggle } from "@/shared/components/theme-toggle";
```

Add inside the right actions div, as the first child:
```tsx
<ThemeToggle />
```

- [ ] **Step 4: Verify dark mode works**

Run: `npm run build`
Expected: No build errors. (Manual test: click moon icon, all surfaces invert to dark palette, text is light, primary becomes the teal-light variant.)

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/shared/components/theme-toggle.tsx src/features/builder-v2/components/builder-header.tsx
git commit -m "feat(ux): add dark mode with Material 3 dark palette

Adds .dark CSS class with inverted Material 3 tokens. Sun/moon toggle
in builder header. Uses next-themes (already installed). Accessibility
feature for therapists working in dim environments."
```

---

### Task 8: Message Persistence

**Files:**
- Modify: `src/features/builder-v2/components/chat.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

When a therapist closes the browser and comes back, their conversation should still be there. The schema already has a `messages` field on projects — we just need to save and restore.

- [ ] **Step 1: Add onMessagesChange callback to Chat**

In `src/features/builder-v2/components/chat.tsx`, add to ChatProps:

```tsx
  onMessagesChange?: (messages: Message[]) => void;
```

Accept it in the destructured props:

```tsx
export function Chat({
  onFragmentGenerated,
  currentCode,
  initialMessage,
  onMessagesChange,
}: ChatProps) {
```

- [ ] **Step 2: Call onMessagesChange after each assistant response completes**

In the `handleSubmit` function, after `onFragmentGenerated?.(fragment)` (line 239), add:

```tsx
        // Persist messages (filter to serializable types only)
        const persistable = [...messages, userMessage, {
          ...buildingMessage,
          type: "complete" as MessageType,
          content: `Here's your ${fragment.title}! ${fragment.description} Let me know if you want any changes.`,
          fragment,
        }].filter((m) => m.type === "text" || m.type === "complete" || m.role === "user");
        onMessagesChange?.(persistable);
```

Note: We filter out "thinking", "building", and "plan" messages because they contain streaming state that isn't meaningful when restored.

- [ ] **Step 3: Add initialMessages prop to Chat**

Add to ChatProps:
```tsx
  initialMessages?: Message[];
```

Change the initial state:
```tsx
  const [messages, setMessages] = useState<Message[]>(
    initialMessages && initialMessages.length > 0
      ? initialMessages
      : [WELCOME_MESSAGE]
  );
```

Also export the `Message` type so the builder page can use it:
```tsx
export type { Message };
```

- [ ] **Step 4: Wire persistence in builder page**

In `src/app/(app)/builder/page.tsx`:

Add a handler that saves messages to Convex:
```tsx
  const handleMessagesChange = async (msgs: unknown[]) => {
    if (!projectId) return;
    await updateProject({ projectId, messages: msgs });
  };
```

Pass to Chat. **Important:** When restoring a project with saved messages, do NOT pass `initialMessage` — otherwise the auto-send `useEffect` will fire a duplicate message on top of the restored conversation:

```tsx
const restoredMessages = loadedProject?.messages as Message[] | undefined;
const hasRestoredMessages = restoredMessages && restoredMessages.length > 0;

<Chat
  onFragmentGenerated={handleFragmentGenerated}
  currentCode={fragment?.code}
  initialMessage={hasRestoredMessages ? undefined : (initialMessage ?? starterPrompt)}
  onMessagesChange={handleMessagesChange}
  initialMessages={restoredMessages}
/>
```

Import the Message type:
```tsx
import type { Message } from "@/features/builder-v2/components/chat";
```

- [ ] **Step 5: Verify message persistence works**

Run: `npm run build`
Expected: No build errors. (Manual test: generate a tool, note the project URL, refresh the page — conversation should restore with the user messages and completion messages.)

- [ ] **Step 6: Commit**

```bash
git add src/features/builder-v2/components/chat.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): persist chat messages so conversations survive page refresh

Saves serializable messages (user + completion) to Convex on each
assistant response. Restores from project data on page load.
Therapists can close the browser and come back to their conversation."
```

---

### Task 9: Wire Responsive Picker into Header + Preview

**Files:**
- Modify: `src/features/builder-v2/components/builder-header.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

This task connects the responsive picker from Task 5 into the header and wires the state through to the preview.

- [ ] **Step 1: Add breakpoint state to builder page**

In `src/app/(app)/builder/page.tsx`, add state:

```tsx
import type { Breakpoint } from "@/features/builder-v2/components/responsive-picker";

// Inside BuilderContent:
const [breakpoint, setBreakpoint] = useState<Breakpoint>("computer");
```

- [ ] **Step 2: Add breakpoint props to header**

In `builder-header.tsx`, add to props type:
```tsx
  breakpoint?: Breakpoint;
  onBreakpointChange?: (bp: Breakpoint) => void;
```

Import and render the picker in the center of the header (where the stub toggles used to be):

```tsx
import { ResponsivePicker } from "./responsive-picker";
import type { Breakpoint } from "./responsive-picker";
```

Add between the left and right divs:
```tsx
      {/* Center: Responsive Preview Picker */}
      {hasProject && breakpoint && onBreakpointChange && (
        <div className="hidden md:flex">
          <ResponsivePicker value={breakpoint} onChange={onBreakpointChange} />
        </div>
      )}
```

- [ ] **Step 3: Pass breakpoint through builder page**

In builder page, pass to header and preview:

```tsx
<BuilderV2Header
  ...
  breakpoint={breakpoint}
  onBreakpointChange={setBreakpoint}
/>
```

```tsx
<Preview
  fragment={fragment}
  sandboxUrl={sandboxUrl}
  isLoading={isPreviewLoading || isLoadingProject}
  breakpoint={breakpoint}
/>
```

- [ ] **Step 4: Verify everything works together**

Run: `npm run build`
Expected: No build errors. The full header should now show: [Bridges] [title] ... [Phone|Tablet|Computer] ... [Undo] [Download] [New] [Share] [ThemeToggle]

- [ ] **Step 5: Commit**

```bash
git add src/features/builder-v2/components/builder-header.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): wire responsive picker into header and preview

Phone/Tablet/Computer breakpoint picker appears in the center of the
builder header when a project is active. State flows through to Preview
which constrains the iframe width accordingly."
```

---

## Phase C: Core Quality — Tools That Work First Try

### Task 10: Strengthen Code Generation Prompt for First-Try Usability

**Files:**
- Modify: `src/features/builder-v2/lib/prompt.ts:34-67`

The current system prompt says "build interactive, child-friendly UI components" — that's too vague. Claude takes shortcuts: buttons with no handlers, placeholder text instead of real content, counters that don't count, celebrations that don't animate. A therapist clicks "Earn Star" and nothing happens. That's a broken product, not an MVP.

The fix is explicit requirements for what "working" means.

- [ ] **Step 1: Replace the code generation system prompt**

In `src/features/builder-v2/lib/prompt.ts`, replace the `getCodeGenSystemPrompt` function (lines 34-67) with:

```tsx
export function getCodeGenSystemPrompt(context?: string): string {
  const basePrompt = `You are an expert React developer building therapy tools for children with autism and special needs. You build for Bridges, a platform used by therapists and parents who have ZERO technical knowledge.

## Output Format (FragmentSchema)
- title: Short, friendly title (e.g., "Morning Routine Schedule")
- description: One sentence explaining what it does and who it helps
- template: "nextjs-developer" (always use this)
- code: Complete, self-contained React component (see rules below)
- file_path: "app/page.tsx"
- has_additional_dependencies: true/false
- additional_dependencies: npm package names if needed (e.g., ["framer-motion"])
- port: 3000

## Code Rules — EVERY tool must work IMMEDIATELY on first render

### Mandatory "use client"
The FIRST line of code must be: "use client";
This is non-negotiable. The file is written to app/page.tsx in Next.js App Router.

### Every Button Must Work
- Every button, tap target, and interactive element MUST have a working onClick/onTouchEnd handler
- Handlers must update real state (useState) that causes visible changes
- NO placeholder handlers. NO console.log-only handlers. NO empty functions.
- If a button says "Earn Star" it must actually add a star to the UI when tapped

### Complete State Management
- Use useState for ALL dynamic values (counters, selections, completion status, active items)
- Initialize state with realistic defaults (not empty arrays or zeros unless that's the starting state)
- Every state change must produce a visible UI update

### Animations & Celebrations
- Use CSS animations or framer-motion for celebrations (confetti, bounce, scale, glow)
- Token boards: animate each token earned + big celebration when all tokens are filled
- Visual schedules: animate step completion (checkmark, strikethrough, slide)
- Communication boards: highlight selected card with scale + border + optional pulse

### Visual Design — Child-Friendly, Not Developer-y
- Large touch targets: minimum 48px tap area, prefer 64px+ for primary actions
- Bold, high-contrast colors with a warm, friendly palette
- Rounded corners (12-16px) on all cards and buttons
- Clear visual hierarchy: title → instructions → interactive area → action buttons
- Use emoji or Unicode symbols for icons (⭐, ✅, 🎉, 🏆) — no icon library imports needed
- White or light pastel backgrounds. No dark/neon schemes unless requested.
- Generous padding (16-24px) and spacing between elements

### Self-Contained & Complete
- The component must be a single default export
- ALL logic, state, styles, and content must be inside the one file
- Use Tailwind CSS classes for ALL styling
- Include realistic content (real food names, real routine steps, real reward options) — never "Item 1", "Item 2"
- Content should feel like it was written by a therapist, not a developer

### Accessibility
- ARIA labels on all interactive elements
- Sufficient color contrast (4.5:1 minimum)
- Keyboard navigable (tabIndex, onKeyDown for Enter/Space)
- role="button" on non-button clickable elements

### DO NOT
- Do NOT use placeholder text ("Lorem ipsum", "Click me", "Item 1")
- Do NOT leave any handler as a no-op or console.log
- Do NOT use alert() or window.confirm()
- Do NOT reference external images, APIs, or services
- Do NOT add "TODO" or "FIXME" comments
- Do NOT generate broken or partial code — if in doubt, keep it simpler but working
- Do NOT use \`next/image\` or \`next/link\` — use standard HTML tags in generated tools`;

  if (context) {
    return `${basePrompt}

## Current Tool Context
${context}

## Iteration Rules
- Preserve ALL existing functionality unless explicitly asked to remove it
- Keep the same visual style unless asked to change it
- Only modify what the user asked for — don't restructure the entire component
- Ensure the modified tool still works completely after changes`;
  }

  return basePrompt;
}
```

- [ ] **Step 2: Verify no build errors**

Run: `npm run build`
Expected: No build errors. The prompt is a string — no runtime impact until next generation.

- [ ] **Step 3: Test with a real generation**

Run the dev server and test: describe "Build a 5-star token board for earning iPad time."

**Verify:**
- Stars light up when tapped (not just visual — state changes)
- Counter increments visibly
- Celebration animation plays when all stars are earned
- Reset button works and clears all stars
- All buttons respond to tap/click

- [ ] **Step 4: Commit**

```bash
git add src/features/builder-v2/lib/prompt.ts
git commit -m "feat(ai): strengthen code gen prompt for first-try usable tools

Replaces vague 'build interactive components' with explicit requirements:
every button must work, state must be complete, animations must play,
no placeholders, no console.log handlers. Tools should work the moment
a therapist sees them."
```

---

### Task 11: Live Preview Updates During Iteration (No Refresh)

**Files:**
- Modify: `src/app/(app)/builder/page.tsx:83-115`
- Modify: `src/features/builder-v2/components/preview.tsx`

Currently, every iteration hides the preview with a loading carousel while a brand-new sandbox is created. This is because:
1. `handleFragmentGenerated` sets `isPreviewLoading(true)` — hiding the iframe behind LoadingCarousel
2. The sandbox API call doesn't pass `currentSandboxId` — so a NEW sandbox is created every time instead of reconnecting
3. The new sandbox URL replaces the old one, forcing a full iframe reload

The E2B sandbox already supports live updates: `executeFragment()` reconnects to the running sandbox, writes the updated code, and the dev server's HMR rebuilds in-place. We just need to use it.

**Good news:** The sandbox API call already passes `currentSandboxId` (line 99 of builder/page.tsx), so E2B reconnection is already wired. The problem is purely on the frontend — it hides the preview with a loading carousel during EVERY generation, even iterations where the sandbox updates in-place via HMR.

**The fix has two parts:**
1. Don't hide the preview during iteration (let HMR update live)
2. Show a subtle "Updating..." overlay instead of replacing the whole preview

**Prerequisite:** Tasks 6 and 9 must be completed first (this task references `saveVersion` from Task 6 and `breakpoint` from Task 9).

- [ ] **Step 1: Split loading state into first-build vs iteration**

In `src/app/(app)/builder/page.tsx`, add a new state alongside the existing ones:

```tsx
const [isIterating, setIsIterating] = useState(false);
```

Then replace the entire `handleFragmentGenerated` function (lines 83-115) with a version that distinguishes first build from iteration.

Note: `saveVersion` is already imported from Task 6. `currentSandboxId` is already passed to the sandbox API (line 99).

```tsx
  const handleFragmentGenerated = async (result: FragmentResult) => {
    const isIteration = !!fragment; // If we already have a fragment, this is an iteration
    setFragment(result);

    if (isIteration) {
      setIsIterating(true); // Subtle overlay, keep preview visible
    } else {
      setIsPreviewLoading(true); // Full loading carousel for first build
    }

    try {
      let currentProjectId = projectId;
      if (!currentProjectId) {
        currentProjectId = await createProject({
          title: result.title,
          description: result.description,
        });
        setProjectId(currentProjectId);
      }

      // Save previous fragment as version before updating (saveVersion from Task 6)
      if (fragment && currentProjectId) {
        await saveVersion({
          projectId: currentProjectId,
          fragment,
          title: fragment.title,
        });
      }

      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fragment: result,
          sandboxId: currentSandboxId,
        }),
      });
      if (res.ok) {
        const { url, sandboxId } = await res.json();

        // Only update iframe src if URL actually changed (new sandbox created)
        if (url !== sandboxUrl) {
          setSandboxUrl(url);
        }
        setCurrentSandboxId(sandboxId);

        await updateProject({
          projectId: currentProjectId,
          title: result.title,
          description: result.description,
          fragment: result,
          sandboxId,
        });
      }
    } finally {
      setIsPreviewLoading(false);
      setIsIterating(false);
    }
  };
```

Key changes from the original:
- `isIteration` check: if `fragment` already exists, this is a refinement, not a first build
- `setIsIterating(true)` instead of `setIsPreviewLoading(true)` for iterations — keeps iframe visible
- Only update `sandboxUrl` if the URL actually changed — prevents iframe reload on same-sandbox reconnect
- Version saving integrated (from Task 6)

- [ ] **Step 2: Add "Updating..." overlay to Preview**

In `src/features/builder-v2/components/preview.tsx`, add an `isIterating` prop and render a subtle overlay instead of replacing the preview.

Add to PreviewProps:
```tsx
  isIterating?: boolean;
```

Add the overlay inside the content area div, after the AnimatePresence block but still inside the `flex-1 relative overflow-hidden` div:

```tsx
      {/* Subtle updating overlay — keeps preview visible underneath */}
      <AnimatePresence>
        {isIterating && (
          <motion.div
            key="updating"
            className="absolute inset-0 z-20 flex items-start justify-center pt-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm shadow-lg border border-surface-container">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-on-surface">Updating your tool...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
```

This shows a floating pill at the top of the preview ("Updating your tool...") with a pulsing dot, while the iframe stays fully visible underneath. The user watches their tool morph live.

- [ ] **Step 3: Pass isIterating to Preview from builder page**

Note: `breakpoint` prop comes from Task 9. If executing out of order, omit it.

```tsx
<Preview
  fragment={fragment}
  sandboxUrl={sandboxUrl}
  isLoading={isPreviewLoading || isLoadingProject}
  isIterating={isIterating}
  breakpoint={breakpoint}
/>
```

- [ ] **Step 4: Verify live updates work**

Run: `npm run build`
Expected: No build errors.

Manual test flow:
1. Build a token board (first build — should show loading carousel as before)
2. Type "make the stars bigger" (iteration — preview should stay visible)
3. Watch the preview: E2B's HMR should update the tool live in the iframe
4. The "Updating your tool..." pill should appear briefly, then disappear
5. If sandbox expired (wait 5+ minutes), it should fallback to full loading (new sandbox)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/builder/page.tsx src/features/builder-v2/components/preview.tsx
git commit -m "feat(ux): live preview updates during iteration — no more full refresh

Split loading state: first build shows carousel, iterations show subtle
'Updating your tool...' overlay while iframe stays visible. E2B sandbox
reconnection (already wired) + HMR handles live code updates."
```

---

## Verification Checklist

After all tasks are complete, verify the full non-technical experience:

### UI Cleanup
- [ ] **No stub buttons remain** — every visible button does something when clicked
- [ ] **No developer jargon** — search all modified files for: "component", "code", "deploy", "API", "sandbox", "fragment", "config", "schema", "dependencies"

### Polish Features
- [ ] **Responsive preview** — Phone/Tablet/Computer toggles resize the preview iframe
- [ ] **Undo works** — Generate 2+ iterations, click undo, previous version restores
- [ ] **Dark mode** — Toggle theme, all surfaces/text invert correctly
- [ ] **Messages persist** — Generate a tool, refresh the page with `?project=<id>`, conversation restores

### Core Quality
- [ ] **Tools work first try** — Generate a token board: tap "Earn Star" → star appears, all 5 → celebration plays, reset works
- [ ] **Live iteration** — Type "make the stars bigger" → preview stays visible, no loading carousel, tool updates in-place
- [ ] **Sandbox reconnect** — Iterate 3+ times in a row without seeing a full preview refresh (same sandbox)

### Build Integrity
- [ ] **Build passes** — `npm run build` exits 0
- [ ] **Tests pass** — `npm run test:run` all 51+ tests pass
- [ ] **No regressions** — prompt home, template cards, suggested actions, share dialog, download all still work

Run these commands:
```bash
npm run build
npm run test:run
```
