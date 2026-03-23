---
name: trigger-manager
description: Manages Trigger.dev automations — list, create, edit, trigger, and cancel jobs and schedules. Use when managing crons: "what crons are running", "create a schedule", "trigger a job", "cancel a run".
metadata:
  timeout: 5m
  parameters:
    action:
      type: string
      default: status
      description: "Action to perform: status, list-schedules, list-runs, create-schedule, trigger, cancel, run-details"
---

# Trigger.dev Automation Manager

Aura uses Trigger.dev to run scheduled automations and agent jobs in the cloud. This skill lets you manage those automations via the Trigger.dev REST API.

## What Trigger.dev Manages for Aura

- **daemon-tick** — Runs every 15 minutes. Checks for pending observations, triages them with a fast Claude call, and escalates to the full agent when needed. This is Aura's proactive intelligence system.
- **agent-job** — Runs any prompt/skill through the local daemon via Tailscale Funnel. Triggered by schedules or manually. Handles reporting back to Convex and Telegram.
- **run-monitor** — Runs every 10 minutes. Polls Trigger.dev for failed runs, analyzes errors, and triggers auto-fix agents. Circuit breaker: max 2 attempts per run, 1-hour cooldown. Escalates to Telegram if unfixable.
- **morning-briefing** — Runs daily at 7 AM CT. Triggers the morning-routine skill.
- **vault-autopilot** — Runs daily at 6:45 AM CT. Creates daily notes, processes recurring tasks, syncs to Convex.
- **scheduled-skill** — Generic scheduled task that runs any skill by its `externalId`.

## Available Task IDs

| Task ID            | Description                                      | Type           |
| ------------------ | ------------------------------------------------ | -------------- |
| `agent-job`        | Run any prompt/skill through Aura's local daemon | Regular task   |
| `daemon-tick`      | 15-min proactive daemon tick                     | Scheduled task |
| `run-monitor`      | 10-min failed run detector + auto-fixer          | Scheduled task |
| `morning-briefing` | Daily 7 AM morning routine                       | Scheduled task |
| `vault-autopilot`  | Daily 6:45 AM vault maintenance                  | Scheduled task |
| `scheduled-skill`  | Cron-driven skill execution                      | Scheduled task |

## Self-Debugging Pipeline

The `run-monitor` task implements automatic failure detection and repair:

1. Polls `GET /api/v1/runs?filter[status]=FAILED` every 10 minutes
2. For each failure, checks `workflowDebugAttempts` table in Convex
3. Classifies error with Claude Haiku (code fix, config, dependency, environment, transient)
4. For code fixes: triggers `agent-job` with a debug prompt to create branch + PR
5. For non-code fixes: escalates via Telegram notification

**Convex tables:**

- `workflowDebugAttempts` — tracks debug attempts per run (status, strategy, PR URL)
- `webhookRegistrations` — per-source webhook auth config (used by webhook router)

---

## Management Actions

All actions use `$TRIGGER_SECRET_KEY` from the environment. Make sure it's set before running commands.

### status — Show overview

```bash
# Show all schedules
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/schedules" | \
  jq '.data[] | {id, task, active, nextRun: .nextRun, cron: .generator.expression}'

# Show currently running/queued jobs
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs?filter[status]=EXECUTING,QUEUED&page[size]=10" | \
  jq '.data[] | {id, task: .taskIdentifier, status, startedAt}'
```

### list-schedules — List all schedules with details

```bash
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/schedules" | \
  jq '.data[] | {id, task, active, cron: .generator.expression, timezone, nextRun, externalId}'
```

### list-runs — List recent runs (with optional filters)

```bash
# All recent runs (last 25)
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs?page[size]=25" | \
  jq '.data[] | {id, task: .taskIdentifier, status, startedAt, finishedAt}'

# Filter by status (COMPLETED, FAILED, EXECUTING, QUEUED, CANCELED)
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs?filter[status]=FAILED&page[size]=10" | \
  jq '.data[] | {id, task: .taskIdentifier, status, startedAt}'

# Filter by task
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs?filter[taskIdentifier]=agent-job&page[size]=10" | \
  jq '.data[] | {id, status, startedAt, finishedAt}'
```

