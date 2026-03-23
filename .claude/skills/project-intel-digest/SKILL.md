---
name: project-intel-digest
description: Convert visual project-intelligence HTML artifacts into structured, AI-agent-parseable formats. Use when (1) an agent needs to understand the Aura codebase architecture, data flows, capabilities, schema, or infrastructure, (2) regenerating agent-readable digests from updated HTML artifacts in project-intelligence/, (3) onboarding a new agent or subagent that needs comprehensive project context, or (4) answering architectural questions about Aura's systems.
---

# Project Intel Digest

Transforms the 28 visual artifacts in `project-intelligence/` (18 interactive HTML pages + 10 Excalidraw diagrams) into structured markdown that AI agents can directly parse and reason over.

## Quick Reference (No Extraction Needed)

For immediate project understanding, read the pre-built knowledge base:

```
Read references/aura-knowledge-base.md
```

This 550-line structured reference covers all 15 artifact topics with tables, lists, and searchable sections. Use Grep to find specific topics:

```
Grep pattern="## Memory Pipeline" path="references/aura-knowledge-base.md"
Grep pattern="Convex Schema" path="references/aura-knowledge-base.md"
```

### Knowledge Base Sections

| Section                 | Covers                                               |
| ----------------------- | ---------------------------------------------------- |
| System Architecture     | 6-layer architecture, startup sequence, bus events   |
| Slice Dependency Map    | 18 slices, dependency tiers, exported APIs per slice |
| Infrastructure Topology | Mac Mini prod, MacBook dev, cloud services, network  |
| Agent Request Lifecycle | 10-phase pipeline from message to response           |
| Memory Pipeline         | 4 types, extraction, storage, retrieval, maintenance |
| Vault Indexing          | Real-time pipeline, chunking, search, commands       |
| Scheduling & Triggers   | 6 Trigger.dev jobs, 5 Convex crons, SQLite scheduler |
| Capability Matrix       | Full feature inventory across 16 slices, 32 skills   |
| Integration Map         | 13 services, 7 MCP servers, 12 env vars              |
| MCP Server Topology     | 4 built-in + 4 external servers, hooks, subagents    |
| Convex Schema           | 36 tables across 12 domains with fields and indexes  |
| API Route Map           | Trigger server, dashboard, Convex HTTP endpoints     |
| Deployment Architecture | Boot chain, 3-layer restart, auto-update flow        |
| CI/CD Pipeline          | 13 quality gates across 3 phases                     |
| User Journeys           | Telegram, dashboard, CLI flows                       |

## Regenerating Digests from HTML

When the HTML artifacts are updated and digests need refreshing:

```bash
python3 scripts/extract-intel.py <input-dir> <output-dir>
```

Example:

```bash
python3 scripts/extract-intel.py ~/Aura/project-intelligence ~/Aura/project-intelligence/agent-digest
```

This extracts text content and embedded JS data structures from all 17 HTML files (excluding index.html), producing:

- One `.md` file per HTML artifact with YAML frontmatter
- An `INDEX.md` master index organized by category
- Output preserves the original directory structure (architecture/, data-flows/, etc.)

After extraction, review the raw digests and update `references/aura-knowledge-base.md` with any new information.

## For Targeted Lookups

When you need specific information rather than full context:

- **Architecture question** → Read `## System Architecture` or `## Slice Dependency Map`
- **How does X work?** → Read the relevant `## Data Flows` section
- **What integrations exist?** → Read `## Integration Map`
- **Database schema** → Read `## Convex Schema`
- **API endpoints** → Read `## API Route Map`
- **What features are active?** → Read `## Capability Matrix`
- **How is it deployed?** → Read `## Deployment Architecture` + `## CI/CD Pipeline`
