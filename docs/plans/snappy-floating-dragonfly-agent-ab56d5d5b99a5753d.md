# Convex Authorization Hardening — Research & Patterns

## Current State Assessment

### What exists today (`convex/lib/auth.ts`)
- `getAuthUserId(ctx)` — returns `identity.subject` or null
- `assertSessionOwner(ctx, sessionId, opts?)` — ownership check with soft/throw modes
- `@convex-dev/rate-limiter` configured for `generateApp` (5/min fixed window)
- Manual inline auth checks scattered across `sessions.ts`, `apps.ts`, `publish.ts`

### Critical Gap: `identity.subject` vs `identity.tokenIdentifier`
Per the Convex guidelines (`convex/_generated/ai/guidelines.md:157`):
> In Convex `UserIdentity`, `tokenIdentifier` is guaranteed and is the canonical stable identifier. For any auth-linked database lookup or ownership check, prefer `identity.tokenIdentifier` over `identity.subject`.

**Your `getAuthUserId` returns `identity.subject` but the canonical field is `identity.tokenIdentifier`.** This is the single most important fix — `subject` can vary by provider while `tokenIdentifier` is globally stable.

---

## 1. Properly Checking User Identity in Mutations/Queries

### Pattern A: Direct `ctx.auth.getUserIdentity()` (what you do now)

```typescript
// convex/sessions.ts:13 — current pattern
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

This works but is repetitive. Every mutation/query that needs auth repeats this boilerplate.

### Pattern B: Reusable auth helper (what you have, but needs fixing)

**Fix `getAuthUserId` to use `tokenIdentifier`:**

```typescript
// convex/lib/auth.ts — FIXED
import type { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";

/** Returns tokenIdentifier or null. */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.tokenIdentifier ?? null;
}

/** Throws if not authenticated. Returns tokenIdentifier. */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}
```

**Note:** This also means `session.userId` and `app.userId` fields in the schema should store `tokenIdentifier`, not `subject`. This is a data migration concern — see section on migration below.

### Pattern C: `customQuery` / `customMutation` from `convex-helpers` (recommended upgrade)

This eliminates all inline auth boilerplate. You already have `convex-helpers@^0.1.114` installed.

```typescript
// convex/lib/functions.ts — NEW FILE
import {
  customQuery,
  customMutation,
  customAction,
  customCtx,
} from "convex-helpers/server/customFunctions";
import { query, mutation, action } from "../_generated/server";

// ── Authenticated query: ctx.userId is always a string ──
export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return { userId: identity.tokenIdentifier };
  }),
);

// ── Authenticated mutation: ctx.userId is always a string ──
export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return { userId: identity.tokenIdentifier };
  }),
);

// ── Authenticated action: ctx.userId is always a string ──
export const authedAction = customAction(
  action,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return { userId: identity.tokenIdentifier };
  }),
);

// ── Optional auth query: ctx.userId is string | null ──
export const optionalAuthQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return { userId: identity?.tokenIdentifier ?? null };
  }),
);
```

**Usage — before and after:**

```typescript
// BEFORE (sessions.ts:list)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(50);
  },
});

// AFTER
export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
      .order("desc")
      .take(50);
  },
});
```

---

## 2. Ownership Verification Patterns

### Pattern A: Generic resource ownership assertion

```typescript
// convex/lib/auth.ts — enhanced assertOwnership
export async function assertOwnership<T extends { userId?: string }>(
  ctx: QueryCtx | MutationCtx,
  resource: T | null,
  opts?: { soft?: boolean },
): Promise<T> {
  if (!resource) {
    if (opts?.soft) return null as unknown as T;
    throw new Error("Resource not found");
  }

  const userId = await requireAuth(ctx);

  // Legacy resources without userId are accessible to any authenticated user
  if (resource.userId && resource.userId !== userId) {
    if (opts?.soft) return null as unknown as T;
    throw new Error("Not authorized");
  }

  return resource;
}
```

**Usage:**

```typescript
export const update = authedMutation({
  args: { appId: v.id("apps"), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    await assertOwnership(ctx, app);  // throws if not owner
    await ctx.db.patch(args.appId, { title: args.title, updatedAt: Date.now() });
  },
});
```

### Pattern B: Row-Level Security (RLS) via `convex-helpers`

For tables where every read/write must be scoped to the owner, RLS wraps the database itself:

```typescript
// convex/lib/rls.ts
import {
  Rules,
  RLSConfig,
  wrapDatabaseReader,
  wrapDatabaseWriter,
} from "convex-helpers/server/rowLevelSecurity";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { DataModel } from "../_generated/dataModel";
import { mutation, query, QueryCtx } from "../_generated/server";

