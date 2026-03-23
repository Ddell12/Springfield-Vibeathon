# Vertical Slice Architecture (VSA) — Bridges

> Adapted from Rasmus Widing's VSA guide for a Next.js + Convex + AI stack.

## Why VSA for Bridges

VSA organizes code by **feature** instead of by **technical layer**. Instead of having all components in one folder and all logic in another, everything related to a feature lives together. This means:

- An AI agent building the "tool builder" feature loads one directory and has everything
- No ripple effects — changing the token board doesn't touch the communication board
- Parallel development — multiple agents can work on separate features simultaneously

## The Three Zones

### Zone 1: `core/` — Universal Infrastructure

Code that exists **before** features. If you deleted every feature, this code would still be needed.

**Decision rule:** If removing every feature slice would still require this code, it goes in `core/`.

**For Bridges frontend (`src/core/`):**
```
src/core/
├── providers.tsx          # ConvexProvider, ClerkProvider (when added)
├── config.ts              # App-wide constants, feature flags
└── utils.ts               # cn() helper, generic utilities
```

**For Bridges backend (`convex/core/`):**
```
convex/core/
├── schema.ts              # Full Convex schema (all tables, all indexes)
└── ai.ts                  # AI infrastructure: embed(), TTS client, RAG search
```

**Why schema is in core:** The Convex schema defines ALL tables and is deployed as a single unit. It's universal infrastructure, not feature-specific.

**Why AI infra is in core:** Embedding, vector search, and TTS are used by multiple features (builder, templates, shared tools). They're infrastructure, not business logic.

### Zone 2: `shared/` — Three-Feature Rule

Code that **multiple features use** but isn't foundational infrastructure.

**Critical rule:** Code moves to `shared/` when **3+ features need it**. Until then, **duplicate it**.

- One feature uses it → feature-specific
- Two features use it → duplicate (add a comment noting the duplication)
- Three features use it → extract to `shared/` and refactor all three

**For Bridges frontend (`src/shared/`):**
```
src/shared/
├── components/
│   ├── loading-skeleton.tsx    # Used by builder, my-tools, templates, shared-view
│   └── share-dialog.tsx        # Used by builder, my-tools, shared-view
└── hooks/
    └── use-tool-config.ts      # Used by builder, shared-view, templates
```

**For Bridges backend (`convex/shared/`):**
Not needed yet for MVP — wait until 3+ features share logic.

### Zone 3: Feature Slices — Self-Contained Domains

Each feature owns **everything** needed to understand and modify it: components, hooks, types, and Convex functions.

**For Bridges frontend:**
```
src/features/
├── builder/                    # The core builder experience
│   ├── components/
│   │   ├── builder-layout.tsx
│   │   ├── tool-preview.tsx
│   │   └── chat/
│   │       ├── chat-interface.tsx
│   │       ├── chat-message.tsx
│   │       └── chat-input.tsx
│   ├── hooks/
│   │   └── use-builder-state.ts
│   └── api/
│       └── chat-route.ts       # The AI chat logic (imported by app/api/chat/route.ts)
│
├── therapy-tools/              # The 5 therapy tool components
│   ├── components/
│   │   ├── tool-renderer.tsx
│   │   ├── visual-schedule.tsx
│   │   ├── token-board.tsx
│   │   ├── communication-board.tsx
│   │   ├── choice-board.tsx
│   │   └── first-then-board.tsx
│   ├── types/
│   │   └── tool-configs.ts     # All tool config TypeScript types
│   └── data/
│       └── templates.ts        # Pre-built template definitions
│
├── knowledge/                  # RAG knowledge base
│   └── data/
│       └── therapy-knowledge.ts # 100+ entries for seeding
│
└── landing/                    # Landing page
    └── components/
        ├── hero.tsx
        ├── how-it-works.tsx
        └── tool-showcase.tsx
```

**For Bridges backend (`convex/`):**
```
convex/
├── core/
│   ├── schema.ts              # Full schema (universal)
│   └── ai.ts                  # embed, searchKnowledge, generateSpeech
├── tools/
│   ├── queries.ts             # tools.get, tools.getBySlug, tools.list
│   └── mutations.ts           # tools.create, tools.update, tools.remove
├── agents/
│   └── bridges.ts             # Convex Agent definition (threads, streaming, tools)
├── templates/
│   └── queries.ts             # templates.list
└── knowledge/
    └── mutations.ts           # seedKnowledge (inserts + embeds)
```

## Next.js Routing Layer (Thin)

Next.js App Router pages are **thin wrappers** that import from feature slices. The page file handles routing; the feature owns the logic and UI.

```
src/app/
├── layout.tsx              # Imports from core/providers.tsx
├── page.tsx                # Imports from features/landing/
├── builder/
│   └── page.tsx            # Imports from features/builder/
├── tool/
│   └── [toolId]/
│       └── page.tsx        # Imports from features/therapy-tools/
├── templates/
│   └── page.tsx            # Imports from features/therapy-tools/data/templates
├── my-tools/
│   └── page.tsx            # Imports from features/builder/ (tool list)
└── api/
    └── chat/
        └── route.ts        # Imports from features/builder/api/chat-route.ts
```

**Rule:** Page files should be < 20 lines. They import a feature component and render it. Business logic never lives in `app/`.

## Decision Flowchart

```
New code to write?
│
├─ Exists before any features? (providers, schema, AI clients)
│  └─→ core/
│
├─ Used by 3+ features AND identical logic?
│  └─→ shared/
│
├─ Feature-specific? (business logic, components, types)
│  └─→ features/{feature-name}/
│
└─ Used by 1-2 features?
   └─→ Duplicate in each feature (wait for third)
```

## Cross-Feature Communication

**Feature A needs data from Feature B:**
- READ: Feature A can import Feature B's Convex queries directly. Document the dependency.
- WRITE: Feature A should never write to Feature B's tables. Use the orchestrating pattern (see below).

**Orchestrating pattern** (when a flow spans features):
The builder feature orchestrates across therapy-tools (for rendering) and knowledge (for RAG). This is fine — the builder is the orchestrator. It imports from other features' public interfaces.

## AI Friendliness Rules

- Files under 300 lines — split if longer
- Each feature directory has everything an agent needs to work on that feature
- Explicit imports — no barrel files or re-exports that hide the source
- Colocate tests with the feature (when tests are added)
- Feature README.md (optional for hackathon, recommended for v2)

## What This Means for the Build

When the roadmap says "Build the token board component," the agent:
1. Creates `src/features/therapy-tools/components/token-board.tsx`
2. Reads the config type from `src/features/therapy-tools/types/tool-configs.ts`
3. Reads the design tokens from `docs/design/design-tokens.md`
4. Everything it needs is in the `therapy-tools` feature slice + design docs

When the roadmap says "Wire up the chat API," the agent:
1. Creates `src/features/builder/api/chat-route.ts` (the logic)
2. Creates `src/app/api/chat/route.ts` (thin wrapper importing from above)
3. Reads the prompt from `docs/ai/prompt-library.md`
4. Everything it needs is in the `builder` feature slice + AI docs
