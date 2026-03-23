---
name: project-xray
description: Generate a single interactive HTML page that visualizes everything about a codebase — architecture, data models, feature slices, gaps, and prioritized next actions. Use when the user asks to understand a project, analyze a codebase, see what's been done vs what's missing, find what to work on next, or wants a project overview/map/diagram. Also use when starting work on an unfamiliar repo. Invoked via `/project-xray` or `/project-xray ~/path/to/repo`.
---

# Project X-Ray

Scan a codebase and generate a single self-contained HTML page with 6 progressive-disclosure layers. CLI tools handle data collection; AI handles architecture mapping and gap detection.

## Workflow

### Phase 1: Collect (~15 seconds)

Run all collectors in parallel:

```bash
SKILL_DIR="path/to/this/skill"
TARGET="${ARGUMENTS:-$(pwd)}"
bash "$SKILL_DIR/scripts/collect-all.sh" "$TARGET" "$TARGET/.xray"
```

This produces in `.xray/`:

- `metrics.json` — LOC, languages, comment ratios (cloc)
- `deps.json` — module dependency graph (dependency-cruiser)
- `deps-mermaid.md` — dependency Mermaid diagram
- `git-intel.json` — staleness, hotspots, churn, TODO count
- `structure.json` — code structure via Tree-sitter (repomix --compress)
- `slice-detail-{name}.json` — per-slice detail data (files, tests, exports, git history, TODOs, deps, bus events, MCP tools, schema tables, dashboard routes)

Read all generated JSON files. If a collector failed, proceed with available data.

### Phase 2: Analyze (~60-90 seconds)

Read `./references/vsa-patterns.md` for VSA detection heuristics.

**Step 2a: Architecture + Data Model**

Using collected data + selective file reads (Glob, Grep, Read):

1. Identify project type (Next.js, FastAPI, Express, etc.) from package.json/pyproject.toml
2. Detect VSA zones: core/, shared/, feature slices per vsa-patterns.md
3. Assess each feature slice: complete / partial / stub / missing
4. Find schema definitions (Convex schema.ts, Prisma, SQLAlchemy, Zod)
5. Generate Mermaid diagrams:
   - C4 Level 1 (system context) + Level 2 (slice map) — use templates from vsa-patterns.md
   - ER diagram from detected schemas
   - Color-code by status (green=complete, amber=partial, red=stub, gray=missing)

**Step 2b: Gap Analysis**

Read `./references/gap-heuristics.md` for detection rules.

1. Check slice completeness against VSA criteria
2. Detect violations: cross-slice imports, fat core, premature shared
3. Flag stale files (90+ days from git-intel.json)
4. Count test gaps per slice
5. Tally TODO/FIXME accumulation
6. Generate prioritized action list (critical → high → medium → low)

**Step 2c: Per-Slice Detail Analysis**

