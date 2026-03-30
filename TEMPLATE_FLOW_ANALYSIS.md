# Template Selection & Builder Session Flow - Complete Trace

## Executive Summary

The template selection flow is **well-designed and properly wired**, with a clear journey from template selection through session creation to builder delivery. All major components are connected, but there are a few **minor gaps and edge cases** worth noting.

---

## 1. Template Gallery / Templates Page

**File:** `/src/features/templates/components/templates-page.tsx`
**Route:** `/templates` → `/src/app/(app)/templates/page.tsx`

### What Happens:
- Displays 4 template cards from `THERAPY_SEED_PROMPTS` (defined in `/convex/templates/therapy_seeds.ts`)
- Each template card is a `<Link>` to `/builder?prompt={encodeURIComponent(template.prompt)}`
- Templates shown:
  1. **Communication Board** - AAC board with tap-to-speak
  2. **Morning Routine** - Visual schedule with checkmarks
  3. **5-Star Reward Board** - Token economy system
  4. **Going to the Dentist** - Social story with narration

### Template Data Structure:
```typescript
{
  id: string;
  title: string;
  prompt: string;          // Long, detailed prompt sent to Claude
  category: string;
  tags: string[];
  description: string;     // Shown on hover
}
```

### UI Components:
- Grid layout (1 col mobile, 2 col desktop)
- Gradient thumbnails with Material icons
- Hover overlay showing description
- "Click to build" footer text
- Also has CTA to "Build a Custom App" (`/builder` without params)

**✅ Status:** Correctly implemented, good UX

---

## 2. Click Handler & Navigation

**File:** `/src/features/templates/components/templates-page.tsx` (line 38-41)

### What Happens:
```jsx
<Link
  href={`/builder?prompt=${encodeURIComponent(template.prompt)}`}
>
```

- User clicks template card
- Next.js `<Link>` navigates to `/builder?prompt=...`
- Prompt is URL-encoded (handles special chars, newlines, etc.)
- No actual onClick handler needed — native HTML navigation

### Next.js Route:
- **Path:** `/src/app/(app)/builder/page.tsx`
- **Component:** `BuilderPage` with `initialSessionId={null}`

**✅ Status:** Correctly implemented

---

## 3. Builder Page & Query Parameter Handling

**File:** `/src/features/builder/components/builder-page.tsx` (lines 36-160)

### Key Code:
```typescript
// Line 4: Hook for reading query params
const searchParams = useSearchParams();

// Line 153: Extract prompt from URL
const promptFromUrl = searchParams.get("prompt");

// Lines 155-160: Auto-submit on mount
useEffect(() => {
  if (promptFromUrl && status === "idle" && !promptSubmitted.current && !initialSessionId) {
    promptSubmitted.current = true;
    handleGenerate(decodeURIComponent(promptFromUrl));
  }
}, [promptFromUrl, status, handleGenerate, initialSessionId]);
```

### Execution Flow:
1. BuilderPage mounts with `initialSessionId={null}`
2. Shows initial prompt screen (full-width centered UI)
3. `searchParams.get("prompt")` extracts the template prompt
4. On next render (when `status === "idle"`), auto-submits via `handleGenerate()`
5. Prompt is decoded (reverses URL encoding from templates page)

### Conditions Required:
- ✅ `promptFromUrl` exists (query param present)
- ✅ `status === "idle"` (streaming hook initialized to "idle")
- ✅ `!promptSubmitted.current` (first time only)
- ✅ `!initialSessionId` (new session, not resuming)

**✅ Status:** Correctly implemented

---

## 4. Generation Request & Session Creation

**File:** `/src/app/api/generate/route.ts` (lines 52-94)

### Step 1: Initialize Convex HTTP Client
- Uses `NEXT_PUBLIC_CONVEX_URL` env var
- Optionally authenticates with Clerk token

### Step 2: Validate Input
```typescript
const parsed = GenerateInputSchema.safeParse(body);
// Expects: { prompt, sessionId?, mode?, query? }
```

### Step 3: Create New Session (if needed)
```typescript
const sessionId: Id<"sessions"> =
  providedSessionId ??
  (await convex.mutation(api.sessions.create, {
    title: query.slice(0, 60),           // First 60 chars of prompt
    query,
    // state: "idle" (set by Convex mutation)
  }));
```

