---
name: task-triage
description: >
  Audits and cleans the task backlog — "initial" mode for full deep-clean,
  "maintenance" for weekly delta review. Use when tasks feel disorganized or
  the weekly review is due. Triggers: "triage my tasks", "clean up tasks",
  "weekly review". Step 1 of the task pipeline.
argument-hint: "initial OR maintenance (default: auto-detect)"
metadata:
  timeout: 20m
  parameters:
    mode:
      type: string
      default: auto
      description: "'initial' for full deep clean, 'maintenance' for weekly delta review, 'auto' to detect"
    time_box:
      type: number
      default: 10
      description: "Max minutes for the review session"
    area:
      type: string
      default: all
      description: "Filter by area (e.g. Finance, Health) or 'all'"
---

# Task Triage

You are running a task backlog triage session. The vault is at `~/Documents/Life Management`.

## Mode Detection

Read the user's argument:

- If the argument matches `initial`, `deep clean`, or `full review`: run **Initial Mode**
- If the argument matches `maintenance`, `weekly`, `monthly`, or `review`: run **Maintenance Mode**
- If `auto` or empty: read `_agent/triage-log.md` from the vault
  - If the file doesn't exist OR the last triage date is more than 30 days ago → **Initial Mode**
  - Otherwise → **Maintenance Mode**

Announce which mode was selected and why before proceeding.

---

## Task Sources

These are the files you'll work with:

| File                        | Role                                                     |
| --------------------------- | -------------------------------------------------------- |
| `TASKS.md`                  | Master flat task list (~130 items, 13 category sections) |
| `TODO.md`                   | Duplicate active list (may diverge from TASKS.md)        |
| `_agent/tasks.md`           | Agent's task reference (another duplicate)               |
| `Tasks/*.md`                | Individual task files with YAML frontmatter              |
| `_agent/triage-log.md`      | Persistent review log (you create/update this)           |
| `_agent/triage-report-*.md` | Per-session reports (you create these)                   |

---

## Initial Mode

Full deep clean of the entire task backlog. Run all 6 phases in order.

### Phase 1: Full Audit Scan

1. Read `TASKS.md`, `TODO.md`, and `_agent/tasks.md`
2. Read all files in `Tasks/*.md` — parse YAML frontmatter and body for each
3. Build a unified registry: for each task item, note:
   - Which sources it appears in (TASKS.md line, TODO.md line, Tasks/ file, \_agent/tasks.md line)
   - Any conflicts (e.g., marked `[x]` in TASKS.md but `status: todo` in the file)
   - Status, priority, due date, area/category, last modified date
4. If the `area` parameter is set (not `all`), filter the registry to only tasks in that area
5. Present a 1-paragraph overview to the user:
   - Total unique tasks found
   - How many in each source
   - How many conflicts detected
   - How many appear completed, stale, or active

### Phase 2: Source Reconciliation

Ask the user ONE question about source of truth:

Use `AskUserQuestion`:

- Question: "TASKS.md, TODO.md, and \_agent/tasks.md have diverged. Which should be the source of truth going forward?"
- Options:
  - Label: "Tasks/ files (Recommended)"
    Description: "Individual .md files — richest metadata, one file per task"
  - Label: "TASKS.md"
    Description: "Flat master list — complete but less structured"
  - Label: "Both — TASKS.md as index, Tasks/ as detailed records"
    Description: "Keep TASKS.md as a quick-reference index that mirrors the Tasks/ files"

Based on the answer:

- Reconcile the secondary sources to match the primary
- Flag items that only exist in one source — present these as "orphaned" tasks to address in later phases
- If TODO.md and \_agent/tasks.md are reconciled away, note them for removal in Phase 6

### Phase 3: Bulk Pass — Completed Tasks

1. Identify tasks marked `[x]` in the TASKS.md Completed section or with `status: done` in frontmatter
2. Present the count: "I found N tasks that are already completed."
3. Use `AskUserQuestion`:
   - Question: "How should I handle these N completed tasks?"
   - Options:
     - Label: "Confirm all — archive them"
       Description: "Mark all as done, move to Completed section in TASKS.md"
     - Label: "Let me review each one"
       Description: "I'll show each completed task so you can confirm or reactivate"
     - Label: "Skip this batch"
       Description: "Leave completed tasks as-is for now"
4. If "review each one": show each task one at a time with `AskUserQuestion`:
   - Question: "[N/Total] Task: [title] — [source info]"
   - Options:
     - Label: "Mark done"
       Description: "Confirm completed — archive it"
     - Label: "Actually still active"
       Description: "Reactivate this task"
     - Label: "Delete entirely"
       Description: "Remove this task from all sources"

### Phase 4: Bulk Pass — Stale & Obvious Deletes

1. Identify tasks with ALL of these traits:
   - No activity/modification in 30+ days
   - No due date set
   - `horizon: later` or no horizon/priority set
2. Group these by TASKS.md category section
3. For each category batch, use `AskUserQuestion`:
   - Question: "[Category] — N stale tasks with no due date or priority. What should I do?"
   - Options:
     - Label: "Delete all"
       Description: "These aren't priorities right now — remove them"
     - Label: "Keep all"
       Description: "I'll get to these eventually — leave them"
     - Label: "Let me review each one"
       Description: "Show me each task so I can decide individually"
4. If "review each one": show each task with `AskUserQuestion`:
   - Question: "[N/Total in Category] [title] — last touched [date], [details]"
   - Options:
     - Label: "Keep"
       Description: "Leave as-is"
     - Label: "Delete"
       Description: "Remove from all sources"
     - Label: "Defer to someday"
       Description: "Move to a low-priority/someday list"
     - Label: "Still working on it"
       Description: "Mark as active and update last_touched"

