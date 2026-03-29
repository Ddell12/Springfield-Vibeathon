# Comprehensive Codebase Audit — Bridges

## Context

Full codebase audit of Bridges (AI therapy app builder) to identify architectural issues, custom-code-vs-library opportunities, bad logic, memory leaks, god modules, inefficient code, UX gaps, and navigation problems. This document consolidates findings from three parallel audit agents covering architecture/code quality, performance/reliability/security, and UX/navigation.

---

## 1. ARCHITECTURE & VSA VIOLATIONS

### Cross-Feature Imports (VSA Breaks)

| Import | From | To | Fix |
|--------|------|----|-----|
| `ProjectCard` | `features/dashboard` | `features/my-tools` | Move to `src/shared/components/` |
| `sse-events` | `features/builder/lib` | `features/flashcards` | Already in `src/core/` — delete the re-export shim in `features/builder/lib/sse-events.ts`, update imports |
| SSE schemas/types | `features/builder/lib` | `features/flashcards` | Move shared types to `src/core/streaming.ts` |

### God Modules (>300 lines, multiple responsibilities)

| File | Lines | Problem | Fix |
|------|-------|---------|-----|
| `features/builder/lib/aac-template.ts` | 752 | Mixes data, docs, examples | Split into `aac-template-data.ts` + `aac-template-docs.ts` |
| `features/builder/lib/agent-prompt.ts` | 544 | Monolithic system prompt | Extract therapy rules, output format, tool usage into separate modules that compose |
| `features/builder/components/builder-page.tsx` | 404 | 15+ state vars, handles streaming/publishing/sharing/resume | Extract `usePublishing()`, `useSharing()`, `useSessionResume()` hooks |
| `features/builder/hooks/use-streaming.ts` | 352 | 8 useState calls, SSE parsing, event routing, file collection | Refactor to `useReducer` pattern |
| `app/api/generate/route.ts` | 315 | Auth + validation + streaming + tool execution + bundling + persistence | Extract validators, persistence, tool handlers into submodules |
| `features/flashcards/components/flashcard-page.tsx` | 302 | Deck nav + streaming + chat + preview | Extract hooks similar to builder |

---

## 2. CUSTOM CODE vs. LIBRARY ALTERNATIVES

| Custom Implementation | Location | Better Alternative | Effort |
|-----------------------|----------|--------------------|--------|
| 8x `useState` for streaming state | `use-streaming.ts` | `useReducer` or Zustand (lightweight store) | Medium |
| Manual `setTimeout` debounce | `flashcard-swiper.tsx:89`, `profile-section.tsx:113` | `use-debounce` package (already in ecosystem) | Low |
| Manual form state management | builder prompt, profile settings, share dialog | `react-hook-form` + `zod` (shadcn pattern) | Medium |
| Re-export shim for backward compat | `features/builder/lib/sse-events.ts` | Just update 2-3 imports to `@/core/sse-events` | Low |

---

## 3. BAD LOGIC & CODE ISSUES

### Silent Error Swallowing (HIGH priority)

| File | Line(s) | Issue | Fix |
|------|---------|-------|-----|
| `app/api/generate/route.ts` | ~301 | Empty `catch {}` on `rmSync` cleanup — disk leak if temp dirs accumulate | Log error, consider alerting |
| `shared/components/voice-input.tsx` | 36 | `.catch(() => {})` on transcription — user gets no feedback on STT failure | Add `toast.error()` + `console.error()` |
| `shared/hooks/use-media-recorder.ts` | 47-48 | No error handling on `track.stop()` | Wrap in try-catch per track |

### Logic Bugs

| File | Issue | Fix |
|------|-------|-----|
| `builder/components/thinking-indicator.tsx:27` | `setElapsed(0)` in cleanup fires on every dep change, causing flash to "Thinking..." | Remove the reset — let next effect handle state |
| `builder/components/builder-page.tsx:129-130` | `promptSubmitted` ref is set but never meaningfully read (status check is sufficient) | Remove unused ref |
| `builder/hooks/use-streaming.ts:101` | `handleEvent` has empty dependency array but references `sessionIdRef` — fragile if ref pattern not consistent | Audit all event handlers use ref pattern correctly |

