# Bridges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Bridges therapy tool builder MVP for the Springfield Vibeathon (March 23–27, 2026) — a web app where parents and therapists describe therapy tools in plain language and get working, interactive tools built by AI.

**Architecture:** Three-layer design — Google Stitch generates all visuals, open-source libraries handle interactive behavior (@assistant-ui/react for chat, dnd-kit for drag/drop, motion for animations), and Convex + AI handles the data layer (Convex Agent for chat threads, RAG for therapy knowledge, Claude for tool generation). Tool configs are Zod schemas validated at runtime.

**Tech Stack:** Next.js (App Router) + Convex + @convex-dev/agent + @ai-sdk/anthropic + shadcn/ui + @assistant-ui/react + Tailwind v4 + Zod + @dnd-kit/react + motion + zustand + ElevenLabs TTS

**Spec:** `docs/superpowers/specs/2026-03-23-library-optimized-bridges-design.md`

**Key references:**
- `docs/architecture/project-structure.md` — VSA file tree
- `docs/architecture/data-models.md` — Convex schema + tool config types
- `docs/architecture/dependencies.md` — all packages and install commands
- `docs/design/design-tokens.md` — colors, typography, component styles
- `docs/ai/prompt-library.md` — system prompt, tool schemas, model config

---

## Phase 0: Foundation & Setup

**Goal:** Running Next.js app with Convex backend, all dependencies installed, design tokens, base layout, testing infrastructure.

**Estimated time:** 2-3 hours

---

### Task 1: Initialize Next.js project and GitHub repo

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `README.md`

- [ ] **Step 1: Create Next.js project**

```bash
npx create-next-app@latest bridges --typescript --tailwind --app --src-dir --no-import-alias
cd bridges
```

- [ ] **Step 2: Create GitHub repo and push**

```bash
gh repo create bridges --public --source=. --remote=origin
git add -A
git commit -m "chore: initialize Next.js project"
git push -u origin main
```

- [ ] **Step 3: Configure Tailwind v4 design tokens**

Overwrite `src/app/globals.css` with the full theme from `docs/design/design-tokens.md` — includes `@import "tailwindcss"`, `@theme` block with all color/typography/radius tokens, and Inter font import.

- [ ] **Step 4: Verify**

```bash
npm run dev
# Visit http://localhost:3000 — should show default page with Inter font
```

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add Tailwind v4 design tokens"
```

---

### Task 2: Install all dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
# Core
npm install next react react-dom convex typescript

# AI
npm install ai @ai-sdk/anthropic @ai-sdk/google @google/genai elevenlabs @fal-ai/client

# Convex ecosystem
npm install convex-helpers @convex-dev/agent @convex-dev/rag @convex-dev/rate-limiter

# UI
npm install class-variance-authority clsx tailwind-merge lucide-react

# Chat UI (NEW — from spec)
npm install @assistant-ui/react

# Interaction
npm install @dnd-kit/react motion react-qr-code use-sound zustand

# Forms & validation
npm install react-hook-form @hookform/resolvers zod @t3-oss/env-nextjs

# Utilities
npm install nanoid sonner

# Error handling (NEW — from spec)
npm install react-error-boundary

# Hooks (NEW — from spec)
npm install usehooks-ts

# Markdown (NEW — from spec)
npm install react-markdown remark-gfm
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom convex-test @playwright/test @clerk/testing msw @faker-js/faker @types/react @types/node eslint eslint-config-next prettier prettier-plugin-tailwindcss eslint-plugin-simple-import-sort @next/bundle-analyzer tailwindcss
```

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install
```

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install all dependencies"
```

---

### Task 3: Initialize Convex with Agent and RAG components

**Files:**
- Create: `convex/_generated/`, `convex/schema.ts`, `convex.config.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Initialize Convex**

```bash
npm create convex@latest
```

- [ ] **Step 2: Create `convex.config.ts`**

```typescript
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import rag from "@convex-dev/rag/convex.config";

const app = defineApp();
app.use(agent);
app.use(rag);

export default app;
```

- [ ] **Step 3: Create `convex/schema.ts`**

Copy the full schema from `docs/architecture/data-models.md` — tools table (with indexes by_thread, by_share_slug, by_template, by_created), knowledgeBase table (with 768-dim vector index), ttsCache table. No conversations table — Convex Agent manages that.

- [ ] **Step 4: Create `src/core/providers.tsx`**

```typescript
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

