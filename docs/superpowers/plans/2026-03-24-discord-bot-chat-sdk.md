# Discord Bot via Vercel Chat SDK — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the Bridges AI coding agent on Discord via Vercel Chat SDK so users can build therapy tools from Discord chat, with streaming, preview embeds, and iterative editing.

**Architecture:** Thin adapter layer in `src/features/discord/` that pipes Discord messages into the existing Fragment generation pipeline (`streamObject` + `FragmentSchema` + E2B sandbox`). Bot runs as Next.js API routes using Chat SDK's webhook + gateway pattern. State managed via Upstash Redis.

**Tech Stack:** `chat` + `@chat-adapter/discord` + `@chat-adapter/state-redis` + `redis`, existing `ai` v6 + `@ai-sdk/anthropic` + `@e2b/code-interpreter`

**Spec:** `docs/superpowers/specs/2026-03-24-discord-bot-chat-sdk-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `convex/schema.ts` | Modify | Add `discordUserId`, `discordThreadId` fields + indexes to `projects` table |
| `convex/projects.ts` | Modify | Add `countByDiscordUser`, `getByDiscordThread`, `setDiscordMetadata` functions |
| `convex/__tests__/projects.test.ts` | Modify | Add tests for new Discord queries + mutation |
| `src/features/builder-v2/lib/generate.ts` | Create | Extract shared `generateFragment()` from route.ts |
| `src/features/builder-v2/lib/__tests__/generate.test.ts` | Create | Test message construction for new vs iterative builds |
| `src/app/api/chat/generate/route.ts` | Modify | Simplify to use shared `generateFragment()` |
| `src/features/discord/lib/bot.tsx` | Create | Chat SDK bot definition + event handlers |
| `src/features/discord/lib/convex-client.ts` | Create | ConvexHttpClient initialization for server-side use |
| `src/app/api/webhooks/[platform]/route.ts` | Create | Dynamic platform webhook handler |
| `src/app/api/discord/gateway/route.ts` | Create | Gateway WebSocket cron endpoint |
| `next.config.ts` | Modify | Add `serverExternalPackages: ["discord.js"]` |
| `vercel.json` | Create | Cron config for gateway |
| `package.json` | Modify | Add Chat SDK dependencies |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Chat SDK packages**

```bash
npm install chat @chat-adapter/discord @chat-adapter/state-redis redis
```

- [ ] **Step 2: Verify installation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new type errors from the installed packages.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Vercel Chat SDK + Discord adapter + Redis state"
```

---

### Task 2: Extend Convex Schema with Discord Fields

**Files:**
- Modify: `convex/schema.ts:54-65`

- [ ] **Step 1: Write the failing test**

Add to `convex/__tests__/projects.test.ts`:

```typescript
test("projects.setDiscordMetadata patches discord fields", async () => {
  const t = convexTest(schema, modules);

  const projectId = await t.mutation(api.projects.create, {
    title: "Discord Tool",
  });

  await t.mutation(api.projects.setDiscordMetadata, {
    projectId,
    discordUserId: "123456789",
    discordThreadId: "discord:guild:channel:thread",
  });

  const project = await t.query(api.projects.get, { projectId });
  expect(project).not.toBeNull();
  expect(project!.discordUserId).toBe("123456789");
  expect(project!.discordThreadId).toBe("discord:guild:channel:thread");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run convex/__tests__/projects.test.ts -t "setDiscordMetadata"
```

Expected: FAIL — `api.projects.setDiscordMetadata` does not exist.

- [ ] **Step 3: Add Discord fields to schema**

In `convex/schema.ts`, update the `projects` table definition. Add the two optional fields and two new indexes:

```typescript
  projects: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    fragment: v.optional(v.any()),
    sandboxId: v.optional(v.string()),
    messages: v.optional(v.any()),
    shareSlug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    discordUserId: v.optional(v.string()),
    discordThreadId: v.optional(v.string()),
  })
    .index("by_shareSlug", ["shareSlug"])
    .index("by_createdAt", ["createdAt"])
    .index("by_discordUserId", ["discordUserId", "createdAt"])
    .index("by_discordThreadId", ["discordThreadId"]),
```

- [ ] **Step 4: Add `setDiscordMetadata` mutation to `convex/projects.ts`**

Add at the bottom of the file:

```typescript
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

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run convex/__tests__/projects.test.ts -t "setDiscordMetadata"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/projects.ts convex/__tests__/projects.test.ts
git commit -m "feat: add Discord metadata fields to projects schema"
```

---

### Task 3: Add Discord Query Functions

**Files:**
- Modify: `convex/projects.ts`
- Modify: `convex/__tests__/projects.test.ts`

- [ ] **Step 1: Write failing tests for `countByDiscordUser`**

Add to `convex/__tests__/projects.test.ts`:

```typescript
test("projects.countByDiscordUser returns count of recent projects", async () => {
  const t = convexTest(schema, modules);

  // Create 3 projects with Discord metadata
  for (let i = 0; i < 3; i++) {
    const projectId = await t.mutation(api.projects.create, {
      title: `Tool ${i}`,
    });
    await t.mutation(api.projects.setDiscordMetadata, {
      projectId,
      discordUserId: "user-abc",
      discordThreadId: `thread-${i}`,
    });
  }

  const count = await t.query(api.projects.countByDiscordUser, {
    discordUserId: "user-abc",
    since: 0, // all time
  });
  expect(count).toBe(3);
});

test("projects.countByDiscordUser returns 0 for unknown user", async () => {
  const t = convexTest(schema, modules);

  const count = await t.query(api.projects.countByDiscordUser, {
    discordUserId: "unknown-user",
    since: 0,
  });
  expect(count).toBe(0);
});

test("projects.countByDiscordUser caps at 6 results", async () => {
  const t = convexTest(schema, modules);

  // Create 8 projects
  for (let i = 0; i < 8; i++) {
    const projectId = await t.mutation(api.projects.create, {
      title: `Tool ${i}`,
    });
    await t.mutation(api.projects.setDiscordMetadata, {
      projectId,
      discordUserId: "prolific-user",
      discordThreadId: `thread-${i}`,
    });
  }

  const count = await t.query(api.projects.countByDiscordUser, {
    discordUserId: "prolific-user",
    since: 0,
  });
  // .take(6) caps at 6 even though 8 exist
  expect(count).toBe(6);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run convex/__tests__/projects.test.ts -t "countByDiscordUser"
```

Expected: FAIL — `api.projects.countByDiscordUser` does not exist.

- [ ] **Step 3: Implement `countByDiscordUser`**

Add to `convex/projects.ts`:

```typescript
export const countByDiscordUser = query({
  args: {
    discordUserId: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_discordUserId", (q) =>
        q.eq("discordUserId", args.discordUserId).gte("createdAt", args.since)
      )
      .take(6);
    return projects.length;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run convex/__tests__/projects.test.ts -t "countByDiscordUser"
```

Expected: PASS (all 3 tests)

- [ ] **Step 5: Write failing test for `getByDiscordThread`**

Add to `convex/__tests__/projects.test.ts`:

```typescript
test("projects.getByDiscordThread finds project by thread ID", async () => {
  const t = convexTest(schema, modules);

  const projectId = await t.mutation(api.projects.create, {
    title: "Thread Project",
  });
  await t.mutation(api.projects.setDiscordMetadata, {
    projectId,
    discordUserId: "user-xyz",
    discordThreadId: "discord:guild:chan:thread123",
  });

  const found = await t.query(api.projects.getByDiscordThread, {
    discordThreadId: "discord:guild:chan:thread123",
  });
  expect(found).not.toBeNull();
  expect(found!._id).toEqual(projectId);
  expect(found!.title).toBe("Thread Project");
});

test("projects.getByDiscordThread returns null for unknown thread", async () => {
  const t = convexTest(schema, modules);

  const found = await t.query(api.projects.getByDiscordThread, {
    discordThreadId: "nonexistent",
  });
  expect(found).toBeNull();
});
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
npx vitest run convex/__tests__/projects.test.ts -t "getByDiscordThread"
```

Expected: FAIL

- [ ] **Step 7: Implement `getByDiscordThread`**

Add to `convex/projects.ts`:

```typescript
export const getByDiscordThread = query({
  args: {
    discordThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_discordThreadId", (q) =>
        q.eq("discordThreadId", args.discordThreadId)
      )
      .first();
  },
});
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run convex/__tests__/projects.test.ts -t "getByDiscordThread"
```

Expected: PASS

- [ ] **Step 9: Run full projects test suite**

```bash
npx vitest run convex/__tests__/projects.test.ts
```

Expected: All tests pass (existing + new).

- [ ] **Step 10: Commit**

```bash
git add convex/projects.ts convex/__tests__/projects.test.ts
git commit -m "feat: add Discord query functions (countByDiscordUser, getByDiscordThread)"
```

---

### Task 4: Extract Shared `generateFragment()` Function

**Files:**
- Create: `src/features/builder-v2/lib/generate.ts`
- Create: `src/features/builder-v2/lib/__tests__/generate.test.ts`
- Modify: `src/app/api/chat/generate/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/builder-v2/lib/__tests__/generate.test.ts`:

```typescript
import { describe, expect, test, vi } from "vitest";

// Mock the AI SDK before importing
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mocked-model"),
}));

vi.mock("ai", () => ({
  streamObject: vi.fn(() => ({
    fullStream: "mocked-stream",
    object: Promise.resolve({
      title: "Test Tool",
      description: "A test tool",
      template: "nextjs-developer",
      code: "export default function() { return <div>Test</div> }",
      file_path: "app/page.tsx",
      has_additional_dependencies: false,
      port: 3000,
    }),
    toTextStreamResponse: vi.fn(),
  })),
}));

import { streamObject } from "ai";
import { generateFragment } from "../generate";

describe("generateFragment", () => {
  test("builds single user message for new tool", () => {
    generateFragment({
      userMessage: "Build me a token board",
      existingCode: null,
    });

    expect(streamObject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "Build me a token board" }],
      })
    );
  });

  test("injects existing code for iterative builds", () => {
    generateFragment({
      userMessage: "Make the buttons bigger",
      existingCode: 'export default function() { return <div>Old</div> }',
    });

    const call = vi.mocked(streamObject).mock.calls[
      vi.mocked(streamObject).mock.calls.length - 1
    ][0];
    const msg = (call as any).messages[0];

    expect(msg.role).toBe("user");
    expect(msg.content).toContain("current code");
    expect(msg.content).toContain("Old");
    expect(msg.content).toContain("Make the buttons bigger");
  });

  test("passes context to system prompt when provided", () => {
    generateFragment({
      userMessage: "Build a schedule",
      existingCode: null,
      context: "For a 5-year-old with autism",
    });

    const call = vi.mocked(streamObject).mock.calls[
      vi.mocked(streamObject).mock.calls.length - 1
    ][0];
    expect((call as any).system).toContain("For a 5-year-old with autism");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/builder-v2/lib/__tests__/generate.test.ts
```

Expected: FAIL — module `../generate` not found.

- [ ] **Step 3: Create `generate.ts`**

Create `src/features/builder-v2/lib/generate.ts`:

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";

import { getCodeGenSystemPrompt } from "./prompt";
import { FragmentSchema } from "./schema";

export interface GenerateFragmentInput {
  userMessage: string;
  existingCode: string | null;
  context?: string;
}

export function generateFragment({
  userMessage,
  existingCode,
  context,
}: GenerateFragmentInput) {
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

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/builder-v2/lib/__tests__/generate.test.ts
```

Expected: PASS

- [ ] **Step 5: Update `route.ts` to use shared function**

Replace the contents of `src/app/api/chat/generate/route.ts` with:

```typescript
import { NextResponse } from "next/server";

import { generateFragment } from "@/features/builder-v2/lib/generate";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const messages = body?.messages;
  const context = body?.context;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const lastUserMsg = messages.filter((m: { role: string }) => m.role === "user").pop();
  const result = generateFragment({
    userMessage: lastUserMsg?.content ?? "",
    existingCode: context ?? null,
  });

  return result.toTextStreamResponse();
}
```

- [ ] **Step 6: Run the full test suite to verify nothing broke**

```bash
npx vitest run
```

Expected: All existing tests pass + new generate tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/builder-v2/lib/generate.ts src/features/builder-v2/lib/__tests__/generate.test.ts src/app/api/chat/generate/route.ts
git commit -m "refactor: extract generateFragment() as shared function for web + Discord"
```

---

### Task 5: Configure Next.js + Vercel for Discord

**Files:**
- Modify: `next.config.ts`
- Create: `vercel.json`

- [ ] **Step 1: Update `next.config.ts`**

Replace contents of `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["discord.js"],
};

export default nextConfig;
```

- [ ] **Step 2: Create `vercel.json`**

Create `vercel.json` at project root:

```json
{
  "crons": [
    {
      "path": "/api/discord/gateway",
      "schedule": "*/4 * * * *"
    }
  ]
}
```

- [ ] **Step 3: Verify build still works**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds (or existing build issues — no new errors from our changes).

- [ ] **Step 4: Commit**

```bash
git add next.config.ts vercel.json
git commit -m "chore: configure Next.js serverExternalPackages + Vercel cron for Discord gateway"
```

---

### Task 6: Create Convex Client + Discord Feature Slice

**Files:**
- Create: `src/features/discord/lib/convex-client.ts`

- [ ] **Step 1: Create the directory and Convex client file**

Create `src/features/discord/lib/convex-client.ts`:

```typescript
import { ConvexHttpClient } from "convex/browser";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

export const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
```

- [ ] **Step 2: Commit**

```bash
git add src/features/discord/lib/convex-client.ts
git commit -m "feat: add Discord feature slice with ConvexHttpClient"
```

---

### Task 7: Create Bot Definition + Event Handlers

**Files:**
- Create: `src/features/discord/lib/bot.tsx`

This is the core file. It defines the Chat SDK bot and wires it to the existing generation pipeline.

- [ ] **Step 1: Create `bot.tsx`**

Create `src/features/discord/lib/bot.tsx`:

```tsx
/** @jsxImportSource chat */
import { Chat } from "chat";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createRedisState } from "@chat-adapter/state-redis";
import { createClient } from "redis";
import {
  Card,
  CardText,
  Image,
  Actions,
  LinkButton,
} from "chat";

