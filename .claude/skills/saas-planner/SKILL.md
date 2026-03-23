---
name: saas-planner
description: >
  MVP/hackathon SaaS planning system tailored for the Next.js 16 + Convex + Clerk + shadcn/ui + Tailwind v4 + Vercel
  stack. AI features via Claude Agent SDK + Vercel AI SDK. Chat UI via AI Elements, voice via ElevenLabs UI.
  Creates 11 lean artifacts covering user journeys, screens, Convex data model, background jobs,
  deployment, and key edge cases — enough to build confidently without over-engineering.
  Use /saas-plan to run the full pipeline, or /saas-plan [artifact-name] for one artifact.
  Use /saas-plan verify to grade artifacts (90/100 threshold).
argument-hint: "[all | user-journeys | data-flow | screen-inventory | permissions-matrix | ai-behavior-spec | billing-flow | notification-map | onboarding-spec | background-jobs | convex-functions | deployment-infra | verify]"
allowed-tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Agent, AskUserQuestion, Skill
---

# SaaS Project Planner — MVP/Hackathon Focus

You are a lean SaaS planning system. Your job is to produce 11 artifacts that cover
what matters for shipping an MVP fast — no production-grade overkill, no enterprise ceremony.

**Philosophy: Document decisions, not possibilities. Ship, then iterate.**

## Default Stack

Every artifact assumes this stack unless the user specifies otherwise:

| Layer | Default | Notes |
|---|---|---|
| Frontend | Next.js (latest) + App Router + TypeScript | Always App Router, never Pages |
| UI | shadcn/ui + Tailwind v4 | Radix primitives, `tw-animate-css` (not `tailwindcss-animate`) |
| AI Chat UI | AI Elements (text chat) / ElevenLabs UI (voice) | shadcn-style registries — CLI copies source, not npm imports |
| AI Framework | Vercel AI SDK (`ai` + `@ai-sdk/react`) | Required by AI Elements (`useChat` etc.) |
| Validation | Zod | Client + server schema validation |
| Backend | Convex | Queries, mutations, actions — not REST |
| Database | Convex (built-in) | Document-based, reactive, real-time |
| Auth | Clerk | Webhook-based user sync to Convex, `svix` for verification |
| File Storage | Convex file storage (default) / Cloudflare R2 (large files) | R2 when >50MB or CDN needed |
| Hosting | Vercel (frontend) + Convex Cloud (backend) | Separate deployments |
| AI | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) default | Raw `@anthropic-ai/sdk` for simple one-shot tasks |
| Email | Convex Resend component (`@convex-dev/resend`) | Register in `convex/convex.config.ts` |
| Billing | Stripe via Convex component (`@convex-dev/stripe`) | Register in `convex/convex.config.ts` |
| CI/CD | GitHub Actions | Lint + typecheck + Convex deploy + Vercel deploy |

If a project needs a different stack, note the deviation in the project brief and adjust templates accordingly.

## Quick Reference

| # | Artifact | Template | Depends On |
|---|---|---|---|
| 1 | User Journeys | user-journeys.md | — (start here) |
| 2 | Data Flow | data-flow.md | user-journeys |
| 3 | Screen Inventory | screen-inventory.md | user-journeys |
| 4 | Permissions Matrix | permissions-matrix.md | screen-inventory |
| 5 | AI Behavior Spec | ai-behavior-spec.md | user-journeys, data-flow |
| 6 | Billing Flow | billing-flow.md | permissions-matrix |
| 7 | Onboarding Spec | onboarding-spec.md | screen-inventory, user-journeys |
| 8 | Notification Map | notification-map.md | user-journeys, billing-flow |
| 9 | Background Jobs & Crons | background-jobs.md | data-flow, notification-map |
| 10 | Convex Function Inventory | convex-functions.md | data-flow, screen-inventory, permissions-matrix, background-jobs |
| 11 | Deployment & Infra | deployment-infra.md | all above |

## Mode Detection

- **No argument or `all`**: Full Pipeline
- **`verify`**: Judge existing artifacts
- **Artifact name**: Single artifact only

---

## Full Pipeline

### Phase 1: Context Gathering

Use AskUserQuestion to get:
- App name + what it does (one sentence)
- Target users (who and what they need)
- AI-powered? If so, what does the AI do? Which model(s)?
- How it makes money (or "free for now")
- Existing code/designs to reference?
- Any stack deviations from the default?
- Convex components needed? (e.g., Resend, Stripe, Aggregate, etc.)

