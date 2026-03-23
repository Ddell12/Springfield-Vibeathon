---
name: context-discovery
description: >
  Interviews you to populate structured vault context files (Goals/, Business/,
  Life/) by extracting existing data and asking gap-filling questions. Run once
  initially, then re-run to refresh. Pass "business", "goals", or "life" to focus.
argument-hint: "Optional: 'business', 'goals', or 'life' to focus on one domain"
metadata:
  timeout: 15m
---

You are running the context-discovery skill. Your job is to populate
structured context files in the vault so Aura can reason strategically.

## Phase 1: Pre-Extract Existing Knowledge

Read these files to gather what you already know:

1. Read `_agent/user-profile.md` — extract business info, financial snapshot, goals
2. Read `_agent/MEMORY.md` — extract confirmed decisions, business state
3. Read `_agent/context-summary.md` — current condensed context
4. Use `Glob` on `Projects/**/*.md` to find active projects
5. Read recent daily notes (`_daily/` last 3 days) for current focus areas
6. Use `memory view /goals` to check existing goals in Convex

Compile what you found into a working draft per domain (business, goals, life).

## Phase 2: Confirm & Fill Gaps

Present your findings domain by domain. For each domain:

1. Show a summary: "Here's what I know about [domain]: [bullet points]"
2. Ask "Is this accurate? Anything to correct?"
3. Then ask targeted questions ONE AT A TIME to fill gaps:

### Business Questions (ask only what's missing)

- What services does your agency offer?
- What's your positioning / ideal client profile?
- What tech stack do you build with?
- What's your revenue model (project-based, retainer, hourly)?
- Current MRR and MRR target?
- Who's in your client pipeline right now (leads, proposals, active)?
- Any competitors or market context?

### Goals Questions (ask only what's missing)

- What are your top 3 goals for this quarter?
- For each: what does "done" look like? What's the deadline?
- What KPIs or metrics track progress?
- Any annual themes or vision-level goals?

### Life Questions (ask only what's missing)

- What are your health/fitness goals?
- Any active courses or education goals?
- Key relationships to maintain (professional or personal)?
- Personal finance targets (net worth, debt payoff, savings)?

Use `AskUserQuestion` with multiple choice options whenever possible.
Skip questions where the pre-extracted data is already sufficient.
Target ~15 questions total across all domains, fewer if data already exists.

## Phase 3: Write Vault Files

After each domain is confirmed, immediately write the corresponding vault file(s).

### File Schema

Every strategic context file uses this frontmatter:

```yaml
---
type: strategic-context
domain: business | goals | life
lastUpdated: { today's date YYYY-MM-DD }
reviewInterval: { see table below }
---
```

Review intervals:

- `Goals/2026-Q1.md`: 7d
- `Goals/annual-2026.md`: 30d
- `Goals/goal-index.md`: 14d
- `Business/agency-overview.md`: 60d
- `Business/pipeline.md`: 14d
- `Business/financials.md`: 30d
- `Life/health.md`: 7d
- `Life/education.md`: 14d
- `Life/relationships.md`: 30d
- `Life/finances-personal.md`: 30d

### Goal Format

Use this exact pattern for goals (enables automated parsing):

```markdown
## Goal: {Goal Name}

- **Status:** {Not Started | In Progress | Blocked | Completed}
- **Deadline:** {YYYY-MM-DD}
- **KPIs:** {comma-separated success metrics}
- **Linked Projects:** {vault paths to related project files}
- **Next Actions:** {concrete next steps}
- **Progress Notes:** {optional, freeform}
```

### Files to Create

| Path                          | Content                                           |
| ----------------------------- | ------------------------------------------------- |
| `Goals/annual-2026.md`        | Annual vision, themes, success criteria           |
| `Goals/2026-Q1.md`            | Quarterly goals with deadlines, KPIs, status      |
| `Goals/goal-index.md`         | Registry linking goals → projects → tasks         |
| `Business/agency-overview.md` | Mission, services, positioning, tech stack        |
| `Business/pipeline.md`        | Client pipeline: leads, proposals, active clients |
| `Business/financials.md`      | Revenue, expenses, MRR, targets                   |
| `Life/health.md`              | Health goals, habits                              |
| `Life/education.md`           | Courses, certifications, learning goals           |
| `Life/relationships.md`       | Key people, follow-up cadence                     |
| `Life/finances-personal.md`   | Personal finances, net worth, budget targets      |

Create directories first if they don't exist.
Only create files for domains where you have data.

## Phase 4: Generate Goal Index

After writing all files, create `Goals/goal-index.md` that cross-references:

1. Each goal from `Goals/2026-Q1.md`
2. Its linked project files (from `Projects/`)
3. Related tasks (from `Tasks/`)

Format:

```markdown
## Goal: {name}

- **Source:** Goals/2026-Q1.md
- **Projects:** Projects/Agency/website.md, Projects/Agency/branding.md
- **Open Tasks:** Tasks/design-homepage.md, Tasks/deploy-website.md
- **Status:** In Progress
```

## Phase 5: Confirm & Wrap Up

1. Show a final summary of all files created/updated
2. Tell the user: "Your strategic context is now set up. The morning briefing will use this to give you goal-aware recommendations."
3. Context summary will auto-regenerate on next conversation start.

## Key Rules

- ONE question at a time. Never ask multiple questions in one message.
- Pre-extract BEFORE asking. Don't ask what you already know.
- Write incrementally. Don't wait until the end to write files.
- Respect the file schema exactly — other code parses it.
- If the user says "skip" for a domain, skip it entirely.
