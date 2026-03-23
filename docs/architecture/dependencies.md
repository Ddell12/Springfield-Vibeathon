# Dependencies — Bridges

> Every library, why it's here, and what it replaces.

## Install Command

```bash
# Core
npm install next react react-dom convex typescript

# AI
npm install ai @ai-sdk/anthropic @ai-sdk/google @google/genai elevenlabs @fal-ai/client

# Convex ecosystem
npm install convex-helpers @convex-dev/agent @convex-dev/rag @convex-dev/rate-limiter

# UI
npm install class-variance-authority clsx tailwind-merge lucide-react

# Interaction
npm install @dnd-kit/react motion react-qr-code use-sound zustand

# Forms & validation
npm install react-hook-form @hookform/resolvers zod @t3-oss/env-nextjs

# Utilities
npm install nanoid sonner

# Dev / Testing / DX
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom convex-test @playwright/test @clerk/testing msw @faker-js/faker @types/react @types/node eslint eslint-config-next prettier prettier-plugin-tailwindcss eslint-plugin-simple-import-sort @next/bundle-analyzer tailwindcss
```

---

## Core Stack

| Package | Purpose |
|---------|---------|
| `next` | App Router, SSR, API routes, deployment |
| `react` / `react-dom` | UI framework |
| `convex` | Backend, database, real-time, file storage, vector search |
| `typescript` | Type safety |

## AI Layer

| Package | Purpose | Replaces |
|---------|---------|----------|
| `ai` | Vercel AI SDK — `useChat` hook, `streamText`, tool calling | Custom streaming implementation |
| `@ai-sdk/anthropic` | Claude provider for Vercel AI SDK | Direct Anthropic API calls |
| `@ai-sdk/google` | Google embedding provider for Convex RAG (`google.textEmbeddingModel("gemini-embedding-001")`) | Custom embedding code |
| `@google/genai` | Google Generative AI SDK — Nano Banana Pro image generation (direct API) | `@google/generative-ai` (deprecated) |
| `elevenlabs` | Text-to-speech for communication boards | Browser Web Speech API |
| `@fal-ai/client` | Alternative Nano Banana Pro access with Next.js proxy support | Direct Google image API |

### Convex Agent (Recommended — Major Architecture Simplification)

| Package | Purpose | Replaces |
|---------|---------|----------|
| `@convex-dev/agent` | Thread/message management, streaming with deltas, tool calling, React hooks (`useUIMessages`, `useSmoothText`) | Custom conversations table, custom chat API route, custom message persistence |
| `@convex-dev/rag` | RAG component — document ingestion, chunking, vector search | Custom embedding + vector search pipeline |

**What Convex Agent provides out of the box:**
- `useUIMessages` — paginated, streaming-aware message list (replaces custom chat rendering)
- `useSmoothText` — token-by-token text animation (replaces custom streaming display)
- `optimisticallySendMessage` — instant UI feedback on send (replaces custom optimistic updates)
- `createTool` — Convex-native tool definitions (replaces custom tool call wiring)
- Thread management — auto-creates and manages conversation threads (replaces custom conversations table)
- Works with `@ai-sdk/anthropic` — Claude via the standard AI SDK provider system

**Impact:** Estimated 300+ lines of custom code eliminated. The builder feature becomes primarily UI composition + tool definitions.

## Image Generation — Nano Banana Pro

| Detail | Value |
|--------|-------|
| Model | Google Nano Banana Pro (Gemini 3 Pro image) |
| Model ID | `gemini-3-pro-image-preview` |
| Access | `@google/genai` (direct) or `@fal-ai/client` (easier) |
| Cost | ~$0.13/image, free tier ~500/day via Google AI Studio |
| Why | Best-in-class text rendering (perfect for labeled picture cards), high consistency for icon sets |

**Use case:** Generate therapy picture cards on-demand. When a parent says "I need snack request cards," the AI generates custom illustrations (goldfish crackers, apple slices, yogurt) instead of using generic stock icons.

