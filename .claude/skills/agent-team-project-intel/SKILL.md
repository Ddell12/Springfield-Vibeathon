---
name: agent-team-project-intel
description: >
  Coordinates a multi-agent team to generate comprehensive project intelligence —
  architecture diagrams, data flow maps, user journeys, feature matrices, schema ERDs,
  and DevOps overviews. Outputs HTML visual explainers + Excalidraw diagrams. Works on
  any codebase. Use for: "map the codebase", "generate project diagrams", "create
  architecture docs", /team-intel.
---

# Agent Team Project Intelligence

Orchestrate a parallel agent team to produce a complete set of codebase intelligence
artifacts — visual HTML explainer pages and Excalidraw diagrams covering every
relevant dimension of the project: architecture, data flows, user journeys, features,
data model, and deployment.

**Output directory**: `project-intelligence/` at the project root.

## Artifact Inventory

The artifact plan is **dynamically generated** by the researcher in Phase 1.
The template in `references/artifact-inventory.md` defines the format and
standard categories — the researcher fills it in based on what they find.

## Workflow

### 1. Understand Scope

Determine what to generate based on the user's request:

- **Full generation**: Researcher discovers what's relevant; lead reviews artifact plan (default)
- **Category subset**: Only specific categories (e.g., "just architecture diagrams")
- **Refresh/update**: Regenerate existing artifacts with current codebase state
- **Single artifact**: One specific diagram or report

Check `project-intelligence/` for existing artifacts. If refreshing, note which
exist and instruct agents to overwrite them. If generating fresh, the directory
will be created by the first diagrammer.

### 2. Create the Agent Team

Create a team named `project-intel-{short-descriptor}` (e.g., `project-intel-myapp`).

Use `TeamCreate` to initialize the team, then spawn teammates via the `Agent` tool
with `team_name` and `name` set. Use `model: "sonnet"` for each teammate.

### 3. Team Roles

Spawn these teammates in phases:

| Teammate Name     | Domain                | Phase | subagent_type     | Focus                                                                |
| ----------------- | --------------------- | ----- | ----------------- | -------------------------------------------------------------------- |
| `researcher`      | Codebase Analysis     | 1     | `Explore`         | Deep codebase exploration; produces research report + artifact plan  |
| `arch-diagrammer` | Architecture & DevOps | 2     | `general-purpose` | System structure, module map, infra topology, deployment, CI/CD      |
| `flow-diagrammer` | Data Flows & Journeys | 2     | `general-purpose` | Request lifecycles, pipelines, background jobs, UX flows             |
| `feat-diagrammer` | Features              | 2     | `general-purpose` | Capability matrix, integration map, plugin/extension topology        |
| `db-diagrammer`   | Database & API        | 2     | `general-purpose` | Schema ER diagrams, API route maps, data model                       |
| `index-builder`   | Navigation & Index    | 3     | `general-purpose` | Master index page linking all artifacts with descriptions and search |

Not every project will need all four Phase 2 diagrammers. Omit any that the
researcher's artifact plan marks as not applicable.

### 4. Create Tasks with Dependencies

Use `TaskCreate` and `TaskUpdate` to set up the dependency chain:

```
Task 1: Deep codebase research + artifact plan -> owner: researcher
[LEAD REVIEWS ARTIFACT PLAN — adjust if needed]
Task 2: Architecture & DevOps diagrams -> owner: arch-diagrammer -> blockedBy: [1]
Task 3: Data flows & user journeys    -> owner: flow-diagrammer -> blockedBy: [1]
Task 4: Features diagrams             -> owner: feat-diagrammer -> blockedBy: [1]
Task 5: Database & API diagrams       -> owner: db-diagrammer   -> blockedBy: [1]
Task 6: Master index page             -> owner: index-builder   -> blockedBy: [2, 3, 4, 5]
Task 7: Verify all artifacts          -> owner: lead            -> blockedBy: [6]
```

Skip tasks for diagrammers whose categories produced zero artifacts in the plan.

### 5. Phase 1 — Research + Artifact Planning

Spawn `researcher` with `subagent_type: "Explore"` (read-only). They produce TWO
deliverables in a single message to the lead:

**Deliverable A — Research Report** covering:

- **Project Overview**: Name, purpose, tech stack summary, repo structure
- **Module/Slice Inventory**: Every module, package, or slice with purpose and key files
- **Entry Points & Request Flows**: Every path into the system (CLI, web, API, event, queue, etc.)
- **Data Models**: All tables/collections/models with fields, relationships, indexes
- **External Integrations**: Every third-party service, SDK, API client, plugin system
- **User-Facing Surfaces**: Routes, commands, endpoints, UI flows
- **Configuration**: Config files, environment variables, feature flags
- **Deployment & Infra**: Process managers, CI/CD, cloud services, scripts
- **Key Patterns**: Framework patterns, cross-cutting concerns, shared utilities

**Deliverable B — Proposed Artifact Plan** in the format defined in
`references/artifact-inventory.md` (the template). The researcher determines:

- Which categories are relevant for this specific codebase
- How many artifacts per category (based on actual complexity found)
- Which artifacts get Excalidraw companions (complex structure/flow diagrams warrant them)
- Filename slugs and artifact numbers
- Which diagrammer role owns each category

The researcher sends both deliverables to the lead via `SendMessage`.

### 6. Lead Reviews the Artifact Plan

After receiving the researcher's message, the lead:

1. Reviews the proposed artifact plan
2. Optionally adjusts it (add/remove artifacts, change formats, merge similar ones)
3. Sends the **finalized artifact plan** to each Phase 2 diagrammer along with the research report
4. The finalized artifact plan is the source of truth for Phase 2 and 3

For straightforward requests, the lead can accept the plan as-is without modification.

### 7. Phase 2 — Parallel Diagram Generation

Spawn all applicable diagrammers simultaneously. Each receives:

- The researcher's codebase report
- The finalized artifact plan (their specific category assignments)
- The format requirements from `references/format-guide.md`
- Instructions to invoke the appropriate skills

**Critical instruction for all diagrammers**:

Each agent MUST invoke these skills before generating artifacts:

- For **HTML visual explainers** → invoke skill: `"visual-explainer"`
- For **Excalidraw diagrams** → invoke skill: `"excalidraw:diagramming"`

These skills provide the exact format, layout, and rendering conventions.
Agents must follow them precisely — do not improvise HTML or Excalidraw formats.

**Additional requirements for all HTML pages**:

- Include a **back-to-index link** in the header: `<a href="../index.html" class="back-link">← Back to Index</a>`
- Include a **generation timestamp** in the footer: `Generated from source analysis — YYYY-MM-DD`

**File ownership**: Each diagrammer owns specific subdirectories within
`project-intelligence/`. No two agents write to the same directory. The
directory structure is determined by the artifact plan (not hardcoded).

### 8. Phase 3 — Master Index

Spawn `index-builder` after all diagrammers complete. It creates:

- `project-intelligence/index.html` — A searchable master dashboard with:
  - **Hero section**: `.hero` > `.hero-badge` (pill with SVG icon) > `h1` > `p`
  - **Stats bar**: `.stats-bar` > `.stat` chips with `.stat-dot` + `.stat-value`
  - **Quick Start**: 3 recommended starting artifacts, prominently linked
  - **Search**: `<input id="searchInput">` with live JS filtering against `data-keywords` on cards; `/` to focus, `Escape` to clear
  - **Category sections**: `.category[data-category]` > `.category-header` (SVG icon + `h2` + `.category-count`) > `.cards-grid`
  - **Cards**: `<a class="card" href="..." data-keywords="...">` > `.card-arrow` + `.card-number` + `.card-title` + `.card-desc` + `.card-tags` > `.card-tag`
  - **Footer**: `<footer class="footer">` with artifact count + generation date

The index-builder reads all generated files to build accurate links and descriptions.

### 9. Verification

Once all agents complete, the lead verifies against the **finalized artifact plan**:

1. All expected artifacts from the plan exist on disk
2. HTML files are valid and self-contained (open a sample in browser)
3. Excalidraw files are valid JSON
4. Index page links are correct
5. Back-to-index links present on all artifact pages
6. No broken references between artifacts

On failure: message the responsible agent to fix their output.

### 10. Deliver Summary

Present the generation report to the user:

```
## Project Intelligence Summary

**Project**: [project name]
**Git SHA**: [current commit]
**Generated**: [timestamp]

### Artifacts Generated

| Category     | HTML  | Excalidraw | Status   |
| ------------ | ----- | ---------- | -------- |
| Architecture | N     | N          | PASS     |
| Data Flows   | N     | N          | PASS     |
| ...          | N     | N          | PASS     |
| Index        | 1     | 0          | PASS     |
| **Total**    | **N** | **N**      | **PASS** |

### How to View

- Open `project-intelligence/index.html` in a browser for the full dashboard
- Excalidraw files can be opened at https://excalidraw.com
- All HTML files are self-contained — no server needed
```

### 11. Cleanup

Shut down all teammates via `SendMessage` with `type: "shutdown_request"`, then
call `TeamDelete` to clean up team resources.

## Teammate Spawn Prompt Templates

### Researcher

```
You are the codebase researcher on a project intelligence team. Your job is to
produce TWO deliverables that diagram-generation agents will use as their source
of truth: a comprehensive research report AND a proposed artifact plan.

**Project root**: [PROJECT_ROOT]
**Skill directory**: [SKILL_DIR]

**How to work**:

1. Read any README, CLAUDE.md, docs/, or architecture docs at the project root
2. Map every module/package/slice: purpose, key files, exports, dependencies
3. Trace all entry points and request flows end-to-end
4. Catalog all data models (database tables, schemas, types) with fields and relationships
5. List all external integrations (APIs, SDKs, plugins, services)
6. Map all user-facing surfaces (routes, commands, endpoints, UI)
7. Document deployment architecture (process managers, CI/CD, cloud services)
8. Identify key cross-cutting patterns (events, hooks, middleware, session management)
9. Read [SKILL_DIR]/references/artifact-inventory.md to understand the artifact
   plan format you need to produce
10. Produce your artifact plan: decide which categories are relevant to this project,
    how many artifacts each warrants, and which get Excalidraw companions
11. Send both deliverables to the lead via SendMessage
    (include summary: "Research report + artifact plan complete")

**Deliverable A — Research Report sections**:

- **Project Overview**: Name, purpose, tech stack, repo structure
- **Module Inventory**: [For arch-diagrammer] All modules/slices with purpose and key files
- **Entry Points & Request Flows**: [For flow-diagrammer] Every path into the system
- **Data Models**: [For db-diagrammer] All tables/models, fields, relationships, indexes
- **External Integrations**: [For feat-diagrammer] APIs, SDKs, services, plugins
- **User Surfaces**: [For flow-diagrammer] Routes, commands, endpoints, UX flows
- **Configuration**: [For arch-diagrammer] Config files, env vars, feature flags
- **Deployment**: [For arch-diagrammer] Process managers, CI/CD, cloud, scripts
- **Key Patterns**: [For all] Framework conventions, cross-cutting concerns, shared utilities
- **Dependency Map**: [For all] For each module/table, which other modules read from it and write to it
- **Known Issues**: [For all] Any bugs, TODOs, or gotchas discovered during exploration

**Deliverable B — Proposed Artifact Plan**:
Use the template format from [SKILL_DIR]/references/artifact-inventory.md.
For each artifact specify: number, title, filename slug, category, format (HTML,
HTML + Excalidraw), owning diagrammer role, and a one-line description.
Be specific to what you actually found — do not invent artifacts for systems
that don't exist in this codebase. A typical project warrants 12–20 HTML
artifacts and 5–10 Excalidraw companions. Scale to actual complexity.
```

### Architecture & DevOps Diagrammer