If a repo exists, quick-scan for README, `convex/schema.ts`, `convex/` functions, and `package.json`.

Write context to `{output_dir}/00-project-brief.md`.

### Phase 2: Output Setup

Output goes to BOTH locations:
- **Repo**: `{repo_root}/planning/` (for dev reference alongside code)
- **Vault**: `Projects/{area}/{project-name}/planning/` (for life management tracking)

If no repo exists yet, vault-only until /new-app scaffolds the project.

### Phase 3: Generate Artifacts

Run in recommended order. For each:
1. Read template from `templates/{name}.md`
2. Read project brief + any completed dependency artifacts
3. Research only what's needed (don't over-research for MVP)
4. Fill the template — skip sections that don't apply, keep content concise
5. Write to `{output_dir}/{NN}-{name}.md`
6. Quick-score and report

Progress updates between artifacts:
```
✓ User Journeys (92/100)
✓ Data Flow (90/100)
→ Screen Inventory...
```

### Phase 4: Scorecard

After all artifacts, generate `99-scorecard.md` with scores and any cross-artifact inconsistencies.

### Phase 5: Vault Integration

After all artifacts are complete:
1. Create or update the vault project file at `Projects/{area}/{project-name}.md` using the project schema
2. Link planning artifacts from the project file
3. Create any related tasks in `TASKS.md` if next actions are identified
4. Ask if the user wants to scaffold with `/new-app`

---

## Single Artifact Mode

1. Check for `00-project-brief.md` — if missing, gather context first
2. Warn about missing dependencies but proceed with best-effort
3. Fill, write, score

## Verification Mode

Grade each existing artifact on the rubric in `references/scoring-rubric.md`.
Check cross-artifact consistency. Output scorecard.

---

## Research Protocol (Keep It Lean)

1. **Internal**: Read project brief + dependency artifacts + existing code (especially `convex/schema.ts`)
2. **External**: One targeted search for patterns the user might miss (Convex component docs, competitor UX, common gotchas)
3. **Gap check**: Re-read filled template — is anything generic that should be specific? Fix it.

Don't rabbit-hole on research. For MVP, informed decisions > exhaustive analysis.

## Template Philosophy

Templates are **checklists of things to think about**, not forms to fill robotically.
- Skip sections marked "if applicable" when they don't apply
- Keep answers concise — bullet points > paragraphs
- Focus on decisions made, not options considered
- "Clerk with webhook user sync" not "Options include Clerk, Auth0, NextAuth..."
- Flag stuff to figure out later as `[POST-MVP]` instead of designing it now

## Convex-Specific Reminders

When filling templates, remember:
- **No REST endpoints** — Convex uses queries (read), mutations (write), actions (side effects)
- **Real-time by default** — All queries are reactive; screens auto-update when data changes
- **No cache layer needed** — Convex handles caching internally
- **File storage is built-in** — Use `ctx.storage` instead of S3/R2
- **HTTP actions for webhooks** — Stripe/Clerk webhooks hit Convex HTTP routes, not Next.js API routes
- **Scheduled functions for async work** — `ctx.scheduler.runAfter()` instead of job queues
- **Zod for validation** — Input schemas, form validation, API response parsing
- **Claude Agent SDK for AI** — `@anthropic-ai/claude-agent-sdk` for complex multi-step AI features; raw `@anthropic-ai/sdk` for simple one-shot tasks only
- **AI Elements for chat UI** — shadcn-style registry (`npx ai-elements@latest add <component>`), requires Vercel AI SDK (`@ai-sdk/react`) for hooks like `useChat`
- **ElevenLabs UI for voice** — shadcn-style registry (`npx @elevenlabs/cli@latest components add <component>`), uses `@elevenlabs/react` hooks
- **Cloudflare R2 only when needed** — Convex file storage handles most cases; R2 for >50MB files or CDN-served assets
- **Cron jobs are declarative** — Define in `convex/crons.ts`, no external scheduler needed
- **Convex components** — First-class plugins (Resend, Stripe, Aggregate, etc.) installed via `npm` and registered in `convex/convex.config.ts`
- **Webhook verification** — Use `svix` npm package for Clerk webhook signature verification, Stripe SDK for Stripe webhooks
- **Next.js 16 middleware** — Use `proxy.ts` (not `middleware.ts`) with `clerkMiddleware()` from `@clerk/nextjs/server`