**⚠️ GAP IDENTIFIED - Minor:**
- New session is created with `state: "idle"` (per `sessions.ts` line 22)
- Session is immediately transitioned to "generating" (line 122: `api.sessions.startGeneration`)
- This is correct, but there's a brief "idle" state window

### Step 4: Send Session ID via SSE
```typescript
send("session", { sessionId });
```

This tells the client the session ID immediately.

**✅ Status:** Correctly implemented

---

## 5. useStreaming Hook & State Management

**File:** `/src/features/builder/hooks/use-streaming.ts`

### What It Does:
1. **Fetch from `/api/generate` with SSE:**
   ```typescript
   const response = await fetch("/api/generate", {
     method: "POST",
     body: JSON.stringify({
       prompt,
       sessionId: sessionIdRef.current ?? undefined,  // undefined for new session
     }),
   });
   ```

2. **Parse SSE events:**
   - `session` event → sets `sessionId` state
   - `status` event → updates generation status
   - `token` event → streams Claude output
   - `file_complete` event → updates files list
   - `bundle` event → receives bundled HTML
   - `done` event → marks generation complete

3. **State Updates:**
   ```typescript
   case "session":
     setSessionId(sseEvent.sessionId);  // Critical: now have session ID
     break;
   ```

**✅ Status:** Correctly implemented

---

## 6. Session State Transitions (Convex Backend)

**File:** `/convex/sessions.ts`

### State Machine:
```
idle → generating → live    (success path)
     → generating → failed  (error path)
       → generating → live  (can retry)
```

### Mutations Called:
1. **`sessions.create()`** (line 11)
   - Creates session in `idle` state
   - Stores `userId`, `title`, `query`
   - Returns session ID

2. **`sessions.startGeneration()`** (line 47)
   - Transitions `idle` → `generating`
   - Validates state transition
   - Sets `stateMessage: "Generating your app..."`

3. **`sessions.setLive()`** (line 65)
   - Transitions `generating` → `live`
   - Validates state transition
   - Called when generation succeeds

4. **`sessions.setFailed()`** (line 82)
   - Transitions `generating` → `failed`
   - Stores error message
   - Called if Claude generation fails

**✅ Status:** Correctly implemented

---

## 7. Session Resume / Navigation

**File:** `/src/features/builder/components/builder-page.tsx` (lines 162-167)

### Key Code:
```typescript
// When sessionId is obtained, navigate to path-based URL
useEffect(() => {
  if (sessionId && !initialSessionId) {
    router.replace(`/builder/${sessionId}`);
  }
}, [sessionId, initialSessionId, router]);
```

### What Happens:
1. During generation, streaming hook sets `sessionId` from SSE event
2. This effect triggers, replacing URL from `/builder?prompt=...` to `/builder/{sessionId}`
3. Browser history is updated (replace, not push)
4. This enables bookmarking and refresh persistence

**Route Handler:** `/src/app/(app)/builder/[sessionId]/page.tsx`
- Extracts `sessionId` from params
- Passes to `BuilderPage` as `initialSessionId`

**✅ Status:** Correctly implemented

---

## 8. Session Resume on Navigation

**File:** `/src/features/builder/components/builder-page.tsx` (lines 79-125)

### When User Navigates to `/builder/{sessionId}`:

1. **Query Session & Files:**
   ```typescript
   const resumeSessionData = useQuery(
     api.sessions.get,
     initialSessionId ? { sessionId: initialSessionId as Id<"sessions"> } : "skip"
   );
   const resumeFiles = useQuery(
     api.generated_files.list,
     initialSessionId ? { sessionId: initialSessionId as Id<"sessions"> } : "skip"
   );
   ```

2. **Resume on Mount:**
   ```typescript
   useEffect(() => {
     if (
       initialSessionId &&
       resumeSessionData &&
       resumeFiles &&
       status === "idle" &&
       !sessionResumed.current
     ) {
       resumeSession({
         sessionId: initialSessionId,
         files: appFiles,
         blueprint: resumeSessionData.blueprint ?? null,
         bundleHtml: bundleFile?.contents ?? null,
       });
     }
   }, [initialSessionId, resumeSessionData, resumeFiles, status, resumeSession]);
   ```

