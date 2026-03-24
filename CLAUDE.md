# Bridges — AI Coding Agent Instructions

## What Is This Project?

Bridges is an AI-powered vibe-coding platform where ABA therapists, speech therapists, and parents of autistic children describe therapy tools in plain language and get working, interactive tools built by AI. Think "Replit for therapy tools" — except the AI already speaks therapy language.

## Stack

- **Frontend:** Next.js (App Router) + shadcn/ui + Tailwind v4
- **Backend:** Convex (real-time, TypeScript, built-in vector search)
- **AI Chat:** Convex Agent (`@convex-dev/agent`) for threads, streaming, tool calling, React hooks; Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) as model provider
- **LLM:** Claude Sonnet via `@ai-sdk/anthropic`
- **Embeddings:** Google gemini-embedding-001 (768-dim) via `@ai-sdk/google` → Convex RAG vector search
- **TTS:** ElevenLabs for communication boards
- **Auth:** Clerk (deferred to final phase)
- **Deploy:** Vercel

## How to Work in This Repo

### Current Status
- **Phases 0–3 complete** (foundation, AI chat, tool components, RAG + templates)
- **Current Phase: Phase 4** — Sharing, Persistence & My Tools
- **51 tests passing** (Vitest), all Convex functions deployed, RAG seeded with 110 entries

### Start here
1. Read `docs/product-roadmap.md` — find the current phase (first unchecked task)
2. Read ONLY the Reference sections listed for that phase from `docs/prd.md` and `docs/product-vision.md`
3. Work through tasks sequentially, marking `- [x]` after each one
4. Don't load entire docs — each phase tells you exactly which sections to read

### Doc map — load only what you need

**Always read first:**
| File | Purpose |
|------|---------|
| `docs/product-roadmap.md` | Your task list — find current phase, work through tasks |

**Architecture (load per-task):**
| File | Purpose |
|------|---------|
| `docs/architecture/vsa-guide.md` | VSA rules: core vs shared vs features, decision flowchart |
| `docs/architecture/tech-stack.md` | Stack choices, env vars, setup, costs |
| `docs/architecture/data-models.md` | Convex schema, tool config types, indexes |
| `docs/architecture/api-spec.md` | Convex queries/mutations/actions, chat route |
| `docs/architecture/project-structure.md` | File tree and directory layout |
| `docs/architecture/user-stories.md` | User stories with acceptance criteria |
| `docs/architecture/dependencies.md` | All packages, why each is chosen, install commands |
| `docs/architecture/hosting-deployment.md` | Service URLs, env vars, CI/CD pipeline, cost tracking |

**Design (load per-task):**
| File | Purpose |
|------|---------|
| `docs/design/design-tokens.md` | Colors, typography, spacing, component styles — copy-pasteable CSS |
| `docs/design/ux-screens.md` | Page-by-page layout, states, interactions |

**AI (load for Phase 1 & 3):**
| File | Purpose |
|------|---------|
| `docs/ai/prompt-library.md` | System prompt, tool schemas, RAG config, TTS config, model settings |

**Living documents (update as you work):**
| File | Purpose |
|------|---------|
| `CHANGELOG.md` | What changed, when, why — updated after each phase |
| `docs/demo.md` | Demo video script, flow, checklist — reference when recording |

**Strategy (rarely needed):**
| File | Purpose |
|------|---------|
| `docs/product-vision.md` | Brand voice, audience personas, strategy — for copy and tone decisions |
| `docs/prd.md` | Full PRD (monolithic reference) — use sharded files above instead when possible |
| `docs/gtm.md` | Go-to-market — only for landing page copy (Phase 5) |

### Architecture: VSA + Config-Based Tool Generation

**This project uses Vertical Slice Architecture (VSA).** Read `docs/architecture/vsa-guide.md` for the full guide. Quick rules:

- `src/core/` — universal infrastructure (providers, utils). Exists before features.
- `src/shared/` — code used by **3+ features**. shadcn/ui primitives live here. Don't extract until the third use.
- `src/features/{name}/` — self-contained feature slices. All components, hooks, types, and logic for a feature in one directory.
- `src/app/` pages are **thin wrappers** (< 20 lines) that import from features.
- `convex/schema.ts` is core (single file). `convex/{feature}.ts` files organize functions by domain.

**Config-Based Tool Generation:** Bridges does NOT generate arbitrary code. The AI generates **JSON configurations** that pre-built React components render.

```
User describes tool → Claude interprets → generates ToolConfig JSON → React component renders it
```

