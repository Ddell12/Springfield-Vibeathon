# Screen Inventory

<!--
MVP FOCUS: Every screen the app needs, with the states that matter most.
Don't obsess over responsive breakpoints or detailed component specs.
Focus: What screens exist? What are the critical states a dev needs to handle?

CONVEX NOTE: All data-fetching screens use reactive queries (useQuery).
Data updates in real-time — no manual refresh needed. Note which screens
benefit from optimistic updates via useMutation.
-->

## Sitemap

<!-- The full page structure. Include modals as sub-items. -->

```
/ (public)
├── /sign-in (Clerk)
├── /sign-up (Clerk)
├── / (dashboard — authenticated)
│   ├── [core feature screens]
│   ├── /settings (Clerk UserProfile or custom)
│   └── /billing (Stripe customer portal link)
└── /404
```

---

## Screens

<!-- One block per screen. Keep it concise. -->

### {Screen Name}
**Route**: {/path}
**Access**: {public / auth required / role-specific}
**Purpose**: {what users do here — one sentence}
**Convex queries**: {which useQuery() calls power this screen}
**Convex mutations**: {which useMutation() calls this screen triggers}

**Key states** (all via Convex reactive queries):
- **Loading**: {Convex query loading — skeleton / spinner}
- **Empty**: {query returns empty array — message + CTA}
- **Loaded**: {normal state — what's displayed, key interactions}
- **Error**: {Convex query/mutation error — what user sees}

**Real-time behavior**: {what updates live without refresh}
**Optimistic updates**: {which mutations use optimistic responses}

**Primary action**: {the #1 thing a user does on this screen}
**Navigation**: {where user can go from here}

---

## Modals / Overlays

<!-- Quick list — don't need full screen cards for these -->

| Modal | Triggered By | What's Inside | Convex Mutation |
|---|---|---|---|
| {e.g., Confirm Delete} | {Delete button} | {Warning message} | {table:remove} |

---

## Global Components

<!-- Things that appear on every/most screens -->

- **Nav**: {sidebar / top bar — what's in it}
- **User menu**: {Clerk UserButton — avatar, manage account, sign out}
- **Notifications**: {toast via Sonner / notification bell / none for MVP}
- **Theme**: {dark/light toggle via next-themes}
- **Loading boundary**: {Suspense fallback — global spinner or per-section skeletons}

---

## Component Libraries

### shadcn/ui Components Needed

| Component | Used In | Notes |
|---|---|---|
| Button | Everywhere | Primary actions |
| Card | Dashboard, lists | Content containers |
| Dialog | Modals | Confirm actions, forms |
| Input / Textarea | Forms | Data entry |
| Form | All forms | React Hook Form + Zod validation |
| Sonner (toast) | Global | Success/error feedback |
| Dropdown Menu | Nav, actions | Context menus |
| Skeleton | Loading states | Query loading placeholders |
| {others} | {where} | {why} |

### AI Chat UI → AI Elements + Vercel AI SDK (never custom)

<!-- If the app has a text-based AI chat interface, use AI Elements -->
- Install: `npx ai-elements@latest add conversation message prompt-input code-block`
- Requires: `ai` + `@ai-sdk/react` (Vercel AI SDK for `useChat` hook)
- {Which AI Elements components are needed — Conversation, Message, PromptInput, CodeBlock, Reasoning, Sources, etc.}
- {Use /ai-elements skill to create/customize}

### Voice AI UI → ElevenLabs UI + React SDK (never custom)

<!-- If the app has voice AI features, use ElevenLabs UI components -->
- Install: `npx @elevenlabs/cli@latest components add conversation-bar orb voice-button mic-selector`
- Requires: `@elevenlabs/react` (for `useConversation` hook)
- {Conversational AI widget, voice selection, audio controls}

### Form Validation → Zod

<!-- All forms validate with Zod schemas shared between client and Convex -->
- Form schemas defined as Zod objects
- Used by React Hook Form (via @hookform/resolvers/zod) on client
- Mirror Convex `args` validators on server (Zod validates client-side, Convex validates server-side)

---

## Screen ↔ Journey Coverage

<!-- Quick check: does every journey step have a screen? -->

| Journey | Screens Used | Any Missing? |
|---|---|---|
| {journey name} | {list of screens} | {gaps} |

---

## Open Questions

- {question}

`[POST-MVP]` screens to add later: {admin panel, analytics dashboard, etc.}
