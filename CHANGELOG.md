# Changelog — Bridges

> Updated after every significant implementation, architectural decision, or discovery.
> AI coding agents: read this to understand what changed and why. Update it after completing each phase.

---

## 2026-03-23 — Project Initialization (Pre-Build)

### PLAID Intake Complete
- Product: Bridges — vibe-coding platform for ABA therapists, SLPs, and parents to build custom therapy tools
- Primary user: Parents of autistic children (James persona)
- Architecture: Config-based tool generation (AI produces JSON configs → pre-built React components render)
- Stack: Next.js + Convex + Clerk + Stripe + Vercel
- All 4 PLAID docs generated: product-vision.md, prd.md, product-roadmap.md, gtm.md

### Architecture Decisions
- **VSA adopted** — Vertical Slice Architecture with core/shared/features zones. `docs/architecture/vsa-guide.md`
- **Config-based, not code-based** — AI generates ToolConfig JSON, not arbitrary code. 5 tool types: visual-schedule, token-board, communication-board, choice-board, first-then-board.
- **Auth deferred to Phase 6** — Clerk integrated last to avoid E2E testing friction with Playwright.
- **Convex Agent adopted** — `@convex-dev/agent` replaces custom chat infrastructure (threads, messages, streaming, tool calling). Eliminates ~300 lines of custom code.
- **Nano Banana Pro for images** — AI-generated therapy picture cards via Google's `gemini-3-pro-image-preview` model. No stock images.
- **Convex RAG component** — `@convex-dev/rag` for therapy knowledge base instead of custom vector search pipeline.

### Docs Sharded for AI Efficiency
Monolithic PRD broken into focused files:
- `docs/architecture/` — tech-stack, data-models, api-spec, project-structure, user-stories, dependencies, vsa-guide
- `docs/design/` — design-tokens, ux-screens
- `docs/ai/` — prompt-library (system prompt, tool schemas, RAG config, TTS, image gen)

### Library Research Complete
Key libraries chosen: dnd-kit (touch DnD), motion (animations), use-sound (iOS audio), zustand (state), convex-helpers, convex-test, @clerk/testing, @t3-oss/env-nextjs, msw, prettier-plugin-tailwindcss, @faker-js/faker.

### Roadmap: 62 tasks across 7 phases
- Phase 0: Foundation (GitHub, Next.js, Convex, testing infra, CI/CD)
- Phase 1: AI Chat + Tool Generation (Convex Agent, tool configs)
- Phase 2: Therapy Tool Components (5 components, DnD, TTS, image gen)
- Phase 3: RAG + Templates
- Phase 4: Sharing + Persistence
- Phase 5: Landing + Polish
- Phase 6: Auth + Deploy

---

## 2026-03-23 — Phase 0: Foundation & Setup

### What Changed
- Initialized Next.js 16.2.1 project with TypeScript, Tailwind v4, App Router, `src/` directory
- Installed 30+ production and dev dependencies (AI stack, Convex ecosystem, UI libraries, testing tools)
- Created Convex backend with Agent + RAG components, full schema (tools, knowledgeBase, ttsCache tables with all indexes)
- Configured shadcn/ui with 15 components in VSA-compliant paths (`src/shared/components/ui/`)
- Created responsive header with mobile Sheet menu, Toaster, ThemeProvider
- Built builder page with shadcn Resizable split panels (35/65 desktop, stacked mobile)
- Set up placeholder pages for all routes (/builder, /templates, /my-tools, /tool/[toolId])
- Configured Vitest, Playwright, MSW mock handlers, Zod env validation, Prettier + ESLint
- Created GitHub Actions CI/CD workflows (CI on all branches, deploy on main)
- Deployed Convex backend (`dev:prestigious-husky-196`) with API keys for Anthropic, Google, ElevenLabs

### Decisions Made
- **Lazy ConvexReactClient init** — deferred to `useEffect` to avoid SSR/prerender crashes when `NEXT_PUBLIC_CONVEX_URL` isn't set
- **`skipValidation` in env.ts** — `@t3-oss/env-nextjs` skips validation in CI to prevent E2E failures from missing secrets
- **ThemeProvider added early** — shadcn's Toaster requires `next-themes` context; defaulted to `light` theme
- **Vitest excludes `.claude/`** — prevents worktree test file pollution from parallel agent sessions
- **Single commit per task** — plan's two-commit strategy collapsed when no rework was needed