- [ ] **Step 5: Wrap app with Providers in `src/app/layout.tsx`**

Import and wrap `{children}` with `<Providers>`.

- [ ] **Step 6: Verify Convex starts**

```bash
npx convex dev
# Schema should deploy without errors
```

- [ ] **Step 7: Commit**

```bash
git add convex/ src/core/providers.tsx src/app/layout.tsx convex.config.ts
git commit -m "feat: initialize Convex with Agent and RAG components"
```

---

### Task 4: Install and configure shadcn/ui

**Files:**
- Create: `components.json`, `src/core/utils.ts`, `src/shared/components/ui/`

- [ ] **Step 1: Initialize shadcn**

```bash
npx shadcn@latest init
```

Configure component output to `src/shared/components/ui/`.

- [ ] **Step 2: Create `src/core/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Add base + new shadcn components**

```bash
npx shadcn@latest add button card input dialog sheet tabs popover label sonner scroll-area resizable skeleton checkbox toggle-group
```

- [ ] **Step 4: Verify by importing a Button**

Add a `<Button>` to `src/app/page.tsx`, check it renders with correct styling.

- [ ] **Step 5: Commit**

```bash
git add components.json src/core/utils.ts src/shared/
git commit -m "feat: configure shadcn/ui with all required components"
```

---

### Task 5: Configure environment variables

**Files:**
- Create: `.env.local`, `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `.env.example`**

```env
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
ELEVENLABS_API_KEY=
FAL_KEY=
```

- [ ] **Step 2: Create `.env.local` with actual values**

Populate from Bitwarden/vault. Ensure `.env.local` is in `.gitignore`.

- [ ] **Step 3: Set Convex env vars**

```bash
npx convex env set ANTHROPIC_API_KEY <value>
npx convex env set GOOGLE_API_KEY <value>
npx convex env set ELEVENLABS_API_KEY <value>
npx convex env set FAL_KEY <value>
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add env var template"
```

---

### Task 6: Create VSA directory structure and base layout

**Files:**
- Create: `src/core/config.ts`, `src/shared/components/header.tsx`, `src/features/builder/`, `src/features/therapy-tools/`, `src/features/knowledge/`, `src/features/landing/`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create VSA directories**

```bash
mkdir -p src/core src/shared/components src/features/builder/components/chat src/features/builder/hooks src/features/therapy-tools/components src/features/therapy-tools/types src/features/therapy-tools/data src/features/knowledge/data src/features/landing/components
```

- [ ] **Step 2: Design header and layout in Google Stitch**

Use Stitch to generate: root layout shell (full-height flex column, bg-background), header (Bridges logo text, nav links: Builder, Templates, My Tools), mobile-responsive header with Sheet menu. Export React components.

- [ ] **Step 3: Integrate Stitch output**

Place Stitch-generated header in `src/shared/components/header.tsx`. Update `src/app/layout.tsx` with Inter font, Providers, Toaster from sonner, Header.

- [ ] **Step 4: Verify layout is responsive**

```bash
npm run dev
# Check at 375px, 768px, 1280px
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: create VSA structure and base layout with header"
```

---

### Task 7: Create builder page with resizable split panels

**Files:**
- Create: `src/app/builder/page.tsx`, `src/features/builder/components/builder-layout.tsx`

- [ ] **Step 1: Create builder layout using shadcn Resizable**

```typescript
// src/features/builder/components/builder-layout.tsx
"use client";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/shared/components/ui/resizable";
import { useMediaQuery } from "usehooks-ts";

export function BuilderLayout({
  chatPanel,
  previewPanel,
}: {
  chatPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    // Stack vertically on mobile — chat on top, preview below
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {chatPanel}
        {previewPanel}
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-64px)]">
      <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
        {chatPanel}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={65}>
        {previewPanel}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

- [ ] **Step 2: Create thin page wrapper**

```typescript
// src/app/builder/page.tsx
import { BuilderLayout } from "@/features/builder/components/builder-layout";