```
You are the architecture & DevOps diagrammer on a project intelligence team.
You create visual diagrams showing system structure and deployment architecture.

**Project root**: [PROJECT_ROOT]
**Research report**: [PASTE RESEARCH REPORT]
**Your artifact assignments**: [PASTE YOUR CATEGORY SECTIONS FROM FINALIZED ARTIFACT PLAN]
**Format conventions**: Read [SKILL_DIR]/references/format-guide.md for CSS
palettes (use "GitHub Dark" for architecture/, "Deep Black" for devops/),
back-to-index links, timestamps, and quality checklist.

**IMPORTANT — Invoke these skills before creating any artifacts**:

- Invoke skill: "visual-explainer" — follow it for ALL HTML pages
- Invoke skill: "excalidraw:diagramming" — follow it for ALL Excalidraw files

**Your output directories** (you may ONLY write here):

- project-intelligence/architecture/ (per artifact plan)
- project-intelligence/devops/ (per artifact plan)

**How to work**:

1. Invoke both skills listed above
2. Read the format guide for CSS palette and conventions
3. Read the research report — focus on module inventory, configuration, deployment sections
4. Read source files as needed to verify details (imports, wiring, config files)
5. For each artifact in your assignment:
   a. Create the HTML visual explainer (self-contained, interactive where possible)
   b. Create the matching Excalidraw diagram where specified in the artifact plan
6. Every HTML page MUST include:
   - A back-to-index link: <a href="../index.html" class="back-link">← Back to Index</a>
   - A generation timestamp in the footer
   - Cross-references to related artifacts by number (e.g., "See #04")
   - Every `<div class="path">` must be a clickable `<a>` link with vscode:// and GitHub URLs
   - Every card/node with a source reference must include `data-file="relative/path.ts"` attribute
   - Every function reference must include `data-fn="functionName"` attribute
   - Each major section must have a freshness div with data-source-files, data-verified, data-commit
   - Architecture artifacts must include `<details class="impact-map">` sections
   - Architecture artifacts must include `<details class="recipe">` sections
7. Use consistent color coding across all your diagrams:
   - Core infrastructure: blue
   - Feature modules: green
   - External services: orange
   - Data stores: purple
   - User interfaces: teal
8. Ensure all HTML pages are self-contained (inline CSS/JS, no external deps)
9. When done, send completion message to lead via SendMessage
   (include summary: "Architecture & DevOps diagrams complete: N files")

**Strict rule**: Only write to your assigned directories.
```

### Data Flows & User Journeys Diagrammer

```
You are the data flow & user journey diagrammer on a project intelligence team.
You create visual diagrams showing how data moves through the system and how
users interact with it.

**Project root**: [PROJECT_ROOT]
**Research report**: [PASTE RESEARCH REPORT]
**Your artifact assignments**: [PASTE YOUR CATEGORY SECTIONS FROM FINALIZED ARTIFACT PLAN]
**Format conventions**: Read [SKILL_DIR]/references/format-guide.md for CSS
palettes (use "GitHub Dark" for data-flows/, "Deep Black" for user-journeys/),
back-to-index links, timestamps, and quality checklist.

**IMPORTANT — Invoke these skills before creating any artifacts**:

- Invoke skill: "visual-explainer" — follow it for ALL HTML pages
- Invoke skill: "excalidraw:diagramming" — follow it for ALL Excalidraw files

**Your output directories** (you may ONLY write here):

- project-intelligence/data-flows/ (per artifact plan)
- project-intelligence/user-journeys/ (per artifact plan)

**How to work**:

1. Invoke both skills listed above
2. Read the format guide for CSS palette and conventions
3. Read the research report — focus on entry points, request flows, user surfaces
4. Trace actual code paths by reading source files directly:
   - Follow a request from entry point to response
   - Follow data through any background processing pipelines
   - Follow a user action from trigger to visible outcome
5. For each artifact in your assignment:
   a. Create the HTML visual explainer with step-by-step flow visualization
   b. Create the matching Excalidraw diagram where specified in the artifact plan
6. Every HTML page MUST include:
   - A back-to-index link: <a href="../index.html" class="back-link">← Back to Index</a>
   - A generation timestamp in the footer
   - Cross-references to related artifacts by number (e.g., "See #04")
   - Every `<div class="path">` must be a clickable `<a>` link with vscode:// and GitHub URLs
   - Every card/node with a source reference must include `data-file="relative/path.ts"` attribute
   - Every function reference must include `data-fn="functionName"` attribute
   - Each major section must have a freshness div with data-source-files, data-verified, data-commit
   - Pipeline artifacts must include `<details class="impact-map">` sections
   - Pipeline artifacts must include `<details class="recipe">` sections
7. Use numbered steps in flow diagrams to show sequence; add `data-step` and `data-step-fn` attributes to pipeline step elements
8. User journey diagrams should show: trigger → screens/states → outcomes
9. When done, send completion message to lead via SendMessage
   (include summary: "Data flows & journeys complete: N files")

**Strict rule**: Only write to your assigned directories.
```

### Features Diagrammer

