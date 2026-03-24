# Bridges App Builder Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork E2B Fragments and layer Bridges' therapy expertise on top to create a non-technical-friendly AI app builder for the Springfield Vibeathon "Close the Gap" challenge.

**Architecture:** Fork E2B Fragments (Next.js 14 + Vercel AI SDK + E2B sandbox). Strip Supabase/analytics/rate-limiting. Add Convex for persistence + RAG, therapy-focused system prompt with interview mode, and Bridges design system. Claude Sonnet hardcoded as sole LLM.

**Tech Stack:** Next.js 16, Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), E2B SDK, Convex, shadcn/ui, Tailwind v4, Zod

**Spec:** `docs/superpowers/specs/2026-03-24-bridges-app-builder-pivot-design.md`

**Scope tiers (cut from bottom up if behind):**
- **Must have:** Tasks 1-7 (fork, strip, E2B helpers, prompt, chat route, chat UI, preview+wiring)
- **Should have:** Tasks 8-10 (persistence, RAG, templates)
- **Nice to have:** Tasks 11-13 (reskin, error states, landing page)

---

## File Map

### New files to create

| File | Responsibility |
|---|---|
| `src/app/api/chat/route.ts` | Streaming chat endpoint — interview (`streamText`) + code gen (`streamObject`) |
| `src/app/api/sandbox/route.ts` | E2B sandbox lifecycle — create, write files, install deps, return preview URL |
| `src/features/builder-v2/lib/prompt.ts` | Therapy-focused system prompt (interview + iteration + code gen modes) |
| `src/features/builder-v2/lib/schema.ts` | `FragmentSchema` Zod schema for structured code generation output |
| `src/features/builder-v2/lib/e2b.ts` | E2B sandbox helpers — create, execute, get URL, pre-warm |
| `src/features/builder-v2/lib/models.ts` | Claude Sonnet model client factory (hardcoded, no picker) |
| `src/features/builder-v2/components/chat.tsx` | Chat UI — message list, input, streaming display |
| `src/features/builder-v2/components/chat-input.tsx` | Message input with send button, no jargon |
| `src/features/builder-v2/components/preview.tsx` | Split panel — iframe preview + code toggle |
| `src/features/builder-v2/components/fragment-web.tsx` | iframe wrapper for E2B sandbox URL |
| `src/features/builder-v2/components/builder-layout.tsx` | Two-panel layout: chat left, preview right |
| `convex/projects.ts` | CRUD mutations/queries for projects table |
| `convex/knowledge/http.ts` | HTTP action exposing RAG search to Next.js API routes |
| `convex/http.ts` | HTTP router registering the RAG endpoint |

| File | Change |
|---|---|
| `convex/schema.ts` | Add `projects` and `therapyTemplates` tables |
| `src/core/providers.tsx` | No changes needed (ConvexProvider already wired) |
| `src/app/(app)/builder/page.tsx` | Replace old builder with new builder-v2 layout |
| `src/app/globals.css` | Already has design tokens — no changes needed |
| `package.json` | Add `@e2b/code-interpreter` (or `@e2b/sdk`), verify Zod compat |

---

## Task 1: Fork and Strip E2B Fragments

