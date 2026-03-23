# Trigger.dev REST API Reference

Condensed reference for the Trigger.dev REST API endpoints used by Aura.
All requests require `Authorization: Bearer $TRIGGER_SECRET_KEY`.

Base URL: `https://api.trigger.dev`

---

## Schedules

### List all schedules
```bash
GET /api/v1/schedules

curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/schedules"
```

Response:
```json
{
  "data": [
    {
      "id": "sched_abc123",
      "task": "agent-job",
      "active": true,
      "externalId": "daily-morning",
      "timezone": "America/Chicago",
      "nextRun": "2026-02-22T15:00:00.000Z",
      "generator": {
        "type": "CRON",
        "expression": "0 9 * * *",
        "description": "Every day at 9am"
      }
    }
  ],
  "pagination": { "next": null }
}
```

### Create a schedule
```bash
POST /api/v1/schedules

curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/schedules" \
  -d '{
    "task": "agent-job",
    "cron": "0 9 * * *",
    "timezone": "America/Chicago",
    "externalId": "my-schedule-id"
  }'
```

### Update a schedule (cron, timezone, externalId, active)
```bash
PUT /api/v1/schedules/{id}

curl -s -X PUT \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/schedules/sched_abc123" \
  -d '{
    "cron": "0 10 * * *",
    "timezone": "America/New_York",
    "active": true
  }'
```

### Delete a schedule
```bash
DELETE /api/v1/schedules/{id}

curl -s -X DELETE \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/schedules/sched_abc123"
```

### Activate a schedule
```bash
PUT /api/v1/schedules/{id}/activate

curl -s -X PUT \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/schedules/sched_abc123/activate"
```

### Deactivate a schedule
```bash
PUT /api/v1/schedules/{id}/deactivate

curl -s -X PUT \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/schedules/sched_abc123/deactivate"
```

---

## Runs

### List runs (with optional filters)
```bash
GET /api/v1/runs

# Query params:
# filter[status]  — COMPLETED, FAILED, EXECUTING, QUEUED, CANCELED, WAITING, REATTEMPTING
# filter[taskIdentifier] — agent-job, daemon-tick
# page[size]      — number of results (max 100, default 25)
# page[after]     — cursor for pagination

curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs?filter[status]=FAILED&page[size]=10"

curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs?filter[taskIdentifier]=agent-job&page[size]=25"
```

Response:
```json
{
  "data": [
    {
      "id": "run_abc123",
      "taskIdentifier": "agent-job",
      "status": "COMPLETED",
      "isTest": false,
      "createdAt": "2026-02-21T09:00:00.000Z",
      "startedAt": "2026-02-21T09:00:01.000Z",
      "finishedAt": "2026-02-21T09:00:43.000Z"
    }
  ],
  "pagination": { "next": null }
}
```

### Retrieve a run (full details)
```bash
GET /api/v3/runs/{id}

curl -s -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v3/runs/run_abc123"
```

Response includes: `output`, `error.message`, `error.stackTrace`, `env`, full timestamps.

### Cancel a run
```bash
POST /api/v2/runs/{id}/cancel

curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v2/runs/run_abc123/cancel"
```

Returns: `{ "id": "run_abc123" }`

### Replay a run
```bash
POST /api/v1/runs/{id}/replay

curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  "https://api.trigger.dev/api/v1/runs/run_abc123/replay"
```

Returns: `{ "id": "run_new456" }` (new run ID)

---

## Tasks

### Trigger a task manually
```bash
POST /api/v1/tasks/{taskId}/trigger

# Trigger agent-job
curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/tasks/agent-job/trigger" \
  -d '{
    "payload": {
      "jobName": "manual-run",
      "prompt": "Check if there are any urgent tasks",
      "notifyChannel": "telegram",
      "notifyChatId": "YOUR_CHAT_ID"
    }
  }'

# Trigger daemon-tick
curl -s -X POST \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.trigger.dev/api/v1/tasks/daemon-tick/trigger" \
  -d '{"payload": {}}'
```

Returns: `{ "id": "run_abc123" }`

---

## Run Status Values

| Status | Meaning |
|--------|---------|
| `QUEUED` | Waiting to start |
| `EXECUTING` | Currently running |
| `WAITING` | Waiting for subtask or trigger |
| `REATTEMPTING` | Failed, waiting to retry |
| `COMPLETED` | Finished successfully |
| `FAILED` | Failed after all retries |
| `CANCELED` | Manually canceled |

---

## agent-job Payload Fields

```typescript
{
  jobName: string;        // Required: identifier for Convex run records
  prompt?: string;        // The prompt to run (or skillName for skill execution)
  skillName?: string;     // Skill to invoke (e.g., "trigger-manager")
  parameters?: string;    // JSON string of skill parameters
  notifyChannel?: string; // "telegram" to send result back
  notifyChatId?: string;  // Telegram chat ID for notification
}
```

---

## Dashboard API Routes (internal)

The dashboard proxies Trigger.dev via these Next.js routes:

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/trigger/schedules` | List schedules |
| POST | `/api/trigger/schedules` | Create schedule |
| PUT | `/api/trigger/schedules/{id}` | Update schedule |
| DELETE | `/api/trigger/schedules/{id}` | Delete schedule |
| POST | `/api/trigger/schedules/{id}/toggle` | Activate/deactivate |
| GET | `/api/trigger/runs` | List runs |
| GET | `/api/trigger/runs/{id}` | Run details |
| POST | `/api/trigger/runs/{id}/cancel` | Cancel run |
| POST | `/api/trigger/runs/{id}/replay` | Replay run |
| POST | `/api/trigger/tasks/{id}/trigger` | Trigger task |
