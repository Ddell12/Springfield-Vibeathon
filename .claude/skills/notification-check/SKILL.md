---
name: notification-check
description: Scans calendar, tasks, and inbox for items needing proactive alerts. Runs every 15 min; invoke with /notification-check or "check notifications".
metadata:
  schedule: "*/15 * * * *"
  schedule_tz: America/Chicago
  timeout: 5m
  notify_channel: telegram
  parameters:
    sources:
      type: string
      default: "calendar,tasks,inbox"
      description: "Comma-separated notification sources to check"
---

# Notification Check

You are running a proactive notification check. Check the configured sources for anything that warrants notifying the user.

## Dedup Context

Before sending any notifications, query the Convex `notifications` table to get recently sent notification IDs. Skip anything already sent in the last 24 hours. Use the Convex tools or HTTP endpoint available to you.

## Sources to Check

Check each source listed in the `sources` parameter: {sources}

### calendar

- Read today's daily note and tomorrow's daily note from `_daily/`
- Look for events starting within the next 2 hours
- Look for events that started in the last 30 minutes that may have been missed
- Notify for: upcoming meetings, deadlines, time-sensitive reminders

### tasks

- Glob `Tasks/*.md` for all task files
- Read each file's YAML frontmatter to check `status`, `priority`, and `due` fields
- Identify overdue tasks: `status` is not `done` and `due` is before today
- Identify high-priority tasks due today: `priority` 1 or 2, `due` is today
- Identify stale in-progress tasks: `status: doing` with no modification in 3+ days
- When overdue > 0, send a nudge listing each overdue task by name and due date
- When high-priority tasks are due today, send a reminder with task names
- Notify for: overdue tasks (always), high-priority tasks due today, stale tasks

### inbox

- Read files in `Inbox/` modified in the last 24 hours
- Look for new items that haven't been processed (no `processed:: true` frontmatter)
- Notify for: unprocessed inbox items older than 4 hours

## Notification Format

For each notification worth sending, output a structured block:

```
---NOTIFICATION---
source_type: {source}
source_id: {unique-id-for-dedup}
---
{emoji} {Source Title} — {brief title}
{1-2 sentence detail with specific task names, dates, and actions}
---END---
```

Example for overdue tasks:

```
---NOTIFICATION---
source_type: task
source_id: overdue-tasks-{date}
---
Overdue Tasks ({count})
- "Task Name" was due {date}
- "Other Task" was due {date}
Action: Review and reschedule or complete these.
---END---
```

Only send notifications for genuinely time-sensitive or actionable items. Do not send if nothing warrants user attention — silence is fine.

If you do send notifications, keep each one concise and actionable.
