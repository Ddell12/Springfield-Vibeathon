# AI App Builder UX Research: Lovable vs Bolt.new vs v0

Research date: March 2026
Purpose: Interaction-by-interaction comparison for Bridges builder UX design

---

## 1. Onboarding Flow

### Lovable
- **Signup:** Google or GitHub OAuth. No credit card required for free tier.
- **Personalization:** Short questionnaire after signup — name, theme preference (dark mode), what you'll use Lovable for, self-description ("designer," "founder," etc.), what you're building. Feels slightly long but enables personalization.
- **First screen:** Clean dashboard with a prominent prompt input box. Dynamic placeholder text rotates through suggestions like "Ask Lovable to build your SaaS startup" — this IS the onboarding. No separate tutorial or walkthrough.
- **Incentives:** Earn 5 credits for adding a custom domain or inviting a collaborator.
- **Time to value:** Under 2 minutes from signup to first generation.

### Bolt.new
- **Signup:** GitHub or email. Minimal friction.
- **No onboarding:** No welcome message, no checklist, no guided tour. Intentionally stripped-down. You land directly on a page with the headline "What should we build today?" and a prompt input.
- **Below the input:** Options to import from Figma or GitHub (power-user affordances).
- **Philosophy:** Zero ceremony — get straight to building.
- **Time to value:** Under 1 minute.

### v0.dev
- **Signup:** Vercel account (GitHub/email).
- **First screen:** Chat-based interface. Type what you want to build, and generation begins immediately.
- **Templates:** Prominent template gallery with community starters (Next.js + shadcn/ui, dashboards, forms). Templates show fork counts as social proof.
- **Philosophy:** "Playground" feel — explore, fork, remix.
- **Time to value:** Under 1 minute.

### Table Stakes
All three skip lengthy onboarding wizards. The prompt box IS the onboarding. Dynamic placeholder text guides first-time users.

---

## 2. Builder Interface Layout

### Lovable
- **Split-screen:** Chat panel (left) + Live preview (right)
- **Top bar:** Project name, Supabase connection button, Invite button, Publish button
- **Bottom of chat:** Prompt input with Visual Edits toggle, Plan Mode icon button, attachment support
- **Modes:** Default (generates code), Chat Mode (discuss without code changes), Dev Mode (direct code editing), Visual Edits (Figma-like click-to-edit)
- **Sidebar:** Recent projects, workspace selector (reorderable), folder organization with nesting up to 3 levels
- **Dashboard:** Grid/list view toggle, star favorites, drag-drop folder organization, bulk selection, "Last viewed" sort

### Bolt.new
- **Three-panel layout:** File explorer (left) + Code editor (center) + Live preview (right)
- **Chat:** Overlaid on the interface, conversational
- **Terminal:** Accessible for debugging
- **Philosophy:** VS Code-like IDE in the browser. More technical feel.
- **File management:** Lock files to prevent AI modification. Target specific files for changes.
- **Preview:** Runs the actual application — not a static render. Click through flows, submit forms.

### v0.dev
- **Two-panel:** Chat (left) + Live preview (right)
- **Code panel:** Toggle to view generated code alongside preview
- **Git panel:** Create branches, open PRs against main
- **Philosophy:** Conversational with immediate visual results
- **Templates:** Browse and fork community components

### Design Insight for Bridges
Lovable's approach (chat + preview, no exposed file tree) is the most beginner-friendly. Bolt's IDE layout intimidates non-technical users. v0 sits in between.

---

## 3. Generation Experience (The "Build" Moment)

### Lovable
- **Speed:** ~20 seconds for simple UIs, ~90 seconds for moderately complex apps
- **Streaming:** Code streams in real-time. Recent updates improved streaming quality — "smoother experience and no more flashing text"
- **Preview update:** Changes appear in the preview iframe in real-time as code streams
- **Visual feedback:** The preview panel shows the app assembling live — you watch it build
- **AI response:** Concise (< 2 lines of text), then shows the result. No lengthy explanations.
- **Post-generation:** AI provides a very concise summary of changes made
- **Credit cost:** Not shown before generation — only revealed after (major user complaint)

