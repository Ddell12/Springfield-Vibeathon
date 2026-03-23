# Wheel Audit Report: Hand-Rolled Code vs. Existing Packages

**Codebase:** /Users/desha/Aura
**Date:** 2026-03-06
**Scope:** All `src/` modules (non-test), focusing on substantial implementations

---

## High-Impact Findings

### 1. Hand-Rolled HTTP Server + Router (trigger-server.ts, 540 lines)

**Location:** `src/scheduling/trigger-server.ts` + `src/scheduling/routes/*.ts`

**What it does:** Full HTTP server built on raw `node:http` with manual routing (`if (req.method === "POST" && req.url === "/trigger")`), manual body parsing with size limits, manual JSON response writing, manual SSE streaming (`src/scheduling/routes/stream.ts`), and manual auth token comparison.

**Replacement candidate:** [Fastify](https://www.npmjs.com/package/fastify) (74M+ weekly downloads) or [Hono](https://www.npmjs.com/package/hono) (2M+ weekly downloads)

**What you gain:**

- Built-in JSON body parsing with size limits
- Declarative routing with path params (replaces regex-based `/webhooks/:source` matching)
- Built-in schema validation (Fastify has Ajv, Hono has Zod middleware)
- Plugin ecosystem for auth, CORS, rate limiting
- Built-in SSE/streaming support
- Request lifecycle hooks replace manual try/catch error handling
- TypeScript-first in both libraries

**Effort/risk:** Medium. The server has ~12 routes spread across 8 files. Migration is mechanical but touches many files. The SSE streaming route and webhook signature verification would need adapter wrappers.

**Verdict:** RECOMMENDED. The manual body reading, routing conditionals, and error handling are exactly what HTTP frameworks exist to eliminate. The codebase is already ~540 lines of infrastructure plumbing that a framework handles in ~50 lines of config.

---

### 2. Hand-Rolled Concurrency Semaphore (concurrency.ts, 112 lines)

**Location:** `src/agent/concurrency.ts`

**What it does:** Counting semaphore with FIFO queue (`AgentQueue` class). acquire() queues callers when at capacity, release() hands slots to the next waiter. Wraps `runAgent` with `queuedRunAgent`.

**Replacement candidate:** [p-limit](https://www.npmjs.com/package/p-limit) (60M+ weekly downloads) or [p-queue](https://www.npmjs.com/package/p-queue) (5M+ weekly downloads)

**What you gain:**

- `p-limit` is a battle-tested concurrency limiter in ~50 lines
- `p-queue` adds priority queuing, pause/resume, events, timeout, per-channel stats
- Both handle edge cases (error propagation, cleanup) that hand-rolled versions often miss

**Effort/risk:** Low. The `AgentQueue` class is self-contained. The `queuedRunAgent` wrapper function would use `p-limit` or `p-queue` directly.

**Verdict:** RECOMMENDED. The hand-rolled version works but `p-queue` would add priority queuing (useful since agent requests vary in importance) and event hooks for free.

---

### 3. Hand-Rolled Retry with Exponential Backoff (retry.ts, 64 lines)

**Location:** `src/shared/retry.ts`

**What it does:** `withRetry()` function with configurable max attempts, initial delay, backoff multiplier, max delay cap, and transient error detection via string matching.

**Replacement candidate:** [p-retry](https://www.npmjs.com/package/p-retry) (18M+ weekly downloads) or [async-retry](https://www.npmjs.com/package/async-retry) (7M+ weekly downloads)

**What you gain:**

- `p-retry` provides the same API with better abort handling, `AbortError` for non-retriable errors, and `onFailedAttempt` hooks
- Built-in jitter to avoid thundering herd (the hand-rolled version has no jitter)
- Standard `retry` options object compatible with ecosystem

**Effort/risk:** Low. Drop-in replacement. The `isTransientError` function would become a custom `shouldRetry` predicate.

**Verdict:** RECOMMENDED. The missing jitter in the hand-rolled version is a real gap for production use. `p-retry` is tiny and well-maintained.

---

### 4. Hand-Rolled Markdown Frontmatter Parsing (vault-tasks.ts, 80+ lines; chunker.ts, 75 lines)

**Location:** `src/vault/vault-tasks.ts` (parseTaskFrontmatter), `src/vault/chunker.ts` (extractAndParseFrontmatter), `src/skills/parser.ts` (parseSkillFile)

**What it does:** Three separate implementations of YAML frontmatter extraction from markdown files. `vault-tasks.ts` rolls its own line-by-line YAML parser (no YAML library!), while `chunker.ts` and `parser.ts` use the `yaml` package for the YAML part but still manually extract the `---` delimited block.

**Replacement candidate:** [gray-matter](https://www.npmjs.com/package/gray-matter) (4M+ weekly downloads) -- **already installed as a dependency!**

**What you gain:**

- `gray-matter` is already in `package.json` but not used in these three files
- Handles edge cases: CRLF line endings, empty frontmatter, excerpt extraction, custom delimiters
- Returns `{ data, content, excerpt }` -- exactly what all three callsites need
- The hand-rolled parser in `vault-tasks.ts` has bugs: it won't handle multi-line YAML values, arrays, or nested objects

**Effort/risk:** Low. `gray-matter` is already a dependency. Each callsite is a straightforward swap.

**Verdict:** STRONGLY RECOMMENDED. You are paying for `gray-matter` and not using it. The hand-rolled YAML parser in `vault-tasks.ts` is particularly fragile.

---

### 5. Hand-Rolled Markdown Text Chunker (chunker.ts, 212 lines)

**Location:** `src/vault/chunker.ts`

**What it does:** Splits markdown into chunks by heading boundaries, splits oversized sections at paragraph boundaries, applies a token-count heuristic (1 token ~ 4 chars), enriches chunks with metadata preambles.

**Replacement candidate:** [langchain/textsplitters](https://www.npmjs.com/package/@langchain/textsplitters) (1M+ weekly downloads) or [llm-chunk](https://www.npmjs.com/package/llm-chunk) (3K weekly downloads) or [text-splitter](https://www.npmjs.com/package/text-splitter) via the Rust `text-splitter` bindings

**What you gain:**

- `RecursiveCharacterTextSplitter` or `MarkdownTextSplitter` from LangChain handles heading-aware splitting, configurable chunk/overlap sizes, and supports multiple markdown structures
- Proper token counting via `tiktoken` instead of the 4-chars heuristic
- Overlap between chunks for better RAG retrieval

**Effort/risk:** Medium. The chunk metadata enrichment (path, tags, aliases preamble) is custom and would need to be applied post-split. The `chunkMarkdown` function's output shape would need an adapter.

**Verdict:** CONSIDER. The custom enrichment logic is legitimately project-specific. However, the splitting logic itself (heading detection, paragraph fallback, size limits) is generic and would benefit from a library that handles edge cases better. The token estimation heuristic (4 chars/token) can be 30-50% off for code or non-English text.

---

### 6. Hand-Rolled DAG Topological Sort + Wave Executor (runner.ts, 228 lines)

**Location:** `src/minions/runner.ts` (topologicalSort, getReadySteps, wave execution loop), `src/minions/blueprint-parser.ts` (cycle detection, dependency validation)

**What it does:** Topological sort via DFS, wave-based parallel execution of DAG nodes, dependency validation with cycle detection, retry and feed-to-agent error recovery.

**Replacement candidate:** [graphlib](https://www.npmjs.com/package/graphlib) (700K weekly downloads) for the graph operations, or [p-graph](https://www.npmjs.com/package/p-graph) (5K weekly downloads) which provides both DAG construction and concurrent wave execution.

**What you gain:**

- `p-graph` gives you `pGraph(dagMap).run()` with built-in concurrency-limited wave execution -- exactly what `MinionRunner.run()` does manually
- `graphlib` provides `alg.topsort()`, `alg.isAcyclic()`, and proper graph data structures
- Both handle edge cases around disconnected subgraphs and empty DAGs

**Effort/risk:** Medium. The retry and feed-to-agent error recovery logic is custom and would need to wrap the executor. The Convex logging at each step would need to be wired into callbacks.

**Verdict:** CONSIDER. The topo sort + cycle detection is textbook graph algorithm code that libraries handle. The wave execution pattern with step-level callbacks is more custom but `p-graph` covers it well.

---

### 7. Hand-Rolled Concurrency Pool in Orchestrator (orchestrator.ts, 254 lines)

**Location:** `src/minions/orchestrator.ts` (runMinion method)

**What it does:** Manual concurrency limiting via a counter and polling loop:

```typescript
while (this.activeMinions >= MAX_CONCURRENT_MINIONS) {
  await new Promise((r) => setTimeout(r, 5000));
}
this.activeMinions++;
```

**Replacement candidate:** [p-limit](https://www.npmjs.com/package/p-limit) or [p-queue](https://www.npmjs.com/package/p-queue)

**What you gain:**

- Eliminates the 5-second polling loop (wastes CPU cycles and adds up to 5s latency)
- Proper promise-based queuing with immediate slot handoff
- No risk of race conditions on the counter

**Effort/risk:** Low. Replace the while-loop with `const limiter = pLimit(3)` and wrap `runMinion` calls.

**Verdict:** STRONGLY RECOMMENDED. The polling-based concurrency control is a known anti-pattern. A proper semaphore (even the existing `AgentQueue` in `src/agent/concurrency.ts`) would be better. `p-limit` is the standard solution.

---

### 8. Hand-Rolled Mustache-Style Template Interpolation (blueprint-parser.ts)

**Location:** `src/minions/blueprint-parser.ts` (interpolateTemplate)

**What it does:** `template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? ...)`

**Replacement candidate:** [mustache](https://www.npmjs.com/package/mustache) (5M+ weekly downloads) or [handlebars](https://www.npmjs.com/package/handlebars) (12M+ weekly downloads)

**What you gain:**

- Conditionals, loops, partials, HTML escaping
- Nested property access (`{{step.output}}`)
- Section blocks for optional content

**Effort/risk:** Very low. Single function replacement.

**Verdict:** SKIP for now. The current usage is simple key substitution. A library would be overkill unless template complexity grows. Flag for future if blueprints need conditionals.

---

## Medium-Impact Findings

### 9. Hand-Rolled SSE (Server-Sent Events) Implementation

**Location:** `src/scheduling/routes/stream.ts`

**What it does:** Manual SSE formatting: `res.write(\`event: ${event}\ndata: ${JSON.stringify(data)}\n\n\`)` with manual headers.

**Replacement candidate:** Would be handled by switching to Fastify/Hono (Finding #1). Both have SSE plugins.

**Verdict:** Address as part of HTTP framework migration.

---

### 10. Hand-Rolled Webhook Signature Verification (3 implementations)

**Location:** `src/scheduling/routes/webhooks.ts` (verifyHmac), `src/scheduling/routes/github-deploy.ts` (verifySignature), `src/scheduling/trigger-server.ts` (tokenMatches)

**What it does:** Three separate HMAC signature verification functions, each slightly different. GitHub uses `sha256=` prefix. Webhooks support sha1 and sha256. Token matching uses HMAC comparison for constant-time equality.

**Replacement candidate:** Would be consolidated by an HTTP framework with webhook middleware. Alternatively, [webhook-verify](https://www.npmjs.com/package/@octokit/webhooks-methods) for GitHub specifically.

**Verdict:** CONSOLIDATE. These three functions should at minimum be unified into one parameterized helper. A framework would eliminate them entirely.

---

### 11. Hand-Rolled File Watcher Hub

**Location:** `src/vault/watcher-hub.ts` (referenced from `vault-observer.ts`)

The codebase uses `chokidar` (already installed) for the underlying file watching. The hub layer (subscribe/unsubscribe pattern) is a thin pub/sub on top, which is reasonable custom code.

**Verdict:** KEEP. The pub/sub layer over chokidar is appropriate custom code.

---

### 12. Hand-Rolled Token Rate Limiter (limiter.ts, 106 lines)

**Location:** `src/rate-limit/limiter.ts`

**What it does:** Session-level and daily token counting with limit checks. Pure functions operating on usage records.

**Note:** The project already has `@convex-dev/rate-limiter` installed for server-side rate limiting.

**Replacement candidate:** The logic is domain-specific (token counting for AI sessions). General rate limiters like `bottleneck` or `rate-limiter-flexible` operate on request counts, not token aggregates.

**Verdict:** KEEP. This is domain-specific enough that a generic rate limiter wouldn't help.

---

## Summary Table

| #   | Module                        | Lines | Replacement                      | Impact | Effort       | Verdict              |
| --- | ----------------------------- | ----- | -------------------------------- | ------ | ------------ | -------------------- |
| 1   | HTTP server + router          | ~800  | Fastify or Hono                  | High   | Medium       | RECOMMENDED          |
| 2   | Concurrency semaphore         | 112   | p-queue                          | Medium | Low          | RECOMMENDED          |
| 3   | Retry with backoff            | 64    | p-retry                          | Medium | Low          | RECOMMENDED          |
| 4   | Frontmatter parsing (3x)      | ~200  | gray-matter (already installed!) | High   | Low          | STRONGLY RECOMMENDED |
| 5   | Markdown chunker              | 212   | @langchain/textsplitters         | Medium | Medium       | CONSIDER             |
| 6   | DAG topo sort + executor      | 228+  | p-graph or graphlib              | Medium | Medium       | CONSIDER             |
| 7   | Orchestrator concurrency      | 254   | p-limit                          | High   | Low          | STRONGLY RECOMMENDED |
| 8   | Template interpolation        | 4     | mustache                         | Low    | Very low     | SKIP                 |
| 9   | SSE implementation            | ~30   | (part of #1)                     | Low    | (part of #1) | BUNDLE WITH #1       |
| 10  | Webhook sig verification (3x) | ~60   | Consolidate + framework          | Medium | Low          | CONSOLIDATE          |
| 11  | File watcher hub              | ~50   | --                               | --     | --           | KEEP                 |
| 12  | Token rate limiter            | 106   | --                               | --     | --           | KEEP                 |

## Recommended Priority Order

1. **Use gray-matter** (already installed, zero new dependencies, fixes real bugs in vault-tasks.ts)
2. **Replace orchestrator polling loop** with p-limit (eliminates anti-pattern, 1-file change)
3. **Replace retry.ts** with p-retry (adds jitter, drop-in, tiny package)
4. **Replace AgentQueue** with p-queue (adds priority queuing, events)
5. **Migrate HTTP server** to Fastify or Hono (biggest effort but biggest maintenance win)
6. **Evaluate** markdown chunker and DAG executor replacements based on future needs

## Notes

- The codebase has strong conventions (VSA slices, barrel exports, dependency injection) that make swapping implementations relatively safe.
- Items marked KEEP are genuinely project-specific domain logic that wouldn't benefit from generic packages.
- The `gray-matter` finding is the most surprising -- it's a paid-for dependency sitting unused while three hand-rolled alternatives exist.
