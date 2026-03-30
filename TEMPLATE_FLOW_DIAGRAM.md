# Template Selection Flow - Architecture Diagram

## Component Hierarchy & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER JOURNEY FLOW DIAGRAM                     │
└─────────────────────────────────────────────────────────────────┘

STEP 1: TEMPLATE SELECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /templates (Route)
           ↓
    TemplatesPage Component
    ├── Displays 4 templates from THERAPY_SEED_PROMPTS
    ├── Communication Board
    ├── Morning Routine
    ├── 5-Star Reward Board
    └── Going to the Dentist
           ↓
    User clicks template card
           ↓
    <Link href="/builder?prompt={encoded_prompt}">
           ↓
    Navigation to /builder?prompt=...


STEP 2: BUILDER PAGE INITIALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /builder?prompt=... (Route)
           ↓
    BuilderPage Component
    initialSessionId={null}
           ↓
    useSearchParams()
           ├── searchParams.get("prompt")
           └── Returns: template prompt (URL encoded)
           ↓
    useEffect Trigger
    Conditions:
    ├── ✓ promptFromUrl exists
    ├── ✓ status === "idle"
    ├── ✓ !promptSubmitted.current
    └── ✓ !initialSessionId
           ↓
    handleGenerate(decodeURIComponent(promptFromUrl))
           ↓
    useStreaming.generate(prompt)


STEP 3: API GENERATION REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, sessionId: undefined })
    })
           ↓
    /api/generate/route.ts (NextJS API Handler)
           ├─ Validate input
           ├─ Check rate limit
           ├─ Create Convex HTTP client
           └─ Parse GenerateInputSchema
           ↓
    Convex Mutation: sessions.create()
    ├── Input:  { title, query }
    ├── Output: sessionId
    └── State: "idle" → immediately
           ↓
    SSE Response Stream
    └── send("session", { sessionId })
           ↓
    useStreaming Hook
    ├── Fetch response.body
    ├── getReader() + TextDecoder
    ├── Parse SSE events
    └── case "session": setSessionId(sseEvent.sessionId)


STEP 4: SESSION CREATION & STATE TRANSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Convex Backend
    ┌─────────────────────────────────────────┐
    │  sessions Table                         │
    ├─────────────────────────────────────────┤
    │ _id:       [sessionId]                  │
    │ userId:    [identity.subject]           │
    │ title:     "Build a communication..." │
    │ query:     [full template prompt]       │
    │ state:     "idle"                       │
    │ stateMsg:  null                         │
    │ error:     null                         │
    └─────────────────────────────────────────┘
           ↓
    Convex Mutation: sessions.startGeneration()
    ├── Input:  { sessionId }
    ├── Validation: state transition "idle" → "generating" allowed
    └── Output: patch state to "generating"
           ↓
    State Transition: idle → generating


STEP 5: CLAUDE GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Anthropic Claude SDK
    ├── model: "claude-sonnet-4-6"
    ├── max_tokens: 32768
    ├── system: buildSystemPrompt()
    ├── tools: createAgentTools()
    └── messages: [{ role: "user", content: prompt }]
           ↓
    Claude generates code + writes files
    ├── Tool: write_file() → collectedFiles Map
    ├── send("file_complete", { path, contents })
    └── send("token", { token }) for streaming text


STEP 6: BUNDLING & PERSISTENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Build Phase
    ├── esbuild
    │   ├── entryPoint: src/main.tsx
    │   ├── bundle: true
    │   ├── minify: true
    │   └── output: dist/main.js
    │
    ├── CSS Processing
    │   ├── Strip @tailwind directives
    │   ├── Convert @apply to CSS
    │   └── Process tailwind.config.js
    │
    └── HTML Assembly
        ├── Inline bundled JS
        ├── Inline processed CSS
        ├── Tailwind CDN script tag
        └── send("bundle", { html })
           ↓
    Convex Mutations
    ├── generated_files.upsertAutoVersion()
    │   └── For each file (batch of 10)
    │       ├── sessionId
    │       ├── path
    │       └── contents
    │
    ├── generated_files.upsertAutoVersion()
    │   └── Special: _bundle.html
    │       └── Persists full self-contained HTML
    │
    └── messages.create()
        └── Assistant message: "I built your app..."


STEP 7: URL NAVIGATION & STATE SYNC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    BuilderPage useEffect
    ┌─────────────────────────────────────┐
    │ useStreaming Hook Updates           │
    ├─────────────────────────────────────┤
    │ SSE "session" event received        │
    │ sessionId state is now set          │
    │                                     │
    │ useEffect dependency: [sessionId]   │
    │ Triggers when sessionId changes     │
    └─────────────────────────────────────┘
           ↓
    Conditions:
    ├── sessionId exists ✓
    └── !initialSessionId ✓
           ↓
    router.replace("/builder/{sessionId}")
           ├── Replaces URL in browser history
           └── /builder?prompt=... → /builder/{sessionId}
           ↓
    Browser navigates to /builder/{sessionId}
           ↓
    Next.js dynamic route captures params
    └── [sessionId]/page.tsx


