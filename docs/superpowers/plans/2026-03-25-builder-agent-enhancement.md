# Builder Agent Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image generation, TTS/STT, pre-built therapy components, 4 templates, and Vercel publish to the Bridges builder agent.

**Architecture:** Three-wave approach — Wave 1 wires plumbing (Convex actions, agent tools, WebContainer components, PostMessage bridge), Wave 2 adds content (4 templates, pre-seed cache, templates page redesign), Wave 3 connects publish (Vercel Deploy API). The builder agent in `route.ts` gets a multi-turn tool loop so Claude can call `generate_image`/`generate_speech` mid-generation then continue writing code.

**Tech Stack:** `@anthropic-ai/sdk` (multi-turn tool loop), `@google/genai` (Nano Banana image gen), ElevenLabs REST API (TTS + STT), Convex (file storage + caching), Vercel Deploy API (publish), WebContainer (preview with pre-built therapy React components)

**Spec:** `docs/superpowers/specs/2026-03-25-builder-agent-enhancement-design.md`

---

## Wave 1: Plumbing

### Task 1: Add `imageCache` table to Convex schema

**Files:**
- Modify: `convex/schema.ts:92-103` (after `ttsCache`, before `therapyTemplates`)

- [ ] **Step 1: Add the `imageCache` table definition**

Add after `ttsCache` table (line 91) and before `therapyTemplates`:

```typescript
  imageCache: defineTable({
    promptHash: v.string(),
    prompt: v.string(),
    label: v.string(),
    category: v.string(),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
    model: v.string(),
    createdAt: v.number(),
  }).index("by_promptHash", ["promptHash"])
    .index("by_label_category", ["label", "category"]),
```

- [ ] **Step 2: Add thumbnail fields to `therapyTemplates` table**

Update `therapyTemplates` table (line 93-102) to add:

```typescript
    thumbnailStorageId: v.optional(v.id("_storage")),
    thumbnailUrl: v.optional(v.string()),
```

- [ ] **Step 3: Run `npx convex dev` to verify schema deploys**

Run: `npx convex dev --once`
Expected: Schema deploys without errors

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add imageCache table and template thumbnails to schema"
```

---

### Task 2: Create image cache Convex queries/mutations

**Files:**
- Create: `convex/image_cache.ts`

- [ ] **Step 1: Create `convex/image_cache.ts`**

```typescript
import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const getByHash = internalQuery({
  args: { promptHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("imageCache")
      .withIndex("by_promptHash", (q) => q.eq("promptHash", args.promptHash))
      .first();
  },
});

export const save = internalMutation({
  args: {
    promptHash: v.string(),
    prompt: v.string(),
    label: v.string(),
    category: v.string(),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
    model: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("imageCache", args);
  },
});

export const count = internalQuery({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("imageCache").take(1);
    return entries.length;
  },
});
```

- [ ] **Step 2: Run `npx convex dev --once` to verify**

Expected: Functions registered without errors

- [ ] **Step 3: Commit**

```bash
git add convex/image_cache.ts
git commit -m "feat: add imageCache queries and mutations"
```

---

### Task 3: Create `generateTherapyImage` Convex action (Nano Banana)

**Files:**
- Create: `convex/image_generation.ts`
- Modify: `convex/aiActions.ts` (delete old `generateImage` action, lines 72-124)
- Modify: `convex/__tests__/ai.test.ts` (remove references to old `generateImage`)

- [ ] **Step 1: Delete the old `generateImage` action from `convex/aiActions.ts`**

Remove lines 72-124 (the existing `generateImage` action that uses `imagen-3.0-generate-002`). This is being replaced by the new `generateTherapyImage` in a dedicated file with caching and the correct API. Also update `convex/__tests__/ai.test.ts` to remove any test cases referencing the old `generateImage` action.

- [ ] **Step 2: Create `convex/image_generation.ts`**

```typescript
"use node";

import { createHash } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const CATEGORY_MODIFIERS: Record<string, string> = {
  emotions: "facial expression, round cartoon face",
  "daily-activities": "single action scene, simple background",
  animals: "cute cartoon animal, front-facing",
  food: "single food item, appetizing colors",
  objects: "single subject, centered",
  people: "single person, simple background",
  places: "simple scene, minimal detail",
};

function buildPrompt(label: string, category: string): string {
  const modifier = CATEGORY_MODIFIERS[category] ?? "single subject, centered";
  return `Simple, clear illustration of "${label}", ${modifier}, flat design, bold black outlines, solid colors, white background, child-friendly, Kawaii style, minimal detail, high contrast, suitable for ABA therapy picture card, no text, no watermark, single subject only`;
}

function getPromptHash(prompt: string): string {
  return createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex");
}

