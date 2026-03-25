# Fix Chat Iteration & Sandbox Persistence

## Context

After the Lovable-style builder UX was implemented, two critical bugs prevent multi-turn usage:

1. **Chat iteration fails on 2nd/3rd prompts** — The Claude API receives multiple consecutive assistant messages (thinking, plan, building, complete) from the first turn, violating the expected alternating user/assistant format and causing an error.
2. **Sandbox is always recreated** — Every generation creates a brand-new E2B sandbox instead of reusing the existing one. The `executeFragment()` reconnection function exists in `e2b.ts` but is never called.

---

## Changes

### 1. Filter API messages in `chat.tsx` (Bug 1 — critical)

**File:** `src/features/builder-v2/components/chat.tsx`

**Line 81-84** — Replace the unfiltered `allMessages` construction:

```typescript
// BEFORE (sends all intermediate message types to Claude)
const allMessages = [...messages, userMessage].map((m) => ({
  role: m.role,
  content: m.content,
}));
```

```typescript
// AFTER (only sends meaningful conversation turns)
const apiMessages = [...messages, userMessage]
  .filter((m) => {
    if (m.role === "user") return true;
    if (m.type === "text" || m.type === "complete") return true;
    return false;
  })
  .map((m) => ({
    role: m.role,
    content:
      m.type === "complete" && m.fragment
        ? `I built a ${m.fragment.title}: ${m.fragment.description}`
        : m.content,
  }));
```

Use `apiMessages` in both fetch calls (plan route line ~90, generate route line ~158).

**Why rewrite "complete" content:** The UI text ("Here's your Token Board! ...Let me know if you want any changes.") is user-facing copy. Claude needs factual context: "I built a Token Board: [description]".

### 2. Skip plan phase on iteration in `chat.tsx` (Bug 1 — UX)

**File:** `src/features/builder-v2/components/chat.tsx`

When `currentCode` exists, the user already has a tool and wants to modify it. A full "Design Direction" plan adds ~5s latency with no value. Wrap Phase 1 in a conditional:

```typescript
const isIteration = !!currentCode;

if (!isIteration) {
  // Phase 1: Design Plan (first generation only)
  // ... existing plan streaming code ...
} else {
  // Remove the optimistically-added thinking message
  setMessages((prev) => prev.filter((m) => m.id !== thinkingMessageId));
}

// Phase 2: Code Generation (always runs)
// ... existing generate code ...
```

### 3. Add sandbox reconnection in `route.ts` (Bug 2)

**File:** `src/app/api/sandbox/route.ts`

Import `executeFragment` and add reconnection with fallback:

```typescript
import { createSandbox, executeFragment } from "@/features/builder-v2/lib/e2b";

// Inside POST handler:
let result;
if (body.sandboxId) {
  try {
    result = await executeFragment(body.sandboxId, parsed.data);
  } catch {
    // Sandbox expired — fall back to new
    result = await createSandbox(parsed.data);
  }
} else {
  result = await createSandbox(parsed.data);
}
```

**No changes to `e2b.ts`** — `executeFragment()` already handles reconnection correctly.

### 4. Track `sandboxId` state in `page.tsx` (Bug 2)

**File:** `src/app/(app)/builder/page.tsx`

Add state:
```typescript
const [currentSandboxId, setCurrentSandboxId] = useState<string | null>(null);
```

Modify `handleFragmentGenerated` (line 92):
- Pass `sandboxId: currentSandboxId` in the fetch body
- Store returned `sandboxId` via `setCurrentSandboxId(sandboxId)`

Modify project restore flow (line 63):
- Store sandbox ID: `setCurrentSandboxId(sandboxId)` after restore

Modify `handleNewProject` (line 113):
- Reset: `setCurrentSandboxId(null)`

### 5. Increase sandbox timeout in `e2b.ts`

**File:** `src/features/builder-v2/lib/e2b.ts`, line 16

Change `timeoutMs: 60_000` to `timeoutMs: 300_000` (5 minutes) so sandboxes survive multi-turn conversations.

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/builder-v2/components/chat.tsx` | Filter API messages, skip plan on iteration |
| `src/app/api/sandbox/route.ts` | Add executeFragment reconnection with fallback |
| `src/app/(app)/builder/page.tsx` | Track and pass sandboxId state |
| `src/features/builder-v2/lib/e2b.ts` | Increase timeout to 5 minutes |

## Verification

1. Start dev server: `npm run dev`
2. Go to `/builder`, submit a prompt, verify tool generates
3. Send a second prompt (e.g., "Make the colors blue") — should iterate without error, plan phase should be skipped, preview should update in the same sandbox
4. Send a third prompt — should continue iterating
5. Click "New" to reset — should return to prompt home, next generation should create fresh sandbox
6. Run `npx vitest run` — all 347+ tests should pass