async function rlsRules(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.tokenIdentifier;

  return {
    sessions: {
      read: async (_, session) => {
        if (!userId) return false;
        // Legacy sessions (no userId) are visible to any authed user
        if (!session.userId) return true;
        return session.userId === userId;
      },
      modify: async (_, session) => {
        if (!userId) return false;
        if (!session.userId) return true;
        return session.userId === userId;
      },
      insert: async () => true,
    },
    apps: {
      read: async (_, app) => {
        // Public apps (via shareSlug) are readable by anyone
        return true;
      },
      modify: async (_, app) => {
        if (!userId) return false;
        if (!app.userId) return true;
        return app.userId === userId;
      },
      insert: async () => !!userId,
    },
    messages: {
      read: async (_, msg) => {
        // Messages are scoped to session — session ownership is checked separately
        return true;
      },
      modify: async () => !!userId,
      insert: async () => true,
    },
  } satisfies Partial<Rules<QueryCtx, DataModel>>;
}

const config: RLSConfig = { defaultPolicy: "allow" };

export const queryWithRLS = customQuery(
  query,
  customCtx(async (ctx) => ({
    db: wrapDatabaseReader(ctx, ctx.db, await rlsRules(ctx), config),
  })),
);

export const mutationWithRLS = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    db: wrapDatabaseWriter(ctx, ctx.db, await rlsRules(ctx), config),
  })),
);
```

**When to use RLS vs explicit checks:**
- **RLS** — best for tables where every query must be ownership-scoped (sessions, apps, flashcard_decks)
- **Explicit assertOwnership** — best for one-off mutations where the logic is unique

---

## 3. Rate Limiting Patterns

### Current state
You already use `@convex-dev/rate-limiter` for `generateApp`. The `convex-helpers` package also provides a built-in rate limiter.

### Pattern: `convex-helpers` rate limiting (lighter weight, no component needed)

```typescript
// convex/lib/rateLimits.ts
import { defineRateLimits } from "convex-helpers/server/rateLimit";

export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  // AI generation: 5 per minute per user
  generateApp: {
    kind: "token bucket",
    rate: 5,
    period: 60_000,    // refill 5 tokens per minute
    capacity: 5,       // max burst
  },
  // Publishing: 3 per hour per user
  publishApp: {
    kind: "fixed window",
    rate: 3,
    period: 3_600_000,
  },
  // Message sending: 30 per minute per session
  sendMessage: {
    kind: "token bucket",
    rate: 30,
    period: 60_000,
    capacity: 10,
  },
  // TTS generation: 20 per minute per user
  generateTTS: {
    kind: "token bucket",
    rate: 20,
    period: 60_000,
    capacity: 5,
  },
  // Image generation: 10 per minute per user
  generateImage: {
    kind: "token bucket",
    rate: 10,
    period: 60_000,
    capacity: 3,
  },
});
```

**IMPORTANT:** `convex-helpers` rate limiting requires a `rateLimits` table in the schema:

```typescript
// Add to convex/schema.ts
import { rateLimitTables } from "convex-helpers/server/rateLimit";