### create-schedule — Create a new schedule

```bash
# Create a daily 9am agent job
curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/schedules" \
  -d '{
    "task": "agent-job",
    "cron": "0 9 * * *",
    "timezone": "America/Chicago",
    "externalId": "daily-morning-briefing"
  }'
```

### trigger — Manually trigger a task

```bash
# Trigger agent-job with a prompt
curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/tasks/agent-job/trigger" \
  -d '{
    "payload": {
      "jobName": "manual-run",
      "prompt": "Check my email and summarize anything urgent",
      "notifyChannel": "telegram",
      "notifyChatId": "YOUR_CHAT_ID"
    }
  }'

# Trigger daemon-tick manually
curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/tasks/daemon-tick/trigger" \
  -d '{"payload": {}}'
```

### cancel — Cancel a running task

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v2/runs/RUN_ID/cancel"
```

### run-details — Get full details of a run

```bash
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v3/runs/RUN_ID" | \
  jq '{id, task: .taskIdentifier, status, startedAt, finishedAt, error, output}'
```

### toggle-schedule — Activate or deactivate a schedule

```bash
# Deactivate
curl -s -X PUT \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/schedules/SCHEDULE_ID" \
  -d '{"active": false}'

# Activate
curl -s -X PUT \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/schedules/SCHEDULE_ID" \
  -d '{"active": true}'
```

### delete-schedule — Remove a schedule permanently

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/schedules/SCHEDULE_ID"
```

---

## Creating New Task Definitions

Aura can create new Trigger.dev task files to add custom automations.

### How to create a new task

1. Write the task file to `src/trigger/` (kebab-case matching the task ID)
2. Export the task using `task()` or `schedules.task()` from `@trigger.dev/sdk`
3. Deploy: `npx trigger.dev deploy` (or it auto-syncs with `npx trigger.dev dev`)

See `references/task-templates.md` for copy-paste templates and patterns.

**Import conventions in `src/trigger/`:**

- `import { getConvexClient } from "./convex-client.js"` — for Convex access
- `import { getDaemonFunnelUrl, getWebhookSecret } from "./utils.js"` — for daemon URL
- `import { internal } from "../../convex/_generated/api.js"` — for internal Convex functions

---

## Formatting for Telegram

When reporting automation status in Telegram, keep it concise:

```
📋 Schedules (2 active):
• agent-job — 0 9 * * * CT — next: tomorrow 9am
• daemon-tick — */15 * * * * CT — next: 3 min

🔄 Running now: 0
❌ Failed (24h): 0
✅ Completed (24h): 48
```

For run details:

```
Run run_abc123
Task: agent-job
Status: COMPLETED ✅
Duration: 42.3s
Started: Feb 21 9:00am
```

---

## Common Patterns

**"Show me running jobs"**
→ Use `list-runs` with `filter[status]=EXECUTING,QUEUED`

**"Create a daily job that summarizes my inbox"**
→ Use `create-schedule` with `task: agent-job`, `cron: "0 9 * * *"`, include prompt in payload via manual trigger setup

**"Cancel that job" / "Stop the running task"**
→ Use `list-runs` to find the run ID, then `cancel`

**"What's the history for daemon-tick?"**
→ Use `list-runs` with `filter[taskIdentifier]=daemon-tick&page[size]=25`

**"Create a new task that scrapes job boards every day"**
→ Write new task file to `src/trigger/job-board-scraper.ts`, use `create-schedule` after deploy

**"Why did the last run fail?"**
→ Use `list-runs` with `filter[status]=FAILED`, then `run-details` for the specific run ID

**"Pause the daemon tick"**
→ Find schedule ID with `list-schedules`, then `toggle-schedule` with `active: false`