**Integration:** Convex action calls Google API or fal.ai, stores result in Convex file storage, returns URL. Cache by prompt to avoid regenerating identical images.

**Prompt pattern for therapy cards:**
```
Simple, clear illustration of [item], flat design, bold outlines,
high contrast, white background, suitable for a therapy communication board,
no text overlay, child-friendly style
```

## Interaction Libraries

| Package | Purpose | Why This One |
|---------|---------|-------------|
| `@dnd-kit/react` | Drag & drop for communication board cards | Built-in touch sensor (no polyfill), works on iPad. Unlike pragmatic-drag-and-drop which has known touch issues. `useSortable` hook + `move` helper. |
| `motion` | Animations for token celebrations, card selections, transitions | 3.5M+ weekly downloads, React 19 support, `LazyMotion` for tree-shaking. Formerly "framer-motion". |
| `use-sound` | Audio playback for TTS on communication boards | React hook wrapping howler.js. Handles iOS Safari autoplay restrictions (silent buffer unlock on first touch). 1KB + lazy-loaded howler. |
| `zustand` | Local state for tool interactions (token counts, step completion, card selection) | 50K+ stars, 3KB, no provider needed (works with server components), persist middleware for localStorage. |
| `react-qr-code` | QR codes for sharing therapy tools | Pure SVG output, zero deps, works in SSR/Next.js. |

### Why These Specific Libraries

**dnd-kit over pragmatic-drag-and-drop:** Pragmatic DnD uses the native HTML5 DnD API which has well-documented touch/iPad failures (GitHub issues). dnd-kit bypasses native DnD entirely — touch works by setting `touch-action: none` on handles. For therapy tools used on iPads during sessions, this is non-negotiable.

**motion over react-spring:** motion (framer-motion) has broader adoption (3.5M/week vs 500K), better docs, and `AnimatePresence` for enter/exit animations (token board celebrations). react-spring is more performant for physics-based animations but we don't need that.

**zustand over jotai:** Tool interactions are "single store per component instance" (token count, earned tokens, selected card). Zustand's centralized store pattern maps cleanly. Jotai's atomic model is better for deeply interconnected derived state, which we don't have.

**use-sound over raw howler:** use-sound gives us a React hook API (`const [play] = useSound(url)`) with all howler options passable as config. Handles iOS Safari audio unlock automatically. If we need more control later, drop to howler directly.

## Convex Helpers

| Package | Purpose |
|---------|---------|
| `convex-helpers` | Official companion library from Convex team |

**Utilities to use:**
- **Relationship helpers** (`getManyFrom`, `getOneFromOrThrow`) — type-safe joins for tool→cards, board→tokens
- **Pagination** (`paginator`, `stream`) — paginate tool lists, knowledge base entries
- **Rate limiting** — protect public shared-tool endpoints from abuse
- **CRUD helpers** — reduce boilerplate for tool CRUD operations
- **Zod validation** — validate complex tool config schemas server-side (shared with client zod schemas)
- **Sessions** — anonymous session tracking for shared tool links (pre-auth)

## Forms & Validation

| Package | Purpose |
|---------|---------|
| `react-hook-form` | Form state management — shadcn/ui `<Form>` is built on this |
| `@hookform/resolvers` | Connects zod schemas to react-hook-form |
| `zod` | Schema validation — shared between client forms and Convex server validation |

## Utilities

| Package | Purpose |
|---------|---------|
| `nanoid` | URL-safe unique IDs for share slugs and config sub-item IDs (cards, steps) |
| `sonner` | Toast notifications — official shadcn/ui recommendation, replaces their deprecated toast |

## shadcn/ui Components

Install via CLI (not npm):
```bash
npx shadcn@latest add button card input dialog sheet tabs popover label sonner
```

Components live in `src/shared/components/ui/`. They are source code, not dependencies.

## Testing