export default defineSchema({
  ...rateLimitTables,
  // ... existing tables
});
```

**Usage in a mutation:**

```typescript
export const sendMessage = authedMutation({
  args: { sessionId: v.id("sessions"), content: v.string() },
  handler: async (ctx, args) => {
    // Rate limit by session (prevents spam in a single session)
    await rateLimit(ctx, {
      name: "sendMessage",
      key: args.sessionId,
      throws: true,
    });
    // ... create message
  },
});
```

**Note on dual rate limiting:** You currently use `@convex-dev/rate-limiter` (a Convex component) while `convex-helpers` has its own built-in rate limiter. Pick one. The `convex-helpers` version is simpler (no component wiring) but the component version is more battle-tested. Either works.

---

## 4. State Machine Validation in Mutations

### Problem
`sessions.ts` mutations like `startGeneration`, `setLive`, `setFailed` don't validate transitions. Any caller can set any state regardless of current state.

### Pattern: Transition map + validation helper

```typescript
// convex/lib/session_states.ts — ENHANCED
export const SESSION_STATES = {
  IDLE: "idle",
  GENERATING: "generating",
  LIVE: "live",
  FAILED: "failed",
} as const;

export type SessionState = (typeof SESSION_STATES)[keyof typeof SESSION_STATES];

/** Valid state transitions: from -> [allowed targets] */
const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  idle: ["generating"],
  generating: ["live", "failed"],
  live: ["generating", "idle"],   // allow re-generation
  failed: ["generating", "idle"], // allow retry
};