**Files:**
- Reference: E2B Fragments repo (https://github.com/e2b-dev/fragments)
- Create: `src/app/api/chat/route.ts` (from Fragments' `app/api/chat/route.ts`)
- Create: `src/app/api/sandbox/route.ts` (from Fragments' `app/api/sandbox/route.ts`)
- Create: `src/features/builder-v2/lib/schema.ts` (from Fragments' `lib/schema.ts`)

- [ ] **Step 1: Clone Fragments repo to a temp directory and inspect key files**

```bash
cd /tmp && git clone --depth 1 https://github.com/e2b-dev/fragments.git fragments-ref
```

Inspect these files to understand exact imports and patterns:
- `fragments-ref/package.json` — get E2B package name + version, Zod version
- `fragments-ref/lib/schema.ts` — get exact FragmentSchema
- `fragments-ref/app/api/chat/route.ts` — get streaming pattern
- `fragments-ref/app/api/sandbox/route.ts` — get sandbox creation pattern
- `fragments-ref/lib/prompt.ts` — get base prompt structure

- [ ] **Step 2: Verify E2B package name and Zod version**

Check Fragments' `package.json`:
- If `@e2b/code-interpreter`: install that
- If `@e2b/sdk`: install that
- If Zod `^3.x`: we have a conflict (our project is `^4.3.6`). Plan: use `zod` v4 for app code, but the FragmentSchema may need `zod/v3` import. Check if Vercel AI SDK's `streamObject` works with Zod 4.

Expected: E2B package identified, Zod strategy decided.

- [ ] **Step 3: Install E2B SDK**

```bash
cd /Users/desha/Springfield-Vibeathon
npm install @e2b/code-interpreter
```

(Adjust package name based on Step 2 findings.)

- [ ] **Step 4: Copy FragmentSchema to `src/features/builder-v2/lib/schema.ts`**

Adapt from Fragments' `lib/schema.ts`. Use Zod version determined in Step 2.

```typescript
import { z } from "zod"; // or "zod/v3" if needed

export const fragmentSchema = z.object({
  commentary: z.string().describe("Describe your approach in detail"),
  template: z.string().describe("Sandbox template to use — always 'nextjs-developer'"),
  title: z.string().describe("Short title, max 3 words"),
  description: z.string().describe("Short description, max 1 sentence"),
  code: z.string().describe("Complete runnable code. No markdown backticks."),
  additional_dependencies: z.array(z.string()).describe("Extra npm packages to install"),
  has_additional_dependencies: z.boolean().describe("Whether extra deps are needed"),
  install_dependencies_command: z.string().describe("npm install command for extra deps"),
  file_path: z.string().describe("File path in sandbox, e.g. app/page.tsx"),
  port: z.number().nullable().describe("Port number if web server, null otherwise"),
});

export type FragmentSchema = z.infer<typeof fragmentSchema>;
```

- [ ] **Step 5: Commit**

```bash
git add src/features/builder-v2/lib/schema.ts package.json package-lock.json
git commit -m "feat: install E2B SDK and add FragmentSchema"
```

---

## Task 2: Create E2B Sandbox Helpers

**Files:**
- Create: `src/features/builder-v2/lib/e2b.ts`

- [ ] **Step 1: Create sandbox helper module**

Adapt from Fragments' `app/api/sandbox/route.ts`. This module handles sandbox lifecycle.

```typescript
// src/features/builder-v2/lib/e2b.ts
import { Sandbox } from "@e2b/code-interpreter"; // adjust import per Task 1 findings
import type { FragmentSchema } from "./schema";

export async function createSandbox(fragment: FragmentSchema) {
  const sbx = await Sandbox.create(fragment.template, {
    metadata: { template: fragment.template },
  });

  // Install additional dependencies if needed
  if (fragment.has_additional_dependencies && fragment.install_dependencies_command) {
    await sbx.commands.run(fragment.install_dependencies_command);
  }

  // Write the generated code to the sandbox
  await sbx.files.write(fragment.file_path, fragment.code);

  return sbx;
}

export function getSandboxPreviewUrl(sbx: Sandbox, port: number | null): string {
  const p = port ?? 3000;
  return `https://${sbx.getHost(p)}`;
}

export async function preWarmSandbox(): Promise<Sandbox> {
  // Boot a sandbox with the nextjs-developer template before code gen completes
  // This masks the 3-10s cold start during the interview phase
  return Sandbox.create("nextjs-developer");
}
```

**Note:** The exact API may differ based on E2B package. Adjust `Sandbox` import and methods based on what `fragments-ref` uses.

- [ ] **Step 2: Commit**

```bash
git add src/features/builder-v2/lib/e2b.ts
git commit -m "feat: add E2B sandbox helper module"
```

---

## Task 3: Create Sandbox API Route

**Files:**
- Create: `src/app/api/sandbox/route.ts`

- [ ] **Step 1: Create the sandbox execution endpoint**

Adapted from Fragments' `app/api/sandbox/route.ts`:

```typescript
// src/app/api/sandbox/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSandbox, getSandboxPreviewUrl } from "@/features/builder-v2/lib/e2b";
import type { FragmentSchema } from "@/features/builder-v2/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const { fragment } = (await req.json()) as { fragment: FragmentSchema };

    const sbx = await createSandbox(fragment);
    const url = getSandboxPreviewUrl(sbx, fragment.port);

    return NextResponse.json({
      sandboxId: sbx.sandboxId,
      url,
      template: fragment.template,
    });
  } catch (error) {
    console.error("Sandbox creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create sandbox. Please try again." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify sandbox endpoint works**

Run the dev server and test with curl:

```bash
npm run dev &
curl -X POST http://localhost:3000/api/sandbox \
  -H "Content-Type: application/json" \
  -d '{"fragment":{"commentary":"test","template":"nextjs-developer","title":"Test","description":"Test app","code":"export default function Page() { return <h1>Hello</h1> }","additional_dependencies":[],"has_additional_dependencies":false,"install_dependencies_command":"","file_path":"app/page.tsx","port":3000}}'
```

Expected: JSON response with `sandboxId` and `url` fields. The URL should be a valid E2B sandbox host.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sandbox/route.ts
git commit -m "feat: add sandbox execution API route"
```

---

## Task 4: Write Therapy System Prompt

**Files:**
- Create: `src/features/builder-v2/lib/prompt.ts`

This is **the differentiator** — the conversation layer that makes Bridges different from generic Fragments. Must be created before the chat route (Task 5 imports from this).

- [ ] **Step 1: Create the prompt module with interview and code gen modes**

```typescript
// src/features/builder-v2/lib/prompt.ts

export function getInterviewPrompt(ragContext?: string): string {
  return `You are Bridges, a friendly AI assistant that helps parents of autistic children and therapy professionals (ABA therapists, speech therapists, occupational therapists) build custom therapy tools.

## Your Personality
- Warm, encouraging, and patient
- You speak therapy language naturally — you know what token boards, visual schedules, communication boards, social stories, first-then boards, and behavior trackers are
- You NEVER use developer jargon. No "components", "APIs", "databases", "deploy", "server", "frontend", "backend"
- Instead say: "your tool", "share it", "save it", "the app", "the screen"

## Your Job: Interview Mode
You are currently gathering information to build a tool. Ask 3-5 short, plain-language questions to understand:
1. **Who is this for?** (their child, their clients, a classroom?)
2. **What problem does it solve?** (tracking behaviors, motivating tasks, communicating needs?)
3. **How should it work?** (tap buttons, drag items, show pictures, play sounds?)
4. **What should it look like?** (calming colors, big buttons, specific images?)

Rules:
- Ask ONE question at a time
- Offer 2-3 example answers to guide them
- When you have enough context (usually 3-4 exchanges), say "I have a great idea for your tool! Let me build it now..." — this signals the system to switch to code generation mode
- If the user's request clearly matches a known therapy tool type (token board, visual schedule, etc.), you can skip some questions and move faster

${ragContext ? `## Domain Knowledge\nUse this context about therapy tools to inform your questions and suggestions:\n${ragContext}` : ""}`;
}

export function getCodeGenPrompt(ragContext?: string): string {
  return `You are Bridges, an AI that generates therapy tool applications as React code.

## Output Rules
- Generate a COMPLETE, working React component for Next.js App Router
- Use Tailwind CSS for all styling
- Make it mobile-friendly (therapy tools are often used on tablets)
- Use large touch targets (min 44px) — these tools are used by children and busy parents
- Use calming, accessible colors (soft blues, greens, warm neutrals)
- Include all state management inline with React hooks
- The code must be self-contained in a single file (app/page.tsx)
- Do NOT import from external component libraries — use plain HTML + Tailwind
- Do NOT use any developer-facing text in the UI

## Therapy Tool Patterns
- **Token boards:** Grid of token slots, tap to earn/remove tokens, celebration animation at goal
- **Visual schedules:** Ordered list of activities with icons, tap to mark complete, progress indicator
- **Communication boards:** Grid of picture cards with labels, tap to speak (or highlight)
- **Behavior trackers:** Quick-tap buttons for behaviors, running count, daily/weekly summary chart
- **Social stories:** Swipeable cards with illustrations and simple text, progress dots
- **First-then boards:** Two panels showing current task and reward, visual transition between them
- **Choice boards:** Grid of options, tap to select, confirm button

## Code Quality
- Use 'use client' directive at the top
- Use React.useState for state, React.useEffect for side effects
- All interactive elements must have aria labels
- Animations should be subtle and not distracting (children with sensory sensitivities)

${ragContext ? `## Domain Knowledge\n${ragContext}` : ""}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/builder-v2/lib/prompt.ts
git commit -m "feat: add therapy-focused system prompts (interview + code gen modes)"
```

---

## Task 5: Hardcode Claude Sonnet and Create Chat Route

**Files:**
- Create: `src/features/builder-v2/lib/models.ts`
- Create: `src/app/api/chat/route.ts`
- Depends on: Task 4 (imports `getInterviewPrompt`/`getCodeGenPrompt` from prompt.ts)

- [ ] **Step 1: Create model client factory (hardcoded Claude)**

```typescript
// src/features/builder-v2/lib/models.ts
import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Hardcoded to Claude Sonnet — no model picker needed
export const modelClient = anthropic("claude-sonnet-4-20250514");
```

- [ ] **Step 2: Create the chat API route with dual streaming modes**

Two endpoints in one route:
- **Interview mode:** `streamText()` → `toUIMessageStreamResponse()` (consumed by `useChat` hook)
- **Code gen / iterate mode:** Separate `POST` to `/api/chat/generate` returns full `FragmentSchema` JSON

**Important:** `streamObject` returns via `toTextStreamResponse()` which is NOT compatible with `useChat`. Instead, code gen is a separate fetch call from the client that receives the complete FragmentSchema as JSON.

```typescript
// src/app/api/chat/route.ts
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { modelClient } from "@/features/builder-v2/lib/models";
import { getInterviewPrompt } from "@/features/builder-v2/lib/prompt";

// Interview mode — streaming text for useChat hook
export async function POST(req: Request) {
  const { messages, ragContext } = (await req.json()) as {
    messages: UIMessage[];
    ragContext?: string;
  };

  const result = streamText({
    model: modelClient,
    system: getInterviewPrompt(ragContext),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 3: Create the code generation endpoint**

```typescript
// src/app/api/chat/generate/route.ts
import { generateObject, type CoreMessage } from "ai";
import { modelClient } from "@/features/builder-v2/lib/models";
import { fragmentSchema } from "@/features/builder-v2/lib/schema";
import { getCodeGenPrompt } from "@/features/builder-v2/lib/prompt";
import { NextResponse } from "next/server";

// Code generation — returns complete FragmentSchema JSON
export async function POST(req: Request) {
  const { messages, ragContext, currentCode } = (await req.json()) as {
    messages: CoreMessage[];
    ragContext?: string;
    currentCode?: string; // For iteration mode — include current code in context
  };

  const systemPrompt = currentCode
    ? `${getCodeGenPrompt(ragContext)}\n\n## Current Code (modify this based on the user's request)\n\`\`\`\n${currentCode}\n\`\`\``
    : getCodeGenPrompt(ragContext);

  const { object } = await generateObject({
    model: modelClient,
    schema: fragmentSchema,
    system: systemPrompt,
    messages,
  });

  return NextResponse.json({ fragment: object });
}
```

**Note:** Uses `generateObject`. Returns complete result. For a vibeathon demo, the 10-15s wait is acceptable with a good loading state.

- [ ] **Step 4: Install `@ai-sdk/react` and verify `useChat` works**

```bash
npm install @ai-sdk/react
npm run dev
```

The `useChat` hook lives in `@ai-sdk/react` (not `ai/react`) as of AI SDK v6. Verify `import { useChat } from "@ai-sdk/react"` resolves correctly.

- [ ] **Step 5: Commit**

```bash
git add src/features/builder-v2/lib/models.ts src/app/api/chat/route.ts src/app/api/chat/generate/route.ts
git commit -m "feat: add chat API routes — interview (streamText) + code gen (generateObject)"
```

---

## Task 6: Build the Chat UI

**Files:**
- Create: `src/features/builder-v2/components/chat.tsx`
- Create: `src/features/builder-v2/components/chat-input.tsx`
- Create: `src/features/builder-v2/components/chat-message.tsx`

- [ ] **Step 1: Create the chat message component**

```typescript
// src/features/builder-v2/components/chat-message.tsx
"use client";

import { cn } from "@/core/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-3",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          role === "user"
            ? "bg-primary text-on-primary"
            : "bg-surface-container-low text-on-surface"
        )}
      >
        {content}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the chat input component**

```typescript
// src/features/builder-v2/components/chat-input.tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, isLoading, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 bg-surface-container-low p-4">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder ?? "Describe what you need..."}
        className="flex-1 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/50 outline-none focus:ring-2 focus:ring-primary/30"
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !input.trim()} size="lg" className="rounded-xl">
        {isLoading ? "Thinking..." : "Send"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create the main chat component with full interview → generate → iterate flow**

This component handles the complete lifecycle:
1. Interview mode: `useChat` with `/api/chat` (streamText)
2. Detects when AI signals "building your tool" → triggers code gen
3. Code gen: fetches `/api/chat/generate` (generateObject) → calls `onFragmentGenerated`
4. Iterate mode: subsequent messages trigger code gen with current code included

```typescript
// src/features/builder-v2/components/chat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import type { FragmentSchema } from "@/features/builder-v2/lib/schema";

interface ChatProps {
  onFragmentGenerated: (fragment: FragmentSchema) => void;
  currentCode?: string; // For iteration — pass current generated code back in
}

export function Chat({ onFragmentGenerated, currentCode }: ChatProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGenerated = !!currentCode;
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, append, isLoading, setMessages } = useChat({
    api: "/api/chat",
    onFinish(message) {
      // Detect when interview is done and AI signals readiness to build
      if (
        !hasGenerated &&
        message.role === "assistant" &&
        (message.content.toLowerCase().includes("let me build") ||
          message.content.toLowerCase().includes("building your") ||
          message.content.toLowerCase().includes("creating your"))
      ) {
        triggerCodeGen(messages.concat([message]));
      }
    },
  });

  // Trigger code generation (initial or iteration)
  const triggerCodeGen = useCallback(async (chatMessages: typeof messages) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
          currentCode: currentCode ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.fragment) {
        onFragmentGenerated(data.fragment);
      }
    } catch (err) {
      console.error("Code generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [currentCode, onFragmentGenerated]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Send initial greeting when chat mounts
  useEffect(() => {
    if (messages.length === 0) {
      append({
        role: "user",
        content: "[SYSTEM] User just opened Bridges. Greet them warmly and ask what kind of therapy tool they need.",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSend(content: string) {
    if (hasGenerated) {
      // Iteration mode — add message then trigger code gen with current code
      const updatedMessages = [...messages, { id: crypto.randomUUID(), role: "user" as const, content }];
      setMessages(updatedMessages);
      triggerCodeGen(updatedMessages);
    } else {
      // Interview mode — stream via useChat
      append({ role: "user", content });
    }
  }

  // Filter out the system bootstrap message from display
  const visibleMessages = messages.filter(
    (m) => !m.content.startsWith("[SYSTEM]")
  );

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {visibleMessages.map((m) => (
          <ChatMessage key={m.id} role={m.role as "user" | "assistant"} content={m.content} />
        ))}
        {isGenerating && (
          <ChatMessage role="assistant" content="Building your tool... this takes about 15 seconds." />
        )}
      </div>
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading || isGenerating}
        placeholder={
          hasGenerated
            ? "What would you like to change?"
            : "Tell me about the tool you need..."
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/builder-v2/components/chat.tsx src/features/builder-v2/components/chat-input.tsx src/features/builder-v2/components/chat-message.tsx
git commit -m "feat: add chat UI with interview mode and streaming"
```

---

## Task 7: Build Preview Panel and Wire End-to-End

**Files:**
- Create: `src/features/builder-v2/components/fragment-web.tsx`
- Create: `src/features/builder-v2/components/preview.tsx`
- Create: `src/features/builder-v2/components/builder-layout.tsx`
- Modify: `src/app/(app)/builder/page.tsx`

- [ ] **Step 1: Create iframe preview component**

Adapted from Fragments' `components/fragment-web.tsx`:

```typescript
// src/features/builder-v2/components/fragment-web.tsx
"use client";

interface FragmentWebProps {
  url: string;
}

export function FragmentWeb({ url }: FragmentWebProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-xl bg-white">
      <iframe
        src={url}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Tool preview"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create preview panel wrapper**

```typescript
// src/features/builder-v2/components/preview.tsx
"use client";

import { FragmentWeb } from "./fragment-web";

interface PreviewProps {
  sandboxUrl: string | null;
  isLoading: boolean;
}

export function Preview({ sandboxUrl, isLoading }: PreviewProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container-low">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-lg font-medium text-on-surface">Building your tool...</p>
          <p className="mt-1 text-sm text-on-surface/60">This usually takes 10-20 seconds</p>
        </div>
      </div>
    );
  }

  if (!sandboxUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container-low">
        <div className="text-center max-w-sm px-8">
          <p className="text-2xl font-semibold text-on-surface font-[family-name:var(--font-manrope)]">
            Your tool will appear here
          </p>
          <p className="mt-2 text-sm text-on-surface/60">
            Tell me what you need in the chat, and I'll build it for you
          </p>
        </div>
      </div>
    );
  }

  return <FragmentWeb url={sandboxUrl} />;
}
```

- [ ] **Step 3: Create the two-panel builder layout**

```typescript
// src/features/builder-v2/components/builder-layout.tsx
"use client";

import { useState, useCallback } from "react";
import { Chat } from "./chat";
import { Preview } from "./preview";
import type { FragmentSchema } from "@/features/builder-v2/lib/schema";

export function BuilderLayout() {
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [isBuildingSandbox, setIsBuildingSandbox] = useState(false);
  const [currentFragment, setCurrentFragment] = useState<FragmentSchema | null>(null);

  const handleFragmentGenerated = useCallback(async (fragment: FragmentSchema) => {
    setCurrentFragment(fragment);
    setIsBuildingSandbox(true);

    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment }),
      });
      const data = await res.json();
      if (data.url) {
        setSandboxUrl(data.url);
      }
    } catch (err) {
      console.error("Sandbox failed:", err);
    } finally {
      setIsBuildingSandbox(false);
    }
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0">
      {/* Chat panel — no border, use tonal bg shift per No-Line Rule */}
      <div className="w-[420px] shrink-0 bg-surface">
        <Chat
          onFragmentGenerated={handleFragmentGenerated}
          currentCode={currentFragment?.code}
        />
      </div>

      {/* Preview panel — darker bg creates visual separation without borders */}
      <div className="flex-1 bg-surface-container-low">
        <Preview sandboxUrl={sandboxUrl} isLoading={isBuildingSandbox} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update the builder page to use new layout**

```typescript
// src/app/(app)/builder/page.tsx
import { BuilderLayout } from "@/features/builder-v2/components/builder-layout";

export default function BuilderPage() {
  return <BuilderLayout />;
}
```

- [ ] **Step 5: Run dev server and verify end-to-end flow**

```bash
npm run dev
```

Open `http://localhost:3000/builder`. Verify:
1. Chat panel loads with AI greeting
2. User can type a message and get a response
3. When AI signals "building your tool", sandbox creation fires
4. iframe loads with the E2B sandbox URL

Expected: Full loop works. If E2B API key isn't set, sandbox will fail — that's OK for this step.

- [ ] **Step 6: Commit**

```bash
git add src/features/builder-v2/ src/app/\(app\)/builder/page.tsx
git commit -m "feat: wire end-to-end flow — chat → code gen → sandbox → preview"
```

---

## Task 8: Add Convex Project Persistence

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/projects.ts`

- [ ] **Step 1: Add projects and therapyTemplates tables to schema**

```typescript
// Add to convex/schema.ts, inside defineSchema({...})

  projects: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    fragment: v.any(),
    chatHistory: v.array(v.any()),
    generatedCode: v.optional(v.string()),
    status: v.union(
      v.literal("interviewing"),
      v.literal("generating"),
      v.literal("draft"),
      v.literal("published")
    ),
    publishedUrl: v.optional(v.string()),
    sandboxId: v.optional(v.string()),
    template: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"]),

  therapyTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("aba"),
      v.literal("speech"),
      v.literal("sensory"),
      v.literal("social"),
      v.literal("data-collection")
    ),
    fragment: v.any(),
    thumbnailUrl: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_category", ["category"]),
```

- [ ] **Step 2: Create project CRUD functions**

```typescript
// convex/projects.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MOCK_USER_ID = "vibeathon-demo-user";

export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    template: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      userId: MOCK_USER_ID,
      title: args.title,
      description: args.description,
      fragment: null,
      chatHistory: [],
      status: "interviewing",
      template: args.template,
      updatedAt: Date.now(),
    });
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    fragment: v.optional(v.any()),
    chatHistory: v.optional(v.array(v.any())),
    generatedCode: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("interviewing"),
        v.literal("generating"),
        v.literal("draft"),
        v.literal("published")
      )
    ),
    sandboxId: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(projectId, { ...filtered, updatedAt: Date.now() });
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

export const listUserProjects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", MOCK_USER_ID))
      .order("desc")
      .take(50);
  },
});
```

- [ ] **Step 3: Deploy schema and verify**

```bash
npx convex dev
```

Expected: Schema deploys with new `projects` and `therapyTemplates` tables. No errors.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/projects.ts
git commit -m "feat: add Convex projects table and CRUD functions"
```

---

## Task 9: Wire RAG into Chat Route

**Files:**
- Create: `convex/knowledge/http.ts`
- Create: `convex/http.ts` (or modify if exists)
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Create HTTP action exposing RAG search**

The existing `searchKnowledgeAction` is an `internalAction` — not callable from outside Convex. Create an HTTP endpoint.

```typescript
// convex/knowledge/http.ts
// NOTE: No "use node" needed — httpAction runs in Convex runtime, not Node.js
import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const searchKnowledge = httpAction(async (ctx, request) => {
  const { query, category, limit } = await request.json();

  const result = await ctx.runAction(internal.knowledge.search.searchKnowledgeAction, {
    query: query as string,
    category: category as string | undefined,
    limit: (limit as number) ?? 5,
  });

  return new Response(JSON.stringify({ text: result }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Register HTTP route**

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { searchKnowledge } from "./knowledge/http";

const http = httpRouter();

http.route({
  path: "/api/knowledge/search",
  method: "POST",
  handler: searchKnowledge,
});

export default http;
```

- [ ] **Step 3: Update chat route to fetch RAG context**

Add RAG context fetching to `src/app/api/chat/route.ts`:

```typescript
// Add to the top of the POST handler, before the streaming call:

// Fetch RAG context from Convex
let ragContext: string | undefined;
const lastUserMessage = messages.filter((m: CoreMessage) => m.role === "user").pop();
if (lastUserMessage && typeof lastUserMessage.content === "string") {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const ragRes = await fetch(`${convexUrl.replace('.cloud', '.site')}/api/knowledge/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: lastUserMessage.content, limit: 5 }),
    });
    const ragData = await ragRes.json();
    ragContext = ragData.text;
  } catch {
    // RAG failure is non-fatal — proceed without context
  }
}
```

Then pass `ragContext` to the prompt functions (already wired in Task 5's prompt signatures).

- [ ] **Step 4: Verify RAG integration**

```bash
npx convex dev
npm run dev
```

Open builder, type "I need a token board for my son". Check server logs — the API route should fetch RAG context about token boards and include it in the prompt.

- [ ] **Step 5: Commit**

```bash
git add convex/knowledge/http.ts convex/http.ts src/app/api/chat/route.ts
git commit -m "feat: wire RAG knowledge base into chat via Convex HTTP action"
```

---

## Task 10: Create Therapy Templates

**Files:**
- Create: `convex/templates/therapy-seeds.ts`

- [ ] **Step 1: Create 2 core therapy template seeds**

Each template is a pre-built `FragmentSchema` that generates a working app.

```typescript
// convex/templates/therapy-seeds.ts
import { internalMutation } from "../_generated/server";

