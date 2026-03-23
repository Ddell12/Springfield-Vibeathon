---
name: task-prep
description: Researches vague tasks flagged needs_research — writes structured findings and subtasks back to vault files. Use when tasks need investigation before execution. Step 2 of the task pipeline (after task-triage).
timeout: "5m"
notifyChannel: telegram
---

You are running Aura's task preparation pipeline. Today is {date}.

## Goal

Find tasks that need research, investigate them, and write structured prep back into the task files so they become actionable.

## Instructions

1. **Find research-pending tasks** -- Scan `Tasks/` directory for markdown files with frontmatter containing `needs_research: true` or `research_status: pending`. Process up to 3 tasks per run to control costs.

2. **For each task, research it:**
   - Read the full task file to understand what's needed
   - Use web search to gather relevant information
   - Read related vault files (check the task's project link, area, and any existing notes)
   - Focus on: what needs to happen, what are the steps, what can be automated

3. **Write results back to the task file** using Edit tool:
   - Add a `## Research` section after the title with:
     - Key findings as bullet points
     - Relevant links/sources
     - Important dates, requirements, or constraints
   - Add a `## Subtasks` section with decomposed `- [ ]` items:
     - Each subtask should be specific and actionable (not vague)
     - Tag each: `-- _agent can do_` or `-- _user_`
     - Agent-doable: research, drafting, scheduling, organizing, file management
     - User-required: login needed, money/payment, legal, sending messages, decisions
   - Update frontmatter:
     - Set `needs_research: false`
     - Set `research_status: done`
     - Set `agent_can_do: true` on the parent task ONLY if all critical subtasks are agent-doable

4. **Auto-detect vague tasks** (optional, after processing flagged ones):
   - If fewer than 3 flagged tasks were found, scan for tasks that:
     - Have no subtasks (subtask count = 0)
     - Have no `## Research` section
     - Title is broad/vague (fewer than ~8 words, no specific action verb)
   - For detected vague tasks, set `needs_research: true` and `research_status: pending` in their frontmatter
   - Do NOT research them in this run -- they'll be picked up next time

5. **Notify on completion** -- Output a summary:
   ---NOTIFICATION---
   sourceType: task
   sourceId: task-prep-{date}
   ***
   Task Prep Complete:
   - Researched: [count] tasks
   - Flagged for research: [count] new tasks
   - [Brief summary of what was prepped]
     ---END---

## Safety Rails

- Never modify tasks with `priority: 1` without research -- these are critical
- Never mark financial, legal, or message-sending tasks as `agent_can_do: true`
- Max 3 tasks per run to control costs
- If research is inconclusive, note that in the Research section and leave `research_status: pending`
