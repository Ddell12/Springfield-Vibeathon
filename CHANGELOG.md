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