// Public action (not internalAction) because route.ts calls it via ConvexHttpClient
// which can only invoke public functions via api.*
export const generateTherapyImage = action({
  args: {
    label: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args): Promise<{ imageUrl: string }> => {
    const prompt = buildPrompt(args.label, args.category);
    const promptHash = getPromptHash(prompt);

    // Check cache
    const cached = await ctx.runQuery(internal.image_cache.getByHash, { promptHash });
    if (cached) {
      return { imageUrl: cached.imageUrl };
    }

    // Generate via Nano Banana Pro (gemini-3-pro-image-preview)
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
    }

    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        // responseModalities is optional for gemini-3-pro-image-preview (tested 2026-03-25)
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K",
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData
    );
    if (!part?.inlineData?.data) {
      throw new Error("No image generated");
    }

    const imageBuffer = Buffer.from(part.inlineData.data, "base64");
    const blob = new Blob([imageBuffer], { type: part.inlineData.mimeType ?? "image/png" });

    // Store in Convex file storage
    const storageId = await ctx.storage.store(blob);
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) {
      throw new Error("Failed to get image storage URL");
    }

    // Cache
    await ctx.runMutation(internal.image_cache.save, {
      promptHash,
      prompt,
      label: args.label,
      category: args.category,
      storageId,
      imageUrl,
      model: "gemini-3-pro-image-preview",
      createdAt: Date.now(),
    });

    return { imageUrl };
  },
});
```

- [ ] **Step 3: Run `npx convex dev --once` to verify**

Expected: Action registers without errors

- [ ] **Step 4: Commit**

```bash
git add convex/image_generation.ts convex/aiActions.ts convex/__tests__/ai.test.ts
git commit -m "feat: add generateTherapyImage action with Nano Banana Pro, remove old generateImage"
```

---

### Task 4: Upgrade TTS + add voice mapping + add STT action

**Files:**
- Modify: `convex/aiActions.ts:1-70` (generateSpeech action)
- Modify: `convex/ai.ts` (add voice-mapped TTS cache query)
- Create: `convex/stt.ts`

- [ ] **Step 1: Add voice mapping and upgrade model in `convex/aiActions.ts`**

Replace the `generateSpeech` action (lines 8-70) with:

```typescript
// Voice IDs verified and audio tested 2026-03-25. All three produce clear therapy-appropriate speech.
const VOICE_MAP: Record<string, string> = {
  "warm-female": "21m00Tcm4TlvDq8ikWAM", // Janet — warm, professional
  "calm-male": "pNInz6obpgDQGcFmaJgB",   // Adam — dominant, firm
  "child-friendly": "hpp4J3VqNfWAUOO0d1Us", // Bella — bright, warm, child-friendly
};

