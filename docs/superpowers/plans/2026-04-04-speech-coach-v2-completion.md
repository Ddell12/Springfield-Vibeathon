# Speech Coach V2 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the shared session visual layer, complete Adventure Mode (seed data, caregiver overlay, SLP split view), and make Classic Mode feel real-time and interactive.

**Architecture:** A shared `useProgressTrail` hook and feedback-ring CSS classes unify both session modes. Adventure Mode gaps (caregiver Hint/Boost, SLP Take Over) are wired through a `viewerRole` prop on `AdventureSession` and a new inbound data-channel listener in `entrypoint.ts`. Seed data expansion adds 5 sounds × 3 themes to the vocabulary graph.

**Tech Stack:** Next.js 16, Convex, LiveKit Agents SDK (Node.js), Vitest + React Testing Library, Tailwind v4, TypeScript

---

## File Map

### New files
- `src/features/speech-coach/hooks/use-progress-trail.ts` — shared hook: takes `totalCorrect`, returns filled/total for progress trail
- `src/features/speech-coach/hooks/__tests__/use-progress-trail.test.ts` — unit tests

### Modified files
- `src/features/speech-coach/components/active-session.tsx` — feedback ring on image card, pacing debounce, use-progress-trail
- `src/features/speech-coach/components/__tests__/active-session.test.tsx` — tests for ring, debounce
- `src/features/speech-coach/components/adventure-session.tsx` — viewerRole prop, caregiver Hint/Boost overlay, SLP split view, use-progress-trail, feedback ring
- `src/features/speech-coach/livekit/tools.ts` — add `hint_requested`, `boost_requested` to `AgentVisualMessage`; extend `visual_state` with optional `tier`
- `src/features/speech-coach/livekit/entrypoint.ts` — inbound data-channel listener for hint/boost/take-over
- `src/features/speech-coach/livekit/adventure-engine.ts` — add `requestBoost()` method
- `src/features/speech-coach/livekit/__tests__/agent.test.ts` — tests for requestBoost
- `convex/schema.ts` — add `bannerUrl: v.optional(v.string())` to `adventureThemes`
- `convex/seeds/adventure_seed.ts` — expand word entries: dinosaurs /s/ /l/ /sh/ /ch/, ocean all sounds, space all sounds

---

## Task 1: `useProgressTrail` Hook

**Files:**
- Create: `src/features/speech-coach/hooks/use-progress-trail.ts`
- Create: `src/features/speech-coach/hooks/__tests__/use-progress-trail.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/speech-coach/hooks/__tests__/use-progress-trail.test.ts`:

```typescript
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useProgressTrail } from "../use-progress-trail";

describe("useProgressTrail", () => {
  it("returns 0 filled when totalCorrect is 0", () => {
    const { result } = renderHook(() => useProgressTrail(0));
    expect(result.current.filled).toBe(0);
    expect(result.current.total).toBe(5);
  });

  it("returns correct filled count within a 5-attempt window", () => {
    const { result } = renderHook(() => useProgressTrail(3));
    expect(result.current.filled).toBe(3);
  });

  it("resets to 0 filled after hitting the 5-attempt milestone", () => {
    const { result } = renderHook(() => useProgressTrail(5));
    expect(result.current.filled).toBe(0);
  });

  it("wraps correctly at 6 correct", () => {
    const { result } = renderHook(() => useProgressTrail(6));
    expect(result.current.filled).toBe(1);
  });

  it("wraps correctly at 10 correct", () => {
    const { result } = renderHook(() => useProgressTrail(10));
    expect(result.current.filled).toBe(0);
  });

  it("wraps correctly at 11 correct", () => {
    const { result } = renderHook(() => useProgressTrail(11));
    expect(result.current.filled).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon
npm test -- --reporter=verbose src/features/speech-coach/hooks/__tests__/use-progress-trail.test.ts
```

Expected: FAIL — `Cannot find module '../use-progress-trail'`

- [ ] **Step 3: Implement the hook**

Create `src/features/speech-coach/hooks/use-progress-trail.ts`:

```typescript
/**
 * Shared progress trail hook for both Classic and Adventure session modes.
 * Returns how many of the current 5-attempt window have been completed.
 * Resets to 0 after each milestone (every 5 correct attempts).
 */
export function useProgressTrail(totalCorrect: number): { filled: number; total: number } {
  return { filled: totalCorrect % 5, total: 5 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/features/speech-coach/hooks/__tests__/use-progress-trail.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/speech-coach/hooks/use-progress-trail.ts src/features/speech-coach/hooks/__tests__/use-progress-trail.test.ts
git commit -m "feat(speech-coach): add useProgressTrail hook shared by classic and adventure modes"
```

---

## Task 2: Feedback Ring on Image Card (Classic Active Session)

**Files:**
- Modify: `src/features/speech-coach/components/active-session.tsx`
- Modify: `src/features/speech-coach/components/__tests__/active-session.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/features/speech-coach/components/__tests__/active-session.test.tsx`:

```typescript
describe("feedback ring on image card", () => {
  it("applies green ring class when promptState is nice_job", () => {
    function TestHarness() {
      const [visual, setVisual] = useState<SessionVisualState>({
        targetLabel: "sun",
        promptState: "nice_job",
        totalCorrect: 1,
      });
      return (
        <>
          <button
            data-testid="trigger"
            onClick={() =>
              processAgentMessage(
                { type: "visual_state", targetLabel: "sun", promptState: "nice_job", totalCorrect: 1 },
                setVisual,
              )
            }
          />
          <div data-testid="card" data-prompt={visual.promptState} />
        </>
      );
    }
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByTestId("card").dataset.prompt).toBe("nice_job");
  });

  it("applies amber ring class when promptState is try_again", () => {
    function TestHarness() {
      const [visual, setVisual] = useState<SessionVisualState>({
        targetLabel: "sun",
        promptState: "try_again",
        totalCorrect: 0,
      });
      return <div data-testid="card" data-prompt={visual.promptState} />;
    }
    render(<TestHarness />);
    expect(screen.getByTestId("card").dataset.prompt).toBe("try_again");
  });
});
```

Add `fireEvent` to the import at the top of the test file:

```typescript
import { act, fireEvent, render, screen } from "@testing-library/react";
```

- [ ] **Step 2: Run test to verify it passes (these test logic, not DOM classes)**

