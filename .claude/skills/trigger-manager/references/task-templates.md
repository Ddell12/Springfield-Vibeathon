# Trigger.dev Task Templates for Aura

Copy-paste templates for creating new Trigger.dev task files in `src/trigger/`.

---

## Basic Task Template

Use for one-off jobs that run when triggered manually or by a schedule.

```typescript
// src/trigger/my-task.ts
import { task, logger } from "@trigger.dev/sdk";
import { getConvexClient } from "./convex-client.js";
import { internal } from "../../convex/_generated/api.js";

export const myTask = task({
  id: "my-task",  // Must match filename (my-task.ts → "my-task")
  machine: { preset: "small-2x" },  // Options: micro, small-1x, small-2x, medium-1x, medium-2x
  maxDuration: 300,  // seconds
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: {
    someParam: string;
    optionalParam?: string;
  }) => {
    const client = getConvexClient();
    logger.info("Starting my-task", { payload });

    // Do work here...
    const result = await doWork(payload.someParam);

    // Optionally record results in Convex
    await client.mutation(internal.someModule.recordResult as any, {
      result,
      completedAt: new Date().toISOString(),
    });

    logger.info("my-task completed", { result });
    return { ok: true, result };
  },
});
```

---

## Agent-Job Pattern (calls local Aura daemon)

Use when you want a task that runs an Aura agent prompt via the local daemon.

```typescript
// src/trigger/weekly-report.ts
import { task, logger } from "@trigger.dev/sdk";
import { getConvexClient } from "./convex-client.js";
import { getDaemonFunnelUrl, getWebhookSecret } from "./utils.js";
import { internal } from "../../convex/_generated/api.js";

export const weeklyReport = task({
  id: "weekly-report",
  machine: { preset: "small-2x" },
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: {
    jobName: string;
    prompt?: string;
    skillName?: string;
    notifyChannel?: string;
    notifyChatId?: string;
  }) => {
    const client = getConvexClient();
    const startedAt = new Date().toISOString();

    const runId = await client.mutation(
      internal.scheduling.recordRunStart as any,
      { jobName: payload.jobName, startedAt },
    );

    try {
      const response = await fetch(`${getDaemonFunnelUrl()}/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getWebhookSecret()}`,
        },
        body: JSON.stringify({
          name: payload.jobName,
          prompt: payload.prompt ?? "",
          source: "trigger-dev",
          ...(payload.skillName ? { skillName: payload.skillName } : {}),
          ...(payload.notifyChannel
            ? { notifyChannel: payload.notifyChannel, notifyChatId: payload.notifyChatId ?? "" }
            : {}),
        }),
        signal: AbortSignal.timeout(300_000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Daemon responded ${response.status}: ${text}`);
      }

      const result = await response.json() as { ok: boolean; result?: string; error?: string };

      await client.mutation(internal.scheduling.recordRunComplete as any, {
        runId,
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      logger.info("Task completed", { jobName: payload.jobName });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await client.mutation(internal.scheduling.recordRunComplete as any, {
        runId,
        status: "failed",
        completedAt: new Date().toISOString(),
        error: message,
      });
      throw error;
    }
  },
});
```

---

## Scheduled Task Template

Use for tasks that run on a fixed cron schedule (built into the task definition).

```typescript
// src/trigger/morning-briefing.ts
import { schedules, logger } from "@trigger.dev/sdk";
import { getConvexClient } from "./convex-client.js";
import { internal } from "../../convex/_generated/api.js";

export const morningBriefing = schedules.task({
  id: "morning-briefing",
  cron: {
    pattern: "0 9 * * 1-5",  // 9am Mon-Fri
    timezone: "America/Chicago",
  },
  queue: { concurrencyLimit: 1 },  // Only one instance at a time
  retry: { maxAttempts: 2 },
  run: async () => {
    const client = getConvexClient();
    logger.info("Starting morning briefing");

    // Your scheduled logic here...

    return { completed: true };
  },
});
```

---

## Task with Queue/Concurrency Control

Use when you need to limit parallel execution or process items in order.

```typescript
import { task } from "@trigger.dev/sdk";

export const batchDataSync = task({
  id: "batch-data-sync",
  queue: {
    name: "data-sync-queue",
    concurrencyLimit: 1,  // Process one at a time
  },
  machine: { preset: "medium-1x" },
  maxDuration: 900,
  retry: { maxAttempts: 2 },
  run: async (payload: { batchId: string }) => {
    // Batch processing logic...
    return { batchId: payload.batchId, processed: true };
  },
});
```

---

## Webhook Processor Task

Use for processing incoming webhooks asynchronously.

```typescript
import { task, logger } from "@trigger.dev/sdk";

export const webhookProcessor = task({
  id: "webhook-processor",
  machine: { preset: "small-1x" },
  maxDuration: 120,
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    source: string;
    event: string;
    data: unknown;
  }) => {
    logger.info("Processing webhook", { source: payload.source, event: payload.event });

    // Process webhook data...

    return { processed: true };
  },
});
```

---

## Machine Presets Reference

| Preset | CPU | RAM | Use Case |
|--------|-----|-----|---------|
| `micro` | 0.25 vCPU | 256 MB | Simple data transforms |
| `small-1x` | 0.5 vCPU | 512 MB | Light processing |
| `small-2x` | 1 vCPU | 1 GB | Default for agent jobs |
| `medium-1x` | 1 vCPU | 2 GB | Memory-intensive tasks |
| `medium-2x` | 2 vCPU | 4 GB | Heavy processing |

---

## ConvexHttpClient Pattern

```typescript
import { getConvexClient } from "./convex-client.js";

const client = getConvexClient();

// Query (read)
const data = await client.query(internal.someModule.getData as any, { id: "..." });

// Mutation (write)
const result = await client.mutation(internal.someModule.saveData as any, { data });

// Note: cast `as any` is required for internal functions due to type constraints.
// The `internal` import comes from `../../convex/_generated/api.js`.
```

---

## File Naming Convention

Task ID → Filename mapping:
- `"agent-job"` → `agent-job.ts`
- `"daemon-tick"` → `daemon-tick.ts`
- `"weekly-report"` → `weekly-report.ts`
- `"morning-briefing"` → `morning-briefing.ts`

After creating a task file:
1. Development (auto-syncs): `npx trigger.dev dev`
2. Production deploy: `npx trigger.dev deploy`