### Missing Input Validation

| File | Issue | Fix |
|------|-------|-----|
| `app/api/generate/route.ts:72-75` | No max length on prompt/query — could be 50K+ chars | Add `.max(10000)` to Zod schema |

---

## 4. PERFORMANCE & EFFICIENCY

### Convex Query Issues

| File | Issue | Fix | Effort |
|------|-------|-----|--------|
| `convex/flashcard_cards.ts` | Client-side `.filter()` after fetching all cards — O(n) for large decks | Add `by_deck_label` index to schema, use `.withIndex()` | Low |
| `convex/messages.ts:36` | `.take(500)` loads entire chat history every render | Implement cursor-based pagination | Medium |

### Memory / Resource Issues

| File | Issue | Severity |
|------|-------|----------|
| `builder/components/preview-panel.tsx:43` | Blob URL revocation on 200ms timeout — could leak if tab closes during delay | Low-Medium |
| `app/api/generate/route.ts:216-263` | Stream continues writing after client disconnects during persistence phase | Medium |
| `app/api/generate/run-bundle-worker.ts:20` | 60s timeout but no `AbortSignal` — node process may survive timeout | Medium |

---

## 5. SECURITY HARDENING

| Issue | File | Severity | Fix |
|-------|------|----------|-----|
| Iframe sandbox too permissive | `shared-tool/components/shared-tool-page.tsx:79` | High | Restrict to `allow-scripts` only (no forms, no navigation, no popups) |
| No prompt length validation | `app/api/generate/route.ts` | High | Add Zod `.max()` constraints |
| Temp dir names predictable | `route.ts:141` | Low | Already uses `mkdtempSync` (random suffix) — acceptable |

**Note:** `.env.local` contains API keys as expected for local dev — these are NOT committed to git. The previously-flagged secret leak (in `.claude/command-audit.log`) is a separate, known issue.

---

## 6. UX GAPS — HIGH IMPACT, LOW-MID EFFORT

### Missing Route Infrastructure

| What | Where to Create | Effort |
|------|-----------------|--------|
| Route-specific `loading.tsx` (skeleton UI) | `app/(app)/dashboard/`, `flashcards/`, `my-tools/`, `settings/`, `templates/` | Low |
| Route-specific `error.tsx` | Same 5 routes above | Low |
| Auth middleware | `src/middleware.ts` (root) — Clerk route protection | Medium |
| Route constants file | `src/core/routes.ts` — replace hardcoded paths in ~15 files | Medium |

### Missing UX States

| What | Where | Effort |
|------|-------|--------|
| Empty state for templates page | `features/templates/components/templates-page.tsx` | Low |
| Empty state for flashcard decks | `features/flashcards/components/flashcard-page.tsx` | Low |
| Unsaved changes warning (beforeunload) | `features/builder/components/builder-page.tsx` | Low |
| Publish confirmation dialog | Builder toolbar publish action | Very Low |
| User-friendly activity messages during generation | Builder chat/preview | Medium |
| Character count near input limits | Builder prompt, rename dialogs | Low |

### Missing Polish

| What | Where | Effort |
|------|-------|--------|
| Favicon (currently 404) | `public/favicon.ico` or `favicon.svg` | Very Low |
| OG image for social sharing | `public/og-image.jpg` + layout metadata | Low |
| Tooltips on builder toolbar buttons | Builder toolbar icon buttons | Low |
| Keyboard shortcuts (Cmd+Enter to submit, etc.) | Builder page | Low-Medium |
| Consistent button border-radius | Varies: `rounded-lg` vs `rounded-xl` vs `rounded-2xl` | Low |