export const generateSpeech = action({
  args: {
    text: v.string(),
    voiceId: v.optional(v.string()),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ audioUrl: string }> => {
    // Resolve voice: friendly name -> ID, or use raw voiceId, or default
    const resolvedVoiceId =
      (args.voice ? VOICE_MAP[args.voice] : undefined) ??
      args.voiceId ??
      VOICE_MAP["warm-female"];

    // Check cache first
    const cached = await ctx.runQuery(anyApi.ai.getTtsCache, {
      text: args.text,
      voiceId: resolvedVoiceId,
    });

    if (cached) {
      return { audioUrl: cached };
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: args.text,
          model_id: "eleven_flash_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });

    const storageId = await ctx.storage.store(blob);
    const audioUrl = await ctx.storage.getUrl(storageId);

    if (!audioUrl) {
      throw new Error("Failed to get storage URL");
    }

    await ctx.runMutation(anyApi.ai.saveTtsCache, {
      text: args.text,
      voiceId: resolvedVoiceId,
      audioUrl,
    });

    return { audioUrl };
  },
});
```

- [ ] **Step 2: Create `convex/stt.ts`**

```typescript
"use node";

import { v } from "convex/values";

import { action } from "./_generated/server";

export const transcribeSpeech = action({
  args: {
    audioBase64: v.string(),
  },
  handler: async (_ctx, args): Promise<{ transcript: string }> => {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const audioBuffer = Buffer.from(args.audioBase64, "base64");
    const blob = new Blob([audioBuffer], { type: "audio/webm" });

    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model_id", "scribe_v2");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs STT error: ${response.status}`);
    }

    const data = (await response.json()) as { text: string; language_code?: string };
    return { transcript: data.text };
  },
});
```

- [ ] **Step 3: Run `npx convex dev --once` to verify both deploy**

Expected: Both functions register

- [ ] **Step 4: Commit**

```bash
git add convex/aiActions.ts convex/stt.ts
git commit -m "feat: upgrade TTS to flash_v2_5, add voice mapping, add ElevenLabs STT"
```

---

### Task 5: Add pre-built therapy components to WebContainer template

**Files:**
- Modify: `src/features/builder/hooks/webcontainer-files.ts`

This is the largest task. We add real implementations for all 8 primitive components and 4 composed components to the WebContainer template's file tree.

- [ ] **Step 1: Add `motion` to WebContainer template's `package.json` dependencies**

In `webcontainer-files.ts` line 16-22, add to the `dependencies` object:

```typescript
"motion": "^12.0.0",
```

- [ ] **Step 2: Add `useTTS` hook to the template**

Add to the `src.directory` object in `webcontainer-files.ts`, inside a `hooks` directory entry:

```typescript
"hooks": {
  directory: {
    "useTTS.ts": {
      file: {
        contents: `import { useCallback, useEffect, useRef, useState } from "react";

type TTSCache = Map<string, string>;

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const cache = useRef<TTSCache>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<Map<string, (url: string) => void>>(new Map());

  const playAudio = useCallback((url: string) => {
    setSpeaking(true);
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.onended = () => setSpeaking(false);
    audioRef.current.onerror = () => setSpeaking(false);
    audioRef.current.play().catch(() => setSpeaking(false));
  }, []);

  const speak = useCallback((text: string, audioUrl?: string) => {
    // If a pre-generated URL is provided, play it directly
    if (audioUrl) {
      cache.current.set(text, audioUrl);
      playAudio(audioUrl);
      return;
    }
    // Check local cache
    const cached = cache.current.get(text);
    if (cached) {
      playAudio(cached);
      return;
    }
    // Request from parent via postMessage bridge
    if (window.parent !== window) {
      window.parent.postMessage({ type: "tts-request", text }, "*");
    }
  }, [playAudio]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "tts-response") {
        const { text, audioUrl } = event.data;
        cache.current.set(text, audioUrl);
        playAudio(audioUrl);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [playAudio]);

  return { speak, speaking };
}
`,
      },
    },
    "useSTT.ts": {
      file: {
        contents: `import { useCallback, useEffect, useState } from "react";

export function useSTT() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);

  const startListening = useCallback(() => {
    setListening(true);
    setTranscript("");
    if (window.parent !== window) {
      window.parent.postMessage({ type: "stt-start" }, "*");
    }
  }, []);

  const stopListening = useCallback(() => {
    setListening(false);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "stt-stop" }, "*");
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "stt-result") {
        setTranscript(event.data.transcript);
        setListening(false);
      }
      if (event.data?.type === "stt-interim") {
        setTranscript(event.data.transcript);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return { transcript, listening, startListening, stopListening };
}
`,
      },
    },
```

Continue adding existing hooks (`useLocalStorage.ts`, `useSound.ts`, `useAnimation.ts`, `useDataCollection.ts`) that already exist as stubs in the template — keep them as-is.

- [ ] **Step 3: Add 8 primitive therapy components**

Add a `components` directory to `src.directory` with files for: `TapCard.tsx`, `SentenceStrip.tsx`, `BoardGrid.tsx`, `StepItem.tsx`, `PageViewer.tsx`, `TokenSlot.tsx`, `CelebrationOverlay.tsx`, `RewardPicker.tsx`.

Each component should:
- Use the therapy design tokens (CSS custom properties)
- Use `motion` for animations where appropriate
- Be fully self-contained with TypeScript types
- Follow the 60px minimum tap target rule
- Use Nunito for headings, Inter for body

(Full component code is substantial — implement each component following the spec's prop tables. Reference the existing `therapy-ui.css` classes.)

- [ ] **Step 4: Add 4 composed template components**

Add to the `components` directory: `CommunicationBoard.tsx`, `VisualSchedule.tsx`, `TokenBoard.tsx`, `SocialStory.tsx`.

Each composed component imports and wires together the primitives with the `useTTS` hook for audio playback.

- [ ] **Step 5: Update the barrel export in components/index.ts**

Update the existing `components/index.ts` (or `components.ts`) barrel file to export all new components.

- [ ] **Step 6: Verify WebContainer boots with new template**

Run the dev server (`npm run dev`), open the builder, confirm WebContainer boots and `npm install` succeeds with the added `motion` dependency.

- [ ] **Step 7: Commit**

```bash
git add src/features/builder/hooks/webcontainer-files.ts
git commit -m "feat: add real therapy components, useTTS, useSTT to WebContainer template"
```

---

### Task 6: Implement multi-turn tool loop in route.ts

**Files:**
- Modify: `src/app/api/generate/route.ts` (entire file restructured)

This is the most critical architectural change. The current single-turn handler becomes a while loop.

- [ ] **Step 1: Add new tool definitions**

After the existing `write_file` tool (line 78-97), add three more tools:

```typescript
{
  name: "generate_image",
  description: "Generate a therapy-friendly illustration. Returns a CDN URL. Use for picture cards, schedule icons, emotion faces, and any visual content.",
  input_schema: {
    type: "object" as const,
    properties: {
      label: { type: "string", description: "What to illustrate (e.g., 'happy face', 'brush teeth')" },
      category: { type: "string", enum: ["emotions", "daily-activities", "animals", "food", "objects", "people", "places"], description: "Image category for style" },
    },
    required: ["label", "category"],
  },
},
{
  name: "generate_speech",
  description: "Generate text-to-speech audio. Returns a CDN URL to an MP3. Use for communication board labels, story narration, schedule steps.",
  input_schema: {
    type: "object" as const,
    properties: {
      text: { type: "string", description: "Text to speak" },
      voice: { type: "string", enum: ["warm-female", "calm-male", "child-friendly"], description: "Voice style" },
    },
    required: ["text"],
  },
},
{
  name: "enable_speech_input",
  description: "Enable microphone input for this app. The useSTT() hook will become active.",
  input_schema: {
    type: "object" as const,
    properties: {
      purpose: { type: "string", description: "What speech input is for" },
    },
    required: ["purpose"],
  },
},
```

- [ ] **Step 2: Replace single-turn stream with multi-turn loop**

Replace lines 72-151 (the `llmStream` section) with a while loop:

```typescript
const tools = [/* all 4 tools from step 1 */];
let messages: Anthropic.MessageParam[] = [{ role: "user", content: query }];
let continueLoop = true;

while (continueLoop) {
  const llmStream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 16384,
    system: systemPrompt,
    tools,
    messages,
  });

  llmStream.on("text", (text) => {
    assistantText += text;
    send("token", { token: text });
  });

  const finalMessage = await llmStream.finalMessage();

  // Collect tool calls and results
  const toolResults: Anthropic.ToolResultBlockParam[] = [];

  for (const block of finalMessage.content) {
    if (block.type === "tool_use") {
      const input = block.input as Record<string, unknown>;

      if (block.name === "write_file") {
        // Handle write_file as before
        const path = typeof input.path === "string" ? input.path : "";
        const contents = typeof input.contents === "string" ? input.contents : "";
        if (path && contents) {
          collectedFiles.push({ path, contents });
          send("file_complete", { path, contents, version });
          send("activity", { type: "file_written", message: `Wrote ${path}`, path });
          mutationPromises.push(
            convex.mutation(api.generated_files.upsert, { sessionId, path, contents, version })
          );
          version++;
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "File written successfully" });

      } else if (block.name === "generate_image") {
        send("activity", { type: "thinking", message: `Generating image: ${input.label}...` });
        try {
          const result = await convex.action(api.image_generation.generateTherapyImage, {
            label: input.label as string,
            category: input.category as string,
          });
          send("image_generated", { label: input.label, imageUrl: result.imageUrl });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Error: ${(err as Error).message}`, is_error: true });
        }

      } else if (block.name === "generate_speech") {
        send("activity", { type: "thinking", message: `Generating audio: "${input.text}"...` });
        try {
          const result = await convex.action(api.aiActions.generateSpeech, {
            text: input.text as string,
            voice: (input.voice as string) ?? "warm-female",
          });
          send("speech_generated", { text: input.text, audioUrl: result.audioUrl });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Error: ${(err as Error).message}`, is_error: true });
        }

      } else if (block.name === "enable_speech_input") {
        // No persistence needed — the iframe only sends STT messages when useSTT() is actively used.
        // The PostMessage bridge listens unconditionally.
        send("stt_enabled", { purpose: input.purpose });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ enabled: true }) });
      }
    }
  }

  // If Claude stopped for tool_use, feed results back and continue
  if (finalMessage.stop_reason === "tool_use" && toolResults.length > 0) {
    messages = [
      ...messages,
      { role: "assistant", content: finalMessage.content },
      { role: "user", content: toolResults },
    ];
  } else {
    // end_turn or max_tokens — we're done
    continueLoop = false;
  }
}
```

- [ ] **Step 3: Add `getBySession` query to `convex/apps.ts`**

This query is needed by the publish action (Task 12). Exported as public `query` (not `internalQuery`) since the publish UI may also need to check if an app exists for the session.

```typescript
// Public query — used by both publishApp action and potential publish UI checks
export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});
```

- [ ] **Step 4: Smoke test — run builder with a simple prompt**

Start dev server, open builder, submit "Build a simple communication board with 4 cards". Verify:
- Agent calls `generate_image` multiple times
- SSE events include `image_generated`
- Agent then writes `App.tsx` with the returned URLs
- No errors in console

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate/route.ts convex/apps.ts
git commit -m "feat: multi-turn tool loop with generate_image, generate_speech, enable_speech_input"
```