export default function BuilderPage() {
  return (
    <BuilderLayout
      chatPanel={<div className="p-4 text-muted">Chat coming soon</div>}
      previewPanel={<div className="p-4 text-muted">Preview coming soon</div>}
    />
  );
}
```

- [ ] **Step 3: Verify responsive behavior**

```bash
npm run dev
# /builder: split panels on desktop, stacked on mobile
```

- [ ] **Step 4: Commit**

```bash
git add src/app/builder/ src/features/builder/
git commit -m "feat: builder page with resizable split panels"
```

---

### Task 8: Create placeholder pages for all routes

**Files:**
- Create: `src/app/tool/[toolId]/page.tsx`, `src/app/templates/page.tsx`, `src/app/my-tools/page.tsx`

- [ ] **Step 1: Create placeholder pages**

Each page: centered heading, < 20 lines. `/tool/[toolId]` extracts the `toolId` param.

- [ ] **Step 2: Verify all routes accessible**

```bash
npm run dev
# Visit /builder, /templates, /my-tools, /tool/test-123 — no 404s
```

- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "feat: add placeholder pages for all routes"
```

---

### Task 9: Set up testing infrastructure

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `src/test/setup.ts`, `src/test/mocks/handlers.ts`, `src/test/mocks/server.ts`, `tests/e2e/smoke.spec.ts`, `src/env.ts`

- [ ] **Step 1: Create Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Create test setup**

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 3: Create MSW mock handlers**

`src/test/mocks/handlers.ts` — mock handlers for Claude API, Google Embeddings, ElevenLabs. `src/test/mocks/server.ts` — MSW setup for Vitest.

- [ ] **Step 4: Create Playwright config**

Configure with `webServer` pointing to `npm run dev`, test dir `tests/e2e/`, chromium + webkit.

- [ ] **Step 5: Create env validation with Zod**

```typescript
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    ANTHROPIC_API_KEY: z.string().min(1),
    GOOGLE_API_KEY: z.string().min(1),
    ELEVENLABS_API_KEY: z.string().min(1),
    FAL_KEY: z.string().min(1),
    CONVEX_DEPLOYMENT: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  },
  runtimeEnv: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    FAL_KEY: process.env.FAL_KEY,
  },
});
```

- [ ] **Step 6: Create smoke E2E test**

```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
```

- [ ] **Step 7: Add scripts to package.json**

```json
"test": "vitest",
"test:run": "vitest run",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 8: Configure Prettier + ESLint**

Add `prettier-plugin-tailwindcss` with `tailwindStylesheet: "./src/app/globals.css"`. Add `eslint-plugin-simple-import-sort`.

- [ ] **Step 9: Verify**

```bash
npm test -- --run  # Vitest passes
npx playwright test  # E2E passes
npm run build  # Build succeeds with env validation
```

- [ ] **Step 10: Commit**

```bash
git add vitest.config.ts playwright.config.ts src/test/ src/env.ts tests/ package.json .prettierrc
git commit -m "feat: testing infrastructure (Vitest, Playwright, MSW, env validation)"
```

---

### Task 10: Set up GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Create CI workflow**

Triggered on push to any branch and PRs to main: checkout → setup Node → npm ci → lint → type check → unit tests → install Playwright → E2E tests → upload Playwright report.

- [ ] **Step 2: Create deploy workflow**

Triggered on push to main: all CI steps + `npx convex deploy`. Vercel auto-deploys via GitHub integration.

- [ ] **Step 3: Add GitHub secrets**

Add `CONVEX_DEPLOY_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `ELEVENLABS_API_KEY` as repo secrets.

- [ ] **Step 4: Verify**

```bash
git push  # Confirm CI runs and passes
```

- [ ] **Step 5: Commit and push Phase 0 branch**

```bash
git checkout -b phase-0/foundation-and-setup
git push -u origin phase-0/foundation-and-setup
gh pr create --title "Phase 0: Foundation & Setup" --body "Foundation, dependencies, layout, testing infra"
```

---

## Phase 1: AI Chat & Tool Generation Core

**Goal:** Working conversational AI builder — user types a description, AI generates a therapy tool config, live preview renders. The magic moment works end-to-end.

**Estimated time:** 3-4 hours

**Read first:** `docs/architecture/data-models.md`, `docs/ai/prompt-library.md`, `docs/architecture/api-spec.md`

---

### Task 11: Define tool config Zod schemas