### Bolt.new
- **Streaming:** Code streams via server-sent events (SSE). Parser detects structured artifacts and actions, queuing them for execution.
- **Visual feedback:** "Visual feedback while the app was being generated" — real-time preview updates
- **Preview:** Live application preview updates without manual reload
- **Speed:** Described as having "fastest generation times" among the three
- **Post-generation:** App is immediately interactive and testable

### v0.dev
- **Animation:** "Cool animation as if it was 'printing' my website" — code appears character by character
- **Multiple options:** Historically showed several generated versions to choose from (component mode)
- **Preview:** Fully interactive — click buttons, interact with forms during preview
- **Streaming:** Real-time with visual progress indicators and rich UI feedback for agent actions
- **AI narration:** Explains what it's going to do, makes changes, then explains what it did

### Table Stakes
- Real-time code streaming with live preview updates
- Interactive preview (not static screenshots)
- Sub-2-minute generation for simple apps
- Visual indication that something is happening (streaming text/code)

### Unique Patterns
- **Lovable:** Concise AI responses, preview-focused (de-emphasizes code)
- **Bolt:** Exposes the build process (file creation, npm install visible in terminal)
- **v0:** Narrative approach — AI explains before and after

---

## 4. Iteration / Edit Flow

### Lovable
- **Chat iteration:** Type follow-up prompts ("make the header bigger", "add dark mode")
- **Visual Edits:** Click any element in preview -> floating combo-box controls appear -> adjust color, font, spacing, sizing directly. Like simplified Figma. Does NOT consume AI credits.
- **Select + Reference:** Click an element in preview, then reference it in chat for targeted modifications
- **Plan Mode:** Rich-text editor for planning changes before committing — discuss strategy without code generation
- **Chat Mode Agent:** Reasons across the whole project for planning/debugging without risky edits
- **Preview update:** Changes reflected instantly in the live preview
- **Rollback:** Version history with ability to revert to stable states
- **Credit display:** Unified credit counter. Simple styling changes ~0.5 credits, complex features 1.2+ credits. No preview of cost before action.

### Bolt.new
- **Chat iteration:** Back-and-forth conversation for changes
- **Direct code editing:** Switch to code editor and modify files directly
- **File targeting:** "Target file" feature focuses AI changes on specific files
- **File locking:** Lock files to prevent AI from modifying them
- **Diff preview:** Toggle between diff view and original preview in settings
- **Enhance prompt:** Built-in feature to add detail to your initial prompt

### v0.dev
- **Chat iteration:** Natural language refinement ("make the cards bigger", "change to dark theme")
- **Fork chat:** Branch from any point to try alternate directions without losing work
- **Multiple versions:** Can generate several options and pick favorites
- **Code view:** Switch to Code mode to inspect generated TypeScript/React

### Table Stakes
- Natural language iteration through chat
- Instant preview updates
- Version history / rollback

### Unique Patterns
- **Lovable's Visual Edits** (click-to-edit without credits) is a standout differentiator
- **Bolt's file locking** gives power users surgical control
- **v0's fork/branch** model enables exploration without commitment

---

## 5. Error Handling

### Lovable
- **"Try to Fix" button:** Appears when errors are detected. AI scans logs, detects issues, attempts auto-fix. Does not consume message credits.
- **Detailed error messages:** Shows actual error content and context (recent improvement)
- **Publishing failures:** Now visible with built-in "Try to fix" action
- **Preview issues:** Automatic retry detection for transient failures. No more stuck "Try to fix" states.
- **Chat Mode debugging:** Ask the AI to troubleshoot without making code changes
- **Security scan:** Runs automatically before publishing to surface vulnerabilities
- **Known issue:** AI sometimes reports bugs as fixed when they aren't (phantom repairs)

### Bolt.new
- **Self-healing:** "Even a small bug resolved itself with minimal guidance"
- **Auto-fix:** Automatically tests, refactors, and iterates to reduce errors
- **Terminal access:** Debug directly in the browser terminal
- **Philosophy:** Fix through conversation — describe the bug, get a fix

### v0.dev
- **Error fixing agent:** Autonomous error fixing capability
- **Post-export issues:** Component naming conflicts, missing dependencies can occur after code export (requires manual fixes)
- **Web search:** Agent can search the web to find solutions

### Table Stakes
- AI-powered auto-fix for common errors
- Ability to describe bugs in natural language and get fixes

### Bridges Insight
The "Try to Fix" button pattern is brilliant UX for non-technical users — it removes the need to understand the error. Just click and let AI handle it.