export function assertValidTransition(
  current: string,
  next: SessionState,
): void {
  const allowed = VALID_TRANSITIONS[current as SessionState];
  if (!allowed) {
    // Legacy states (blueprinting, planning, etc.) — allow any transition
    return;
  }
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid state transition: "${current}" -> "${next}". Allowed: [${allowed.join(", ")}]`,
    );
  }
}
```

**Usage:**

```typescript
export const startGeneration = authedMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    assertValidTransition(session.state, SESSION_STATES.GENERATING);
    await assertOwnership(ctx, session);
    await ctx.db.patch(args.sessionId, {
      state: SESSION_STATES.GENERATING,
      stateMessage: "Generating your app...",
    });
  },
});
```

---

## 5. Cascade Delete Patterns

### Current state
`sessions.ts:remove` already does cascade deletes with a `while(true)` loop pattern for messages and files. This is correct but has two issues:
1. **No auth check on cascaded children** — the session check is sufficient, but cascade should also delete flashcard decks/cards tied to the session.
2. **Mutation size limits** — for very large sessions, a single mutation may exceed Convex limits.

### Pattern A: In-mutation cascade (what you have, enhanced)

```typescript
export const remove = authedMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    await assertOwnership(ctx, session);

    // Cascade: messages
    await cascadeDelete(ctx, "messages", "by_session", args.sessionId);

    // Cascade: files
    await cascadeDelete(ctx, "files", "by_session", args.sessionId);

    // Cascade: flashcard decks -> flashcards
    const decks = await ctx.db
      .query("flashcardDecks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const deck of decks) {
      await cascadeDelete(ctx, "flashcards", "by_deck", deck._id);
      await ctx.db.delete(deck._id);
    }

    // Cascade: apps
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const app of apps) {
      await ctx.db.delete(app._id);
    }

    await ctx.db.delete(args.sessionId);
  },
});

// Reusable cascade helper
async function cascadeDelete(
  ctx: MutationCtx,
  table: string,
  index: string,
  key: any,
) {
  while (true) {
    const batch = await (ctx.db.query(table) as any)
      .withIndex(index, (q: any) => q.eq(index.replace("by_", ""), key))
      .take(500);
    if (batch.length === 0) break;
    for (const doc of batch) {
      await ctx.db.delete(doc._id);
    }
  }
}
```

### Pattern B: Async cascade via scheduled deletion (for large datasets)

Per Convex docs, when cascade deletes are too large for a single mutation, schedule them:

```typescript
export const remove = authedMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    await assertOwnership(ctx, session);

    // Mark as deleted (soft delete) so UI hides it immediately
    await ctx.db.patch(args.sessionId, { state: "deleting" });

    // Schedule async cleanup
    await ctx.scheduler.runAfter(
      0,
      internal.sessions.cascadeDeleteSession,
      { sessionId: args.sessionId },
    );
  },
});

// Internal — not callable from client
export const cascadeDeleteSession = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    // Delete children in batches, reschedule if hitting limits
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(500);

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    if (messages.length === 500) {
      // More to delete — reschedule
      await ctx.scheduler.runAfter(0, internal.sessions.cascadeDeleteSession, {
        sessionId: args.sessionId,
      });
      return;
    }

    // All children deleted — delete session
    await ctx.db.delete(args.sessionId);
  },
});
```

### Pattern C: Triggers (from convex-helpers)

```typescript
import { Triggers } from "convex-helpers/server/triggers";

const triggers = new Triggers<DataModel>();

triggers.register("sessions", async (ctx, change) => {
  if (change.operation === "delete") {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", change.id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  }
});
```

**Recommendation for Bridges:** Pattern A (in-mutation) is fine for now. Sessions rarely have more than ~100 messages + ~20 files. Move to Pattern B only if you see mutation timeouts.

---

## 6. Content Security Policy for User-Generated Iframes

### Current state
- `preview-panel.tsx:69` uses `sandbox="allow-scripts allow-same-origin"`
- `shared-tool-page.tsx:79` uses `sandbox="allow-scripts"`
- Bundle HTML includes a CSP meta tag (route.ts:313)

### Problem
`allow-same-origin` combined with `allow-scripts` effectively negates the sandbox — the iframe can access the parent's cookies, storage, and same-origin APIs.

### Recommended CSP for user-generated content iframes

**Option A: Blob URL with strict sandbox (recommended for Bridges)**

Since you serve bundles via blob URLs, the origin is already `null`. The iframe cannot access parent cookies. But `allow-same-origin` is still dangerous because it lets the blob script use `parent.postMessage` impersonation.

```tsx
// preview-panel.tsx — FIXED
<iframe
  src={blobUrl}
  sandbox="allow-scripts"
  // Do NOT add allow-same-origin — blob URLs don't need it
  // allow-scripts is needed for React to run
/>
```

If TTS/STT postMessage bridge requires `allow-same-origin`, refactor to use `MessageChannel` instead:

```typescript
// Parent creates a MessageChannel and sends one port to the iframe
const channel = new MessageChannel();
iframeRef.current.contentWindow.postMessage(
  { type: "init-channel" },
  "*",
  [channel.port2]
);
// Listen on port1 — this is origin-safe
channel.port1.onmessage = (e) => { /* handle TTS/STT */ };
```

**Option B: CSP meta tag in generated HTML (defense in depth)**

Your current CSP meta tag is:
```
default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.tailwindcss.com;
```

This is too permissive. Tighten it:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline' 'unsafe-eval' blob:;
  style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com;
  font-src https://fonts.gstatic.com;
  img-src data: blob: https:;
  media-src data: blob: https:;
  connect-src 'none';
" />
```

Key changes:
- `default-src 'none'` — deny everything by default
- `connect-src 'none'` — prevents fetch/XHR from inside the iframe (no data exfiltration)
- Removed `'self'` — blob URLs don't have a meaningful self origin

**Option C: For published apps (Vercel-hosted)**

Published apps on their own Vercel subdomain need a server-side CSP header. Add to the generated `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.elevenlabs.io;"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

---

## 7. Specific Authorization Gaps Found in Codebase

| File | Function | Gap | Fix |
|------|----------|-----|-----|
| `sessions.ts:7` | `create` | No rate limiting on session creation | Add `rateLimit(ctx, { name: "createSession", key: userId })` |
| `sessions.ts:23` | `get` | **No auth check — anyone can read any session by ID** | Add ownership check or use `authedQuery` |
| `sessions.ts:43` | `startGeneration` | **No auth check — anyone can trigger generation** | Add `assertOwnership(ctx, session)` |
| `sessions.ts:55` | `setLive` | **No auth check — anyone can set session live** | Add auth + make internal-only |
| `sessions.ts:69` | `setFailed` | **No auth check — anyone can mark sessions failed** | Add auth + make internal-only |
| `sessions.ts:145` | `updateTitle` | **No auth check — anyone can rename any session** | Add `assertOwnership(ctx, session)` |
| `sessions.ts:172` | `setBlueprint` | **No auth check — anyone can overwrite blueprints** | Add `assertOwnership(ctx, session)` |
| `messages.ts:5` | `create` | **No auth check — anyone can insert messages into any session** | Validate session ownership |
| `messages.ts:36` | `addUserMessage` | **No auth check — same as above** | Validate session ownership |
| `messages.ts:25` | `list` | **No auth check — anyone can read any session's messages** | Validate session ownership |
| `generated_files.ts:6` | `upsert` | **No auth check — anyone can write files to any session** | Validate session ownership |
| `generated_files.ts:42` | `upsertAutoVersion` | **No auth check — same** | Validate session ownership |
| `generated_files.ts:72` | `list` | **No auth check — anyone can read any session's files** | Validate session ownership |
| `generated_files.ts:82` | `getByPath` | **No auth check — same** | Validate session ownership |
| `apps.ts:80` | `list` | Uses `.filter()` instead of index | Add `by_user` index to apps table |
| `publish.ts:10` | `publishApp` | Auth checked, but no session ownership verification | Add session ownership check |
| `rate_limit_check.ts` | `checkGenerateLimit` | **Key is a client arg — client can bypass by changing key** | Key should be derived from `ctx.auth` server-side |

### Functions that should be `internalMutation` (not public)

These are called by the SSE streaming endpoint, not the client:
- `sessions.startGeneration` — called by `/api/generate`
- `sessions.setLive` — called by `/api/generate`
- `sessions.setFailed` — called by `/api/generate`
- `generated_files.upsert` — called by `/api/generate`
- `generated_files.upsertAutoVersion` — called by `/api/generate`
- `messages.create` — called by `/api/generate`

Making these internal prevents any client from calling them directly.

---

## 8. Migration Plan: `subject` to `tokenIdentifier`

Since existing data uses `identity.subject` for `userId` fields, you need a migration:

```typescript
// convex/migrations/migrateUserIds.ts
import { internalMutation } from "../_generated/server";

export const migrateSessionUserIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    // For Clerk, tokenIdentifier = `https://<clerk-domain>|<subject>`
    // You'll need to construct this mapping
    const sessions = await ctx.db.query("sessions").take(500);
    for (const session of sessions) {
      if (session.userId && !session.userId.includes("|")) {
        // This is a bare subject — prefix with Clerk issuer
        const tokenId = `https://${process.env.CLERK_JWT_ISSUER_DOMAIN}|${session.userId}`;
        await ctx.db.patch(session._id, { userId: tokenId });
      }
    }
  },
});
```

**Alternatively**, keep using `subject` but be consistent. The Convex guidelines recommend `tokenIdentifier`, but if you only ever use Clerk and never change providers, `subject` is stable enough. The key is **consistency** — pick one and use it everywhere.

---

## Summary of Recommended Changes

### Priority 1 — Security (do first)
1. Make `startGeneration`, `setLive`, `setFailed`, `generated_files.upsert`, `generated_files.upsertAutoVersion`, `messages.create` into `internalMutation`
2. Add auth + ownership checks to `sessions.get`, `sessions.updateTitle`, `sessions.setBlueprint`
3. Add session ownership checks to `messages.list`, `messages.addUserMessage`
4. Fix rate limit key derivation to use server-side auth identity

### Priority 2 — Architecture (reduces boilerplate)
5. Create `convex/lib/functions.ts` with `authedQuery`, `authedMutation`, `authedAction`, `optionalAuthQuery` using `convex-helpers/server/customFunctions`
6. Migrate all functions to use the custom function builders
7. Add state machine validation to session transitions

### Priority 3 — Defense in depth
8. Tighten CSP: remove `allow-same-origin` from preview iframe sandbox, restrict CSP meta tag
9. Add `by_user` index to `apps` table (replace in-memory `.filter()`)
10. Expand rate limiting to cover `publishApp`, `sendMessage`, `generateImage`, `generateTTS`

### Priority 4 — Data integrity
11. Add cascade delete for flashcard decks/cards in session removal
12. Decide on `subject` vs `tokenIdentifier` and migrate if needed