---

### Task 7: Update agent system prompt

**Files:**
- Modify: `src/features/builder/lib/agent-prompt.ts`

- [ ] **Step 1: Add tool documentation section**

After the "Pre-Built Hooks" imports block (section starts line 80, ends line 87), add:

```typescript
## Tools Available

You have 4 tools:

1. **write_file** — Write/update files in the project
2. **generate_image** — Generate a therapy-friendly illustration. Returns a CDN URL. Call this for every image your app needs (picture cards, schedule icons, emotion faces).
3. **generate_speech** — Generate text-to-speech audio. Returns a CDN URL to an MP3. Call this for every word/phrase that needs to be spoken aloud.
4. **enable_speech_input** — Enable microphone input. Call this if the app needs voice commands or speech recording.

### Generation Workflow

1. First, identify all images needed and call \`generate_image\` for each
2. Then, identify all audio needed and call \`generate_speech\` for each
3. If voice input needed, call \`enable_speech_input\`
4. Finally, write your code files using the returned CDN URLs as constants

### Audio in Generated Code

For pre-generated audio, use the \`useTTS\` hook's direct URL mode:
\`\`\`tsx
import { useTTS } from "./hooks/useTTS";

const { speak } = useTTS();
// Play pre-generated audio by passing the URL
speak("hello", "https://convex.cloud/audio-url-here");
// Or request dynamic TTS (generates on the fly via parent bridge)
speak("a new sentence");
\`\`\`
```

- [ ] **Step 2: Add therapy component library section**