**Files:**
- Create: `src/features/therapy-tools/types/tool-configs.ts`

- [ ] **Step 1: Write Zod schemas for all 5 tool types**

Define `VisualScheduleSchema`, `TokenBoardSchema`, `CommunicationBoardSchema`, `ChoiceBoardSchema`, `FirstThenBoardSchema` using Zod. Infer TypeScript types with `z.infer<>`. Export the union type `ToolConfigSchema` and `ToolConfig` type. Include all fields from `docs/architecture/data-models.md` > Tool Config Types.

```typescript
import { z } from "zod";

export const VisualScheduleSchema = z.object({
  type: z.literal("visual-schedule"),
  title: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string(),
    completed: z.boolean().default(false),
  })),
  orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
  showCheckmarks: z.boolean().default(true),
  theme: z.string().default("default"),
});
export type VisualScheduleConfig = z.infer<typeof VisualScheduleSchema>;

// ... same pattern for TokenBoard, CommunicationBoard, ChoiceBoard, FirstThenBoard

export const ToolConfigSchema = z.discriminatedUnion("type", [
  VisualScheduleSchema,
  TokenBoardSchema,
  CommunicationBoardSchema,
  ChoiceBoardSchema,
  FirstThenBoardSchema,
]);
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/therapy-tools/types/
git commit -m "feat: Zod schemas for all tool config types"
```

---

### Task 12: Define the Bridges agent with Convex Agent

**Files:**
- Create: `convex/agents/bridges.ts`

- [ ] **Step 1: Create agent definition**

Read `docs/ai/prompt-library.md` § Builder Agent System Prompt for the full system prompt. Read § AI SDK Tool Definitions for tool schemas.

```typescript
// convex/agents/bridges.ts
"use node";

import { Agent, createTool } from "@convex-dev/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { components } from "../_generated/api";
import { z } from "zod";

export const bridgesAgent = new Agent(components.agent, {
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: `...`, // Full system prompt from docs/ai/prompt-library.md
  tools: {
    createTool: createTool({
      description: "Create a new therapy tool from a configuration",
      args: z.object({
        title: z.string(),
        description: z.string(),
        toolType: z.enum(["visual-schedule", "token-board", "communication-board", "choice-board", "first-then-board"]),
        config: z.any(),
      }),
      handler: async (ctx, args) => {
        // Mutation to save tool to database
      },
    }),
    // updateTool, searchKnowledge tools...
  },
});
```

- [ ] **Step 2: Verify compilation**

```bash
npx convex dev  # Should compile without errors
```

- [ ] **Step 3: Commit**

```bash
git add convex/agents/
git commit -m "feat: Bridges agent definition with Convex Agent"
```

---

### Task 13: Build Convex tool CRUD functions

**Files:**
- Create: `convex/tools.ts`

- [ ] **Step 1: Implement CRUD functions**

Per `docs/architecture/api-spec.md`: `tools.get`, `tools.getBySlug`, `tools.list`, `tools.create`, `tools.update`, `tools.remove`. Use nanoid (10 chars) for share slugs. All functions use `v` validators on args. Named exports only.

- [ ] **Step 2: Write backend tests**

```typescript
// convex/__tests__/tools.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

test("tools.create generates a share slug", async () => {
  const t = convexTest(schema);
  const toolId = await t.run(api.tools.create, {
    title: "Morning Routine",
    description: "Visual schedule for morning",
    toolType: "visual-schedule",
    config: { type: "visual-schedule", title: "Morning", steps: [], orientation: "vertical", showCheckmarks: true, theme: "default" },
  });
  const tool = await t.run(api.tools.get, { toolId });
  expect(tool?.shareSlug).toHaveLength(10);
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --run convex/__tests__/tools.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add convex/tools.ts convex/__tests__/
git commit -m "feat: tool CRUD functions with tests"
```

---

### Task 14: Build Convex Agent streaming actions

**Files:**
- Create: `convex/chat/streaming.ts`

- [ ] **Step 1: Create streaming functions**

Per Convex Agent docs:
- `initiateStreaming` mutation — saves user message, schedules async stream
- `streamAsync` internal action — calls `bridgesAgent.streamText()` with `saveStreamDeltas: true`
- `listThreadMessages` query — uses `listUIMessages` + `syncStreams` for real-time message display
- `createThread` mutation — creates a new Convex Agent thread

