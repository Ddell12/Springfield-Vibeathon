# Project Structure — Bridges (VSA)

> Organized by Vertical Slice Architecture. See `docs/architecture/vsa-guide.md` for rules.

```
bridges/
├── src/
│   ├── app/                              # Next.js routing (THIN — imports from features)
│   │   ├── layout.tsx                    # Root layout → imports core/providers
│   │   ├── (marketing)/                  # Public marketing pages (no auth required)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                  # Home → renders features/landing hero
│   │   │   ├── platform/page.tsx         # Platform → renders features/landing/platform-page
│   │   │   ├── pricing/page.tsx          # Pricing → renders features/landing/pricing-page
│   │   │   ├── meet-vocali/page.tsx      # Meet Vocali → renders features/landing/meet-vocali-page
│   │   │   └── solutions/page.tsx        # Solutions → renders features/landing components
│   │   │   # NOTE: all (marketing) page.tsx files are thin wrappers (< 20 lines)
│   │   │   # that render feature-owned components from src/features/landing/components/
│   │   │
│   │   ├── (app)/                        # Authenticated app shell
│   │   │   ├── layout.tsx                # App shell layout (sidebar, header)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── builder/
│   │   │   │   ├── layout.tsx            # Enforces therapist-only access via requireSlpUser()
│   │   │   │   └── page.tsx
│   │   │   ├── patients/
│   │   │   │   ├── layout.tsx            # Enforces therapist-only access via requireSlpUser()
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── tools/
│   │   │   │   ├── layout.tsx            # Enforces therapist-only access via requireSlpUser()
│   │   │   │   └── page.tsx
│   │   │   ├── sessions/
│   │   │   ├── goals/
│   │   │   ├── evaluations/
│   │   │   ├── plan-of-care/
│   │   │   ├── speech-coach/
│   │   │   ├── family/                   # Caregiver-facing routes
│   │   │   └── settings/
│   │   │
│   │   ├── api/
│   │   │   └── generate/route.ts         # SSE streaming endpoint (code generation)
│   │   ├── error.tsx                     # Root error boundary
│   │   └── globals.css                   # Tailwind v4 @theme tokens
│   │
│   ├── core/                             # Zone 1: Universal infrastructure
│   │   ├── providers.tsx                 # Clerk + ConvexProviderWithClerk
│   │   ├── config.ts                     # App constants (APP_NAME, APP_BRAND, etc.)
│   │   └── utils.ts                      # cn() helper, nanoid, generic utils
│   │
│   ├── shared/                           # Zone 2: Used by 3+ features
│   │   ├── clinical/                     # Cross-feature clinical types and utilities ONLY
│   │   │   ├── types.ts                  # Shared clinical domain types (e.g. PatientSummary)
│   │   │   ├── patient-utils.ts          # Pure clinical utility functions
│   │   │   └── index.ts
│   │   │   # BOUNDARY RULE: src/shared/clinical/ must not import from src/features/.
│   │   │   # Feature hooks stay in their owning feature slice.
│   │   ├── components/
│   │   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── app-header.tsx
│   │   │   ├── header.tsx
│   │   │   ├── marketing-header.tsx
│   │   │   ├── loading-skeleton.tsx
│   │   │   └── share-dialog.tsx
│   │   ├── hooks/
│   │   └── lib/
│   │
│   └── features/                         # Zone 3: Feature slices
│       ├── auth/                         # === AUTH FEATURE ===
│       │   └── lib/
│       │       └── server-role-guards.ts  # requireSlpUser(), requireCaregiverUser()
│       │
│       ├── builder/                      # === BUILDER FEATURE ===
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       │       └── agent-prompt.ts        # Claude system prompt + design rules
│       │
│       ├── patients/                     # === PATIENTS FEATURE ===
│       ├── sessions/                     # === SESSIONS FEATURE ===
│       ├── goals/                        # === GOALS FEATURE ===
│       ├── evaluations/                  # === EVALUATIONS FEATURE ===
│       ├── plan-of-care/                 # === PLAN OF CARE FEATURE ===
│       ├── speech-coach/                 # === SPEECH COACH FEATURE ===
│       ├── family/                       # === FAMILY/CAREGIVER FEATURE ===
│       ├── dashboard/                    # === DASHBOARD FEATURE ===
│       ├── settings/                     # === SETTINGS FEATURE ===
│       ├── landing/                      # === LANDING PAGE FEATURE ===
│       │   └── components/
│       │       ├── platform-page.tsx
│       │       ├── pricing-page.tsx
│       │       ├── meet-vocali-page.tsx
│       │       ├── hero-section.tsx
│       │       ├── how-it-works.tsx
│       │       └── ...
│       │
│       └── tools/                        # === TOOLS/THERAPY-TOOLS FEATURE ===
│
├── convex/                               # Convex backend (organized by feature)
│   ├── _generated/                       # Auto-generated types
│   ├── schema.ts                         # CORE: Full schema (all tables, indexes, vectors)
│   ├── auth.config.ts                    # Clerk JWT verification
│   ├── tools.ts                          # FEATURE: Tool CRUD queries/mutations
│   ├── sessions.ts                       # FEATURE: Session state machine
│   ├── patients.ts                       # FEATURE: Patient management
│   ├── homePrograms.ts                   # FEATURE: Home program queries/mutations
│   ├── speechCoach.ts                    # FEATURE: Speech coach queries/mutations
│   ├── speechCoachTemplates.ts           # FEATURE: Speech coach template management
│   └── ...
│
├── public/
│   └── images/therapy-icons/             # Curated therapy icon set
│
├── docs/                                 # Product docs (sharded)
│   ├── architecture/
│   ├── design/
│   └── ai/
│
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

## Route Groups

- **`(marketing)/`** — Public-facing pages. All `page.tsx` files are thin wrappers that render feature-owned components from `src/features/landing/components/`. No auth required.
- **`(app)/`** — Authenticated app shell with sidebar. The `builder/`, `patients/`, and `tools/` subtrees each have a `layout.tsx` that calls `requireSlpUser()` before rendering, enforcing therapist-only access at the route level.

## Shared Boundary Rules

- **`src/shared/clinical/`** contains only cross-feature clinical types and pure utility functions. It must not import from `src/features/`.
- Feature-specific hooks (e.g. `usePatients`, `useSessionNotes`) stay in their owning feature slice — never in `src/shared/`.
- `src/shared/` may be imported by any feature; the reverse is forbidden.
