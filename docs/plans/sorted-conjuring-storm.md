# AI Visual App Builder: Table Stakes Analysis
## Lovable vs. Bridges Gap Report

### Context
Bridges is competing in the AI visual app builder space (think "Lovable for therapy tools"). This report identifies the **table-stakes features** that all users expect from this category, maps them against Bridges' current state, and highlights critical gaps. Based on analysis of 339 Lovable screenshots, web research on Lovable's architecture, and a full audit of the Bridges codebase.

---

## Part 1: How Lovable Works Under the Hood

### Architecture
- **LLMs**: Multi-model orchestration — GPT-4 Mini for fast context selection ("hydration"), Claude 3.5 Sonnet for complex code gen, Gemini Flash as default. Small models select relevant files before large models generate code.
- **Sandboxes**: Cloud-side Modal sandboxes (NOT WebContainers like Bolt.new). Isolated Node.js environments with Vite dev servers. Proven at 1M+ sandboxes and 20K concurrent.
- **Preview**: iframe-based rendering of sandbox output. Real-time HMR via Vite.
- **Visual Editing**: Client-side AST sync — bi-directional mapping between DOM elements and JSX. Click element → trace to JSX → edit properties without LLM round-trip. This is their standout technical achievement.
- **Backend**: "Lovable Cloud" = managed Supabase (PostgreSQL, Auth, Edge Functions, Storage, Secrets). Also supports BYOS (bring your own Supabase).
- **Stack Constraint**: Intentionally opinionated — React + Vite + Tailwind + shadcn + Supabase ONLY. Constraining the solution space dramatically improves output quality.
- **Version Control**: Every edit creates a commit. Full Git history exposed as user-friendly timeline. GitHub sync bidirectional.
- **Deployment**: lovable.app subdomains with custom domain support. One-click publish.

### Key Insight
Lovable's strategy = **make the happy path irresistible**. By owning the full stack (generation → preview → backend → deploy), they remove every friction point. The tradeoff is flexibility — you can't use anything besides their blessed stack.

---

## Part 2: Table Stakes Features (What ALL Users Expect)

Based on analysis of Lovable, Bolt.new, V0, Replit Agent, and user feedback across HN/Reddit/Twitter:

### Tier 1: MUST HAVE (Users won't use the product without these)

| # | Feature | What Users Expect | Bridges Status |
|---|---------|-------------------|----------------|
| 1 | **Natural Language → Working App** | Type a description, get a working app in <60s | ✅ Have (Claude Sonnet + E2B sandbox) |
| 2 | **Live Preview** | See the result immediately, interactive | ✅ Have (iframe + E2B sandbox) |
| 3 | **Iterative Chat Refinement** | "Make the header bigger" → instant update | ✅ Have (chat injects current code as context) |
| 4 | **User Authentication** | Login to save work, own your projects | ❌ Missing (deferred to Phase 6) |
| 5 | **Project Persistence** | Close browser, come back, work is there | ⚠️ Partial (projects saved to Convex, but no user ownership) |
| 6 | **Project Dashboard** | See all my projects, open/delete/organize | ✅ Have (My Tools page with grid) |
| 7 | **Sharing** | Send a link, anyone can view | ✅ Have (share slugs + QR codes) |
| 8 | **Code View** | See what was generated, copy it | ⚠️ Partial (raw code view, no syntax highlighting) |
| 9 | **Responsive Preview** | See how it looks on mobile/tablet/desktop | ❌ Missing |
| 10 | **Error Recovery** | When AI fails, graceful error + retry | ✅ Have (error states + retry logic) |

### Tier 2: EXPECTED (Users notice if missing, impacts retention)

| # | Feature | What Users Expect | Bridges Status |
|---|---------|-------------------|----------------|
| 11 | **Version History / Undo** | See past edits, revert mistakes | ❌ Missing (critical gap) |
| 12 | **Templates / Starter Gallery** | Browse pre-built starting points | ✅ Have (110+ therapy templates, 4 categories) |
| 13 | **Dark Mode** | Theme preference respected | ❌ Missing (next-themes installed but unused) |
| 14 | **One-Click Publish** | Deploy to a live URL | ❌ Missing (no publishing pipeline) |
| 15 | **Custom Domains** | Use my own domain | ❌ Missing |
| 16 | **GitHub Export/Sync** | Get my code into a repo | ❌ Missing |
| 17 | **Code Editing** | Edit the generated code directly | ❌ Missing (copy-paste only) |
| 18 | **Loading States / Progress** | Know what the AI is doing | ✅ Have (streaming + loading carousel) |
| 19 | **Onboarding Flow** | Guided first experience | ❌ Missing |
| 20 | **Suggested Next Steps** | "What's next?" after generation | ❌ Missing (Lovable shows quick-win chips) |