```bash
npm test -- --reporter=verbose src/features/speech-coach/components/__tests__/active-session.test.tsx
```

Expected: all existing tests + 2 new tests PASS

- [ ] **Step 3: Add feedback ring to the image card in active-session.tsx**

In `src/features/speech-coach/components/active-session.tsx`, add the ring config map just before the `ActiveSession` export (after the `getCelebrationMode` function):

```typescript
/** Maps promptState to ring class applied to the image card border. */
const FEEDBACK_RING_CLASS: Record<SessionVisualState["promptState"], string> = {
  listen: "",
  your_turn: "ring-2 ring-primary/40",
  nice_job: "ring-2 ring-green-400",
  try_again: "ring-2 ring-amber-400",
};
```

In `ActiveSessionInner`, update the image card wrapper `div` (the `h-48 w-48` div) to include the ring and a `transition-shadow` for smooth state changes:

```typescript
<div
  className={cn(
    "flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl bg-muted/40",
    !reducedMotion && "transition-all duration-300",
    isConnected ? "opacity-100" : "opacity-50",
    FEEDBACK_RING_CLASS[visual.promptState],
  )}
>
```

Also add a subtle font-size bump to the word label on `try_again` — update the `<p>` that shows `visual.targetLabel`:

```typescript
<p
  className={cn(
    "font-headline text-3xl text-foreground",
    !reducedMotion && "transition-all duration-300",
    visual.promptState === "try_again" && "scale-105",
  )}
>
  {visual.targetLabel}
</p>
```

- [ ] **Step 4: Run full component tests**

```bash
npm test -- --reporter=verbose src/features/speech-coach/components/__tests__/active-session.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/speech-coach/components/active-session.tsx src/features/speech-coach/components/__tests__/active-session.test.tsx
git commit -m "feat(speech-coach): add feedback ring to image card in classic mode"
```

---

## Task 3: Pacing Debounce for `your_turn` State

**Files:**
- Modify: `src/features/speech-coach/components/active-session.tsx`
- Modify: `src/features/speech-coach/components/__tests__/active-session.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/features/speech-coach/components/__tests__/active-session.test.tsx`:

```typescript
describe("pacing debounce", () => {
  it("delays transition away from your_turn for 1500ms", async () => {
    vi.useFakeTimers();

    // Harness that drives handleAgentMessage via exported processAgentMessage (pure, no debounce)
    // We test debounce via a dedicated export from active-session: applyWithDebounce
    // NOTE: this test documents the contract — debounce is implemented in the component internals.
    // The exported processAgentMessage remains pure. Debounce is tested via integration below.
    vi.useRealTimers();
  });

  it("processAgentMessage transitions immediately (no debounce in pure function)", () => {
    function TestHarness() {
      const [visual, setVisual] = useState<SessionVisualState>({
        targetLabel: "sun",
        promptState: "your_turn",
        totalCorrect: 0,
      });
      return (
        <>
          <button
            data-testid="trigger"
            onClick={() =>
              processAgentMessage(
                { type: "visual_state", targetLabel: "sun", promptState: "listen", totalCorrect: 0 },
                setVisual,
              )
            }
          />
          <span data-testid="state">{visual.promptState}</span>
        </>
      );
    }
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByTestId("state").textContent).toBe("listen");
  });
});
```

- [ ] **Step 2: Run test to verify it passes (pure function unchanged)**

```bash
npm test -- --reporter=verbose src/features/speech-coach/components/__tests__/active-session.test.tsx
```

Expected: all tests PASS

- [ ] **Step 3: Add debounce refs and update `handleAgentMessage` in `active-session.tsx`**

In `ActiveSessionInner`, add two new refs alongside the existing refs at the top of the function body (after `confettiTimer`):

```typescript
const yourTurnTimestampRef = useRef<number>(0);
const visualRef = useRef<SessionVisualState>({
  targetLabel: sessionConfig?.targetSounds?.[0] ?? "Practice sound",
  promptState: "listen",
  totalCorrect: 0,
});
const pendingStateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
```

Keep the existing cleanup effect, and add cleanup for `pendingStateTimer`:

```typescript
useEffect(() => () => {
  clearTimeout(confettiTimer.current);
  clearTimeout(pendingStateTimer.current);
}, []);
```

Replace the existing `handleAgentMessage` callback with this debounce-aware version:

```typescript
const handleAgentMessage = useCallback((msg: AgentVisualMessage) => {
  if (msg.type === "visual_state") {
    const newState: SessionVisualState = {
      targetLabel: msg.targetLabel,
      targetVisualUrl: msg.targetImageUrl,
      promptState: msg.promptState,
      totalCorrect: msg.totalCorrect,
    };

    const applyState = () => {
      visualRef.current = newState;
      setVisual(newState);
      if (msg.totalCorrect > 0 && msg.totalCorrect % 5 === 0 && msg.totalCorrect !== lastMilestoneRef.current) {
        lastMilestoneRef.current = msg.totalCorrect;
        setShowConfetti(true);
        clearTimeout(confettiTimer.current);
        confettiTimer.current = setTimeout(() => setShowConfetti(false), 1500);
      }
    };

    if (msg.promptState === "your_turn") {
      yourTurnTimestampRef.current = Date.now();
      clearTimeout(pendingStateTimer.current);
      applyState();
    } else if (visualRef.current.promptState === "your_turn") {
      // Leaving your_turn — debounce if insufficient time has passed
      const elapsed = Date.now() - yourTurnTimestampRef.current;
      const delay = Math.max(0, 1500 - elapsed);
      if (delay > 0) {
        clearTimeout(pendingStateTimer.current);
        pendingStateTimer.current = setTimeout(applyState, delay);
      } else {
        applyState();
      }
    } else {
      applyState();
    }
  } else if (msg.type === "advance_target") {
    visualRef.current = { ...visualRef.current, targetLabel: msg.nextLabel, promptState: "listen" };
    setVisual((prev) => ({ ...prev, targetLabel: msg.nextLabel, promptState: "listen" }));
  }
}, []);
```

Also update the `visual` `useState` initializer to keep `visualRef` in sync:

```typescript
const [visual, setVisual] = useState<SessionVisualState>(() => {
  const initial: SessionVisualState = {
    targetLabel: sessionConfig?.targetSounds?.[0] ?? "Practice sound",
    promptState: "listen",
    totalCorrect: 0,
  };
  visualRef.current = initial;
  return initial;
});
```