```
You are the features diagrammer on a project intelligence team.
You create visual maps showing what the system can do and what external services
it connects to.

**Project root**: [PROJECT_ROOT]
**Research report**: [PASTE RESEARCH REPORT]
**Your artifact assignments**: [PASTE YOUR CATEGORY SECTIONS FROM FINALIZED ARTIFACT PLAN]
**Format conventions**: Read [SKILL_DIR]/references/format-guide.md for CSS
palette (use "Deep Black"), back-to-index links, timestamps, and quality checklist.

**IMPORTANT — Invoke this skill before creating any artifacts**:

- Invoke skill: "visual-explainer" — follow it for ALL HTML pages

**Your output directory** (you may ONLY write here):

- project-intelligence/features/ (per artifact plan)

**How to work**:

1. Invoke the visual-explainer skill
2. Read the format guide for CSS palette and conventions
3. Read the research report — focus on external integrations and capabilities
4. Read relevant source files to verify integration details
5. For capability matrix artifacts: catalog every feature with status
   (active, planned, experimental, deprecated). Add `data-capability` and `data-value`
   (yes/partial/no) attributes to matrix cells, and `data-source-path` to each feature row.
6. For integration map artifacts: show every external service, how it connects,
   what it provides, authentication method
7. For plugin/extension topology artifacts: show all plugins or extension points,
   their tools, and how they wire into the core system. Include a reverse dependency
   table showing which features/modules depend on each integration.
8. Every HTML page MUST include:
   - A back-to-index link: <a href="../index.html" class="back-link">← Back to Index</a>
   - A generation timestamp in the footer
   - Cross-references to related artifacts by number (e.g., "See #04")
   - Every `<div class="path">` must be a clickable `<a>` link with vscode:// and GitHub URLs
   - Every card/node with a source reference must include `data-file="relative/path.ts"` attribute
   - Every function reference must include `data-fn="functionName"` attribute
   - Each major section must have a freshness div with data-source-files, data-verified, data-commit
9. When done, send completion message to lead via SendMessage
   (include summary: "Features diagrams complete: N files")

**Strict rule**: Only write to project-intelligence/features/.
```

### Database & API Diagrammer

```
You are the database & schema diagrammer on a project intelligence team.
You create visual diagrams showing the data layer — schemas, relationships,
indexes, and API surface.

**Project root**: [PROJECT_ROOT]
**Research report**: [PASTE RESEARCH REPORT]
**Your artifact assignments**: [PASTE YOUR CATEGORY SECTIONS FROM FINALIZED ARTIFACT PLAN]
**Format conventions**: Read [SKILL_DIR]/references/format-guide.md for CSS
palette (use "Deep Black"), back-to-index links, timestamps, and quality checklist.

**IMPORTANT — Invoke these skills before creating any artifacts**:

- Invoke skill: "visual-explainer" — follow it for ALL HTML pages
- Invoke skill: "excalidraw:diagramming" — follow it for ALL Excalidraw files

**Your output directory** (you may ONLY write here):

- project-intelligence/database/ (per artifact plan)

**How to work**:

1. Invoke both skills listed above
2. Read the format guide for CSS palette and conventions
3. Read the research report — focus on data models section
4. Read schema definition files directly (e.g., schema.ts, models.py, schema.prisma,
   schema.sql — whatever applies to this project) to get exact table/model definitions
5. Read API route files directly to catalog endpoints
6. For ER diagrams: show all tables/models with fields, types, and relationships
   (foreign keys, references). Highlight indexes. Group by domain/module.
   - Add `data-table="tableName"` to every table/entity card
   - Add `data-written-by="module1,module2"` listing modules that write to the table
   - Add `data-read-by="module1,module2"` listing modules that read from the table
   - Enum fields must list all possible values inline
   - Object/nested fields must show their full nested shape (not just "object")
7. For API route maps: catalog routes with methods and purposes.
   Show request/response shapes where significant.
8. Every HTML page MUST include:
   - A back-to-index link: <a href="../index.html" class="back-link">← Back to Index</a>
   - A generation timestamp in the footer
   - Cross-references to related artifacts by number
   - Every `<div class="path">` must be a clickable `<a>` link with vscode:// and GitHub URLs
   - Every card/node with a source reference must include `data-file="relative/path.ts"` attribute
   - Every function reference must include `data-fn="functionName"` attribute
   - Each major section must have a freshness div with data-source-files, data-verified, data-commit
9. When done, send completion message to lead via SendMessage
   (include summary: "Database & API diagrams complete: N files")

**Strict rule**: Only write to project-intelligence/database/.
```

