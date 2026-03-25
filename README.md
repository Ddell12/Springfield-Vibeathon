# Bridges

**AI-powered therapy tool builder for parents and therapists of autistic children.**

Describe what you need in plain language — Bridges builds working, interactive therapy tools instantly. No coding required. The AI already speaks therapy language.

> Built for the [Springfield Vibeathon](https://www.eventbrite.com/e/vibeathon-close-the-gap-tickets-1271227498179) "Close the Gap" challenge (March 23-27, 2026).

## What It Does

Parents and therapists describe a therapy tool in a chat interface. The AI interprets their description, asks 1-2 clarifying questions, then generates a working tool that renders instantly in the browser.

**Tool types:**
- **Visual Schedule** — step-by-step routines with drag-to-reorder (morning, bedtime, therapy sessions)
- **Token Board** — reward systems with animated token earning and reinforcer selection
- **Communication Board** — picture card grids with sentence building and text-to-speech
- **Choice Board** — selection interfaces for making choices (stretch goal)
- **First-Then Board** — motivational two-panel tools (stretch goal)

**Key features:**
- AI chat powered by Claude Sonnet via Convex Agent
- Real-time tool preview that updates as the AI builds
- 110-entry therapy knowledge base (RAG) for domain-aware responses
- 6 pre-built templates across communication, rewards, and routines
- Text-to-speech via ElevenLabs for communication boards
- AI-generated picture cards via Google Imagen
- Drag-and-drop for visual schedules and communication boards
- Shareable tools via link and QR code

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + Tailwind v4 + shadcn/ui |
| Backend | Convex (real-time database, serverless functions, file storage) |
| AI Chat | Convex Agent (`@convex-dev/agent`) — threads, streaming, tool calling |
| LLM | Claude Sonnet via `@ai-sdk/anthropic` |
| RAG | `@convex-dev/rag` + Google `gemini-embedding-001` (768-dim) |
| TTS | ElevenLabs (`eleven_turbo_v2`) |
| Image Gen | Google Imagen via Generative AI API |
| Interaction | `@dnd-kit/react` (drag & drop), `motion` (animations), `zustand` (state) |
| Chat UI | `@assistant-ui/react` with ExternalStoreRuntime |
| Testing | Vitest + React Testing Library + `convex-test` + Playwright |
| Auth | Clerk (Phase 6) |
| Deploy | Vercel + Convex Cloud |

## Getting Started

### Prerequisites

- Node.js 20+
- A Convex account ([convex.dev](https://convex.dev))
- API keys: Anthropic, Google AI, ElevenLabs

### Setup

```bash
# Clone and install
git clone https://github.com/Ddell12/Springfield-Vibeathon.git
cd Springfield-Vibeathon
npm install

# Set up environment
cp .env.example .env.local
# Fill in your API keys in .env.local

# Set Convex environment variables
npx convex env set ANTHROPIC_API_KEY <your-key>
npx convex env set GOOGLE_GENERATIVE_AI_API_KEY <your-key>
npx convex env set ELEVENLABS_API_KEY <your-key>

# Start Convex backend + Next.js frontend
npx convex dev &
npm run dev
```

### Seed the Knowledge Base

On first run, seed the RAG knowledge base and templates:

```bash
npx convex run init:init '{}'
```

This loads 110 therapy knowledge entries into the vector store and creates 6 starter templates.

### Run Tests

```bash
npm test              # Vitest unit tests (252 tests, 37 test files)
npx playwright test   # E2E tests
```

## Project Structure

```
src/
  app/                    # Next.js App Router pages (thin wrappers)
    (app)/builder/        # AI builder page
    (marketing)/          # Landing, templates, my-tools pages
    tool/[toolId]/        # Shared tool view
  core/                   # Universal infrastructure (providers, utils)
  shared/components/      # Shared UI (shadcn/ui, header, tool-card)
  features/
    builder/              # Chat interface + tool preview
    therapy-tools/        # Tool components, types, stores, tests
    templates/            # Template gallery page
    landing/              # Landing page components
    my-tools/             # My Tools page
    shared-tool/          # Shared tool view

convex/
  agents/bridges.ts       # AI agent definition (system prompt, tools)
  chat/                   # Streaming actions for chat
  knowledge/              # RAG knowledge base (data, seed, search)
  templates/              # Template seed + queries
  tools.ts                # Tool CRUD operations
  aiActions.ts            # TTS + image generation actions
  schema.ts               # Database schema
  init.ts                 # Seed orchestration
```

## Architecture

**Config-based tool generation** — the AI generates JSON configurations, not code. Pre-built React components render the configs.

```
User describes tool → Claude interprets → generates ToolConfig JSON → React component renders
```

**Three-layer design:**
1. **Visual Layer** — Google Stitch generates all UI components
2. **Behavior Layer** — Open-source libraries handle interactivity (dnd-kit, motion, zustand)
3. **Data Layer** — Convex + AI handles real-time data, chat, RAG, and tool storage

## Build Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | Done | Foundation, dependencies, layout, testing infra, CI/CD |
| Phase 1 | Done | AI chat + tool generation (Convex Agent, streaming, tool renderer) |
| Phase 2 | Done | Therapy tool components (visual schedule, token board, communication board) |
| Phase 3 | Done | RAG knowledge base (110 entries), templates (6), agent integration |
| Phase 4 | Done | Builder Agent Enhancement (streaming SSE pipeline, blueprint approval, phasic code gen) |
| Phase 5 | Current | Landing page & final polish |
| Phase 6 | — | Auth (Clerk) + production deploy |

## License

Built for the Springfield Vibeathon "Close the Gap" challenge.