---

## 6. Responsive Preview

### Lovable
- **Device switcher:** Top of canvas with breakpoint toggles — Desktop, Tablet, Mobile Landscape, Mobile Portrait
- **Mobile view:** Dedicated preview mode for responsive design verification
- **New tab preview:** Open in clean browser for full-width testing
- **Mobile UX overhaul:** Sheets replacing popovers for native mobile feel. Chat suggestions appear on mobile.
- **Auto-responsive:** Generated apps include responsive layouts by default

### Bolt.new
- **Live preview panel:** Resizable preview area within the IDE
- **Full app preview:** The preview runs the actual application — test across any size by resizing the panel
- **Auto-responsive:** Built apps are responsive by default

### v0.dev
- **Interactive preview:** Fully functional component preview
- **Full-page preview:** Open in new tab for full-screen testing
- **Components responsive by default:** Uses Tailwind CSS for responsive output

### Table Stakes
- Some form of mobile/desktop preview toggle
- Generated output is responsive by default

### Bridges Insight
Lovable's explicit device-switcher icons (desktop/tablet/mobile) are the most discoverable pattern for non-technical users who need to verify their therapy tool works on an iPad.

---

## 7. Share / Publish Flow

### Lovable
- **Publish modal:** Top-right corner icon opens multi-step flow:
  1. Configure website address (subdomain or custom)
  2. Set access permissions (Anyone vs. Workspace)
  3. Customize metadata (favicon with auto-cropping, title, description, OG image)
  4. Review security vulnerabilities
  5. Click Publish
- **Confirmation:** Pop-up with the published live link
- **Updates:** Click Publish -> Update for subsequent changes
- **Custom domains:** Built into Lovable (paid plans). 10,000+ custom domains connected.
- **GitHub sync:** Automatic two-way sync with GitHub repos

### Bolt.new
- **One-click deploy:** Push to production directly from the editor
- **Netlify integration:** Built-in deployment option
- **GitHub export:** Code export for external hosting

### v0.dev
- **Deploy to Vercel:** Native one-click deployment
- **Code export:** Copy code or use `npx` command to scaffold local project
- **GitHub integration:** Create repos, open PRs from within v0
- **Share links:** Public URLs for sharing generated components/apps
- **Fork:** Others can fork your shared work

### Table Stakes
- One-click deployment to a live URL
- Shareable link after publishing

### Unique Patterns
- **Lovable's** metadata customization (favicon, OG image) before publish is the most polished
- **v0's** fork/share model creates community and social proof
- **Bolt's** simplicity (single click) is the fastest path

---

## 8. Empty States & Dashboard

### Lovable
- **New user dashboard:** Clean interface with a prominent prompt box. No projects yet = the prompt IS the call to action.
- **Dynamic placeholder:** Rotating suggestions in the prompt input ("Build a SaaS dashboard", "Create a portfolio site")
- **Community projects:** Shown on dashboard for inspiration and remixing
- **Templates:** Available to browse, preview, and remix
- **Dashboard organization (with projects):** Grid/list toggle, folders (3 levels deep), drag-drop, star favorites, bulk selection, "Last viewed" sort

### Bolt.new
- **Empty state:** "What should we build today?" headline. Subtitle: "Create stunning apps & websites by chatting with AI." Below: import from Figma/GitHub.
- **No project history prominent:** Focus is entirely on the next creation, not past work.

### v0.dev
- **Template gallery:** Prominent community templates and starters as the landing experience
- **Social proof:** Fork counts on templates
- **Community:** Browse "best apps, components and starters from the community"

### Bridges Insight
For non-technical users (therapists/parents), showing example therapy tools on the empty dashboard would be the Lovable equivalent of "community projects" — but domain-specific.

---

## 9. Micro-Interactions & Hover States

### Lovable (documented)
- **Visual Edits floating controls:** Combo-box appears adjacent to selected element
- **Active edit cards:** Highlighted to show which card is currently being edited
- **Plan Mode toggle:** Icon button in prompt box, aligned with other controls
- **Desktop notifications:** Alerts when long-running builds complete
- **Chat suggestions:** Context-aware next-step recommendations appear after generation
- **Screenshot previews on hover:** In edit history, hovering shows preview thumbnails
- **Mobile sheets:** Popovers replaced with sheets for touch-friendly interaction
- **Streaming text:** Smooth streaming with no flashing (recent fix)