### Index Builder

```
You are the index builder on a project intelligence team. You create the master
navigation page that ties all artifacts together into a browsable dashboard.

**Project root**: [PROJECT_ROOT]
**Finalized artifact plan**: [PASTE FINALIZED ARTIFACT PLAN]
**Format conventions**: Read [SKILL_DIR]/references/format-guide.md for the
"Index Page Structure" section — follow it precisely for layout and conventions.

**IMPORTANT — Invoke this skill before creating the index**:

- Invoke skill: "visual-explainer" — follow it for the HTML page

**Your output** (you may ONLY write here):

- project-intelligence/index.html

**How to work**:

1. Invoke the visual-explainer skill
2. Read the format guide, especially the "Index Page Structure" and "Manifest Format" sections
3. Read all files in project-intelligence/ subdirectories to catalog what exists
   and verify actual filenames match the artifact plan
4. Create index.html using the Deep Black palette with this exact structure:
   - **Hero**: `.hero` > `.hero-badge` (pill with SVG icon + "PROJECT INTELLIGENCE") > `h1` > `p`
   - **Stats bar**: `.stats-bar` > `.stat` chips with `.stat-dot` + `.stat-value`
     (total artifacts, HTML count, Excalidraw count, categories)
   - **Known Issues Banner** (if any known issues found in research): a `.known-issue` div
     near the top of the page listing any open bugs or gotchas from the research report
   - **Quick Start**: 3 recommended starting artifacts, prominently linked
   - **How To quick links**: Per-category `<details class="recipe">` sections with
     step-by-step guides for common tasks (e.g., "How to add a new feature slice",
     "How to trace a request", "How to update the schema")
   - **Search**: `<input id="searchInput">` with live JS filtering cards by title + desc +
     `data-keywords` + number. Keyboard: `/` to focus, `Escape` to clear
   - **Stale filter toggle**: A button that, when active, hides cards whose linked artifact
     has a `data-verified` date older than 30 days. Implement with JS toggling a
     `filter-stale` class on the body; use `.stale-badge` to flag stale cards.
   - **Category sections**: `.category[data-category]` > `.category-header`
     (SVG icon + `h2` + `.category-count`) > `.cards-grid`
   - **Cards**: `<a class="card" href="..." data-keywords="...">` > `.card-arrow` +
     `.card-number` + `.card-title` + `.card-desc` + `.card-tags` > `.card-tag`
   - **Footer**: `<footer class="footer">` with artifact count + generation date
5. Use the project's actual name in the `h1` hero heading
6. Use consistent styling from the format guide (Deep Black palette, ambient gradient)
7. Generate `manifest.json` alongside index.html — it must include every HTML artifact
   with id, category, title, file path, sourceFiles, keywords, and covers fields
   (see "Manifest Format" in format-guide.md for the full schema)
8. When done, send completion message to lead via SendMessage
   (include summary: "Master index page complete")

**Strict rule**: Only write to project-intelligence/index.html and project-intelligence/manifest.json.
```

## Partial Generation

If the user requests only specific categories, skip the irrelevant diagrammer
agents. The researcher still runs (Phase 1) but focuses on the relevant sections.
The artifact plan only covers the requested categories. Adjust the task
dependency chain accordingly.

For single-artifact requests, skip the team entirely — invoke the relevant skill
(`visual-explainer` or `excalidraw:diagramming`) directly.

## Refresh Mode

When `project-intelligence/` already has artifacts and the user wants to refresh:

1. Run the researcher to capture current codebase state and produce an updated artifact plan
2. Lead reviews whether the artifact plan has changed (new categories, removed ones)
3. Spawn diagrammers with instruction to **overwrite** existing files
4. Rebuild the index to reflect any new or removed artifacts
5. Note in the summary what changed vs. the previous generation

## References

- **Artifact inventory template**: `references/artifact-inventory.md` — Format guide
  for the researcher's dynamic artifact plan output. Shows expected structure and
  categories with examples.
- **Format guide**: `references/format-guide.md` — Conventions for HTML and Excalidraw
  output (CSS palettes, layout, back-to-index links, timestamps, quality checklist).