STEP 8: SESSION RESUME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    [sessionId]/page.tsx
    ├── params = { sessionId }
    └── <BuilderPage initialSessionId={sessionId} />
           ↓
    BuilderPage with initialSessionId set
    ├── useQuery(api.sessions.get, { sessionId })
    ├── useQuery(api.generated_files.list, { sessionId })
    └── Both queries fire in parallel
           ↓
    Queries return data
    ├── sessionData: { _id, title, query, state, blueprint, ... }
    └── files: [ { path, contents }, ... ]
           ↓
    useEffect: Resume Session
    Conditions:
    ├── ✓ initialSessionId
    ├── ✓ resumeSessionData (query returned)
    ├── ✓ resumeFiles (query returned)
    ├── ✓ status === "idle" (streaming hook idle)
    └── ✓ !sessionResumed.current (first time only)
           ↓
    resumeSession({
      sessionId,
      files: appFiles,
      blueprint,
      bundleHtml
    })
           ↓
    useStreaming.resumeSession()
    ├── setSessionId(sessionId)
    ├── setFiles(appFiles)
    ├── setStatus("live")
    ├── setBlueprint(blueprint)
    └── setBundleHtml(bundleHtml)
           ↓
    UI: Split-panel builder
    ├── Chat panel (left)
    ├── Code panel (center - hidden)
    └── Preview panel (right) - shows bundled HTML


STEP 9: COMPLETION & LIVE STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /api/generate sends "done" event
    ├── sessionId
    ├── files: [ { path, contents }, ... ]
    └── buildFailed: boolean
           ↓
    useStreaming processes "done"
    ├── SSE "done" event handled
    ├── if sseEvent.sessionId: setSessionId()
    └── setStatus("live")
           ↓
    Convex Mutation: sessions.setLive()
    ├── Input:  { sessionId }
    ├── Validation: "generating" → "live" allowed
    └── Output: patch state to "live"
           ↓
    Database final state:
    ┌─────────────────────────────────────┐
    │  sessions Table                     │
    ├─────────────────────────────────────┤
    │ _id:       [sessionId]              │
    │ userId:    [identity.subject]       │
    │ title:     "Communication Board" │
    │ query:     [original prompt]        │
    │ state:     "live" ✓                 │
    │ stateMsg:  null                     │
    │ error:     null                     │
    └─────────────────────────────────────┘
    
    ┌─────────────────────────────────────┐
    │  files Table                        │
    ├─────────────────────────────────────┤
    │ [sessionId, "src/App.tsx"]          │
    │ [sessionId, "src/main.tsx"]         │
    │ [sessionId, "_bundle.html"]         │
    │ ... (more generated files)          │
    └─────────────────────────────────────┘
           ↓
    UI switches to live builder
    ├── Displays generated app in preview
    ├── Shows code files in code panel
    ├── Chat available for modifications
    └── Publish & Share buttons active


STATE MACHINE DIAGRAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌──────────┐
    │  (null)  │  ← New session, no state yet
    └────┬─────┘
         │
         │ click template
         │ navigate to /builder?prompt=...
         ↓
    ┌──────────────────────┐
    │  /builder?prompt=... │  ← Frontend only, no session yet
    └────┬─────────────────┘
         │
         │ fetch /api/generate
         ↓
    ┌────────────────────────────┐
    │ POST /api/generate         │
    │ Create session (idle)      │
    │ Immediate → startGeneration│
    └────┬───────────────────────┘
         │
         │ Convex: create() → state="idle"
         │ Convex: startGeneration() → state="generating"
         ↓
    ┌──────────────────────┐
    │  Session: idle       │
    │  ↓                   │
    │  generating          │  ← Claude is working
    │  (Claude + esbuild)  │
    └────┬─────────────────┘
         │
         │ All generation complete
         │ setLive() mutation called
         ↓
    ┌──────────────────────┐
    │  Session: live       │  ← Ready for user
    │  ✓ Files persisted   │
    │  ✓ Bundle persisted  │
    │  ✓ UI shows builder  │
    └──────────────────────┘


ERROR PATHS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌──────────────────────┐
    │  Session: generating │
    └────┬─────────────────┘
         │
         │ Claude error OR
         │ esbuild error
         ↓
    ┌──────────────────────┐
    │  Session: failed     │  ← Error message stored
    │  error: "..."        │
    └────┬─────────────────┘
         │
         │ User clicks "Retry"
         ↓
    ┌──────────────────────┐
    │  Session: generating │  ← Try again
    └──────────────────────┘


FILE REFERENCES TABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FRONTEND                            │ BACKEND
─────────────────────────────────────┼──────────────────────────────────
templates-page.tsx                  │ therapy_seeds.ts
  ├─ THERAPY_SEED_PROMPTS           │ (template definitions)
  └─ <Link href="/builder?...">    │
                                    │ sessions.ts
builder/page.tsx                    │   ├─ create()
  ├─ useSearchParams()              │   ├─ startGeneration()
  ├─ useStreaming()                 │   ├─ setLive()
  ├─ useEffect auto-submit          │   └─ setFailed()
  └─ router.replace()              │
                                    │ generated_files.ts
builder/[sessionId]/page.tsx        │   └─ upsertAutoVersion()
  ├─ params.sessionId              │
  └─ BuilderPage(...).             │ api/generate/route.ts
                                    │   ├─ Create session
use-streaming.ts                    │   ├─ Claude generation
  ├─ fetch("/api/generate")        │   ├─ esbuild bundling
  ├─ Parse SSE stream              │   └─ SSE stream
  ├─ handleEvent()                 │
  └─ resumeSession()               │ schema.ts
                                    │   ├─ sessions table
shared components                   │   ├─ files table
  ├─ BuilderToolbar                │   └─ messages table
  ├─ ChatPanel                     │
  ├─ PreviewPanel                  │
  └─ CodePanel                     │

