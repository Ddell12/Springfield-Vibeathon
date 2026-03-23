# Trigger.dev

Last updated: 2026-03-06

Reference for Trigger.dev v4 (SDK `@trigger.dev/sdk`).

---

## Quick Reference

| Topic                | Correct                                                                          | Wrong                                                           |
| -------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Import               | `import { task, schedules } from "@trigger.dev/sdk"`                             | `from "@trigger.dev/sdk/v3"` (v3 legacy path)                   |
| Cron task            | `schedules.task({ id, cron, run })`                                              | `task({ id, cron, run })` — cron is ignored on regular `task()` |
| Trigger subtask      | `await childTask.triggerAndWait(payload)`                                        | `childTask.trigger(payload)` without `await`                    |
| Batch fan-out        | `await childTask.batchTriggerAndWait([...])`                                     | `Promise.all` with `triggerAndWait` in a loop                   |
| Multi-task batch     | `await batch.triggerAndWait<T1 \| T2>([...])`                                    | Separate sequential `triggerAndWait` calls                      |
| Permanent error      | `throw new AbortTaskRunError(msg)`                                               | `throw new Error(msg)` (wastes retries)                         |
| Task discovery       | Tasks must be exported OR be "hidden tasks" in the same file as an exported task | Unexported task in a separate file = invisible                  |
| Config file          | `trigger.config.ts` at project root with `defineConfig()`                        | `trigger.config.js` without `defineConfig` wrapper              |
| Deploy               | `npx trigger.dev@latest deploy`                                                  | Forgetting to deploy after code changes                         |
| Lifecycle hooks (v4) | Single destructured object: `onStart: ({ payload, ctx }) => {}`                  | v3 style: `onStart: (payload, { ctx }) => {}`                   |
| Concurrency control  | `queue: { concurrencyLimit: N }` on task definition                              | Dynamic queue creation at trigger time (v4 removed this)        |
| Idempotency          | `{ idempotencyKey: "key", idempotencyKeyTTL: "5m" }`                             | Assuming idempotency persists forever (default 30 days)         |

---

## Best Practices (Non-Obvious)

