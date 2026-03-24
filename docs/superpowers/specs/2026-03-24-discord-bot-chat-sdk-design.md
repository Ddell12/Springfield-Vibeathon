# Discord Bot via Vercel Chat SDK — Design Spec

**Date:** 2026-03-24
**Status:** Draft
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

### New Mention Handler (first message)

```typescript
bot.onNewMention(async (thread, message) => {
  // Channel restriction
  const channelId = extractChannelId(thread.id);
  if (channelId !== BUILD_CHANNEL_ID) return;

  await thread.subscribe();

  // Rate limit check
  const count = await convexClient.query(api.projects.countByDiscordUser, {
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
    // Stream generation
    const result = await generateFragment({
      userMessage: message.text,
      existingCode: null,
    });
    await thread.post(result.fullStream);

    // Create sandbox + screenshot
    const fragment = await result.object;
    const sandbox = await createSandbox(fragment);
    const screenshot = await takeSandboxScreenshot(sandbox.url);

    // Save to Convex
    const project = await convexClient.mutation(api.projects.create, {
      title: fragment.title,
      description: fragment.description,
      fragment,
      sandboxId: sandbox.id,
      discordUserId: message.author.id,
      discordThreadId: thread.id,
    });

    // Post final embed
    await thread.post(
      <Card title={fragment.title} subtitle={fragment.description}>
        <Image url={screenshot} alt="Tool preview" />
        <Actions>
          <LinkButton url={sandbox.url}>View Live</LinkButton>
          <LinkButton url={`https://bridges.app/builder?project=${project._id}`}>
            Open in Builder
          </LinkButton>
        </Actions>
      </Card>
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

  // Look up existing project
  const project = await convexClient.query(api.projects.getByDiscordThread, {
    discordThreadId: thread.id,
  });
  if (!project) return;

  await redis.set(`bridges:generating:${thread.id}`, "true", { ex: 120 });

  try {
    // Re-generate with current code as context
    const result = await generateFragment({
      userMessage: message.text,
      existingCode: project.fragment.code,
    });
    await thread.post(result.fullStream);

    // Update sandbox + project
    const fragment = await result.object;
    await updateSandbox(project.sandboxId, fragment);
    const screenshot = await takeSandboxScreenshot(sandbox.url);

    await convexClient.mutation(api.projects.update, {
      id: project._id,
      fragment,
    });

    // Post updated embed
    await thread.post(
      <Card title={fragment.title}>
        <Image url={screenshot} alt="Updated preview" />
        <Actions>
          <LinkButton url={sandbox.url}>View Live</LinkButton>
        </Actions>
      </Card>
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
export async function generateFragment({
  userMessage,
  existingCode,
  templateContext,
}: GenerateInput) {
  const result = await streamObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: FragmentSchema,
    system: getSystemPrompt(),
    prompt: buildUserPrompt({ userMessage, existingCode, templateContext }),
  });
  return result;
}
```

The web route (`/api/chat/generate/route.ts`) becomes a thin wrapper that calls `generateFragment()` and returns the stream as a Response.

### Streaming to Discord

- `thread.post(result.fullStream)` — SDK handles Post+Edit pattern automatically
- Default `streamingUpdateIntervalMs`: 500ms (tuned for Discord rate limits)
- Built-in markdown healing for incomplete markdown during streaming
- GFM tables buffered until complete structure arrives
- `fullStream` preserves step boundaries with automatic paragraph breaks

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
  lib/
    bot.tsx                         # NEW — bot definition + event handlers
    persistent-listener.ts          # NEW — cross-instance Gateway coordination
vercel.json                         # Add cron: */9 * * * *
next.config.ts                      # Add serverExternalPackages: ["discord.js"]
```

## Schema Changes

### Convex `projects` table additions

