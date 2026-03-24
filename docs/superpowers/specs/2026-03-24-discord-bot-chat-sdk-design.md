# Discord Bot via Vercel Chat SDK — Design Spec

**Date:** 2026-03-24
**Status:** Draft (reviewed, issues fixed)
**Author:** Claude + Desha

## Objective

Expose the Bridges AI coding agent on Discord so users in the Bridges community server can describe therapy tools in natural language and get working, interactive web apps built — the same experience as the web builder at `/builder`, delivered through Discord chat.

## Approach

Use Vercel's Chat SDK (`npm install chat`) with the Discord adapter (`@chat-adapter/discord`). The bot is a thin adapter layer that pipes Discord messages into the existing Fragment generation pipeline and posts results back as Discord embeds with preview images and live URLs.

### Why Chat SDK over alternatives

| Alternative | Why not |
|-------------|---------|
| discord.js (direct) | Discord-only, requires persistent process, manual streaming, no multi-platform |
| Discord Activities SDK | Not a chat bot — requires explicit Activity launch, overkill for MVP |
| Pylon | Locked to proprietary runtime, can't colocate with Next.js + Convex |
| Cloudflare Agents | Duplicates Convex backend, no Discord adapter |

Chat SDK wins because it lives inside the existing Next.js app as API routes, has native AI SDK streaming support via `thread.post(fullStream)`, and provides multi-platform optionality (Slack, Telegram, WhatsApp) from the same codebase.

## Architecture

### Event Flow

```
User @mentions bot in #build-tools
        |
Discord Gateway WebSocket -> forwards to /api/webhooks/discord
        |
bot.onNewMention() fires
  -> thread.subscribe() (track for future messages)
  -> Rate limit check: query Convex projects by discordUserId + createdAt
        |
Call streamObject() with Claude + FragmentSchema
  (reuses prompt.ts + schema.ts from builder-v2/lib/)
        |
thread.post(result.fullStream)
  -> SDK handles Post+Edit streaming (~500ms intervals, auto-throttled)
  -> Markdown healing + GFM table buffering built-in
        |
On completion: call /api/sandbox to create E2B sandbox
        |
Screenshot the rendered tool -> upload as image
        |
Save project to Convex projects table
  (with discordUserId + discordThreadId metadata)
        |
Post final Card JSX -> renders as Discord Embed
  (title, description, preview image, "View Live" link button)
        |
bot.onSubscribedMessage() handles follow-ups in same thread
  -> Injects current code as context (same iterative pattern as web builder)
  -> Streams updated result -> updates project in Convex
```

### Key Architectural Decisions

1. **Fragment path only** — bot uses the code generation pipeline (`streamObject` + `FragmentSchema` + E2B), not the config-based Agent path. Single pipeline, no routing complexity.
2. **No new AI pipeline** — reuses existing `streamObject` + `FragmentSchema` + prompt logic from `src/features/builder-v2/lib/`.
3. **No new database tables** — extends the existing `projects` table with optional `discordUserId` and `discordThreadId` fields.
4. **Auto-threaded conversations** — Discord adapter auto-creates a thread when a user @mentions the bot. All back-and-forth happens in that thread.
5. **Channel-restricted** — bot only responds in `#build-tools` channel.
6. **Iterative editing supported** — follow-up messages in a thread inject current code as context, same as the web builder.

## Core Event Handlers

### Bot Definition

```typescript
/** @jsxImportSource chat */
import { Chat } from "chat";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createRedisState } from "@chat-adapter/state-redis";

const bot = new Chat({
  userName: "bridges",
  adapters: { discord: createDiscordAdapter() },
  state: createRedisState(), // auto-detects REDIS_URL
});

export { bot };
```

### Convex Client Initialization

The bot handlers run server-side in Next.js API routes, so they need `ConvexHttpClient` (not the React client):

```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
```

### New Mention Handler (first message)

