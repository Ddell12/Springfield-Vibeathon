# Bridges UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete UX overhaul of Bridges — strip developer UI, switch to Vite sandbox with therapy design system, add persistence tiers, live iteration, Vercel publish, and interaction feedback so every action gets visible feedback and every generated tool works first-try.

**Architecture:** Five subsystems executed in dependency order: (A) Foundation — Convex schema + Vite E2B template + prompt rewrite, (B) UI Cleanup — remove stubs/jargon/code view, (C) Core Features — persistence choice, undo, message persistence, responsive preview, (D) Interaction Polish — confetti, live iteration, toasts/dialogs, (E) Publish & Share — Vercel deploy API + share dialog upgrade. Groups A and B are independent and can be parallelized. C depends on A. D depends on B. E depends on A+C.

**Tech Stack:** Next.js App Router, Vite (E2B sandbox), Tailwind v4, Convex (schema + anonymous auth), Vercel Deploy API, next-themes, motion, sonner, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-24-bridges-ux-overhaul-design.md`

**Supersedes:** `docs/superpowers/plans/2026-03-24-non-technical-ux-polish.md` (old plan — still valid reference for detailed code snippets)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `e2b-templates/vite-therapy/package.json` | Vite template package manifest |
| `e2b-templates/vite-therapy/vite.config.ts` | Vite + React config |
| `e2b-templates/vite-therapy/index.html` | Entry HTML with Google Fonts |
| `e2b-templates/vite-therapy/src/main.tsx` | ReactDOM.createRoot (never touched by AI) |
| `e2b-templates/vite-therapy/src/App.tsx` | Default placeholder (AI overwrites this) |
| `e2b-templates/vite-therapy/src/therapy-ui.css` | Design system classes + animation keyframes |
| `e2b-templates/vite-therapy/src/hooks/useLocalStorage.ts` | Device-persistent state hook |
| `e2b-templates/vite-therapy/src/hooks/useConvexData.ts` | Cross-device persistent state hook (localStorage fallback until Convex client wired) |
| `src/features/builder-v2/components/responsive-picker.tsx` | Phone/Tablet/Computer breakpoint buttons |
| `src/features/builder-v2/components/persistence-sheet.tsx` | Bottom sheet for persistence tier selection |
| `src/features/builder-v2/components/confetti.tsx` | CSS confetti burst animation |
| `src/features/builder-v2/components/publish-dialog.tsx` | Publish flow with progress + result URL |
| `src/shared/components/theme-toggle.tsx` | Dark mode sun/moon toggle |
| `src/app/api/publish/route.ts` | Server route for Vercel Deploy API |

### Modified Files

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add versions, publishedUrl, persistence to projects; add toolState table |
| `convex/projects.ts` | Add saveVersion, getLatestVersion, updatePublishUrl mutations/queries |
| `src/features/builder-v2/lib/schema.ts` | Update FragmentSchema for Vite (template, file_path, port, persistence) |
| `src/features/builder-v2/lib/e2b.ts` | Switch to vite-therapy template, add code sanitizer, update port |
| `src/features/builder-v2/lib/prompt.ts` | Complete rewrite — therapy design system classes, persistence injection, strict rules |
| `src/features/builder-v2/components/builder-header.tsx` | Remove stubs, add responsive picker + undo + theme toggle + publish |
| `src/features/builder-v2/components/chat-input.tsx` | Remove stub buttons + notification banner |
| `src/features/builder-v2/components/preview.tsx` | Remove code view, add breakpoint width + iteration overlay + border glow |
| `src/features/builder-v2/components/fragment-web.tsx` | Accept width prop for responsive sizing |
| `src/features/builder-v2/components/file-progress.tsx` | Fix jargon label |
| `src/features/builder-v2/components/chat.tsx` | Export Message type, add onMessagesChange + initialMessages props |
| `src/features/builder-v2/components/completion-message.tsx` | Trigger confetti on first completion |
| `src/features/builder-v2/components/suggested-actions.tsx` | Cross-fade animation on chip refresh |
| `src/app/(app)/builder/page.tsx` | Wire everything: persistence, undo, publish, iteration, messages, responsive |
| `src/features/my-tools/components/my-tools-page.tsx` | Replace browser confirm() with AlertDialog |
| `src/features/sharing/components/share-dialog.tsx` | Add tabs (Preview Link / Published Link) |
| `src/app/globals.css` | Add .dark tokens + dark utility overrides |
| `src/app/api/sandbox/route.ts` | Handle new template, port |

---

## Group A: Foundation

### Task 1: Convex Schema Updates

**Files:**
- Modify: `convex/schema.ts:54-65`
- Modify: `convex/projects.ts`

- [ ] **Step 1: Add fields to projects table and new toolState table**

In `convex/schema.ts`, replace the projects table definition (lines 54-65) with:

```typescript
  projects: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    fragment: v.optional(v.any()),
    sandboxId: v.optional(v.string()),
    messages: v.optional(v.any()),
    shareSlug: v.string(),
    versions: v.optional(v.array(v.object({
      fragment: v.any(),
      title: v.string(),
      timestamp: v.number(),
    }))),
    publishedUrl: v.optional(v.string()),
    persistence: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shareSlug", ["shareSlug"])
    .index("by_createdAt", ["createdAt"]),
```

After the `therapyTemplates` table (after line 76), add:

```typescript
  toolState: defineTable({
    toolId: v.string(),
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  })
    .index("by_toolId_key", ["toolId", "key"]),
```

- [ ] **Step 2: Deploy schema**

Run: `npx convex dev --once`
Expected: Schema updated, no errors.

- [ ] **Step 3: Add version and publish functions to projects.ts**

Append to `convex/projects.ts`:

```typescript
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

    if (versions.length < 2) return null;
    return versions[versions.length - 2] ?? null;
  },
});

export const updatePublishUrl = mutation({
  args: {
    projectId: v.id("projects"),
    publishedUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      publishedUrl: args.publishedUrl,
      updatedAt: Date.now(),
    });
  },
});
```

- [ ] **Step 4: Update existing `update` mutation for new fields**

In `convex/projects.ts`, find the existing `update` mutation and add `persistence: v.optional(v.string())` and `publishedUrl: v.optional(v.string())` to its `args`. In the handler, add:

```typescript
if (fields.persistence !== undefined) updates.persistence = fields.persistence;
if (fields.publishedUrl !== undefined) updates.publishedUrl = fields.publishedUrl;
```

This ensures Tasks 10 and 18 can save persistence tier and published URL via the standard `updateProject` mutation without `as any` casts.

- [ ] **Step 5: Add toolState CRUD functions**

Create `convex/tool_state.ts`:

```typescript
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    toolId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("toolState")
      .withIndex("by_toolId_key", (q) =>
        q.eq("toolId", args.toolId).eq("key", args.key)
      )
      .first();
    return doc?.value ?? null;
  },
});