For each slice, using `slice-detail-{name}.json` + selective file reads (Read the slice's README.md if it exists, key source files for understanding data flow):

1. **Purpose & Boundaries** — Write 2-3 sentences from: slice README.md (if exists), barrel exports, file names, existing one-line description from Step 2a. State what the slice owns AND what it does NOT do (boundaries).
2. **Data Flow Diagram** — Generate a Mermaid flowchart per slice showing: inputs (bus events subscribed, API calls received, user actions) → internal processing nodes (key functions/files) → outputs (mutations, events emitted, side effects). Use `graph LR` orientation.
3. **Conditional section flags** — Determine which optional sections apply for this slice:
   - **Data Models**: include if `schemaTables[]` is non-empty
   - **Integration Points**: include if `busEvents`, `mcpTools`, or `dashboardRoutes` are non-empty
   - **User Journey**: include if `dashboardRoutes[]` is non-empty or slice contains UI components (`.tsx` files)
   - **TODOs & Known Issues**: include if `todos[]` is non-empty
4. **Agent Context Block** — Build a structured, copy-ready text block per slice combining: purpose, key files (path + description + LOC), public API (exports from barrel), data models (tables + fields + indexes), integration points (bus events, MCP tools, API endpoints), test files, and dependency graph. Format as a plain-text block suitable for pasting into an AI agent's context window.

### Phase 3: Generate HTML

Invoke the `visual-explainer` skill before writing HTML — follow its aesthetic guidelines, anti-slop rules, and Mermaid theming conventions.

**Output:** `{TARGET}/.xray/{project-name}-xray.html`

Save the generated HTML into the project's `.xray/` directory alongside the collected JSON data. This keeps the X-Ray report colocated with the codebase it describes.

The page has 6 tabs (keyboard navigable with keys 1-6):

| Tab             | Content                                                                                                                                                                                                                                                                                         | Data Source                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1. Brief        | Name, purpose, stack badges, KPI cards (incl. Outdated Deps if >0), hot files strip (top 3 from git-intel hotspots, shown if 10+ changes in 30d), recent commits table (last 5), LOC distribution, health score. Test Files KPI shows trend arrow (↑/↓/→) when previous generation data exists. | metrics.json + package.json + git-intel.json recent_commits |
| 2. Architecture | C4 L1+L2 Mermaid, slice map with status colors                                                                                                                                                                                                                                                  | Phase 2a analysis                                           |
| 3. Data Model   | Domain table-count bar chart + collapsible field inventory                                                                                                                                                                                                                                      | Phase 2a schema extraction                                  |
| 4. Slices       | Per-slice cards (clickable → detail view: purpose, key files, public API, data models, data flow diagram, dependencies, integration points, user journey, tests, git history, TODOs, agent context block with copy button)                                                                      | All JSON + slice-detail-\*.json + Phase 2c                  |
| 5. Gaps         | VSA violations, stale areas, test gaps, missing features                                                                                                                                                                                                                                        | Phase 2b analysis                                           |
| 6. Actions      | Prioritized next steps with Agent/Human badge + complexity tier + file paths                                                                                                                                                                                                                    | Phase 2b gap list                                           |

**Mermaid:** Use CDN (`https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js`). Theme with `base` + custom `themeVariables`. Add zoom controls to every `.mermaid-wrap`.

#### Mermaid Pitfalls

1. **Hidden tab rendering:** Always use `startOnLoad: false` + lazy `mermaid.run({ nodes })` on tab activation. Track rendered panels in a `Set` to avoid re-rendering — Mermaid crashes if you run it twice on the same `<pre>`.
2. **Reserved words in ER diagrams:** Mermaid v11+ reserves `key`, `order`, `type`, `comment` etc. as column names in ER syntax. Use prefixed names (e.g., `sessionKey` not `key`, `itemType` not `type`).
3. **Zoom handler safety:** Always null-guard `querySelector(".mermaid")` results in zoom/pan handlers — Mermaid replaces `<pre>` tags with `<svg>`, and timing matters during lazy render.
4. **SVG accessibility:** Add `role="img"`, `aria-label`, and `<title>` to any inline SVG (health ring, custom charts).
5. **Prefer event listeners:** Use `addEventListener` in the script block instead of inline `onclick` attributes on zoom buttons. This avoids CSP issues and is easier to debug.
6. **Loading indicators:** Add a CSS-only spinner or "Rendering diagram..." text inside each `.mermaid-wrap`, removed after `mermaid.run()` completes.
7. **ER diagrams at scale:** ER diagrams with 50+ tables are unreadable — use a horizontal bar chart for domain-level overview and collapsible tables for detail.

#### Slice Detail Views

The Slices tab (Tab 4) supports clickable cards that open full-width detail views via view replacement (not modals — detail content is too rich for overlays).

**3a. Slice Card Changes:**

Each `.slice-card` must have:

- `data-slice="{name}"` attribute
- `cursor: pointer`, `role="button"`, `tabindex="0"`
- Click handler → `showSliceDetail(name)`

**3b. Detail View Container:**

Inside `#tab-slices`, after `.slice-grid`, add `<div id="slice-detail" style="display:none">`. This container holds one `<div class="slice-detail-content" data-slice="{name}">` per slice (all hidden initially).

**3c. Section order per slice detail (13 sections, 4 conditional):**

| #   | Section              | Conditional?                                          |
| --- | -------------------- | ----------------------------------------------------- |
| 1   | Header + KPI strip   | No — name, status, files, LOC, tests, last modified   |
| 2   | Purpose & Boundaries | No — 2-3 sentences from Step 2c                       |
| 3   | Key Files            | No — table: filename, LOC, description, last modified |
| 4   | Public API           | No — exports from barrel, mono-font list              |
| 5   | Data Models          | Yes — only if slice owns/touches DB tables            |
| 6   | Data Flow Diagram    | No — Mermaid flowchart from Step 2c                   |
| 7   | Dependencies         | No — two-column: outbound imports / inbound consumers |
| 8   | Integration Points   | Yes — bus events, MCP tools, API endpoints, webhooks  |
| 9   | User Journey         | Yes — only if slice has UI routes                     |
| 10  | Test Coverage        | No — test files, coverage ratio, gaps highlighted     |
| 11  | Recent Activity      | No — last 5 git commits touching this slice           |
| 12  | TODOs & Known Issues | Yes — only if TODO/FIXME exist in slice               |
| 13  | Agent Context Block  | No — pre-formatted copy-ready block with COPY button  |

**3d. CSS patterns (reference, not literal):**

- `.slice-detail` / `.slice-detail.active` — `display:none` / `display:block` toggle
- `.slice-breadcrumb` — flex row with back arrow `←`, separator `/`, current slice name. Uses `cursor:pointer` on the back link. Style: `font-size: 14px; color: var(--text-dim); margin-bottom: 16px`
- `.detail-sec` — section headers: mono font, uppercase, small font, accent-color left border or bottom border, `margin-top: 24px`
- `.agent-context` — recessed background (`var(--surface)` or slightly darker), mono font, `pre-wrap`, `max-height: 600px; overflow-y: auto`
- `.agent-context__copy` — sticky-positioned float-right copy button. Shows "COPY" default → "COPIED ✓" for 2 seconds after click
- `.slice-card` additions: `cursor: pointer; outline-offset: 2px` + `focus-visible` ring matching accent color

**3e. JS patterns (reference, not literal):**

- `showSliceDetail(name)` — hides `.slice-grid`, shows `#slice-detail`, finds `.slice-detail-content[data-slice="{name}"]` and makes it visible. Pushes `#slices/{name}` to history. Calls `window.__renderMermaidInPanel(detailEl)` to lazy-render any Mermaid diagrams inside the detail.
- `hideSliceDetail()` — hides `#slice-detail`, shows `.slice-grid`. Preserves scroll position of the grid (save `scrollTop` before hiding, restore after showing). Pushes `#slices` to history.
- `Escape` key — if slice detail is visible, call `hideSliceDetail()` (add to existing keydown handler).
- `popstate` listener — on browser back, check `location.hash`: if `#slices/{name}` → `showSliceDetail(name)`, if `#slices` or empty → `hideSliceDetail()`.
- Hash-based deep linking — on `DOMContentLoaded`, if `location.hash` matches `#slices/{name}`, switch to Slices tab and call `showSliceDetail(name)`.
- Copy button — use `navigator.clipboard.writeText(textContent)`, swap button text to "COPIED ✓" with `setTimeout` reset after 2000ms.
- Lazy Mermaid rendering — reuse existing `window.__renderMermaidInPanel` pattern. Each `.slice-detail-content` acts as a "panel" for the render tracker.

**3f. Agent Context Block template:**

Generate a plain-text block per slice following this format:

```
## Slice: {name}
Status: {complete|partial|stub}
Purpose: {1-2 sentence description}

### Key Files
- src/{slice}/{file}.ts — {description} ({LOC} lines)

### Public API (barrel: src/{slice}/index.ts)
- {name}({params}): {return} — {description}

### Data Models
Table: {name} | Fields: {field}: {type}, ... | Indexes: {list}

### Integration Points
Bus emits: {events} | Bus consumes: {events} | MCP tools: {tools}

### Test Files
- src/{slice}/__tests__/{test}.test.ts — {description}

### Dependencies
Imports from: {slices} | Imported by: {slices}
```

Wrap the block in a `<pre class="agent-context">` with a `<button class="agent-context__copy">COPY</button>` positioned at the top-right corner.

**Open after generation:**

```bash
open {TARGET}/.xray/{project-name}-xray.html
```

### Phase 4: Verify (optional)

Open the generated HTML and check:

1. All 6 tabs render content (not blank)
2. Mermaid diagrams are visible when switching to Architecture/Data Model tabs
3. Zoom controls (+/−/reset) work on each diagram
4. No JS console errors
5. Mobile viewport (375px) doesn't overflow horizontally
6. Slices tab: clicking any card opens detail view with breadcrumb navigation
7. Slices tab: breadcrumb "← Slices" returns to grid with scroll position preserved
8. Slices tab: Escape key returns to grid from detail view
9. Slices tab: browser back button navigates between grid and detail views
10. Slices tab: direct URL `#slices/{name}` opens that slice's detail on page load
11. Slices tab: Mermaid data flow diagram renders in detail view
12. Slices tab: Agent Context Block "COPY" button copies to clipboard
13. Slices tab: all 13 sections render (conditional ones only where applicable)
14. Dark mode renders correctly for detail views

## Constraints

- ONE self-contained HTML file (inline CSS/JS, Mermaid via CDN only)
- Concise: each layer scannable in under 30 seconds
- Tables and badges over prose
- Status color-coding everywhere: green / amber / red / gray
- Brief tab must work even if all other analysis fails

## Flags

- `--refresh` — Re-run only on files changed since last `.xray/` generation
- `--layer <name>` — Regenerate one layer: brief, architecture, data-model, slices, gaps, actions
