# Bridges App Builder Pivot — Design Spec

> **Date:** 2026-03-24
> **Context:** Springfield Vibeathon "Close the Gap" challenge (ends March 27)
> **Goal:** Evolve Bridges from config-based therapy tool generator into a therapy-focused AI app builder by forking E2B Fragments
> **Spec Review:** v2 — incorporates review feedback (contradictions, risks, scope cuts)

---

## 0. Key Architectural Decisions

These decisions resolve contradictions found during spec review:

1. **Chat architecture: Fragments' Vercel AI SDK replaces Convex Agent for chat.** Convex Agent (`@convex-dev/agent`) and `@assistant-ui/react` are abandoned for the chat flow. Convex Agent remains installed only because the RAG component depends on it. Chat messages are stored as a JSON array on the `projects` table, not in Convex Agent threads.

2. **Two streaming modes.** Interview phase uses `streamText()` (conversational). Code generation phase uses `streamObject()` with `FragmentSchema` (structured output). The API route detects which mode based on whether enough context has been gathered.

3. **Auth deferred to Day 3.** Following CLAUDE.md convention ("Don't add auth until final phase"). Days 1-2 use a hardcoded mock userId. Clerk wired on Day 3 only if time permits.

4. **Next.js version: stay on 16.** Upgrade Fragments' code to work with Next.js 16 (current project version) rather than downgrading. The App Router API is stable across 14-16; the main risk is middleware signature changes.

5. **LLM calls move to Next.js API routes.** This breaks the existing Convex convention of "all Claude calls in Convex actions." Accepted trade-off: Fragments' streaming pattern requires a Next.js route handler for `streamObject()`/`streamText()`. Convex actions are still used for RAG queries.

6. **Existing `tools` table is not migrated.** The new `projects` table replaces it for the vibeathon. Old config-based tools are preserved in the DB but not surfaced in the new UI. Post-vibeathon, a migration can convert them to projects.

7. **Zod compatibility.** Verify whether Fragments uses Zod 3 or 4. If Zod 3, the `FragmentSchema` must be defined with `zod/v3` (same as Convex Agent requirement). If conflict exists, use separate imports (`zod` for app code, `zod/v3` for Convex/Fragments schemas).

8. **E2B package verification needed.** Confirm whether Fragments uses `@e2b/sdk` (general sandbox) or `@e2b/code-interpreter` (Python notebooks). For Next.js app generation, `@e2b/sdk` with custom templates is likely correct.

---

## 1. Problem Statement

Bridges currently generates JSON configurations that pre-built React components render. This limits users to 3 tool types (token boards, visual schedules, communication boards). The Vibeathon challenge asks for a tool that lets non-technical people create their own software — going from "I have a problem" to "I have a working solution."

The gap: Bridges has therapy domain expertise but can't generate arbitrary tools. E2B Fragments can generate arbitrary apps but has no domain expertise and a developer-focused UX.

## 2. Solution

Fork E2B Fragments as the infrastructure layer. Layer Bridges' therapy domain expertise, guided interview UX, and Convex persistence on top. The result: a non-technical therapy parent or ABA therapist describes what they need in plain language, the AI asks clarifying questions in therapy-speak, generates a working React app in an E2B sandbox, and deploys it to a shareable URL — all without the user ever seeing code.

## 3. Architecture

### 3.1 High-Level Flow

```
User lands on Bridges
       |
  Guided Interview (AI leads with domain-aware questions)
       |
  AI assembles spec (hidden from user)
       |
  Claude generates React app via streamObject()
       |
  E2B sandbox boots, installs deps, runs app
       |
  iframe preview appears in builder panel
       |
  User iterates ("make buttons bigger", "add a timer")
       |
  One-click deploy -> shareable URL
```

### 3.2 What Comes From E2B Fragments (no custom code)

| Capability | Fragments Source |
|---|---|
| Streaming code generation | `app/api/chat/route.ts` using Vercel AI SDK `streamObject()` |
| Sandbox execution | `app/api/sandbox/route.ts` using `@e2b/code-interpreter` |
| Live preview | `components/fragment-web.tsx` — iframe to `sbx.getHost(port)` |
| Code display | `components/fragment-code.tsx` — syntax-highlighted view |
| FragmentSchema | `lib/schema.ts` — Zod schema for generated code output |
| Next.js sandbox template | `sandbox-templates/nextjs-developer/` |
| Dependency installation | `sbx.commands.run('npm install ...')` in sandbox route |

