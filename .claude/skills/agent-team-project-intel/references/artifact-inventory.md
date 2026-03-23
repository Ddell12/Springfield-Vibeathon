# Artifact Inventory — Template

This file defines the **format** for the artifact plan that the `researcher`
produces at the end of Phase 1. It is NOT a hardcoded list — it is a template
and example showing exactly what structure to follow.

The researcher reads this file, then produces a plan tailored to the actual
codebase they explored.

---

## How to Fill In the Plan

For each artifact the researcher proposes, specify:

- **Number**: Sequential `##` zero-padded (01, 02, ... 18, etc.)
- **Title**: Short, descriptive (e.g., "System Overview", "Request Lifecycle")
- **Filename slug**: Kebab-case path relative to `project-intelligence/`
  (e.g., `architecture/01-system-overview`)
- **Format**: `HTML` or `HTML + Excalidraw`
  - Use `HTML + Excalidraw` for structural maps and process flows that benefit
    from an editable diagram companion
  - Use `HTML` alone for matrices, tables, route maps, and journey flows
- **Owner**: Which diagrammer role generates this artifact
- **Description**: One sentence on what it shows

---

## Standard Categories

These six categories cover most projects. The researcher should include only
the categories that are relevant — skip categories that don't apply (e.g.,
omit "Database" if the project has no persistent storage; omit "DevOps" if
there is no deployment configuration).

| Category      | Owner           | Typical Artifact Count | Notes                                           |
| ------------- | --------------- | ---------------------- | ----------------------------------------------- |
| Architecture  | arch-diagrammer | 2–4                    | Always include; every project has structure     |
| Data Flows    | flow-diagrammer | 2–5                    | Include if there are non-trivial request paths  |
| User Journeys | flow-diagrammer | 1–4                    | Include if there are user-facing surfaces       |
| Features      | feat-diagrammer | 1–3                    | Include if there are integrations or extensions |
| Database      | db-diagrammer   | 1–3                    | Include if there is a data persistence layer    |
| DevOps        | arch-diagrammer | 1–3                    | Include if there is deployment configuration    |
| Index         | index-builder   | 1 (always)             | Always exactly one master index                 |

---

## Example Plan (for a hypothetical project)

The researcher replaces this example with their actual findings.

### Category 1: Architecture (owner: arch-diagrammer)

| #   | Artifact              | Filename                             | Format            | Description                                                          |
| --- | --------------------- | ------------------------------------ | ----------------- | -------------------------------------------------------------------- |
| 01  | System Overview       | `architecture/01-system-overview`    | HTML + Excalidraw | All modules, their relationships, dependency hierarchy, entry points |
| 02  | Module Dependency Map | `architecture/02-module-dependency`  | HTML + Excalidraw | Import graph showing which module depends on which                   |
| 03  | Infrastructure Map    | `architecture/03-infrastructure-map` | HTML + Excalidraw | Machines, cloud services, networks, external dependencies            |

### Category 2: Data Flows (owner: flow-diagrammer)

| #   | Artifact          | Filename                          | Format            | Description                                              |
| --- | ----------------- | --------------------------------- | ----------------- | -------------------------------------------------------- |
| 04  | Request Lifecycle | `data-flows/04-request-lifecycle` | HTML + Excalidraw | Entry point → handler → processing → response            |
| 05  | Background Jobs   | `data-flows/05-background-jobs`   | HTML + Excalidraw | Scheduled and async job flows from trigger to completion |

### Category 3: User Journeys (owner: flow-diagrammer)

| #   | Artifact          | Filename                         | Format | Description                                            |
| --- | ----------------- | -------------------------------- | ------ | ------------------------------------------------------ |
| 06  | Primary User Flow | `user-journeys/06-primary-flow`  | HTML   | Core end-to-end user interaction from start to outcome |
| 07  | Admin Journey     | `user-journeys/07-admin-journey` | HTML   | Administrative interface flows and management screens  |

### Category 4: Features (owner: feat-diagrammer)