- [ ] **Step 2: Verify with Convex dashboard**

```bash
npx convex dev
# Call initiateStreaming with a test prompt via dashboard
```

- [ ] **Step 3: Commit**

```bash
git add convex/chat/
git commit -m "feat: Convex Agent streaming actions"
```

---

### Task 15: Wire chat UI with @assistant-ui/react

**Files:**
- Create: `src/features/builder/components/chat/bridges-chat.tsx`
- Modify: `src/app/globals.css` (add assistant-ui theme overrides)

- [ ] **Step 1: Verify @assistant-ui/react ExternalStoreRuntime API**

Check the current docs at https://www.assistant-ui.com/ for the ExternalStoreRuntime API. The 0.12.x API may differ from what's in the spec. Adapt the code below if needed.

- [ ] **Step 2: Create bridges-chat component**

```typescript
// src/features/builder/components/chat/bridges-chat.tsx
"use client";

import { useExternalStoreRuntime, AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react/ui";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function BridgesChat({ threadId }: { threadId: string | null }) {
  // Wire to Convex Agent's useUIMessages
  // convertMessage maps Convex message format to ThreadMessageLike
  // onNew calls initiateStreaming mutation
  // See spec for full implementation
}
```

- [ ] **Step 3: Theme assistant-ui to match design tokens**

Add `aui-*` CSS overrides in `globals.css`:
- User messages: `bg-primary text-white rounded-2xl rounded-br-sm`
- Assistant messages: `bg-surface-raised text-foreground rounded-2xl rounded-bl-sm`

- [ ] **Step 4: Verify chat renders**

```bash
npm run dev
# /builder: chat panel should show empty state from assistant-ui
```

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/chat/ src/app/globals.css
git commit -m "feat: chat UI with @assistant-ui/react + Convex Agent"
```

---

### Task 16: Build tool renderer with error boundary

**Files:**
- Create: `src/features/therapy-tools/components/tool-renderer.tsx`

- [ ] **Step 1: Create tool renderer**

```typescript
// src/features/therapy-tools/components/tool-renderer.tsx
"use client";

import { ErrorBoundary } from "react-error-boundary";
import { ToolConfigSchema, type ToolConfig } from "../types/tool-configs";

function ToolRendererInner({ config }: { config: unknown }) {
  const result = ToolConfigSchema.safeParse(config);
  if (!result.success) {
    return <div className="p-8 text-center text-muted">This tool couldn't be displayed.</div>;
  }

  switch (result.data.type) {
    case "visual-schedule":
      return <div className="p-4">Visual Schedule: {result.data.title}</div>;
    case "token-board":
      return <div className="p-4">Token Board: {result.data.title}</div>;
    case "communication-board":
      return <div className="p-4">Communication Board: {result.data.title}</div>;
    default:
      return <div className="p-4 text-muted">Tool type coming soon</div>;
  }
}

