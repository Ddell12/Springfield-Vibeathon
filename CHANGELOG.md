# Changelog — Bridges

All notable changes to this project are documented here.

---

## 2026-03-26 — Authentication, Final Polish & Submission

### Added
- **Convex Auth authentication** — Full sign-in/sign-up flow with Next.js auth providers and Convex-backed sessions
- Dedicated `/sign-in` and `/sign-up` pages
- `UserButton` integrated into dashboard sidebar and marketing header for account management
- Graceful auth degradation — unauthenticated users can still explore templates and the builder
- MIT LICENSE file
- Updated `.gitignore` for cleaner repository

### Changed
- Tightened session state validation with strict enum validators
- Sanitized all error responses to hide internal details from clients
- Fixed ESLint import ordering and React hooks warnings
- Hardened security: XSS sanitization, rate limiting, blob URL race condition fixes, cascade deletes

### Removed
- Cleaned development artifacts and stale plan files from repository

---

## 2026-03-25 — Builder Agent Enhancement

### Added
- **Multi-turn AI tool loop** — Claude can call `generate_image`, `generate_speech`, and `enable_speech_input` mid-generation, receive CDN URLs, then continue building with those assets embedded. Capped at 10 tool turns per session.
- **AI image generation** — Therapy-specific picture cards via Google Gemini with category-aware Kawaii-style prompts. SHA-256 prompt caching eliminates duplicate API calls.
- **Text-to-speech** — ElevenLabs integration with child-friendly voice options (`warm-female`, `calm-male`, `child-friendly`). Cached in Convex for instant replay.
- **Speech-to-text** — ElevenLabs Scribe v2 for voice input
- **12 therapy React components** — TapCard, SentenceStrip, BoardGrid, StepItem, PageViewer, TokenSlot, CelebrationOverlay, RewardPicker, CommunicationBoard, VisualSchedule, TokenBoard, SocialStory
- **Runtime TTS/STT bridge** — PostMessage-based communication between parent app and iframe for dynamic speech at runtime
- **Vercel publish pipeline** — One-click deploy of generated apps as standalone static sites
- **4 curated templates** — Communication Board, Morning Routine, 5-Star Reward Board, Going to the Dentist

### Changed
- Streaming route restructured from single-turn to multi-turn tool loop
- Agent system prompt expanded with component library documentation, tool specs, and therapy design rules
- Preview panel supports microphone access for speech input
- Image pre-seeding script generates ~50 common therapy images on first deploy

### Security
- Tool turn limit prevents runaway API costs
- PostMessage origin validation prevents cross-origin abuse
- Iframe sandbox hardened (`allow-scripts` only)
- Promise.allSettled for resilient file persistence

---

## 2026-03-24 — Streaming Builder & WebContainer Preview

### Changed
- **Full architecture pivot** — Replaced config-based tool generation with streaming code generation pipeline
- **AI backend** — Direct `@anthropic-ai/sdk` usage replaces previous agent framework for lower latency and full control
- **State machine** — Phasic pipeline: blueprinting → template selection → code generation → live preview → publish
- **Schema evolution** — Sessions, messages, blueprints, phases, files, and versions tables added
- **Frontend** — New three-panel builder: AI chat + streaming code + live preview with phase timeline

### Added
- Streaming SSE pipeline with real-time code generation
- Blueprint approval flow — AI generates therapy-specific PRD, user approves before building
- WebContainer-based live preview with hot module replacement
- Session persistence and version history
- Zod schema validation for therapy blueprints

---

## 2026-03-24 — UX Overhaul: Sandbox + Design System

### Added
- **Therapy design system** — Custom CSS framework (therapy-ui.css) with 12 component classes, Nunito + Inter fonts, and child-friendly color palette
- **Persistence tiers** — Session-only, device storage (localStorage), or cloud sync
- **Undo/version history** — Up to 10 versions with single-tap undo
- **Dark mode** — Full Material 3 dark palette with theme toggle
- **Responsive preview** — Phone (375px) / Tablet (768px) / Desktop breakpoint picker
- **Confetti celebration** — CSS particle burst on first successful generation
- **Publish to Vercel** — One-click deploy to permanent URL via Vercel Deploy API
- **Share dialog** — Tabs for preview link and published link

### Changed
- Stripped all developer jargon from UI — "Creating your app" instead of "Writing component code"
- Removed 9 stub buttons that had no functionality
- AlertDialog replaces browser `confirm()` for destructive actions
- Error messages include retry button

---

## 2026-03-24 — RAG Knowledge Base & Templates

### Added
- **110 therapy knowledge entries** across 5 categories: ABA terminology, speech therapy, tool patterns, developmental milestones, IEP goals
- **RAG vector search** — Google Gemini embeddings (768-dim) with Convex RAG component
- **Idempotent seeding** — Knowledge base and templates auto-seed on first deploy with deduplication
- **6 starter templates** — Feelings Board, Basic Needs Board, 5-Star Reward Chart, Sticker Collection, Morning Routine, Bedtime Routine
- Template gallery with live Convex queries and skeleton loading

---

## 2026-03-23 — Therapy Tool Components

### Added
- **Visual Schedule** — Drag-to-reorder routines via `@dnd-kit/react`, tap-to-complete with animations
- **Token Board** — Animated token earning with reinforcer selection and zustand state management
- **Communication Board** — Picture card grid with sentence building, drag-to-reorder, and TTS placeholder
- **ElevenLabs TTS** — Text-to-speech action with Convex file storage caching
- **Google Gemini image generation** — AI-generated therapy picture cards
- Unit tests for all therapy components

---

## 2026-03-23 — AI Chat & Tool Generation

### Added
- AI agent with Claude Sonnet — system prompt with therapy domain knowledge
- Streaming chat interface with real-time tool preview
- Tool CRUD operations with nanoid share slugs
- Chat UI with message persistence
- Backend tests via `convex-test`

---

## 2026-03-23 — Foundation & Setup

### Added
- Next.js 16 project with TypeScript, Tailwind v4, App Router
- Convex backend with RAG and Agent components
- 15 shadcn/ui components configured
- Responsive layout with mobile navigation
- Vitest + Playwright testing infrastructure
- GitHub Actions CI/CD (lint, test, deploy)
- Deployed to Convex Cloud and Vercel