### Gotchas Discovered
- Tailwind v4: `@import url()` must precede `@import "tailwindcss"` (CSS spec: no `@import` after rules)
- shadcn Resizable: prop is `orientation`, not `direction` (react-resizable-panels v4 API change)
- Bitwarden CLI: `bw get item` fails silently with "More than one result" when items share name prefixes
- `eslint-plugin-simple-import-sort` must be explicitly wired into `eslint.config.mjs` (flat config format)

### Infrastructure
- GitHub repo: `Ddell12/Springfield-Vibeathon`
- Convex project: `bridge-ai` (team: deshawndell)
- Convex dashboard: https://dashboard.convex.dev/d/prestigious-husky-196
- Convex env vars set: ANTHROPIC_API_KEY, GOOGLE_API_KEY, ELEVENLABS_API_KEY
- Missing: FAL_KEY (fal.ai image gen — not critical until Phase 2)

### 11 Commits
`a4e9527` → `4eb08c5` → `57f2a3e` → `8770690` → `1c43554` → `f103b45` → `bd66194` → `234eb77` → `c7bd810` → `dd6b81d` → `833d3db`

---

## 2026-03-23 — Phase 1: AI Chat & Tool Generation Core

### What Changed
- Defined Zod schemas for all 5 tool config types (`tool-configs.ts`) with `z.infer<>` for TypeScript types
- Created Bridges agent definition (`convex/agents/bridges.ts`) with Claude Sonnet, full system prompt, 3 tools: createTool, updateTool, searchKnowledge (placeholder)
- Built tool CRUD functions (`convex/tools.ts`) — get, getBySlug, list, create, update, remove with nanoid share slugs
- Implemented Convex Agent streaming actions (`convex/chat/streaming.ts`) — initiateStreaming, streamAsync, listThreadMessages, createThread
- Built chat UI with `@assistant-ui/react` ExternalStoreRuntime wired to Convex Agent
- Created tool renderer (`tool-renderer.tsx`) with Zod `safeParse` validation and ErrorBoundary wrapper
- Built tool preview panel with real-time Convex subscription and Skeleton loading
- Wired builder end-to-end: chat → agent → tool → preview with zustand state management
- Backend tests for tool CRUD via `convex-test`

### Decisions Made
- **`@assistant-ui/react` ExternalStoreRuntime** — bridges Convex Agent message format to assistant-ui components, eliminating 3 custom chat components (~190 lines saved)
- **`zod/v3` import** — Convex Agent requires Zod v3 compat import path, not `"zod"` directly
- **`anyApi` for cross-file action calls** — used `anyApi` from `convex/server` when agent tools call functions in other Convex files

### Gotchas Discovered
- `@convex-dev/agent` v0.6.1 uses `inputSchema` (not `parameters`) for tool definitions
- `createTool` `execute` receives `AgentActionCtx` with `ctx.threadId`, `ctx.runMutation`, `ctx.runQuery`
- Convex Agent streaming requires `saveStreamDeltas: true` for real-time token display

---

## 2026-03-23 — Phase 2: Therapy Tool Components

### What Changed
- Built 3 core therapy tool components (visual schedule, token board, communication board) with full interactivity
- Visual schedule: drag-to-reorder via `@dnd-kit/react`, tap-to-complete with `motion` animations, vertical/horizontal orientation
- Token board: zustand store for earn/reset state, `motion` scale-in animations, reinforcer selection
- Communication board: picture card grid, sentence building with `motion` feedback, drag-to-reorder, TTS placeholder, `next/image` for AI-generated pictures
- Updated tool renderer to use real components instead of placeholders, with `React.lazy` code splitting
- Implemented ElevenLabs TTS action (`convex/aiActions.ts`) with Convex file storage caching
- Implemented Google Imagen image generation action (`convex/aiActions.ts`) with file storage
- Added TTS cache queries/mutations (`convex/ai.ts`)
- Wrote unit tests for all 3 tool components + tool renderer (4 test files)