| #   | Artifact          | Filename                        | Format | Description                                                           |
| --- | ----------------- | ------------------------------- | ------ | --------------------------------------------------------------------- |
| 08  | Capability Matrix | `features/08-capability-matrix` | HTML   | Every feature with status (active, planned, experimental, deprecated) |
| 09  | Integration Map   | `features/09-integration-map`   | HTML   | All external services with connection type and what they provide      |

### Category 5: Database (owner: db-diagrammer)

| #   | Artifact          | Filename                 | Format            | Description                                                   |
| --- | ----------------- | ------------------------ | ----------------- | ------------------------------------------------------------- |
| 10  | Schema ER Diagram | `database/10-schema-er`  | HTML + Excalidraw | All tables/models, fields, types, relationships, indexes      |
| 11  | API Route Map     | `database/11-api-routes` | HTML              | All API endpoints, methods, purposes, request/response shapes |

### Category 6: DevOps (owner: arch-diagrammer)

| #   | Artifact            | Filename               | Format            | Description                                               |
| --- | ------------------- | ---------------------- | ----------------- | --------------------------------------------------------- |
| 12  | Deployment Overview | `devops/12-deployment` | HTML + Excalidraw | Process managers, boot scripts, auto-deploy, log rotation |
| 13  | CI/CD Pipeline      | `devops/13-ci-cd`      | HTML              | Lint, type-check, test, build, and deploy pipeline steps  |

### Category 7: Index (owner: index-builder)

| #   | Artifact     | Filename | Format | Description                                                            |
| --- | ------------ | -------- | ------ | ---------------------------------------------------------------------- |
| 14  | Master Index | `index`  | HTML   | Dashboard linking all artifacts with search, filter, category grouping |

---

## File Naming Convention

- HTML files: `{filename}.html`
- Excalidraw files: `{filename}.excalidraw` (JSON format)
- All files live under `project-intelligence/` at the project root
- Numbers are zero-padded and sequential across all categories

## Directory Structure Example

The actual structure will vary based on which categories the researcher includes:

```
project-intelligence/
├── manifest.json        ← Machine-readable index for AI agents
├── index.html
├── architecture/   (N HTML + N Excalidraw)
├── data-flows/     (N HTML + N Excalidraw)
├── user-journeys/  (N HTML only)
├── features/       (N HTML only)
├── database/       (N HTML + N Excalidraw)
└── devops/         (N HTML + N Excalidraw)
```

## Excalidraw Decision Guide

Use `HTML + Excalidraw` when the artifact shows:

- Structural topology (nodes and edges — modules, services, components)
- Directional data flow (pipelines, request/response paths, queues)
- Relational data model (tables/models with foreign key arrows)
- Infrastructure topology (machines, networks, cloud services)

Use `HTML` alone when the artifact shows:

- Matrices and tables (feature status, route catalogs)
- Sequential user journeys (step-by-step flows without branching topology)
- Lists with metadata (integration summaries, capability inventories)

---

## Manifest Format

The index builder generates `project-intelligence/manifest.json` alongside `index.html`.
This file enables AI agents and tooling to programmatically discover artifacts.

### JSON Schema

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

### Field Definitions

| Field                     | Type                | Description                                                                 |
| ------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `generated`               | string (YYYY-MM-DD) | Date the artifact set was generated                                         |
| `commit`                  | string              | Short git SHA of HEAD at generation time                                    |
| `artifacts`               | array               | One entry per HTML artifact (not Excalidraw)                                |
| `artifacts[].id`          | string              | Zero-padded artifact number (e.g., "01")                                    |
| `artifacts[].category`    | string              | One of: architecture, data-flows, user-journeys, features, database, devops |
| `artifacts[].title`       | string              | Short human-readable title                                                  |
| `artifacts[].file`        | string              | Path relative to `project-intelligence/`                                    |
| `artifacts[].sourceFiles` | string[]            | Source files this artifact was generated from                               |
| `artifacts[].keywords`    | string[]            | Search keywords (mirrors `data-keywords` on card)                           |
| `artifacts[].covers`      | string[]            | Feature slices or domains this artifact covers                              |

### Generation Rule

The index builder MUST write `manifest.json` to `project-intelligence/manifest.json`
at the same time as `index.html`. Both files are generated together in the same step.
