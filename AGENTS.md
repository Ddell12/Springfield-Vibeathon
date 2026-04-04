# AGENTS.md

## Purpose

This repository is **Bridges**, an AI-assisted therapy platform for ABA therapists, speech therapists, and caregivers. The original core product is an AI app builder for therapy activities, but the current codebase also includes broader clinical workflows such as patients, sessions, billing, intake, goals, plans of care, discharge, flashcards, speech coach, and family-facing flows.

When working in this repo, optimize for:

- therapist and caregiver usability over developer purity
- clinically sensible terminology in UI copy
- safe, typed backend changes
- consistency with the established design system

## Stack

- Frontend: Next.js 16 App Router, React, Tailwind v4, shadcn/ui
- Auth: Convex Auth with Next.js integration
- Backend: Convex
- AI generation: Anthropic Claude via streaming SSE
- RAG / embeddings: Google Gemini via `@convex-dev/rag`
- Image generation: Google Gemini
- TTS / STT: ElevenLabs
- Deploy: Vercel

## Architecture

The project follows a vertical-slice architecture:

- `src/app/`: route entrypoints only; keep page files thin
- `src/core/`: app-wide infrastructure and utilities
- `src/shared/`: code reused across 3+ features, including shared UI primitives
- `src/features/<feature>/`: feature-local components, hooks, types, and logic
- `convex/schema.ts`: single schema definition
- `convex/*.ts`: backend functions organized by domain

Current feature surface under `src/features/` includes:

- `builder`, `templates`, `explore`, `play`, `sharing`, `shared-tool`
- `patients`, `sessions`, `session-notes`, `data-collection`, `goals`
- `billing`, `intake`, `evaluations`, `plan-of-care`, `discharge`
- `family`, `flashcards`, `speech-coach`, `dashboard`, `settings`, `landing`, `library`, `my-tools`

## Critical Flows

### AI app builder

The builder pipeline is:

1. User describes an app.
2. `src/app/api/generate/route.ts` streams generation events via SSE.
3. The builder agent writes files into a WAB scaffold and can invoke tool-style generation steps such as images and speech.
4. Parcel bundles the generated app into a self-contained HTML artifact.
5. The preview renders inside a sandboxed iframe.
6. Sessions and generated artifacts are persisted in Convex and can be published to Vercel.

Key files:

- `src/app/api/generate/route.ts`
- `src/features/builder/lib/agent-prompt.ts`
- `src/features/builder/hooks/use-postmessage-bridge.ts`
- `convex/sessions.ts`
- `convex/image_generation.ts`
- `convex/aiActions.ts`
- `convex/publish.ts`

### Auth

Auth spans three layers:

- `src/app/layout.tsx`: root auth/app wrapper
- `src/core/providers.tsx`: Convex Auth provider bridge
- `convex/auth.config.ts`: auth provider configuration for backend access

Protected backend access must derive identity server-side. Do not trust client-provided user identifiers for authorization.

## Rules For Editing

### General

- Keep `src/app/**` route files thin; move real logic into feature slices.
- Prefer editing within the owning feature directory instead of creating new cross-cutting folders.
- Use language users understand. In the UI, prefer `app`, `session`, and `blueprint`. Avoid surfacing internal jargon like `component`, `API`, `deploy`, or `database`.
- Do not use inline `style={{}}` if Tailwind can express the same styling.

### Design system

Read `DESIGN.md` before making any visual change. Treat it as the source of truth for typography, color, spacing, motion, and overall visual direction.

Important constraints carried over from the current guide:

- Display font: Fraunces
- Body font: Instrument Sans
- Mono font: Commit Mono
- Base canvas: warm off-white
- Primary brand color: teal
- Avoid hard 1px section-divider borders when tonal separation works
- Motion should be minimal and deliberate; autistic users may be motion-sensitive
- Use the project motion curve and keep animations at or above 300ms when motion is necessary

### Next.js

- App Router only
- Default to Server Components
- Add `"use client"` only when hooks, browser APIs, or interactivity require it
- Use `export const metadata` instead of manual `<title>` tags

### Tailwind and shadcn

- Tailwind v4 configuration lives in `src/app/globals.css` via `@theme`
- Shared shadcn primitives belong in `src/shared/components/ui/`
- Use semantic tokens like `bg-background`, `text-foreground`, and `border-border`
- Use `cn()` from `src/core/utils.ts` for class merging

### Convex

Before editing Convex code, read:

- `convex/_generated/ai/guidelines.md`

Important local rules:

- Use named exports only
- Add validators for all function args
- Keep Node actions in separate files and mark them with `"use node";`
- Do not mix `"use node";` actions with queries or mutations in the same file
- Prefer `.withIndex()` over `.filter()`
- Follow index naming like `by_fieldName` or, for compound indexes, include all indexed fields in the name
- Keep the schema centralized in `convex/schema.ts`
- `convex/convex.config.ts` belongs inside `convex/`

## Testing

Primary test commands:

```bash
npm test
npx playwright test
```

Test layout:

- unit and React tests are colocated under `__tests__/`
- Convex backend tests live in `convex/__tests__/`
- E2E tests live in `tests/e2e/`

When changing backend logic, feature hooks, or shared UI behavior, update or add tests near the changed code.

## Source-Of-Truth Docs

Read the smallest relevant set before large edits:

- `CLAUDE.md`: project-specific operating guide
- `DESIGN.md`: visual system and UX constraints
- `docs/architecture/project-structure.md`: repo structure details
- `docs/architecture/tech-stack.md`: stack decisions
- `docs/architecture/data-models.md`: backend/domain modeling
- `docs/ai/prompt-library.md`: builder prompts and AI behavior
- `docs/prd.md`: product requirements
- `docs/product-vision.md`: product positioning and audience
- `docs/product-roadmap.md`: current roadmap and priorities

## Environment And Integrations

Common env vars include:

- Next.js: `NEXT_PUBLIC_CONVEX_URL`, `SITE_URL`, `CONVEX_SITE_URL`, `ANTHROPIC_API_KEY`
- Convex: `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ELEVENLABS_API_KEY`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`

Expect integrations with Convex Auth, Convex, Anthropic, Gemini, ElevenLabs, and Vercel to be part of normal feature work.

## Deployment And Verification

Useful checks after meaningful changes:

- `npm test`
- `npx playwright test`
- `npx vercel ls`
- `npx vercel inspect <deploy-url>`
- `npx vercel logs bridgeai-iota.vercel.app`

## Practical Guidance For Codex

- Start by locating the owning feature slice and the matching Convex domain file.
- Preserve existing naming and terminology; this is a clinician-facing product.
- Prefer small, local changes over architectural drift.
- If a UI change is requested, check `DESIGN.md` first.
- If a Convex change is requested, check `convex/_generated/ai/guidelines.md` first.
- If a route file grows beyond a thin wrapper, extract logic into `src/features/<feature>/`.
- Treat generated Convex files under `convex/_generated/` as read-only, except for reading guidance docs.
