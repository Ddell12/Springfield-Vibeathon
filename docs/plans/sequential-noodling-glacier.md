# Plan: Achieve 90% Test Coverage for Bridges

## Context

Bridges currently has **8 test files with ~51 passing tests** but **zero coverage reporting**. Tests exist for therapy-tool components and Convex CRUD, but shared components, landing pages, builder features, Zustand stores, and Zod schemas have no coverage. This plan adds coverage configuration and ~98 new tests across 21 new test files to reach 90%+ line/function/branch coverage.

## Critical Files

| File | Role |
|------|------|
| `vitest.config.ts` | Add v8 coverage config + thresholds |
| `package.json` | Add `test:coverage` script |
| `src/features/therapy-tools/components/__tests__/tool-renderer.test.tsx` | Reference pattern for component tests |
| `convex/__tests__/tools.test.ts` | Reference pattern for Convex backend tests |

---

## Phase 0: Coverage Configuration

**Modify `vitest.config.ts`** — add `coverage` block:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html", "lcov"],
  reportsDirectory: "./coverage",
  include: ["src/**/*.{ts,tsx}", "convex/**/*.ts"],
  exclude: [
    "src/shared/components/ui/**",   // shadcn generated
    "src/app/**",                     // thin page wrappers
    "src/env.ts",                     // config
    "src/core/config.ts",            // constants
    "src/test/**",                    // test infra
    "convex/_generated/**",          // generated
    "convex/schema.ts",              // types only
    "convex/convex.config.ts",       // component config
    "convex/knowledge/data.ts",      // static data
    "convex/aiActions.ts",           // external API actions
    "convex/agents/**",              // agent definition
    "convex/chat/**",                // agent-dependent
    "convex/init.ts",                // seed script
    "convex/knowledge/seed.ts",      // seed script
    "convex/templates/seed.ts",      // seed script
    "**/*.d.ts",
    "**/__tests__/**",
  ],
  thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
}
```

**Modify `package.json`** — add script:
```json
"test:coverage": "vitest run --coverage"
```

**Run baseline:** `npm run test:coverage` to see starting point (~50%).

---

## Phase 1: Pure Logic & Stores (~22 tests, 4 files)

Highest ROI — zero mocking needed, covers all logic files.

### 1A. `src/core/__tests__/utils.test.ts` (~4 tests)
- `cn()` merges classes, handles falsy values, resolves Tailwind conflicts (`p-4` + `p-2` → `p-2`), empty args

### 1B. `src/features/therapy-tools/stores/__tests__/token-board-store.test.ts` (~7 tests)
- Default state 0/0, `init(5,2)`, `earnToken()` increments, caps at total, `reset()` clears earned but keeps total
- **Pattern:** `useTokenBoardStore.setState(...)` in `beforeEach` to reset

### 1C. `src/features/builder/hooks/__tests__/use-builder-state.test.ts` (~5 tests)
- Default null state, `setThreadId`, `setToolId`, independence between fields

### 1D. `src/features/therapy-tools/types/__tests__/tool-configs.test.ts` (~6 tests)
- Valid configs parse for all 5 types, `ToolConfigSchema` discriminated union works, invalid fields fail
- Use `.safeParse()` for validation testing

---

## Phase 2: Shared Components (~22 tests, 4 files)

### 2A. `src/shared/components/__tests__/material-icon.test.tsx` (~5 tests)
- Renders icon text, size variants (sm/md/lg/xl), default md, `filled=true` sets FILL 1, custom className
- **Mocking:** None

### 2B. `src/shared/components/__tests__/type-badge.test.tsx` (~5 tests)
- Known types render correct labels, unknown type renders raw string + fallback style
- **Mocking:** None

### 2C. `src/shared/components/__tests__/tool-card.test.tsx` (~7 tests)
- Tool variant: shows date + share/edit buttons, no description
- Template variant: shows description + "Use Template" link, no date
- **Mocking:** `next/link`, `MaterialIcon`, `TypeBadge`

### 2D. `src/shared/components/__tests__/header.test.tsx` (~5 tests)
- Renders nav links (Builder, Templates, My Tools), active state styling, logo links to "/"
- **Mocking:** `next/link`, `next/navigation` (usePathname), Sheet components

---

## Phase 3: Landing Components (~14 tests, 4 files)

### 3A. `src/features/landing/components/__tests__/hero-section.test.tsx` (~4 tests)
- Headline, "Start Building" CTA, "View Templates" link, badge text

### 3B. `src/features/landing/components/__tests__/how-it-works.test.tsx` (~4 tests)
- Section heading, 3 step titles, descriptions, step count

### 3C. `src/features/landing/components/__tests__/landing-footer.test.tsx` (~3 tests)
- Brand name, copyright year, Privacy/Terms/Accessibility links

### 3D. `src/features/landing/components/__tests__/product-preview.test.tsx` (~3 tests)
- Card titles, descriptions, badges

**Mocking pattern for all:** `next/link`, `MaterialIcon`

---

## Phase 4: Feature Pages (~16 tests, 3 files)

### 4A. `src/features/my-tools/components/__tests__/my-tools-page.test.tsx` (~5 tests)
- "My Tools" heading, tool count, renders cards, "Create New Tool" CTA
- **Mocking:** `next/link`, `MaterialIcon`, `ToolCard`

### 4B. `src/features/templates/components/__tests__/templates-page.test.tsx` (~6 tests)
- Heading, loading skeletons (useQuery=undefined), rendered cards (useQuery=data), category tabs, CTA
- **Mocking:** `convex/react` (useQuery), `next/link`, `MaterialIcon`, `ToolCard`, `Skeleton`

### 4C. `src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx` (~5 tests)
- Tool title/description, ToolRenderer with config, Therapist's Tip, conditional creator info
- **Mocking:** `next/link`, `MaterialIcon`, `ToolRenderer`

---

## Phase 5: Builder Components (~16 tests, 4 files)

### 5A. `src/features/builder/components/__tests__/builder-header.test.tsx` (~4 tests)
- Logo link, breadcrumb with toolName, no breadcrumb without toolName, Share button

### 5B. `src/features/builder/components/__tests__/builder-sidebar.test.tsx` (~4 tests)
- "Core Builder" label, 4 nav items, active styling, "Deploy Tool" button

### 5C. `src/features/builder/components/__tests__/builder-layout.test.tsx` (~3 tests)
- Desktop: resizable panels, Mobile: stacked layout, children rendered
- **Mocking:** `usehooks-ts` (useMediaQuery), ResizablePanel components

### 5D. `src/features/builder/components/__tests__/tool-preview.test.tsx` (~5 tests)
- No toolId: empty state, loading state (useQuery=undefined), not found (useQuery=null), renders tool, skip query when null
- **Mocking:** `convex/react` (useQuery), `ToolRenderer`, `motion/react`, `Skeleton`

---

## Phase 6: Convex Backend Additions (~4 tests, extend existing file)

**Extend `convex/__tests__/tools.test.ts`:**
- `getByThread` returns empty array for unknown threadId
- `getByThread` returns matching tools
- `getByThread` excludes tools from other threads
- `create` with `isTemplate: true` stores correctly

---

## Phase 7: Marketing Header (~4 tests, 1 file)

### 7A. `src/shared/components/__tests__/marketing-header.test.tsx` (~4 tests)
- Logo, nav links, "Start Building" CTA, mobile menu trigger

---

## What We Skip (and why)

| Excluded | Reason |
|----------|--------|
| `src/shared/components/ui/**` (15 files) | shadcn generated library code |
| `src/app/**` (6 files) | Thin wrappers < 20 lines |
| `convex/agents/bridges.ts` | Agent definition — integration test territory |
| `convex/chat/**` (2 files) | Depends on agent component runtime |
| `convex/aiActions.ts` | External API calls (ElevenLabs, Google) |
| `convex/knowledge/seed.ts`, `convex/templates/seed.ts`, `convex/init.ts` | Seed scripts |
| `src/features/builder/components/chat/bridges-chat.tsx` | Heavy agent/streaming deps — stretch goal |

---

## Mocking Reference

| Dependency | Mock Pattern |
|------------|-------------|
| `next/link` | `({ children, href }) => <a href={href}>{children}</a>` |
| `next/image` | `(props) => <img {...props} />` |
| `next/navigation` | `{ usePathname: () => "/path" }` |
| `convex/react` (useQuery) | `{ useQuery: vi.fn().mockReturnValue(data) }` |
| `MaterialIcon` | `({ icon }) => <span>{icon}</span>` |
| `motion/react` | `{ AnimatePresence: ({ children }) => children, motion: { div: (props) => <div {...props} /> } }` |
| Zustand reset | `store.setState(initialState)` in `beforeEach` |

---

## Estimated Coverage Progression

| Phase | New Tests | Cumulative | Est. Coverage |
|-------|----------|------------|---------------|
| Baseline | 0 | 51 | ~50% |
| Phase 1: Logic/stores | 22 | 73 | ~68% |
| Phase 2: Shared components | 22 | 95 | ~78% |
| Phase 3: Landing | 14 | 109 | ~85% |
| Phase 4: Feature pages | 16 | 125 | ~88% |
| Phase 5: Builder | 16 | 141 | ~93% |
| Phase 6: Convex backend | 4 | 145 | ~94% |
| Phase 7: Marketing header | 4 | 149 | ~95% |

**Total: 21 new test files, ~98 new tests → ~149 total**

---

## Verification

1. Run `npm run test:coverage` after each phase to confirm progression
2. Open `coverage/index.html` for detailed per-file breakdown
3. Final check: all thresholds pass (lines 90%, functions 90%, branches 85%)
4. `npm run test:run` confirms all tests pass (zero failures)
