# Plan: Restore Chat Box on Dashboard

## Context

The dashboard currently has a plain `MainPromptInput` — a single text input that redirects to `/builder?prompt=...` on submit. It looks like a search bar, not a conversational interface. The user reports that a chat box was previously on the dashboard but was accidentally removed. The goal is to restore a chat-box-style component so first-time users feel invited to start building immediately.

DESIGN.md line 108: *"The input field IS the product demo."* A chat box is a more compelling demo than a search bar.

## Approach

**Replace `MainPromptInput` with a `DashboardChatBox`** — a chat-window-styled component that looks conversational but still redirects to the builder on submit. This avoids duplicating the streaming infrastructure (`useStreaming`, session management, SSE pipeline) which is deeply coupled to the builder page.

The builder already handles `?prompt=` auto-submission, so the redirect flow is seamless and sub-second.

## Files to Modify

| File | Action |
|------|--------|
| `src/features/dashboard/components/dashboard-chat-box.tsx` | **Create** — new chat-box component |
| `src/features/dashboard/components/dashboard-view.tsx` | **Edit** — swap `MainPromptInput` for `DashboardChatBox`, remove separate template chips |
| `src/features/dashboard/components/main-prompt-input.tsx` | **Delete** — fully replaced |

## Step 1: Create `DashboardChatBox`

**File:** `src/features/dashboard/components/dashboard-chat-box.tsx`

A chat-window-styled card containing:

1. **Welcome bubble** — assistant-style message: *"Hi! Describe a therapy tool and I'll build it for you."* Styled like `ChatPanel`'s `AssistantBubble` (rounded-2xl, bg-surface-container, text-sm).

2. **Suggestion chips** — reuse `SuggestionChips` from `@/shared/components/suggestion-chips` with `THERAPY_SUGGESTIONS` from `@/features/builder/lib/constants`. These appear inside the "message area" as the assistant's suggestions.

3. **Input bar** — matches `ChatPanel`'s input layout:
   - `VoiceInput` on the left (reuse from `@/shared/components/voice-input`)
   - Text input in the center with chat icon prefix (`MaterialIcon icon="chat"`)
   - Send button on the right with CTA gradient (`bg-gradient-to-br from-primary to-primary-container`)

**Behavior:**
- On submit (Enter or button click): `router.push(`/builder?prompt=${encodeURIComponent(value)}`)`
- On suggestion chip click: same redirect with the suggestion text
- Voice input appends transcript to the text input (same as `ChatPanel`)

**Styling (per DESIGN.md):**
- Container: `rounded-2xl bg-surface-container-lowest shadow-[0_12px_32px_rgba(25,28,32,0.06)]`
- Max width: `max-w-2xl mx-auto`
- Height: ~280-300px to feel like a chat window
- Messages area: top portion with padding, welcome bubble + chips
- Input bar: pinned at bottom with `bg-surface-container-low` background (matching ChatPanel)
- All touch targets: min 44px (WCAG 2.5.8)
- Send button disabled when input is empty

**Reused components:**
- `SuggestionChips` — `src/shared/components/suggestion-chips.tsx`
- `VoiceInput` — `src/shared/components/voice-input.tsx` (uses `useAction(api.stt.transcribeSpeech)`, Convex context available on dashboard)
- `MaterialIcon` — `src/shared/components/material-icon.tsx`
- `Input` — `src/shared/components/ui/input.tsx`
- `Button` — `src/shared/components/ui/button.tsx`

## Step 2: Update `DashboardView`

**File:** `src/features/dashboard/components/dashboard-view.tsx`

1. Replace import: `MainPromptInput` -> `DashboardChatBox`
2. Replace `<MainPromptInput />` (line 105) with `<DashboardChatBox />`
3. Remove the template chips block (lines 108-118) — chips are now inside the chat box
4. Keep the hero heading and subtitle as-is (they frame the chat box nicely)

## Step 3: Delete `MainPromptInput`

**File:** `src/features/dashboard/components/main-prompt-input.tsx`

No other files import this component. Safe to delete.

## What Does NOT Change

- `ChatPanel` — remains the builder's chat interface, untouched
- `useStreaming` — remains scoped to builder
- `BuilderPage` — continues handling `?prompt=` auto-submission
- `/api/generate` route — unchanged
- Template chips on dashboard are not lost — they move inside the chat box as suggestion chips

## Cross-Slice Import Note

Importing `THERAPY_SUGGESTIONS` from `@/features/builder/lib/constants` crosses a VSA boundary. This is a simple string array constant, not a component or hook, so the coupling is minimal. If preferred, it can be moved to `src/shared/lib/constants.ts` during implementation.

## Verification

1. **Visual:** Dashboard shows a chat-box-styled card with welcome message, suggestion chips, and input bar
2. **Submit flow:** Type a prompt and press Enter -> navigates to `/builder?prompt=...` -> builder auto-submits and starts generating
3. **Suggestion chips:** Click a chip -> navigates to builder with that prompt
4. **Voice input:** Record speech -> transcript appears in input field
5. **Mobile:** Chat box is responsive, touch targets >= 44px
6. **Existing tests:** Run `npm test` to verify no regressions in dashboard tests
7. **E2E:** Navigate to `/dashboard`, verify the chat box renders, type and submit a prompt