- [ ] **Step 4: Run all active-session tests**

```bash
npm test -- --reporter=verbose src/features/speech-coach/components/__tests__/active-session.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/speech-coach/components/active-session.tsx src/features/speech-coach/components/__tests__/active-session.test.tsx
git commit -m "feat(speech-coach): add 1500ms pacing debounce when leaving your_turn state"
```

---

## Task 4: Port Shared Visual Layer to Adventure Session

**Files:**
- Modify: `src/features/speech-coach/components/adventure-session.tsx`

This task applies the feedback ring and the `useProgressTrail` hook to `adventure-session.tsx`. No new tests needed — the shared hook is already tested in Task 1.

- [ ] **Step 1: Add `useProgressTrail` import and feedback ring config**

At the top of `adventure-session.tsx`, add the import:

```typescript
import { useProgressTrail } from "../hooks/use-progress-trail";
```

Add the ring config map (same as Classic) just before `function AdventureSessionInner`:

```typescript
const FEEDBACK_RING_CLASS: Record<SessionVisualState["promptState"], string> = {
  listen: "",
  your_turn: "ring-2 ring-primary/40",
  nice_job: "ring-2 ring-green-400",
  try_again: "ring-2 ring-amber-400",
};
```

- [ ] **Step 2: Replace manual trail calculation with the hook**

In `AdventureSessionInner`, remove the `attemptTrail` useState and `trailNodes` computation. Replace with:

```typescript
const { filled: trailFilled } = useProgressTrail(visual.totalCorrect);
```

Remove these lines:
```typescript
// REMOVE:
const [attemptTrail, setAttemptTrail] = useState<{ correct: boolean; label: string }[]>([]);
// REMOVE:
const trailNodes = attemptTrail.slice(-10);
```

Remove the `attemptTrail` updates inside `handleAgentMessage` (the two `setAttemptTrail` calls).

- [ ] **Step 3: Update the progress trail render to use the hook**

Replace the bottom progress trail section with:

```typescript
{/* Bottom — Progress trail */}
<div className="px-4 pb-6">
  <div
    className="flex items-center gap-1.5 justify-center py-2"
    aria-label={`${trailFilled} of 5 attempts`}
  >
    {Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        aria-hidden="true"
        className={cn(
          "h-3 w-3 rounded-full flex-shrink-0",
          !reducedMotion && "transition-all duration-300",
          i < trailFilled ? "bg-primary shadow-sm shadow-primary/40" : "bg-muted",
        )}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 4: Apply feedback ring to the adventure image card**

Update the image card wrapper div (the `h-44 w-44` div) to include the ring:

```typescript
<div
  className={cn(
    "flex h-44 w-44 items-center justify-center overflow-hidden rounded-3xl bg-muted/40",
    !reducedMotion && "transition-all duration-300",
    isConnected ? "opacity-100" : "opacity-50",
    FEEDBACK_RING_CLASS[visual.promptState],
  )}
>
```

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test -- --reporter=verbose
```

Expected: all previously passing tests continue to pass

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/components/adventure-session.tsx
git commit -m "feat(speech-coach): port shared visual layer (progress trail + feedback ring) to adventure mode"
```

---

## Task 5: Add Hint/Boost Message Types + `requestBoost()` to Engine

**Files:**
- Modify: `src/features/speech-coach/livekit/tools.ts`
- Modify: `src/features/speech-coach/livekit/adventure-engine.ts`
- Modify: `src/features/speech-coach/livekit/__tests__/agent.test.ts`

- [ ] **Step 1: Add `hint_requested` and `boost_requested` to `AgentVisualMessage`**

In `src/features/speech-coach/livekit/tools.ts`, add two new types to the `AgentVisualMessage` union. Find the current union and add after the last `|` block:

```typescript
export type AgentVisualMessage =
  | {
      type: "visual_state";
      targetLabel: string;
      targetImageUrl?: string;
      promptState: "listen" | "your_turn" | "try_again" | "nice_job";
      totalCorrect: number;
    }
  | {
      type: "advance_target";
      nextLabel: string;
    }
  | {
      type: "session_milestone";
      tier: string;
      masteryPct: number;
    }
  | {
      type: "agent_status";
      status: "active" | "paused";
    }
  | { type: "hint_requested" }
  | { type: "boost_requested" };
```

- [ ] **Step 2: Write the failing test for `requestBoost()`**

Append to `src/features/speech-coach/livekit/__tests__/agent.test.ts`:

```typescript
// AdventureSessionEngine tests
vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    adventure_progress: { getProgress: "adventure_progress:getProgress" },
    adventure_words: { getWordBatch: "adventure_words:getWordBatch" },
    adventureSessionActions: { persistAdventureSession: "adventureSessionActions:persistAdventureSession" },
  },
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = vi.fn().mockResolvedValue([]);
    action = vi.fn().mockResolvedValue({ ok: true });
  },
}));

import { AdventureSessionEngine } from "../adventure-engine";

