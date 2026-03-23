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
