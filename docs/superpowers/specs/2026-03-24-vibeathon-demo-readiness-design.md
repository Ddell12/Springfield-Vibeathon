# Vibeathon Demo Readiness — Design Spec

**Date:** 2026-03-24
**Deadline:** 2026-03-27 (Vibeathon submission)
**Approach:** Sequential Deep Clean — v1 removal, then each feature slice polished end-to-end
**Demo format:** Recorded video walkthrough
**UI tooling:** All frontend components designed/built via `/stitch-design` skill and Stitch MCP

---

## Demo Flow (video storyboard)

1. Landing page — hero, "Close the Gap" branding, CTA
2. Builder — type therapy need, AI generates app in E2B sandbox
3. Share — tap share, get link + QR code
4. Shared view — open link, tool works standalone
5. Templates — browse categories, one-tap start
6. My Tools — saved projects grid

---

## Section 1: V1 Removal & Test Fixes

### Delete

- `src/features/builder/` — entire directory (~946 LOC including tests)
- All imports referencing `@/features/builder/` from other files
- **CRITICAL:** `src/app/(app)/layout.tsx` imports `BuilderSidebar` from v1. Rewrite this layout to remove the v1 import. Replace with minimal navigation or render children directly — the `(app)` route group (builder) must not break.
- Convex Agent chat functions in `convex/chat/` **only if** exclusively used by v1
  - `convex/agents/bridges.ts` may still be used for RAG/knowledge — verify before removing

### Fix 7 Failing Tests

**`builder-v2/lib/__tests__/e2b.test.ts` (4 failures):**
- `Sandbox.connect is not a function` — E2B SDK mock is incomplete
- Fix: add `connect` as a static method on the mocked `Sandbox` class

**`builder-v2/components/__tests__/builder-layout.test.tsx` (3 failures):**
- ResizablePanel orientation assertions failing
- Fix: update test approach to match what shadcn's Resizable actually exposes in the DOM

### Update

- Verify `src/app/(app)/builder/page.tsx` still works (already points to v2)
- Remove any shared component imports from v1
- Update navigation links if any reference v1 paths

### Verification

- `npm test -- --run` passes all remaining tests (0 failures) — total count will drop after v1 test deletion
- No TypeScript errors (`npx tsc --noEmit`)
- App builds (`npm run build`)

---

## Section 2: Landing Page Verification

### Audit (not rebuild)

- `hero-section.tsx` — CTA "Start Building" links to `/builder`, copy matches "Close the Gap" theme
- `close-the-gap-hero.tsx` — check which hero variant is active
- `how-it-works.tsx` — 3-step explainer renders, motion animations fire
- `product-preview.tsx` — animated preview looks polished
- `landing-footer.tsx` — links work

### Fix only if broken

- Responsive at 375px / 768px / 1280px
- No layout jank or missing assets
- CTA button navigates correctly

### Scope

Quick audit. If it works, move on fast.

---

## Section 3: Builder V2 Polish

### Verify & harden

- Chat flow: user sends message -> AI streams response -> code generates -> E2B sandbox renders preview
- Error handling: if E2B sandbox creation fails, show friendly message (not a crash)
- Loading states: spinner/shimmer in preview while sandbox boots and code compiles
- `/api/sandbox` route — verify it handles E2B lifecycle correctly

### Polish (use Stitch MCP for any new UI)

- Empty state in preview panel ("Describe what you need — your tool will appear here")
- Chat input UX: disabled while AI is responding, clear affordance to send
- If AI-generated app errors in sandbox, surface gracefully (not a white iframe)

### Do NOT touch