Update the "Pre-Built Components" section to include the new primitives (TapCard, SentenceStrip, BoardGrid, etc.) and composed components (CommunicationBoard, VisualSchedule, TokenBoard, SocialStory) with their prop signatures.

- [ ] **Step 3: Add strict design rules**

Add after the existing "Quality Standards" section:

```
## Strict Therapy Design Rules

- Tap targets: minimum 60px for child-facing elements, 44px minimum for therapist controls
- Fonts: Nunito for headings, Inter for body — NEVER decorative fonts
- Animations: cubic-bezier(0.4, 0, 0.2, 1), minimum 300ms, NEVER flash/strobe
- Celebrations: brief and calm (stars/confetti only, never loud sounds or flashing lights)
- Layout: mobile-first, must work in both portrait and landscape
- Accessibility: 4.5:1 contrast ratio minimum, clear labels on all interactive elements
- Language: Use "app" not "tool", therapy-friendly terminology, no developer jargon
- ALWAYS prefer composing pre-built components over building from scratch
```

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/lib/agent-prompt.ts
git commit -m "feat: expand agent prompt with tools, component library, design rules"
```

---

### Task 8: Add PostMessage bridge + update preview panel

**Files:**
- Create: `src/features/builder/hooks/use-postmessage-bridge.ts`
- Modify: `src/features/builder/components/preview-panel.tsx`

- [ ] **Step 1: Create the PostMessage bridge hook**

```typescript
"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../../../../convex/_generated/api";

export function usePostMessageBridge(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const generateSpeech = useAction(api.aiActions.generateSpeech);
  const transcribeSpeech = useAction(api.stt.transcribeSpeech);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      if (event.data?.type === "tts-request") {
        try {
          const result = await generateSpeech({
            text: event.data.text,
            voice: event.data.voice ?? "warm-female",
          });
          iframe.contentWindow.postMessage({
            type: "tts-response",
            text: event.data.text,
            audioUrl: result.audioUrl,
          }, "*");
        } catch (err) {
          console.error("[PostMessage Bridge] TTS error:", err);
        }
      }

      if (event.data?.type === "stt-start") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
          chunksRef.current = [];
          recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
          recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(",")[1];
              try {
                const result = await transcribeSpeech({ audioBase64: base64 });
                iframe.contentWindow?.postMessage({
                  type: "stt-result",
                  transcript: result.transcript,
                }, "*");
              } catch (err) {
                console.error("[PostMessage Bridge] STT error:", err);
              }
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach((t) => t.stop());
          };
          mediaRecorderRef.current = recorder;
          recorder.start();
        } catch (err) {
          console.error("[PostMessage Bridge] Mic access error:", err);
        }
      }

      if (event.data?.type === "stt-stop") {
        mediaRecorderRef.current?.stop();
      }
    },
    [generateSpeech, transcribeSpeech, iframeRef],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);
}
```

- [ ] **Step 2: Update preview-panel.tsx to use bridge and allow microphone**

In `preview-panel.tsx`, add `allow="microphone"` to the iframe (line 36) and wire up the bridge:

```tsx
// Add ref for iframe
const iframeRef = useRef<HTMLIFrameElement>(null);
usePostMessageBridge(iframeRef);

// Update iframe element
<iframe
  ref={iframeRef}
  src={previewUrl!}
  className="h-full w-full bg-white"
  title="App Preview"
  sandbox="allow-scripts allow-same-origin"
  allow="microphone"
/>
```

- [ ] **Step 3: Update `use-streaming.ts` to handle new SSE events**

Add cases to `handleEvent` (line 90-148) for `image_generated`, `speech_generated`, `stt_enabled`:

```typescript
case "image_generated":
  addActivity("file_written", `Generated image: ${d.label as string}`);
  break;

case "speech_generated":
  addActivity("file_written", `Generated audio: "${d.text as string}"`);
  break;

case "stt_enabled":
  addActivity("complete", "Speech input enabled");
  break;
```

Also update the `Activity` type to include these new activity types or keep using existing ones.

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/hooks/use-postmessage-bridge.ts src/features/builder/components/preview-panel.tsx src/features/builder/hooks/use-streaming.ts
git commit -m "feat: add PostMessage bridge for TTS/STT, update preview panel"
```

---

### Task 8b: Wave 1 tests

**Files:**
- Create: `convex/__tests__/image_cache.test.ts`
- Create: `convex/__tests__/image_generation.test.ts`
- Modify: `convex/__tests__/ai.test.ts` (update for new `generateSpeech` signature + removal of old `generateImage`)

- [ ] **Step 1: Create `convex/__tests__/image_cache.test.ts`**

Test `getByHash`, `save`, and `count` functions using `convex-test` mock runtime. Verify cache hit/miss behavior and that `count` returns 0 for empty table and >0 after insert.

- [ ] **Step 2: Create `convex/__tests__/image_generation.test.ts`**

Test `generateTherapyImage` action: mock `@google/genai` to return a fake image, verify cache check, storage, and cache save are called correctly. Test cache hit path returns cached URL without calling the API.

- [ ] **Step 3: Update `convex/__tests__/ai.test.ts`**