Tool configs: `src/features/therapy-tools/types/tool-configs.ts`
Tool components: `src/features/therapy-tools/components/`
Config → component mapper: `src/features/therapy-tools/components/tool-renderer.tsx`

## Code Conventions

### Convex
- All functions must be named exports (never default export)
- Use `v` validators on all args — no unvalidated `any` on args
- Config objects stored as `v.any()` but validated in application code via TypeScript
- Actions (`"use node";`) for external API calls (Claude, Google Embeddings, ElevenLabs)
- Queries for reads, mutations for writes — actions are not transactional
- Index naming: `by_fieldName`
- **Component config at `convex/convex.config.ts`** — NOT at project root
- **File organization:** domain-grouped — `convex/knowledge/`, `convex/templates/`, `convex/chat/`, `convex/agents/`
- **Seed functions:** use `internalMutation` for DB seeds, `internalAction` for seeds needing external APIs (embeddings)
- **`anyApi`** from `convex/server` for cross-file action references in agent tool `execute` functions

### Next.js
- App Router only (`src/app/`)
- Server Components by default — `"use client"` only for hooks/interactivity
- Metadata via `export const metadata` or `generateMetadata`, never JSX `<title>`
- Use `<Link>` from next/link, `<Image>` from next/image

### Tailwind v4
- Config via `@theme` in `src/app/globals.css` — no `tailwind.config.js`
- Use design tokens from `docs/design/design-tokens.md`
- Use `cn()` from `src/core/utils.ts` for class merging
- Mobile-first: base styles for mobile, `md:` / `lg:` for larger screens
- Class sorting via `prettier-plugin-tailwindcss`

### shadcn/ui
- Components in `src/shared/components/ui/` — add via `npx shadcn@latest add <name>`
- Use sub-components (CardHeader, CardContent, etc.) — not raw divs
- Use semantic tokens: `bg-background`, `text-foreground`, `border-border`

### AI / Chat
- Primary: **Convex Agent** (`@convex-dev/agent`) for threads, streaming, tool calling, React hooks
- Fallback: Vercel AI SDK `useChat` if Convex Agent doesn't fit a specific pattern
- Claude via `@ai-sdk/anthropic` provider
- RAG via `@convex-dev/rag` component — stores in its own internal tables, NOT the `knowledgeBase` table in schema
- System prompt and tools defined in `docs/ai/prompt-library.md`
- Agent definition: `convex/agents/bridges.ts` — 4 tools: createTool, updateTool, searchKnowledge, generateImage
- Agent tool `inputSchema` uses `zod/v3` (not `"zod"`) — required by `@convex-dev/agent`
- RAG search wrapper: `convex/knowledge/search.ts` — `internalAction` that wraps `rag.search()` for agent tool access
- Chat UI: `@assistant-ui/react` ExternalStoreRuntime wired to Convex Agent via `useUIMessages`

### Image Generation
- Use **Nano Banana Pro** (`@google/genai` or `@fal-ai/client`) for therapy picture cards
- Never use stock images — all picture cards are AI-generated on-demand
- Cache generated images in Convex file storage by prompt hash
- Prompt pattern: "Simple, clear illustration of [item], flat design, bold outlines, white background, child-friendly"

### Key Library Choices
- **Drag & drop:** `@dnd-kit/react` (touch-safe, not pragmatic-drag-and-drop which has iPad issues)
- **Animation:** `motion` (formerly framer-motion) — for token celebrations, card selections
- **Audio:** `use-sound` — handles iOS Safari autoplay restrictions for TTS
- **State:** `zustand` — for tool interaction state (token counts, selections)
- **Convex helpers:** `convex-helpers` — relationships, pagination, rate limiting
- Full list: `docs/architecture/dependencies.md`

### Testing

- **Unit tests:** Vitest + React Testing Library. Colocated in `__tests__/` within feature dirs.
- **Convex backend tests:** Vitest + `convex-test` (official mock runtime). Test queries/mutations without a real backend.
- **E2E tests:** Playwright (chromium + webkit). Lives in `tests/e2e/`.
- **Auth E2E:** `@clerk/testing` — `clerk.signIn()` bypasses UI in Playwright tests.
- **API mocking:** `msw` (Mock Service Worker) — intercept Claude, Google, ElevenLabs calls in tests.
- **Test data:** `@faker-js/faker` for generating realistic test fixtures.
- **Env validation:** `@t3-oss/env-nextjs` — type-safe env var validation at build time.

