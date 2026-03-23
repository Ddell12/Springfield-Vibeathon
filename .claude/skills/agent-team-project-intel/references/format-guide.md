# Format Guide

Conventions for all project intelligence artifacts. Every diagrammer agent
must follow these rules for consistency across the entire output.

All HTML pages use the `visual-explainer` skill and all Excalidraw files use
the `excalidraw:diagramming` skill. Invoke these skills before creating any
artifacts. This guide documents the **actual** conventions established in the
existing `project-intelligence/` artifacts — follow them precisely.

---

## HTML Visual Explainers

### Self-Contained

- All CSS and JS must be inline — no external dependencies
- No CDN links, no font imports, no external images
- Each file must render correctly when opened directly via `file://`

### Two CSS Palettes

The existing artifacts use two distinct dark-only CSS palettes. Match the correct
one based on category:

#### "GitHub Dark" Palette — Architecture & Data Flows

Used by: `architecture/`, `data-flows/`

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --bg-card: #1c2128;
  --border: #30363d;
  --border-hover: #58a6ff;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --accent-blue: #58a6ff;
  --accent-purple: #bc8cff;
  --accent-green: #3fb950;
  --accent-orange: #d29922;
  --accent-red: #f85149;
  --accent-cyan: #39d2c0;
  --accent-pink: #f778ba;
  --accent-yellow: #e3b341;
}
```

Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`

#### "Deep Black" Palette — Everything Else

Used by: `user-journeys/`, `features/`, `database/`, `devops/`, `index.html`

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #111118;
  --bg-tertiary: #1a1a24;
  --bg-card: #14141e;
  --bg-hover: #1e1e2e;
  --border: #2a2a3a;
  --border-accent: #3a3a5a;
  --text-primary: #e8e8f0;
  --text-secondary: #9898b0;
  --text-muted: #686880;
  --accent-blue: #5b8def;
  --accent-purple: #a78bfa;
  --accent-green: #34d399;
  --accent-amber: #fbbf24;
  --accent-red: #f87171;
  --accent-cyan: #22d3ee;
  --accent-pink: #f472b6;
  --accent-orange: #fb923c;
}
```

Font stack: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Background Effects

Deep Black pages use a `body::before` ambient gradient + grid background:

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(91, 141, 239, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(167, 139, 250, 0.04) 0%, transparent 50%),
    linear-gradient(rgba(42, 42, 58, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(42, 42, 58, 0.15) 1px, transparent 1px);
  background-size:
    100% 100%,
    100% 100%,
    40px 40px,
    40px 40px;
  pointer-events: none;
  z-index: 0;
}
```

GitHub Dark pages use a simpler linear gradient on `.header`:

```css
.header {
  background: linear-gradient(180deg, #0d1117 0%, #161b22 100%);
}
```

### Header Pattern

```html
<div class="header">
  <h1>Artifact Title</h1>
  <p class="subtitle">Description of this artifact</p>
  <!-- optional tech badges -->
  <span class="tech-badge">Claude Agent SDK</span>
</div>
```

Gradient text on `h1`:

```css
.header h1 {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Back to Index Link (REQUIRED)

Every artifact page must include a back-to-index link in the header area:

```html
<a href="../index.html" class="back-link">← Back to Index</a>
```

Style it consistently:

```css
.back-link {
  display: inline-block;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 16px;
  transition: color 0.2s;
}
.back-link:hover {
  color: var(--accent-blue);
}
```

### Generation Timestamp (REQUIRED)

Include a generation timestamp in the footer of every page:

```html
<div class="footer">
  <p>Brief description of what this artifact covers</p>
  <p class="generated">Generated from source analysis — YYYY-MM-DD</p>
</div>
```

### Legend Pattern

```html
<div class="legend">
  <div class="legend-item">
    <span class="legend-dot" style="background: var(--accent-blue)"></span>
    <span>Core Infrastructure</span>
  </div>
  <!-- more items -->