- Remove test cases for the deleted `generateImage` action
- Update `generateSpeech` tests to cover the new `voice` arg (friendly name mapping) alongside existing `voiceId` arg
- Verify backward compatibility: `voiceId` still works, `voice` maps correctly

- [ ] **Step 4: Run tests**

```bash
npx vitest run convex/__tests__/image_cache.test.ts convex/__tests__/image_generation.test.ts convex/__tests__/ai.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add convex/__tests__/image_cache.test.ts convex/__tests__/image_generation.test.ts convex/__tests__/ai.test.ts
git commit -m "test: add Wave 1 tests for image cache, image generation, updated TTS"
```

---

## Wave 2: Content & Guardrails

### Task 9: Consolidate templates to 4 high-quality entries

**Files:**
- Modify: `convex/templates/therapy_seeds.ts`

- [ ] **Step 1: Replace the 8 seed prompts with 4 high-quality templates**

Replace the contents of `THERAPY_SEED_PROMPTS` with the 4 templates from the spec (Communication Board, Visual Schedule, Token Board, Social Story) using the exact starter prompts from the spec.

- [ ] **Step 2: Re-seed the Convex database with updated templates**

Changing `therapy_seeds.ts` only updates the TypeScript constant — the `therapyTemplates` Convex table is NOT automatically updated. You must re-run the seed function:

1. Delete old template entries via Convex dashboard or a cleanup mutation
2. Run the seed: `npx convex run templates/therapy_seeds:seedTemplates` (or equivalent)
3. Verify: check the Convex dashboard `therapyTemplates` table shows exactly 4 entries

- [ ] **Step 3: Commit**

```bash
git add convex/templates/therapy_seeds.ts
git commit -m "feat: consolidate to 4 high-quality therapy templates"
```

---

### Task 10: Redesign templates page with thumbnails

**Files:**
- Modify: `src/features/templates/components/templates-page.tsx`

- [ ] **Step 1: Replace the templates page with a 2x2 grid + hover overlay**

Redesign the page to show 4 cards in a 2x2 grid (1-column on mobile). Each card has:
- Thumbnail image (or gradient placeholder if no thumbnail yet)
- Template name
- Hover overlay with description
- Click navigates to `/builder?prompt={encodedStarterPrompt}`

Remove the category filter tabs (only 4 templates now).

- [ ] **Step 2: Commit**

```bash
git add src/features/templates/components/templates-page.tsx
git commit -m "feat: redesign templates page with 2x2 grid and hover descriptions"
```

---

### Task 11: Create image pre-seeding script

**Files:**
- Create: `convex/seeds/image_seeds.ts` (NOTE: `convex/seeds/` is a new directory — the file write implicitly creates it)

- [ ] **Step 1: Create `convex/seeds/image_seeds.ts`**

An `internalAction` that generates the ~50 most common therapy images using `generateTherapyImage`. Guards with a cache count check — skips if images already exist.

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";

const SEED_IMAGES = [
  // Emotions
  { label: "happy", category: "emotions" },
  { label: "sad", category: "emotions" },
  // ... (all ~50 from spec)
];

export const seedImages = internalAction({
  args: {},
  handler: async (ctx) => {
    const count = await ctx.runQuery(internal.image_cache.count);
    if (count > 0) {
      console.log("Image cache already seeded, skipping");
      return;
    }

    for (const { label, category } of SEED_IMAGES) {
      try {
        await ctx.runAction(api.image_generation.generateTherapyImage, { label, category });
        console.log(`Seeded: ${label} (${category})`);
      } catch (err) {
        console.error(`Failed to seed ${label}:`, err);
      }
    }
  },
});
```

- [ ] **Step 2: Run `npx convex dev --once` to verify**

Expected: `seeds.image_seeds.seedImages` internalAction registers without errors

- [ ] **Step 3: Commit**

```bash
git add convex/seeds/image_seeds.ts
git commit -m "feat: add image cache pre-seeding script"
```

---

### Task 11b: Wave 2 tests

**Files:**
- Modify: `src/features/templates/components/__tests__/templates-page.test.tsx`

- [ ] **Step 1: Update templates page tests**

Update existing tests to reflect the new 2x2 grid layout with 4 templates. Remove assertions about category filter tabs. Add assertions for:
- 4 template cards rendered
- Hover overlay shows description
- Click navigates to `/builder?prompt={encodedStarterPrompt}`

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/features/templates/components/__tests__/templates-page.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/templates/components/__tests__/templates-page.test.tsx
git commit -m "test: update templates page tests for 2x2 grid redesign"
```

---

## Wave 3: Publish

### Task 12: Create `publishApp` Convex action

**Files:**
- Create: `convex/publish.ts`

- [ ] **Step 1: Create `convex/publish.ts`**

