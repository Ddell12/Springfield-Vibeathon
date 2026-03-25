# Bridges Major Refactor: VibeSDK-Inspired Full Code Generation

**Date:** 2026-03-24
**Status:** Approved (brainstorming complete)
**Scope:** Big bang refactor — replace config-based tool generation with full code generation, Claude Agent SDK, phasic state machine, therapy blueprints, dynamic templates, version history

---

## Table of Contents

1. [Summary of Decisions](#1-summary-of-decisions)
2. [System Architecture](#2-system-architecture)
3. [State Machine & Session Model](#3-state-machine--session-model)
4. [Blueprint & Phase Schemas](#4-blueprint--phase-schemas)
5. [Claude Agent SDK Integration & MCP Tools](#5-claude-agent-sdk-integration--mcp-tools)
6. [E2B Templates & Dynamic Selection](#6-e2b-templates--dynamic-selection)
7. [Version History](#7-version-history)
8. [Validation Loop](#8-validation-loop)
9. [Frontend UX](#9-frontend-ux)
10. [Dependency Changes](#10-dependency-changes)
11. [Convex Schema Changes](#11-convex-schema-changes)
12. [File System Changes](#12-file-system-changes)
13. [Terminology Changes](#13-terminology-changes)
14. [Future Considerations](#14-future-considerations)

---

## 1. Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent runtime | Claude Agent SDK standalone + Convex as DB | Maximum alignment with VibeSDK architecture; agent is an autonomous process |
| Domain focus | Therapy-first code gen | Differentiator for vibeathon; domain expertise stays locked in |
| Behavior mode | Phasic (deterministic state machine) | Predictable, debuggable, great progress UX for non-technical therapists |
| Version control | Convex-based history with diffs | Clean, useful undo/diff without git complexity |
| Blueprint | Structured therapy-specific fields | Therapist-facing validation step builds trust and ensures therapeutic alignment |
| Preview/deploy | E2B with dynamic template selection | Keeps working E2B infra, adds template intelligence for better output quality |
| Migration strategy | Big bang | Clean architecture from day one, no legacy code |
| Terminology | "app" replaces "tool" everywhere | More professional, less limiting |

---

## 2. System Architecture

### What Gets Removed

- `convex/agents/bridges.ts` — Convex Agent definition + 4 tools
- `convex/chat/actions.ts` + `streaming.ts` — Convex Agent streaming orchestration
- `src/features/therapy-tools/` — Entire directory (config-based generation: tool-configs.ts, tool-renderer.tsx, fixed components)
- `src/app/api/chat/plan/route.ts` + `generate/route.ts` — Current Vercel AI SDK streaming routes
- `@convex-dev/agent`, `@ai-sdk/anthropic`, `ai` (Vercel AI SDK) — removed as dependencies
- `@assistant-ui/react` — no longer needed

### What Stays

- Convex backend (real-time subscriptions, file storage, queries/mutations)
- E2B sandbox with `vite-therapy` template family (expanded)
- RAG knowledge base (110 therapy entries, Gemini embeddings via `@convex-dev/rag`)
- ElevenLabs TTS + Google Imagen for image generation
- Next.js App Router frontend, shadcn/ui, Tailwind v4
- Clerk auth (deferred), Vercel deployment

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: NEXT.JS API — Agent Gateway                          │
│  POST /api/agent/build    — start new build session             │
│  POST /api/agent/connect  — reconnect to existing session       │
│  POST /api/agent/message  — send follow-up message              │
│  GET  /api/agent/stream   — SSE stream for real-time events     │
│                                                                  │
│  Claude Agent SDK runs here (Node.js, long-lived via streaming) │
│  Custom MCP tools: generateBlueprint, generatePhase,            │
│    implementPhase, deployPreview, searchKnowledge,              │
│    generateImage, generateSpeech, runAnalysis                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: CONVEX — State & Persistence                          │
│  Tables: sessions, blueprints, phases, files, versions,         │
│          apps (published), appState, knowledgeBase, ttsCache    │
│  Real-time subscriptions → frontend                             │
│  Mutations called BY the agent to persist state changes         │
│  Queries used BY the frontend to render progress                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: E2B SANDBOX — Preview & Execution                    │
│  Dynamic template selection (4 therapy templates)               │
│  Multi-file writes from phase implementation                    │
│  Vite HMR for live preview                                      │
│  Runtime error collection for validation loop                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow for a Build

```
User: "Build a visual schedule for morning routine"
  → POST /api/agent/build
  → Claude Agent SDK starts phasic pipeline:
     1. Blueprint generation (therapy-structured PRD)
     2. Template selection (picks best E2B therapy template)
     3. Phase loop:
        a. PHASE_GENERATING — LLM plans next phase (file list + specs)
        b. PHASE_IMPLEMENTING — LLM generates file contents
        c. Deploy to E2B sandbox
        d. Validate (runtime errors, build success)
        e. If errors: regenerate broken files, redeploy (max 2 attempts)
        f. Persist phase result + create version snapshot
        g. Repeat until done
     4. FINALIZING — final review pass
     5. REVIEWING — runtime error check, auto-fix if needed
  → Each step writes state to Convex via mutations
  → Frontend subscribes to Convex queries, shows real-time progress
  → Preview URL streamed back via SSE
```

---

## 3. State Machine & Session Model

### States and Transitions

```
IDLE → BLUEPRINTING → TEMPLATE_SELECTING → PHASE_GENERATING → PHASE_IMPLEMENTING
  → DEPLOYING → VALIDATING → PHASE_GENERATING (loop) → FINALIZING → REVIEWING → COMPLETE
```

| State | What Happens | Transitions To |
|-------|-------------|----------------|
| `idle` | Session created, waiting for user prompt | `blueprinting` |
| `blueprinting` | LLM generates therapy blueprint. Streamed to frontend for preview. | `template_selecting` (user approves) or stay (user requests changes) |
| `template_selecting` | LLM analyzes blueprint, picks best E2B therapy template | `phase_generating` |
| `phase_generating` | LLM plans next phase: file list, specs, install commands | `phase_implementing` |
| `phase_implementing` | LLM generates actual file contents for the phase | `deploying` |
| `deploying` | Write files to E2B sandbox, run install commands, wait for Vite HMR | `validating` |
| `validating` | Check for runtime errors, render success. If errors: auto-fix attempt then re-deploy (max 2 attempts) | `phase_generating` (more phases) or `finalizing` (last phase or counter exhausted) |
| `finalizing` | Final review pass, one last phase gen+impl if needed | `reviewing` |
| `reviewing` | Deep error check. If clean: done. If errors: fix loop | `complete` (clean) or `validating` (fix attempt) |
| `complete` | MVP generated, preview URL available, user can iterate | `phase_generating` (user follow-up message) |

**Key design choice:** `blueprinting` has an explicit user approval gate. VibeSDK generates blueprints silently — we show them to therapists for validation before building.

**Phase counter:** Starts at 8 (therapy apps are simpler than general web apps). Decremented after each phase implementation. When user sends a follow-up message after `complete`, counter recharges to 3.

### Session Schema (Convex)

```typescript
sessions: defineTable({
  // Identity
  userId: v.optional(v.string()),
  title: v.string(),
  query: v.string(),

  // State machine
  state: v.union(
    v.literal("idle"), v.literal("blueprinting"),
    v.literal("template_selecting"), v.literal("phase_generating"),
    v.literal("phase_implementing"), v.literal("deploying"),
    v.literal("validating"), v.literal("finalizing"),
    v.literal("reviewing"), v.literal("complete")
  ),
  stateMessage: v.optional(v.string()),

  // Agent reference
  agentSessionId: v.optional(v.string()),

  // Blueprint
  blueprintId: v.optional(v.id("blueprints")),

  // Template
  templateName: v.optional(v.string()),

  // Phase tracking
  currentPhaseIndex: v.number(),
  totalPhasesPlanned: v.optional(v.number()),
  phasesRemaining: v.number(),

  // Sandbox
  sandboxId: v.optional(v.string()),
  previewUrl: v.optional(v.string()),

  // Conversation
  messages: v.array(v.object({
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    timestamp: v.number(),
  })),

  // Completion
  publishedUrl: v.optional(v.string()),
  mvpGenerated: v.boolean(),
})
```

**Frontend binding:** A single `useQuery(api.sessions.get, { sessionId })` subscription drives the entire UI — state, progress, preview URL, messages.

---

## 4. Blueprint & Phase Schemas

### TherapyBlueprintSchema (Zod — structured LLM output)

```typescript
const TherapyBlueprintSchema = z.object({
  // Project identity
  title: z.string(),
  projectName: z.string(),
  description: z.string(),
  detailedDescription: z.string(),

  // Therapy-specific (the differentiator)
  therapyGoal: z.string().describe("What therapeutic outcome this app supports"),
  targetSkill: z.string().describe("Specific skill being practiced"),
  ageRange: z.enum(["toddler", "preschool", "school-age", "adolescent", "adult", "all"]),
  interactionModel: z.enum(["tap", "drag", "sequence", "match", "timer", "free-form"]),
  reinforcementStrategy: z.object({
    type: z.enum(["tokens", "animation", "sound", "points", "completion", "none"]),
    description: z.string(),
  }),
  dataTracking: z.array(z.string()).describe("What to measure: trials, accuracy, duration, prompts needed"),
  accessibilityNotes: z.array(z.string()).describe("Sensory, motor, visual considerations"),

  // Design
  colorPalette: z.array(z.string()).max(4),
  views: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  userFlow: z.object({
    uiLayout: z.string(),
    uiDesign: z.string(),
    userJourney: z.string(),
  }),

  // Technical
  frameworks: z.array(z.string()),
  pitfalls: z.array(z.string()),

  // Roadmap
  implementationRoadmap: z.array(z.object({
    phase: z.string(),
    description: z.string(),
  })),

  // First phase (generated inline, like VibeSDK)
  initialPhase: PhaseConceptSchema,
});
```

### PhaseConceptSchema (what the LLM plans)

```typescript
const PhaseConceptSchema = z.object({
  name: z.string(),
  description: z.string(),
  files: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    changes: z.string().nullable().describe("Spec-like: WHAT to change, no code"),
  })),
  installCommands: z.array(z.string()),
  lastPhase: z.boolean(),
});
```

### PhaseImplementationSchema (what the LLM generates)

```typescript
const PhaseImplementationSchema = z.object({
  files: z.array(z.object({
    filePath: z.string(),
    fileContents: z.string(),
    filePurpose: z.string(),
  })),
  commands: z.array(z.string()),
});
```

### Convex `blueprints` Table

```typescript
blueprints: defineTable({
  sessionId: v.id("sessions"),
  blueprint: v.any(),
  markdownPreview: v.string(),
  approved: v.boolean(),
  version: v.number(),
})
```

### Blueprint Approval Flow

1. State enters `blueprinting`
2. Agent generates TherapyBlueprint via Claude Agent SDK
3. Agent writes blueprint to Convex `blueprints` table + converts to markdown preview
4. Frontend subscribes, shows blueprint as a structured card with therapy-specific fields
5. Therapist clicks "Looks good" → mutation sets `approved: true`
6. Agent polls for approval → transitions to `template_selecting`
7. If therapist requests changes → agent revises blueprint, increments version

---

## 5. Claude Agent SDK Integration & MCP Tools

### Where the Agent Runs

Next.js API route (`src/app/api/agent/build/route.ts`). Long-lived SSE endpoint — the Claude Agent SDK `query()` async generator runs for the duration of the build, streaming events back to the client.

### Session Persistence

The Claude Agent SDK's `session_id` is stored in the Convex `sessions.agentSessionId` field. On reconnect, `POST /api/agent/connect` resumes the session with full context. On follow-up messages, `POST /api/agent/message` resumes with the user's new input.

### Custom MCP Server — "bridges"

```typescript
const bridgesTools = createSdkMcpServer({
  name: "bridges",
  version: "1.0.0",
  tools: [
    // Blueprint & Planning
    generateBlueprint,    // Generate TherapyBlueprint from user prompt + RAG context
    reviseBlueprint,      // Revise blueprint based on therapist feedback
    selectTemplate,       // Analyze blueprint, pick best E2B therapy template
    generatePhase,        // Plan next phase (file list + specs)

    // Code Generation
    implementPhase,       // Generate file contents for a phase concept
    regenerateFile,       // Rewrite a single file (for fixes)

    // Sandbox
    deployToSandbox,      // Write files to E2B, run commands, return preview URL
    getRuntimeErrors,     // Collect errors from E2B sandbox

    // Knowledge & Assets
    searchKnowledge,      // RAG search over therapy knowledge base
    generateImage,        // Google Imagen for therapy picture cards
    generateSpeech,       // ElevenLabs TTS for communication apps

    // State Management
    updateSessionState,   // Write state transitions to Convex
    savePhaseResult,      // Persist phase files + status to Convex
    markComplete,         // Signal MVP generated
  ]
});
```

### How Tools Interact with Convex

Each tool that needs persistence calls Convex mutations via the Convex HTTP client (not the React client):

```typescript
const updateSessionState = tool(
  "update_session_state",
  "Update the build session state and progress message",
  {
    sessionId: z.string(),
    state: z.enum(["blueprinting", "template_selecting", ...]),
    stateMessage: z.string(),
  },
  async (args) => {
    await convexClient.mutation(api.sessions.updateState, {
      sessionId: args.sessionId,
      state: args.state,
      stateMessage: args.stateMessage,
    });
    return { content: [{ type: "text", text: `State updated to ${args.state}` }] };
  }
);
```

### Phasic Orchestration Prompt

The system prompt tells the agent exactly which tools to call and in which order:

```
You are Bridges, a therapy app builder. Follow this exact sequence:

1. Call generate_blueprint with the user's request + search_knowledge for therapy context
2. Wait for blueprint approval (poll update_session_state)
3. Call select_template to pick the best therapy template
4. For each phase (max 8):
   a. Call generate_phase to plan the next phase
   b. Call implement_phase to generate file contents
   c. Call deploy_to_sandbox to preview
   d. Call get_runtime_errors to validate
   e. If errors: call regenerate_file to fix, redeploy (max 2 attempts)
   f. Call save_phase_result to persist
5. Call mark_complete when done

Never skip steps. Never generate code without a phase plan first.
```

### SSE Streaming to Frontend

```typescript
// src/app/api/agent/build/route.ts
export async function POST(req: Request) {
  const { prompt, sessionId } = await req.json();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    for await (const message of query({
      prompt: buildSystemPrompt(prompt),
      options: {
        mcpServers: { bridges: bridgesTools },
        allowedTools: ["mcp__bridges__*"],
        includePartialMessages: true,
      }
    })) {
      if (message.type === "assistant") {
        await writer.write(encode({ type: "assistant", content: message.content }));
      }
      if (message.type === "stream_event") {
        await writer.write(encode({ type: "stream", event: message.event }));
      }
    }
    await writer.close();
  })();

  return new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

### Dual Event Delivery

Frontend receives events two ways:
1. **SSE stream** — real-time agent text/thinking (chat messages, blueprint chunks)
2. **Convex subscriptions** — state machine transitions, phase progress, file status, preview URL (agent writes via tools, frontend reads via queries)

---

## 6. E2B Templates & Dynamic Selection

### Template Catalog (4 therapy templates)

| Template | Use Case | Pre-built Components |
|----------|----------|---------------------|
| `therapy-communication` | Communication boards, PECS, AAC | Board grid layout, TTS integration, card components, sentence strip |
| `therapy-behavior` | Token boards, reinforcement systems, timers | Token display, progress bars, celebration animations, countdown timer |
| `therapy-schedule` | Visual schedules, first-then boards, routines | Step list, drag-reorder, checkmarks, transition cues |
| `therapy-academic` | Matching games, sorting tasks, choice activities | Drag-drop zones, scoring, feedback animations, prompt levels |

### Shared Across All Templates

- `therapy-ui.css` design system (`.card-interactive`, `.tap-target`, `.token-star`, etc.)
- Nunito (headings) + Inter (body) fonts
- `useLocalStorage` hook for device persistence
- `useTherapyData` hook (placeholder for cloud sync)
- `accessibility.css` — minimum 44px touch targets, high contrast mode, reduced motion support
- Tailwind v4 + React 19

### Template Selection Flow

1. Agent has the approved TherapyBlueprint
2. Agent calls `select_template` tool with blueprint summary
3. Tool uses a lightweight LLM call (or rule-based matching on `interactionModel` + `reinforcementStrategy`) to pick the best template
4. Template files are loaded and injected into the E2B sandbox
5. Phase generation is template-aware — the system prompt includes the template's file tree and available components

### Template Storage

Templates live in `e2b-templates/` directory, each registered with E2B as a separate template ID. The `select_template` tool has a registry mapping template names to E2B IDs.

### Multi-File Writes

Each phase can write multiple files (key change from current single-file system):

```typescript
async function deployToSandbox(args: { sessionId: string, files: FileOutput[] }) {
  const sandbox = await Sandbox.connect(sandboxId);

  for (const file of args.files) {
    const fullPath = `/home/user/app/${file.filePath}`;
    await sandbox.files.write(fullPath, file.fileContents);
  }

  for (const cmd of args.commands) {
    await sandbox.commands.run(cmd, { cwd: "/home/user/app" });
  }

  await sleep(2000); // Wait for Vite HMR

  return { previewUrl: `https://${sandbox.getHost(5173)}` };
}
```

---

## 7. Version History

### Convex `files` Table

```typescript
files: defineTable({
  sessionId: v.id("sessions"),
  phaseId: v.id("phases"),
  path: v.string(),
  contents: v.string(),
  purpose: v.string(),
  status: v.union(
    v.literal("generated"),
    v.literal("modified"),
    v.literal("deleted")
  ),
}).index("by_session", ["sessionId"])
  .index("by_session_path", ["sessionId", "path"])
```

### Convex `versions` Table

```typescript
versions: defineTable({
  sessionId: v.id("sessions"),
  version: v.number(),
  trigger: v.union(
    v.literal("phase_complete"),
    v.literal("user_edit"),
    v.literal("auto_fix"),
    v.literal("follow_up")
  ),
  triggerMessage: v.optional(v.string()),

  // Snapshot
  fileSnapshot: v.any(),   // Record<path, contents>

  // Diff from previous version
  diff: v.array(v.object({
    path: v.string(),
    action: v.union(v.literal("added"), v.literal("modified"), v.literal("deleted")),
    previousContents: v.optional(v.string()),
    newContents: v.optional(v.string()),
  })),

  // Metadata
  phaseIndex: v.optional(v.number()),
  fileCount: v.number(),
  timestamp: v.number(),
}).index("by_session", ["sessionId"])
  .index("by_session_version", ["sessionId", "version"])
```

### How Versioning Works

1. After each phase completes, the `savePhaseResult` tool:
   - Reads all current files from the `files` table for this session
   - Computes diff against the previous version's `fileSnapshot`
   - Creates a new `versions` entry with the full snapshot + diff
2. Frontend shows a version timeline: "v1: Layout & structure → v2: Token animations → v3: TTS integration"
3. **Undo** = restore a previous version's `fileSnapshot` to the `files` table + redeploy to E2B
4. **"What changed?"** = read the `diff` array for any version and show added/modified/deleted files

### Version Limit

Keep last 20 versions per session. Older versions have their `fileSnapshot` and `previousContents` fields cleared (keep just the diff metadata for history display).

---

## 8. Validation Loop

### Post-Phase Validation

After each phase deploys to E2B:

```
Deploy to sandbox
  → Collect runtime errors (E2B console/process errors)
  → Check: did Vite build succeed? (exit code + stderr)
  → Check: are there React render errors? (console errors matching known patterns)
  → If clean: mark phase completed, move on
  → If errors:
      1. Agent calls regenerate_file with error context (max 2 fix attempts per phase)
      2. Redeploy
      3. Re-validate
      4. If still broken after 2 attempts: mark phase as completed-with-warnings, continue
```

### Error Patterns Caught

- Vite build failures (missing imports, syntax errors)
- React render errors ("Cannot read properties of undefined", "Maximum update depth exceeded")
- Missing dependency errors ("Module not found")
- CSS/Tailwind class errors

### What We Skip (simpler than VibeSDK)

- No static analysis (TypeScript type checking, ESLint) — E2B catches most issues at runtime
- No screenshot analysis — VibeSDK uses Cloudflare Browser Rendering; overkill for now
- No deep debugger sub-agent — fixes handled inline by the main agent

---

## 9. Frontend UX

### Builder Page — Three-Panel Layout

```
┌──────────────────────────────────────────────────────────┐
│  Header: App title | State badge | Version dropdown      │
├────────────┬─────────────────────┬───────────────────────┤
│            │                     │                       │
│  CHAT      │  CODE EDITOR        │  LIVE PREVIEW         │
│  PANEL     │  (Monaco/readonly)  │  (E2B iframe)         │
│            │                     │                       │
│  Messages  │  File explorer      │  Preview URL          │
│  Blueprint │  Phase files        │  Responsive toggle    │
│  preview   │  Syntax highlight   │  (mobile/tablet/      │
│  Phase     │                     │   desktop)            │
│  timeline  │                     │                       │
│            │                     │                       │
├────────────┴─────────────────────┴───────────────────────┤
│  Phase Timeline Bar: [# Layout # Interactions # Data . Polish]  │
└──────────────────────────────────────────────────────────┘
```

### UI States Driven by Convex Subscriptions

| Session State | Chat Panel | Code Panel | Preview Panel |
|--------------|-----------|-----------|--------------|
| `idle` | Welcome + prompt input | Empty | Placeholder |
| `blueprinting` | Streaming blueprint preview card | Empty | Placeholder |
| `blueprinting` (done) | Blueprint card + "Approve" / "Request changes" buttons | Empty | Placeholder |
| `template_selecting` | "Selecting best template..." | Template file tree loading | Placeholder |
| `phase_generating` | "Planning phase N..." with file list appearing | Phase spec preview | Previous preview |
| `phase_implementing` | "Generating src/components/X.tsx..." | File contents streaming in | Previous preview |
| `deploying` | "Deploying to preview..." | All phase files | Loading spinner on iframe |
| `validating` | "Checking for errors..." / "Fixing: [error]" | Error highlights | Live preview updating |
| `complete` | "Your app is ready!" + follow-up input | Full file tree browsable | Live working preview |

### Phase Timeline Bar

Horizontal progress bar at the bottom. Each segment shows phase name + status (gray=pending, blue=active, green=complete, red=failed). Clicking a phase scrolls the code editor to that phase's files.

### App Blueprint Approval Card

When state is `blueprinting` and the blueprint is ready, the chat panel shows a structured card:

```
┌─────────────────────────────────────┐
│  App Blueprint                      │
│                                     │
│  Morning Routine Visual Schedule    │
│                                     │
│  Goal: Executive function — task    │
│  sequencing and completion          │
│  Skill: Following multi-step        │
│  morning routines independently     │
│  Ages: Preschool - School-age       │
│  Interaction: Drag to reorder +     │
│  tap to complete                    │
│  Reinforcement: Star tokens (5)     │
│  with celebration animation         │
│  Tracking: Steps completed,         │
│  time to completion, prompts needed │
│                                     │
│  Phases: 4 planned                  │
│  1. Layout & step cards             │
│  2. Drag-reorder + completion       │
│  3. Token rewards + celebration     │
│  4. Data tracking + persistence     │
│                                     │
│  [Looks Good]  [Request Changes]    │
└─────────────────────────────────────┘
```

---

## 10. Dependency Changes

### Removed

| Package | Reason |
|---------|--------|
| `@convex-dev/agent` | Replaced by Claude Agent SDK |
| `@ai-sdk/anthropic` | Claude Agent SDK talks to Claude directly |
| `ai` (Vercel AI SDK) | Replaced by Claude Agent SDK |
| `@assistant-ui/react` | Chat UI rebuilt with direct Convex subscriptions |

### Added

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | Core agent runtime in API routes |
| `diff` | Computing human-readable diffs for version history |

### Kept (unchanged)

| Package | Purpose |
|---------|---------|
| `convex` | Backend — now pure persistence + real-time |
| `@convex-dev/rag` | RAG knowledge base (still uses Gemini embeddings) |
| `@ai-sdk/google` | Gemini embeddings for RAG (used by `@convex-dev/rag` internally) |
| `@e2b/code-interpreter` | Sandbox execution |
| `elevenlabs` | TTS for communication apps |
| `next`, `react`, `react-dom` | Frontend framework |
| `motion`, `zustand`, `@dnd-kit/react` | UI interactions |
| All shadcn/ui components | Design system |
| `use-sound`, `sonner`, `lucide-react` | UI utilities |
| `zod` (v4.3.6) | Schema validation (already installed) |

---

## 11. Convex Schema Changes

| Table | Action |
|-------|--------|
| `sessions` | **NEW** — replaces thread-based agent model |
| `blueprints` | **NEW** — therapy-structured PRDs |
| `phases` | **NEW** — phase tracking with file status |
| `files` | **NEW** — generated file contents per session |
| `versions` | **NEW** — snapshot history with diffs |
| `apps` | **RENAMED** from `tools` — published apps with share slugs |
| `appState` | **RENAMED** from `toolState` — key-value state per app |
| `therapyTemplates` | **KEPT** — starter prompts |
| `knowledgeBase` | **KEPT** — RAG entries |
| `ttsCache` | **KEPT** — ElevenLabs audio cache |
| `projects` | **REMOVED** — replaced by `sessions` |

### Phases Table Schema

```typescript
phases: defineTable({
  sessionId: v.id("sessions"),
  index: v.number(),
  name: v.string(),
  description: v.string(),
  status: v.union(
    v.literal("pending"), v.literal("generating"),
    v.literal("implementing"), v.literal("deploying"),
    v.literal("validating"), v.literal("completed"), v.literal("failed")
  ),
  concept: v.optional(v.any()),
  files: v.array(v.object({
    path: v.string(),
    purpose: v.string(),
    status: v.union(
      v.literal("pending"), v.literal("generating"),
      v.literal("completed"), v.literal("failed")
    ),
  })),
  installCommands: v.array(v.string()),
  errors: v.optional(v.array(v.string())),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
}).index("by_session", ["sessionId"])
  .index("by_session_index", ["sessionId", "index"])
```

---

## 12. File System Changes

### Removed

- `convex/agents/` — entire directory
- `convex/chat/` — entire directory
- `src/features/therapy-tools/` — entire directory
- `src/features/builder-v2/components/chat.tsx` — current chat
- `src/app/api/chat/` — current API routes

### Created

- `src/app/api/agent/build/route.ts` — start build SSE endpoint
- `src/app/api/agent/connect/route.ts` — reconnect endpoint
- `src/app/api/agent/message/route.ts` — follow-up message endpoint
- `src/lib/agent/` — Claude Agent SDK setup, MCP server definition
- `src/lib/agent/tools/` — individual MCP tool definitions (one file per tool)
- `src/lib/agent/prompts/` — system prompts (blueprint, phase gen, phase impl)
- `src/lib/agent/schemas/` — Zod schemas (TherapyBlueprintSchema, PhaseConceptSchema, etc.)
- `src/features/builder/` — rebuilt builder page (3-panel layout)
- `src/features/builder/components/` — chat panel, code editor, preview, phase timeline, blueprint card
- `convex/sessions.ts` — session CRUD + state machine mutations
- `convex/blueprints.ts` — blueprint CRUD + approval
- `convex/phases.ts` — phase tracking
- `convex/generated_files.ts` — file management
- `convex/versions.ts` — version history
- `convex/apps.ts` — renamed from tools.ts

---

## 13. Terminology Changes

| Old | New | Scope |
|-----|-----|-------|
| tool | app | Everywhere: UI copy, code, database, URLs |
| Tool Blueprint | App Blueprint | UI, schema names |
| therapy tool | therapy app | UI copy, prompts, docs |
| `tools` table | `apps` table | Convex schema |
| `toolState` table | `appState` table | Convex schema |
| `createTool` / `updateTool` | `createApp` / `updateApp` | Agent tools, mutations |
| `therapy-tools` directory | `therapy-apps` directory (removed in refactor) | Feature directory |
| `/builder` output | "app" | UI, published at `/apps/:slug` |

---

## 14. Future Considerations

Items explicitly deferred from this spec:

- **Convex Workpool** — for concurrent build queuing and durability when scaling to multiple users
- **Agentic behavior mode** — LLM-driven orchestration as an advanced option alongside phasic
- **Static analysis** — TypeScript type checking + ESLint in sandbox for higher code quality
- **Screenshot analysis** — AI-powered visual QA of generated UIs
- **Deep debugger sub-agent** — Dedicated debugging agent (like VibeSDK's Gemini 2.5 Pro debugger)
- **Git clone export** — isomorphic-git for users who want to download their app's source
- **Cloudflare Workers deployment** — production deploy target beyond Vercel
- **Multi-model support** — OpenAI, Gemini as alternative LLM providers
