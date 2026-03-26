# Bridges

**AI-powered therapy app builder for parents and therapists of autistic children.**

Describe what you need in plain language — Bridges builds working, interactive therapy apps instantly. No coding required. The AI already speaks therapy language.

> Built for the [Springfield Vibeathon](https://www.eventbrite.com/e/vibeathon-close-the-gap-tickets-1271227498179) "Close the Gap" challenge (March 23-27, 2026).

## The Problem

Parents of autistic children and therapists spend hours creating paper-based therapy materials — visual schedules, token boards, communication boards — that wear out, can't be customized on the fly, and don't travel well between home and clinic. Digital alternatives are expensive, rigid, and require technical skills to set up.

## The Solution

Bridges lets anyone describe a therapy tool in plain language and get a working, interactive app in seconds. The AI understands ABA terminology, speech therapy concepts, and developmental milestones — so users don't have to translate between therapy language and tech language.

## What It Does

1. **Chat with the AI** — Describe what you need: "I need a morning routine board for my 4-year-old with brushing teeth, getting dressed, and eating breakfast"
2. **Watch it build** — The AI generates a complete React app with a live preview that updates in real-time
3. **Use it immediately** — Interactive tools with drag-and-drop, animations, text-to-speech, and AI-generated picture cards
4. **Share it** — Publish to a permanent URL or share a preview link

### Built-in Capabilities

- **Visual Schedules** — Step-by-step routines with drag-to-reorder and tap-to-complete
- **Token Boards** — Reward systems with animated token earning and reinforcer selection
- **Communication Boards** — Picture card grids with sentence building and text-to-speech
- **Social Stories** — Illustrated narrative sequences for teaching social skills
- **Flashcard Decks** — Spaced-repetition learning cards for vocabulary and concepts
- **Custom Apps** — Any therapy tool you can describe, the AI can build

### Key Features

- AI chat powered by Claude Sonnet with a 110-entry therapy knowledge base (RAG)
- Real-time streaming preview that updates as the AI writes code
- AI-generated picture cards (Google Gemini) — no stock photos needed
- Text-to-speech via ElevenLabs with child-friendly voices
- Speech-to-text input for hands-free interaction
- 4 curated starter templates (Communication Board, Morning Routine, Reward Board, Social Story)
- Dark mode with therapy-optimized color palette
- Responsive design — works on phones, tablets, and desktops
- One-click publish to a permanent URL via Vercel
- User authentication via Clerk — sign in, sign up, and personalized dashboards
- 625 tests across 77 test files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + Tailwind v4 + shadcn/ui |
| Backend | Convex (real-time database, serverless functions) |
| Auth | Clerk v7 (sign-in/sign-up, JWT-verified sessions, Convex integration) |
| AI Code Generation | Claude Sonnet via `@anthropic-ai/sdk` (streaming SSE) |
| Knowledge Base | `@convex-dev/rag` + Google Gemini embeddings (768-dim) |
| Image Generation | Google Gemini (`gemini-3-pro-image-preview`) with prompt caching |
| Text-to-Speech | ElevenLabs (`eleven_flash_v2_5`) with voice caching |
| Speech-to-Text | ElevenLabs Scribe v2 |
| Interactions | `@dnd-kit/react` (drag & drop), `motion` (animations), `zustand` (state) |
| Testing | Vitest + React Testing Library + `convex-test` + Playwright |
| Deploy | Vercel (app) + Vercel Deploy API (published apps) |

## Getting Started

### Prerequisites

- Node.js 20+
- A Convex account ([convex.dev](https://convex.dev))
- A Clerk account ([clerk.com](https://clerk.com)) with a Convex JWT template configured
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
npx convex env set CLERK_JWT_ISSUER_DOMAIN <your-clerk-domain>

# Start Convex backend + Next.js frontend
npx convex dev &
npm run dev
```

### Seed the Knowledge Base

On first run, seed the therapy knowledge base and templates:

```bash
npx convex run init:init '{}'
```

This loads 110 therapy knowledge entries into the vector store and creates starter templates.

### Run Tests

```bash
npm test              # Vitest unit tests (625 tests, 77 test files)
npx playwright test   # E2E tests
```

## Project Structure

```
src/
  app/                      # Next.js App Router pages
    (app)/builder/           # AI builder — chat + live preview
    (app)/dashboard/         # User dashboard
    (app)/flashcards/        # Flashcard deck viewer
    (app)/settings/          # User settings
    (marketing)/             # Landing page, templates, my apps
    tool/[toolId]/           # Shared app viewer
  core/                      # Providers, utilities, theme
  shared/components/         # Shared UI (shadcn/ui, header)
  features/
    builder/                 # Streaming AI builder (chat, preview, hooks)
    landing/                 # Landing page components
    templates/               # Template gallery
    flashcards/              # Flashcard system
    dashboard/               # Dashboard components
    sharing/                 # Share/publish flow
    my-tools/                # My Apps page
    shared-tool/             # Shared app viewer

convex/
  schema.ts                  # Database schema (sessions, apps, messages, knowledge)
  sessions.ts                # Session state machine
  apps.ts                    # App CRUD operations
  messages.ts                # Chat message persistence
  aiActions.ts               # TTS + AI actions
  image_generation.ts        # Therapy image generation with caching
  stt.ts                     # Speech-to-text
  publish.ts                 # Vercel publish pipeline
  knowledge/                 # RAG knowledge base (110 entries)
  templates/                 # Starter template data + queries
  seeds/                     # Database seed scripts
```

## Architecture

**Streaming code generation** — the AI generates complete React applications through a streaming SSE pipeline:

```
User describes app
  → Claude streams React code via SSE with tool calls (write_file, generate_image, generate_speech)
  → Files written to a server-side scaffold (Vite + React + Tailwind + 40+ shadcn components)
  → Parcel bundles everything into a single self-contained HTML file
  → Bundle is sent to the browser and rendered in a sandboxed iframe
  → Generated app is persisted to Convex and publishable to Vercel
```

**Three-layer design:**
1. **AI Layer** — Claude Sonnet generates therapy-aware React code with a 110-entry RAG knowledge base and a design review pass for visual polish
2. **Build Layer** — Server-side Parcel bundling with a pre-configured scaffold containing Tailwind v3, 40+ shadcn/ui components, and therapy-specific utilities
3. **Data Layer** — Convex handles real-time state, chat persistence, file storage, and image/TTS caching

## Built With AI

This entire project was built using [Claude Code](https://claude.ai/code) over 5 days for the Springfield Vibeathon "Close the Gap" challenge. From architecture to auth to final polish, the AI coding agent handled implementation, testing, and code review — demonstrating how AI can accelerate the development of tools that serve underrepresented communities.

## License

MIT License. See [LICENSE](LICENSE) for details.

Built for the Springfield Vibeathon "Close the Gap" challenge.
