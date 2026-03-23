# UX Screens — Bridges

## Landing Page (`/`)

**Purpose:** Explain Bridges, get visitors to the builder.
**Layout:** Full-width single column. Hero → How It Works → Tool Types → CTA.

- Hero: "Build therapy tools for your child — just describe what you need." + "Start Building" CTA
- How It Works: 3 steps (Describe → Build → Share)
- Tool showcase: icons for 5 tool types with descriptions
- Footer CTA: "Start building — it's free."

## Builder (`/builder`)

**Purpose:** Core experience — chat + live preview.
**Layout:** Split panel. Left: chat (400px desktop, full-width mobile). Right: tool preview (fluid).

**States:**
- Empty: Chat placeholder "Tell me what you need — I'll handle the technical part." Preview: "Your tool will appear here."
- Loading: Streaming chat response + shimmer preview placeholder
- Populated: Conversation + interactive tool preview
- Error: "Hmm, something went wrong. Try describing what you need again."

**Key interactions:**
- Send message → AI streams response → tool renders in preview
- Tap tool elements → tool responds (earn token, select card, etc.)
- Share button (top-right of preview) → share dialog
- "New Tool" → fresh conversation + clear preview
- Mobile: toggle between chat and preview views

## Shared Tool View (`/tool/[toolId]`)

**Purpose:** Public interactive tool — no builder chrome.
**Layout:** Full-width centered tool with padding. Footer: "Build your own — powered by Bridges."

**States:**
- Loading: Skeleton matching tool shape
- Populated: Interactive tool
- Not Found: "This tool isn't available" + CTA to builder

## My Tools (`/my-tools`)

**Purpose:** View and manage saved tools.
**Layout:** Responsive grid (1 col mobile, 2 tablet, 3 desktop).

**States:**
- Empty: "No tools yet. Describe what your child needs, or browse templates." + CTAs
- Populated: Tool cards with title, type badge, date, share + delete buttons

## Templates (`/templates`)

**Purpose:** Browse pre-built templates.
**Layout:** Category tabs + responsive card grid.

**States:**
- Loading: Skeleton cards
- Populated: Categories with template cards (preview thumbnail, title, description)

**Interaction:** Tap template → opens in builder pre-loaded
