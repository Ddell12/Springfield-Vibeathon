# Streaming Builder Refactor — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Goal:** Replace the phasic state machine builder with a streaming-first architecture that achieves Lovable/Replit-class speed (4-8s to first preview, 3-6s per iteration)

---

## Problem Statement

The current builder uses an 8-phase sequential state machine (`pipeline.ts`, 842 lines) that takes **17-47 minutes** to generate a complete therapy app. Each phase cycles through: plan → implement → deploy → validate, with a blocking blueprint approval gate before any code appears. The generated apps also suffer from poor visual quality — the prompts emphasize therapy logic but give minimal design direction.

**Target:** 50-100X speed improvement. First preview in 4-8 seconds. Iterations in 3-6 seconds. Consistently beautiful output.

**Reference architectures:** E2B Fragments (single-shot streaming), Lovable (instant iteration), Replit (live preview).

---

## Architecture Overview

### Current (Being Replaced)

```
User prompt → Blueprint (30-60s, BLOCKING approval) → Template (15-30s) →
  [Phase plan → Code gen → Deploy → Validate] × 8 phases (2-6 min each) →
  Finalize → Review → Complete
Total: 17-47 minutes
```

### New: Streaming-First Builder

```
User hits Send
        | (simultaneously)
   +----+------------------------+
   |                             |
Next.js API route            E2B Sandbox.create()
starts LLM stream            (overlapped, ~3-5s)
   |                             |
   | tokens stream to -----------+
   | client in real-time         |
   |                             |
   | file completes --> write to sandbox
   |                    Vite HMR reloads iframe
   |                             |
   | blueprint JSON --> save to Convex
   |                    (display as sidebar card)
   |                             |
   v                             v
Stream ends                  Preview live (~4-8s)
   |
   +--> Persist all files + state to Convex
```

**Three simultaneous flows on submit:**
1. Next.js API route calls `anthropic.messages.stream()` with frontend-design skill + therapy domain context
2. E2B sandbox creation starts in parallel (resolves when Vite is serving via `waitForPort(5173)`)
3. Blueprint generation happens as first part of LLM response — displayed as informational card, NOT a gate

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Blueprint gate | Parallel (informational, not blocking) | Eliminates 10-30s human wait; therapy context still visible |
| LLM hosting | Hybrid — Next.js streams, Convex persists | Next.js enables SSE streaming; Convex provides reactive state |
| Generation model | Single-shot + single-shot iterations | Eliminates 8x phase overhead; each interaction is atomic |
| Sandbox readiness | Create on submit, overlapped with LLM | Zero pre-warming cost; V2 template timing naturally overlaps |
| Design quality | Frontend-design skill + pre-built component library | Belt and suspenders — prompt demands beauty, template provides it |
| Agent framework | `@anthropic-ai/sdk` with structured system prompt loading the frontend-design skill content as agent context. Not a separate SDK — uses the existing Anthropic TypeScript SDK's streaming + tool_use APIs with a well-organized multi-layer system prompt | Structured skill loading, tool validation, conversation memory |

---

## Section 1: Streaming Pipeline — LLM to Preview

### Next.js API Route

**Endpoint:** `POST /api/generate`

```
Request:  { sessionId, prompt, currentFiles[], sandboxId? }
Response: SSE stream (Server-Sent Events)
```

**Responsibilities:**
1. Call `anthropic.messages.stream()` with frontend-design skill as system context + therapy domain + current files
2. Parse streamed `tool_use` blocks — LLM calls `write_file(path, contents)` per file
3. As each tool call completes, emit SSE event AND write to E2B sandbox immediately

### SSE Event Types

| Event | Payload | Purpose |
|-------|---------|---------|
| `file_delta` | `{ path, partial_contents }` | Live code display in code panel |
| `file_complete` | `{ path, contents }` | File written to sandbox, Vite reloading |
| `blueprint` | `{ therapyGoal, targetSkill, ... }` | Informational sidebar card |
| `status` | `"generating" \| "deploying" \| "live"` | Status bar updates |
| `error` | `{ message, recoverable }` | Generation or sandbox error |
| `done` | `{ files[], sandboxId, previewUrl }` | Stream complete |