- **Always `await` trigger calls.** Without `await`, parent can exit before network call completes → subtask never fires.
- **Set `maxDuration` explicitly** per task to prevent runaway execution.
- **Use `AbortTaskRunError` for non-retryable errors** (invalid input, auth failure) to prevent wasting retry attempts.
- **Concurrency released at waitpoints.** `triggerAndWait`, `wait.for` etc. release the slot — waiting runs don't count against limits.
- **v4 requires pre-defined queues.** No dynamic queue creation at trigger time.
- **Use `catchError` for conditional retry logic** based on error type (rate limits → wait, not found → don't retry).
- **`onFailure` fires only after ALL retries exhausted.** Does NOT fire for Crashed/System failure statuses.
- **Config file imports affect cold start.** Heavy imports in `trigger.config.ts` increase startup time.

---

## Known Gotchas

### 1. [PROJECT] Regular `task()` ignores `cron`

`cron` is ONLY recognized on `schedules.task()`. On regular `task()` it is silently ignored.

### 2. Missing `await` on trigger calls

The #1 cause of "subtask never ran" bugs.

### 3. Cron timezone defaults to UTC

Use the object form for timezones:

```typescript
cron: { pattern: "0 6 * * *", timezone: "America/Chicago" }
```

### 4. `batchTrigger` limit

SDK v4.3.1+: 1,000 items. Prior: 500. Exceeding throws `BatchTriggerError`.

### 5. Unexported tasks in separate files are invisible

Must be exported from `dirs` paths, or be hidden tasks in same file as an exported task.

### 6. v4 lifecycle hook signature change

v3: `onStart: (payload, { ctx }) => {}`. v4: `onStart: ({ payload, ctx }) => {}`. Old signature silently breaks.

### 7. Retries disabled in dev by default

`retries.enabledInDev: false` set by `init` command.

### 8. Failed idempotent runs auto-clear the key

Failed → key cleared → re-triggerable. Successful/canceled → key preserved.

### 9. `maxDuration` vs retry timeouts

`maxDuration` (seconds) = upper bound on run time → `TIMED_OUT`. Retry timeouts control delay between attempts.

---

## Common Plan Mistakes

| Mistake                                         | Correct Approach                                      |
| ----------------------------------------------- | ----------------------------------------------------- |
| Using `task()` for cron jobs                    | `schedules.task()` with `cron` property               |
| Importing from `@trigger.dev/sdk/v3`            | Import from `@trigger.dev/sdk`                        |
| Using `client.defineJob()`                      | v2 API removed. Use `task()` or `schedules.task()`    |
| Creating dynamic queues at trigger time         | Pre-define queues in task definitions                 |
| `Promise.all` + `triggerAndWait` loop           | `batchTriggerAndWait([...])`                          |
| Assuming auto-deploy on git push                | Must run `npx trigger.dev deploy`                     |
| Dashboard schedules on `task()`                 | Dashboard schedules only work with `schedules.task()` |
| Forgetting `externalId` on imperative schedules | Always set for identification                         |
| Not exporting tasks                             | Export all tasks (or use hidden task pattern)         |
| Using v3 lifecycle hook signatures              | Single-object destructuring in v4                     |

---

## Non-Obvious Patterns

### Hidden Task (Internal-Only)

```typescript
// NOT exported — only callable from within this file
const internalHelper = task({
  id: "internal-helper",
  run: async (payload: { data: string }) => ({ cleaned: payload.data.trim().toLowerCase() }),
});

// Exported — discovered by Trigger.dev, uses the hidden task
export const publicTask = task({
  id: "public-task",
  run: async (payload: { rawData: string }) => {
    const result = await internalHelper.triggerAndWait({ data: payload.rawData });
    return result.ok ? result.output : null;
  },
});
```

### Multi-Task Batch (Different Task Types)

```typescript
const { runs } = await batch.triggerAndWait<typeof enrichTask | typeof scoreTask>([
  { id: "enrich-company", payload: { name } },
  { id: "score-company", payload: { name } },
]);
for (const run of runs) {
  if (run.ok) {
    /* switch on run.taskIdentifier */
  }
}
```

### Delayed One-Off Execution

```typescript
await processReminder.trigger(
  { userId: "123", message: "Follow up" },
  { delay: "30m" }, // "30s", "5m", "2h", "1d", or Date
);
```

---

## [PROJECT] Task Inventory

| Task ID                  | Type               | File                                 | Purpose                    |
| ------------------------ | ------------------ | ------------------------------------ | -------------------------- |
| `agent-job`              | `task()`           | `src/trigger/agent-job.ts`           | On-demand agent execution  |
| `scheduled-skill`        | `schedules.task()` | `src/trigger/scheduled-skill.ts`     | Cron-based skill execution |
| `scout-morning-news`     | `schedules.task()` | `src/trigger/agent-schedules.ts`     | Daily morning news         |
| `scout-afternoon-trends` | `schedules.task()` | `src/trigger/agent-schedules.ts`     | Afternoon trends           |
| `atlas-pipeline-review`  | `schedules.task()` | `src/trigger/agent-schedules.ts`     | Pipeline review            |
| `atlas-weekly-invoice`   | `schedules.task()` | `src/trigger/agent-schedules.ts`     | Weekly invoicing           |
| `forge-pr-watch`         | `schedules.task()` | `src/trigger/agent-schedules.ts`     | PR monitoring              |
| `spark-weekly-ideation`  | `schedules.task()` | `src/trigger/agent-schedules.ts`     | Weekly ideation            |
| `morning-briefing`       | `schedules.task()` | `src/trigger/morning-briefing.ts`    | Daily briefing             |
| `daemon-tick`            | `schedules.task()` | `src/trigger/daemon-tick.ts`         | Health tick                |
| `recurring-spawner`      | `schedules.task()` | `src/trigger/recurring-spawner.ts`   | Daily task spawning        |
| `run-monitor`            | `schedules.task()` | `src/trigger/run-monitor.ts`         | Failed run auto-fix        |
| `vault-autopilot`        | `task()`           | `src/trigger/vault-autopilot.ts`     | Vault automation           |
| `autonomous-executor`    | `task()`           | `src/trigger/autonomous-executor.ts` | Autonomous execution       |
| `vault-sync-sweep`       | `task()`           | `src/trigger/vault-sync-sweep.ts`    | Vault sync                 |

### [PROJECT] Skill-Based Schedule Pattern

```typescript
export const scheduledSkill = schedules.task({
  id: "scheduled-skill",
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const skillName = payload.externalId; // externalId = skill name
    if (!skillName) throw new AbortTaskRunError("No externalId");
    // POST to daemon /trigger endpoint
  },
});
```

### [PROJECT] Agent Wake Pattern

```typescript
export const scoutMorningNews = schedules.task({
  id: "scout-morning-news",
  retry: { maxAttempts: 2 },
  run: async () => postAgentWake("scout", "Morning AI/tech news scan..."),
});
// Cron schedules attached imperatively via dashboard/API
```

### [PROJECT] Config

```typescript
export default defineConfig({
  project: "proj_czugpslgxaafhonknqnn",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },
});
```