- AI system prompt or code generation logic (working = don't break it)
- No new features — just make what exists work reliably

---

## Section 4: Sharing Flow

### Architecture

Builder v2 uses the `projects` table (not `tools`). Projects store `fragment` (generated code), `sandboxId`, and `shareSlug`.

**Flow:**
1. Builder saves `FragmentResult` to `projects` table with `shareSlug` (already happening)
2. Share dialog shows URL `/tool/{shareSlug}` + QR code
3. Shared view: query `projects` by slug -> retrieve saved `fragment` -> call `/api/sandbox` to spin up fresh E2B sandbox -> render as iframe

### Changes needed

- **`src/app/tool/[toolId]/page.tsx`** — rewire to query `projects.getBySlug` instead of `tools.getBySlug`
- **`src/features/shared-tool/components/shared-tool-page.tsx`** — **FULL REWRITE** (not a patch). The existing component uses v1's `ToolRenderer` + `ToolConfig` — none of this JSX is reusable. New component must: (1) query `api.projects.getBySlug`, (2) POST the retrieved `fragment` to `/api/sandbox`, (3) render an iframe with the returned sandbox URL, (4) handle loading/error/not-found states. Design via Stitch MCP. Keep the header and footer CTA pattern.
- **`convex/projects.ts`** — verify `getBySlug` query exists; create if not
- **Share dialog** — wire into builder v2's project context (`project.shareSlug`, not `tool.shareSlug`)

### Shared view UX (design via Stitch)

- Branded loading screen ("Loading your therapy tool...") while sandbox spins up
- Full-width iframe with running app once ready
- Footer: "Build your own — powered by Bridges" CTA

### Trade-off

Each shared link visit costs one E2B sandbox (~60s timeout). Fine for demo. Post-vibeathon optimize with caching or static export.

### Risk mitigation

- E2B may be down or rate-limited during demo recording. Record the shared-view portion while E2B is confirmed working.
- Consider having a screenshot fallback: if E2B is unreliable, the shared view could show a static image of the generated tool with a "Live preview unavailable" message.

---

## Section 5: Templates Page

### Data layer

- `therapyTemplates` table exists in schema with `name`, `description`, `category`, `starterPrompt`, `exampleFragment`, `sortOrder`
- **No Convex functions exist yet.** Create `convex/therapy_templates.ts` with:
  - `list` query — all templates sorted by `sortOrder`
  - `getByCategory` query — filtered by category
  - `get` query — single template by ID
  - `seed` internalMutation — idempotent seed of 8 templates
- **Seed data (8 templates):**
  1. Communication / "Snack Request Board" / "Build a picture communication board with 8 common snack requests like goldfish crackers, apple slices, juice box, and more"
  2. Communication / "Feelings Check-In" / "Create a feelings check-in board with 6 emotions — happy, sad, angry, scared, tired, excited — with pictures and labels"
  3. Behavior Support / "5-Star Token Board" / "Build a token board with 5 stars where a child earns tokens for positive behavior, with a reward choice at the end"
  4. Behavior Support / "First-Then Transition Board" / "Create a first-then board for transitioning between activities — first finish homework, then play outside"
  5. Daily Routines / "Morning Routine Schedule" / "Build a visual schedule for a morning routine: wake up, brush teeth, get dressed, eat breakfast, pack backpack"
  6. Daily Routines / "Bedtime Schedule" / "Create a visual bedtime routine: bath time, put on pajamas, brush teeth, read a story, lights out"
  7. Academic / "Letter Choice Board" / "Build a choice board with 4 uppercase letters for a letter recognition activity"
  8. Academic / "Color Matching Board" / "Create an interactive color matching activity with 6 colors and their names"

### UI (design via Stitch MCP)

- **Category tabs/filters** — "Communication", "Behavior Support", "Daily Routines", "Academic"
- **Template cards** — name, description, category badge, "Use Template" CTA
- **Responsive** — grid layout adapting to screen size

### "Use Template" flow

- Template card navigates to `/builder?template={templateId}`
- **Builder integration (new code needed):**
  - Add `useSearchParams` to `src/app/(app)/builder/page.tsx` (or a new hook `use-template-starter.ts`)
  - If `?template=` param present, query `api.therapyTemplates.get` by ID from Convex
  - Pass the retrieved `starterPrompt` as an `initialMessage` prop to `<Chat />`
  - `Chat` component must accept and auto-send the initial message on mount (new prop)
- User sees AI start building immediately

### Do NOT build

- No template preview (would require E2B sandbox per card)
- No template editing or favoriting
- No search (categories sufficient for 6-8 templates)

---

## Section 6: My Tools Page

### Data layer

- Query `projects` table (v2), NOT `tools` table (v1)
- `projects` has: `title`, `description`, `fragment`, `sandboxId`, `shareSlug`
- Update `projects.list` to use `.withIndex('by_createdAt')` and `.order('desc')` for newest-first display

### Route placement

- My Tools is at `src/app/(marketing)/my-tools/page.tsx` (marketing layout, no sidebar). This is intentional — after v1 removal there's no app sidebar anyway. Keep it in `(marketing)` for simplicity.

### UI (design via Stitch MCP)

- **Project grid** — cards with title, description, creation date
- **Card actions:**
  - Open — navigate to `/builder` and reload project's chat + preview
  - Share — open share dialog with project's `shareSlug`
  - Delete — confirmation dialog, then remove from Convex
- **Empty state** — "No tools yet — start building!" with CTA to `/builder`
- **Responsive** — 1 col mobile, 2 col tablet, 3 col desktop

### Do NOT build

- No search or filtering
- No pagination
- No duplicate/clone

---

## Section 7: Dependency Updates & Final Cleanup

**Only if time remains after Sections 1-6.**

### Dependency updates

- Run `npm outdated`, update security patches first, then minor versions
- Run tests after each update
- No major version bumps (too risky before deadline)

### VSA cleanup

- Re-evaluate therapy-tools promotion to `src/shared/` after v1 removal (may have fewer consumers)
- Remove orphaned imports and dead code from v1 removal

### Schema prep for auth

- Add optional `userId` field + indexes to `projects` table
- Not enforced — just the column for future Phase 6 integration

### Do NOT do

- No auth integration
- No E2E Playwright tests
- No Lighthouse performance optimization

---

## Key Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Builder architecture | v2 (E2B sandbox) only | More impressive demo, user confirmed |
| Builder v1 | Delete entirely (~946 LOC) | Dead code, confuses architecture |
| Demo format | Recorded video | Allows retries, less risk |
| Shared tool view | Re-spin E2B sandbox from saved code | Simplest path, ~5s load acceptable for demo |
| Template flow | Auto-send starterPrompt to builder chat | One-tap experience, no extra UX needed |
| UI tooling | Stitch MCP + /stitch-design for all frontend | Consistent design system, faster iteration |

## Implementation Order

Sections are designed to be executed sequentially:
1. V1 Removal & Test Fixes (clean foundation)
2. Landing Page Verification (quick audit)
3. Builder V2 Polish (core demo screen)
4. Sharing Flow (rewire for v2)
5. Templates Page (flesh out)
6. My Tools Page (flesh out)
7. Cleanup (if time permits)