```typescript
bot.onNewMention(async (thread, message) => {
  // Channel restriction
  const channelId = extractChannelId(thread.id);
  if (channelId !== BUILD_CHANNEL_ID) return;

  await thread.subscribe();

  // Rate limit check
  const count = await convex.query(api.projects.countByDiscordUser, {
    discordUserId: message.author.id,
    since: Date.now() - 86400000,
  });
  if (count >= 5) {
    await thread.post("You've hit the daily limit (5 tools). Try again tomorrow!");
    return;
  }

  // Lock thread to prevent concurrent generations
  await redis.set(`bridges:generating:${thread.id}`, "true", { ex: 120 });

  try {
    // Stream generation (reuses builder-v2 pipeline)
    const result = await generateFragment({
      userMessage: message.text,
      existingCode: null,
    });
    await thread.post(result.fullStream);

    // Create sandbox + screenshot
    const fragment = await result.object;
    const sandbox = await createSandbox(fragment);
    const screenshotUrl = await takeSandboxScreenshot(sandbox.url);

    // Save to Convex — create project then patch with fragment data
    const projectId = await convex.mutation(api.projects.create, {
      title: fragment.title,
      description: fragment.description,
    });
    await convex.mutation(api.projects.update, {
      projectId,
      fragment,
      sandboxId: sandbox.id,
    });
    // Save Discord metadata
    await convex.mutation(api.projects.setDiscordMetadata, {
      projectId,
      discordUserId: message.author.id,
      discordThreadId: thread.id,
    });

    // Post final embed
    await thread.post(
      <Card title={fragment.title} subtitle={fragment.description}>
        <Image url={screenshotUrl} alt="Tool preview" />
        <Actions>
          <LinkButton url={sandbox.url}>View Live</LinkButton>
          <LinkButton url={`${process.env.NEXT_PUBLIC_APP_URL}/builder?project=${projectId}`}>
            Open in Builder
          </LinkButton>
        </Actions>
      </Card>
    );
  } catch (error) {
    console.error("Discord bot generation error:", error);
    await thread.post(
      "Something went wrong building your tool. Could you try again or rephrase your request?"
    );
  } finally {
    await redis.del(`bridges:generating:${thread.id}`);
  }
});
```

### Subscribed Message Handler (iterative edits)

```typescript
bot.onSubscribedMessage(async (thread, message) => {
  // Check generation lock
  const isGenerating = await redis.get(`bridges:generating:${thread.id}`);
  if (isGenerating) {
    await thread.post("Still working on your last request — hold tight!");
    return;
  }

  // Look up existing project for this thread
  const project = await convex.query(api.projects.getByDiscordThread, {
    discordThreadId: thread.id,
  });
  if (!project) return;

  await redis.set(`bridges:generating:${thread.id}`, "true", { ex: 120 });

  try {
    // Re-generate with current code as context
    const result = await generateFragment({
      userMessage: message.text,
      existingCode: project.fragment?.code ?? null,
    });
    await thread.post(result.fullStream);

    // Update sandbox + project
    const fragment = await result.object;
    const sandboxUrl = await reconstructSandboxUrl(project.sandboxId, fragment);
    const screenshotUrl = await takeSandboxScreenshot(sandboxUrl);

    await convex.mutation(api.projects.update, {
      projectId: project._id,
      fragment,
    });

    // Post updated embed
    await thread.post(
      <Card title={fragment.title}>
        <Image url={screenshotUrl} alt="Updated preview" />
        <Actions>
          <LinkButton url={sandboxUrl}>View Live</LinkButton>
        </Actions>
      </Card>
    );
  } catch (error) {
    console.error("Discord bot iteration error:", error);
    await thread.post(
      "Something went wrong updating your tool. Could you try again?"
    );
  } finally {
    await redis.del(`bridges:generating:${thread.id}`);
  }
});
```

## Streaming Pipeline

### Shared Generation Function

Extract from `/api/chat/generate/route.ts` into a shared function both the web route and Discord bot call:

```typescript
// src/features/builder-v2/lib/generate.ts (NEW)
import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { getCodeGenSystemPrompt } from "./prompt";
import { FragmentSchema } from "./schema";

interface GenerateInput {
  userMessage: string;
  existingCode: string | null;
  context?: string;
}

export function generateFragment({ userMessage, existingCode, context }: GenerateInput) {
  // Build messages array to match existing route.ts pattern
  const messages: Array<{ role: "user"; content: string }> = [];

  if (existingCode) {
    messages.push({
      role: "user",
      content: `The user already has a working tool. Here is the current code:\n\n${existingCode}\n\nModify it based on this request: ${userMessage}`,
    });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  return streamObject({
    model: anthropic("claude-sonnet-4-20250514"),
    system: getCodeGenSystemPrompt(context),
    schema: FragmentSchema,
    messages,
  });
}
```

The web route (`/api/chat/generate/route.ts`) becomes a thin wrapper:

```typescript
// src/app/api/chat/generate/route.ts (SIMPLIFIED)
import { generateFragment } from "@/features/builder-v2/lib/generate";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const messages = body?.messages;
  const context = body?.context;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  // For web: pass last user message to shared function
  const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
  const result = generateFragment({
    userMessage: lastUserMsg?.content ?? "",
    existingCode: context ?? null,
  });

  return result.toTextStreamResponse();
}
```

### Streaming to Discord

- `thread.post(result.fullStream)` — SDK handles Post+Edit pattern automatically
- Default `streamingUpdateIntervalMs`: 500ms (tuned for Discord rate limits)
- Built-in markdown healing for incomplete markdown during streaming
- GFM tables buffered until complete structure arrives
- `fullStream` preserves step boundaries with automatic paragraph breaks

### Screenshot Implementation

Screenshots require a headless browser to capture the rendered E2B sandbox. Options:

1. **Browserbase** (already available as MCP) — use headless browser API to navigate to sandbox URL and screenshot
2. **Vercel OG Image** — generate a static preview card image from tool metadata (no live screenshot, but simpler)
3. **E2B screenshot API** — check if E2B provides a built-in screenshot endpoint for sandboxes

Recommendation: Start with option 2 (metadata-based preview card) for MVP, upgrade to option 1 (Browserbase live screenshot) if preview quality matters for adoption.

## File Structure

```
src/
  app/
    api/
      discord/
        gateway/
          route.ts                  # Gateway WebSocket cron endpoint
      webhooks/
        [platform]/
          route.ts                  # Dynamic webhook handler
  features/
    builder-v2/
      lib/
        generate.ts                 # NEW — extracted shared generation function
        schema.ts                   # Existing FragmentSchema
        prompt.ts                   # Existing system prompts
    discord/                        # NEW — Discord bot feature slice (VSA)
      lib/
        bot.tsx                     # Bot definition + event handlers
        persistent-listener.ts      # Cross-instance Gateway coordination
        convex-client.ts            # ConvexHttpClient initialization
vercel.json                         # Add cron: */9 * * * *
next.config.ts                      # Add serverExternalPackages: ["discord.js"]
```

Note: Bot code lives in `src/features/discord/` per VSA conventions (self-contained feature slice), not `src/lib/`.

## Schema Changes

### Convex `projects` table additions

```typescript
// convex/schema.ts — extend projects table
projects: defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  fragment: v.optional(v.any()),
  sandboxId: v.optional(v.string()),
  messages: v.optional(v.any()),
  shareSlug: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  // NEW: Discord integration fields
  discordUserId: v.optional(v.string()),
  discordThreadId: v.optional(v.string()),
})
  .index("by_shareSlug", ["shareSlug"])
  .index("by_createdAt", ["createdAt"])
  // NEW: Discord indexes
  .index("by_discordUserId", ["discordUserId", "createdAt"])
  .index("by_discordThreadId", ["discordThreadId"])
```

Index names follow existing convention: `by_shareSlug`, `by_createdAt` → `by_discordUserId`, `by_discordThreadId`.

### New Convex Functions

```typescript
// convex/projects.ts — new queries + mutation

export const countByDiscordUser = query({
  args: { discordUserId: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_discordUserId", (q) =>
        q.eq("discordUserId", args.discordUserId).gte("createdAt", args.since)
      )
      .take(6); // Short-circuit: only need to know if >= 5
    return projects.length;
  },
});

export const getByDiscordThread = query({
  args: { discordThreadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_discordThreadId", (q) =>
        q.eq("discordThreadId", args.discordThreadId)
      )
      .first();
  },
});

export const setDiscordMetadata = mutation({
  args: {
    projectId: v.id("projects"),
    discordUserId: v.string(),
    discordThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      discordUserId: args.discordUserId,
      discordThreadId: args.discordThreadId,
    });
  },
});
```