### Client-Side Flow

1. User hits Send
2. Client simultaneously:
   - `POST /api/generate` (starts SSE stream)
   - `POST /api/sandbox/create` (if no active sandbox)
3. As `file_delta` events arrive → render in code panel (syntax highlighted, live typing effect)
4. As `file_complete` events arrive → iframe auto-reloads via Vite HMR
5. As `blueprint` event arrives → render blueprint card in chat sidebar
6. On `done` → call Convex mutations to persist files + session state

### Sandbox API Route

**Endpoint:** `POST /api/sandbox`

```
Actions: create | connect | write_files
```

- `create`: `Sandbox.create("vite-therapy-v2", { apiKey, timeoutMs: 1_800_000 })` — returns `{ sandboxId, previewUrl }`
- `connect`: `Sandbox.connect(sandboxId, { apiKey })` — reconnect to existing sandbox
- `write_files`: Write file contents to sandbox paths, Vite HMR handles reload

---

## Section 2: Code Generation Agent

### System Prompt Layers (in order)

1. **Frontend-design skill** — loaded via Claude Agent SDK. Design principles, component composition, color theory, spacing, animation, anti-patterns (no flat gray boxes, no generic AI aesthetics)
2. **Therapy domain context** — ABA, speech therapy, PECS, visual schedules, age-appropriate design, accessibility (44px touch targets, high contrast, reduced motion)
3. **Template component reference** — documents pre-built components available in `vite-therapy-v2` template (see Section 3). LLM knows exactly what to compose
4. **Current file contents** (for iterations) — LLM sees what it's modifying

### Tool Definition

Single tool:
```
write_file(filePath: string, contents: string)
```

LLM calls once per file. Most apps: just `src/App.tsx`. Complex apps: additional components/hooks.

### Design Principles in Prompt

- **Color:** Template CSS custom properties (`--primary`, `--accent`, `--surface-*`). Gradients for CTAs, tonal shifts for depth
- **Typography:** Nunito headings (rounded, friendly), Inter body. Enforced size scale
- **Animation:** Every interaction gets feedback — `transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`. Celebrations for correct answers. Micro-interactions on touch
- **Layout:** Card-based compositions, proper spacing, mobile-first
- **Components:** Use template pre-built components as primary building blocks; raw `<div>` only for custom layout

### No RAG in Hot Path

`search_knowledge` tool removed from initial generation. Therapy domain knowledge baked directly into system prompt. RAG available as optional enhancement tool for iterations ("find templates similar to...") but not in the critical path.

---

## Section 3: E2B Template — `vite-therapy-v2`

### Pre-Built Components (`src/components/`)

| Component | Purpose | Key Features |
|-----------|---------|-------------|
| `<TherapyCard>` | Base card with variants | Tonal surface shifts, hover lift, touch feedback |
| `<TokenBoard>` | Star/sticker reward system | Animated token placement, celebration burst at goal |
| `<VisualSchedule>` | Step-by-step activity sequence | Drag-to-reorder, completion checkmarks, "now" indicator |
| `<CommunicationBoard>` | AAC-style picture grid | TTS on tap, category tabs, customizable grid size |
| `<DataTracker>` | Trial/frequency data collection | Tap counters, timer, auto-percentage, session history chart |
| `<CelebrationOverlay>` | Reward animation | Confetti/stars/fireworks variants, sound effects |
| `<ChoiceGrid>` | Multiple choice selection | 2-4 options, image+text, correct/incorrect feedback |
| `<TimerBar>` | Visual countdown/count-up | Animated progress, color transitions, optional sound |
| `<PromptCard>` | Instruction display | Icon + text, step highlighting, read-aloud button |

