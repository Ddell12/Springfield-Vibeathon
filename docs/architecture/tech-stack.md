# Tech Stack — Bridges

## Core Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js (App Router) | Largest ecosystem, best AI coding tool support, excellent Convex integration |
| Backend | Convex | Real-time reactivity, zero boilerplate, built-in vector search for RAG, TypeScript E2E |
| Database | Convex Database | Included with Convex, document-relational, ACID, reactive queries, vector search |
| Auth | Clerk (deferred to Phase 6) | Pre-built UI, social login, org management. Deferred for E2E testing ease. |
| Payments | Stripe (post-hackathon) | Industry standard. Not needed for demo. |
| Deployment | Vercel | One-click Next.js deploy, preview URLs |

## AI Stack

| Layer | Choice | Package |
|-------|--------|---------|
| Agent Framework | Convex Agent | `@convex-dev/agent` (threads, streaming, tools, React hooks) |
| RAG | Convex RAG | `@convex-dev/rag` (ingestion, chunking, vector search) |
| LLM Provider | Claude Sonnet | `@ai-sdk/anthropic` via AI SDK |
| Chat UI | Vercel AI SDK | `ai` (useChat fallback), Convex Agent hooks primary |
| Embeddings | Google gemini-embedding-001 | `@ai-sdk/google` provider (768-dim, MRL-compatible with future v2) |
| Vector Search | Convex built-in | `ctx.vectorSearch()` in actions |
| TTS | ElevenLabs | `elevenlabs` |
| Image Gen | Nano Banana Pro | `@google/genai` (direct) or `@fal-ai/client` (fallback) |

## Interaction Libraries

| Library | Package | Purpose |
|---------|---------|---------|
| dnd-kit | `@dnd-kit/react` | Drag & drop (touch-safe for iPad) |
| Motion | `motion` | Animations (token celebrations, transitions) |
| use-sound | `use-sound` | Audio playback (iOS Safari safe) |
| Zustand | `zustand` | Local tool interaction state |
| QR Code | `react-qr-code` | Share tool via QR |
| Convex Helpers | `convex-helpers` | Relationships, pagination, rate limiting |

> Full dependency details: `docs/architecture/dependencies.md`

## Environment Variables

```env
CONVEX_DEPLOYMENT=             # From Convex dashboard
NEXT_PUBLIC_CONVEX_URL=        # From Convex dashboard
ANTHROPIC_API_KEY=             # Claude API key
GOOGLE_API_KEY=                # Google AI API key for embeddings
ELEVENLABS_API_KEY=            # ElevenLabs API key
# Clerk (Phase 6 only)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=
```

## Setup Order

1. `npx create-next-app@latest` with TypeScript, Tailwind, App Router
2. `npx shadcn@latest init` → add base components
3. `npm create convex@latest` → initialize Convex
4. `npm install ai @ai-sdk/anthropic @ai-sdk/google @google/genai elevenlabs nanoid sonner`

## Integration Patterns

- **Convex + Next.js:** `ConvexProvider` in root layout. `useQuery`/`useMutation` hooks for data.
- **Vercel AI SDK + Convex:** Chat API route uses `streamText`. Tool calls invoke Convex actions via HTTP client.
- **External APIs in Convex:** All Claude/Google/ElevenLabs calls happen in Convex `action` functions with `"use node";` directive.
- **Real-time preview:** Tool configs in Convex → `useQuery` subscription → preview re-renders automatically.

## Gotchas

- Convex functions must be named exports (never `export default`)
- Convex actions are NOT transactional — use `ctx.runMutation` inside actions for writes
- `useChat` expects `toDataStreamResponse()` format from the AI SDK
- Vector search is only available in actions (`ctx.vectorSearch`), not queries/mutations
- `"use node";` is required at top of Convex files that call external APIs

## Cost Estimate (< 500 users/month)

| Service | Monthly Cost |
|---------|-------------|
| Vercel | $0 (Hobby) |
| Convex | $0 (Free tier) |
| Claude API | ~$30 |
| Google Embeddings | $0 |
| ElevenLabs | ~$5 |
| **Total** | **~$35** |