export const seedTherapyTemplates = internalMutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("therapyTemplates").take(1);
    if (existing.length > 0) return;

    await ctx.db.insert("therapyTemplates", {
      name: "Token Board",
      description: "A reward chart where your child earns tokens for completing tasks. Celebrate when they reach the goal!",
      category: "aba",
      sortOrder: 1,
      fragment: {
        commentary: "A simple token board with configurable goal count and celebration animation",
        template: "nextjs-developer",
        title: "Token Board",
        description: "Tap to earn tokens, celebrate at the goal",
        code: TOKEN_BOARD_CODE,
        additional_dependencies: [],
        has_additional_dependencies: false,
        install_dependencies_command: "",
        file_path: "app/page.tsx",
        port: 3000,
      },
    });

    await ctx.db.insert("therapyTemplates", {
      name: "Behavior Tracker",
      description: "Quick-tap buttons to track behaviors throughout the day. See patterns in a weekly chart.",
      category: "data-collection",
      sortOrder: 2,
      fragment: {
        commentary: "A behavior tracking app with tap-to-record and weekly summary",
        template: "nextjs-developer",
        title: "Behavior Tracker",
        description: "Track behaviors with quick taps and weekly charts",
        code: BEHAVIOR_TRACKER_CODE,
        additional_dependencies: [],
        has_additional_dependencies: false,
        install_dependencies_command: "",
        file_path: "app/page.tsx",
        port: 3000,
      },
    });
  },
});