### Phase 5: Guided Review — Remaining Active Tasks

1. Group remaining (non-completed, non-deleted) tasks by TASKS.md category section
2. For each task, present with context using `AskUserQuestion`:
   - Question: "[Category N/M] [title] — priority: [p], age: [days], area: [a]"
   - Options:
     - Label: "Keep as-is"
       Description: "No changes needed"
     - Label: "Update priority/due date"
       Description: "I'll ask follow-up questions about new values"
     - Label: "Mark as done"
       Description: "This is actually completed"
     - Label: "Delete"
       Description: "Remove this task"
3. If "Update priority/due date": ask follow-up `AskUserQuestion` for the new values:
   - Question: "Set priority and due date for: [title]"
   - Options:
     - Label: "High priority, due this week"
     - Label: "Medium priority, due this month"
     - Label: "Low priority, no due date"
     - Label: "Let me specify"
       Description: "I'll type custom values"

### Phase 6: Apply Changes & Report

1. **Apply all changes** accumulated from Phases 3-5:
   - Update frontmatter on task files (`status`, `priority`, `due`, `last_touched`)
   - For deleted tasks: remove the Tasks/ file and the corresponding TASKS.md line
   - For completed tasks: set `status: done`, move TASKS.md line to the Completed section
   - If "Both" was chosen in Phase 2: regenerate TASKS.md to mirror the current Tasks/ state
   - If TODO.md and \_agent/tasks.md were reconciled away: remove them (or note them as deprecated)

2. **Write triage report** to `_agent/triage-report-{date}.md`:

   ```
   # Task Triage Report — {date}
   Mode: Initial
   Area: {area or "all"}

   ## Summary
   - Total reviewed: N
   - Completed (archived): N
   - Deleted: N
   - Kept as-is: N
   - Re-prioritized: N
   - Deferred to someday: N

   ## Changes by Category
   - [Category]: N reviewed, N deleted, N completed, N updated
   ...

   ## Notes
   [Any observations about the backlog — e.g., categories that are heavily stale, areas needing attention]
   ```

3. **Write/update triage log** at `_agent/triage-log.md`:

   ```
   # Task Triage Log

   ## {date} — Initial
   - Reviewed: N | Completed: N | Deleted: N | Kept: N | Updated: N
   - Areas: {areas covered}
   - Report: [[triage-report-{date}]]
   ```

4. Present a final summary to the user with the stats and the report path.

---

## Maintenance Mode

Focused delta review since the last triage session.

### Phase 1: Delta Scan

1. Read `_agent/triage-log.md` to get the last triage date
2. Scan `Tasks/*.md` for files with modification date after last triage, or new files created since
3. Check TASKS.md for any new unchecked `[ ]` items added since last review
4. Identify newly overdue tasks (due date has passed since last triage)
5. Build a change list with categories: new, modified, overdue, completed-since-last

### Phase 2: Status Report

Present a summary:

> "Since your last review on [date]: N new tasks, N modified, N now overdue, N completed."

Use `AskUserQuestion`:

- Question: "What would you like to focus on?"
- Options:
  - Label: "New and changed tasks"
    Description: "Review the N tasks added or modified since last triage"
  - Label: "Overdue items"
    Description: "Address the N tasks that are now past due"
  - Label: "Quick re-prioritize top 5"
    Description: "Just look at the 5 highest-priority items and adjust"
  - Label: "Full status check"
    Description: "Review everything that changed"

### Phase 3: Focused Review (time-boxed)

1. Based on the user's selection, present relevant tasks one at a time using `AskUserQuestion`:
   - Question: "[N/Total] [title] — [status], [due info], [context]"
   - Options:
     - Label: "Keep as-is"
     - Label: "Update"
       Description: "Change priority, due date, or status"
     - Label: "Mark done"
     - Label: "Delete"

2. Track elapsed time. When approaching the `time_box` limit, use `AskUserQuestion`:
   - Question: "We're at X/Y minutes. Z tasks remaining. What would you like to do?"
   - Options:
     - Label: "Finish remaining"
       Description: "Keep going through the rest"
     - Label: "Save progress and stop"
       Description: "Apply changes so far and end the session"
     - Label: "Extend by 5 minutes"
       Description: "Add more time to the session"

### Phase 4: Apply & Log

1. Apply all changes from the review
2. Append a new entry to `_agent/triage-log.md`:
   ```
   ## {date} — Maintenance
   - Focus: {what they chose}
   - Reviewed: N | Completed: N | Deleted: N | Updated: N
   - Time: X minutes
   - Report: [[triage-report-{date}]]
   ```
3. Write `_agent/triage-report-{date}.md` with the session details
4. Present a final summary

---

## Key Rules

- **One question at a time.** Never batch multiple questions in one `AskUserQuestion` call.
- **Multiple choice always.** Every question uses `AskUserQuestion` with tailored options. "Other" is built in.
- **Respect the area filter.** If `area` is set, only show tasks matching that area/category throughout.
- **Preserve task metadata.** When updating files, preserve existing frontmatter fields you didn't change.
- **Batch when sensible.** Present completed/stale tasks as batches first — only drill into individual review if the user asks.
- **Show progress.** Always indicate "[N/Total]" or "[Category N/M]" so the user knows where they are.
- **Never auto-delete.** Every deletion requires explicit user confirmation, either via batch or individual review.
- **Log everything.** The triage log and report are the skill's memory — always write them at the end.