3. **Update UI:**
   - `useStreaming.resumeSession()` sets state to "live"
   - Files and bundle are restored
   - UI immediately shows split-panel builder (not prompt screen)

**✅ Status:** Correctly implemented

---

## 9. Generation Flow in /api/generate

**File:** `/src/app/api/generate/route.ts` (lines 110-415)

### Full Generation Pipeline:

```
1. Create session → sessionId
   └─ send("session", { sessionId })

2. Create initial user message
   └─ convex.mutation(api.messages.create, { role: "user", content: query })

3. Call sessions.startGeneration()
   └─ Transitions session state to "generating"

4. Setup Claude via Anthropic SDK
   └─ Use buildSystemPrompt() for therapy apps
   └─ Pass template prompt as user message

5. Stream Claude output
   └─ send("token", { token }) for each chunk

6. Claude generates code → files saved to collectedFiles Map
   └─ send("file_complete", { path, contents })

7. Bundle with esbuild
   └─ Compile scaffold + generated files
   └─ Generate HTML with Tailwind CDN
   └─ send("bundle", { html })

8. Persist to Convex
   └─ upsertAutoVersion() for each file (batch of 10)
   └─ upsertAutoVersion() for bundle (_bundle.html)

9. Transition to live
   └─ convex.mutation(api.sessions.setLive)

10. Send completion event
    └─ send("done", { sessionId, files, buildFailed })
```

**✅ Status:** Correctly implemented, comprehensive

---

## ⚠️ GAPS & ISSUES IDENTIFIED

### 1. **Minor: No Explicit Session ID Validation**
- **Where:** `builder-page.tsx` (line 24)
- **Issue:** `BuilderPage` accepts `initialSessionId: string | null` but doesn't validate it's a valid Convex ID
- **Impact:** Invalid session ID silently fails (redirects to `/builder`)
- **Lines:** 170-174 handle the redirect, so it's safe but not ideal for debugging

### 2. **Minor: Template Prompt Not Stored**
- **Where:** `sessions.ts` create mutation
- **Issue:** Template prompt is stored in `query` field but not explicitly marked as template origin
- **Impact:** No way to distinguish template-generated vs custom sessions in queries
- **Mitigation:** `query` field is stored, so it's technically recoverable

### 3. **Edge Case: Race Condition in Prompt Auto-Submit**
- **Where:** `builder-page.tsx` (lines 155-160)
- **Issue:** `promptSubmitted.current` prevents re-submission, but if user navigates away during generation and back, the prompt won't resubmit
- **Impact:** Low — rare edge case (tab close/reload during generation)
- **Mitigation:** Current behavior is reasonable (prevents accidental re-runs)

### 4. **Minor: No Redirect for Invalid [sessionId] Path**
- **Where:** `builder-page.tsx` (lines 170-174)
- **Issue:** Redirect only happens if `resumeSessionData === null`, not if the session exists but user isn't the owner
- **Impact:** Auth check happens at Convex layer (soft), so unauthorized access returns null, but the error message is generic
- **Current code:**
  ```typescript
  if (initialSessionId && resumeSessionData === null && resumeFiles !== undefined) {
    router.replace("/builder");
  }
  ```

### 5. **Minor: Template Prompt Not Shown in Chat History**
- **Where:** `/api/generate/route.ts` (lines 113-119)
- **Issue:** If `providedSessionId` exists, the user message isn't created again (line 113 check)
- **Impact:** If user retries a failed template generation, original prompt message isn't duplicated
- **Current behavior:** Safe but could confuse users about retry history

### 6. **Gap: No Visual Indication of Template Origin**
- **Where:** Builder UI after template selected
- **Issue:** No badge or indicator showing "Started from template: Communication Board"
- **Impact:** Users don't see which template they selected (only in title if auto-set)
- **Mitigation:** Title is set from prompt summary, so inference is possible but not explicit

---

## FULL USER JOURNEY - HAPPY PATH