| Package | Purpose |
|---------|---------|
| `vitest` | Unit test runner — fast, Vite-native, ESM support |
| `@vitejs/plugin-react` | React transform for Vitest |
| `@testing-library/react` | Component testing utilities |
| `@testing-library/jest-dom` | DOM matchers (toBeInTheDocument, etc.) |
| `convex-test` | Official Convex backend testing — mock runtime for unit testing queries/mutations/actions |
| `@playwright/test` | E2E browser testing — chromium + webkit (Safari) |
| `@clerk/testing` | Playwright helpers for Clerk auth — `clerk.signIn()` bypasses UI in E2E tests |
| `msw` | Mock Service Worker — intercept HTTP requests (LLM, ElevenLabs, Google) in tests |
| `@faker-js/faker` | Fake data generation for test fixtures and seeding |

**Test strategy:**
- **Unit tests** (Vitest): Therapy tool components, config validation, utility functions. Colocated in `__tests__/` within feature dirs per VSA.
- **Convex backend tests** (Vitest + `convex-test`): Test queries, mutations, and actions against a mock Convex runtime. No real backend needed.
- **E2E tests** (Playwright): Critical user flows — builder, sharing, templates, auth. Lives in `tests/e2e/`. Runs in CI.
- **API mocking** (MSW): Mock external API calls (Claude, Google, ElevenLabs) in both unit and E2E tests.
- **Auth testing** (`@clerk/testing`): Bypass Clerk UI in Playwright tests with `clerk.signIn()`.
- **No integration tests for hackathon.** Unit + E2E covers the critical paths.

## CI/CD

| Tool | Purpose |
|------|---------|
| **GitHub** | Repository hosting, PR workflow |
| **GitHub Actions** | CI pipeline (lint, typecheck, unit tests, E2E) + CD (deploy) |
| **Vercel** | Auto-deploys on push to main via GitHub integration |
| **Convex CLI** | `npx convex deploy` in CI for backend deployment |

**CI workflow** (`.github/workflows/ci.yml`): Runs on every push and PR. Lint → type check → Vitest → Playwright → upload test report.

**Deploy workflow** (`.github/workflows/deploy.yml`): Runs on push to main only. All CI steps + Convex deploy. Vercel deploys automatically via GitHub app.

## DX & Validation

| Package | Purpose |
|---------|---------|
| `@t3-oss/env-nextjs` | Type-safe env var validation with Zod — catches missing keys at build time, separates server/client vars |
| `prettier-plugin-tailwindcss` | Auto-sorts Tailwind classes in recommended order. For Tailwind v4, set `tailwindStylesheet` to CSS entry file. |
| `eslint-plugin-simple-import-sort` | Auto-fixable import sorting |
| `@next/bundle-analyzer` | Visualize bundle sizes — run with `ANALYZE=true npm run build` |

## Convex Ecosystem (beyond core)

| Package | Purpose |
|---------|---------|
| `@convex-dev/rate-limiter` | Type-safe rate limiting for public shared-tool endpoints. No crons or scaling storage. |

> Note: `@convex-dev/agent`, `@convex-dev/rag`, and `convex-helpers` are listed in their respective sections above.

## Dev Dependencies

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom convex-test @playwright/test @clerk/testing msw @faker-js/faker @types/react @types/node eslint eslint-config-next prettier prettier-plugin-tailwindcss eslint-plugin-simple-import-sort @next/bundle-analyzer tailwindcss
```

## Third-Party Services

| Service | Package | API Key Env Var | Free Tier |
|---------|---------|----------------|-----------|
| Anthropic (Claude) | `@ai-sdk/anthropic` | `ANTHROPIC_API_KEY` | Pay-per-token |
| Google AI (Embeddings) | `@ai-sdk/google` | `GOOGLE_API_KEY` | Free |
| Google AI (Image Gen) | `@google/genai` | `GOOGLE_API_KEY` | 500 req/day |
| ElevenLabs (TTS) | `elevenlabs` | `ELEVENLABS_API_KEY` | 10K chars/month |
| fal.ai (Image gen alternative) | `@fal-ai/client` | `FAL_KEY` | Pay-per-image |
| Convex | `convex` | `CONVEX_DEPLOYMENT` | 1M calls, 1GB |
| Vercel | — | Automatic | Hobby plan |