### 3.3 What Gets Stripped From Fragments

| Component | Reason |
|---|---|
| Supabase auth (`lib/supabase.ts`, `lib/auth.ts`, `components/auth.tsx`) | Replaced by Clerk (Day 3) or mock user (Days 1-2) |
| PostHog analytics | Not needed for vibeathon |
| Morph LLM edits (`app/api/morph-chat/`, `lib/morph.ts`) | Paid service; Claude handles edits directly |
| Rate limiting (`lib/ratelimit.ts`, Upstash) | Not needed for vibeathon |
| Multi-model picker (`lib/models.json`, `components/chat-settings.tsx`) | Hardcode Claude Sonnet |
| Vercel KV URL shortening | Replaced by Convex |

### 3.4 What Gets Added/Replaced

| Component | Implementation |
|---|---|
| **Therapy system prompt** | Custom `lib/prompt.ts` with interview mode + iteration mode + RAG context injection |
| **RAG context injection** | Convex action queries knowledge base, injects relevant entries into system prompt per message |
| **Guided interview UX** | AI leads with domain-specific questions; no blank cursor |
| **Clerk auth (Day 3)** | `@clerk/nextjs` — Google + email sign-in. Deferred to Day 3; mock userId on Days 1-2 |
| **Convex persistence** | Projects, chat history, published tools, templates. Replaces existing `tools` table for vibeathon |
| **Bridges design system** | Colors, fonts (Manrope + Inter), no-line rule, surface hierarchy |
| **Non-technical UX** | No jargon in UI — no "component", "deploy", "database" |
| **Shareable URL** | MVP: E2B sandbox URL (`sbx.getHost(port)`). Stretch: Vercel Deploy API for persistent URLs |
| **Template gallery** | Pre-built therapy starters stored in Convex |

## 4. Conversation Layer Design (The Differentiator)

### 4.1 Interview Mode (Default for New Projects)

When a user starts a new project, the AI doesn't wait for a prompt. It leads:

```
AI: "Hi! I'm here to help you build a tool for your therapy practice
     or your child's learning. What kind of tool are you thinking about?"

User: "I need something to track my son's behaviors during the day"

AI: "Got it — a behavior tracking tool. A few quick questions:
     1. What specific behaviors are you tracking?
        (e.g., meltdowns, self-regulation moments, task completion)"

User: "Meltdowns and when he successfully uses his calming strategies"

AI: "Perfect. How do you want to record these —
     tapping a button when it happens, or filling in details after?"

User: "Just tapping a button, I need it fast"

AI: "Last question — do you want to see a daily summary or a
     weekly chart of patterns?"

User: "Weekly chart would be amazing"

AI: "Building your behavior tracker now..."
[generates React app with tap-to-record + weekly chart]
```

### 4.2 Iteration Mode (After First Generation)

Once an app is generated and previewing, the AI switches to free-form refinement:

```
User: "Can you make the buttons bigger? My son tries to use it too"
User: "Add a spot for notes"
User: "Change the colors to be more calming — blues and greens"
```

Each iteration sends the current code + user request to Claude, which generates updated code and hot-swaps it in the sandbox.

### 4.3 System Prompt Structure

```
[Base instructions — you are Bridges, a therapy tool builder]
[Interview protocol — ask 3-5 questions before generating]
[Domain context — injected RAG entries relevant to user's description]
[Template awareness — available therapy templates and when to suggest them]
[Code generation rules — generate complete React app, use shadcn/ui, Tailwind]
[UX rules — never expose technical jargon, speak therapy language]
[Iteration rules — when user requests changes, modify existing code]
```

### 4.4 RAG Integration

The existing Convex RAG knowledge base (110 entries covering ABA therapy, speech therapy, autism tools, behavior strategies) gets queried each time the user sends a message. Top-k relevant entries are injected into the system prompt as context, giving Claude domain expertise without fine-tuning.

