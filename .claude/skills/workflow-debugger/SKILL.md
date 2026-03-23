---
name: workflow-debugger
description: Investigates and fixes failed Trigger.dev workflow runs. Use when asked "why did X fail?", "fix the failing task", "show debug history", "what's broken?".
metadata:
  timeout: 10m
  parameters:
    action:
      type: string
      default: investigate
      description: "Action to perform: investigate, fix, history, retry"
---

# Workflow Debugger

Manually investigate and fix failed Trigger.dev runs. The `run-monitor` task handles automatic detection and fixing, but this skill provides manual control.

## Automated Debugging (run-monitor)

The `run-monitor` scheduled task runs every 10 minutes and:

1. Fetches recent FAILED runs from Trigger.dev
2. Checks `workflowDebugAttempts` in Convex for prior attempts
3. Analyzes errors with Claude Haiku for fix classification
4. For code fixes: triggers `agent-job` with a debug prompt to create a fix PR
5. For non-code fixes: escalates via Telegram

**Circuit breaker:** Max 2 auto-debug attempts per run, 1-hour cooldown between attempts.

---

## Manual Actions

### investigate — Diagnose a failure

1. List recent failed runs:

```bash
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs?filter[status]=FAILED&page[size]=10" | \
  jq '.data[] | {id, task: .taskIdentifier, status, startedAt, finishedAt}'
```

2. Get full run details:

```bash
curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v3/runs/RUN_ID" | \
  jq '{id, task: .taskIdentifier, status, error, output}'
```

3. Check debug attempt history:

```bash
npx convex run workforce/debugAttempts:getByTask '{"taskIdentifier": "TASK_ID"}'
```

4. Read the task source:

```bash
cat src/trigger/TASK_ID.ts
```

### fix — Manually fix a failing task

1. Read the task file and understand the error
2. Create a fix branch:

```bash
git checkout -b fix/TASK_ID-manual main
```

3. Make the minimal fix
4. Typecheck: `npm run typecheck`
5. Commit, push, PR via `gh pr create`

### history — View debug attempts

```bash
# All recent debug attempts
npx convex run workforce/debugAttempts:list '{"limit": 20}'

# For a specific task
npx convex run workforce/debugAttempts:getByTask '{"taskIdentifier": "TASK_ID"}'

# For a specific run
npx convex run workforce/debugAttempts:getByRunId '{"triggerRunId": "RUN_ID"}'
```

### retry — Manually retry a failed run

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/tasks/TASK_ID/trigger" \
  -d '{"payload": {}}'
```

---

## Debug Attempt Statuses

| Status      | Meaning                                    |
| ----------- | ------------------------------------------ |
| `analyzing` | Error is being classified                  |
| `fixing`    | Agent is working on a code fix             |
| `deployed`  | Fix has been deployed                      |
| `retrying`  | Task is being retried after fix            |
| `resolved`  | Fix confirmed working                      |
| `escalated` | Cannot auto-fix, needs manual intervention |

---

## Common Patterns

**"Why did hn-checker fail?"**

- List failed runs for that task, get details, read the error

**"Fix the failing task"**

- Investigate the error, then either trigger auto-fix or do it manually

**"Show debug history"**

- Query `workflowDebugAttempts` table for recent entries

**"What's broken?"**

- List all failed runs in the last 24 hours, cross-reference with debug attempts