```typescript
// convex/schema.ts — extend projects table
projects: defineTable({
  // ...existing fields...
  discordUserId: v.optional(v.string()),
  discordThreadId: v.optional(v.string()),
}).index("by_discord_user", ["discordUserId", "createdAt"])
  .index("by_discord_thread", ["discordThreadId"])
```

### New Convex Queries

```typescript
// convex/projects.ts — new queries
export const countByDiscordUser = query({
  args: { discordUserId: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_discord_user", (q) =>
        q.eq("discordUserId", args.discordUserId)
      )
      .collect();
    return projects.filter((p) => p.createdAt >= args.since).length;
  },
});

export const getByDiscordThread = query({
  args: { discordThreadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_discord_thread", (q) =>
        q.eq("discordThreadId", args.discordThreadId)
      )
      .first();
  },
});
```

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
// next.config.ts
const nextConfig = {
  serverExternalPackages: ["discord.js"],
};
```

### Gateway Route

```typescript
// src/app/api/discord/gateway/route.ts
import { after } from "next/server";
import { bot } from "@/lib/bot";

export const maxDuration = 800;

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return new Response("CRON_SECRET not configured", { status: 500 });

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) return new Response("Unauthorized", { status: 401 });

  const durationMs = 600_000;
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

### Webhook Route

```typescript
// src/app/api/webhooks/[platform]/route.ts
import { after } from "next/server";
import { bot } from "@/lib/bot";

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

Note: `ai` and `@ai-sdk/anthropic` are already installed.

### Cost

| Service | Cost | Notes |
|---------|------|-------|
| Discord Bot | Free | No cost for bot applications |
| Upstash Redis | Free | Free tier: 10K commands/day |
| Vercel Pro | $20/mo | Required for maxDuration 800 + cron frequency |
| Claude API | ~$0.01-0.05/gen | Same as web builder |
| E2B Sandbox | ~$0.005/min | Same as web builder |

## Rate Limiting

- **5 builds per day per Discord user** — tracked via `countByDiscordUser` query
- Only initial builds count; iterative edits in the same thread are free
- Rate limit check happens before generation starts
- If exceeded: friendly message suggesting they iterate on existing tools

## Error Handling

| Scenario | Bot Behavior |
|----------|-------------|
| Claude API fails | "Something went wrong generating your tool. Try again?" |
| E2B sandbox fails | Post code as markdown fallback, no preview image |
| Rate limit hit | "You've built 5 tools today — try again tomorrow!" |
| Empty/unclear message | "Could you describe what kind of tool you'd like? For example: 'A token board with 5 stars for rewarding good behavior'" |
| Mentioned outside #build-tools | Ignore silently |
| Discord API rate limit (429) | Chat SDK handles retry/backoff automatically |
| Gateway disconnects | Cron restarts within 9 minutes |
| StreamObject invalid schema | "I had trouble creating that tool. Could you try describing it differently?" |
| Screenshot fails | Post embed without image, still include live URL |
| Message during active generation | "Still working on your last request — hold tight!" |

## Edge Cases

### Concurrent Messages
Redis-based generation lock per thread (`bridges:generating:{threadId}`) with 2-minute TTL. Messages arriving during generation get a "still working" response.

### Stale Threads
Threads auto-archive after 24 hours. If user unarchives and sends a new message, `onSubscribedMessage` fires. Check if E2B sandbox is still alive — if expired, create new sandbox from saved fragment in Convex.

### Collaborative Building
Multiple users can contribute in the same thread. Project stays linked to original creator via `discordUserId`. All users can suggest edits — this is a feature, not a bug (matches how therapy teams collaborate).

### Bot Mentioned in Foreign Thread
Check parent channel ID in `onNewMention`. If not `#build-tools`, ignore.

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

- **Message Content Intent:** Enabled (required)
- **Server Members Intent:** Enabled
- **Interactions Endpoint URL:** `https://{domain}/api/webhooks/discord`
- **OAuth2 Scopes:** `bot`, `applications.commands`