### Accessibility Gaps

| What | Where | Effort |
|------|-------|--------|
| Empty `alt=""` on deck cover images | `features/flashcards/deck-card.tsx` | Very Low |
| No keyboard navigation on code panel file tabs | `builder/components/code-drawer.tsx` | Low-Medium |
| Focus not returned to trigger after modal close | Publish/share dialogs | Low |
| Screen reader labels on suggestion chips | Builder/dashboard prompt area | Low |

---

## 7. NAVIGATION ISSUES

| Issue | Location | Fix |
|-------|----------|-----|
| Hardcoded URLs (`/builder`, `/dashboard`, `/templates`) in ~15 files | `my-tools-page.tsx`, `templates-page.tsx`, `main-prompt-input.tsx`, `builder-toolbar.tsx`, etc. | Create `src/core/routes.ts` with typed route constants |
| No per-page metadata exports | All `page.tsx` files under `(app)/` | Add `export const metadata` for SEO |
| Missing `loading.tsx` → same generic spinner for all routes | `app/(app)/` children | Add route-specific skeleton loaders |

---

## 8. PRIORITY MATRIX

### Tier 1 — Do This Week (Critical + Quick Wins)

1. **Fix silent error swallowing** in `route.ts`, `voice-input.tsx`, `use-media-recorder.ts` — 1-2h
2. **Add input validation** (max length) to `/api/generate` Zod schema — 30min
3. **Restrict iframe sandbox** on `shared-tool-page.tsx` — 15min
4. **Add favicon** to `public/` — 15min
5. **Add `beforeunload` warning** during active generation — 30min
6. **Fix ThinkingIndicator** cleanup reset — 15min

### Tier 2 — This Sprint (High Impact, Medium Effort)

7. **Add route-specific `loading.tsx`** with skeleton UI for 5 routes — 2-3h
8. **Add route-specific `error.tsx`** for 5 routes — 1-2h
9. **Create `src/core/routes.ts`** and refactor hardcoded paths — 2-3h
10. **Move `ProjectCard` to `src/shared/`** (fixes VSA violation) — 1h
11. **Delete SSE re-export shim**, update 2-3 imports to `@/core/sse-events` — 30min
12. **Add empty states** for templates + flashcards pages — 1-2h
13. **Add OG image** + social sharing metadata — 1h
14. **Add tooltips** to builder toolbar buttons — 1h
15. **Voice input error toast** — 30min

### Tier 3 — Next Sprint (Architectural Improvements)

16. **Split `builder-page.tsx`** into composable hooks (`usePublishing`, `useSharing`, `useSessionResume`) — 4-5h
17. **Refactor `use-streaming.ts`** to `useReducer` pattern — 3-4h
18. **Split `agent-prompt.ts`** into composable prompt sections — 2-3h
19. **Add Convex indexes** for flashcard label filtering — 1h
20. **Implement message pagination** in `convex/messages.ts` — 3-4h
21. **Add auth middleware** (`src/middleware.ts`) — 2-3h
22. **Add keyboard shortcuts** to builder — 2-3h

### Tier 4 — Backlog (Nice to Have)

23. Split `aac-template.ts` (752 lines) into data + docs modules
24. Add consistent button style guide across all components
25. Implement cursor-based pagination for chat history
26. Add `requestIdleCallback` for blob URL revocation
27. Add `AbortSignal.timeout` to bundle worker
28. Add keyboard navigation to code panel file tabs
29. Add focus management to publish/share modal lifecycle

---

## Verification

After implementing changes:
1. Run `npm test` — all 636 tests pass
2. Run `npx playwright test` — E2E tests pass
3. Run `npm run build` — no TypeScript or build errors
4. Manually test builder flow: prompt → generate → preview → publish
5. Check browser console for warnings/errors
6. Test auth flow: sign-in → protected routes → sign-out redirect
7. Verify iframe sandbox by inspecting shared tool page in DevTools