export const set = mutation({
  args: {
    toolId: v.string(),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("toolState")
      .withIndex("by_toolId_key", (q) =>
        q.eq("toolId", args.toolId).eq("key", args.key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("toolState", {
        toolId: args.toolId,
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }
  },
});
```

- [ ] **Step 6: Deploy and verify**

Run: `npx convex dev --once && npm run build`
Expected: Schema deploys, build passes.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/projects.ts convex/tool_state.ts
git commit -m "feat(convex): add versions, publishedUrl, persistence fields + toolState table

Foundation for undo (versions array), Vercel publish (publishedUrl),
persistence tiers (persistence field), and cross-device state (toolState table)."
```

---

### Task 2: Build Vite Therapy E2B Template

**Files:**
- Create: `e2b-templates/vite-therapy/` (entire directory)

This task creates the custom E2B sandbox template. The AI only ever writes to `src/App.tsx` — everything else is pre-built.

- [ ] **Step 1: Create template directory structure**

```bash
mkdir -p e2b-templates/vite-therapy/src/hooks e2b-templates/vite-therapy/src/lib
```

- [ ] **Step 2: Create package.json**

Create `e2b-templates/vite-therapy/package.json`:

```json
{
  "name": "vite-therapy",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "motion": "^12.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.4.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

Create `e2b-templates/vite-therapy/vite.config.ts`:

```typescript
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
```

- [ ] **Step 4: Create index.html**

Create `e2b-templates/vite-therapy/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <title>Bridges Tool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.tsx**

Create `e2b-templates/vite-therapy/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./therapy-ui.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Create default App.tsx placeholder**

Create `e2b-templates/vite-therapy/src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="tool-container">
      <h1 className="tool-title">Loading your tool...</h1>
      <p className="tool-instruction">This will be replaced by your generated tool.</p>
    </div>
  );
}
```

- [ ] **Step 7: Create therapy-ui.css (design system)**

Create `e2b-templates/vite-therapy/src/therapy-ui.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #00595c;
  --color-primary-light: #0d7377;
  --color-primary-bg: #e6f7f7;
  --color-secondary: #4e52ba;
  --color-accent: #ff8a65;
  --color-success: #4caf50;
  --color-surface: #fafafa;
  --color-surface-raised: #ffffff;
  --color-text: #1a1a2e;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-celebration: #ffd700;

  --font-heading: "Nunito", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}

/* === Layout === */
.tool-container {
  max-width: 32rem;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100dvh;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-surface);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

/* === Typography === */
.tool-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.75rem;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 0.5rem;
}

.tool-instruction {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-text-muted);
  text-align: center;
  margin-bottom: 1.5rem;
}

.tool-label {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.875rem;
}

/* === Interactive Cards === */
.card-interactive {
  background: var(--color-surface-raised);
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.card-interactive:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.card-interactive:active {
  transform: scale(0.95);
}

/* === Tap Targets === */
.tap-target {
  min-height: 64px;
  min-width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}

/* === Token Board Stars === */
.token-star {
  width: 48px;
  height: 48px;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-border);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.token-star.earned {
  background: var(--color-celebration);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.5);
  animation: bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* === Schedule Steps === */
.schedule-step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-raised);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-primary-light);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.schedule-step.completed {
  border-left-color: var(--color-success);
  opacity: 0.7;
}
.schedule-step.completed .step-text {
  text-decoration: line-through;
}

/* === Board Cells (Communication / Choice) === */
.board-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-surface-raised);
  border-radius: var(--radius-lg);
  border: 3px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.board-cell:active {
  transform: scale(0.93);
}
.board-cell.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 89, 92, 0.15);
  animation: pulse-glow 600ms ease-out;
}

/* === Buttons === */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: white;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-xl);
  border: none;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  min-height: 48px;
}
.btn-primary:hover {
  opacity: 0.9;
  box-shadow: 0 4px 12px rgba(0, 89, 92, 0.3);
}
.btn-primary:active {
  transform: scale(0.95);
}

.btn-secondary {
  background: var(--color-surface-raised);
  color: var(--color-text);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}
.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* === Celebration Animations === */
.celebration-burst {
  position: relative;
}
.celebration-burst::after {
  content: "🎉";
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 3rem;
  animation: celebration 1.5s ease-out forwards;
  pointer-events: none;
}

@keyframes celebration {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(0, 89, 92, 0.4); }
  100% { box-shadow: 0 0 0 12px rgba(0, 89, 92, 0); }
}

@keyframes check-draw {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}

/* === Responsive === */
@media (max-width: 480px) {
  .tool-container {
    padding: 1rem;
  }
  .tool-title {
    font-size: 1.5rem;
  }
  .tool-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}