### Bolt.new (documented)
- **Element inspection:** Click elements in preview to highlight them for inspection
- **Live terminal:** Real-time build output visible
- **Diff toggle:** Switch between diff view and full preview

### v0.dev (documented)
- **Code printing animation:** Characters appear as if being "printed" during generation
- **Fork button:** Branch from any conversation point
- **Share links:** Generate public URLs for any generation

### What's NOT well-documented (gaps = opportunities for Bridges)
- Button hover effects (scale, color shift, shadow)
- Input focus states (ring, glow, label animation)
- Transition animations between states (chat -> preview, empty -> populated)
- Celebration moments (confetti, checkmark, success animation after first generation)
- Skeleton loading states during generation
- Progress indicators (percentage, step counter)
- Sound design (click feedback, completion chime)

---

## 10. Credit / Token Display

### Lovable
- **Unified credits display:** Single clean view consolidating all credit types
- **No cost preview:** Does not tell you how many credits an action will cost until AFTER it's done (major user complaint)
- **Free tier:** 5 credits/day (30/month cap)
- **Visual Edits:** Free (no credit cost) — major UX win
- **Chat Mode:** 1 credit per message
- **"Try to Fix" button:** Free (no credit cost)
- **Cost variance:** Simple styling ~0.5 credits, complex features 1.2+ credits

### Bolt.new
- **Token-based:** Uses tokens rather than message credits
- **Less transparent:** Token consumption varies by task complexity

### v0.dev
- **Generation-based:** Credits consumed per generation
- **Free tier:** Limited generations per day

### Bridges Insight
The credit anxiety is real for non-technical users. Lovable's smartest move was making Visual Edits and "Try to Fix" free — it removes fear of wasting credits on small tweaks or error recovery.

---

## 11. What Non-Technical Users Specifically Praise

### Lovable
- "Idea to deployed MVP in under 3 hours" (vs 5-8 hours with Bolt)
- Visual editor feels like "simplified Figma" — familiar mental model
- One-click deployment removes infrastructure complexity
- Chat-based interaction feels natural, not technical
- "You explain your business idea and Lovable translates it into a working application"

### Bolt.new
- "What should we build today?" messaging feels inviting
- The full app runs in the preview — you can click through real flows
- Speed of generation is impressive
- One-click deploy is frictionless

### v0.dev
- "Felt like magic" and "jaw-drop moments"
- "Like pair programming with someone who actually understands"
- Beautiful default output (shadcn/ui components)
- Template gallery provides inspiration and starting points

### Common Praise (Table Stakes for Any Builder)
- Speed: functional prototype in minutes, not days
- No local setup required (everything in browser)
- Natural language input (no code knowledge needed)
- Live preview of results
- One-click deployment

### Common Complaints
- AI sometimes introduces new bugs while fixing others ("bug loop")
- Credit/token systems feel unpredictable
- Complex features still require some technical understanding
- Responsive design needs manual verification
- Backend integrations (auth, database) can confuse non-technical users

---

## 12. Comparative Summary: Interaction Patterns

| Interaction | Lovable | Bolt.new | v0.dev |
|---|---|---|---|
| **First impression** | Clean dashboard + prompt | "What should we build?" | Template gallery + prompt |
| **Generation feedback** | Streaming code + live preview | Streaming + terminal + preview | "Printing" animation + preview |
| **Post-generation** | Concise AI summary | Interactive app ready | AI explains what it did |
| **Iteration primary** | Chat + Visual Edits | Chat + code editor | Chat + fork |
| **Error recovery** | "Try to Fix" button (free) | Auto-fix + terminal | Agent auto-fix + web search |
| **Responsive check** | Device switcher icons | Resize preview panel | Open in new tab |
| **Publish** | Multi-step modal with metadata | One-click deploy | Deploy to Vercel |
| **Share** | Published URL + invite | Export + deploy URL | Fork link + public URL |
| **Credit visibility** | Post-action reveal | Token consumption | Per-generation |
| **Empty state** | Prompt + community projects | Prompt + import options | Templates + community |
| **Unique superpower** | Visual Edits (free) | File lock + terminal | Fork/branch + templates |

