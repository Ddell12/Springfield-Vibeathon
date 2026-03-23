# Project Brief

<!--
Captured before any artifact is created. Referenced by all 11 artifacts.
Keep this tight — it's context, not a PRD.
-->

## The App

| Field | Value |
|---|---|
| Name | {name} |
| One-liner | {what it does} |
| AI-powered | {yes/no — if yes, what the AI does} |
| Stage | {Idea / Hackathon / MVP / V2} |
| Target launch | {date or "this weekend"} |

## Problem → Solution

- **Problem**: {what sucks today}
- **Solution**: {what this app does about it}
- **Why now**: {why build this now}

## Users

### {Persona}
- **Who**: {description}
- **Goal**: {what they want}
- **Willingness to pay**: {free / $X/mo / not yet}

## MVP Features

| Feature | Description | AI-Powered |
|---|---|---|
| {feature} | {what it does} | {yes/no} |

## Monetization

- **Model**: {freemium / subscription / free for now}
- **Pricing**: {$X/mo or TBD}
- **Provider**: Stripe via Convex component

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Latest version, `src/` directory |
| UI | shadcn/ui + Tailwind v4 | Radix primitives, `tw-animate-css` |
| AI Chat UI | AI Elements (text) / ElevenLabs UI (voice) | shadcn-style registries (CLI copies source) |
| AI Framework | Vercel AI SDK (`ai` + `@ai-sdk/react`) | Required by AI Elements for `useChat` etc. |
| Validation | Zod | Client + server schemas, form validation |
| Backend | Convex | Queries, mutations, actions |
| Database | Convex (built-in) | Document-based, real-time |
| Auth | Clerk → Convex webhook sync | JWT validation in Convex, `svix` for webhook verification |
| File Storage | Convex file storage / Cloudflare R2 (large) | R2 when >50MB or CDN needed |
| Hosting | Vercel (frontend) + Convex Cloud (backend) | Separate deployments |
| AI | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) default | Raw `@anthropic-ai/sdk` for simple tasks |
| Email | Convex Resend component | {if emails needed, else N/A} |
| Billing | Stripe via Convex component | {if billing needed, else N/A} |
| CI/CD | GitHub Actions | Lint + typecheck + deploy |

### Stack Deviations

<!-- Note anything that differs from the default stack and why -->
{None — using default stack / List deviations}

### Convex Components Needed

<!-- First-party and community Convex components to install -->

| Component | Purpose | npm Package |
|---|---|---|
| {Resend} | {Transactional email} | {@convex-dev/resend} |
| {Stripe} | {Billing/subscriptions} | {@convex-dev/stripe} |
| {Aggregate} | {Real-time counters/stats} | {@convex-dev/aggregate} |

## Existing Assets

- Codebase: {link or "greenfield"}
- Designs: {link or "none"}
- Docs: {link or "none"}

## Output Paths

- **Repo**: {/path/to/repo/planning/}
- **Vault**: Projects/{area}/{name}/planning/
