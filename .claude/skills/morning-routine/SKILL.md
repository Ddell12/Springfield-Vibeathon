---
name: morning-routine
description: Daily morning briefing — gathers calendar, email, tasks, goals, and strategic context, then writes a daily note and sends a Telegram summary. Scheduled 7 AM CT; invoke manually with /morning-routine.
metadata:
  schedule: "0 7 * * *"
  schedule_tz: America/Chicago
  timeout: 5m
  notify_channel: telegram
  output_path: "_daily/{date}.md"
---

# Morning Routine

You are running the daily morning routine. Today is {date}. Gather context from all sources, analyze priorities, write a daily note, and send a Telegram summary.

## Step 1: Gather Data

Collect from all available sources. If any source fails, continue with what you have.

### Calendar

- Use Composio Google Calendar tools to fetch today's events
- Note: title, start/end time, attendees, description/agenda links
- Flag meetings with multiple attendees (may need prep)

### Email

- Use Composio Gmail tools to fetch recent unread emails (last 24h, max 10)
- For each: sender, subject, 1-2 sentence summary, action needed?
- Flag time-sensitive or important-contact emails

### Vault — Tasks & Projects

- Glob `Tasks/*.md` for task files, read YAML frontmatter:
  - `status: doing` (active), due today/overdue, `priority: 1` or `2`
  - Group by project
  - Flag `needs_research` tasks and `agent_can_do` tasks
- Glob `Projects/` for recently modified files (last 3 days)
- Read yesterday's daily note `_daily/{yesterday}.md` for carryover items

### Vault — Context

- Read `_agent/context-summary.md` for current focus and goals
- Check `Inbox/` for unprocessed items

### Strategic Context

- Read `Goals/2026-Q1.md` for quarterly goals with deadlines
- Read `Goals/goal-index.md` for goal-project linkages
- Read `Business/pipeline.md` for client pipeline
- Glob `Life/*.md` for life area goals
- Skip any missing files

### Overnight Activity

- Check for tasks with `completed_by: aura` and recent dates
- Check for recently updated `research_status: done` tasks
- Note any notifications sent

## Step 2: Strategic Analysis

1. **Goal urgency**: For each goal in Goals/2026-Q1.md, calculate days to deadline, check linked project activity, assess risk (behind/on-track/ahead)
2. **Neglected areas**: Compare Life/\*.md goals against recent daily notes — flag areas with 0 activity in 7+ days
3. **Pipeline staleness**: Flag leads/proposals with no update past their `reviewInterval`
4. **Rank by urgency**: Sort goals by (deadline proximity x risk level)

### Staleness Detection

| File                        | Stale After |
| --------------------------- | ----------- |
| Goals/2026-Q1.md            | 7 days      |
| Business/pipeline.md        | 14 days     |
| Business/financials.md      | 30 days     |
| Business/agency-overview.md | 60 days     |
| Life/health.md              | 7 days      |
| Life/education.md           | 14 days     |
| Goals/goal-index.md         | 14 days     |

If `lastUpdated` + interval < today, alert the user.

## Step 3: Analyze & Prep

### Meeting Prep

- For meetings with attendees/agendas: summarize agenda, note discussion points
- For recurring 1:1s: check recent notes for relevant updates
- Draft bullet-list talking points per meeting

### Email Prep

- For action-needed emails: draft 2-3 sentence reply outline
- For threads: summarize context
- Do NOT send any emails

### Task Prioritization

- Compile prioritized list of 3-5 top actions for the day
- Priority order: overdue > due today > high priority > goal-aligned
- Consider calendar constraints

## Step 4: Write Daily Note

Create or update `_daily/{today}.md`. If file exists, prepend briefing sections.

```
---
date: {today}
briefing: true
---

# {Day of Week}, {Month} {Day}

## Schedule
- {time} — {event title} {(prep note if applicable)}
- ...

## Strategic Focus

**Primary focus: {highest urgency goal}**

- Deadline: {date} ({N} days remaining)
- Progress: {status}
- Risk: {behind/on track/ahead} — {reasoning}
- Recommendation: {specific action for today}

**Alerts:**
{neglected areas, stale files, pipeline items needing attention}

## Top Actions
1. {most important action} — {why / context}
2. {second action}
3. {third action}

## Project Progress
{active projects with completion %, stale projects flagged}

## Email Summary
### {sender}: {subject}
{summary}
**Action needed:** {yes/no — draft reply if yes}

## Meeting Prep
### {meeting title} ({time})
- {talking points}
- Context: {relevant recent work}

## Carryover from Yesterday
- {items not completed}

## Aura Activity (Overnight)
- Completed: {list}
- Prepped: {list}
- Needs attention: {blocked/user-required items}

## Notes
{leave blank for user}
```

## Step 5: Compose Telegram Summary

Concise, scannable message. Target ~1500 chars, max 3900.

```
Good morning — here's your briefing for {Day}, {Month} {Day}.

SCHEDULE
- {time} — {event}
- ...

TOP ACTIONS
1. {action} — {context}
2. ...
3. ...

PROJECTS
- {project}: {completion%} {stale flag if applicable}

EMAIL
- {sender}: {subject} — {one-line summary}

FOCUS: {goal name} — {deadline} ({N}d left, {risk})
> {recommendation}

{count} alerts (see daily note)

AURA OVERNIGHT
- Completed {N} tasks, prepped {N}
- {blocked items needing attention}

OFFERS
- I can prep {N} research tasks — reply "run task-prep"
- I can handle {N} tasks — reply "run task-executor"

Full briefing in today's daily note
```

If any source failed: `{Source} unavailable — briefing compiled without it`

## Step 6: Update Agent Tasks

Write today's recommended focus items to `_agent/tasks.md`.

## Boundaries

- NEVER send emails, Slack messages, or external communications
- NEVER modify calendar events
- NEVER create files outside `_daily/` and `Inbox/`
- If tools fail, continue with available data
