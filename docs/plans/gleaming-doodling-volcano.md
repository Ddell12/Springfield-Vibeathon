# Speech Coach LiveKit Room Wiring

## Context

After the `feat/speech-coach-runtime` branch was merged, two items remained incomplete:

1. **`LIVEKIT_URL` env var** — the Convex action `createLiveSession` throws `ConvexError("LIVEKIT_URL not configured")` unless this is set in the Convex dashboard. The Next.js side already has `NEXT_PUBLIC_LIVEKIT_URL` in `.env.local`, but Convex runs on its own servers and can't read Next.js env vars.

2. **`active-session.tsx` placeholder** — the component simulates a connection via `setTimeout(() => onConversationStarted(roomName), 0)`. No real LiveKit room is ever joined. Audio never flows.

This plan wires the real LiveKit room join and documents the env var.

---

## Step 0 — Manual: Add `LIVEKIT_URL` to Convex Dashboard

> **Developer action required — cannot be done in code.**

1. Open the Convex Dashboard → Settings → Environment Variables.
2. Add: `LIVEKIT_URL` = `wss://speechai-lyl0ssvk.livekit.cloud`
   (same value as `NEXT_PUBLIC_LIVEKIT_URL` in `.env.local`)

**Why two variables?** `NEXT_PUBLIC_LIVEKIT_URL` is a Next.js build-time substitution — it doesn't exist in the Convex runtime. Convex needs its own copy set via its dashboard.

---

## Step 1 — Update `CLAUDE.md`

File: `/Users/desha/Springfield-Vibeathon/CLAUDE.md`

In the **Convex Dashboard** env vars section, add three entries:
```
- `LIVEKIT_URL` — LiveKit server WebSocket URL for agent sessions
- `LIVEKIT_API_KEY` — LiveKit API key for token signing
- `LIVEKIT_API_SECRET` — LiveKit API secret for token signing
```

---

## Step 2 — Wire `active-session.tsx`

File: `/Users/desha/Springfield-Vibeathon/src/features/speech-coach/components/active-session.tsx`

`@livekit/components-react@2.9.20` is already installed. Reference pattern: `src/features/sessions/components/call-room.tsx`.

### 2a — Add imports

```tsx
import { useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
```

Do **not** import `@livekit/components-styles` — the speech coach UI uses only Tailwind classes, not LiveKit's global stylesheet.

### 2b — Add state (inside `ActiveSessionInner`)

```tsx
const [token, setToken] = useState<string | null>(null);
const [serverUrl, setServerUrl] = useState<string | null>(null);
const [fetchError, setFetchError] = useState(false);
const [isConnected, setIsConnected] = useState(false);  // drives JSX — refs don't re-render
```

Keep existing refs (`wasConnected`, `hasStarted`) for timeout guards.

### 2c — Replace the simulation `useEffect` with a real token fetch

Remove:
```tsx
// Simulate connection start — LiveKit room connection wired in next task.
useEffect(() => {
  const timer = setTimeout(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    wasConnected.current = true;
    onConversationStarted(runtimeSession.roomName);
  }, 0);
  return () => clearTimeout(timer);
}, [runtimeSession.roomName, onConversationStarted]);
```

Replace with:
```tsx
useEffect(() => {
  if (hasStarted.current) return;
  hasStarted.current = true;

  fetch(runtimeSession.tokenPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomName: runtimeSession.roomName,
      participantName: "participant",
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ token: string; serverUrl: string }>;
    })
    .then(({ token, serverUrl }) => {
      setToken(token);
      setServerUrl(serverUrl);
    })
    .catch(() => setFetchError(true));
}, [runtimeSession.tokenPath, runtimeSession.roomName]);
```

`hasStarted.current` guards against React StrictMode double-invocation. `participantName: "participant"` is hardcoded — there is only one human participant in a speech coach room.

### 2d — Update the 15-second timeout `useEffect` to fast-fail on fetch error

```tsx
useEffect(() => {
  if (fetchError) {
    toast.error("Couldn't reach speech coach", {
      description: "Check your internet connection and try again.",
    });
    onEnd();
    return;
  }

  const timeout = setTimeout(() => {
    if (!wasConnected.current) {
      toast.error("Couldn't reach speech coach", {
        description: "Check your internet connection and try again.",
      });
      onEnd();
    }
  }, 15_000);
  return () => clearTimeout(timeout);
}, [fetchError, onEnd]);
```

### 2e — Update the `return` JSX

Keep the visual UI outside `<LiveKitRoom>` to avoid JSX duplication. `<LiveKitRoom>` renders no DOM element by default — it's an invisible context provider. `<RoomAudioRenderer />` must be inside it.

```tsx
return (
  <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
    {/* LiveKit room — invisible in DOM, provides audio context */}
    {token && serverUrl && (
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={false}
        onConnected={() => {
          wasConnected.current = true;
          setIsConnected(true);
          onConversationStarted(runtimeSession.roomName);
        }}
        onDisconnected={() => {
          if (wasConnected.current) onEnd();
        }}
      >
        <RoomAudioRenderer />
      </LiveKitRoom>
    )}

    {/* Animated listening indicator */}
    <div className="relative flex items-center justify-center">
      <div
        className={cn(
          "h-32 w-32 rounded-full transition-all duration-300",
          isConnected
            ? "scale-110 bg-primary/20 shadow-lg shadow-primary/10"
            : "scale-100 bg-muted/50"
        )}
      />
      <div
        className={cn(
          "absolute h-20 w-20 rounded-full transition-all duration-300",
          isConnected ? "scale-110 bg-primary/40" : "scale-95 bg-muted"
        )}
      />
      <span className="absolute text-4xl" aria-hidden="true">👂</span>
    </div>

    <p className="text-center text-lg text-muted-foreground">
      {isConnected ? "Listening..." : "Connecting..."}
    </p>

    <Button onClick={handleStop} variant="outline" size="lg" className="mt-8">
      Stop Session
    </Button>
  </div>
);
```

Replace all `wasConnected.current` in JSX with `isConnected` state. Keep `wasConnected.current` only in the timeout guard and `onDisconnected`.

---

## Critical Files

| File | Change |
|------|--------|
| `CLAUDE.md` | Add LiveKit vars to Convex Dashboard section |
| `src/features/speech-coach/components/active-session.tsx` | Wire real LiveKit room join |
| `src/features/sessions/components/call-room.tsx` | Reference only (no changes) |
| `src/app/api/speech-coach/livekit-token/route.ts` | No changes needed |

---

## Verification

### Automated
```bash
npm test -- src/features/speech-coach/components/__tests__/
npm test -- src/app/api/speech-coach/livekit-token/__tests__/route.test.ts
npm test  # full suite — confirm 0 regressions
```

### Manual (requires running app + Convex `LIVEKIT_URL` set)
1. Start a speech coach session.
2. DevTools → Network: confirm `POST /api/speech-coach/livekit-token` fires with `{ roomName, participantName: "participant" }`.
3. DevTools → Network → WS: confirm WebSocket connection to `wss://speechai-lyl0ssvk.livekit.cloud`.
4. UI transitions from "Connecting…" → "Listening…" when room connects.
5. Click "Stop Session" — WebSocket closes cleanly.
6. DevTools → Network → Offline, then start session — confirm toast error fires within 15s and UI exits.