### Pre-Built Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useLocalStorage(key, default)` | Persistent state across sessions |
| `useSound(src)` | Audio playback with iOS Safari handling |
| `useAnimation(trigger)` | Celebration/feedback animation triggers |
| `useDataCollection(config)` | ABA data recording (trials, frequency, duration) |

### Design System (`src/styles/`)

- CSS custom properties: full color palette (light + dark)
- Spacing scale: 4px base
- Typography scale: Nunito headings, Inter body
- Animation presets: `ease-therapy`, `duration-feedback`, `duration-celebration`
- Shadow/elevation system (no flat boxes)
- Gradient presets for CTAs

### Template Build

After changes: `cd e2b-templates/vite-therapy && npx tsx build.prod.ts`

New template registered with E2B. Existing sandboxes unaffected.

---

## Section 4: Frontend UX

### First Build Flow

1. User lands on builder → empty 3-pane layout (chat | code | preview), prompt input focused
2. User types prompt, hits Send
3. **0s:** Chat shows message + typing indicator. Status: "Generating...". Sandbox creation starts (invisible)
4. **~1-2s:** Code panel lights up — tokens stream with syntax highlighting. Status: "Writing App.tsx..."
5. **~4-6s:** First file completes → written to sandbox → preview iframe loads via Vite HMR. Status: "Live". Blueprint card slides into chat
6. **~6-10s:** Additional files stream (if any) → preview hot-reloads with each file

### Iteration Flow

1. User types follow-up ("make the stars golden and add a celebration at 10")
2. **0s:** Chat shows message. Status: "Updating..."
3. **~3-6s:** Code panel shows changes streaming. Preview hot-reloads mid-stream
4. **Done:** Updated app live. Chat shows summary

### UI Changes

**Removed:**
- Phase timeline component — no more phases
- Blueprint approval buttons — blueprint is informational
- "Deploying to preview..." intermediate state
- URL probing retry indicator ("Retrying 5/30...")
- Phase-based progress messages

**Kept:**
- 3-pane layout (chat | code | preview)
- Device toggle on preview (mobile/tablet/desktop)
- Chat history
- Blueprint card (informational, in chat)

**New:**
- Live streaming code display in code panel
- Simple status bar: "Generating..." → "Writing App.tsx..." → "Live"
- Inline auto-fix messaging

---

## Section 5: Data Model

### Simplified Schema

**Modified tables:**

`sessions`:
- Remove: `currentPhaseIndex`, `phasesRemaining`, `mvpGenerated`, `templateName`
- Keep: `sandboxId` and `previewUrl` (already exist as top-level fields)
- Simplify `state` to: `idle | generating | live | failed`

`files` (module: `convex/generated_files.ts`):
- Remove: `phaseId` foreign key
- Files belong to session directly
- Add: `version: number` for tracking iterations

`messages`:
- No changes

**Removed tables:**
- `phases` — no multi-phase pipeline
- `agentContext` — conversation managed by API route, not persisted per-step
- `versions` — replaced by `files.version`
- `blueprints` — blueprint data moves to `session.blueprint` field (inline on sessions table)

**Unchanged tables:**
- `knowledgeBase` + vector index (RAG for optional enhancement)
- `therapyTemplates` (template metadata)
- `apps`, `appState`, `ttsCache` (unrelated to pipeline refactor)

### State Transitions (4 states, down from 11)

```
idle --> generating --> live --> generating (iteration) --> live --> ...
                    \-> failed
```

### Convex Persistence Points

| Moment | Mutation |
|--------|----------|
| Stream starts | `session.state = "generating"` |
| Blueprint JSON arrives | Save to `session.blueprint` |
| File completes | `files.upsert(sessionId, path, contents, version)` via `convex/generated_files.ts` |
| Stream ends | `session.state = "live"` |
| Error | `session.state = "failed"`, `session.error = message` |

---

## Section 6: Error Handling & Recovery

### Error Categories