</div>
```

### Hover Expand

For expandable detail sections:

```css
.details {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.card:hover .details {
  max-height: 400px;
}
```

### CSS Comment Style

```css
/* ── Section Name ─────────────────────────────────────── */
```

### HTML Section Separators

```html
<!-- ═══════════════ SECTION NAME ═══════════════ -->
```

### Monospace Font

```css
font-family: "SF Mono", "Fira Code", monospace;
```

### Semantic Color Coding

Use consistent colors for the same concept across all artifacts:

| Element              | CSS Variable       | Role                                 |
| -------------------- | ------------------ | ------------------------------------ |
| Core infrastructure  | `--accent-blue`    | Core modules, entry points, runtime  |
| Feature modules      | `--accent-green`   | Feature slices, active status        |
| External services    | `--accent-orange`  | Third-party APIs, SDKs, integrations |
| Data stores          | `--accent-purple`  | Database tables, schema, storage     |
| User interfaces      | `--accent-cyan`    | Web UI, CLI, chat, mobile            |
| Security/permissions | `--accent-red`     | Auth, permission checks, blocked ops |
| Scheduling/triggers  | `--accent-pink`    | Crons, queues, background jobs       |
| Configuration        | `--text-secondary` | Config files, environment            |

### Cross-Artifact References

Reference related artifacts by number and title where relevant:

```
See #04 Agent Request Lifecycle for the full message flow
```

Use consistent terminology — same name for same concept across all pages
(e.g., always "Trigger Server", never "HTTP Server" in one and "Trigger Server" in another).

---

## Index Page Structure

The index page (`project-intelligence/index.html`) uses the Deep Black palette
with a distinct layout:

### Hero Section

```html
<div class="hero">
  <div class="hero-badge">
    <svg><!-- icon --></svg> PROJECT INTELLIGENCE
  </div>
  <h1>[Project Name] Project Intelligence</h1>
  <p>Description of the project and what these artifacts cover</p>
</div>
```

### Stats Bar

```html
<div class="stats-bar">
  <div class="stat">
    <span class="stat-dot" style="background: var(--accent-blue)"></span>
    <span class="stat-value">28 Artifacts</span>
  </div>
  <!-- more stats -->
</div>
```

### Quick Start

3 recommended starting artifacts, prominently linked.

### Search

```html
<input id="searchInput" type="text" placeholder="Search artifacts..." />
```

Live JS filtering against `data-keywords` attributes on cards. Keyboard: `/` to
focus, `Escape` to clear.

### Category Sections

```html
<div class="category" data-category="architecture">
  <div class="category-header">
    <svg><!-- category icon --></svg>
    <h2>Architecture</h2>
    <span class="category-count">6 artifacts</span>
  </div>
  <div class="cards-grid">
    <!-- cards -->
  </div>
</div>
```

### Cards

```html
<a
  class="card"
  href="architecture/01-system-overview.html"
  data-keywords="slices modules entry points"
>
  <span class="card-arrow">→</span>
  <span class="card-number">#01</span>
  <h3 class="card-title">System Overview</h3>
  <p class="card-desc">All slices, relationships, dependency hierarchy, entry points</p>
  <div class="card-tags">
    <span class="card-tag">HTML</span>
    <span class="card-tag">Excalidraw</span>
  </div>
</a>
```

### Footer

```html
<footer class="footer">
  <p>28 artifacts across 6 categories</p>
  <p>Generated YYYY-MM-DD</p>
</footer>
```

---

## Excalidraw Diagrams

All Excalidraw files are generated via the `excalidraw:diagramming` skill.

### Format

- Valid JSON matching Excalidraw's schema
- File extension: `.excalidraw`
- Must open correctly at https://excalidraw.com

### Required Metadata

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "claude-code",
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

### Element Style Conventions

- `"roughness": 0` (clean, not hand-drawn)
- `"fontFamily": 1` (Virgil/hand-drawn font)
- `"roundness": { "type": 3 }` for rounded rectangles
- Rounded rectangles for components/modules
- Diamonds for decision points
- Arrows with labels for connections

### Layout

- Left-to-right or top-to-bottom flow (match logical direction)
- Generous spacing between elements (minimum 40px gaps)
- Aligned elements — use consistent x/y coordinates
- Group related elements visually with light background rectangles

### Labels

- Every node must have a label
- Every arrow should describe the relationship or data flow
- Include file paths in small text under component names where relevant

---

## Clickable Source Links

```css
.path a {
  color: var(--accent-blue);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.path a:hover {
  border-bottom-color: var(--accent-blue);
}
.gh-link {
  color: var(--text-muted);
  font-size: 12px;
  margin-left: 6px;
  text-decoration: none;
}
.gh-link:hover {
  color: var(--accent-blue);
}
```

HTML pattern:

```html
<div class="path">
  <a href="vscode://file/${PROJECT_ROOT}/${relative_path}" title="Open in VS Code"
    >${relative_path}</a
  >
  <a
    href="https://github.com/${OWNER}/${REPO}/blob/main/${relative_path}"
    class="gh-link"
    title="View on GitHub"
    >↗</a
  >
</div>
```

---

## Freshness Indicator

```css
.freshness {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.freshness .commit {
  font-family: var(--font-mono);
  color: var(--accent-purple);
}
.stale-badge {
  display: inline-block;
  background: rgba(251, 191, 36, 0.15);
  color: var(--accent-amber, var(--accent-orange));
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
}
```

HTML pattern:

```html
<div
  class="freshness"
  data-source-files="convex/agents/onboarding.ts,convex/chat/onboarding.ts"
  data-verified="2026-03-04"
  data-commit="f4adcd3"
>
  Verified: Mar 4, 2026 · <span class="commit">f4adcd3</span>
</div>
```

---

## Impact Map

```css
details.impact-map {
  margin-top: 24px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
details.impact-map summary {
  padding: 12px 16px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}
details.impact-map summary:hover {
  color: var(--text-primary);
}
details.impact-map table {
  width: 100%;
  border-collapse: collapse;
}
details.impact-map td,
details.impact-map th {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  vertical-align: top;
}
details.impact-map th {
  background: var(--bg-tertiary);
  text-align: left;
  color: var(--text-secondary);
}
```

---

## How-To Recipes

```css
details.recipe {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
details.recipe summary {
  padding: 10px 16px;
  background: var(--bg-secondary);
  color: var(--accent-green);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}
details.recipe ol {
  padding: 16px 16px 16px 36px;
  color: var(--text-secondary);
}
details.recipe ol li {
  margin-bottom: 8px;
}
details.recipe code {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 13px;
}
```

---

## Known Issues

```css
.known-issue {
  border-left: 4px solid var(--accent-amber, var(--accent-orange));
  background: rgba(251, 191, 36, 0.06);
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
}
.known-issue strong {
  color: var(--accent-amber, var(--accent-orange));
}
```

HTML pattern:

```html
<div class="known-issue" data-status="open">
  <strong>Known Issue:</strong> Description of the issue.
</div>
```

---

## Data Attributes Convention

| Attribute          | Used On                         | Purpose                        |
| ------------------ | ------------------------------- | ------------------------------ |
| `data-file`        | Path/module cards               | Source file path               |
| `data-fn`          | Function reference cards        | Function/handler name          |
| `data-table`       | Database entity cards           | Schema table name              |
| `data-capability`  | Feature matrix cells            | Capability name                |
| `data-value`       | Feature matrix cells            | yes, partial, no               |
| `data-env-var`     | Environment variable references | Env var name                   |
| `data-step`        | Pipeline/flow steps             | Step number                    |
| `data-step-fn`     | Pipeline/flow steps             | Step handler function          |
| `data-source-path` | Feature rows                    | Source file path               |
| `data-written-by`  | Database tables                 | Comma-separated writer modules |
| `data-read-by`     | Database tables                 | Comma-separated reader modules |

---

## Manifest Format

The index builder generates `project-intelligence/manifest.json` alongside `index.html`:

```json
{
  "generated": "YYYY-MM-DD",
  "commit": "SHORT_SHA",
  "artifacts": [
    {
      "id": "01",
      "category": "architecture",
      "title": "System Architecture Overview",
      "file": "architecture/01-system-overview.html",
      "sourceFiles": ["convex/schema.ts", "src/core/providers/"],
      "keywords": ["system", "topology", "providers"],
      "covers": ["onboarding", "dashboard"]
    }
  ]
}
```

---

## Quality Checklist

Before marking an artifact complete, verify:

- [ ] HTML opens in browser without errors (check console)
- [ ] All links are relative (no absolute file paths)
- [ ] Correct CSS palette used for the category
- [ ] `body::before` grid pattern present (Deep Black pages)
- [ ] Back-to-index link present: `<a href="../index.html">← Back to Index</a>`
- [ ] Generation timestamp in footer
- [ ] Excalidraw opens at excalidraw.com (if applicable)
- [ ] Color coding consistent with this guide
- [ ] Cross-references use artifact numbers (e.g., "See #04")
- [ ] Consistent terminology — same name for same concept
- [ ] No placeholder text or TODO markers
- [ ] All `.path` elements contain clickable links (not plain text)
- [ ] `data-file` attributes present on all source code references
- [ ] Freshness indicator present per major section
- [ ] Impact map present (architecture, data-flow, database artifacts)
- [ ] Recipes present (architecture, backend, pipeline, database artifacts)
- [ ] `manifest.json` generated and valid