/* === Reduced Motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: Create useLocalStorage hook**

Create `e2b-templates/vite-therapy/src/hooks/useLocalStorage.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }, [key, value]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      return resolved;
    });
  }, []);

  return [value, updateValue];
}
```

- [ ] **Step 9: Create useConvexData hook (placeholder)**

Create `e2b-templates/vite-therapy/src/hooks/useConvexData.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";

// Placeholder for cross-device persistence via Convex anonymous auth.
// Falls back to localStorage until Convex client is configured.
// To enable: set VITE_CONVEX_URL env var in the sandbox.

export function useConvexData<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`convex_${key}`);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`convex_${key}`, JSON.stringify(value));
    } catch {
      // Storage full
    }
  }, [key, value]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      return resolved;
    });
  }, []);

  return [value, updateValue];
}
```

Note: This is a localStorage fallback. Full Convex integration (anonymous auth + reactive queries) is a stretch goal that requires injecting `VITE_CONVEX_URL` into the sandbox environment and adding the Convex React client to the template dependencies.

- [ ] **Step 10: Commit template**

```bash
git add e2b-templates/
git commit -m "feat: create vite-therapy E2B sandbox template

Custom Vite + React + Tailwind template with therapy design system.
Includes therapy-ui.css with utility classes (.card-interactive,
.tap-target, .token-star, .board-cell, .celebration-burst, etc.),
useLocalStorage hook for device persistence, and placeholder
useConvexData hook for cross-device persistence."
```

---

### Task 3: Update FragmentSchema + E2B for Vite

**Files:**
- Modify: `src/features/builder-v2/lib/schema.ts`
- Modify: `src/features/builder-v2/lib/e2b.ts`
- Modify: `src/app/api/sandbox/route.ts`

- [ ] **Step 1: Update FragmentSchema**

Replace the entire content of `src/features/builder-v2/lib/schema.ts`:

```typescript
import { z } from "zod";

export const FragmentTemplate = z.enum([
  "vite-therapy",
  "nextjs-developer",
  "vue-developer",
  "html-developer",
]);

export const FragmentPersistence = z.enum(["session", "device", "cloud"]);

export const FragmentSchema = z.object({
  title: z.string(),
  description: z.string(),
  template: FragmentTemplate.default("vite-therapy"),
  code: z.string(),
  file_path: z.string().default("src/App.tsx"),
  has_additional_dependencies: z.boolean(),
  additional_dependencies: z.array(z.string()).optional(),
  port: z.number().optional().default(5173),
  persistence: FragmentPersistence.optional().default("device"),
});

export type FragmentResult = z.infer<typeof FragmentSchema>;
```

- [ ] **Step 2: Update e2b.ts with code sanitizer and new defaults**

Replace the entire content of `src/features/builder-v2/lib/e2b.ts`:

```typescript
import { Sandbox } from "@e2b/code-interpreter";

import type { FragmentResult } from "./schema";

export interface SandboxResult {
  sandboxId: string;
  url: string;
}

export function getSandboxUrl(host: string, _port: number): string {
  return `https://${host}`;
}

/**
 * Sanitize code from old Next.js projects to work in Vite sandbox.
 * Strips next/image, next/link imports and replaces JSX usage.
 */