## 5. Data Model

### 5.1 Convex Schema Additions

```typescript
// convex/schema.ts additions
// NOTE: Existing `tools` table is preserved but not used in new UI.
// `_creationTime` is auto-provided by Convex — no manual createdAt needed.

projects: defineTable({
  userId: v.string(),                    // Mock userId on Days 1-2, Clerk ID on Day 3
  title: v.string(),
  description: v.string(),
  fragment: v.any(),                     // FragmentSchema JSON (see Section 5.3)
  chatHistory: v.array(v.any()),         // CoreMessage[] from Vercel AI SDK (NOT Convex Agent threads)
  generatedCode: v.optional(v.string()), // Persisted code for sandbox re-creation after expiry
  status: v.union(
    v.literal("interviewing"),           // Still gathering requirements
    v.literal("generating"),             // Code generation in progress
    v.literal("draft"),                  // Generated, not published
    v.literal("published")              // Deployed to shareable URL
  ),
  publishedUrl: v.optional(v.string()),
  sandboxId: v.optional(v.string()),     // Ephemeral — sandbox may expire (E2B max 1hr free tier)
  template: v.optional(v.string()),      // If started from template
  updatedAt: v.number(),                 // Manual — _creationTime handles creation
})
  .index("by_userId", ["userId"])
  .index("by_userId_and_status", ["userId", "status"])

therapyTemplates: defineTable({
  name: v.string(),                      // "Behavior Tracker"
  description: v.string(),              // Plain-language description
  category: v.union(
    v.literal("aba"),
    v.literal("speech"),
    v.literal("sensory"),
    v.literal("social"),
    v.literal("data-collection")
  ),
  fragment: v.any(),                     // Pre-built FragmentSchema (see Section 5.3)
  thumbnailUrl: v.optional(v.string()),
  sortOrder: v.number(),
})
  .index("by_category", ["category"])
```

### 5.3 FragmentSchema Shape (from Fragments `lib/schema.ts`)

Stored in `projects.fragment` and `therapyTemplates.fragment` as `v.any()`, validated in application code:

```typescript
// Zod schema — verify Zod 3 vs 4 compatibility before using
{
  commentary: string,           // AI's approach description
  template: string,             // 'nextjs-developer' | 'code-interpreter-v1'
  title: string,                // Short title (max 3 words)
  description: string,          // Short description (1 sentence)
  code: string,                 // Full runnable code, no backticks
  additional_dependencies: string[],
  has_additional_dependencies: boolean,
  install_dependencies_command: string,
  file_path: string,            // e.g., 'app/page.tsx'
  port: number | null           // e.g., 3000 for Next.js, null for scripts
}
```

### 5.4 Sandbox Lifecycle Strategy

E2B free-tier sandboxes expire after ~1 hour. To handle re-creation:

1. **On generation:** Persist `generatedCode` to the `projects` table alongside the `fragment`
2. **On sandbox expiry:** If user returns and `sandboxId` is stale, re-create sandbox from persisted code
3. **On iteration:** Update both `generatedCode` and `fragment` after each code change
4. **Demo strategy:** Pre-warm a sandbox when the user starts a project (boot during interview phase, before code gen completes) to mask 3-10s cold start latency

### 5.2 Convex Functions

```
convex/projects.ts
  - createProject (mutation) — new project from scratch or template
  - updateProject (mutation) — save chat history, fragment, status
  - getProject (query) — load project by ID
  - listUserProjects (query) — "My Tools" dashboard
  - publishProject (mutation) — set status to published, store URL
  - listTherapyTemplates (query) — template gallery

convex/knowledge/search.ts (already exists)
  - searchKnowledgeAction (internalAction) — RAG search for prompt injection
```

## 6. Tech Stack

