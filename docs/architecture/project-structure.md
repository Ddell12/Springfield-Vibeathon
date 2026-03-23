# Project Structure — Bridges (VSA)

> Organized by Vertical Slice Architecture. See `docs/architecture/vsa-guide.md` for rules.

```
bridges/
├── src/
│   ├── app/                              # Next.js routing (THIN — imports from features)
│   │   ├── layout.tsx                    # Root layout → imports core/providers
│   │   ├── page.tsx                      # Landing → imports features/landing
│   │   ├── builder/
│   │   │   └── page.tsx                  # Builder → imports features/builder
│   │   ├── tool/
│   │   │   └── [toolId]/
│   │   │       └── page.tsx              # Shared view → imports features/therapy-tools
│   │   ├── templates/
│   │   │   └── page.tsx                  # Gallery → imports features/therapy-tools
│   │   ├── my-tools/
│   │   │   └── page.tsx                  # Tool list → imports features/builder
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts              # Chat API → imports features/builder/api
│   │   ├── error.tsx                     # Root error boundary
│   │   └── globals.css                   # Tailwind v4 @theme tokens
│   │
│   ├── core/                             # Zone 1: Universal infrastructure
│   │   ├── providers.tsx                 # ConvexProvider, future ClerkProvider
│   │   ├── config.ts                     # App constants, feature flags
│   │   └── utils.ts                      # cn() helper, nanoid, generic utils
│   │
│   ├── shared/                           # Zone 2: Used by 3+ features
│   │   └── components/
│   │       ├── ui/                       # shadcn/ui primitives
│   │       ├── loading-skeleton.tsx
│   │       └── share-dialog.tsx
│   │
│   └── features/                         # Zone 3: Feature slices
│       ├── builder/                      # === BUILDER FEATURE ===
│       │   ├── components/
│       │   │   ├── builder-layout.tsx     # Split panel (chat + preview)
│       │   │   ├── tool-preview.tsx       # Live tool preview with Convex subscription
│       │   │   └── chat/
│       │   │       ├── chat-interface.tsx  # useChat hook + message list
│       │   │       ├── chat-message.tsx    # Message bubble component
│       │   │       └── chat-input.tsx      # Input + send button
│       │   ├── hooks/
│       │   │   └── use-builder-state.ts   # Conversation + tool state management
│       │   └── api/
│       │       └── chat-route.ts          # Claude system prompt, tools, streaming logic
│       │
│       ├── therapy-tools/                # === THERAPY TOOLS FEATURE ===
│       │   ├── components/
│       │   │   ├── tool-renderer.tsx      # Config → component mapper
│       │   │   ├── visual-schedule.tsx
│       │   │   ├── token-board.tsx
│       │   │   ├── communication-board.tsx
│       │   │   ├── choice-board.tsx
│       │   │   └── first-then-board.tsx
│       │   ├── types/
│       │   │   └── tool-configs.ts        # All ToolConfig TypeScript types
│       │   └── data/
│       │       └── templates.ts           # Pre-built template configs
│       │
│       ├── knowledge/                    # === KNOWLEDGE BASE FEATURE ===
│       │   └── data/
│       │       └── therapy-knowledge.ts   # 100+ RAG entries for seeding
│       │
│       └── landing/                      # === LANDING PAGE FEATURE ===
│           └── components/
│               ├── hero.tsx
│               ├── how-it-works.tsx
│               └── tool-showcase.tsx
│
├── convex/                               # Convex backend (organized by feature)
│   ├── _generated/                       # Auto-generated types
│   ├── schema.ts                         # CORE: Full schema (all tables, indexes, vectors)
│   ├── ai.ts                             # CORE: AI actions (embed, search, TTS)
│   ├── tools.ts                          # FEATURE: Tool CRUD queries/mutations
│   ├── conversations.ts                  # FEATURE: Chat persistence
│   ├── templates.ts                      # FEATURE: Template queries
│   └── knowledge.ts                      # FEATURE: Knowledge base seeding
│
├── public/
│   └── images/therapy-icons/             # Curated therapy icon set
│
├── docs/                                 # Product docs (sharded)
│   ├── architecture/
│   ├── design/
│   └── ai/
│
├── vision.json                           # PLAID intake data
├── CLAUDE.md                             # Agent instructions
└── package.json
```

## Key VSA Rules

1. **`src/app/` pages are THIN** — < 20 lines, just import from features and render
2. **`src/core/`** — universal infrastructure only (providers, utils, config)
3. **`src/shared/`** — code used by 3+ features. shadcn/ui primitives live here.
4. **`src/features/{name}/`** — self-contained. Everything for a feature in one place.
5. **`convex/schema.ts`** — single schema file (Convex deploys it as one unit)
6. **`convex/{feature}.ts`** — backend functions organized by feature domain