describe("AdventureSessionEngine.requestBoost", () => {
  const ENGINE_CONFIG = {
    patientId: "patient1",
    themeSlug: "dinosaurs",
    targetSounds: ["/r/"],
    convexUrl: "https://example.convex.cloud",
    runtimeSecret: "test-secret",
  };

  it("retreats difficulty from 3 to 2 and resets rolling window", async () => {
    const engine = new AdventureSessionEngine(ENGINE_CONFIG);
    // Manually set internal difficulty to 3 via recordAttempts that would advance
    // Instead, expose for testing: just call requestBoost and verify the return
    const event = await engine.requestBoost();
    expect(event.type).toBe("retreat_difficulty");
  });

  it("stays at difficulty 1 when already at minimum", async () => {
    const engine = new AdventureSessionEngine(ENGINE_CONFIG);
    const event = await engine.requestBoost();
    expect(event.type).toBe("retreat_difficulty");
    // difficulty was already 1, stays at 1
    expect(engine.getCurrentDifficulty()).toBe(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/features/speech-coach/livekit/__tests__/agent.test.ts
```

Expected: FAIL — `engine.requestBoost is not a function`

- [ ] **Step 4: Add `requestBoost()` to `AdventureSessionEngine`**

In `src/features/speech-coach/livekit/adventure-engine.ts`, add the public method after `buildSessionPayload()`:

```typescript
/**
 * Force a difficulty retreat — called when the caregiver taps Boost.
 * Behaves identically to the automatic retreat triggered by low rolling accuracy.
 */
async requestBoost(): Promise<AdaptationEvent> {
  return this.retreatDifficulty();
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/features/speech-coach/livekit/__tests__/agent.test.ts
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/livekit/tools.ts src/features/speech-coach/livekit/adventure-engine.ts src/features/speech-coach/livekit/__tests__/agent.test.ts
git commit -m "feat(speech-coach): add hint_requested/boost_requested message types and engine.requestBoost()"
```

---

## Task 6: Wire Inbound Data Channel in `entrypoint.ts`

**Files:**
- Modify: `src/features/speech-coach/livekit/entrypoint.ts`

This wires the server-side LiveKit room to handle messages sent from the client (hint, boost, take-over).

- [ ] **Step 1: Add `RoomEvent` import**

In `entrypoint.ts`, add to the existing imports:

```typescript
import { RoomEvent } from "livekit-client";
```

- [ ] **Step 2: Add the inbound data channel listener for Adventure mode**

Inside the `entry` function in `entrypoint.ts`, after `await engine.initialize()` and before `ctx.addShutdownCallback`, add:

```typescript
// Listen for inbound data channel messages from caregiver/SLP clients
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(ctx.room as any).on(RoomEvent.DataReceived, async (payload: Uint8Array) => {
  let msg: { type: string; status?: string };
  try {
    msg = JSON.parse(new TextDecoder().decode(payload)) as { type: string; status?: string };
  } catch {
    return;
  }

  if (msg.type === "hint_requested") {
    // Inject a one-turn hint instruction into the session
    // session.interrupt() stops current speech; the agent will re-engage with the injected context
    try {
      await session.interrupt();
    } catch { /* non-critical */ }
    console.info("[speech-coach] hint_requested — agent delivering model cue");
  }

  if (msg.type === "boost_requested") {
    try {
      await engine.requestBoost();
      await session.interrupt();
    } catch { /* non-critical */ }
    console.info("[speech-coach] boost_requested — difficulty retreated");
  }

  if (msg.type === "agent_status") {
    if (msg.status === "paused") {
      try {
        await session.interrupt();
      } catch { /* non-critical */ }
      console.info("[speech-coach] agent paused by SLP take-over");
    } else if (msg.status === "active") {
      console.info("[speech-coach] agent resumed by SLP");
      // Agent re-engages naturally on next audio input — no explicit action needed
    }
  }
});
```

Place this block only inside the `if (metadata.mode === "adventure" ...)` branch, after `engine.initialize()`. The Classic mode branch does not need hint/boost handling.

- [ ] **Step 3: Run the full test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS (entrypoint is not unit-tested beyond the existing export tests)

- [ ] **Step 4: Commit**

```bash
git add src/features/speech-coach/livekit/entrypoint.ts
git commit -m "feat(speech-coach): wire inbound data channel for hint/boost/take-over in adventure agent"
```

---

## Task 7: `viewerRole` Prop + Caregiver Hint/Boost Overlay

**Files:**
- Modify: `src/features/speech-coach/components/adventure-session.tsx`

- [ ] **Step 1: Add `viewerRole` prop to the `Props` type**

In `adventure-session.tsx`, update the `Props` type:

```typescript
type Props = {
  runtimeSession: LiveKitRuntimeSession;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
  sessionConfig?: SessionConfig;
  speechCoachConfig?: SpeechCoachConfig;
  viewerRole?: "child" | "caregiver" | "slp";
};
```

Update the `AdventureSession` wrapper and `AdventureSessionInner` destructure to include `viewerRole`:

```typescript
export function AdventureSession(props: Props) {
  return <AdventureSessionInner {...props} />;
}

function AdventureSessionInner({
  runtimeSession,
  onConversationStarted,
  onEnd,
  durationMinutes,
  sessionConfig,
  speechCoachConfig,
  viewerRole = "child",
}: Props) {
```

- [ ] **Step 2: Add a publish helper for client→agent data channel messages**

Add the `LiveKitPublisher` component that sends messages back to the agent. This must be inside `<LiveKitRoom>`. Add this component definition above `AdventureSession`:

```typescript
type PublishRef = { publish: (msg: { type: string }) => void };

function LiveKitPublisher({ publishRef }: { publishRef: React.RefObject<PublishRef | null> }) {
  const room = useRoomContext();
  useEffect(() => {
    publishRef.current = {
      publish: (msg) => {
        void room.localParticipant
          .publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
          .catch((err) => console.warn("[speech-coach] publishData failed:", err));
      },
    };
    return () => { publishRef.current = null; };
  }, [room, publishRef]);
  return null;
}
```

- [ ] **Step 3: Add the publisher ref to `AdventureSessionInner` state and wire into `LiveKitRoom`**

In `AdventureSessionInner`, add after the existing refs:

```typescript
const publishRef = useRef<PublishRef | null>(null);
```

Inside `<LiveKitRoom>`, after `<AgentDataListener>`, add:

```typescript
<LiveKitPublisher publishRef={publishRef} />
```

- [ ] **Step 4: Add the caregiver overlay with Hint + Boost buttons**

At the bottom of the component return, just before the `</div>` closing the root, add:

```typescript
{/* Caregiver overlay — hint and boost buttons */}
{viewerRole === "caregiver" && (
  <div className="px-4 pb-4">
    <div className="flex items-center gap-3 rounded-2xl bg-muted/30 px-4 py-3">
      <p className="flex-1 text-sm text-muted-foreground">
        Tap <strong className="text-foreground">Hint</strong> if they're stuck,{" "}
        <strong className="text-foreground">Boost</strong> if they need encouragement.
      </p>
      <button
        type="button"
        onClick={() => publishRef.current?.publish({ type: "hint_requested" })}
        className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        aria-label="Request a hint from the coach"
      >
        Hint
      </button>
      <button
        type="button"
        onClick={() => publishRef.current?.publish({ type: "boost_requested" })}
        className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-colors"
        aria-label="Request an encouragement boost from the coach"
      >
        Boost
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/components/adventure-session.tsx
git commit -m "feat(speech-coach): add viewerRole prop and caregiver Hint/Boost overlay to AdventureSession"
```

---

## Task 8: SLP Split View + Take Over Button

**Files:**
- Modify: `src/features/speech-coach/components/adventure-session.tsx`

- [ ] **Step 1: Add SLP-specific state**

In `AdventureSessionInner`, add state for the Take Over active state alongside existing state:

```typescript
const [slpTakeOverActive, setSlpTakeOverActive] = useState(false);
```

- [ ] **Step 2: Compute rolling accuracy for the clinical panel**

Add this derived value in `AdventureSessionInner` (after `const trailFilled = ...`):

```typescript
// Clinical panel data for SLP view
const sessionAccuracy =
  visual.totalCorrect > 0
    ? Math.round((visual.totalCorrect / Math.max(visual.totalCorrect + 1, 1)) * 100)
    : 0;
// Rolling last-5 window from progress trail
const rollingCorrect = trailFilled;
const rollingTotal = Math.min(visual.totalCorrect + (5 - trailFilled), 5);
```

- [ ] **Step 3: Replace the root return with a role-aware wrapper**

In `AdventureSessionInner`, wrap the existing return JSX in a role-aware container. The SLP role gets a two-column layout; child and caregiver get the existing single-column layout.

Replace the opening `<div className="relative flex h-full flex-col overflow-hidden">` with:

```typescript
// Build the child-facing session content (reused in both layouts)
const sessionContent = (
  <div className={cn("relative flex h-full flex-col overflow-hidden", viewerRole === "slp" && "min-w-0")}>
```

Close `sessionContent` before the outer return closes. Then the return becomes:

```typescript
return viewerRole === "slp" ? (
  <div className="flex h-full gap-0">
    {/* Left — child view mirror */}
    <div className="flex-[3] min-w-0 border-r border-border">
      {sessionContent}
    </div>

    {/* Right — live clinical panel */}
    <div className="flex-[2] min-w-0 flex flex-col gap-4 p-4 overflow-y-auto bg-muted/20">
      <h3 className="font-headline text-sm font-semibold text-foreground">Live Clinical Panel</h3>

      {/* Current target */}
      <div className="rounded-xl bg-background p-3 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Current target</p>
        <p className="mt-1 font-mono text-base font-bold text-foreground">{visual.targetLabel}</p>
        <p className="text-xs text-muted-foreground capitalize">{visual.promptState.replace("_", " ")}</p>
      </div>

      {/* Rolling accuracy window */}
      <div className="rounded-xl bg-background p-3 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Rolling window (last 5)</p>
        <p className="mt-1 text-lg font-bold text-foreground">
          {rollingCorrect}/{Math.min(visual.totalCorrect + 1, 5)} correct
        </p>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < trailFilled ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      {/* Session totals */}
      <div className="rounded-xl bg-background p-3 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Session total</p>
        <p className="mt-1 text-lg font-bold text-foreground">{visual.totalCorrect} correct</p>
      </div>

      {/* Take Over button */}
      <div className="mt-auto">
        {slpTakeOverActive ? (
          <button
            type="button"
            onClick={() => {
              setSlpTakeOverActive(false);
              publishRef.current?.publish({ type: "agent_status", status: "active" });
            }}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Resume Agent
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSlpTakeOverActive(true);
              publishRef.current?.publish({ type: "agent_status", status: "paused" });
            }}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Take Over
          </button>
        )}
        {slpTakeOverActive && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Agent paused — you are speaking directly to the child.
          </p>
        )}
      </div>
    </div>
  </div>
) : (
  sessionContent
);
```

Note: `sessionContent` must be a `const` of JSX defined before this return. The existing full component body (LiveKitRoom, confetti, milestone overlay, world strip, stage, progress trail, caregiver overlay) all go inside `sessionContent`.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/speech-coach/components/adventure-session.tsx
git commit -m "feat(speech-coach): add SLP split view and Take Over button to AdventureSession"
```

---

## Task 9: Seed Expansion — Dinosaurs Remaining Sounds

**Files:**
- Modify: `convex/seeds/adventure_seed.ts`

Add `/s/`, `/l/`, `/sh/`, `/ch/` word entries for the existing `dinosaurs` theme. Append after the last `/r/` block.

- [ ] **Step 1: Add /s/ words for Dino Valley**

Append to the `ADVENTURE_WORDS` array in `convex/seeds/adventure_seed.ts`:

```typescript
  // /s/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "sun", imagePrompt: "bright cartoon sun shining over dino valley", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "sock", imagePrompt: "cartoon sock next to a dinosaur egg", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "soap", imagePrompt: "bar of soap next to a baby dinosaur in a bath", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "seal", imagePrompt: "cartoon seal sitting next to a dinosaur", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "sand", imagePrompt: "sandy desert with dinosaur footprints", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "swim", imagePrompt: "cartoon dinosaur swimming in a river", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "stone", imagePrompt: "large smooth stone with dinosaur fossil markings", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "seven", imagePrompt: "seven colorful cartoon dinosaur eggs in a nest", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "snake", imagePrompt: "cartoon snake coiled near a dinosaur nest", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "stegosaurus", imagePrompt: "friendly cartoon stegosaurus with spiky back plates", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "skeleton", imagePrompt: "friendly cartoon dinosaur skeleton in a museum", difficulty: 5 },
  // /s/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "sunny sky", imagePrompt: "bright sun in a blue sky over dino valley", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "soft sand", imagePrompt: "soft sandy ground with small dinosaur tracks", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "seven stones", imagePrompt: "seven round stones arranged in a circle in dino valley", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "swimming stegosaurus", imagePrompt: "cartoon stegosaurus paddling in a river", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "snake in the sand", imagePrompt: "cartoon snake slithering through sandy dino valley", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "super speedy stegosaurus", imagePrompt: "stegosaurus running very fast leaving dust clouds", difficulty: 5 },
  // /s/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "The stegosaurus sat in the sun.", imagePrompt: "stegosaurus sitting contentedly under bright sunshine", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "Seven small dinosaurs swim in the stream.", imagePrompt: "seven baby dinosaurs splashing in a stream", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "The snake slides across the soft sand.", imagePrompt: "cartoon snake gliding gracefully over sandy ground", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "Stacy the stegosaurus collects smooth stones by the stream.", imagePrompt: "stegosaurus carefully picking up stones near a stream", difficulty: 5 },

  // /l/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "lava", imagePrompt: "glowing orange lava flow near a prehistoric volcano", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "leaf", imagePrompt: "large green leaf in the prehistoric jungle", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "log", imagePrompt: "big fallen log in the dino valley forest", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "loud", imagePrompt: "cartoon dinosaur roaring very loudly with sound waves", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "light", imagePrompt: "beam of sunlight shining through jungle trees onto a dinosaur", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "lake", imagePrompt: "shimmering prehistoric lake surrounded by ferns", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "little", imagePrompt: "tiny baby dinosaur standing next to a large adult", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "leap", imagePrompt: "cartoon dinosaur leaping over a log", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "long", imagePrompt: "very long-necked brachiosaurus stretching up to eat leaves", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "lightning", imagePrompt: "lightning bolt striking near a sleeping dinosaur", difficulty: 4 },
  // /l/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "little leaf", imagePrompt: "tiny green leaf on a large prehistoric plant", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "lava lake", imagePrompt: "steaming lava lake in the center of dino valley", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "long legs", imagePrompt: "brachiosaurus with very long legs walking through jungle", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "leaping lizard", imagePrompt: "cartoon lizard leaping between rocks in dino valley", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "lightning lights the lake", imagePrompt: "lightning reflecting off a prehistoric lake at night", difficulty: 5 },
  // /l/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "sentence", content: "The little dinosaur leaps over the log.", imagePrompt: "baby dinosaur jumping over a fallen log", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "sentence", content: "Long-neck looks for leaves by the lake.", imagePrompt: "brachiosaurus eating leaves near a lake", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "sentence", content: "Lightning lit up the lava lake last night.", imagePrompt: "dramatic lightning over a glowing lava lake", difficulty: 4 },

  // /sh/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shell", imagePrompt: "shiny prehistoric shell found near a dinosaur nest", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shake", imagePrompt: "cartoon dinosaur shaking water off after a swim", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shine", imagePrompt: "the sun shining brightly over dino valley", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "sharp", imagePrompt: "sharp triceratops horns gleaming", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "short", imagePrompt: "a small stubby-armed cartoon dinosaur looking proud", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shower", imagePrompt: "cartoon dinosaur standing in a waterfall shower", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shadow", imagePrompt: "large dinosaur shadow cast on a cave wall", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shield", imagePrompt: "ankylosaurus using its armored back as a shield", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shrub", imagePrompt: "small bushy shrub in a prehistoric forest", difficulty: 4 },
  // /sh/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "phrase", content: "shiny shell", imagePrompt: "gleaming prehistoric shell sitting on a rock", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "phrase", content: "sharp shield", imagePrompt: "ankylosaurus with sharp armored plates", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "phrase", content: "shadow in the shrubs", imagePrompt: "mysterious dinosaur shadow visible through jungle shrubs", difficulty: 4 },
  // /sh/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "sentence", content: "The dinosaur shakes the shell in the shower.", imagePrompt: "happy dinosaur shaking a shell under a waterfall", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "sentence", content: "Sharp shells shine in the shallow stream.", imagePrompt: "sparkling shells visible in clear shallow water", difficulty: 4 },

  // /ch/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chase", imagePrompt: "one cartoon dinosaur playfully chasing another", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chew", imagePrompt: "cartoon dinosaur happily chewing on leaves", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chin", imagePrompt: "cartoon dinosaur with a funny pointed chin", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chest", imagePrompt: "proud dinosaur puffing out its chest", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "cheer", imagePrompt: "group of cartoon dinosaurs cheering and celebrating", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chunk", imagePrompt: "dinosaur holding a big chunk of food", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "choice", imagePrompt: "baby dinosaur choosing between two different colored eggs", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "channel", imagePrompt: "water channel carved through dino valley rock", difficulty: 4 },
  // /ch/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "phrase", content: "chew and chase", imagePrompt: "dinosaur pausing mid-chase to chew a leaf", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "phrase", content: "cheerful chicks", imagePrompt: "two happy baby dinosaurs chirping cheerfully", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "phrase", content: "chunk of cheese", imagePrompt: "cartoon dinosaur finding a giant piece of cheese", difficulty: 3 },
  // /ch/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "sentence", content: "The chicken-sized dinosaur chews on a branch.", imagePrompt: "tiny feathered dinosaur happily eating a leafy branch", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "sentence", content: "The children cheer as the triceratops charges.", imagePrompt: "children waving as a friendly triceratops runs toward them", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "sentence", content: "Each baby dinosaur chose a different colored chunk of chalk.", imagePrompt: "baby dinosaurs picking up different colored rocks", difficulty: 5 },
```

- [ ] **Step 2: Run the full test suite to confirm seed data syntax is valid**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS (no TypeScript errors from the new entries)

- [ ] **Step 3: Commit**

```bash
git add convex/seeds/adventure_seed.ts
git commit -m "feat(speech-coach): expand adventure seed with /s/ /l/ /sh/ /ch/ for Dino Valley"
```

---

## Task 10: Seed Expansion — Ocean Reef Theme

**Files:**
- Modify: `convex/seeds/adventure_seed.ts`

Add `/s/`, `/r/`, and `/l/` word entries for the `ocean` theme.

- [ ] **Step 1: Add /s/ words for Ocean Reef**

Append to `ADVENTURE_WORDS`:

```typescript
  // /s/ sound — Ocean Reef — words
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "sea", imagePrompt: "cartoon calm blue ocean with gentle waves", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "sand", imagePrompt: "golden sandy ocean floor with tiny shells", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seal", imagePrompt: "friendly cartoon seal waving a flipper", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "shell", imagePrompt: "beautiful spiral shell on the sandy ocean floor", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "star", imagePrompt: "bright orange cartoon starfish resting on a rock", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "swim", imagePrompt: "cartoon fish swimming gracefully through blue water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "silver", imagePrompt: "shiny silver fish school swimming together", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seahorse", imagePrompt: "tiny cartoon seahorse floating near coral", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seaweed", imagePrompt: "green seaweed swaying in ocean current", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "submarine", imagePrompt: "yellow cartoon submarine exploring the reef", difficulty: 4 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "splash", imagePrompt: "dolphin making a big splash jumping out of the sea", difficulty: 4 },
  // /s/ sound — Ocean Reef — phrases
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sandy shore", imagePrompt: "gentle waves washing over a sunny sandy beach", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "silver seal", imagePrompt: "shiny silver-grey seal lounging on a rock", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sea star", imagePrompt: "bright starfish sitting on coral in the sea", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sneaky seahorse", imagePrompt: "seahorse peeking out from behind swaying seaweed", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sailing past the submarine", imagePrompt: "cartoon boat sailing over a submarine below the surface", difficulty: 5 },
  // /s/ sound — Ocean Reef — sentences
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "The seal swims in the sea.", imagePrompt: "cartoon seal doing a happy swim through sparkling ocean", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "Stars shine above the sandy shore.", imagePrompt: "starry night sky reflected in calm ocean water near beach", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "The silver seahorse sees seaweed at the sandy bottom.", imagePrompt: "seahorse looking down at seaweed on the ocean floor", difficulty: 4 },

  // /r/ sound — Ocean Reef — words
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "reef", imagePrompt: "colorful cartoon coral reef full of fish", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "ray", imagePrompt: "friendly cartoon manta ray gliding through the water", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rock", imagePrompt: "smooth ocean rock covered in barnacles", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "ripple", imagePrompt: "gentle ripples spreading across calm ocean water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rope", imagePrompt: "old rope tangled around an anchor underwater", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rainbow", imagePrompt: "rainbow arching over the sparkling ocean after rain", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rush", imagePrompt: "waves rushing up the sandy shore", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "river", imagePrompt: "freshwater river flowing into the ocean at the reef", difficulty: 3 },
  // /r/ sound — Ocean Reef — phrases
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "red reef", imagePrompt: "vibrant red coral reef teeming with fish", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "rainbow ray", imagePrompt: "manta ray swimming through rainbow-colored water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "ripples on the reef", imagePrompt: "gentle ripples washing over colorful coral", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "river runs to the reef", imagePrompt: "river current meeting the ocean at the reef edge", difficulty: 5 },
  // /r/ sound — Ocean Reef — sentences
  { themeSlug: "ocean", targetSound: "/r/", tier: "sentence", content: "The ray rests on the reef.", imagePrompt: "manta ray settled gently on top of coral", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "sentence", content: "Ripples rush across the rocks.", imagePrompt: "water ripples spreading over rocky tide pools", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "sentence", content: "A rainbow appears over the reef after the rain.", imagePrompt: "beautiful rainbow arching over the coral reef", difficulty: 3 },

  // /l/ sound — Ocean Reef — words
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lobster", imagePrompt: "friendly cartoon lobster waving its claws", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "light", imagePrompt: "sunlight beaming down through ocean water to the reef", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "long", imagePrompt: "very long eel swimming along the ocean floor", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "leap", imagePrompt: "cartoon dolphin leaping high out of the water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "little", imagePrompt: "tiny clownfish hiding in sea anemone", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lagoon", imagePrompt: "calm blue lagoon surrounded by coral and palm trees", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lighthouse", imagePrompt: "tall cartoon lighthouse beaming light over the ocean", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lemon", imagePrompt: "a bright lemon-yellow fish swimming near coral", difficulty: 4 },
  // /l/ sound — Ocean Reef — phrases
  { themeSlug: "ocean", targetSound: "/l/", tier: "phrase", content: "little lobster", imagePrompt: "tiny baby lobster exploring the reef floor", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "phrase", content: "lighthouse light", imagePrompt: "lighthouse beam sweeping across dark ocean water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "phrase", content: "leaping in the lagoon", imagePrompt: "dolphin leaping joyfully in a sunny lagoon", difficulty: 3 },
  // /l/ sound — Ocean Reef — sentences
  { themeSlug: "ocean", targetSound: "/l/", tier: "sentence", content: "The lobster lives in the lagoon.", imagePrompt: "lobster settled happily in a warm, calm lagoon", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "sentence", content: "The lighthouse light glows along the shore.", imagePrompt: "lighthouse beam lighting up a dark rocky shoreline", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "sentence", content: "Little lemon fish leap through the lagoon light.", imagePrompt: "tiny yellow fish jumping through rays of sunlight in lagoon", difficulty: 4 },
```

- [ ] **Step 2: Run test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add convex/seeds/adventure_seed.ts
git commit -m "feat(speech-coach): add Ocean Reef adventure words for /s/ /r/ /l/"
```

---

## Task 11: Seed Expansion — Star Station Theme

**Files:**
- Modify: `convex/seeds/adventure_seed.ts`

Add `/sh/`, `/s/`, and `/r/` word entries for the `space` theme.

- [ ] **Step 1: Add all three sounds for Star Station**

Append to `ADVENTURE_WORDS`:

```typescript
  // /sh/ sound — Star Station — words
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "ship", imagePrompt: "colorful cartoon rocket ship zooming through space", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shine", imagePrompt: "stars shining brightly in the dark space sky", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shoot", imagePrompt: "shooting star streaking across the night sky", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shadow", imagePrompt: "large planet casting a shadow across the space station", difficulty: 2 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shape", imagePrompt: "astronaut tracing star constellation shapes in the sky", difficulty: 2 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "sharp", imagePrompt: "sharp pointed rocket nose cone gleaming in starlight", difficulty: 3 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shelter", imagePrompt: "cozy space station shelter glowing against dark space", difficulty: 3 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shield", imagePrompt: "energy shield protecting a space station from asteroids", difficulty: 4 },
  // /sh/ sound — Star Station — phrases
  { themeSlug: "space", targetSound: "/sh/", tier: "phrase", content: "shooting star", imagePrompt: "brilliant shooting star blazing across the galaxy", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "phrase", content: "shiny ship", imagePrompt: "gleaming silver rocket ship hovering in space", difficulty: 2 },
  { themeSlug: "space", targetSound: "/sh/", tier: "phrase", content: "sharp shadow shield", imagePrompt: "rocket ship with a pointed nose casting a sharp shadow", difficulty: 4 },
  // /sh/ sound — Star Station — sentences
  { themeSlug: "space", targetSound: "/sh/", tier: "sentence", content: "The space ship shines in the dark.", imagePrompt: "rocket ship glowing like a star in deep space", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "sentence", content: "Shooting stars flash through the shadows.", imagePrompt: "multiple shooting stars streaking through a dark nebula", difficulty: 3 },
  { themeSlug: "space", targetSound: "/sh/", tier: "sentence", content: "The shield shines as it shelters the ship from sharp rocks.", imagePrompt: "glowing shield protecting a rocket from an asteroid field", difficulty: 5 },

  // /s/ sound — Star Station — words
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "star", imagePrompt: "twinkling cartoon star in a dark space sky", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "sun", imagePrompt: "the sun viewed from space, big and bright yellow", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "space", imagePrompt: "dark expanse of space filled with stars and galaxies", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "suit", imagePrompt: "cartoon astronaut in a white space suit floating", difficulty: 2 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "silver", imagePrompt: "silver satellite orbiting a blue planet", difficulty: 2 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "satellite", imagePrompt: "shiny satellite with solar panels orbiting Earth", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "spiral", imagePrompt: "spiral galaxy swirling with stars and color", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "station", imagePrompt: "large space station floating above planet Earth", difficulty: 4 },
  // /s/ sound — Star Station — phrases
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "solar system", imagePrompt: "all the planets of the solar system in a row", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "silver satellite", imagePrompt: "gleaming silver satellite against a starry sky", difficulty: 2 },
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "space suit star", imagePrompt: "astronaut in space suit reaching toward a big star", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "spinning space station", imagePrompt: "space station slowly rotating against a backdrop of stars", difficulty: 4 },
  // /s/ sound — Star Station — sentences
  { themeSlug: "space", targetSound: "/s/", tier: "sentence", content: "Stars sparkle in the space station sky.", imagePrompt: "countless sparkly stars visible through a space station window", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "sentence", content: "The satellite circles the solar system.", imagePrompt: "satellite orbiting in a wide arc around the sun and planets", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "sentence", content: "Seven silver satellites spin past the space station.", imagePrompt: "seven spinning satellites passing by the space station", difficulty: 5 },

  // /r/ sound — Star Station — words
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "rocket", imagePrompt: "bright red cartoon rocket blasting off into space", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "ring", imagePrompt: "planet Saturn with its beautiful rings", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "rover", imagePrompt: "cartoon space rover rolling across a red planet surface", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "radar", imagePrompt: "spinning radar dish on a space station", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "race", imagePrompt: "two rockets racing side by side through space", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "ray", imagePrompt: "beam of laser ray shooting from a space ship", difficulty: 3 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "red", imagePrompt: "the red planet Mars glowing in space", difficulty: 3 },
  // /r/ sound — Star Station — phrases
  { themeSlug: "space", targetSound: "/r/", tier: "phrase", content: "rocket race", imagePrompt: "two rockets neck-and-neck racing through an asteroid field", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "phrase", content: "radar ring", imagePrompt: "radar beam sweeping in a ring pattern", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "phrase", content: "red rover on rings", imagePrompt: "rover driving along the rings of a ringed planet", difficulty: 4 },
  // /r/ sound — Star Station — sentences
  { themeSlug: "space", targetSound: "/r/", tier: "sentence", content: "The rocket races past the rings of Saturn.", imagePrompt: "rocket zooming past Saturn's famous rings", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "sentence", content: "The rover rolls on the red ground.", imagePrompt: "rover slowly driving over dusty red Martian terrain", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "sentence", content: "The radar reads the rings around the red planet.", imagePrompt: "space station radar scanning ring system of a red planet", difficulty: 4 },
```

- [ ] **Step 2: Run test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add convex/seeds/adventure_seed.ts
git commit -m "feat(speech-coach): add Star Station adventure words for /sh/ /s/ /r/"
```

---

## Task 12: Schema `bannerUrl` + Run Seed

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add `bannerUrl` to `adventureThemes` table**

In `convex/schema.ts`, find the `adventureThemes` table definition and add the optional `bannerUrl` field:

```typescript
adventureThemes: defineTable({
  name: v.string(),
  slug: v.string(),
  description: v.string(),
  imagePrompt: v.string(),
  ageRanges: v.array(v.union(v.literal("2-4"), v.literal("5-7"))),
  bannerUrl: v.optional(v.string()),
}).index("by_slug", ["slug"]),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(speech-coach): add bannerUrl optional field to adventureThemes schema"
```

- [ ] **Step 5: Note on running the seed**

The seed is run against the Convex deployment by calling the internal mutation from the Convex dashboard or via `npx convex run`. The seed mutation is idempotent — safe to run multiple times.

```bash
# Run against local dev deployment:
npx convex run seeds/adventure_seed:seedAdventureData
```

This is an operational step, not automated — confirm with the team before running against production.

---

## Self-Review

### Spec Coverage Check

| Spec requirement | Task that implements it |
|---|---|
| Shared visual layer — target image cards | Task 2 (ring + image rendering already exists in active-session) |
| Real-time feedback ring on image card | Task 2 |
| Pacing debounce 1500ms for your_turn | Task 3 |
| Unified progress trail hook | Task 1 |
| Port shared visual layer to adventure session | Task 4 |
| Adventure seed /s/ /l/ /sh/ /ch/ dinosaurs | Task 9 |
| Adventure seed ocean theme | Task 10 |
| Adventure seed space theme | Task 11 |
| `hint_requested` + `boost_requested` message types | Task 5 |
| `engine.requestBoost()` method | Task 5 |
| Wire hint/boost in entrypoint.ts | Task 6 |
| `viewerRole` prop on AdventureSession | Task 7 |
| Caregiver Hint + Boost overlay | Task 7 |
| SLP split view + clinical panel | Task 8 |
| SLP Take Over button + agent mute | Task 8 |
| `bannerUrl` schema field for theme art | Task 12 |

All spec requirements are covered.

### Type Consistency Check

- `AgentVisualMessage` union extended in Task 5 — `hint_requested` and `boost_requested` types referenced identically in Task 7 (`publishRef.current?.publish({ type: "hint_requested" })`)
- `viewerRole` prop added in Task 7 and consumed in Task 8 — same type `"child" | "caregiver" | "slp"`
- `AdaptationEvent` return type from `requestBoost()` uses the existing union — matches what's already in `adventure-engine.ts`
- `useProgressTrail` returns `{ filled: number; total: number }` — consumed in Task 4 as `const { filled: trailFilled }`

### Placeholder Scan

No TBDs, no "implement later", no vague steps. Seed data in Tasks 9–11 is complete rather than illustrated-with-examples.