Note: `countByDiscordUser` uses the compound index `["discordUserId", "createdAt"]` with `.gte("createdAt", args.since)` to avoid loading all historical projects, and `.take(6)` to short-circuit once the rate limit is known to be exceeded.

## Infrastructure

### Environment Variables

```bash
# Discord (Chat SDK auto-detects)
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=              # 64-char hex
DISCORD_APPLICATION_ID=
DISCORD_BUILD_CHANNEL_ID=       # #build-tools channel ID

# Redis (Chat SDK auto-detects)
REDIS_URL=                       # Upstash REST URL

# Gateway cron auth
CRON_SECRET=                     # random string

# Existing (already configured)
ANTHROPIC_API_KEY=
E2B_API_KEY=
NEXT_PUBLIC_CONVEX_URL=
```

### Vercel Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/discord/gateway",
      "schedule": "*/9 * * * *"
    }
  ]
}
```

```typescript
// next.config.ts — discord.js is a transitive dependency of @chat-adapter/discord
// and must be externalized for serverless builds
const nextConfig: NextConfig = {
  serverExternalPackages: ["discord.js"],
};
```

### Gateway Route

```typescript
// src/app/api/discord/gateway/route.ts
import { after } from "next/server";
import { bot } from "@/features/discord/lib/bot";

export const maxDuration = 300; // Vercel Pro max (5 minutes)

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return new Response("CRON_SECRET not configured", { status: 500 });

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) return new Response("Unauthorized", { status: 401 });

  // Run for 4.5 minutes (leaves 30s buffer before maxDuration)
  const durationMs = 270_000;
  const webhookUrl = `https://${process.env.VERCEL_URL}/api/webhooks/discord`;

  await bot.initialize();

  return bot.adapters.discord.startGatewayListener(
    { waitUntil: (task) => after(() => task) },
    durationMs,
    undefined,
    webhookUrl
  );
}
```

**Important: Vercel Pro `maxDuration` caps at 300 seconds.** The Chat SDK docs show 800s which requires Enterprise. For Pro, we run the Gateway for 270s (4.5 min) with a 30s buffer, and the cron fires every 4 minutes (`*/4 * * * *`) to maintain overlap:

```json
// vercel.json (adjusted for Pro tier)
{
  "crons": [
    {
      "path": "/api/discord/gateway",
      "schedule": "*/4 * * * *"
    }
  ]
}
```

### Webhook Route

```typescript
// src/app/api/webhooks/[platform]/route.ts
import { after } from "next/server";
import { bot } from "@/features/discord/lib/bot";