### Decisions Made
- **3 tools, not 5** — choice board and first-then board deferred as stretch goals per spec. 3 polished tools > 5 rough ones for hackathon demo
- **Google Stitch for visuals** — all UI components designed in Stitch, exported as React, then wired with library behavior
- **Separate `aiActions.ts` file** — `"use node"` actions for external APIs kept in dedicated file, not mixed with queries/mutations
- **`zustand` only for token board** — other tools use React state since their interaction is simpler

### Gotchas Discovered
- Material Symbols icons required explicit font import — Tailwind v4 font-family reset was overriding Google Fonts
- `@dnd-kit/react` v0.3 needs `touch-action: none` on drag handles for proper iPad behavior
- `motion` v12 uses `animate` prop (not `variants` + `initial`/`animate` string keys like framer-motion v6)

---

## 2026-03-24 — Phase 3: RAG Knowledge Base & Templates

### What Changed
- Created 110 therapy knowledge entries across 5 categories: aba-terminology (22), speech-therapy (22), tool-patterns (22), developmental-milestones (22), iep-goals (22)
- Set up Convex RAG component with Google `gemini-embedding-001` for 768-dim embeddings
- Created idempotent seed action (`convex/knowledge/seed.ts`) using `rag.add()` with `key` for deduplication
- Created search wrapper action (`convex/knowledge/search.ts`) returning pre-formatted `text` from RAG results
- Wired `searchKnowledge` tool in Bridges agent to real RAG search (replaces Phase 1 placeholder)
- Added `generateImage` tool to Bridges agent (calls existing `aiActions.generateImage`)
- Created 6 pre-built templates with complete ToolConfig objects: Feelings Board, Basic Needs Board, 5-Star Reward Chart, Sticker Collection, Morning Routine, Bedtime Routine
- Built idempotent template seed mutation (`convex/templates/seed.ts`) with JS-level dedup (no `.filter()`)
- Created `listTemplates` public query with optional category filter using `by_template` index
- Replaced mock template data in gallery page with live Convex queries + Skeleton loading
- Created `convex/init.ts` orchestration action to seed RAG + templates on first deploy
- 51 tests passing (8 template tests, 5 knowledge data tests, 38 existing)

### Decisions Made
- **RAG component storage, not `knowledgeBase` table** — `@convex-dev/rag` manages its own internal tables. The schema's `knowledgeBase` table stays inert (kept for potential direct vector search fallback)
- **`internalAction` wrapper for RAG search** — `rag.search()` needs `runAction` context (embedding API call). Agent tool `execute` calls `ctx.runAction(internal.knowledge.search.searchKnowledgeAction)` as a bridge
- **Templates stored in `tools` table** — `isTemplate: true` + `templateCategory` field. Same `ToolRenderer` renders both AI-generated and template tools
- **3 categories, 6 templates** — matching the existing UI's 3-category structure (communication, rewards, routines)
- **Single implementer** — architect recommended 2, but implementer-2's scope (1 file, ~15 lines) didn't justify coordination overhead

### Gotchas Discovered
- `convex.config.ts` must live at `convex/convex.config.ts` (inside the `convex/` folder), NOT at the project root — CLI silently ignores root placement and components never install
- `@ai-sdk/google` expects `GOOGLE_GENERATIVE_AI_API_KEY` env var, not `GOOGLE_API_KEY`
- RAG `rag.search()` requires action context with `runAction` — can't be called directly from agent tool `execute` without a wrapper
- `convex-test` mock runtime cannot test actions that call external APIs (Google embeddings) — knowledge tests are structural/data validation only

### Infrastructure
- Convex components installed: `agent`, `rag`, `rag/workpool`
- Convex env var added: `GOOGLE_GENERATIVE_AI_API_KEY`
- RAG namespace: `therapy-knowledge` with 110 entries seeded
- 6 templates seeded in `tools` table

---

## 2026-03-24 — UX Overhaul: Vite Sandbox + Therapy Design System