```typescript
"use node";

import { v } from "convex/values";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { getPublishableTemplateFiles } from "../src/features/builder/lib/template-files";

export const publishApp = action({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ deploymentUrl: string }> => {
    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken || !projectId) {
      throw new Error("Vercel deployment not configured (VERCEL_TOKEN, VERCEL_PROJECT_ID)");
    }

    // Fetch all generated files for this session
    const files = await ctx.runQuery(api.generated_files.list, {
      sessionId: args.sessionId,
    });

    if (files.length === 0) {
      throw new Error("No files to publish");
    }

    // Build the Vercel file array
    // Include template files (package.json, vite.config, etc.) + generated files
    const vercelFiles = buildVercelFiles(files);

    // Deploy to Vercel
    const deployUrl = `https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ""}`;
    const response = await fetch(deployUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "bridges-tool",
        project: projectId,
        files: vercelFiles,
        projectSettings: {
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel deploy failed: ${response.status} ${error}`);
    }

    const deployment = (await response.json()) as { url: string; id: string };
    const deploymentUrl = `https://${deployment.url}`;

    // Update the apps table
    const existingApp = await ctx.runQuery(api.apps.getBySession, { sessionId: args.sessionId });
    if (existingApp) {
      await ctx.runMutation(api.apps.update, {
        appId: existingApp._id,
        publishedUrl: deploymentUrl,
      });
    }

    return { deploymentUrl };
  },
});

// IMPORTANT: This function must include ALL template files — not just config.
// The agent only writes App.tsx and custom files. All infrastructure
// (main.tsx, therapy components, hooks, CSS) comes from the WebContainer template.
//
// To avoid duplicating the file tree, extract the template contents into a shared
// constant (e.g., `src/features/builder/lib/template-files.ts`) that both
// webcontainer-files.ts and this publish action can import.
// NOTE: The import for getPublishableTemplateFiles is at the top of the file.

function buildVercelFiles(
  generatedFiles: Array<{ path: string; contents: string }>
): Array<{ file: string; data: string }> {
  // Template files — includes ALL files needed to build:
  // package.json, index.html, vite.config.ts, tsconfig.json,
  // src/main.tsx, src/therapy-ui.css, src/lib/utils.ts,
  // src/components/*.tsx (all 12 therapy components),
  // src/hooks/*.ts (useTTS, useSTT, useLocalStorage, useSound, etc.)
  const templateFiles = getPublishableTemplateFiles();

  // Generated source files (App.tsx, custom components, data files)
  // These OVERRIDE any template files with the same path
  const sourceFiles = generatedFiles.map((f) => ({
    file: f.path,
    data: f.contents,
  }));

  // Merge: template files first, generated files override matching paths
  const fileMap = new Map<string, string>();
  for (const f of templateFiles) {
    fileMap.set(f.file, f.data);
  }
  for (const f of sourceFiles) {
    fileMap.set(f.file, f.data);
  }

  return Array.from(fileMap.entries()).map(([file, data]) => ({ file, data }));
}
```

- [ ] **Step 2: Create shared `template-files.ts` for publish**

Create `src/features/builder/lib/template-files.ts` that exports a `getPublishableTemplateFiles()` function. This function returns all WebContainer template files as a flat array of `{ file: string; data: string }` objects — the same content that's in `webcontainer-files.ts` but in a format suitable for the Vercel Deploy API.

Also refactor `webcontainer-files.ts` to import from this shared file instead of duplicating the template content.

Note: Uses existing `api.generated_files.list` query (already accepts `sessionId` arg). The `apps.getBySession` query was added in Task 6, Step 3.

- [ ] **Step 3: Run `npx convex dev --once` to verify**

- [ ] **Step 4: Commit**

```bash
git add convex/publish.ts src/features/builder/lib/template-files.ts
git commit -m "feat: add publishApp action with Vercel Deploy API"
```

---

### Task 13: Wire publish button to the publish action

**Files:**
- Modify: `src/features/builder/components/publish-success-modal.tsx`
- Identify the publish button trigger (likely in builder-toolbar or builder-page)

- [ ] **Step 1: Create a publish flow component/hook**

Create a hook or modify the builder page to:
1. Open a "Publish" dialog (name + description fields + Publish CTA)
2. On confirm, call `publishApp` action via `useAction`
3. Show loading state during deploy
4. On success, open the existing `PublishSuccessModal` with the real `deploymentUrl`

- [ ] **Step 2: Update PublishSuccessModal to use real URL**

The modal already accepts `publishedUrl` prop — ensure it receives the real Vercel deployment URL from the publish flow.

- [ ] **Step 3: Smoke test publish flow**

Build an app in the builder, click Publish, verify:
- Deploy dialog appears
- Loading state shown during Vercel deploy
- Success modal shows real Vercel URL
- URL opens and shows the published app

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/
git commit -m "feat: wire publish button to Vercel deploy pipeline"
```

---

### Task 14: Update shared tool page for published URLs

**Files:**
- Modify: `src/features/shared-tool/components/shared-tool-page.tsx`

- [ ] **Step 1: No code change needed**

The `SharedToolPage` already uses `app.publishedUrl ?? app.previewUrl` (line 47). Once `publishedUrl` is populated by the publish action, the page will automatically show the Vercel deployment in the iframe. Verify this works.

- [ ] **Step 2: Verify the shared tool page renders a published app**

After publishing an app, navigate to `/tool/{shareSlug}` and confirm the iframe loads the Vercel URL.

- [ ] **Step 3: Commit (if changes needed)**

---

### Task 14b: Wave 3 tests

**Files:**
- Create: `convex/__tests__/publish.test.ts`

