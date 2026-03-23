# Aura Project Knowledge Base

Comprehensive structured reference extracted from project-intelligence artifacts.
Optimized for AI agent consumption — use Grep to search for specific topics.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Slice Dependency Map](#slice-dependency-map)
3. [Infrastructure Topology](#infrastructure-topology)
4. [Agent Request Lifecycle](#agent-request-lifecycle)
5. [Memory Pipeline](#memory-pipeline)
6. [Vault Indexing](#vault-indexing)
7. [Scheduling & Triggers](#scheduling--triggers)
8. [Capability Matrix](#capability-matrix)
9. [Integration Map](#integration-map)
10. [MCP Server Topology](#mcp-server-topology)
11. [Convex Schema](#convex-schema)
12. [API Route Map](#api-route-map)
13. [Deployment Architecture](#deployment-architecture)
14. [CI/CD Pipeline](#cicd-pipeline)
15. [User Journeys](#user-journeys)

---

## System Architecture

**Entry:** `src/daemon/daemon.ts` — composition root.

**Startup sequence (8 steps):**

1. Acquire PID lock `~/.config/aura/daemon.pid`
2. Run security checks
3. Init channels (CLI/Telegram)
4. Start trigger server (HTTP, port 8443)
5. Start vault observer + local scheduler
6. Start channels + health services
7. Sync skills + minion blueprints to Convex
8. Notify owner via Telegram

**Creates & wires:** AuraBus, SessionStore, CLI/Telegram adapters, TriggerServer, AgentQueue, HeartbeatService, ConvexHealthPush, SkillWatcher, VaultObserver, LocalScheduler, Minion blueprint loader, Composio sync (10 min interval).

### Layer Architecture (6 layers)

| Layer          | Slices                                                                                                                   | Role                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Entry Point    | daemon/                                                                                                                  | Composition root, wires everything   |
| Feature        | agent/, channels/, memory/, skills/, scheduling/, trigger/, vault/, minions/, coding/, agency/, voice/, local-scheduler/ | Domain logic                         |
| Infrastructure | integrations/, security/, health/, convex-sync/                                                                          | Cross-cutting concerns               |
| Foundation     | core/, shared/                                                                                                           | Universal types, config, bus, logger |
| External       | Convex, Trigger.dev, Telegram, Composio, ElevenLabs, Twilio                                                              | Cloud services                       |
| Vault          | ~/Documents/Life Management                                                                                              | Obsidian PARA+GTD vault              |

### Bus Events (12 types)

message:outbound, message:outbound:confirmation, confirmation:response, channel:status, agent:complete, skill:proposal:response, coding:task:created, coding:task:updated, coding:task:completed, workforce:workflow:created, workforce:debug:started, workforce:debug:resolved

---

## Slice Dependency Map

**Stats:** 18 slices total (2 universal, 15 feature, 1 composition root). 8 known boundary violations.

### Dependency Tiers (top → bottom)

1. **daemon** (9 violations — expected, wires everything)
2. **scheduling** (→ agent type, integrations type), **channels** (→ agent, convex-sync), **local-scheduler** (→ agent type)
3. **agent** (→ security, memory, integrations, convex-sync), **memory** (→ convex-sync), **health** (→ scheduling), **convex-sync** (→ vault type)
4. **Independent:** skills, vault, security, integrations, trigger, minions, coding, voice, agency
5. **Universal:** core, shared

### Exported APIs

| Slice           | Exports                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| agent           | `runAgent()`, `AgentQueue`, `buildSystemPrompt()`, `assembleAlwaysOnContext()`                                                             |
| channels        | `createCliAdapter()`, `createTelegramAdapter()`                                                                                            |
| scheduling      | `TriggerServer`, `HealthContext`, `ComposioEndpointDeps`                                                                                   |
| memory          | `handleMemoryCommand()`, `extractAndStoreMemories()`, `buildMemoryContext()`                                                               |
| skills          | `scanSkills()`, `parseSkillFile()`, `syncSkillsToConvex()`, `startSkillWatcher()`, `buildSkillPrompt()`                                    |
| health          | `HeartbeatService`, `ConvexHealthPush`, `buildEcosystemConfig()`                                                                           |
| security        | `isPathWritable()`, `isPathBlocked()`, `loadPermissions()`, `runStartupSecurityChecks()`                                                   |
| integrations    | `getComposioMcpServers()`, `syncComposioConnections()`, `getFirecrawlMcpServers()`, `getPlaywrightMcpServers()`, `getSophtronMcpServers()` |
| convex-sync     | `SessionStore`, `recordMessage()`, `insertMemory()`, `searchMemories()`, `listGoals()`, `syncVaultTasksToConvex()`                         |
| vault           | `bulkIndex()`, `scanVault()`, `subscribe()`, `scanVaultTasks()`, `generateDailyNote()`                                                     |
| trigger         | `agentJob`, `scheduledSkill`, `daemonTick`, `morningBriefing`, `runMonitor`, `vaultAutopilot`                                              |
| minions         | `Orchestrator`, `MinionRunner`, `loadBlueprintsFromDisk()`, `dispatchMinion()`, `buildTeam()`                                              |
| coding          | `CodingTaskManager`, `executeClaudeCli()`, `createWorktree()`, `discoverRepoContext()`                                                     |
| local-scheduler | `LocalScheduler`, `handleScheduleCommand()`                                                                                                |
| voice           | `transcribeAudio()`, `synthesizeSpeech()`                                                                                                  |
| agency          | `listClients()`, `createClient()`, `listProjects()`, `createBusinessTask()`                                                                |
| core            | `loadConfig()`, `createBus()`, `createLogger()`, types, atomic-write                                                                       |
| shared          | `getConvexClient()`, `generateEmbedding()`                                                                                                 |

**Import rules:** Cross-slice imports forbidden. Feature slices import via barrel `index.js`. core/shared imported by direct path. ESLint `boundaries` plugin enforces.

---

## Infrastructure Topology

### Production — Mac Mini

- Hostname: `deshawns-mac-mini`, Tailscale: `100.87.235.61`
- macOS 26.3 (arm64), Node v22.22.0
- Boot: macOS → launchd (`com.aura.pm2`, RunAtLoad, KeepAlive, 30s throttle) → `deploy/boot.sh` → PM2 `--no-daemon` (fork, 500M max, exponential backoff 100ms–15s) → `aura:0` via tsx

**Filesystem:**

- PID lock: `~/.config/aura/daemon.pid`
- SQLite: `~/.config/aura/scheduler.db`
- Logs: `~/.config/aura/logs/{aura-out,aura-error,launchd-pm2}.log`
- PM2 home: `~/.pm2`

**Agent config:** model `claude-sonnet-4-5-20250929`, max tokens 16384, max turns 25, concurrency 2, budget $5/day, daemon tick 3min (20/hr max), quiet hours 23:00–07:00.

### Development — MacBook Pro

- Hostname: `macbook-pro`, Tailscale: `100.73.92.38`, Darwin 25.1.0
- PM2 stopped 2026-02-26, daemon runs only on Mac Mini

### Network

- Tailscale WireGuard mesh, tailnet `tail9a8f2e.ts.net`
- Funnel: `https://macbook-pro.tail9a8f2e.ts.net`, ports 443/8443/10000

### Cloud Services

| Service      | Details                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Convex       | `careful-lark-398.convex.cloud`, 36 tables, RAG via `@convex-dev/rag`                             |
| Trigger.dev  | Cron + on-demand jobs, callbacks to daemon via DAEMON_FUNNEL_URL                                  |
| Telegram     | grammY bot, primary UI                                                                            |
| Composio MCP | 9 toolkits, connection sync every 10 min                                                          |
| ElevenLabs   | TTS, voice agent `agent_6501kjx79pv1ejbtb2szvp8v8msk`, phone `phnum_3801kjx60bn3fjqt053cr82q03m3` |
| Twilio       | 3 numbers (+16176185394, +18559146179, +15737454912), SMS + voice                                 |

---

## Agent Request Lifecycle

10-phase pipeline from user message to response.

### Phase 1 — Channel Entry

- **Telegram:** grammY `bot.on("message:text")`, access control via `TELEGRAM_ALLOWED_USERS`, per-chat concurrency (`activeChats` Set), TypingLoop (4s), StreamingMessage (edit-throttle 1.5s, max 4096 chars)
- **CLI:** `process.argv.slice(2)` one-shot or readline interactive
- Both construct `ChannelCallbacks` (onText, onTyping, onComplete, onError); session key = `${channel}:${chatId}`

### Phase 2 — Context Assembly

- `shouldRegenerateSummary()`: compares `context-summary.md` mtime vs 6 source files + 4 directories
- `generateContextSummary()`: reads 6 vault files in parallel, scans Tasks/, extracts named sections, writes `_agent/context-summary.md` via `atomicWriteFile()`
- `assembleAlwaysOnContext()`: loads summary (truncated `MAX_IDENTITY_LINES`) + today's daily note

### Phase 3 — Session Management

- Convex lookup by session key, 24h TTL, expired → fresh, live → `resumeSessionId`
- Records user message + embedding (Voyage AI, failure non-blocking)

### Phase 4 — Memory Retrieval

- **New session:** vector similarity search over Convex memories (facts, preferences, decisions, episodes)
- **Resumed session:** loads `getActiveContext()` + `listActiveGoals()`, renders top 5 goals

### Phase 5 — System Prompt Construction

- `buildSystemPrompt(vaultContext, options)`: always includes identity, vault path, permissions, vault context, memory protocol, behavior guidelines, date. Conditional: Composio, Browser, Firecrawl, Sophtron, Self-Development sections.

### Phase 6 — Infrastructure Setup

- **Hooks (5):** enforcePermissions (Read/Write/Edit/Grep/Glob), enforceBashPermissions, auditLogger, Stop (memoryFlush + activeContext + commitments), PreCompact (compactionGate + preCompactMemoryFlush)
- **Subagents (7):** vault-organizer (sonnet/20t), researcher (sonnet/15t), email-triager (haiku/10t), daily-briefer (haiku/10t), writer (sonnet/15t), task-manager (sonnet/15t), developer (sonnet/50t — only one with Bash)
- **MCP servers:** 4 built-in (aura-memory, aura-vault-search, aura-imessage, aura-credentials) + 4 conditional (Composio, Playwright, Firecrawl, Sophtron)
- `sanitizeMcpServers()`: strips `oneOf/allOf/anyOf` from schemas, creates in-process proxy

### Phase 7 — Agent Execution

- `query()` with: model, systemPrompt, `cwd: VAULT_PATH`, `permissionMode: "bypassPermissions"`, allowedTools [Read, Write, Edit, Glob, Grep, Bash, Skill, Task], hooks, maxBudgetUsd/maxTurns, subagents, MCP servers, `strictMcpConfig: true`

### Phase 8 — Stream Processing

- Router: system/init → capture sessionId; assistant text → onText accumulation; tool_use → onToolStart; tool_result → onToolEnd; error → onError

### Phase 9 — Persistence

- Records assistant response + embedding to Convex messages
- Updates session (sessionId, lastActive, turnCount)
- Emits `agent:complete` bus event with cost

### Phase 10 — Cleanup

- Memory extraction (Stop hook), cost threshold check

---

## Memory Pipeline

### Memory Types

| Type       | Description                           | Lifecycle                                          |
| ---------- | ------------------------------------- | -------------------------------------------------- |
| fact       | Learned info about user/world         | Persists until contradicted or decayed             |
| preference | How user likes things done            | High stability                                     |
| decision   | Choices made (architectural/life)     | Permanent record                                   |
| episode    | Brief session summary (1-2 sentences) | Always extracted; >60 days → monthly consolidation |

### Extraction

- **Triggers:** Stop hook (session end) + PreCompact hook (before compaction)
- **Process:** Read JSONL transcript → parse last 50 messages (1000 char truncation) → Claude Haiku analysis → JSON `{memories: [{type, content, confidence}]}` → validation (strip markdown fences, filter invalid)
- **Active Context:** Parallel extraction — last 30 messages (500 char) + previous focus → Haiku → `{summary, focusAreas[]}` (max 5 areas) → Convex `activeContext` singleton

### Storage

- **Dedup:** `insertMemoryWithDedup` — embedding similarity > 0.92 → bump confidence +0.1 (max 1.0); else insert new
- **Embedding:** OpenAI `text-embedding-3-small`, 1536 dimensions, via `@convex-dev/rag`
- **Convex RAG:** namespace `"memories"`, key = `type:prefix100`, filterValues on `type`

### Retrieval

- Vector similarity search at new session start, ranked by cosine similarity, injected into system prompt

### Maintenance (Convex crons)

- **Daily 03:00 UTC:** `ragDecay` — 30-day threshold, 0.9 decay factor
- **Weekly Sunday 05:00 UTC:** `consolidateMemories` — merges related, drops low-value

---

## Vault Indexing

### Real-Time Pipeline

1. **Chokidar Watcher Hub** (`src/vault/watcher-hub.ts`): singleton, `awaitWriteFinish` 500ms. Ignores: `.obsidian/`, `.git/`, dotfiles
2. **Vault Observer** (`src/daemon/vault-observer.ts`): absolute → relative paths, exclude patterns, pushes to Convex `pushObservation`, fires `onTaskChange()` for `Tasks/*.md`
3. **Vault Scanner** (`src/vault/scanner.ts`): walks dirs, reads .md, computes MD5 hash, parallel `Promise.all`
4. **Hash Compare:** checks `vaultFileIndex` — match → skip; different → proceed
5. **Chunker** (`src/vault/chunker.ts`): splits by heading structure, ~300 tokens/chunk, preserves hierarchy
6. **Embedding:** `generateEmbedding(chunk.text)` via Voyage AI / OpenAI
7. **RAG Upsert:** `rag.add()` via `@convex-dev/rag`, updates `vaultFileIndex`

### Commands

- `npm run vault:purge` — drains RAG entries (500/round), clears file index, then reindexes
- `npm run vault:reindex` — hash comparison, only re-indexes changed files

### Search (aura-vault-search MCP)

- Input: query + filters (directory, fileName, contentType)
- Hybrid search (vector + text) → scored chunks with metadata

---

## Scheduling & Triggers

### Trigger.dev Cloud (6 jobs)

| Job              | Type             | Schedule          | Description                                                                                                        |
| ---------------- | ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| daemon-tick      | schedules.task   | `*/15 * * * *`    | Reads state, runs task sensors, sends nudges, triggers skills (business hours 9–21 CT)                             |
| morning-briefing | schedules.task   | `0 7 * * *`       | Triggers agent-job with morning-routine skill                                                                      |
| vault-autopilot  | schedules.task   | `45 6 * * *`      | POSTs to /vault-autopilot                                                                                          |
| run-monitor      | schedules.task   | `*/10 * * * *`    | Polls for FAILED runs, classifies errors with Haiku, auto-triggers debug agents (max 2 attempts/run, 1hr cooldown) |
| scheduled-skill  | schedules.task   | dynamic per skill | Schedule via Convex triggerBridge.createSchedule()                                                                 |
| agent-job        | task (on-demand) | —                 | General-purpose agent executor, POSTs to /trigger, max 10 min, 3 retries                                           |

### Convex Crons (5 jobs)

| Job                         | Schedule      | Function                                            |
| --------------------------- | ------------- | --------------------------------------------------- |
| daily_memory_consolidation  | 03:00 UTC     | `internal.memory.rag.ragDecay`                      |
| daily_message_prune         | 03:30 UTC     | `internal.agent.messages.pruneOld` (90 days)        |
| daily_session_prune         | 04:00 UTC     | `internal.agent.sessions.pruneExpired`              |
| daily_observation_prune     | 04:30 UTC     | `internal.daemon.daemon.pruneObservations`          |
| weekly_memory_consolidation | Sun 05:00 UTC | `internal.memory.consolidation.consolidateMemories` |

### Local SQLite Scheduler

- `LocalScheduler` class, DB at `~/.config/aura/scheduler.db`, 60s poll, cron-parser v5
- User-created via `/schedule` Telegram command

### Webhook Auth (4 methods per-source)

- hmac-sha256 (GitHub), hmac-sha1 (legacy), bearer (global fallback), none (open)
- Config in `webhookRegistrations` Convex table

---

## Capability Matrix

### Core Agent (all active)

Telegram Channel, CLI Channel, Web Dashboard Chat (SSE), Webhook Channel, Session Management, Context Assembly, Context Summary Pipeline, System Prompt Builder, Agent Concurrency Queue, MCP Schema Proxy, PreToolUse Hooks, Cost Tracking ($5/day), Prompt Compaction, Agent Teams

**iMessage Channel:** disabled (code exists at `channels/imessage.ts`)

### Subagents (7)

vault-organizer, researcher, email-triager, daily-briefer, writer, task-manager, developer

### Memory System

Typed Memories, Memory Extraction (Haiku), Semantic Retrieval, Active Context (singleton/5 focus), Goal Tracking, Memory MCP Server. Consolidation: planned.

### Vault & RAG

Obsidian Integration, RAG Indexing (~300 tokens/chunk, 1536-dim), Hash-Based Skip, Markdown Chunker, Vault Search MCP, Watcher Hub, Vault Autopilot, CLI Commands

### Skills System (32 skills)

Parser, Scanner, Sync (Convex + Trigger.dev), Vault Sync, Watcher, Prompt Builder, Skill Proposals

### Autonomous Actions

Phone Calls (ElevenLabs + Twilio), iMessage/SMS (osascript + Twilio fallback), Browser Automation (Playwright + Bitwarden)

### Minions Engine

Blueprint-driven DAG execution, YAML blueprints, agent teams, step orchestration, feedback loops

### Coding Agent

Claude CLI subprocess, workspaces at `~/aura-workspaces`, git worktrees, PR creation

---

## Integration Map

**Stats:** 13 external services, 7 MCP servers, 12 env vars, 9 Composio toolkits.

| Category   | Service           | Transport           | Env Vars                                                         |
| ---------- | ----------------- | ------------------- | ---------------------------------------------------------------- |
| Core AI    | Anthropic Claude  | SDK                 | `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`                   |
| Core AI    | OpenAI Embeddings | API                 | `OPENAI_API_KEY`                                                 |
| Infra      | Convex            | ConvexHttpClient    | `CONVEX_URL`, `CONVEX_DEPLOY_KEY`                                |
| Infra      | Trigger.dev       | HTTP API            | `TRIGGER_SECRET_KEY`                                             |
| Infra      | GitHub            | SSH + webhook       | —                                                                |
| Comms      | Telegram          | grammY long-polling | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`                   |
| Comms      | Twilio            | REST + MCP          | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Voice      | ElevenLabs        | API + MCP           | `ELEVENLABS_API_KEY`                                             |
| Voice      | Groq Whisper      | multipart API       | `GROQ_API_KEY`                                                   |
| Automation | Composio          | MCP stdio           | `COMPOSIO_API_KEY`                                               |
| Automation | Playwright        | MCP stdio           | —                                                                |
| Automation | Firecrawl         | MCP                 | —                                                                |
| Finance    | Sophtron          | MCP stdio           | —                                                                |
| Security   | Bitwarden         | CLI + MCP           | —                                                                |

### Composio Toolkits (9)

Gmail, Google Calendar, GitHub, Linear, Slack, Discord, Google Drive, Google Sheets, YNAB

---

## MCP Server Topology

### Built-in MCP Servers (4, in-process SDK)

| Server            | Tools                                | Description                                                                     |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| aura-memory       | `memory`                             | View/create/str_replace/insert/delete/rename across /memories, /context, /goals |
| aura-vault-search | `searchVault`                        | Semantic search with filters (directory, fileName, contentType)                 |
| aura-imessage     | `send_message`                       | POST to 127.0.0.1:{port}/imessage/send, requires Telegram approval              |
| aura-credentials  | `get_credentials`, `get_secure_note` | Bitwarden CLI lookups                                                           |

### External MCP Servers (4, conditional)

Composio (stdio, 9 toolkits), Playwright (stdio, browser), Firecrawl (stdio/http, scraping), Sophtron (stdio, banking)

### Schema Sanitizer

`sanitizeMcpServers()` at `mcp-schema-proxy.ts:272` — strips `oneOf/allOf/anyOf` from tool schemas, creates in-process proxy.

### PreToolUse Hooks (5)

1. enforcePermissions: Read|Write|Edit|Grep|Glob — checks path against writableDirs/blocked
2. enforceBashPermissions: Bash — blocks destructive commands
3. auditLogger: all tools — logs every call
4. Stop: memoryFlush + activeContext + commitments
5. PreCompact: compactionGate + preCompactMemoryFlush

### Subagents (7)

| Name            | Model  | Turns | Tools                         |
| --------------- | ------ | ----- | ----------------------------- |
| vault-organizer | sonnet | 20    | Read, Write, Edit, Glob, Grep |
| researcher      | sonnet | 15    | WebSearch, WebFetch           |
| email-triager   | haiku  | 10    | Read-only                     |
| daily-briefer   | haiku  | 10    | Read-only                     |
| writer          | sonnet | 15    | Read, Write, Edit, Glob, Grep |
| task-manager    | haiku  | 15    | Read, Write, Edit, Glob, Grep |
| developer       | sonnet | 50    | ALL (only subagent with Bash) |

---

## Convex Schema

36 tables across 12 domains. Key tables below.

### Agent Domain

- **sessions:** key, sessionId, lastActive, turnCount. Indexes: by_key, by_lastActive
- **messages:** sessionKey, sessionId, role, content, channel, timestamp, costUsd, turnCount, embedding[1536]. Indexes: by_sessionKey, by_timestamp, vector
- **costs:** timestamp, channel, amount, sessionId, dailyKey. Index: by_dailyKey
- **scheduleRuns:** jobName, skillName, parameters, prompt, startedAt, completedAt, status (pending|running|completed|failed|dead-letter), costUsd, error. Indexes: by_jobName, by_startedAt, by_status

### Daemon Domain

- **daemonTicks:** tickNumber, startedAt, completedAt, decision, observationCount, notificationCount, actionsTaken, costUsd, error
- **daemonObservations:** type, timestamp, data, urgent, consumed. Index: by_consumed
- **daemonState:** singleton key, tickCount, lastTick, recentActions[]
- **proactiveActions:** type (nudge|autonomous|confirmation_sent), description, goalId, channel, cost, outcome (acted_on|dismissed|pending). Indexes: by_createdAt, by_goalId, by_outcome

### Memory Domain

- **goals:** title, description, status (not_started|in_progress|blocked|completed|abandoned), progress, blockedReason, source, reviewInterval, nextReview, priority, category, parentGoalId. Indexes: by_status, by_updatedAt, by_nextReview, by_category
- **activeContext:** summary, focusAreas[], lastSessionKey, updatedAt (singleton)
- **notifications:** sourceType (calendar|task|inbox), sourceId, sentAt, channel, summary, agentCostUsd

### Skills Domain

- **skillRegistry:** name, description, promptHash, schedule, scheduleTz, timeout, notifyChannel, outputPath, parameters, enabled, lastSyncedAt. Indexes: by_name, by_enabled_schedule

### Agency Domain

- **clients:** name, contactEmail, status (lead|active|completed|churned), linearTeamId, notes, contractUrl
- **clientProjects:** clientId, name, description, status (scoping|in_progress|review|delivered), githubRepoUrl, linearProjectId, budget, deadline
- **proposals:** clientId, title, status (draft|sent|accepted|rejected), amount, documentUrl
- **businessTasks:** title, description, category (legal|marketing|operations|finance), status, linkedGoalId
- **projectRegistry:** name, githubRepoUrl, localClonePath, defaultBranch, techStack[], isTemplate, linkedClientProjectId

### Finance Domain

- **financialAccounts:** institutionName, accountName, accountType (checking|savings|credit|investment), balance, currency, lastSynced, sophtronAccountId
- **financialTransactions:** accountId, date, description, amount, category, pending

### Education Domain

- **courses:** name, code, instructor, schedule[], semester, program, status (active|completed|dropped), grade, credits, color
- **assignments:** courseId, title, type (homework|exam|project|quiz), dueDate, status (pending|submitted|graded), grade, maxGrade, weight, notes

### Minions Domain

- **minionTasks, minionRuns, minionStepLogs, blueprintRegistry, blueprintMetrics**

### Tasks Domain

- **tasks:** title, description, status (todo|in-progress|done), priority, dueDate, section, tags[], project, source (vault|dashboard), area, energy, timeMinutes, context, horizon, deadlineType, rank, subtasksTotal, subtasksCompleted, lastTouched, needsResearch, agentCanDo, researchStatus (6 indexes)

### Other Tables

healthChecks, webhookEvents, webhookRegistrations, composioConnections, vaultFileIndex, codingTasks, workflowDebugAttempts, webChatMessages, contactInteractions, memoryConsolidation, skillProposals, agentSchedules

---

## API Route Map

### Trigger Server (port 8443, `src/scheduling/`)

| Method | Path              | Auth        | Description                     |
| ------ | ----------------- | ----------- | ------------------------------- |
| GET    | /health           | none        | Health check                    |
| GET    | /status           | bearer      | Uptime, channels, queue, cost   |
| POST   | /trigger          | bearer      | Agent invocation from cloud     |
| POST   | /stream           | bearer      | SSE streaming for web dashboard |
| POST   | /github-webhook   | HMAC-SHA256 | Auto-deploy on push to main     |
| POST   | /vault-autopilot  | bearer      | Vault maintenance               |
| POST   | /webhooks/:source | per-source  | Dynamic webhook router          |
| POST   | /minion           | bearer      | Invoke minion workflow          |
| POST   | /imessage/send    | bearer      | iMessage/SMS dispatch           |
| GET    | /vault/\*         | bearer      | Serve vault files               |
| POST   | /composio/\*      | bearer      | Proxy to Composio API           |

### Dashboard (Next.js, port 3000)

~30 API routes: /api/agent, /api/goals, /api/tasks, /api/memories, /api/sessions, /api/health, /api/vault/search, /api/minions, /api/coding-tasks, /api/clients, /api/projects, etc.

### Convex HTTP (`convex/http.ts`)

Webhook router httpAction, per-source handlers, internal function routes.

---

## Deployment Architecture

### Boot Chain

macOS Boot → launchd (`com.aura.pm2`, RunAtLoad, KeepAlive, 30s throttle) → `deploy/boot.sh` → PM2 `--no-daemon` (fork, 500M max, exponential backoff) → `aura:0` via tsx

### 3-Layer Restart Redundancy

1. **PM2:** crash → immediate restart (100ms–15s backoff)
2. **launchd:** PM2 dies → KeepAlive restarts after 30s
3. **macOS boot:** RunAtLoad fires full sequence

### Auto-Update Flow

Push to main → GitHub webhook to `POST /github-webhook:8443` → HMAC-SHA256 verify → `git pull origin main` → `npm install --production=false` → `pm2 restart aura` → Telegram notification

### Monitoring

HeartbeatService + ConvexHealthPush → `healthChecks` table: status, uptime, version, startedAt, channels, queue, dailyCostUsd. GET /status endpoint.

---

## CI/CD Pipeline

13 quality gates across 3 phases.

### Development Phase (hooks, every tool call)

1. **Protect Files** (PreToolUse): blocks .env, package-lock.json, .git/, credentials, secrets, .claude/settings.json
2. **Block Destructive Commands** (PreToolUse): blocks rm -rf, git push --force, git reset --hard, DROP TABLE, git clean -f, git checkout ., git restore .
3. **Prettier Auto-Format** (PostToolUse): `npx prettier --write` on edited files, printWidth: 100
4. **ESM Extension Check** (PostToolUse): local imports must have `.js` extension
5. **VSA Slice Boundary** (PostToolUse): no direct cross-slice imports

### Validation Phase (CLI commands before push)

6. **ESLint + Boundaries:** `npm run lint`, eslint-plugin-boundaries, 18 slice types
7. **TypeScript Strict:** `tsc --noEmit`, strict: true, target ES2022, module Node16
8. **Vitest Test Suite:** `vitest run`, V8 coverage on `src/**/*.ts`

### Deployment Phase (push to main)

9. Push to main → GitHub webhook
10. HMAC-SHA256 signature verification
11. `git pull` + `npm install` on Mac Mini
12. `pm2 restart aura`
13. GET /health → 200 verification + Telegram notification

---

## User Journeys

### Telegram Journey

1. **Message types:** text, voice (OGA), photo, document, video
2. **Commands:** /start, /clear, /status, /voice, /schedule
3. **Access control:** `allowedUsers` Set from config; unauthorized → "Access denied"
4. **Concurrency:** `activeChats: Set<number>`, one agent per chat
5. **Streaming:** TypingLoop (4s), StreamingMessage (edit-throttle 1.5s, max 4096 chars)
6. **Voice:** download OGA → Groq Whisper → prefix `[Voice transcribed]: ...`
7. **Media:** download to `~/.config/aura/uploads/`, auto-cleaned 24h
8. **Approval gates:** inline keyboards for sensitive actions (iMessage, phone, browser)

### Dashboard Journey

- Next.js at `http://127.0.0.1:3000`, no auth (stub AuthGate)
- 18 routes, SSE streaming via /api/agent, Convex real-time subscriptions
- Features: chat, goals, tasks, memories, sessions, health, vault search, minions, coding tasks, clients, projects

### CLI Journey

- One-shot: `npm start -- "prompt"` or interactive readline
- Direct stdout streaming, session key `cli:cli-local`
- ChannelUser: `{userId: "local", chatId: "cli-local", channel: "cli"}`