// Template code — complete, self-contained React components
const TOKEN_BOARD_CODE = `'use client';
import { useState } from 'react';

const GOAL = 5;

export default function TokenBoard() {
  const [tokens, setTokens] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  function earnToken() {
    if (tokens >= GOAL) return;
    const next = tokens + 1;
    setTokens(next);
    if (next >= GOAL) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 3000);
    }
  }

  function reset() {
    setTokens(0);
    setCelebrating(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-sky-800 mb-8">My Token Board</h1>
      <div className="grid grid-cols-5 gap-4 mb-8">
        {Array.from({ length: GOAL }).map((_, i) => (
          <div
            key={i}
            className={\`w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl transition-all duration-300 \${
              i < tokens
                ? 'bg-yellow-400 border-yellow-500 scale-110'
                : 'bg-white border-gray-200'
            }\`}
          >
            {i < tokens ? '⭐' : ''}
          </div>
        ))}
      </div>
      {celebrating && (
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
      )}
      <p className="text-xl text-sky-700 mb-6 font-medium">
        {celebrating ? 'Amazing job! You did it!' : \`\${tokens} of \${GOAL} tokens earned\`}
      </p>
      <div className="flex gap-4">
        <button
          onClick={earnToken}
          disabled={tokens >= GOAL}
          className="px-8 py-4 bg-sky-600 text-white rounded-2xl text-lg font-semibold shadow-lg hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Earn a token"
        >
          Earn Token ⭐
        </button>
        <button
          onClick={reset}
          className="px-8 py-4 bg-white text-sky-600 rounded-2xl text-lg font-semibold shadow-lg border-2 border-sky-200 hover:bg-sky-50 active:scale-95 transition-all"
          aria-label="Start over"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}`;

