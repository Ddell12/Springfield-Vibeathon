# Explore Page — Pre-Built Therapy Tools Showcase

**Date:** 2026-03-29
**Status:** Approved
**Route:** `/explore` (public, no auth required)

## Objective

Add a public `/explore` page where visitors can interact with 6 pre-built therapy tools to see the quality of what Bridges produces — before they sign up or build anything. The page acts as a conversion funnel: see quality → try a tool → customize it or start building.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Page location | Public `(marketing)` group | Maximize exposure to unauthenticated visitors |
| Interaction model | Static cards → "Try It" opens live iframe modal | Avoids 6 simultaneous iframes; fast page load |
| Tool source | Real builder pipeline output | Proves actual product quality; reuses existing infra |
| CTA strategy | Per-tool "Customize This" + bottom "Start Building" | Captures intent at both specific and general moments |
| Route | `/explore` | Inviting, non-technical, expandable |

## Page Structure

### Sections (top to bottom)

1. **Hero** — "See What You Can Build" headline, subtext: "These therapy tools were built entirely by AI — just describe what you need."
2. **Demo Tool Grid** — 6 cards, responsive (1 col mobile / 2 tablet / 3 desktop)
3. **Demo Tool Modal** — Full-viewport overlay with live iframe + CTAs (on "Try It" click)
4. **Bottom CTA** — "These are just examples — describe what YOU need" + "Start Building" primary CTA + "Browse Templates" secondary

### Link Flow

```
Landing page → /explore → "Try It" modal → "Customize This" → /builder?prompt=...
                                          → Close modal → try another
                        → "Start Building" → /builder
                        → "Browse Templates" → /templates
```

## Data Model

### Schema Change — `apps` table

Add 3 optional fields:

```typescript
apps: defineTable({
  // ...existing fields unchanged...
  featured: v.optional(v.boolean()),
  featuredOrder: v.optional(v.number()),       // Display order (1-6)
  featuredCategory: v.optional(v.string()),    // "communication" | "schedule" | "reward" | "social-story" | "emotional" | "speech"
}).index("by_featured", ["featured"])
  // ...existing indexes unchanged...
```

### New Query — `apps.listFeatured`

- **Type:** Public query (no auth required)
- **Behavior:** Returns all apps where `featured === true`, ordered by `featuredOrder`
- **Fields exposed:** `title`, `description`, `shareSlug`, `featuredCategory`, `featuredOrder`
- **No sensitive fields:** Omits `userId`, `sessionId`, internal IDs

## Component Architecture

### Feature Directory

```
src/features/explore/
├── components/
│   ├── explore-page.tsx          # Main page — assembles hero + grid + CTA
│   ├── explore-hero.tsx          # Headline + subtext
│   ├── demo-tool-card.tsx        # Card — gradient thumbnail, title, desc, tag, "Try It"
│   ├── demo-tool-grid.tsx        # Responsive grid, loading skeletons, Convex query
│   ├── demo-tool-modal.tsx       # Full-viewport Dialog with live iframe + CTAs
│   └── explore-cta-section.tsx   # Bottom CTA block
└── lib/
    └── demo-tools.ts             # EXPLORE_DEMO_TOOLS constant (metadata + prompts)
```

### Route File

`src/app/(marketing)/explore/page.tsx` — thin wrapper (< 20 lines):

```typescript
import { ExplorePage } from "@/features/explore/components/explore-page";
export const metadata = { title: "Explore Therapy Tools — Bridges" };
export default function Page() { return <ExplorePage />; }
```

### Component Behaviors

**`demo-tool-grid`**
- Calls `useQuery(api.apps.listFeatured)`
- Loading state: 6 skeleton cards (animated pulse)
- Error/empty fallback: renders from static `EXPLORE_DEMO_TOOLS` constant (graceful degradation)

**`demo-tool-card`**
- Static — no iframe loaded until user clicks
- Gradient thumbnail colored by category (matches templates page pattern)
- Content: title, 1-line description, therapy domain tag pill
- "Try It" button triggers modal open

**`demo-tool-modal`**
- Built on shadcn `Dialog` with full-viewport `DialogContent`
- Live iframe: `<iframe src="/api/tool/{shareSlug}" sandbox="allow-scripts" />`
- Loading skeleton while iframe loads
- "Customize This" → `/builder?prompt={encodedPrompt}`
- Close (X) top-right
- Accessible: `DialogTitle` + `DialogDescription`

**`explore-cta-section`**
- Primary: "Start Building — It's Free" → `/builder` (gradient button)
- Secondary: "Browse Templates" → `/templates` (ghost button)

### Styling