### Google Stitch Design System
- All UI components are designed in Google Stitch, then exported as React components
- Design system doc: `.stitch/DESIGN.md` — "The Digital Sanctuary" creative direction
- Dual fonts: **Manrope** (headlines, 600/700) + **Inter** (body, 400/500/600)
- **No-Line Rule:** 1px borders are banned for sectioning — use tonal background shifts instead
- Surface hierarchy: `surface` (page bg) → `surface-container-low` (sections) → `surface-container-lowest` (interactive cards)
- Primary CTA: gradient from `primary` (#00595c) to `primary-container` (#0d7377) at 135deg
- All animations use `cubic-bezier(0.4, 0, 0.2, 1)` and must be >= 300ms
- Stitch screens in `.stitch/designs/` — 8 screens (landing, builder, tools, templates, etc.)

## What NOT to Do

- Don't add auth until Phase 6 — it blocks E2E testing
- Don't generate arbitrary code — use config-based tool generation
- Don't expose developer jargon in the UI (no "component", "API", "deploy", "database")
- Don't use `style={{}}` when Tailwind has an equivalent
- Don't skip tasks in the roadmap — they're ordered for dependency resolution
- Don't load entire doc files — read only the sections referenced by the current phase

## Keeping Docs Current

**After every phase or significant change, update these files:**

1. **This file (`CLAUDE.md`)** — If you add a new convention, discover a gotcha, change the stack, add a new pattern, or learn something that would help future agents or Desha — add it here. This is the single source of truth for how to work in this repo.

2. **`CHANGELOG.md`** — After completing each phase, add an entry with: what changed, decisions made, gotchas discovered, and any breaking changes. Use the template at the bottom of the file.

3. **`docs/product-roadmap.md`** — Mark tasks `[x]` as completed. Update the status line and current phase.

**What's worth adding to CLAUDE.md:**
- New code conventions or patterns discovered during implementation
- Gotchas that wasted time (e.g., "Convex actions need `"use node";` for external API calls")
- Library-specific quirks (e.g., "dnd-kit needs `touch-action: none` on drag handles for iPad")
- Environment or deployment discoveries
- Architectural decisions made during implementation that deviate from the original plan

**What does NOT belong in CLAUDE.md:**
- Temporary debugging notes
- Task-specific implementation details (those go in the code or roadmap)
- Information already in the sharded docs (don't duplicate)

## Gotchas Discovered (Phase 0–3)

- **Tailwind v4 CSS import order:** `@import url()` for external fonts MUST precede `@import "tailwindcss"` — Tailwind expands into CSS rules, and CSS spec forbids `@import` after rules.
- **Convex + Next.js prerender:** `ConvexReactClient` throws "not an absolute URL" during SSR/prerender when `NEXT_PUBLIC_CONVEX_URL` isn't set. Fix: defer client creation to `useEffect` (see `src/core/providers.tsx`).
- **shadcn Resizable prop name:** The correct prop is `orientation="horizontal"`, NOT `direction="horizontal"` (react-resizable-panels v4 API).
- **shadcn Toaster + next-themes:** `Toaster` from sonner calls `useTheme()` — requires `ThemeProvider` in the provider tree or you get context warnings.
- **Vitest + Claude worktrees:** `.claude/worktrees/` can contain test files from other agent sessions. Always exclude `.claude/**` in vitest.config.ts.
- **`@t3-oss/env-nextjs` in CI:** Env validation crashes the build in CI where secrets aren't available. Use `skipValidation: !!process.env.CI` in `src/env.ts`.
- **Bitwarden "More than one result":** When multiple items share a name prefix (e.g., "ElevenLabs" and "ElevenLabs Phone Number ID"), `bw get item` fails silently. Use `bw list items --search` with a `jq` filter for exact name + type match.
- **`"use node";` file separation:** Never put `"use node";` in a file that also exports queries or mutations. Actions needing Node.js must be in separate files.
- **Convex `filter` is banned:** Always use `.withIndex()` instead of `.filter()` in Convex queries.
- **Convex `ctx.db` not available in actions:** Actions cannot access the database directly — use `ctx.runQuery` or `ctx.runMutation`.
- **`convex.config.ts` must be inside `convex/`:** The file must live at `convex/convex.config.ts`, NOT at the project root. If placed at root, the Convex CLI silently ignores it and components (agent, rag, workpool) are never installed — causing "Child component not found" errors at runtime.
- **`@ai-sdk/google` env var name:** The Google AI SDK expects `GOOGLE_GENERATIVE_AI_API_KEY`, not `GOOGLE_API_KEY`. Set both in Convex env vars if using `@ai-sdk/google` for embeddings.
- **RAG `rag.search()` needs action context:** `rag.search()` calls the embedding API internally, so it requires `ctx` with `runAction`. Agent tool `execute` functions can use `ctx.runAction(internal.knowledge.search.searchKnowledgeAction, args)` as a wrapper.
- **`"use node";` is only for `action`/`internalAction`:** Never add `"use node";` to files defining `httpAction`, `query`, or `mutation`. HTTP actions run in the Convex V8 runtime, not Node.js. Adding it causes a 400 "InvalidModules" deploy error.
- **Convex file names cannot contain hyphens:** Module paths only allow alphanumeric characters, underscores, or periods. Use `snake_case` for all files in `convex/` (e.g., `therapy_seeds.ts` not `therapy-seeds.ts`). Hyphens cause a 400 "InvalidConfig" error on `convex dev`.
- **Convex V8 runtime does not support dynamic `import()`:** Never use `await import("nanoid")` or similar in queries/mutations. Use static top-level imports or inline implementations. Dynamic imports crash with `TypeError: dynamic module import unsupported`.

## Convex Backend

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

### Convex Quick Reference (from `convex/_generated/ai/guidelines.md`)

- **Function types:** `query` (read-only, cached, reactive), `mutation` (transactional read+write), `action` (external APIs, non-transactional)
- **Internal functions:** Use `internalQuery`/`internalMutation`/`internalAction` for private functions (not exposed to client)
- **Function references:** `api.module.functionName` for public, `internal.module.functionName` for private
- **Cross-function calls:** `ctx.runQuery`, `ctx.runMutation`, `ctx.runAction` — always use `FunctionReference`, never pass the function directly
- **Type annotations:** When calling same-file functions via `ctx.runQuery`, add explicit return type annotation to avoid TypeScript circularity
- **Queries:** Never use `.filter()` — always use `.withIndex()`. Use `.take(n)` instead of `.collect()` unless explicitly need all results. Never use `.collect().length` for counting.
- **Mutations:** `ctx.db.patch` for partial update, `ctx.db.replace` for full replace. Both throw if doc doesn't exist.
- **Actions:** Add `"use node";` at top of file for Node.js built-ins. `fetch()` works without it. Never use `ctx.db` in actions.
- **Scheduling:** `ctx.scheduler.runAfter(ms, functionRef, args)` for delayed execution. Crons in `convex/crons.ts` using `cronJobs()`.
- **Schema:** System fields `_id` and `_creationTime` are auto-added. Index names should include all fields (e.g., `by_field1_and_field2`).
- **Auth:** Use `ctx.auth.getUserIdentity()` server-side. Never accept userId as a function argument. Use `tokenIdentifier` as the canonical user key.
- **File storage:** `ctx.storage.getUrl()` for signed URLs. Query `_storage` system table for metadata. Store as `Blob`.
- **Pagination:** Use `paginationOptsValidator` from `convex/server`. Returns `{ page, isDone, continueCursor }`.

## Available Skills & Capabilities

This project is built with Claude Code which has access to specialized skills. Key skills for this project:

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `convex-dev` | Creating tables, CRUD, backend features | Generates Convex functions with validation, auth, indexes |
| `ai-action-builder` | Adding AI to Convex | Creates Convex actions with AI SDK for text gen, embeddings |
| `plan-mode` | Complex multi-file tasks | Research-first planning before implementation |
| `agent-team-implement` | Features touching 4+ files | Parallel multi-agent TDD implementation |
| `agent-team-code-review` | PR review, code review | 4-agent parallel review (security, perf, correctness, maintainability) |
| `frontend-design` | UI components, pages | Production-grade frontend with high design quality |
| `web-design-guidelines` | UI audit, accessibility | Checks accessibility, layout, typography, interaction patterns |
| `vitest-testing` | Writing tests | Modern TS/JS testing with Vitest |
| `new-app` | (already used) | Scaffold Next.js + Convex + shadcn projects |
| `bitwarden` | API keys, secrets | Retrieve/manage credentials from Bitwarden vault |
| `env-setup` | Environment config | Wire up .env files from vault |
| `commit` | Git commits | Structured commit workflow |
| `check-pr` | PR readiness | Checks review comments, failing checks, PR descriptions |
| `visual-explainer` | Architecture diagrams | Generate HTML visual explanations of systems |
| `project-xray` | Codebase overview | Interactive HTML visualization of project state |