| Layer | Technology | Source |
|---|---|---|
| Framework | Next.js 16 (App Router) | Upgrade Fragments fork to match current project |
| UI Components | shadcn/ui + Tailwind v4 | Fragments + Bridges design tokens |
| AI Chat | Vercel AI SDK `streamText()` + `streamObject()` | Fragments (interview = streamText, code gen = streamObject) |
| LLM | Claude Sonnet via `@ai-sdk/anthropic` | Replace Fragments' multi-model |
| Code Sandbox | E2B SDK (verify: `@e2b/sdk` or `@e2b/code-interpreter`) | Fragments |
| Preview | iframe to E2B sandbox URL | Fragments |
| Backend/DB | Convex | Existing Bridges backend |
| Auth | Clerk (`@clerk/nextjs`) — Day 3 stretch | Mock userId on Days 1-2 |
| Domain Knowledge | Convex RAG (110 entries) | Existing Bridges Phase 3 |
| User Tool Sharing | E2B sandbox URL (MVP) / Vercel Deploy API (stretch) | Sandbox URL is free; Vercel deploy is post-vibeathon |
| App Deploy | Vercel | Existing |

### 6.1 Environment Variables

```bash
# From Fragments
E2B_API_KEY=                    # E2B sandbox execution
ANTHROPIC_API_KEY=              # Claude Sonnet

# From Bridges (existing)
NEXT_PUBLIC_CONVEX_URL=         # Convex backend
CONVEX_DEPLOYMENT=              # Convex deployment ID
GOOGLE_GENERATIVE_AI_API_KEY=   # Embeddings for RAG

# New
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## 7. UX Design Principles

1. **AI leads, user follows.** No blank text boxes. The AI starts the conversation with domain-aware questions.
2. **Zero jargon.** The UI never says "component", "deploy", "API", "database", "server", or "sandbox." Instead: "your tool", "share it", "save it."
3. **Progressive disclosure.** Code view exists but is hidden by default. A "peek under the hood" toggle for curious users.
4. **Therapy language.** The AI says "token board" not "gamification widget." It says "visual schedule" not "task management UI."
5. **One-click everything.** Save, share, deploy — each is a single button press.
6. **Templates as conversation starters.** "Start from a Token Board" doesn't just load code — it pre-fills the interview with sensible defaults and asks "What would you like to customize?"

## 8. Build Plan (3 Days)

### Day 1 — March 24: Foundation

| Task | Details | Hours |
|---|---|---|
| Fork Fragments into Bridges repo | Clone, strip Supabase/PostHog/Morph/rate-limiting/model-picker | 1 |
| Verify E2B package + Zod version | Check `@e2b/sdk` vs `@e2b/code-interpreter`; check Zod 3 vs 4 | 0.5 |
| Upgrade to Next.js 16 | Resolve any breaking changes from Fragments' Next.js 14 | 0.5 |
| Wire Claude Sonnet | Replace multi-model with hardcoded `@ai-sdk/anthropic` | 0.5 |
| Wire Convex | Add ConvexProvider, project schema, basic CRUD mutations, mock userId | 1.5 |
| Get E2B running | Set `E2B_API_KEY`, verify sandbox creates + preview works | 1 |
| Verify end-to-end | Type prompt → Claude generates → sandbox runs → preview shows | 1 |
| **Total** | | **5.5** |

### Day 2 — March 25: The Differentiator

| Task | Details | Hours |
|---|---|---|
| Therapy system prompt | Interview mode (`streamText`) + code gen mode (`streamObject`) + iteration mode | 2.5 |
| RAG integration | Convex HTTP action for knowledge search, inject into Next.js API route | 1.5 |
| Guided onboarding UX | Welcome screen, AI-led interview, no blank cursor | 1.5 |
| Therapy templates (2 core) | Token board + behavior tracker as pre-built FragmentSchema starters | 1.5 |
| Bridges design system | Reskin chat, preview, header with Bridges colors/fonts | 1.5 |
| **Total** | | **8.5** |

**Stretch goals (if ahead of schedule):** 3 more templates (visual schedule, communication board, social story)

### Day 3 — March 26: Deploy & Demo

| Task | Details | Hours |
|---|---|---|
| Shareable URL | E2B sandbox URL as share mechanism (MVP — no Vercel deploy needed) | 0.5 |
| Project persistence | Save/load projects from Convex, sandbox re-creation from persisted code | 1.5 |
| Clerk auth (stretch) | Wire `@clerk/nextjs` if time permits; skip if tight | 1 |
| Demo flow polish | End-to-end as non-technical parent, fix rough edges | 2 |
| Error/loading/empty states | Graceful sandbox failures, generation loading, pre-warm sandbox during interview | 1 |
| Landing page | "Close the Gap" story, Bridges branding, CTA | 1.5 |
| Demo video recording | Script + record the Stacey-test walkthrough | 1 |
| **Total** | | **8.5** |

### Day 4 — March 27: Presentation

Buffer for last-minute fixes and presentation prep.

### Scope Tiers (Cut From Bottom Up If Behind)

| Tier | Items | Impact if cut |
|---|---|---|
| **Must have** | Fork + strip, Claude hardcoded, E2B sandbox, therapy prompt, interview UX, 2 templates, design reskin, demo flow | Core demo works |
| **Should have** | RAG integration, project persistence, sandbox re-creation, error states | Demo is more polished |
| **Nice to have** | Clerk auth, 3 more templates, My Tools dashboard, landing page, shareable URLs | Impressive but not required for judges |

## 9. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| E2B sandbox failures during demo | Medium | Pre-build 2-3 cached demos; have fallback video; pre-warm sandbox during interview |
| Claude generates broken code | Medium | Therapy templates as safe fallback; system prompt emphasizes simplicity; retry with error context |
| E2B free tier runs out | Low | $100 free credit is generous for a vibeathon |
| 3-day timeline too tight | Medium | Scope tiers defined (see Section 8); cut from bottom up |
| Convex + Fragments integration friction | Low | Convex is read/write only — not replacing any Fragments core |
| E2B cold start latency (3-10s) | High | Pre-warm sandbox when user starts project (boot during interview, before code gen) |
| Zod 3 vs 4 version conflict | Medium | Verify on Day 1 before writing any schemas; use `zod/v3` imports if needed |
| ConvexProvider + Fragments hydration mismatch | Medium | Test provider tree ordering early on Day 1; use deferred client creation pattern from existing code |
| Fragments fork drift from upstream | Low | Acceptable for 3-day hackathon; noted for post-vibeathon |
| RAG plumbing (Next.js route → Convex action) | Medium | Use Convex HTTP action endpoint called via `fetch()` from the API route |

## 10. Success Criteria

1. **The Stacey Test:** A non-technical person can describe a therapy tool and get a working, deployed app without seeing code or jargon.
2. **End-to-end flow:** Problem articulation (interview) -> solution generation (sandbox) -> guided iteration (refinement) -> deployment (shareable URL).
3. **Domain expertise visible:** The AI speaks therapy language, suggests therapy-appropriate tools, and knows ABA/speech therapy concepts from RAG.
4. **Live demo works:** 3-minute walkthrough from "I need a behavior tracker" to a working, shareable tool.

## 11. What This Is NOT

- Not a general-purpose Lovable/Replit competitor (therapy-first, general capability under the hood)
- Not generating arbitrary backend code (React frontend apps only, using E2B Next.js template)
- Not replacing Fragments' sandbox infrastructure (using it as-is)
- Not building custom auth (Clerk handles it)
- Not building custom code execution (E2B handles it)

## 12. Roadmap Impact

This pivot **abandons Phases 4-6** of the existing `docs/product-roadmap.md`. Those phases (sharing/persistence, Clerk auth, polish) were designed for the config-based architecture. The vibeathon pivot replaces them with a new trajectory. After the vibeathon, `docs/product-roadmap.md` should be updated to reflect the Fragments-based architecture.

Existing work preserved:
- RAG knowledge base (110 entries, Phase 3)
- Design system tokens and fonts
- Landing page components (Phase 5)
- Convex schema (tools table preserved, not migrated)

Existing work abandoned:
- Config-based tool renderers (token board, visual schedule, communication board components)
- Convex Agent chat integration + assistant-ui
- Builder sidebar, tool preview animation components

## 13. Post-Vibeathon Evolution

After the competition, the architecture supports:
- More sandbox templates (Vue, Python/Streamlit for data tools)
- Multi-file project generation
- Database integration (Convex as the generated app's backend)
- More domains beyond therapy (the conversation layer is the abstraction point)
- Collaborative editing (multiple users on one project)