- Manrope headlines, Inter body (existing design system)
- Primary gradient CTAs (`bg-primary-gradient`: `#00595c` → `#0d7377` at 135deg)
- Tonal background shifts for sections (no 1px borders)
- All transitions: `cubic-bezier(0.4, 0, 0.2, 1)`, minimum 300ms
- Mobile-first responsive: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3`
- Semantic tokens: `bg-background`, `text-foreground`, `border-border`

## Demo Tools — The 6 Showcased Apps

| # | Tool | Category | Prompt Source |
|---|------|----------|---------------|
| 1 | Communication Board | communication | Existing `THERAPY_SEED_PROMPTS[0]` |
| 2 | Morning Routine | schedule | Existing `THERAPY_SEED_PROMPTS[1]` |
| 3 | 5-Star Reward Board | reward | Existing `THERAPY_SEED_PROMPTS[2]` |
| 4 | Going to the Dentist | social-story | Existing `THERAPY_SEED_PROMPTS[3]` |
| 5 | Emotion Check-In | emotional | **New** (see below) |
| 6 | Articulation Practice | speech | **New** (see below) |

### New Prompts

**Emotion Check-In:**
> Build an emotion check-in tool for a child in therapy. Show 6 feeling faces (happy, sad, angry, scared, tired, calm) in a grid. When the child taps a feeling, it highlights and asks 'Where do you feel it in your body?' with a simple body outline they can tap. After selecting, show 3 coping strategies (deep breaths, squeeze a pillow, ask for a hug) with pictures. Include a 'I'm ready' button that resets for the next check-in.

**Articulation Practice:**
> Build an articulation practice tool for the 'S' sound. Show a card with a large picture and the target word below (sun, soap, sock, bus, house, yes — 6 words total). The child taps a microphone button to record themselves saying the word, then taps play to hear it back. Include a star button the therapist taps to mark it correct. Show progress as filled stars at the top. When all 6 words are complete, show a celebration.

### Therapy Domain Coverage

Communication (AAC) · Daily Living · Behavior/Reinforcement · Social Skills · Emotional Regulation · Speech Therapy — covers the full spectrum therapists and parents care about.

## Demo Generation & Seeding

### Generation

Run each of the 6 prompts through the real builder pipeline. This can be done:
- **Manually:** Open `/builder`, paste each prompt, wait for generation, save
- **Scripted:** Call `/api/generate` SSE endpoint programmatically

Each run produces: session → files (including `/app.html` bundle) → app record with share slug.

### Seed Mutation — `convex/explore_seed.ts`

Internal mutation to mark generated apps as featured:

```typescript
export const markFeatured = internalMutation({
  args: {
    items: v.array(v.object({
      sessionId: v.id("sessions"),
      category: v.string(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const app = await ctx.db
        .query("apps")
        .withIndex("by_session", (q) => q.eq("sessionId", item.sessionId))
        .first();
      if (app) {
        await ctx.db.patch(app._id, {
          featured: true,
          featuredOrder: item.order,
          featuredCategory: item.category,
        });
      }
    }
  },
});
```

- Run once after generating the 6 tools
- Demo tools created without a userId (or under a system account) so they don't appear in any user's "My Apps"

## Navigation & Landing Page Integration

### Marketing Header

Add "Explore" to the landing page header nav:

```
[Logo: Bridges]                    [Explore]  [Templates]  [Sign In]  [Start Building →]
```

### ProductPreview Section

Add a CTA within the existing `ProductPreview` component on the landing page: "See them in action →" linking to `/explore`.

### No Sidebar Change

`/explore` is a public marketing page — it does not appear in the authenticated app sidebar. Users inside the app already have Templates and Builder.

## Testing

### Unit Tests (Vitest)
- `demo-tool-grid`: renders skeleton on loading, renders cards from query data, falls back to static data on empty
- `demo-tool-card`: renders title/description/tag, calls onTryIt callback on button click
- `demo-tool-modal`: renders iframe with correct src, renders "Customize This" with correct href
- `explore-cta-section`: renders both CTAs with correct hrefs

### E2E Tests (Playwright)
- Navigate to `/explore` — page loads, 6 cards visible
- Click "Try It" on a card — modal opens, iframe loads
- Click "Customize This" — navigates to `/builder?prompt=...`
- Click "Start Building" bottom CTA — navigates to `/builder`
- Mobile responsive — cards stack to single column

## Out of Scope

- Community-featured apps (future: flip `featured` on user apps)
- Analytics/view counting on demo tools
- Category filtering on the explore page (only 6 tools — no need yet)
- Admin UI for managing featured apps (seed mutation is sufficient for 6)