function sanitizeForVite(code: string): string {
  let sanitized = code;
  // Remove next/image import and replace <Image> with <img>
  sanitized = sanitized.replace(/import\s+Image\s+from\s+['"]next\/image['"];?\n?/g, "");
  sanitized = sanitized.replace(/<Image\b/g, "<img");
  sanitized = sanitized.replace(/<\/Image>/g, "</img>");
  // Remove next/link import and replace <Link> with <a>
  sanitized = sanitized.replace(/import\s+Link\s+from\s+['"]next\/link['"];?\n?/g, "");
  sanitized = sanitized.replace(/<Link\b/g, "<a");
  sanitized = sanitized.replace(/<\/Link>/g, "</a>");
  // Remove "use client" directive (not needed in Vite)
  sanitized = sanitized.replace(/^['"]use client['"];?\n?/m, "");
  return sanitized;
}

export async function createSandbox(fragment: FragmentResult): Promise<SandboxResult> {
  const template = fragment.template === "vite-therapy" ? "vite-therapy" : fragment.template;
  const sandbox = await Sandbox.create(template, {
    timeoutMs: 300_000,
  });

  const code = template === "vite-therapy" ? sanitizeForVite(fragment.code) : fragment.code;
  await sandbox.files.write(fragment.file_path, code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
  }

  const port = fragment.port ?? 5173;
  const host = sandbox.getHost(port);
  const url = getSandboxUrl(host, port);

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}

export async function executeFragment(
  sandboxId: string,
  fragment: FragmentResult
): Promise<SandboxResult> {
  const sandbox = await Sandbox.connect(sandboxId);

  const code = fragment.template === "vite-therapy" ? sanitizeForVite(fragment.code) : fragment.code;
  await sandbox.files.write(fragment.file_path, code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
  }

  const port = fragment.port ?? 5173;
  const host = sandbox.getHost(port);
  const url = getSandboxUrl(host, port);

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors. Schema changes are additive, backward compatible.

- [ ] **Step 4: Commit**

```bash
git add src/features/builder-v2/lib/schema.ts src/features/builder-v2/lib/e2b.ts
git commit -m "feat: switch FragmentSchema + E2B to Vite sandbox

Default template now 'vite-therapy' (port 5173, file src/App.tsx).
Added code sanitizer for backward compat with old Next.js projects.
Added persistence field to FragmentSchema."
```

---

### Task 4: System Prompt Rewrite

**Files:**
- Modify: `src/features/builder-v2/lib/prompt.ts`

- [ ] **Step 1: Replace getCodeGenSystemPrompt with therapy design system prompt**

Replace the `getCodeGenSystemPrompt` function (lines 34-67) in `src/features/builder-v2/lib/prompt.ts`. The new prompt references the therapy-ui.css classes available in the Vite template and includes strict rules for first-try usability.

The full prompt is extensive — see spec Section 4 (Layer 2) and the existing plan Task 10 for the complete content. Key additions over the old prompt:

1. Reference available CSS classes: `.card-interactive`, `.tap-target`, `.token-star`, `.schedule-step`, `.board-cell`, `.celebration-burst`, `.btn-primary`, `.btn-secondary`, `.tool-container`, `.tool-grid`, `.tool-title`, `.tool-instruction`
2. Reference available hooks: `useLocalStorage` and `useConvexData`
3. Reference available fonts: Nunito (headings), Inter (body)
4. File path is now `src/App.tsx` (not `app/page.tsx`)
5. Template is `vite-therapy` (not `nextjs-developer`)
6. No `"use client"` needed
7. Strict rules: every button works, no placeholders, realistic content
8. Persistence tier injection based on user's choice
9. DO NOT list: no alert(), no console.log handlers, no next/image, no next/link

- [ ] **Step 2: Add persistence injection helper**

Add a new function to `prompt.ts`:

```typescript
export function getPersistencePromptFragment(persistence: "session" | "device" | "cloud"): string {
  switch (persistence) {
    case "session":
      return "Use React state (useState) for all data. No persistence — data resets when the tab closes.";
    case "device":
      return `Use the useLocalStorage hook for all data that should persist across sessions.
Import: import { useLocalStorage } from './hooks/useLocalStorage'
API: const [value, setValue] = useLocalStorage("key", defaultValue)
This hook works exactly like useState but persists to localStorage.`;
    case "cloud":
      return `Use the useConvexData hook for all data that should sync across devices.
Import: import { useConvexData } from './hooks/useConvexData'
API: const [value, setValue] = useConvexData("key", defaultValue)
This hook works exactly like useState but syncs across devices.`;
  }
}
```

Update `getCodeGenSystemPrompt` to accept persistence:

```typescript
export function getCodeGenSystemPrompt(context?: string, persistence?: string): string {
  const persistenceFragment = getPersistencePromptFragment(
    (persistence as "session" | "device" | "cloud") ?? "device"
  );

  const basePrompt = `... (full prompt with therapy design system) ...

## Data Persistence
${persistenceFragment}
`;

  // ... rest of function
}
```

- [ ] **Step 3: Update chat.tsx to pass persistence to generate API**

In `src/features/builder-v2/components/chat.tsx`, the context variable passed to `/api/chat/generate` should include the persistence tier. This will be wired in Task 10 (persistence sheet) — for now, default to "device".

- [ ] **Step 4: Update generate route to pass persistence to prompt**

In `src/app/api/chat/generate/route.ts`, pass the persistence field from the request body to `getCodeGenSystemPrompt`:

```typescript
const persistence = body.persistence ?? "device";
const result = streamObject({
  model: anthropic("claude-sonnet-4-20250514"),
  system: getCodeGenSystemPrompt(context, persistence),
  schema: FragmentSchema,
  messages,
});
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/builder-v2/lib/prompt.ts src/app/api/chat/generate/route.ts
git commit -m "feat(ai): rewrite system prompt with therapy design system

References therapy-ui.css classes, persistence hooks, Nunito/Inter fonts.
Strict rules for first-try usability: every button works, no placeholders,
realistic content, animations via pre-built CSS classes.
Persistence tier injected based on user choice."
```

---

## Group B: UI Cleanup (Can Run in Parallel with Group A)

### Task 5: Strip Stub Buttons from Header

**Files:**
- Modify: `src/features/builder-v2/components/builder-header.tsx`

- [ ] **Step 1: Remove center view toggles (lines 34-53)**

Delete the entire `{/* Center: View Toggles */}` div.

- [ ] **Step 2: Remove Publish stub button (lines 85-90)**

Delete the Publish button (no onClick handler). It will be re-added properly in Task 18.

- [ ] **Step 3: Rename download title**

Change `title="Download Code"` to `title="Save to my files"`.

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/features/builder-v2/components/builder-header.tsx
git commit -m "fix(ux): remove stub buttons and developer jargon from header"
```

---

### Task 6: Simplify Chat Input

**Files:**
- Modify: `src/features/builder-v2/components/chat-input.tsx`

- [ ] **Step 1: Remove commented notification banner (lines 36-48)**

- [ ] **Step 2: Replace footer bar (lines 65-110) with send-only**

Keep only the send/stop button. Remove +, Visual edits, Chat, mic buttons.

```tsx
<div className="flex items-center justify-end px-1">
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
```

- [ ] **Step 3: Verify and commit**

```bash
git add src/features/builder-v2/components/chat-input.tsx
git commit -m "fix(ux): strip stub buttons from chat input"
```

---

### Task 7: Remove Code View from Preview

**Files:**
- Modify: `src/features/builder-v2/components/preview.tsx`

- [ ] **Step 1: Remove viewMode state, copied state, handleCopy (lines 20-28)**
- [ ] **Step 2: Remove Preview/Code toggle buttons (lines 38-67)**
- [ ] **Step 3: Remove code view render branch (lines 84-105)**
- [ ] **Step 4: Fix empty state text: "Your app preview" → "Your tool preview"**
- [ ] **Step 5: Remove useState import (no longer needed)**
- [ ] **Step 6: Verify and commit**

```bash
git add src/features/builder-v2/components/preview.tsx
git commit -m "fix(ux): remove code view from preview panel"
```

---

### Task 8: Fix Jargon + Dead Links

**Files:**
- Modify: `src/features/builder-v2/components/file-progress.tsx:33`
- Modify: `src/features/builder-v2/components/fragment-web.tsx`

- [ ] **Step 1: Fix progress label**

Change `"code-started": "Writing component code"` → `"code-started": "Creating your tool"`

- [ ] **Step 2: Fix iframe title**

Change `title={title ?? "App Preview"}` → `title={title ?? "Tool Preview"}`

- [ ] **Step 3: Commit**

```bash
git add src/features/builder-v2/components/file-progress.tsx src/features/builder-v2/components/fragment-web.tsx
git commit -m "fix(ux): replace developer jargon with therapy-friendly language"
```

---

### Task 9: Dark Mode

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/shared/components/theme-toggle.tsx`

- [ ] **Step 1: Add .dark tokens to globals.css**

Add after line 72 (closing `}` of `@theme`) and before `.bg-primary-gradient`:

```css
.dark {
  --color-primary: #81d4d8;
  --color-primary-container: #004f52;
  --color-on-primary: #003739;
  --color-on-primary-container: #9df0f4;
  --color-secondary: #c0c1ff;
  --color-secondary-container: #3639a1;
  --color-on-secondary: #1c1f90;
  --color-on-secondary-container: #e1e0ff;
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
  --color-on-surface: #e2e2e9;
  --color-on-surface-variant: #bec9c9;
  --color-outline: #889393;
  --color-outline-variant: #3e4949;
  --color-background: #111318;
  --color-on-background: #e2e2e9;
  --color-foreground: #e2e2e9;
  --color-muted: #bec9c9;
  --color-border: #3e4949;
}

.dark .bg-primary-gradient {
  background: linear-gradient(135deg, #004f52 0%, #0d7377 100%);
}
.dark .sanctuary-shadow {
  box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 2: Create ThemeToggle component**

Create `src/shared/components/theme-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { MaterialIcon } from "./material-icon";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

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

- [ ] **Step 3: Verify and commit**

```bash
git add src/app/globals.css src/shared/components/theme-toggle.tsx
git commit -m "feat(ux): add dark mode with Material 3 dark palette"
```

---

## Group C: Core Features (Depends on Group A)

### Task 10: Persistence Choice Bottom Sheet

**Files:**
- Create: `src/features/builder-v2/components/persistence-sheet.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

- [ ] **Step 1: Create PersistenceSheet component**

Create `src/features/builder-v2/components/persistence-sheet.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

export type PersistenceTier = "session" | "device" | "cloud";

type PersistenceSheetProps = {
  open: boolean;
  onSelect: (tier: PersistenceTier) => void;
};

const OPTIONS: { tier: PersistenceTier; icon: string; label: string; description: string }[] = [
  {
    tier: "session",
    icon: "timer",
    label: "Just for now",
    description: "Resets when you close the tab",
  },
  {
    tier: "device",
    icon: "smartphone",
    label: "Save on this device",
    description: "Survives closing the browser",
  },
  {
    tier: "cloud",
    icon: "cloud_sync",
    label: "Save everywhere",
    description: "Works on any device via a link",
  },
];

export function PersistenceSheet({ open, onSelect }: PersistenceSheetProps) {
  const [selected, setSelected] = useState<PersistenceTier>("device");

  const handleSelect = (tier: PersistenceTier) => {
    setSelected(tier);
    setTimeout(() => onSelect(tier), 400);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest rounded-t-3xl p-6 pb-8 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="w-12 h-1 bg-surface-container-high rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold font-headline text-on-surface text-center mb-1">
              How should this tool save progress?
            </h3>
            <p className="text-sm text-on-surface-variant text-center mb-5">
              You can always change this later.
            </p>
            <div className="flex flex-col gap-3">
              {OPTIONS.map(({ tier, icon, label, description }) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleSelect(tier)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                    selected === tier
                      ? "border-primary bg-primary/5"
                      : "border-surface-container hover:border-primary/30 hover:bg-surface-container-low"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    selected === tier ? "bg-primary/10" : "bg-surface-container-low"
                  )}>
                    <MaterialIcon icon={icon} size="sm" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-on-surface">{label}</div>
                    <div className="text-xs text-on-surface-variant">{description}</div>
                  </div>
                  {selected === tier && (
                    <MaterialIcon icon="check_circle" size="sm" className="text-primary" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Wire into builder page**

In `src/app/(app)/builder/page.tsx`, add state for persistence and show sheet before first build. The sheet appears when the user submits their first prompt, auto-dismisses after selection, then generation begins.

Add imports and state:
```tsx
import { PersistenceSheet } from "@/features/builder-v2/components/persistence-sheet";
import type { PersistenceTier } from "@/features/builder-v2/components/persistence-sheet";

// Inside BuilderContent:
const [persistence, setPersistence] = useState<PersistenceTier>("device");
const [showPersistenceSheet, setShowPersistenceSheet] = useState(false);
const [pendingMessage, setPendingMessage] = useState<string | null>(null);
```

Modify `handlePromptSubmit` to show sheet first:
```tsx
const handlePromptSubmit = (message: string) => {
  setPendingMessage(message);
  setShowPersistenceSheet(true);
};

const handlePersistenceSelect = async (tier: PersistenceTier) => {
  setPersistence(tier);
  if (projectId) {
    await updateProject({ projectId, persistence: tier });
  }
  setShowPersistenceSheet(false);
  if (pendingMessage) {
    setInitialMessage(pendingMessage);
    setPendingMessage(null);
    setMode("building");
  }
};
```

Add sheet to render:
```tsx
<PersistenceSheet
  open={showPersistenceSheet}
  onSelect={handlePersistenceSelect}
/>
```

- [ ] **Step 3: Verify and commit**

```bash
git add src/features/builder-v2/components/persistence-sheet.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): add persistence tier selection before first build

Bottom sheet asks 'How should this tool save progress?' with three
options: Just for now (session), Save on this device (localStorage),
Save everywhere (Convex). Defaults to device persistence."
```

---

### Task 11: Version History / Undo

**Files:**
- Modify: `src/features/builder-v2/components/builder-header.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

Version saving happens in `handleFragmentGenerated` (previous fragment pushed to versions array before updating). The undo button restores the second-to-last version.

- [ ] **Step 1: Add undo props to header**

Add `onUndo?: () => void` and `canUndo?: boolean` to `BuilderV2HeaderProps`. Add undo button before download button:

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

- [ ] **Step 2: Wire undo in builder page**

Add to BuilderContent:
```tsx
const saveVersion = useMutation(api.projects.saveVersion);
const latestVersion = useQuery(
  api.projects.getLatestVersion,
  projectId ? { projectId } : "skip"
);
```

Add handler:
```tsx
const handleUndo = async () => {
  if (!latestVersion || !projectId) return;
  const prevFragment = latestVersion.fragment as FragmentResult;
  setFragment(prevFragment);
  setIsPreviewLoading(true);
  try {
    const res = await fetch("/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: prevFragment, sandboxId: currentSandboxId }),
    });
    if (res.ok) {
      const { url, sandboxId } = await res.json();
      if (url !== sandboxUrl) setSandboxUrl(url);
      setCurrentSandboxId(sandboxId);
      await updateProject({ projectId, fragment: prevFragment, title: prevFragment.title });
      toast("Restored previous version");
    }
  } finally {
    setIsPreviewLoading(false);
  }
};
```

Pass to header: `onUndo={handleUndo} canUndo={!!latestVersion}`

- [ ] **Step 3: Save version before each update in handleFragmentGenerated**

Before the sandbox call, if a previous fragment exists:
```tsx
if (fragment && currentProjectId) {
  await saveVersion({ projectId: currentProjectId, fragment, title: fragment.title });
}
```

- [ ] **Step 4: Verify and commit**

```bash
git add src/features/builder-v2/components/builder-header.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): add undo button with version history

Saves up to 10 previous versions. Single undo button restores
the previous tool. Toast confirms 'Restored previous version'."
```

---

### Task 12: Message Persistence

**Files:**
- Modify: `src/features/builder-v2/components/chat.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

- [ ] **Step 1: Export Message type and add persistence props to Chat**

Add to ChatProps: `onMessagesChange?: (messages: Message[]) => void` and `initialMessages?: Message[]`

Export the Message type: `export type { Message };`

Change initial state: `useState<Message[]>(initialMessages?.length ? initialMessages : [WELCOME_MESSAGE])`

- [ ] **Step 2: Call onMessagesChange after each assistant response**

After `onFragmentGenerated?.(fragment)`, persist serializable messages:
```tsx
const persistable = [...messages, userMessage, {
  ...buildingMessage,
  type: "complete" as MessageType,
  content: `Here's your ${fragment.title}! ${fragment.description}`,
  fragment,
}].filter((m) => m.type === "text" || m.type === "complete" || m.role === "user");
onMessagesChange?.(persistable);
```

- [ ] **Step 3: Wire in builder page**

```tsx
const handleMessagesChange = async (msgs: unknown[]) => {
  if (!projectId) return;
  await updateProject({ projectId, messages: msgs });
};

const restoredMessages = loadedProject?.messages as Message[] | undefined;
const hasRestoredMessages = restoredMessages && restoredMessages.length > 0;

<Chat
  ...
  initialMessage={hasRestoredMessages ? undefined : (initialMessage ?? starterPrompt)}
  onMessagesChange={handleMessagesChange}
  initialMessages={restoredMessages}
/>
```

- [ ] **Step 4: Verify and commit**

```bash
git add src/features/builder-v2/components/chat.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): persist chat messages across page refreshes"
```

---

### Task 13: Responsive Preview

**Files:**
- Create: `src/features/builder-v2/components/responsive-picker.tsx`
- Modify: `src/features/builder-v2/components/fragment-web.tsx`
- Modify: `src/features/builder-v2/components/preview.tsx`
- Modify: `src/features/builder-v2/components/builder-header.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

- [ ] **Step 1: Create ResponsivePicker**

See `docs/superpowers/plans/2026-03-24-non-technical-ux-polish.md`, Task 8 Steps 1-2 for the ResponsivePicker component code.

- [ ] **Step 2: Update FragmentWeb with width prop**

See `docs/superpowers/plans/2026-03-24-non-technical-ux-polish.md`, Task 8 Steps 3-4 for the FragmentWeb width prop changes.

- [ ] **Step 3: Add breakpoint prop to Preview**

- [ ] **Step 4: Add to header center + wire state through builder page**

- [ ] **Step 5: Verify and commit**

```bash
git add src/features/builder-v2/components/responsive-picker.tsx src/features/builder-v2/components/fragment-web.tsx src/features/builder-v2/components/preview.tsx src/features/builder-v2/components/builder-header.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): add Phone/Tablet/Computer responsive preview"
```

---

## Group D: Interaction Polish (Depends on Group B)

### Task 14: Confetti on First Generation

**Files:**
- Create: `src/features/builder-v2/components/confetti.tsx`
- Modify: `src/features/builder-v2/components/completion-message.tsx`

- [ ] **Step 1: Create CSS confetti component**

Create `src/features/builder-v2/components/confetti.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  color: ["#00595c", "#0d7377", "#4e52ba", "#ff8a65", "#ffd700", "#4caf50"][i % 6],
  left: Math.random() * 100,
  delay: Math.random() * 0.5,
  size: 6 + Math.random() * 6,
}));

export function Confetti({ trigger }: { trigger: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden>
      {PARTICLES.map(({ id, color, left, delay, size }) => (
        <div
          key={id}
          className="absolute animate-[confetti-fall_1.5s_ease-out_forwards]"
          style={{
            left: `${left}%`,
            top: -20,
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Add confetti trigger to builder page**

Add state: `const [showConfetti, setShowConfetti] = useState(false);`
Add ref: `const isFirstGeneration = useRef(true);`

In `handleFragmentGenerated`, after successful generation:
```tsx
if (isFirstGeneration.current) {
  setShowConfetti(true);
  isFirstGeneration.current = false;
}
```

Render: `<Confetti trigger={showConfetti} />`

- [ ] **Step 3: Verify and commit**

```bash
git add src/features/builder-v2/components/confetti.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): add confetti celebration on first tool generation"
```

---

### Task 15: Live Iteration (No Preview Refresh)

**Files:**
- Modify: `src/app/(app)/builder/page.tsx`
- Modify: `src/features/builder-v2/components/preview.tsx`

- [ ] **Step 1: Add isIterating state**

```tsx
const [isIterating, setIsIterating] = useState(false);
```

- [ ] **Step 2: Split handleFragmentGenerated for first build vs iteration**

```tsx
const isIteration = !!fragment;
if (isIteration) {
  setIsIterating(true);
} else {
  setIsPreviewLoading(true);
}
```

Only update sandboxUrl if it changed:
```tsx
if (url !== sandboxUrl) setSandboxUrl(url);
```

Finally: `setIsPreviewLoading(false); setIsIterating(false);`

- [ ] **Step 3: Add "Updating..." overlay to Preview**

Add `isIterating?: boolean` prop. Render overlay:

```tsx
<AnimatePresence>
  {isIterating && (
    <motion.div
      key="updating"
      className="absolute inset-0 z-20 flex items-start justify-center pt-4 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm shadow-lg border border-surface-container">
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium text-on-surface">Updating your tool...</span>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 4: Verify and commit**

```bash
git add src/app/\(app\)/builder/page.tsx src/features/builder-v2/components/preview.tsx
git commit -m "feat(ux): live preview during iteration — no more full refresh"
```

---

### Task 16: Feedback Improvements (Toasts, Dialogs, Error Retry)

**Files:**
- Modify: `src/app/(app)/builder/page.tsx` (download toast, new confirmation)
- Modify: `src/features/my-tools/components/my-tools-page.tsx` (AlertDialog for delete)
- Modify: `src/features/builder-v2/components/chat.tsx` (error retry button)

- [ ] **Step 1: Add toast on download**

In builder page `handleDownload`, add after download: `toast("Tool saved to your files!");`

Import: `import { toast } from "sonner";`

- [ ] **Step 2: Add confirmation on New**

Replace direct `handleNewProject()` call with a confirmation. Add state:
```tsx
const [showNewConfirm, setShowNewConfirm] = useState(false);
```

Use shadcn AlertDialog:
```tsx
<AlertDialog open={showNewConfirm} onOpenChange={setShowNewConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Start a new tool?</AlertDialogTitle>
      <AlertDialogDescription>
        Your current tool is saved. You can find it in My Tools anytime.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleNewProject}>Start New</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 3: Replace browser confirm() with AlertDialog in My Tools**

In `my-tools-page.tsx`, replace the `confirm()` call (line 112) with a shadcn AlertDialog with destructive styling.

- [ ] **Step 4: Add error retry button in chat**

In `chat.tsx`, change the error message from plain text to include a retry button:

```tsx
setMessages((prev) =>
  prev.map((m) =>
    m.id === prev[prev.length - 1]?.id
      ? {
          ...m,
          type: "text" as MessageType,
          content: "retry",  // Special marker
        }
      : m
  )
);
```

In `ChatMessage`, when content is "retry", render:
```tsx
<div className="flex flex-col gap-2">
  <p className="text-sm text-on-surface-variant">Something went wrong building your tool.</p>
  <button
    className="text-sm font-semibold text-primary hover:underline self-start"
    onClick={onRetry}
  >
    Try again
  </button>
</div>
```

- [ ] **Step 5: Verify and commit**

```bash
git add src/app/\(app\)/builder/page.tsx src/features/my-tools/components/my-tools-page.tsx src/features/builder-v2/components/chat.tsx src/features/builder-v2/components/chat-message.tsx
git commit -m "feat(ux): add toasts, AlertDialogs, and error retry button

Download shows toast, New shows confirmation dialog, Delete uses
AlertDialog instead of browser confirm(), errors show retry button."
```

---

## Group E: Publish & Share (Depends on Groups A + C)

### Task 17: Vercel Publish API Route

**Files:**
- Create: `src/app/api/publish/route.ts`

- [ ] **Step 0: Configure Vercel Deploy credentials**

Add to `.env.local`:
```
VERCEL_DEPLOY_TOKEN=<create at vercel.com/account/tokens with "Create Deployment" scope>
VERCEL_TEAM_ID=<optional — from vercel.com/teams if deploying under a team>
```

- [ ] **Step 1: Create the publish route**

Create `src/app/api/publish/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { createSandbox } from "@/features/builder-v2/lib/e2b";
import { FragmentSchema } from "@/features/builder-v2/lib/schema";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body?.fragment) {
    return NextResponse.json({ error: "fragment required" }, { status: 400 });
  }

  const parsed = FragmentSchema.safeParse(body.fragment);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid fragment" }, { status: 400 });
  }

  const token = process.env.VERCEL_DEPLOY_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) {
    return NextResponse.json({ error: "VERCEL_DEPLOY_TOKEN not configured" }, { status: 500 });
  }

  try {
    // 1. Create sandbox and build
    const sandbox = await createSandbox(parsed.data);

    // 2. Run vite build inside sandbox
    const { Sandbox } = await import("@e2b/code-interpreter");
    const sb = await Sandbox.connect(sandbox.sandboxId);
    await sb.commands.run("npx vite build", { timeoutMs: 60_000 });

    // 3. Read built files from dist/ recursively (vite build outputs dist/index.html + dist/assets/*.js + dist/assets/*.css)
    const fileUploads: { file: string; data: string }[] = [];

    async function collectFiles(dir: string, prefix: string) {
      const entries = await sb.files.list(dir);
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`;
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.type === "directory") {
          await collectFiles(fullPath, relativePath);
        } else {
          const content = await sb.files.read(fullPath);
          fileUploads.push({ file: relativePath, data: content });
        }
      }
    }

    await collectFiles("dist", "");

    // 4. Deploy to Vercel
    const deployBody = {
      name: "bridges-tools",
      files: fileUploads.map((f) => ({
        file: f.file,
        data: Buffer.from(f.data).toString("base64"),
        encoding: "base64",
      })),
      projectSettings: {
        framework: null,
      },
      ...(teamId ? { teamId } : {}),
    };

    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deployBody),
    });

    if (!deployRes.ok) {
      const err = await deployRes.text();
      return NextResponse.json({ error: `Deploy failed: ${err}` }, { status: 502 });
    }

    const deployment = await deployRes.json();
    const url = `https://${deployment.url}`;

    return NextResponse.json({ url, deploymentId: deployment.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

Note: This is a first implementation. The Vercel Deploy API file upload flow may need adjustment based on their actual API response format. Test manually after implementing.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors (route compiles).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/publish/route.ts
git commit -m "feat: add Vercel Deploy API route for publishing tools"
```

---

### Task 18: Publish Button + Flow in Header

**Depends on:** Task 1 Step 4 (the `update` mutation must accept `publishedUrl`).

**Files:**
- Create: `src/features/builder-v2/components/publish-dialog.tsx`
- Modify: `src/features/builder-v2/components/builder-header.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

- [ ] **Step 1: Create PublishDialog component**

Shows progress during publish, then the permanent URL on success.

```tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";

type PublishDialogProps = {
  open: boolean;
  onClose: () => void;
  onPublish: () => Promise<string | null>;
  publishedUrl?: string | null;
};

export function PublishDialog({ open, onClose, onPublish, publishedUrl: existingUrl }: PublishDialogProps) {
  const [status, setStatus] = useState<"idle" | "building" | "uploading" | "done" | "error">("idle");
  const [url, setUrl] = useState(existingUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setStatus("building");
    setTimeout(() => setStatus("uploading"), 2000);
    try {
      const result = await onPublish();
      if (result) {
        setUrl(result);
        setStatus("done");
      } else {
        setError("Publish failed. Please try again.");
        setStatus("error");
      }
    } catch {
      setError("Publish failed. Please try again.");
      setStatus("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <motion.div
        className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {status === "idle" && (
          <div className="flex flex-col items-center gap-4">
            <MaterialIcon icon="rocket_launch" size="lg" className="text-primary" />
            <h3 className="text-lg font-bold font-headline">Publish your tool</h3>
            <p className="text-sm text-on-surface-variant text-center">
              This creates a permanent link anyone can use — no account needed.
            </p>
            <Button className="w-full" onClick={handlePublish} type="button">
              {existingUrl ? "Update Published Version" : "Publish Now"}
            </Button>
          </div>
        )}

        {(status === "building" || status === "uploading") && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-on-surface">
              {status === "building" ? "Building your tool..." : "Uploading to the web..."}
            </p>
          </div>
        )}

        {status === "done" && url && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <MaterialIcon icon="check_circle" size="md" className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold font-headline">Your tool is live!</h3>
            <input
              type="text"
              readOnly
              value={url}
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-container border border-surface-container-high text-center"
            />
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(url)}
                type="button"
              >
                Copy Link
              </Button>
              <Button asChild className="flex-1">
                <a href={url} target="_blank" rel="noopener noreferrer">Open</a>
              </Button>
            </div>
            <button className="text-sm text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button">
              Done
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <MaterialIcon icon="error" size="lg" className="text-error" />
            <p className="text-sm text-error">{error}</p>
            <Button className="w-full" onClick={handlePublish} type="button">
              Try Again
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Add Publish button to header**

In `builder-header.tsx`, add `onPublish?: () => void` and `publishedUrl?: string | null` to props.

Add Publish/Update button:
```tsx
{hasProject && onPublish && (
  <button
    className="flex items-center gap-2 px-4 py-1.5 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm active:scale-95 min-h-[36px]"
    type="button"
    onClick={onPublish}
  >
    <span className="text-sm font-bold">{publishedUrl ? "Update" : "Publish"}</span>
  </button>
)}
```

- [ ] **Step 3: Wire publish flow in builder page**

Add state + handler:
```tsx
const [showPublishDialog, setShowPublishDialog] = useState(false);

const handlePublish = async (): Promise<string | null> => {
  if (!fragment || !projectId) return null;
  try {
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment }),
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    await updateProject({ projectId, publishedUrl: url });
    return url;
  } catch {
    return null;
  }
};
```

Note: The `updateProject` mutation already accepts `publishedUrl` thanks to Task 1 Step 4.

- [ ] **Step 4: Verify and commit**

```bash
git add src/features/builder-v2/components/publish-dialog.tsx src/features/builder-v2/components/builder-header.tsx src/app/\(app\)/builder/page.tsx convex/projects.ts
git commit -m "feat(ux): add Publish button with Vercel deploy flow

Publish button in header triggers Vercel Deploy API. Shows progress
(Building... → Uploading... → Live!). Returns permanent URL.
Button changes to 'Update' after first publish."
```

---

### Task 19: Share Dialog Upgrade

**Files:**
- Modify: `src/features/sharing/components/share-dialog.tsx`

- [ ] **Step 1: Add Tabs to share dialog**

Add `publishedUrl?: string | null` to `ShareDialogProps`.

Replace dialog content with shadcn Tabs:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
```

Tab 1 "Preview Link": existing QR + URL behavior.
Tab 2 "Published Link" (shown only when `publishedUrl` exists): QR + permanent URL + Open button.

- [ ] **Step 2: Pass publishedUrl from builder page**

```tsx
<ShareDialog
  ...
  publishedUrl={projectData?.publishedUrl}
/>
```

- [ ] **Step 3: Verify and commit**

```bash
git add src/features/sharing/components/share-dialog.tsx src/app/\(app\)/builder/page.tsx
git commit -m "feat(ux): add Published Link tab to share dialog"
```

---

## Group F: Final Cleanup

### Task 20: Register E2B Template + Integration Test

**Files:**
- `e2b-templates/vite-therapy/`

- [ ] **Step 1: Register the template with E2B**

From the template directory:
```bash
cd e2b-templates/vite-therapy && npm install && cd ../..
e2b template create --name vite-therapy --path e2b-templates/vite-therapy
```

Save the template ID to `.env.local` as `E2B_VITE_THERAPY_TEMPLATE_ID`.

- [ ] **Step 2: Update e2b.ts to use template ID if available**

If `E2B_VITE_THERAPY_TEMPLATE_ID` is set, use it. Otherwise fall back to template name.

- [ ] **Step 3: End-to-end manual test**

1. Start dev: `npm run dev`
2. Open builder, type "Build a 5-star token board"
3. Select "Save on this device" in persistence sheet
4. Verify: tool generates, all stars clickable, celebration plays
5. Type "make the stars bigger" — verify live iteration (no full refresh)
6. Click undo — verify previous version restores
7. Click responsive picker — verify Phone/Tablet/Computer
8. Click dark mode toggle — verify all surfaces invert
9. Click Share — verify QR + link
10. Click Publish — verify Vercel deploy
11. Open published URL — verify tool works
12. Refresh page with ?project=id — verify messages restore
13. Click New — verify confirmation dialog
14. Go to My Tools — verify project appears

- [ ] **Step 4: Final commit**

```bash
git add .env.local src/features/builder-v2/lib/e2b.ts
git commit -m "feat: register vite-therapy E2B template + integration verification"
```

---

## Verification Fixes Applied

Fixes from `docs/superpowers/plans/2026-03-24-bridges-ux-overhaul-VERIFICATION.md` applied on 2026-03-24:

| ID | Severity | Fix Applied |
|----|----------|-------------|
| A1 | CRITICAL | Task 18 Step 1: Replaced all `.btn-primary`/`.btn-secondary` CSS classes with shadcn `<Button>` and `<Button variant="outline">`. Added `Button` import. |
| A2 | WARNING | Task 2 Step 2: Changed `"framer-motion": "^12.0.0"` to `"motion": "^12.0.0"` in template package.json. |
| W1 | WARNING | Task 1: Added new Step 4 to update existing `update` mutation with `persistence` and `publishedUrl` args. Task 10 Step 2: `handlePersistenceSelect` now saves persistence to Convex. |
| W2 | WARNING | Task 18 Step 3: Removed `as any` cast on `updateProject` call. Added dependency note on Task 1 Step 4. Updated note to reference Task 1 Step 4. |
| D1 | WARNING | Task 17: Added Step 0 for `VERCEL_DEPLOY_TOKEN` and `VERCEL_TEAM_ID` env var setup. |
| L1 | WARNING | File Structure table: Removed phantom `tailwind.config.ts` row (Tailwind v4 uses CSS-based config). |
| L2 | SUGGESTION | Task 13 Steps 1-2: Replaced "old plan" references with specific file path and task/step numbers. |

---

## Verification Checklist

### UI Cleanup
- [ ] Zero stub buttons — every visible button does something
- [ ] Zero developer jargon — no "component", "code", "API", "sandbox" visible

### Core Features
- [ ] Persistence choice appears before first build
- [ ] Undo restores previous version + toast
- [ ] Messages persist across page refresh
- [ ] Responsive preview (Phone/Tablet/Computer)
- [ ] Dark mode toggles all surfaces

### Generation Quality
- [ ] Generated tools use therapy-ui.css classes
- [ ] All buttons in generated tools work first-try
- [ ] Celebrations animate on completion events

### Interaction Feedback
- [ ] Confetti on first generation
- [ ] Live iteration — no loading carousel on edits
- [ ] Download shows toast
- [ ] New shows confirmation dialog
- [ ] Delete uses AlertDialog
- [ ] Errors show retry button

### Publish & Share
- [ ] Publish creates permanent Vercel URL
- [ ] Update re-deploys to same URL
- [ ] Share dialog has Preview + Published tabs
- [ ] Share link boots sandbox on-demand

### Build Integrity
- [ ] `npm run build` exits 0
- [ ] `npm run test:run` passes
- [ ] `npx convex dev --once` deploys schema