const BEHAVIOR_TRACKER_CODE = `'use client';
import { useState } from 'react';

type BehaviorEntry = { behavior: string; timestamp: number; };

const BEHAVIORS = [
  { label: 'Meltdown', emoji: '😤', color: 'bg-red-100 border-red-300 text-red-700' },
  { label: 'Used Calming Strategy', emoji: '🧘', color: 'bg-green-100 border-green-300 text-green-700' },
  { label: 'Completed Task', emoji: '✅', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { label: 'Social Interaction', emoji: '🤝', color: 'bg-purple-100 border-purple-300 text-purple-700' },
];

export default function BehaviorTracker() {
  const [entries, setEntries] = useState<BehaviorEntry[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  function logBehavior(behavior: string) {
    setEntries((prev) => [...prev, { behavior, timestamp: Date.now() }]);
  }

  const todayEntries = entries.filter(
    (e) => new Date(e.timestamp).toDateString() === new Date().toDateString()
  );

  const summary = BEHAVIORS.map((b) => ({
    ...b,
    count: todayEntries.filter((e) => e.behavior === b.label).length,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-slate-50 p-6">
      <h1 className="text-2xl font-bold text-indigo-800 text-center mb-2">Behavior Tracker</h1>
      <p className="text-center text-indigo-500 mb-6 text-sm">Tap a button when it happens</p>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
        {BEHAVIORS.map((b) => (
          <button
            key={b.label}
            onClick={() => logBehavior(b.label)}
            className={\`p-6 rounded-2xl border-2 \${b.color} flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm\`}
            aria-label={\`Log \${b.label}\`}
          >
            <span className="text-3xl">{b.emoji}</span>
            <span className="font-semibold text-sm">{b.label}</span>
          </button>
        ))}
      </div>

      <div className="max-w-md mx-auto">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold mb-4"
        >
          {showSummary ? 'Hide' : 'Show'} Today\\'s Summary
        </button>

        {showSummary && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="font-bold text-indigo-800">Today\\'s Summary</h2>
            {summary.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>{s.emoji}</span>
                  <span className="text-sm">{s.label}</span>
                </span>
                <span className="font-bold text-lg">{s.count}</span>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-2">
              {todayEntries.length} total entries today
            </p>
          </div>
        )}
      </div>
    </div>
  );
}`;
```

- [ ] **Step 2: Run seed**

```bash
npx convex run --no-push templates/therapy-seeds:seedTherapyTemplates
```

Expected: 2 templates inserted into `therapyTemplates` table.

- [ ] **Step 3: Add a query to list therapy templates**

Add to `convex/projects.ts` (alongside the project CRUD functions):

```typescript
export const listTherapyTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("therapyTemplates").withIndex("by_category").collect();
  },
});
```

This allows the frontend to fetch templates for a future template picker UI.

- [ ] **Step 4: Commit**

```bash
git add convex/templates/therapy-seeds.ts convex/projects.ts
git commit -m "feat: seed 2 core therapy templates (token board, behavior tracker)"
```

---

## Task 11: Reskin with Bridges Design System

**Files:**
- Modify: `src/features/builder-v2/components/builder-layout.tsx`
- Create: `src/features/builder-v2/components/builder-header.tsx`

- [ ] **Step 1: Create the Bridges-branded builder header**

```typescript
// src/features/builder-v2/components/builder-header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

