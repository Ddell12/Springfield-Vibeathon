# AI Behavior Spec

<!--
MVP FOCUS: What the AI does, how to handle when it fails, and how to not burn money.
All AI calls happen in Convex actions (not Next.js API routes).
Skip model migration plans, A/B testing, and detailed monitoring dashboards.
If the app isn't AI-powered, skip this artifact entirely.
-->

## AI Features

<!-- One block per distinct AI capability -->

### {feature_name}
- **What it does**: {plain language}
- **Implementation**: {Claude Agent SDK (multi-step/tools) / raw Anthropic SDK (one-shot) / OpenAI / Gemini}
- **Model**: {Claude Sonnet 4.6 / Claude Haiku 4.5 / Claude Opus 4.6 / GPT-4o / Gemini 2.5 Flash}
- **Why this model**: {fast+cheap / best quality / structured output / multimodal}
- **Agent or one-shot?**: {Agent with tools / single completion / classification}
- **Trigger**: {user clicks button / automatic / background via scheduled function}
- **Input**: {what data goes to the model}
- **Output**: {what comes back — text, JSON, classification, etc.}
- **Latency**: {acceptable wait time — <5s, <30s, background OK}
- **Streaming**: {yes / no — note: Convex actions don't natively stream; use HTTP action for streaming}

### Implementation Decision Guide

| Feature Type | Use | Why |
|---|---|---|
| Multi-step reasoning, tool use, autonomous workflows | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | Agent loop with built-in tools, session persistence, MCP support |
| Simple text generation, summarization | Raw Anthropic SDK (`@anthropic-ai/sdk`) | Lower overhead, single API call |
| Classification, labeling, extraction | Raw Anthropic SDK or Gemini | Fast, cheap, structured output |
| Vision/image analysis | Claude Sonnet 4.6 or Gemini 2.5 Flash | Multimodal input |
| Voice AI, speech-to-text, TTS | ElevenLabs API (`@elevenlabs/elevenlabs-js`) | Dedicated voice platform |

### Convex Integration Pattern

```
// Agent SDK pattern (default for complex AI features):
Client → useMutation("jobs:create") → creates pending record
  → ctx.scheduler.runAfter(0, internal.ai.runAgent, {jobId})
  → Convex action uses Claude Agent SDK (query())
  → Agent uses tools (read DB, call APIs, etc.)
  → Agent returns result → mutation saves to DB
  → Client sees result via useQuery (real-time, no polling)

// Simple one-shot (raw SDK for trivial tasks):
Client → useMutation("jobs:create") → creates pending record
  → ctx.scheduler.runAfter(0, internal.ai.process, {jobId})
  → Convex action calls @anthropic-ai/sdk directly
  → Saves result via mutation
  → Client sees result via useQuery

// Streaming: HTTP action (if needed)
Client → fetch("{convex-url}/ai/stream") → Convex HTTP action
  → Streams response chunks to client
  → Final result saved via internal mutation
```

### Claude Agent SDK Setup

```typescript
// In Convex action — complex AI features (default)
import { query } from "@anthropic-ai/claude-agent-sdk";

// Agent with built-in tools, session persistence, MCP support
// Handles tool-use loop, retries, and multi-step reasoning automatically
const result = await query({
  model: "claude-sonnet-4-6",
  prompt: "...",
  // tools, systemPrompt, maxTurns, etc.
});
```

```typescript
// In Convex action — simple one-shot tasks only
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "..." }],
});
```

**When to use Agent SDK vs raw API**:
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`): Feature needs decisions, tool use, multi-step workflows, or session persistence
- **Raw API** (`@anthropic-ai/sdk`): Feature is a single prompt → response (summarize, classify, extract, generate)

---

## Model Selection Guide

| Use Case | Recommended Model | API ID | Fallback | Cost/1M tokens (in/out) |
|---|---|---|---|---|
| Complex reasoning/analysis | Claude Sonnet 4.6 | `claude-sonnet-4-6` | GPT-4o | $3/$15 |
| Premium quality / hard problems | Claude Opus 4.6 | `claude-opus-4-6` | Claude Sonnet 4.6 | $5/$25 |
| Fast classification/simple tasks | Claude Haiku 4.5 | `claude-haiku-4-5` | Gemini 2.5 Flash | $1/$5 |
| Structured JSON output | Claude Sonnet 4.6 | `claude-sonnet-4-6` | GPT-4o (JSON mode) | $3/$15 |
| Vision/image analysis | Claude Sonnet 4.6 | `claude-sonnet-4-6` | Gemini 2.5 Flash | $3/$15 |
| Long context (>100K tokens) | Gemini 2.5 Flash | — | Claude Sonnet 4.6 | Varies |
| Code generation | Claude Sonnet 4.6 | `claude-sonnet-4-6` | GPT-4o | $3/$15 |

**MVP approach**: Pick ONE primary model. Add fallbacks only if you hit reliability issues.

---

## Prompt Strategy

<!-- Per feature — keep it high-level, not the actual prompts -->

### {feature_name}
- **System prompt role**: {what persona/constraints}
- **Context sent**: {last N messages / RAG results / full history / specific Convex data}
- **Output format**: {free text / structured JSON / specific schema}
- **Multi-step?**: {single call / chain of calls — describe chain}
- **Prompt location**: {hardcoded in Convex action / stored in env var / Convex table}

**RAG** (if applicable):
- Source: {what docs/data}
- Vector store: {Convex vector search (built-in) / external}
- Embedding model: {text-embedding-3-small / Cohere / etc.}
- Chunk strategy: {basic — size + overlap}

---

## When AI Fails

<!-- Most important section. MVP apps with no failure handling feel broken. -->

| Failure | What User Sees | Convex Does |
|---|---|---|
| Model timeout | "Taking longer than usual..." (job stays pending) | Action retries once; if fails, marks job as `failed` |
| Bad/wrong output | Result displayed + thumbs down button | Log feedback to `feedback` table for review |
| Rate limited | "Busy, try again in a moment" | Scheduled retry with exponential backoff |
| Provider outage | "AI features temporarily unavailable" | Feature disabled via flag; rest of app works |
| Malformed response | User doesn't see — silent retry | Retry with same prompt, max 2x, then mark failed |
| Convex action timeout (10min) | "Request timed out" | Break long tasks into smaller scheduled chunks |

---

## Cost Controls

| Control | Limit | Implementation |
|---|---|---|
| Max tokens per request | {input + output cap} | Set in API call params |
| Per-user daily limit | {N requests/day or none for MVP} | Counter in Convex `users` table, checked in mutation |
| Monthly budget alert | ${X} | Provider dashboard alert (Anthropic/OpenAI console) |
| Free tier AI access | {N free requests / no access / limited model} | Check `user.plan` in Convex mutation before scheduling action |

**Estimated cost**: ~${X} per request, ~${X}/month at {N} users

---

## AI UX Patterns

**IMPORTANT: Never build custom AI chat components. Use prebuilt libraries.**

### Text Chat Interface → AI Elements + Vercel AI SDK

Use AI Elements (shadcn-style registry) for all text-based AI chat UIs.
- Install: `npx ai-elements@latest add conversation message prompt-input`
- Requires `@ai-sdk/react` for hooks (`useChat`, `useCompletion`)
- Components: Conversation, Message, PromptInput, CodeBlock, Reasoning, Sources, etc.
- Use the `/ai-elements` skill to create/customize components

### Voice AI Interface → ElevenLabs UI + React SDK

Use ElevenLabs UI components (shadcn-style registry) for voice-based AI features.
- Install: `npx @elevenlabs/cli@latest components add conversation-bar orb voice-button`
- Requires `@elevenlabs/react` for hooks (`useConversation`, `useTranscription`)
- Components: Conversation Bar, Orb, Voice Button, Mic Selector, Speech Input, etc.

### General UX Decisions

| Pattern | Decision |
|---|---|
| Text chat UI | AI Elements + `@ai-sdk/react` hooks (never custom) |
| Voice AI UI | ElevenLabs UI + `@elevenlabs/react` hooks (never custom) |
| Loading state | {Streaming text via AI Elements / typing dots / spinner} |
| Progress for long tasks | {Progress bar (update via Convex mutations) / "Processing..." with reactive status} |
| Cancel mid-generation | {yes — mark job as cancelled, action checks before saving / no} |
| Copy/export result | {Copy button / download / none for MVP} |
| Edit AI output | {Inline edit / regenerate / both} |
| Feedback mechanism | {Thumbs up/down → Convex mutation / none for MVP} |
| History | {Previous results stored in Convex table / no history for MVP} |

---

## Open Questions

- {question}

`[POST-MVP]`: {fine-tuning, advanced RAG, model fallback chains, usage analytics, prompt versioning, A/B testing}