import { api } from "../../../../convex/_generated/api";
import { generateFragment } from "../../builder-v2/lib/generate";
import { createSandbox, executeFragment } from "../../builder-v2/lib/e2b";
import { convex } from "./convex-client";

const BUILD_CHANNEL_ID = process.env.DISCORD_BUILD_CHANNEL_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bridges.app";

// Redis client for generation locks (separate from Chat SDK state)
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);

const GENERATING_KEY = (threadId: string) => `bridges:generating:${threadId}`;
const RATE_LIMIT = 5;
const DAY_MS = 86_400_000;

export const bot = new Chat({
  userName: "bridges",
  adapters: {
    discord: createDiscordAdapter(),
  },
  state: createRedisState(),
});

function extractChannelId(threadId: string): string | undefined {
  // Thread IDs encode discord:{guildId}:{channelId}:{threadId}
  const parts = threadId.split(":");
  return parts.length >= 3 ? parts[2] : undefined;
}

// First mention — new build session
bot.onNewMention(async (thread, message) => {
  // Channel restriction
  if (BUILD_CHANNEL_ID) {
    const channelId = extractChannelId(thread.id);
    if (channelId !== BUILD_CHANNEL_ID) return;
  }

  await thread.subscribe();

  // Rate limit check
  try {
    const count = await convex.query(api.projects.countByDiscordUser, {
      discordUserId: message.author.id,
      since: Date.now() - DAY_MS,
    });
    if (count >= RATE_LIMIT) {
      await thread.post(
        "You've hit the daily limit (5 tools). Try again tomorrow! In the meantime, you can iterate on your existing tools in this server."
      );
      return;
    }
  } catch (err) {
    console.error("Rate limit check failed:", err);
    // Continue anyway — don't block users on rate limit check failures
  }

  // Lock thread
  await redis.set(GENERATING_KEY(thread.id), "true", { EX: 120 });

  try {
    // Stream generation
    const result = generateFragment({
      userMessage: message.text,
      existingCode: null,
    });
    await thread.post(result.fullStream);

    // Create sandbox
    const fragment = await result.object;
    const sandbox = await createSandbox(fragment);

    // Save to Convex
    const projectId = await convex.mutation(api.projects.create, {
      title: fragment.title,
      description: fragment.description,
    });
    await convex.mutation(api.projects.update, {
      projectId,
      fragment,
      sandboxId: sandbox.sandboxId,
    });
    await convex.mutation(api.projects.setDiscordMetadata, {
      projectId,
      discordUserId: message.author.id,
      discordThreadId: thread.id,
    });

    // Post final embed
    await thread.post(
      <Card title={fragment.title} subtitle={fragment.description ?? ""}>
        <CardText>{`Your tool is live! Open it in your browser to interact with it.`}</CardText>
        <Actions>
          <LinkButton url={sandbox.url}>View Live</LinkButton>
          <LinkButton url={`${APP_URL}/builder?project=${projectId}`}>
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
    await redis.del(GENERATING_KEY(thread.id));
  }
});

// Follow-up messages in subscribed threads — iterative edits
bot.onSubscribedMessage(async (thread, message) => {
  // Check generation lock
  const isGenerating = await redis.get(GENERATING_KEY(thread.id));
  if (isGenerating) {
    await thread.post("Still working on your last request — hold tight!");
    return;
  }

  // Look up existing project
  let project;
  try {
    project = await convex.query(api.projects.getByDiscordThread, {
      discordThreadId: thread.id,
    });
  } catch (err) {
    console.error("Project lookup failed:", err);
    return;
  }
  if (!project) return;

  await redis.set(GENERATING_KEY(thread.id), "true", { EX: 120 });

  try {
    // Re-generate with current code
    const existingCode = project.fragment?.code ?? null;
    const result = generateFragment({
      userMessage: message.text,
      existingCode,
    });
    await thread.post(result.fullStream);

    // Update sandbox
    const fragment = await result.object;
    let sandboxUrl: string;

    try {
      // Try reconnecting to existing sandbox
      const updated = await executeFragment(project.sandboxId!, fragment);
      sandboxUrl = updated.url;
    } catch {
      // Sandbox expired — create fresh one
      const newSandbox = await createSandbox(fragment);
      sandboxUrl = newSandbox.url;
      await convex.mutation(api.projects.update, {
        projectId: project._id,
        sandboxId: newSandbox.sandboxId,
      });
    }

    // Update project fragment
    await convex.mutation(api.projects.update, {
      projectId: project._id,
      fragment,
    });

    // Post updated embed
    await thread.post(
      <Card title={fragment.title}>
        <CardText>Updated! Check out the changes.</CardText>
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
    await redis.del(GENERATING_KEY(thread.id));
  }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "discord\|bot" | head -20
```

Expected: No errors related to our new files (there may be pre-existing errors elsewhere).

- [ ] **Step 3: Commit**

```bash
git add src/features/discord/lib/bot.tsx
git commit -m "feat: implement Discord bot with Chat SDK — generation, streaming, embeds"
```

---

### Task 8: Create Webhook Route

**Files:**
- Create: `src/app/api/webhooks/[platform]/route.ts`

- [ ] **Step 1: Create the webhook route**

Create `src/app/api/webhooks/[platform]/route.ts`:

```typescript
import { after } from "next/server";

import { bot } from "@/features/discord/lib/bot";

type Platform = keyof typeof bot.webhooks;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
): Promise<Response> {
  const { platform } = await params;
  const handler = bot.webhooks[platform as Platform];

  if (!handler) {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  return handler(request, {
    waitUntil: (task: Promise<unknown>) => after(() => task),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/
git commit -m "feat: add dynamic webhook route for Chat SDK platform adapters"
```

---

### Task 9: Create Gateway Route

**Files:**
- Create: `src/app/api/discord/gateway/route.ts`

- [ ] **Step 1: Create the gateway route**

Create `src/app/api/discord/gateway/route.ts`:

```typescript
import { after } from "next/server";

import { bot } from "@/features/discord/lib/bot";

export const maxDuration = 300; // Vercel Pro max (5 minutes)

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Run for 4.5 minutes (leaves 30s buffer before maxDuration)
  const durationMs = 270_000;
  const webhookUrl = `https://${process.env.VERCEL_URL}/api/webhooks/discord`;

  await bot.initialize();

  return bot.adapters.discord.startGatewayListener(
    { waitUntil: (task: Promise<unknown>) => after(() => task) },
    durationMs,
    undefined,
    webhookUrl
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/discord/gateway/route.ts
git commit -m "feat: add Discord gateway WebSocket cron endpoint"
```

---

### Task 10: Set Up Environment Variables

**Files:** None (external configuration only)

- [ ] **Step 1: Create Discord Application**

Go to https://discord.com/developers/applications:
1. Create new application named "Bridges"
2. Note `APPLICATION_ID` and `PUBLIC_KEY` (64-char hex)
3. Go to Bot tab → Create Bot → copy `BOT_TOKEN`
4. Enable **Message Content Intent** and **Server Members Intent** under Privileged Gateway Intents
5. Go to OAuth2 → URL Generator → select `bot` + `applications.commands`
6. Select permissions: Send Messages, Create Public Threads, Send Messages in Threads, Embed Links, Attach Files, Read Message History, Add Reactions, Use Slash Commands
7. Copy the invite URL and add bot to your Bridges community server
8. Get the `#build-tools` channel ID (right-click channel → Copy Channel ID in Discord with Developer Mode enabled)

- [ ] **Step 2: Set up Upstash Redis**

Go to https://console.upstash.com:
1. Create a new Redis database (free tier)
2. Copy the `REDIS_URL` (the connection string, not the REST URL)

- [ ] **Step 3: Generate a CRON_SECRET**

```bash
openssl rand -hex 32
```

- [ ] **Step 4: Add env vars to `.env.local`**

```bash
DISCORD_BOT_TOKEN=<from step 1>
DISCORD_PUBLIC_KEY=<from step 1>
DISCORD_APPLICATION_ID=<from step 1>
DISCORD_BUILD_CHANNEL_ID=<from step 1>
REDIS_URL=<from step 2>
CRON_SECRET=<from step 3>
```

- [ ] **Step 5: Add env vars to Vercel**

```bash
vercel env add DISCORD_BOT_TOKEN
vercel env add DISCORD_PUBLIC_KEY
vercel env add DISCORD_APPLICATION_ID
vercel env add DISCORD_BUILD_CHANNEL_ID
vercel env add REDIS_URL
vercel env add CRON_SECRET
```

- [ ] **Step 6: Set Interactions Endpoint URL in Discord Developer Portal**

Set to: `https://<your-vercel-domain>/api/webhooks/discord`

Discord will send a verification ping — the Chat SDK's webhook handler responds to it automatically.

---

### Task 11: Integration Test — End-to-End

**Files:** None (manual testing)

- [ ] **Step 1: Deploy to Vercel**

```bash
vercel --prod
```

Or push to main and let CI deploy.

- [ ] **Step 2: Verify Gateway cron is running**

Check Vercel dashboard → Cron Jobs → confirm `/api/discord/gateway` is scheduled.

- [ ] **Step 3: Test mention → build flow**

In Discord `#build-tools` channel, type:
```
@Bridges Build me a token board with 5 stars for rewarding good behavior
```

Expected:
1. Bot creates a thread from your message
2. Bot starts streaming Claude's response (updating every ~500ms)
3. After generation completes, bot posts a Card embed with "View Live" link
4. Clicking "View Live" opens the E2B sandbox with the working tool

- [ ] **Step 4: Test iterative editing**

In the same thread, type:
```
Make the stars gold and add a celebration animation when all 5 are earned
```

Expected:
1. Bot streams updated response
2. Posts new embed with updated live link

- [ ] **Step 5: Test rate limiting**

Create 5 new tool requests (not iterations — new mentions in `#build-tools`). On the 6th attempt:

Expected: Bot responds with "You've hit the daily limit (5 tools). Try again tomorrow!"

- [ ] **Step 6: Test channel restriction**

Mention the bot in a different channel.

Expected: Bot does not respond.

- [ ] **Step 7: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: integration test fixes from Discord bot E2E testing"
```

---

## Checkpoint Notes

- **After Task 4:** Web builder should still work exactly as before. Test by visiting `/builder` and building a tool to confirm the `generateFragment()` extraction didn't break anything.
- **After Task 7:** The bot code compiles but won't work until env vars are set (Task 10). TypeScript compilation is the verification checkpoint here.
- **After Task 10:** The bot should be fully functional. Run through all manual tests in Task 11.

## Required Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `DISCORD_BOT_TOKEN` | Discord Developer Portal | Bot authentication |
| `DISCORD_PUBLIC_KEY` | Discord Developer Portal (64-char hex) | Webhook verification |
| `DISCORD_APPLICATION_ID` | Discord Developer Portal | Bot identity |
| `DISCORD_BUILD_CHANNEL_ID` | Discord (right-click channel → Copy ID) | Channel restriction |
| `REDIS_URL` | Upstash console | Chat SDK state + generation locks |
| `CRON_SECRET` | `openssl rand -hex 32` | Gateway endpoint auth |

## Docs to Reference During Implementation

- **Spec:** `docs/superpowers/specs/2026-03-24-discord-bot-chat-sdk-design.md`
- **Chat SDK docs:** chat-sdk.dev/docs
- **Discord adapter:** chat-sdk.dev/docs/adapters/discord
- **Existing generation route:** `src/app/api/chat/generate/route.ts`
- **E2B sandbox helpers:** `src/features/builder-v2/lib/e2b.ts`
- **FragmentSchema:** `src/features/builder-v2/lib/schema.ts`
- **System prompts:** `src/features/builder-v2/lib/prompt.ts`
- **Convex guidelines:** `convex/_generated/ai/guidelines.md`