interface BuilderHeaderProps {
  projectTitle?: string;
  sandboxUrl: string | null;
  onShare?: () => void;
}

export function BuilderHeader({ projectTitle, sandboxUrl, onShare }: BuilderHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between bg-surface-container-lowest px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary font-[family-name:var(--font-manrope)]">
            Bridges
          </span>
        </Link>
        {projectTitle && (
          <>
            <span className="text-on-surface/30">/</span>
            <span className="text-sm text-on-surface/70">{projectTitle}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {sandboxUrl && (
          <Button
            onClick={onShare}
            variant="default"
            className="rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary"
          >
            Share Tool
          </Button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update builder layout to include header**

In `src/features/builder-v2/components/builder-layout.tsx`, add the header:

```typescript
// Add import at top
import { BuilderHeader } from "./builder-header";

// Update the return to include header
return (
  <div className="flex h-screen flex-col">
    <BuilderHeader
      sandboxUrl={sandboxUrl}
      onShare={() => {
        if (sandboxUrl) {
          navigator.clipboard.writeText(sandboxUrl);
        }
      }}
    />
    <div className="flex flex-1 gap-0">
      {/* Chat panel */}
      <div className="w-[420px] shrink-0 bg-surface">
        <Chat onFragmentGenerated={handleFragmentGenerated} />
      </div>
      {/* Preview panel */}
      <div className="flex-1 bg-surface-container-low">
        <Preview sandboxUrl={sandboxUrl} isLoading={isBuildingSandbox} />
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Verify visual appearance**

```bash
npm run dev
```

Open builder. Verify:
- Bridges branding in header
- Manrope font for headings
- Teal/primary color gradient on Share button
- Surface color hierarchy (chat bg vs preview bg)
- No 1px borders for section dividers (tonal bg shifts used instead per No-Line Rule)

- [ ] **Step 4: Commit**

```bash
git add src/features/builder-v2/components/builder-header.tsx src/features/builder-v2/components/builder-layout.tsx
git commit -m "feat: reskin builder with Bridges design system"
```

---

## Task 12: Error States and Sandbox Pre-warming

**Files:**
- Modify: `src/features/builder-v2/components/builder-layout.tsx`
- Modify: `src/features/builder-v2/components/preview.tsx`

- [ ] **Step 1: Add sandbox pre-warming to builder layout**

When the user starts a project, pre-boot a sandbox during the interview to mask cold start:

```typescript
// In builder-layout.tsx, add:
import { useEffect, useRef } from "react";

// Inside BuilderLayout component:
const preWarmedSandboxId = useRef<string | null>(null);

useEffect(() => {
  // Pre-warm a sandbox when the builder loads
  fetch("/api/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fragment: {
        commentary: "pre-warm",
        template: "nextjs-developer",
        title: "Warm",
        description: "Pre-warming sandbox",
        code: "export default function Page() { return <div>Loading...</div> }",
        additional_dependencies: [],
        has_additional_dependencies: false,
        install_dependencies_command: "",
        file_path: "app/page.tsx",
        port: 3000,
      },
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      preWarmedSandboxId.current = data.sandboxId;
    })
    .catch(() => {
      // Pre-warm failure is non-fatal
    });
}, []);
```

- [ ] **Step 2: Add error state to preview**

In `src/features/builder-v2/components/preview.tsx`, add an error display:

```typescript
// Add error prop
interface PreviewProps {
  sandboxUrl: string | null;
  isLoading: boolean;
  error?: string | null;
}

// Add error render before the sandboxUrl check:
if (error) {
  return (
    <div className="flex h-full items-center justify-center bg-surface-container-low">
      <div className="text-center max-w-sm px-8">
        <p className="text-xl font-semibold text-error">Something went wrong</p>
        <p className="mt-2 text-sm text-on-surface/60">{error}</p>
        <p className="mt-4 text-sm text-on-surface/40">
          Try describing your tool again, or start with a template
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/builder-v2/components/builder-layout.tsx src/features/builder-v2/components/preview.tsx
git commit -m "feat: add sandbox pre-warming and error states"
```

---

## Task 13: Landing Page and Demo Polish (Day 3)

**Files:**
- Modify: `src/app/(marketing)/page.tsx`
- Create: `src/features/landing/components/close-the-gap-hero.tsx`

- [ ] **Step 1: Create the "Close the Gap" hero section**

```typescript
// src/features/landing/components/close-the-gap-hero.tsx
"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export function CloseTheGapHero() {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center bg-gradient-to-b from-surface to-surface-container-low">
      <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight text-on-surface font-[family-name:var(--font-manrope)] md:text-6xl">
        Describe your therapy tool.
        <span className="block text-primary mt-2">We'll build it for you.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-on-surface/70">
        Bridges turns your ideas into working tools — no coding, no jargon, no tech skills needed.
        Built for ABA therapists, speech therapists, and parents.
      </p>
      <div className="mt-10 flex gap-4">
        <Button asChild size="lg" className="rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-6 text-lg">
          <Link href="/builder">Start Building</Link>
        </Button>
      </div>
      <p className="mt-16 text-xs text-on-surface/40">
        Built for the Springfield Vibeathon "Close the Gap" Challenge
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Update marketing page**

```typescript
// src/app/(marketing)/page.tsx
import { CloseTheGapHero } from "@/features/landing/components/close-the-gap-hero";

export default function HomePage() {
  return (
    <main>
      <CloseTheGapHero />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/landing/components/close-the-gap-hero.tsx src/app/\(marketing\)/page.tsx
git commit -m "feat: add Close the Gap landing page hero"
```

---

## Verification Checklist

After all tasks are complete, verify these success criteria:

- [ ] **The Stacey Test:** Open builder → AI greets you → answer 3-4 questions → see a working tool in the preview → click Share
- [ ] **Interview mode works:** AI asks domain-specific questions, never shows jargon
- [ ] **Code generation works:** After interview, AI generates React code that runs in E2B sandbox
- [ ] **Preview loads:** iframe shows the running tool within 15-20 seconds of generation
- [ ] **Iteration works:** "Make the buttons bigger" updates the tool in the preview
- [ ] **Templates work:** Can start from Token Board or Behavior Tracker template
- [ ] **Design system applied:** Manrope headings, teal primary, surface hierarchy, no 1px borders
- [ ] **Landing page:** "Close the Gap" hero with CTA to builder
- [ ] **No crashes:** Error states handle sandbox failures gracefully

---

## Verification Fixes Applied

Applied 2026-03-24 based on verification report (`2026-03-24-bridges-app-builder-pivot-verification.md`). 8 issues fixed:

| ID | Severity | Fix Applied |
|---|---|---|
| A1 | CRITICAL | Task 6 Step 3: Changed `import { useChat } from "ai/react"` to `import { useChat } from "@ai-sdk/react"` |
| A3 | WARNING | Task 5 Step 2: Replaced `toDataStreamResponse()` with `toUIMessageStreamResponse()`. Changed message type from `CoreMessage[]` to `UIMessage[]`, added `convertToModelMessages()` call |
| A4/D1 | WARNING | Task 5 Step 4: Added `npm install @ai-sdk/react` before dev server verification |
| W1 | WARNING | File Map: Removed `welcome-screen.tsx` and `share-dialog.tsx` (unwired stretch-goal components) |
| L1 | WARNING | Task 11 Step 2: Removed `border-r border-surface-variant` from chat panel div, kept `bg-surface` only (No-Line Rule) |
| L2 | SUGGESTION | Task 10: Added Step 3 with `listTherapyTemplates` query in `convex/projects.ts` |