| Error | Detection | Recovery | User Sees |
|-------|-----------|----------|-----------|
| Broken generated code | Vite compile error in sandbox console | Auto-retry: send error + code back to LLM (max 2 attempts) | Last working preview; "Fixing error..." |
| Sandbox creation fails | `Sandbox.create()` throws | Retry once, then show error | "Preview unavailable — click to retry" |
| Sandbox expires | `SandboxNotFoundError` on file write | Recreate sandbox, re-deploy from Convex | Brief flicker, auto-recovers |
| LLM stream interrupted | SSE connection drops | Auto-reconnect, resume from last-persisted files | "Reconnecting..." → resumes |
| LLM refuses/hallucinates | No `write_file` calls in response | Show LLM text in chat (may be clarification) | Chat message from assistant |
| Network error | `fetch` fails | Retry with backoff (max 3) | "Connection lost, retrying..." |

### Never Lose Work

Every `file_complete` event triggers a Convex mutation. On page reload:
1. Read session from Convex (state, files, sandboxId)
2. If `live` + sandbox exists → reconnect iframe
3. If sandbox expired → recreate from persisted files
4. If `generating` → show last state, let user re-send

### Auto-Fix (Simplified)

```
File written to sandbox
  --> Vite recompiles
  --> If compile error in console:
    --> Send error to LLM: "Fix this error: {error}. Current code: {code}"
    --> LLM streams fix (same write_file flow)
    --> Max 2 auto-fix attempts
    --> If still broken: show error in chat, user iterates manually
```

---

## Section 7: Files Changed

### Deleted / Replaced

| File | Replacement |
|------|-------------|
| `convex/pipeline.ts` (842 lines) | `app/api/generate/route.ts` (~150 lines) |
| `convex/pipeline_prompts.ts` | Merged into agent system prompt construction |
| `convex/pipeline_tools.ts` | `write_file` tool defined inline in API route |
| `src/features/builder/components/phase-timeline.tsx` | Removed (no phases) |
| `src/features/builder/components/blueprint-card.tsx` | Rewritten as informational card (no approval buttons) |

### Modified

| File | Changes |
|------|---------|
| `convex/schema.ts` | Remove `phases`, `agentContext`, `versions`, `blueprints` tables. Simplify `sessions` |
| `convex/sessions.ts` | 4-state machine (idle/generating/live/failed). Remove phase/template/blueprint mutations |
| `convex/generated_files.ts` | Remove `phaseId`. Add `version` field |
| `convex/e2b.ts` | Simplify to create/connect/writeFiles. Remove `getRuntimeErrors` and deploy orchestration logic |
| `src/features/builder/components/builder-page.tsx` | Remove phase timeline, update state handling |
| `src/features/builder/components/chat-panel.tsx` | Add streaming status, remove phase messages |
| `src/features/builder/components/preview-panel.tsx` | Remove URL probing/retry. Direct iframe with sandbox URL |
| `src/features/builder/components/code-panel.tsx` | Add streaming code display with live syntax highlighting |
| `src/features/builder/hooks/use-session.ts` | Simplify queries for new schema |

### New Files

| File | Purpose |
|------|---------|
| `app/api/generate/route.ts` | Streaming LLM → SSE → E2B pipeline |
| `app/api/sandbox/route.ts` | Sandbox create/connect/write API |
| `src/features/builder/hooks/use-streaming.ts` | SSE client hook (connect, parse events, manage state) |
| `src/features/builder/lib/agent-prompt.ts` | System prompt construction (frontend-design skill + therapy domain + template ref) |
| `e2b-templates/vite-therapy-v2/` | Upgraded template with component library |

---

## Performance Budget

| Metric | Current | Target |
|--------|---------|--------|
| Time to first preview | 3-5 minutes | 4-8 seconds |
| Iteration speed | 2-6 minutes | 3-6 seconds |
| LLM calls per initial build | 8-16 | 1 |
| Pipeline states | 11 | 4 |
| `pipeline.ts` line count | 842 | 0 (deleted) |
| Schema tables | 12 | 8 (remove 4: phases, agentContext, versions, blueprints) |