```
1. User navigates to /templates
   ↓
2. Sees 4 template cards (Communication Board, Morning Routine, etc.)
   ↓
3. Clicks "Communication Board" card
   ↓ Link href="/builder?prompt={encoded_prompt}"
4. Browser navigates to /builder?prompt=...
   ↓ Next.js route: /src/app/(app)/builder/page.tsx
5. BuilderPage mounts with initialSessionId={null}
   ↓
6. useSearchParams().get("prompt") reads template prompt
   ↓
7. useEffect auto-submits prompt (after status === "idle")
   ↓ handleGenerate(decodedPrompt)
8. useStreaming calls fetch("/api/generate", { prompt })
   ↓ POST to route handler
9. /api/generate creates session via Convex
   ↓ Sessions.create() returns sessionId
10. SSE sends "session" event with sessionId
    ↓ useStreaming sets sessionId state
11. useEffect in builder-page detects sessionId change
    ↓ router.replace("/builder/{sessionId}")
12. Browser URL updates to /builder/{sessionId}
    ↓
13. Generation continues (Claude generates code, esbuild bundles)
    ↓
14. "done" event sent when generation complete
    ↓ UI switches to split-panel builder
15. User sees live app + code + preview
```

---

## RESUME JOURNEY - EXISTING SESSION

```
1. User has previously generated a therapy app
   ↓ Session stored in Convex with state="live"
2. User navigates to /builder/{sessionId}
   ↓ Next.js dynamic route: /src/app/(app)/builder/[sessionId]/page.tsx
3. BuilderPage mounts with initialSessionId={sessionId}
   ↓
4. useQuery hooks fetch session data and files from Convex
   ↓ api.sessions.get & api.generated_files.list
5. When queries return + status="idle":
   ↓ useEffect calls resumeSession()
6. useStreaming.resumeSession() sets state="live" + restores files/bundle
   ↓
7. UI immediately shows split-panel builder (no prompt screen)
   ↓
8. User can continue editing or re-generate with new prompt
```

---

## TECHNOLOGY STACK VERIFICATION

### Frontend:
- ✅ Next.js 15+ (App Router with dynamic routes)
- ✅ React Hooks (useSearchParams, useRouter, useEffect)
- ✅ Convex React client (useQuery, useMutation, useAction)
- ✅ TypeScript with proper types

### Backend:
- ✅ Next.js API route handler (streaming SSE response)
- ✅ Convex ORM with schema & mutations
- ✅ Claude Anthropic SDK (tool runner for agentic generation)
- ✅ esbuild for bundling

### Database:
- ✅ Convex table: `sessions` (stores id, title, query, state)
- ✅ Convex table: `files` (stores generated code)
- ✅ Convex table: `messages` (stores chat history)

---

## KEY FILES REFERENCE

| Component | File | Responsibility |
|-----------|------|-----------------|
| Templates Page | `/src/features/templates/components/templates-page.tsx` | Display 4 templates with links to `/builder?prompt=...` |
| Builder Page | `/src/features/builder/components/builder-page.tsx` | Read query param, auto-submit, manage generation state |
| useStreaming Hook | `/src/features/builder/hooks/use-streaming.ts` | Fetch SSE, parse events, manage local state |
| API Route | `/src/app/api/generate/route.ts` | Create session, call Claude, bundle code, stream SSE |
| Convex Sessions | `/convex/sessions.ts` | Create, manage state transitions, resume logic |
| Convex Files | `/convex/generated_files.ts` | Persist generated code files |
| Template Seeds | `/convex/templates/therapy_seeds.ts` | Define 4 templates with prompts |
| Builder Route | `/src/app/(app)/builder/[sessionId]/page.tsx` | Resume existing session |

---

## RECOMMENDATIONS

### High Priority:
1. **Add template origin tracking** — Store `templateId` in sessions table, show badge in UI
2. **Validate sessionId format** — Catch invalid session IDs earlier with clearer error

### Medium Priority:
1. **Add retry counter** — Track how many times a session has been regenerated
2. **Cache template prompts** — Store in Convex for version history
3. **Template versioning** — Allow templates to be updated without breaking old sessions

### Low Priority:
1. **Add template analytics** — Track which templates are most popular
2. **A/B test template descriptions** — Improve click-through rate
3. **Allow custom templates** — Let users save their favorite generations as templates

---

## CONCLUSION

**The template selection and builder session creation flow is well-architected and properly wired.** All major components are connected, state transitions are validated, and the user journey is smooth. The identified gaps are minor and don't break the core flow. The system is production-ready with room for incremental improvements.