### Tier 3: DIFFERENTIATORS (Lovable has them, nice-to-have)

| # | Feature | What Users Expect | Bridges Status |
|---|---------|-------------------|----------------|
| 21 | **Visual WYSIWYG Editor** | Click elements to edit properties | ❌ Missing (Lovable's standout feature) |
| 22 | **Backend/Database Integration** | Add auth, database, storage | ❌ Missing (Lovable Cloud / Supabase) |
| 23 | **Team Collaboration** | Invite teammates, workspaces | ❌ Missing |
| 24 | **Analytics Dashboard** | See traffic to published apps | ❌ Missing |
| 25 | **Performance Audit** | Lighthouse-style speed checks | ❌ Missing |
| 26 | **Security Scan** | Check for vulnerabilities | ❌ Missing |
| 27 | **Theme Library** | Pre-built color themes | ❌ Missing |
| 28 | **AI Quality Scorecard** | Rate the generated app, suggest improvements | ❌ Missing |
| 29 | **Image Attachment** | Upload screenshot/mockup as reference | ❌ Missing |
| 30 | **Community Discover** | Browse apps others have built | ❌ Missing |

---

## Part 3: Critical Gap Analysis for Bridges

### What Bridges Has That Lovable Doesn't
These are Bridges' **structural advantages** in the therapy niche:

1. **Domain-Specific RAG** — 110+ therapy knowledge entries powering contextual AI responses. Lovable is generic; Bridges speaks therapy language.
2. **Pre-Built Therapy Components** — VisualSchedule, TokenBoard, CommunicationBoard are purpose-built, not generic HTML. Config-based generation is more reliable than arbitrary code gen.
3. **TTS Integration** — ElevenLabs for communication boards (planned). Critical for non-verbal users.
4. **AI Image Generation** — Nano Banana Pro for therapy picture cards (planned). No stock images.
5. **Convex Real-Time Backend** — True reactive data (queries auto-update). Lovable uses Supabase which requires manual refresh patterns.
6. **Config-Based Tool Generation** — JSON configs → pre-built components. More constrained = more reliable output for therapy tools.

### Critical Gaps (Ordered by Impact)

#### GAP 1: User Authentication (BLOCKER)
- **Impact**: Without auth, nothing is truly "mine". Projects are globally accessible.
- **Lovable**: Google, GitHub, email auth with workspace separation
- **Bridges**: Nothing. Deferred to Phase 6.
- **Recommendation**: This is the #1 blocker for any real user adoption. Must be prioritized for vibeathon demo credibility.
- **Files**: No auth files exist yet. Clerk is the planned provider.

#### GAP 2: Version History / Undo (HIGH)
- **Impact**: Users WILL make mistakes. Without undo, one bad prompt can destroy hours of work.
- **Lovable**: Full edit timeline with timestamps, revert any change, branching
- **Bridges**: Only current fragment stored. Previous versions lost forever.
- **Recommendation**: Store version snapshots in Convex. Even a simple "last 10 versions" array would be transformative.
- **Files**: `convex/projects.ts` (add versions array), `convex/schema.ts` (add versions field)

#### GAP 3: Responsive Preview (HIGH)
- **Impact**: Therapy tools are used on iPads/phones. Users MUST see mobile rendering.
- **Lovable**: Breakpoint toggle bar (mobile/tablet/desktop) in preview header
- **Bridges**: Full-width preview only.
- **Recommendation**: Add 3 breakpoint buttons to preview header. Resize iframe width.
- **Files**: `src/features/builder-v2/components/preview.tsx`

#### GAP 4: Onboarding + Suggested Next Steps (MEDIUM-HIGH)
- **Impact**: First-time users don't know what to type. Drop-off is immediate.
- **Lovable**: Personalization wizard → theme choice → prompt suggestions → "What's next?" chips after every generation
- **Bridges**: Raw empty chat input. No guidance.
- **Recommendation**: Add prompt suggestions carousel + post-generation action chips.
- **Files**: `src/features/builder-v2/components/chat.tsx`

#### GAP 5: Syntax-Highlighted Code View (MEDIUM)
- **Impact**: Developers/power users want to understand the code. Raw text feels unfinished.
- **Lovable**: Full syntax highlighting, line numbers, "Open in Code Editor" links, diff view
- **Bridges**: Raw `<pre>` block with copy button only.
- **Recommendation**: Add a lightweight syntax highlighter (Shiki or Prism).
- **Files**: `src/features/builder-v2/components/preview.tsx` (code tab section)

#### GAP 6: Dark Mode (MEDIUM)
- **Impact**: Accessibility and user preference. Many users default to dark mode.
- **Lovable**: Full dark mode with onboarding toggle
- **Bridges**: Light only. `next-themes` ThemeProvider is installed but never toggled.
- **Recommendation**: Add toggle to header. Design tokens already support it (`:root` / `.dark` in globals.css).
- **Files**: `src/app/globals.css`, `src/shared/components/` (add toggle)

#### GAP 7: Download/Export (MEDIUM)
- **Impact**: Users want to take their code and leave. "Vendor lock-in" is the #1 AI builder complaint.
- **Lovable**: View on GitHub, Open in Code Editor, full source export
- **Bridges**: Copy to clipboard only.
- **Recommendation**: Add "Download as HTML" button. Single-file export.
- **Files**: `src/features/builder-v2/components/preview.tsx`

---

## Part 4: Vibeathon Priority Matrix

For the Springfield Vibeathon demo, here's what matters most:

### Must Demo (Judges Will Look For)
1. ✅ Natural language → working therapy tool (HAVE)
2. ✅ Live interactive preview (HAVE)
3. ✅ Iterative refinement via chat (HAVE)
4. ✅ Template gallery (HAVE)
5. ✅ Share link with QR code (HAVE)
6. ⚠️ Responsive preview (QUICK WIN — just resize iframe)
7. ⚠️ Code view with highlighting (QUICK WIN — add Shiki)

### Would Impress Judges
8. Version history (undo last change)
9. Suggested next steps after generation
10. Dark mode toggle
11. Download as HTML
12. AI quality scorecard

### Skip for Demo (Post-Vibeathon)
- User auth (complex, not demo-visible)
- Team collaboration
- Custom domains
- Analytics
- GitHub sync
- Visual WYSIWYG editor

---

## Part 5: Lovable Feature Inventory (Complete)

From 339 screenshots analyzed:

### Landing & Marketing
- Hero with animated gradient background and centered chat prompt
- "Attach" button (upload images/screenshots as reference)
- "Theme" selector on prompt input
- "Chat" mode toggle
- Template discovery carousel at bottom
- Gift card purchase flow

### Authentication & Onboarding
- Sign-up modal: Google, GitHub, email
- Split-layout account creation (form left, gradient preview right)
- Multi-step personalization: name → theme (light/dark) → Next
- Step indicators (dot pagination)

### Dashboard / Home
- Left sidebar: Home, Search, All projects, Starred, Shared with me, Discover, Templates, Learn
- Tabs: Recently viewed, My projects, Shared with me, Templates
- Project cards with thumbnails, "Published" badges, timestamps
- "Browse all" templates link
- Referral program ("Share Lovable, Get 10 credits each")
- "Upgrade to Business" CTA
- Feature announcement modals

### Builder (Core Experience)
- Split layout: chat left, preview right
- Top bar: Preview/Code toggle, responsive breakpoints (7 sizes), Share, Publish buttons
- AI thinking indicator ("Thought for 30s")
- Streaming response with design direction + feature lists
- "What's next?" suggestions after completion
- Quick-action chips: "Add Project Images", "Add Contact Form", "Add Scroll Animation"
- "Connect Supabase" integration link
- "Visit docs" link
- Edit counter ("11 edits made" with "Show all")
- "Refactoring styling and routing" status with "Previewing latest version"

### Visual Editor
- "Visual edits" mode — select elements to edit
- Design tab: Colors (text/background), Spacing (margin/padding), Layout (direction/alignment/gap), Border
- "Select parent" button for DOM traversal
- Image reference upload in chat context
- Hold Ctrl for multi-select

### Code View
- Full React/TSX source with syntax highlighting
- Per-file tabs with "Open in Code Editor" buttons
- "View on GitHub" button
- Code change summaries ("Code changes: Refactor styling and rou...")

### Version History
- Timeline of all edits with timestamps
- Revert capability ("1 edit reverted")
- "Back to latest" navigation

### Publish / Deploy
- Published URL (auto-generated subdomain)
- Edit URL subdomain
- Custom domain connection (add existing or purchase new)
- "Who can visit the URL?" access control (Anyone, etc.)
- Website metadata: favicon, title, description, share image
- Security scan with warnings + "Review security" / "Updated" buttons

### Lovable Cloud (Backend)
- Overview dashboard
- Database: view tables, edit data
- Users: auth settings, 0 signups counter
- Storage: file management, 0 buckets
- Edge functions: server-side code, 0 functions
- AI: AI feature settings
- Secrets: env var management
- Logs: server logs

### Analytics
- Visitors, Pageviews, Views/Visit, Visit Duration, Bounce Rate
- Time-series chart (7-day view)
- Traffic source breakdown (Direct, referral)
- Top pages
- Country breakdown
- Device split (Mobile vs Desktop)
- "0 current visitors" real-time counter

### Performance / Speed
- Lighthouse-style audit with scores
- Issue-by-issue breakdown with "Try to fix" buttons
- Render blocking requests analysis
- Cache lifetime recommendations
- Mobile page screenshot

### Quality Scorecard
- AI-generated project rating
- Category breakdown: Design, Functionality, Polish/Details
- Current vs Potential scores (e.g., 7.6 → 8.6)
- Actionable improvement suggestions (bulleted list)
- Quick-win action chips

### Share
- Share preview with mobile thumbnail
- Public link with 7-day expiry
- "Copy preview link" button

### Theme System
- Pre-built themes: Default, Glacier, Harvest, Lavender, Brutalist, Obsidian, Orbital, Solar, Tide
- One-click Apply with live preview
- Edit/Delete existing themes
- Create custom themes
- Success toast notifications

### Discover / Community
- Public showcase of published apps
- Featured hero cards with interactive thumbnails
- Curated collections ("Explore Festive Apps")
- Creator profiles with About, portfolio, media
- Username setup for community identity

### Settings
- **Project settings**: URL subdomain, project visibility, project category, "Hide Lovable badge", remove project
- **Domains**: Custom domain management, buy new domain
- **Knowledge**: Project context documents
- **Workspace**: People (roles: Owner/Admin/Editor/Viewer/Collaborator), Plans & credits, Cloud & AI balance, Privacy & security
- **Account**: Syntax preferences, Labs (experimental features)
- **Connectors**: Composites, GitHub integration

### Project Management
- All projects grid with search
- Filters: Last edited, visibility, status, creators
- Sort: Last edited, Date created, Alphabetical A-Z/Z-A
- Grid/List toggle
- Move to folder
- "Create new project" card

### Pricing
- Free: 5 daily credits (no rollover)
- Pro: $25/mo, 100 credits (rollover, 5 daily credits up to 150/month), Usage-based Cloud + AI
- Business: $50/mo, 100 credits, Internal publish, SSO
- Enterprise: Custom pricing
- Credit remaining bar with progress
- Downgrade confirmation with clear consequences list
- Credit tier upgrades (200 credits/month option)

### Workspace / Team
- Member management table (name, email, role, status, usage, date joined, limits)
- Invite by email with role selection
- Tabs: All, Active, Pending
- Filter by role checkboxes
- Export button
- Usage tracking per member

---

## Part 6: Implementation Plan — Closing Critical Gaps Before Vibeathon

### Context
Today is Day 2 of 5 (March 24, 2026). Vibeathon ends March 27. We have ~3 days to close the highest-impact gaps. The goal is NOT Lovable parity — it's making Bridges feel polished and complete for the demo. Every change should be visible to judges.

### Existing Assets (Already Built — Correct Inventory)
The codebase has MORE than initially apparent:
- **Download button** — Already in `builder-header.tsx` line 57-65 + handler in `builder/page.tsx` line 124-133 ✅
- **Suggested actions** — `suggested-actions.tsx` with context-aware chips per tool type ✅
- **Share dialog** with QR code ✅
- **Publish button** — Exists in header (placeholder, no pipeline behind it) ⚠️
- **View mode toggles** — Preview/Cloud/Code/Analytics icons in header (cosmetic only) ⚠️
- **`next-themes`** — Installed, ThemeProvider wired in providers.tsx, but no toggle or dark tokens ⚠️

---

### Sprint 1: Quick Wins (Day 2 — ~4 hours)
High-impact, low-effort changes that dramatically improve perceived polish.

#### 1.1 Responsive Preview Breakpoints
**Impact:** HIGH | **Effort:** LOW (1 hour)
**Why:** Therapy tools are used on iPads. Judges will ask "does it work on mobile?"

**Files to modify:**
- `src/features/builder-v2/components/preview.tsx` — Add breakpoint state + buttons to header
- `src/features/builder-v2/components/fragment-web.tsx` — Accept width prop, wrap iframe in responsive container

**Implementation:**
```
Add 3 breakpoint buttons to preview header bar (between title and view toggle):
- 📱 Mobile (375px)
- 📱 Tablet (768px)
- 🖥️ Desktop (100%)

State: const [breakpoint, setBreakpoint] = useState<"mobile" | "tablet" | "desktop">("desktop")
FragmentWeb: change className from "w-full" to dynamic width with centered positioning
When breakpoint !== "desktop", show a device frame outline (border + rounded corners)
```

#### 1.2 Syntax-Highlighted Code View
**Impact:** MEDIUM-HIGH | **Effort:** LOW (1 hour)
**Why:** Raw `<pre>` text looks unfinished. Syntax highlighting = instant credibility.

**Files to modify:**
- `package.json` — Add `shiki` (MIT, lightweight, same highlighter VS Code uses)
- `src/features/builder-v2/components/code-view.tsx` — NEW file, extract code panel from preview.tsx
- `src/features/builder-v2/components/preview.tsx` — Import CodeView component

**Implementation:**
```
npm install shiki
Create <CodeView code={string} /> component:
- Use shiki's `codeToHtml()` with "one-dark-pro" theme
- Add line numbers via shiki's lineNumbers option
- Keep existing Copy button
- Add "Download" button (reuse existing download handler pattern from page.tsx)
```

#### 1.3 Dark Mode Toggle
**Impact:** MEDIUM | **Effort:** LOW (1 hour)
**Why:** Many people default to dark mode. Shows attention to accessibility.

**Files to modify:**
- `src/app/globals.css` — Add `.dark` class with inverted Material 3 tokens
- `src/shared/components/theme-toggle.tsx` — NEW file, sun/moon toggle button
- `src/features/builder-v2/components/builder-header.tsx` — Add toggle to header actions
- `src/app/(marketing)/page.tsx` — Add toggle to landing page header if applicable

**Implementation:**
```
globals.css: Add .dark { } block overriding all --color-surface-*, --color-on-surface-*, --color-primary-* tokens
Theme toggle: useTheme() from next-themes, cycle light/dark, MaterialIcon "light_mode"/"dark_mode"
Place in builder header between Download and New buttons
```

#### 1.4 Version History (Simple)
**Impact:** HIGH | **Effort:** MEDIUM (2 hours)
**Why:** Without undo, one bad prompt destroys work. This is the #1 user anxiety.

**Files to modify:**
- `convex/schema.ts` — Add `versions` field to projects table
- `convex/projects.ts` — Add `saveVersion` mutation, `listVersions` query, `restoreVersion` mutation
- `src/features/builder-v2/components/version-history.tsx` — NEW file, dropdown showing past versions
- `src/features/builder-v2/components/preview.tsx` — Add version history trigger to header
- `src/app/(app)/builder/page.tsx` — Wire version save into handleFragmentGenerated

**Implementation:**
```
Schema: Add to projects table:
  versions: v.optional(v.array(v.object({
    fragment: v.any(),
    title: v.string(),
    timestamp: v.number(),
  })))

On each handleFragmentGenerated:
  - Before updating, push current fragment to versions array (max 20, FIFO)

Version history UI:
  - Clock icon button in preview header
  - Dropdown/popover showing versions with timestamps
  - Click to restore (sets fragment + boots sandbox)
  - "Current" badge on latest
```

---

### Sprint 2: Demo Polish (Day 3 — ~4 hours)

#### 2.1 Onboarding Prompt Suggestions
**Impact:** HIGH | **Effort:** LOW (1 hour)
**Why:** Empty chat is intimidating. Judges need to see the "magic moment" instantly.

**Files to modify:**
- `src/features/builder-v2/components/prompt-home.tsx` — Add example prompt cards

**Implementation:**
```
Add 4 clickable prompt cards below the input:
- "Build a morning routine visual schedule for a 5-year-old"
- "Create a token board with star rewards for staying on task"
- "Make a communication board with food and drink choices"
- "Design a first-then board for homework before iPad"

Each card: icon + title + description, onClick fills input and auto-submits
Layout: 2x2 grid on desktop, vertical stack on mobile
```

#### 2.2 Message Persistence
**Impact:** HIGH | **Effort:** MEDIUM (2 hours)
**Why:** Close browser, reopen, conversation is gone. Critical for "real app" feel.

**Files to modify:**
- `convex/schema.ts` — Already has `messages: v.optional(v.any())` on projects ✅
- `convex/projects.ts` — Update mutation already accepts messages ✅
- `src/features/builder-v2/components/chat.tsx` — Save messages on each interaction, restore on project load
- `src/app/(app)/builder/page.tsx` — Pass restored messages to Chat

**Implementation:**
```
After each assistant response completes:
  - Serialize messages array (strip thinking/building types, keep user + complete)
  - Call updateProject with messages field

On project load from ?project= URL:
  - Restore messages from loadedProject.messages
  - Pass as initialMessages prop to Chat

Chat component:
  - Accept optional initialMessages prop
  - Initialize state with restored messages instead of just WELCOME_MESSAGE
```

#### 2.3 Project Search + Sort
**Impact:** MEDIUM | **Effort:** LOW (1 hour)
**Why:** With multiple demo projects, search/sort makes the dashboard feel real.

**Files to modify:**
- `src/features/my-tools/components/my-tools-page.tsx` — Add search input + sort dropdown
- `convex/projects.ts` — Client-side filtering is fine for demo (small dataset)

**Implementation:**
```
Add above the grid:
  - Search input (filter by title, client-side)
  - Sort dropdown: "Newest", "Oldest", "A-Z"
  - Project count badge: "X tools"
```

---

### Sprint 3: Stretch Goals (Day 4 — if time allows)

#### 3.1 AI Quality Scorecard
After tool generation, show a quality assessment (Design: 4/5, Accessibility: 3/5, etc.) with improvement suggestions. Would use a separate lightweight Claude call.

#### 3.2 Image/Screenshot Upload as Reference
Add an "Attach" button to chat input that lets users upload a screenshot. Send as base64 to Claude's vision API.

#### 3.3 Template Search
Add a search bar to the templates page to filter the 110+ templates.

---

### Critical Files Summary

| File | Changes |
|------|---------|
| `src/features/builder-v2/components/preview.tsx` | Breakpoint buttons, version history trigger |
| `src/features/builder-v2/components/fragment-web.tsx` | Responsive width prop |
| `src/features/builder-v2/components/code-view.tsx` | NEW — syntax highlighted code panel |
| `src/features/builder-v2/components/version-history.tsx` | NEW — version dropdown |
| `src/features/builder-v2/components/chat.tsx` | Message persistence, initial messages |
| `src/features/builder-v2/components/prompt-home.tsx` | Prompt suggestion cards |
| `src/features/builder-v2/components/builder-header.tsx` | Dark mode toggle |
| `src/shared/components/theme-toggle.tsx` | NEW — sun/moon toggle |
| `src/app/globals.css` | Dark mode tokens |
| `convex/schema.ts` | versions field on projects |
| `convex/projects.ts` | saveVersion, listVersions, restoreVersion |
| `package.json` | Add shiki |

### Existing Utilities to Reuse
- `cn()` from `src/core/utils.ts` — class merging
- `MaterialIcon` from `src/shared/components/material-icon.tsx` — consistent icons
- `useTheme()` from `next-themes` — already installed
- `FragmentSchema` from `src/features/builder-v2/lib/schema.ts` — Zod validation
- `motion` animations — consistent with existing animation patterns
- `sonner` toast — for success/error notifications
- `react-resizable-panels` — already used in builder layout

### Verification
After each sprint:
1. `npm run test:run` — All 51+ tests pass
2. `npm run build` — No build errors
3. `npm run dev` — Manual verification:
   - Responsive preview: Toggle breakpoints, verify iframe resizes
   - Code view: Verify syntax highlighting renders correctly
   - Dark mode: Toggle theme, verify all surfaces invert properly
   - Version history: Generate 2+ versions, verify restore works
   - Message persistence: Generate tool, refresh page with ?project=id, verify messages restore
   - Prompt suggestions: Verify cards render, click auto-submits
4. `npm run test:e2e` — E2E tests still pass
