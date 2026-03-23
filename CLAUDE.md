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
- RAG via `@convex-dev/rag` component
- System prompt and tools defined in `docs/ai/prompt-library.md`

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