---

## 13. Key Takeaways for Bridges

### Must-Have (Table Stakes)
1. **Prompt-is-the-onboarding:** No tutorials — the prompt box with rotating therapy-specific suggestions IS the onboarding
2. **Real-time streaming preview:** Users must see the tool building live
3. **Chat-based iteration:** Natural language refinement
4. **One-click publish:** Shareable link immediately
5. **Error recovery button:** "Try to Fix" style one-click error resolution
6. **Responsive preview:** Device toggle (critical for iPad-first therapy tools)
7. **Version history:** Rollback to stable states

### Differentiators to Steal
1. **Lovable's Visual Edits:** Click-to-edit without consuming credits. For therapy tools, this means adjusting card sizes, colors, and text directly.
2. **Lovable's Chat Suggestions:** Context-aware next-step recommendations after generation (e.g., "Add sound effects", "Change to high-contrast mode", "Add more vocabulary words")
3. **v0's celebration moments:** The "jaw-drop" and "magic" emotional response — Bridges needs a celebration moment when the first therapy tool generates successfully
4. **Lovable's security scan before publish:** For therapy tools used with children, this builds trust
5. **v0's template gallery:** Pre-built therapy tool templates as starting points

### Gaps to Fill (No Builder Does This Well)
1. **Domain-specific empty states:** Show example therapy tools, not generic apps
2. **Guided first generation:** "Build your first communication board in 60 seconds" flow
3. **Credit cost preview:** Show estimated cost BEFORE generation (major Lovable complaint)
4. **Celebration/completion moment:** Confetti, success animation, "Your tool is ready!" moment
5. **Progress indicators during generation:** Step-based progress ("Understanding your request..." -> "Building interface..." -> "Adding interactions..." -> "Ready!")
6. **Sound design:** Subtle audio feedback for generation complete, publish success
7. **Therapy-specific suggestions:** Post-generation chips like "Add more words", "Change to symbols", "Enable text-to-speech", "Print version"

---

## Sources

- [Lovable Documentation - Changelog](https://docs.lovable.dev/changelog)
- [Lovable Documentation - Visual Edits](https://docs.lovable.dev/features/visual-edit)
- [Lovable Documentation - Publish](https://docs.lovable.dev/features/publish)
- [Lovable Documentation - Troubleshooting](https://docs.lovable.dev/tips-tricks/troubleshooting)
- [Lovable Review 2026 - Hackceleration](https://hackceleration.com/lovable-review/)
- [Lovable Review 2026 - Superblocks](https://www.superblocks.com/blog/lovable-dev-review)
- [Lovable Review 2026 - AI Tool Analysis](https://aitoolanalysis.com/lovable-review/)
- [Lovable AI Features Deep Dive - Sidetool](https://www.sidetool.co/post/lovable-ai-features-deep-dive-from-prompt-to-product-in-minutes/)
- [Lovable.dev App in 12 Prompts - Slobodskyi](https://slobodskyi.com/create/no-code/lovable)
- [Lovable Onboarding - Euro SaaS Edge](https://eurosaasedge.substack.com/p/a-lovable-onboarding)
- [Lovable vs Bolt vs V0 - ToolJet](https://blog.tooljet.com/lovable-vs-bolt-vs-v0/)
- [Bolt vs v0 vs Lovable - Better Stack](https://betterstack.com/community/comparisons/bolt-vs-v0-vs-lovable/)
- [AI-Driven Prototyping Comparison - Substack](https://addyo.substack.com/p/ai-driven-prototyping-v0-bolt-and)
- [Bolt.new Web Creation - Codrops](https://tympanus.net/codrops/2025/05/22/bolt-new-web-creation-at-the-speed-of-thought/)
- [Bolt.new Guide - NoCode MBA](https://www.nocode.mba/articles/bolt-ai-new-guide)
- [v0 Hands-On Review - Ann Jose](https://annjose.com/post/v0-dev-firsthand/)
- [What is v0.dev - Capacity.so](https://capacity.so/blog/what-is-v0-dev)
- [Introducing the New v0 - Vercel](https://vercel.com/blog/introducing-the-new-v0)
- [v0 Documentation](https://v0.app/docs)
- [Lovable System Prompt - GitHub](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools/blob/main/Lovable/Agent%20Prompt.txt)