- [ ] **Step 1: Create `convex/__tests__/publish.test.ts`**

Test `publishApp` action using `convex-test` mock runtime:
- Mock `fetch` to simulate Vercel Deploy API response
- Verify it fetches files via `api.generated_files.list`
- Verify it calls Vercel API with correct file structure
- Verify it updates the `apps` table with `publishedUrl`
- Test error cases: missing env vars, no files, Vercel API error

- [ ] **Step 2: Run tests**

```bash
npx vitest run convex/__tests__/publish.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add convex/__tests__/publish.test.ts
git commit -m "test: add publish action tests"
```

---

### Task 15: Final integration test

**Files:** None new — verification only

- [ ] **Step 1: Test the full happy path**

1. Open builder
2. Click "Communication Board" template → auto-submits prompt
3. Watch agent call `generate_image` × 9 and `generate_speech` × 9
4. Watch agent write `App.tsx` using pre-built `CommunicationBoard` component with URLs
5. Preview shows working communication board with tap-to-speak
6. Click Publish → deploys to Vercel → success modal with real URL
7. Visit published URL → standalone app works

- [ ] **Step 2: Test each template**

Repeat step 1 for Visual Schedule, Token Board, and Social Story templates.

- [ ] **Step 3: Test dynamic TTS in preview**

In the communication board preview, compose a sentence in the sentence strip and tap play. Verify:
- PostMessage bridge sends TTS request to parent
- Parent calls Convex → ElevenLabs
- Audio plays in the iframe

- [ ] **Step 4: Commit any fixes**

```bash
git commit -m "fix: integration test fixes for builder agent enhancement"
```

---

## Verification Fixes Applied

| Issue ID | Fix Type | What Changed |
| -------- | --------------- | ------------------------------------------------ |
| P1 | Line reference | `line 17-22` → `line 16-22` in Task 5 Step 1 (webcontainer-files.ts deps) |
| A1 | Missing step | Added Task 3 Step 1 to DELETE old `generateImage` from `aiActions.ts:72-124` + update `ai.test.ts`; updated commit to include both files |
| A2 | API name fix | `api.generated_files.listBySession` → `api.generated_files.list` in Task 12; removed Task 12 Step 3 (duplicate function creation) |
| A3 | API mismatch | Replaced `generateImages()` + `imagen-3.0-generate-002` with `generateContent()` + `gemini-3-pro-image-preview` in Task 3; updated model name in cache save; updated spec file |
| W1 | Dead code removal | Removed `sttEnabled` field from schema (Task 1 Step 2), removed `setSttEnabled` mutation (Task 6 Step 3), removed `convex.mutation(api.sessions.setSttEnabled)` call from route.ts tool handler |
| D1 | Missing directory note | Added note in Task 11 that `convex/seeds/` is a new directory; added `npx convex dev --once` verification step |
| L1 | Missing tests | Added Task 8b (Wave 1 tests: image_cache, image_generation, ai.test.ts update), Task 11b (Wave 2 tests: templates-page), Task 14b (Wave 3 tests: publish) |
| L2 | Comment added | Added comment on `generateTherapyImage` explaining why it's public `action` (ConvexHttpClient requires `api.*`) |
| L3 | Comment added | Added comment on `getBySession` explaining dual-use potential as public `query` |

### Re-verification Fixes (Round 2)

| Issue ID | Fix Type | What Changed |
| -------- | --------------- | ------------------------------------------------ |
| A4 | Voice ID update | Updated VOICE_MAP: Rachel→Janet (ID unchanged, name updated), Bella→`hpp4J3VqNfWAUOO0d1Us` (corrected ID); added note about ElevenLabs ID reassignment |
| A5 | Import placement | Moved `import { getPublishableTemplateFiles }` from after the action export to the top of `publish.ts` with other imports |
| W2 | Missing re-seed | Added Task 9 Step 2: re-run seed function after updating `therapy_seeds.ts` to populate the Convex DB |
| L4 | API note | Added comment on `responseModalities` — may not be needed for `gemini-3-pro-image-preview`; test empirically |
| L5 | Model upgrade | Changed STT model from `scribe_v1` to `scribe_v2` (newer, better accuracy) |
| P1 | Line reference | Updated Task 7 line reference to "section starts line 80, ends line 87" |

### Empirical Verification (Round 3, 2026-03-25)

All APIs tested with real credentials. Results:

| Test | Result | Plan Change |
| ---- | ------ | ----------- |
| Google GenAI without `responseModalities` | Image generated (546KB JPEG) | Removed `responseModalities` from config — optional |
| Google GenAI with `responseModalities` | Image generated (578KB JPEG) | Kept as comment only |
| ElevenLabs Janet (warm-female) | HTTP 200, 31KB MP3, sounds warm/professional | Confirmed — removed hedging |
| ElevenLabs Adam (calm-male) | HTTP 200, 28KB MP3, sounds clear | Confirmed |
| ElevenLabs Bella (child-friendly) | HTTP 200, 32KB MP3, sounds bright/warm | Confirmed |
| ElevenLabs STT scribe_v2 | HTTP 200, correct transcript + language_code | Confirmed |
