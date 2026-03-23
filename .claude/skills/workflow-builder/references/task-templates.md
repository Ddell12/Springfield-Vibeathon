# Trigger.dev Task Templates

Three templates for generating new workflow tasks. Each follows established Aura patterns.

---

## Template A: On-Demand Task

For tasks triggered manually or by other tasks. Pattern from `src/trigger/agent-job.ts`.

```typescript
import { task, logger } from "@trigger.dev/sdk";
import { getConvexClient } from "./convex-client.js";
import { internal } from "../../convex/_generated/api.js";
import { getDaemonFunnelUrl, getWebhookSecret } from "./utils.js";

export const {{taskExport}} = task({
  id: "{{taskId}}",
  machine: { preset: "small-2x" },
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: {{PayloadType}}) => {
    logger.info("{{taskId}} starting", { payload });

    // Option 1: Call daemon endpoint
    const response = await fetch(`${getDaemonFunnelUrl()}/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getWebhookSecret()}`,
      },
      body: JSON.stringify({
        name: "{{taskId}}",
        prompt: "{{promptTemplate}}",
        source: "trigger-dev",
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Daemon responded ${response.status}: ${text}`);
    }

    const result = await response.json();
    logger.info("{{taskId}} completed", { result });
    return result;
  },
});
```

---

## Template B: Scheduled (Cron) Task

For recurring tasks with a cron schedule. Pattern from `src/trigger/morning-briefing.ts`.

```typescript
import { schedules, logger } from "@trigger.dev/sdk";

export const {{taskExport}} = schedules.task({
  id: "{{taskId}}",
  cron: {
    pattern: "{{cronPattern}}",
    timezone: "America/Chicago",
  },
  retry: { maxAttempts: 2 },
  run: async () => {
    const { agentJob } = await import("./agent-job.js");

    const handle = await agentJob.trigger({
      jobName: "{{taskId}}",
      {{#if skillName}}skillName: "{{skillName}}",{{/if}}
      {{#if prompt}}prompt: "{{prompt}}",{{/if}}
      {{#if notify}}notifyChannel: "telegram",
      notifyChatId: process.env.TELEGRAM_CHAT_ID ?? "",{{/if}}
    });

    logger.info("{{taskId}} triggered", { handleId: handle.id });
    return { triggered: true, handleId: handle.id };
  },
});
```

---

## Template C: Daemon-Calling Task

For tasks that call a specific daemon route (not the agent). Pattern from `src/trigger/vault-autopilot.ts`.

```typescript
import { schedules, logger } from "@trigger.dev/sdk";
import { getDaemonFunnelUrl, getWebhookSecret } from "./utils.js";

export const {{taskExport}} = schedules.task({
  id: "{{taskId}}",
  cron: {
    pattern: "{{cronPattern}}",
    timezone: "America/Chicago",
  },
  retry: { maxAttempts: 2 },
  run: async () => {
    const url = `${getDaemonFunnelUrl()}/{{routePath}}`;
    const secret = getWebhookSecret();

    logger.info("{{taskId}} starting", { url });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      {{#if body}}body: JSON.stringify({{body}}),{{/if}}
      signal: AbortSignal.timeout(60_000),
    });

    const body = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      logger.error("{{taskId}} failed", { status: response.status, body });
      throw new Error(`{{taskId}} returned ${response.status}: ${JSON.stringify(body)}`);
    }

    logger.info("{{taskId}} completed", { body });
    return { triggered: true, ...body };
  },
});
```

---

## Conventions

- **File naming:** `src/trigger/{{taskId}}.ts` — kebab-case matching the task ID
- **Export naming:** camelCase version of task ID (e.g., `hn-checker` → `hnChecker`)
- **Barrel export:** Add `export { {{taskExport}} } from "./{{taskId}}.js";` to `src/trigger/index.ts`
- **Imports:** Always use `.js` extensions (ESM)
- **Convex client:** Use `getConvexClient()` from `./convex-client.js` when storing results
- **Daemon URL:** Use `getDaemonFunnelUrl()` + `getWebhookSecret()` from `./utils.js`
- **Timeouts:** Always set `signal: AbortSignal.timeout(...)` on fetch calls
- **Deploy:** Tasks auto-register when deployed via `npx trigger.dev deploy`