### What Changed
- **Complete UX overhaul** — 58 files changed (+2,634/-278), 432 tests passing (57 test files)
- **Vite sandbox template** — Custom `vite-therapy` E2B template replaces Next.js sandbox. Pre-installed therapy-ui.css (272 lines of design system classes), useLocalStorage/useConvexData hooks, Nunito+Inter fonts
- **Stripped developer UI** — Removed 9 stub buttons (5 header, 4 chat input), code view panel, all developer jargon ("Writing component code" → "Creating your tool", "App Preview" → "Tool Preview")
- **Persistence tiers** — Bottom sheet before first build: "This session" / "Save on this device" (default) / "Save to cloud"
- **Undo/version history** — Saves up to 10 versions (FIFO). Single undo restores previous tool with toast confirmation
- **Message persistence** — Chat messages saved to Convex, restored on page refresh
- **Dark mode** — Material 3 dark palette, theme toggle in header
- **Responsive preview** — Phone (375px) / Tablet (768px) / Computer picker in header center
- **Confetti celebration** — CSS confetti burst on first tool generation
- **Live iteration** — "Updating your tool..." pill overlay during edits (no loading carousel)
- **Publish to Vercel** — `/api/publish` route: sandbox → `vite build` → Vercel Deploy API → permanent URL
- **Share dialog upgrade** — Tabs for "Preview Link" (sandbox) and "Published Link" (Vercel URL)
- **AlertDialog for destructive actions** — Replace browser `confirm()` with shadcn AlertDialog for delete + new project
- **Download toast** — "Tool saved to your files!" confirmation
- **Error retry** — Error messages include "Try again" button

### New Components
- `persistence-sheet.tsx` — Persistence tier selection (shadcn Sheet)
- `confetti.tsx` — CSS confetti burst animation
- `publish-dialog.tsx` — Publish flow with progress states
- `responsive-picker.tsx` — Device breakpoint picker
- `theme-toggle.tsx` — Dark mode toggle (next-themes)
- `convex/tool_state.ts` — Cross-device state CRUD for cloud persistence

### New Infrastructure
- `e2b-templates/vite-therapy/` — Custom E2B sandbox template (registered ID: `wsjspn0oy5ygip6y8rjr`)
- `src/app/api/publish/route.ts` — Vercel Deploy API server route
- `src/features/builder-v2/lib/vercel.ts` — Vercel deploy helper

### Decisions Made
- **Vite over Next.js for sandbox** — 5-20ms HMR (vs 200-500ms), no "use client" hack, lighter template = faster boot (3-5s vs 10-15s), pre-installed design system for consistent output
- **CSS confetti, not a library** — 30 particles with inline keyframes, 2KB total. No `canvas-confetti` dependency needed
- **`sleep 2` after sandbox file write** — Vite HMR needs time to process new App.tsx. Without it, iframe shows template placeholder
- **`background: true` for dev server** — E2B `commands.run` blocks until process exits. Dev servers run forever, so must use background mode
- **Absolute paths in E2B** — `sandbox.files.write()` resolves relative to `/home/user/`, not Docker WORKDIR. Must write to `/home/user/app/src/App.tsx`
- **TDD with 7-agent team** — Researcher → Architect → Test Writer (95 tests) → 2 Implementers (parallel) → Verifier → Lead Merge. All in isolated git worktree

### Gotchas Discovered
- E2B `files.write("src/App.tsx")` writes to `/home/user/src/App.tsx`, not `/home/user/app/src/App.tsx` (WORKDIR is not the base for file operations)
- Vite 6+ `allowedHosts` security blocks `*.e2b.app` domains — must set `allowedHosts: true` in vite.config.ts
- E2B Code Interpreter SDK: Docker CMD runs automatically in the sandbox (Vite starts before our code writes) — must wait for HMR after file write
- `userEvent.setup()` overrides `navigator.clipboard` mock — use `fireEvent.click` for clipboard tests
- `Math.random()` in JSX render triggers `react-hooks/purity` — move to a generator function
- E2B template must be rebuilt (`e2b template build`) after any change to template files — changes don't propagate automatically

### Infrastructure
- E2B template: `vite-therapy` (ID: `wsjspn0oy5ygip6y8rjr`)
- Vercel deploy token: stored in `.env.local` as `VERCEL_DEPLOY_TOKEN`
- Published tools deploy under `bridges-tools` Vercel project
- Convex schema: added `versions`, `publishedUrl`, `persistence` fields to projects table + new `toolState` table

---

<!--
TEMPLATE for future entries:

## YYYY-MM-DD — Phase N: Title

### What Changed
- [bullet points of significant changes]

### Decisions Made
- [architectural or product decisions with reasoning]

### Gotchas Discovered
- [things that tripped up the coding agent, for future reference]

### Breaking Changes
- [anything that changes existing behavior or requires migration]
-->
