# Background Jobs & Crons

<!--
MVP FOCUS: Async work that doesn't happen in the request/response cycle.
Convex handles this natively — scheduled functions + cron jobs.
No external job queue (Bull, Inngest, Trigger.dev) needed for MVP.
Skip this artifact if the app has no async work.
-->

## Scheduled Functions

<!-- One-off async tasks triggered by user actions or system events -->

### {job_name}
- **What it does**: {plain language}
- **Trigger**: {user action / webhook / another scheduled function}
- **Convex function**: `internal.{module}.{function}` (action or mutation)
- **Scheduling**: `ctx.scheduler.runAfter({delay_ms}, internal.{module}.{function}, {args})`
- **Expected duration**: {<1s / <10s / <1min / <10min}
- **Timeout handling**: {Convex actions timeout at 10min; break into chunks if longer}

| Input | Output | Side Effects |
|---|---|---|
| {jobId, userId, ...} | {Updates Convex table with result} | {Calls external API / sends email / etc.} |

**Error handling**: {retry N times / mark as failed / notify user}

---

## Cron Jobs

<!-- Recurring scheduled tasks. Defined in convex/crons.ts -->

### {cron_name}
- **What it does**: {plain language}
- **Schedule**: {hourly / daily / "0 6 * * *" (6am daily) / interval("1 hour")}
- **Convex function**: `internal.{module}.{function}`
- **Typical runtime**: {<1s / <10s / <1min}

---

## Convex Crons Configuration

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "{job description}",
  { hours: 1 }, // or { minutes: 30 }, etc.
  internal.{module}.{function},
);

// OR cron syntax:
crons.cron(
  "{job description}",
  "0 6 * * *", // daily at 6am UTC
  internal.{module}.{function},
);

export default crons;
```

---

## Job Inventory

### User-Triggered (Scheduled Functions)

| Job | Trigger | Function Type | Duration | Retry? |
|---|---|---|---|---|
| {AI processing} | {User submits form} | Action (calls external API) | {<30s} | {Yes, 2x} |
| {File processing} | {User uploads file} | Action | {<1min} | {Yes, 1x} |
| {Send welcome email} | {Clerk webhook → user created} | Action (calls Resend) | {<5s} | {Yes, 3x} |

### System-Triggered (Cron Jobs)

| Job | Schedule | Function Type | Duration | Purpose |
|---|---|---|---|---|
| {Cleanup expired sessions} | {Daily 2am UTC} | Mutation | {<10s} | {Delete old records} |
| {Usage reset} | {Monthly 1st, midnight} | Mutation | {<10s} | {Reset free tier counters} |
| {Check trial expiring} | {Daily 6am UTC} | Action | {<30s} | {Email users 3 days before trial ends} |
| {Stale data cleanup} | {Weekly Sunday 3am} | Mutation | {<30s} | {Archive/delete old records} |

---

## Job Status Tracking (if user-facing)

<!-- If users need to see job progress (e.g., AI processing) -->

```typescript
// jobs table in schema
jobs: defineTable({
  userId: v.id("users"),
  type: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  input: v.any(), // or specific shape
  result: v.optional(v.any()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
}).index("by_user_status", ["userId", "status"]),
```

**Client sees status via `useQuery`** — reactive, no polling needed.

---

## Retry Strategy

| Scenario | Approach |
|---|---|
| External API timeout | Schedule retry with exponential backoff: `ctx.scheduler.runAfter(delay * attempt)` |
| External API rate limit | Schedule retry after rate limit window (check `Retry-After` header) |
| Convex action timeout (10min) | Break into smaller chunks; each chunk schedules the next |
| Permanent failure | Mark job as `failed`, notify user (in-app or email) |
| Max retries exceeded | Mark as `failed` with `maxRetriesExceeded`, surface to admin |

**Max retries**: {3 for API calls / 1 for user-triggered / 5 for system crons}

---

## Convex-Specific Considerations

| Topic | Decision |
|---|---|
| Action vs Mutation | Actions for external API calls; mutations for DB-only operations |
| Internal functions | All scheduled functions should be `internalAction` / `internalMutation` (not callable from client) |
| Chaining | Action calls mutation to save result; mutation can schedule next action |
| Idempotency | {Use job ID to prevent duplicate processing if retried} |
| Cancellation | {Store `scheduledFunctionId` from `ctx.scheduler.runAfter()` to cancel later} |

---

## Open Questions

- {question}

`[POST-MVP]`: {job dashboard/admin UI, dead letter queue, job priority levels, rate limiting per user, batch processing, long-running workflow orchestration}