export function ToolRenderer({ config }: { config: unknown }) {
  return (
    <ErrorBoundary fallback={<div className="p-8 text-center text-muted">This tool couldn't be displayed.</div>}>
      <ToolRendererInner config={config} />
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: Write test**

```typescript
// src/features/therapy-tools/components/__tests__/tool-renderer.test.tsx
import { render, screen } from "@testing-library/react";
import { ToolRenderer } from "../tool-renderer";

test("renders placeholder for visual-schedule config", () => {
  render(<ToolRenderer config={{ type: "visual-schedule", title: "Test", steps: [], orientation: "vertical", showCheckmarks: true, theme: "default" }} />);
  expect(screen.getByText(/Visual Schedule: Test/)).toBeInTheDocument();
});

test("shows error for invalid config", () => {
  render(<ToolRenderer config={{ type: "invalid" }} />);
  expect(screen.getByText(/couldn't be displayed/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --run src/features/therapy-tools/components/__tests__/
```

- [ ] **Step 4: Commit**

```bash
git add src/features/therapy-tools/components/
git commit -m "feat: tool renderer with Zod validation and error boundary"
```

---

### Task 17: Build tool preview panel

**Files:**
- Create: `src/features/builder/components/tool-preview.tsx`

- [ ] **Step 1: Create preview panel**

Subscribe to current tool via `useQuery(api.tools.get, { toolId })`. Pass config to `ToolRenderer`. Show `<Skeleton>` while loading. Show "Your tool will appear here" when no tool exists. Use `motion` for fade-in transition.

- [ ] **Step 2: Commit**

```bash
git add src/features/builder/components/tool-preview.tsx
git commit -m "feat: tool preview panel with Skeleton loading"
```

---

### Task 18: Wire builder page end-to-end

**Files:**
- Create: `src/features/builder/hooks/use-builder-state.ts`
- Modify: `src/app/builder/page.tsx`, `src/features/builder/components/builder-layout.tsx`

- [ ] **Step 1: Create builder state hook**

```typescript
// src/features/builder/hooks/use-builder-state.ts
import { create } from "zustand";

interface BuilderState {
  threadId: string | null;
  toolId: string | null;
  setThreadId: (id: string) => void;
  setToolId: (id: string) => void;
}

export const useBuilderState = create<BuilderState>((set) => ({
  threadId: null,
  toolId: null,
  setThreadId: (id) => set({ threadId: id }),
  setToolId: (id) => set({ toolId: id }),
}));
```

- [ ] **Step 2: Wire builder page**

Connect: BridgesChat → sends message → Convex Agent processes → calls createTool → tool saved → tool-preview subscribes and renders.

- [ ] **Step 3: Verify end-to-end flow**

```bash
npm run dev
# Type "make me a visual schedule for morning routine"
# AI should respond, generate tool, preview should update
```

- [ ] **Step 4: Commit and push Phase 1 branch**

```bash
git add src/features/builder/ src/app/builder/
git commit -m "feat: wire builder end-to-end (chat → agent → tool → preview)"
git checkout -b phase-1/ai-chat-and-tool-generation
git push -u origin phase-1/ai-chat-and-tool-generation
gh pr create --title "Phase 1: AI Chat & Tool Generation Core" --body "Magic moment works end-to-end"
```

---

## Phase 2: Therapy Tool Components (3 Core Tools)

**Goal:** Communication board (with TTS), token board, and visual schedule — all interactive, rendered from configs. AI-generated picture cards.

**Estimated time:** 3-4 hours

**Read first:** `docs/architecture/data-models.md` (config shapes), `docs/design/design-tokens.md` (component styles), `docs/ai/prompt-library.md` § ElevenLabs TTS

---

### Task 19: Build visual schedule component

**Files:**
- Create: `src/features/therapy-tools/components/visual-schedule.tsx`

- [ ] **Step 1: Design in Google Stitch** — visual states: empty, with steps, step completed
- [ ] **Step 2: Export Stitch components and integrate**
- [ ] **Step 3: Wire dnd-kit `useSortable` for drag-to-reorder steps**
- [ ] **Step 4: Wire motion for check animation on tap**
- [ ] **Step 5: Write test** — renders from config, tap toggles completed, drag reorders
- [ ] **Step 6: Commit**

---

### Task 20: Build token board component

**Files:**
- Create: `src/features/therapy-tools/components/token-board.tsx`

- [ ] **Step 1: Design in Google Stitch** — visual states: empty, partially earned, all earned, reinforcer selection
- [ ] **Step 2: Export Stitch components and integrate**
- [ ] **Step 3: Create zustand store** — `earnedTokens`, `earnToken()`, `reset()`
- [ ] **Step 4: Wire motion for scale-in earn animation and reinforcer entrance**
- [ ] **Step 5: Write test** — renders from config, earn all tokens, select reinforcer, reset
- [ ] **Step 6: Commit**

---

### Task 21: Build communication board component (without TTS initially)

**Files:**
- Create: `src/features/therapy-tools/components/communication-board.tsx`

- [ ] **Step 1: Design in Google Stitch** — picture card grid, sentence strip, play button
- [ ] **Step 2: Export Stitch components and integrate**
- [ ] **Step 3: Wire dnd-kit for card reordering**
- [ ] **Step 4: Wire motion for card tap feedback**
- [ ] **Step 5: Implement sentence builder** — tap card → add label to sentence strip, clear button
- [ ] **Step 6: Write test** — renders cards, tap to build sentence, clear works
- [ ] **Step 7: Commit**

---

### Task 22: Update tool renderer to use real components

**Files:**
- Modify: `src/features/therapy-tools/components/tool-renderer.tsx`

- [ ] **Step 1: Replace placeholders with `React.lazy` dynamic imports**

Note: `React.lazy` requires default exports, but CLAUDE.md says "never default export." Use a re-export wrapper pattern:

```typescript
const VisualSchedule = lazy(() =>
  import("./visual-schedule").then((m) => ({ default: m.VisualSchedule }))
);
const TokenBoard = lazy(() =>
  import("./token-board").then((m) => ({ default: m.TokenBoard }))
);
const CommunicationBoard = lazy(() =>
  import("./communication-board").then((m) => ({ default: m.CommunicationBoard }))
);
```

- [ ] **Step 2: Wrap each in Suspense + ErrorBoundary**
- [ ] **Step 3: Update tests**
- [ ] **Step 4: Verify all 3 types render from builder preview**
- [ ] **Step 5: Commit**

---

### Task 23: Implement AI image generation action

**Files:**
- Create: `convex/ai.ts`

- [ ] **Step 1: Create `ai.generateImage` action**

`"use node";` directive. Check file storage cache by prompt hash → if miss, call Google Gemini API (`gemini-3-pro-image-preview`) → store in Convex file storage → return URL. Fallback to `@fal-ai/client`.

- [ ] **Step 2: Verify**

```bash
# Call via Convex dashboard with "goldfish crackers"
```

- [ ] **Step 3: Commit**

---

### Task 24: Implement ElevenLabs TTS action

**Files:**
- Modify: `convex/ai.ts`

- [ ] **Step 1: Create `ai.generateSpeech` action**

Check ttsCache → if miss, call ElevenLabs with warm child-appropriate voice → store audio in Convex file storage → cache in ttsCache → return URL.

- [ ] **Step 2: Verify with test phrase**
- [ ] **Step 3: Commit**

---

### Task 25: Wire TTS and images into communication board

**Files:**
- Modify: `src/features/therapy-tools/components/communication-board.tsx`

- [ ] **Step 1: Wire play button** — build sentence → call `ai.generateSpeech` → play via `use-sound`
- [ ] **Step 2: Wire AI images** — if config has `imageUrl`, display via `next/image`; fallback to Lucide icon
- [ ] **Step 3: Handle loading states with Skeleton**
- [ ] **Step 4: Verify TTS plays and images display**
- [ ] **Step 5: Commit and push Phase 2 branch**

---

## Phase 3: RAG Knowledge Base & Templates

**Goal:** AI understands therapy terminology via Convex RAG. Templates available for quick starts.

**Estimated time:** 2-3 hours

**Read first:** `docs/ai/prompt-library.md` (RAG content categories, knowledge base format)

---

### Task 26: Create therapy knowledge content

**Files:** `src/features/knowledge/data/therapy-knowledge.ts`

- [ ] Write 100+ knowledge entries across 5 categories (aba-terminology, speech-therapy, tool-patterns, developmental-milestones, iep-goals). Each: title, content (2-5 sentences), category.
- [ ] Commit

### Task 27: Set up Convex RAG and seed knowledge

**Files:** `convex/knowledge.ts`

- [ ] Initialize RAG component with Google `gemini-embedding-001`. Create idempotent seed action. Run seed.
- [ ] Verify entries are searchable in Convex dashboard.
- [ ] Commit

### Task 28: Wire RAG into Bridges agent

**Files:** `convex/agents/bridges.ts`

- [ ] Update `searchKnowledge` tool to use RAG component search.
- [ ] Verify: ask for "a DTT data sheet" — AI should understand discrete trial training.
- [ ] Commit

### Task 29: Wire image generation into agent

**Files:** `convex/agents/bridges.ts`

- [ ] Add `generateImage` tool. When AI generates a communication board, automatically call for each card.
- [ ] Verify: "snack request board with goldfish crackers" produces AI-generated images.
- [ ] Commit

### Task 30: Create templates and template gallery

**Files:** `src/features/therapy-tools/data/templates.ts`, `convex/templates.ts`, `src/app/templates/page.tsx`

- [ ] Create 6 templates (2 per category: Communication, Behavior Support, Daily Routines).
- [ ] Design template gallery page in Stitch. Wire tab categories, grid of template cards.
- [ ] Tapping a template navigates to `/builder?template=[id]` and pre-populates.
- [ ] Commit and push Phase 3 branch.

---

## Phase 4: Sharing, Persistence & My Tools

**Goal:** Tools saved, shareable via link + QR code, accessible from My Tools.

**Estimated time:** 2-3 hours

---

### Task 31: Build share dialog

**Files:** `src/shared/components/share-dialog.tsx`

- [ ] Design in Stitch. Readonly URL input + copy button (usehooks-ts `useCopyToClipboard`) + native Web Share API + QR code via `react-qr-code`. Toast via sonner.
- [ ] Commit

### Task 32: Build shared tool view page

**Files:** `src/app/tool/[toolId]/page.tsx`

- [ ] Query `tools.getBySlug`. Render tool full-width. "Build your own" CTA. Rate limiting on query.
- [ ] Commit

### Task 33: Build My Tools page

**Files:** `src/app/my-tools/page.tsx`

- [ ] Design in Stitch. Query `tools.list`. Responsive card grid. Share + delete buttons. Empty state.
- [ ] Commit

### Task 34: Wire share button into builder + persistence

**Files:** `src/features/builder/components/tool-preview.tsx`, `src/features/builder/hooks/use-builder-state.ts`

- [ ] Add floating share button on preview. Wire tool persistence into builder flow. My Tools → builder restores conversation.
- [ ] Commit

### Task 35: Write E2E test for builder flow

**Files:** `tests/e2e/builder-flow.spec.ts`

- [ ] Full Playwright E2E: type prompt → wait for tool → share → open shared link → verify renders.
- [ ] Commit and push Phase 4 branch.

---

## Phase 5: Landing Page & Polish

**Goal:** Polished landing page, error handling, loading states, responsive, accessible.

**Estimated time:** 2-3 hours

---

### Task 36: Build landing page

- [ ] Design in Stitch: hero + CTA ("Start Building" → /builder). Mobile-first.
- [ ] Commit

### Task 37: Loading states, error handling, empty states

- [ ] `shadcn Skeleton` for all loading states. `react-error-boundary` for all error boundaries.
- [ ] Brand-voice empty states ("Tell me what you need — I'll handle the technical part").
- [ ] Commit

### Task 38: Responsive and accessibility pass

- [ ] Test all pages at 375px, 768px, 1280px. Fix overflow, tap targets.
- [ ] aria-labels, alt text, keyboard nav, contrast ≥ 4.5:1, `prefers-reduced-motion`.
- [ ] Commit

### Task 39: Performance optimization

- [ ] Lazy-load therapy tools (already done). Check bundle < 250KB. Lighthouse > 80.
- [ ] Commit

### Task 40: Polish E2E tests

- [ ] Landing, templates, sharing E2E tests. Test on chromium + webkit.
- [ ] Commit and push Phase 5 branch.

---

## Phase 6: Auth & Deployment

**Goal:** Clerk auth, production deploy, demo recording.

**Estimated time:** 2-3 hours

---

### Task 41: Integrate Clerk authentication

- [ ] Add ClerkProvider. Middleware protects `/my-tools` only. JWT template for Convex.
- [ ] Commit

### Task 42: Link tools to authenticated users

- [ ] Add optional `userId` to tools schema. Filter My Tools by user. Unauthenticated tools stay public.
- [ ] Commit

### Task 43: Deploy to production

- [ ] `npx convex deploy`. Connect GitHub → Vercel. Set env vars. Seed RAG + templates on prod.
- [ ] Verify full flow on production URL.
- [ ] Commit and push Phase 6 branch.

### Task 44: Final verification and demo

- [ ] Run full test suite. Fix any failures. CI green.
- [ ] Follow `docs/demo.md` for demo recording: communication board with TTS → token board → templates.
- [ ] Submit code + video to Vibeathon platform.

---

## Stretch Goals (if time allows)

### Stretch A: Choice Board Component (~1 hour)

- [ ] Design in Stitch. Wire shadcn ToggleGroup + motion. Add to tool renderer. Test.

### Stretch B: First-Then Board Component (~1 hour)

- [ ] Design in Stitch. Wire motion transitions + `usehooks-ts` useCountdown. Add to tool renderer. Test.
