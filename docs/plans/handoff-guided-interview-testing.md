# Handoff: Guided Interview Feature — Testing & Verification

## What Was Built

A guided interview flow for the builder that helps therapists and parents create therapy apps through targeted questions instead of free-form prompts. 10 therapy categories, adaptive depth (2-3 essential + optional extended), LLM follow-up via Haiku, blueprint assembly, and approval before generation.

## What Was Fixed

5 bug fixes applied after initial smoke testing:

| Commit | Fix |
|--------|-----|
| `c7d4a79` | Delay URL navigation until generation completes (prevents SSE abort mid-stream) |
| `97293c7` | Log SSE parse failures instead of silently swallowing them |
| `58bf627` | Allow unauthenticated access to legacy/demo sessions (auth.ts fetches session before checking auth) |
| `f5a7594` | Convex reactive fallback recovers `_bundle.html` if SSE bundle event is lost |
| `53018c6` | Retry button on preview panel for failed builds |

## What Needs Testing

### 1. Full Interview → Generation → Preview (CRITICAL)

Previous testing confirmed the interview flow works perfectly (category picker → questions → gate → blueprint → "Build this!"). But the **preview render after generation** needs verification with the 5 fixes applied.

**Test flow:**
1. Navigate to `/builder`
2. Click "Communication Board" → answer Preschool → 9 words → Core words
3. Click "Show me the plan" → wait for BlueprintApprovalCard
4. Click "Build this!" → verify generation starts in split-panel layout
5. Wait 30-60s for generation + bundling to complete
6. **Verify preview renders** in the right panel (iframe with the generated app)
7. Verify the generated app is a communication board with 9 words, tappable cards, sentence strip

### 2. Auth Flow

**You MUST sign in first** — unauthenticated sessions work for generation but session resume requires auth for owned sessions.

```
Sign-in flow (headless browsers):
1. Go to /sign-in
2. Enter email: e2e+clerk_test@bridges.ai
3. Click Continue
4. Click "Use another method" → "Email code"
5. Enter code: 424242 (always works for +clerk_test emails in dev)
6. Should redirect to /dashboard
```

### 3. Bundle Recovery Fallback

Test that the Convex fallback recovers a lost bundle:
1. Generate an app successfully (preview shows)
2. In browser DevTools, run: `document.querySelector('iframe')?.remove()` to simulate lost preview
3. Reload the page at `/builder/{sessionId}`
4. Preview should reload from Convex-persisted `_bundle.html`

### 4. Retry Button

1. If any build shows "Build could not produce a preview", verify the "Try again" button appears
2. Clicking it should re-trigger generation with the same prompt

## Key Agent-Browser Patterns Learned

### Strict mode violations
`agent-browser find text "X" click` fails if multiple elements match. Use:
- `--exact` flag for exact text matching
- `agent-browser snapshot -i` to get refs, then `agent-browser click @e5`
- `agent-browser find text "X" click --exact` for buttons like "Continue"

### Clerk sign-in with agent-browser
```bash
agent-browser open http://localhost:3000/sign-in
sleep 3
agent-browser find placeholder "Enter your email" fill "e2e+clerk_test@bridges.ai"
agent-browser find text "Continue" click --exact
sleep 3
agent-browser find text "Use another method" click
sleep 2
agent-browser find text "Email code" click
sleep 3
agent-browser snapshot -i  # find the verification code textbox ref
agent-browser fill @eN "424242"  # use the ref from snapshot
agent-browser find text "Continue" click --exact
sleep 5
# Should be at /dashboard
```

### Checking preview state
```bash
# Check if preview rendered or failed
agent-browser eval "Array.from(document.querySelectorAll('p')).map(p => p.textContent).filter(t => t.includes('preview') || t.includes('Build') || t.includes('live')).join(' | ')"

# Check for iframe (means preview loaded)
agent-browser eval "document.querySelector('iframe')?.src?.slice(0, 30) || 'no iframe'"

# Check API call status
agent-browser eval "JSON.stringify(performance.getEntriesByType('resource').filter(r => r.name.includes('/api/')).map(r => ({name: r.name.split('/').pop(), status: r.responseStatus})))"
```

### Dev server
```bash
# Start from project root (NOT worktree — worktree was cleaned up)
cd /Users/desha/Springfield-Vibeathon
npm run dev &
sleep 8
```

### Timing
- Interview flow: ~15s to walk through (all clicks)
- Follow-up LLM call: 1-5s (may 500 without API key — handled gracefully)
- Blueprint assembly: instant
- Generation: 30-60s (Claude writes files)
- Bundling: 5-15s (esbuild child process)
- Total end-to-end: ~60-90s

## Architecture Quick Reference

```
Interview Flow:
CategoryPicker → InterviewQuestion (2-3x) → Gate → [Extended (4x)] →
/api/interview-followup (Haiku) → BlueprintAssembler → BlueprintApprovalCard →
handleGenerate(richPrompt, blueprint) → /api/generate (SSE) → Preview

Key Files:
src/features/builder/components/interview/interview-controller.tsx  — orchestrator
src/features/builder/components/builder-page.tsx                    — integration point
src/features/builder/hooks/use-session-resume.ts                    — URL nav + resume
src/features/builder/hooks/use-streaming.ts                         — SSE consumer
src/app/api/generate/route.ts                                       — SSE producer + bundler
src/core/sse-utils.ts                                               — SSE parser
convex/lib/auth.ts                                                  — session ownership
```

## Known Issues / Edge Cases

1. **`/api/interview-followup` returns 500** when `ANTHROPIC_API_KEY` is not set — this is handled gracefully (toast + proceed with raw answers)
2. **Previous session "Continue working on" card** can conflict with agent-browser text matching if old session text contains "Communication Board" — use `snapshot -i` refs instead of `find text`
3. **SSE bundle event is ~200KB** — can be truncated by Vercel edge proxy in production. The Convex fallback (Step 3 fix) recovers it reactively.