type Platform = keyof typeof bot.webhooks;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
): Promise<Response> {
  const { platform } = await params;
  const handler = bot.webhooks[platform as Platform];
  if (!handler) return new Response(`Unknown platform: ${platform}`, { status: 404 });
  return handler(request, { waitUntil: (task) => after(() => task) });
}
```

### Dependencies

```bash
npm install chat @chat-adapter/discord @chat-adapter/state-redis redis
```

Note: `ai` (^6.0.137) and `@ai-sdk/anthropic` are already installed. `discord.js` is a transitive dependency of `@chat-adapter/discord`.

### Cost

| Service | Cost | Notes |
|---------|------|-------|
| Discord Bot | Free | No cost for bot applications |
| Upstash Redis | Free | Free tier: 10K commands/day |
| Vercel Pro | $20/mo | Required for maxDuration 300 + cron frequency |
| Claude API | ~$0.01-0.05/gen | Same as web builder |
| E2B Sandbox | ~$0.005/min | Same as web builder |

## Rate Limiting

- **5 builds per day per Discord user** — tracked via `countByDiscordUser` query using compound index
- Only initial builds count; iterative edits in the same thread are free
- Rate limit check happens before generation starts
- If exceeded: friendly message suggesting they iterate on existing tools
- Note: Discord user IDs are stable but a user could create multiple accounts to bypass. Acceptable for MVP.

## Error Handling

| Scenario | Bot Behavior |
|----------|-------------|
| Claude API fails | "Something went wrong generating your tool. Try again?" |
| E2B sandbox fails | Post code as markdown fallback, no preview image |
| Rate limit hit | "You've built 5 tools today — try again tomorrow!" |
| Empty/unclear message | "Could you describe what kind of tool you'd like? For example: 'A token board with 5 stars for rewarding good behavior'" |
| Mentioned outside #build-tools | Ignore silently |
| Discord API rate limit (429) | Chat SDK handles retry/backoff automatically |
| Gateway disconnects | Cron restarts within 4 minutes |
| StreamObject invalid schema | "I had trouble creating that tool. Could you try describing it differently?" |
| Screenshot fails | Post embed without image, still include live URL |
| Message during active generation | "Still working on your last request — hold tight!" |

## Edge Cases

### Concurrent Messages
Redis-based generation lock per thread (`bridges:generating:{threadId}`) with 2-minute TTL as safety net. Messages arriving during generation get a "still working" response. If generation crashes without cleanup, TTL auto-expires the lock.

### Stale Threads
Threads auto-archive after 24 hours. If user unarchives and sends a new message, `onSubscribedMessage` fires. Check if E2B sandbox is still alive — if expired, create new sandbox from saved fragment in Convex. The FragmentResult (code) persists; only the sandbox is ephemeral.

### Collaborative Building
Multiple users can contribute in the same thread. Project stays linked to original creator via `discordUserId`. All users can suggest edits — this is a feature, not a bug (matches how therapy teams collaborate).

### Bot Mentioned in Foreign Thread
Check parent channel ID in `onNewMention`. If not `#build-tools`, ignore.

### Gateway Graceful Shutdown
If a generation is in-flight when the Gateway function times out, the Redis lock TTL (2 min) ensures cleanup. The next cron invocation starts a fresh listener. Partial state in the Discord thread (streaming message mid-edit) is handled by the SDK's cleanup.

## Testing Strategy

### Unit Tests
- `generateFragment()` — mock `streamObject`, verify messages array construction for new vs iterative builds
- `countByDiscordUser` — test with `convex-test` mock runtime, verify index query + `.take(6)` behavior
- `getByDiscordThread` — test lookup returns correct project
- `setDiscordMetadata` — test patches correct fields

### Integration Tests
- Webhook route — mock Chat SDK's webhook handler, verify POST routing
- Gateway route — verify auth check, CRON_SECRET validation

### Manual Testing
- Create Discord test server with bot invited
- Verify: mention → thread creation → streaming → embed with link
- Verify: follow-up message in thread → iterative update
- Verify: rate limit at 5 builds
- Verify: mention outside #build-tools is ignored

## Future Enhancements (Out of Scope)

- Discord Activities SDK for embedding full Bridges UI inside Discord
- Slash commands (e.g., `/build <description>`, `/templates`)
- Multi-platform expansion (Slack, Telegram adapters)
- Link Discord identity to Bridges account when auth ships (Phase 6)
- Gallery command to browse tools built in the server

## Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `chat` | ^4.21.0 | Chat SDK core |
| `@chat-adapter/discord` | ^4.21.0 | Discord platform adapter |
| `@chat-adapter/state-redis` | ^4.21.0 | Redis state management |
| `redis` | ^5.11.0 | Redis client (peer dep) |

## Discord Bot Permissions

- Send Messages
- Create Public Threads
- Send Messages in Threads
- Embed Links
- Attach Files
- Read Message History
- Add Reactions
- Use Slash Commands

## Discord Developer Portal Settings

- **Message Content Intent:** Enabled (required — without this, bot receives empty message bodies)
- **Server Members Intent:** Enabled
- **Interactions Endpoint URL:** `https://{domain}/api/webhooks/discord`
- **OAuth2 Scopes:** `bot`, `applications.commands`
