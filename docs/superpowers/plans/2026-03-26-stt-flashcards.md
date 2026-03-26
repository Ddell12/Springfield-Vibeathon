# STT Voice Input + Flashcard Creator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add speech-to-text mic input to chat panels and build a new flashcard creator page where an AI agent generates image+word therapy flashcards organized into swipeable decks.

**Architecture:** Two features sharing the existing SSE streaming backbone. Feature 1 (STT) adds a `useMediaRecorder` hook + `<VoiceInput>` component that sends audio to the existing `convex/stt.ts` action. Feature 2 (Flashcards) creates a new `/flashcards` route with its own feature slice, Convex tables, agent tools, and a deck/card browsing UI. The `/api/generate` route gains a `mode` param to switch between builder and flashcard agent prompts/tools.

**Tech Stack:** Next.js 16 App Router, Convex, Anthropic SDK (`betaZodTool`), ElevenLabs STT (`scribe_v2`), Google GenAI image gen, browser `MediaRecorder` API, CSS scroll-snap, Stitch MCP for page design.

**Spec:** `docs/superpowers/specs/2026-03-26-stt-flashcards-design.md`

---

## Task 1: Convex Schema — Add Flashcard Tables + Session Type

**Files:**
- Modify: `convex/schema.ts:4-107` (add tables + session type field)

- [ ] **Step 1: Add `type` field to sessions table**

In `convex/schema.ts`, add `type` field to the `sessions` table definition after `publishedUrl` (line 18):

```typescript
type: v.optional(v.union(v.literal("builder"), v.literal("flashcards"))),
```

- [ ] **Step 2: Add `flashcardDecks` table**

After the `therapyTemplates` table (line 106), before the closing `});`, add:

```typescript
flashcardDecks: defineTable({
  userId: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  sessionId: v.id("sessions"),
  cardCount: v.number(),
  coverImageUrl: v.optional(v.string()),
}).index("by_user", ["userId"])
  .index("by_session", ["sessionId"]),
```

- [ ] **Step 3: Add `flashcards` table**

Immediately after `flashcardDecks`:

```typescript
flashcards: defineTable({
  deckId: v.id("flashcardDecks"),
  label: v.string(),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  audioUrl: v.optional(v.string()),
  sortOrder: v.number(),
  category: v.optional(v.string()),
}).index("by_deck", ["deckId"])
  .index("by_deck_sortOrder", ["deckId", "sortOrder"]),
```

- [ ] **Step 4: Verify Convex deploy succeeds**

Run: `npx convex dev --once`
Expected: Schema deployed without errors. Two new tables visible.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add flashcardDecks + flashcards tables and session type field"
```

---

## Task 2: Convex Functions — Flashcard Deck + Card CRUD

**Files:**
- Create: `convex/flashcard_decks.ts`
- Create: `convex/flashcard_cards.ts`

- [ ] **Step 1: Create `convex/flashcard_decks.ts`**

```typescript
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    sessionId: v.id("sessions"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("flashcardDecks", {
      title: args.title,
      description: args.description,
      sessionId: args.sessionId,
      userId: args.userId,
      cardCount: 0,
    });
  },
});

export const get = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deckId);
  },
});

export const list = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query("flashcardDecks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(50);
    }
    // No auth yet — return all decks
    return await ctx.db.query("flashcardDecks").order("desc").take(50);
  },
});

export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcardDecks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const update = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    cardCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { deckId, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.coverImageUrl !== undefined) updates.coverImageUrl = fields.coverImageUrl;
    if (fields.cardCount !== undefined) updates.cardCount = fields.cardCount;
    await ctx.db.patch(deckId, updates);
  },
});
```

- [ ] **Step 2: Create `convex/flashcard_cards.ts`**

```typescript
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    label: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    sortOrder: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cardId = await ctx.db.insert("flashcards", {
      deckId: args.deckId,
      label: args.label,
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      audioUrl: args.audioUrl,
      sortOrder: args.sortOrder,
      category: args.category,
    });

    // Update deck card count
    const deck = await ctx.db.get(args.deckId);
    if (deck) {
      await ctx.db.patch(args.deckId, {
        cardCount: deck.cardCount + 1,
        // Set cover image from first card
        ...(deck.cardCount === 0 && args.imageUrl
          ? { coverImageUrl: args.imageUrl }
          : {}),
      });
    }

    return cardId;
  },
});

export const listByDeck = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcards")
      .withIndex("by_deck_sortOrder", (q) => q.eq("deckId", args.deckId))
      .collect();
  },
});

export const deleteByDeck = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();

    const toDelete = args.labels
      ? cards.filter((c) => args.labels!.includes(c.label))
      : cards;

    for (const card of toDelete) {
      await ctx.db.delete(card._id);
    }

    // Update deck count
    const deck = await ctx.db.get(args.deckId);
    if (deck) {
      await ctx.db.patch(args.deckId, {
        cardCount: Math.max(0, deck.cardCount - toDelete.length),
      });
    }

    return { deleted: toDelete.length };
  },
});
```

- [ ] **Step 3: Verify Convex deploy**

Run: `npx convex dev --once`
Expected: New functions registered without errors.

- [ ] **Step 4: Commit**

```bash
git add convex/flashcard_decks.ts convex/flashcard_cards.ts
git commit -m "feat: add flashcard deck and card CRUD functions"
```

---

## Task 3: useMediaRecorder Hook

**Files:**
- Create: `src/shared/hooks/use-media-recorder.ts`
- Test: `src/shared/hooks/__tests__/use-media-recorder.test.ts`

- [ ] **Step 1: Write the test**

Create `src/shared/hooks/__tests__/use-media-recorder.test.ts`:

```typescript
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMediaRecorder } from "../use-media-recorder";

// Mock navigator.mediaDevices
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((e: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  state: "inactive" as string,
};

vi.stubGlobal("MediaRecorder", vi.fn(() => mockMediaRecorder));

const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

describe("useMediaRecorder", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useMediaRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
  });

  it("requests mic permission and starts recording", async () => {
    const { result } = renderHook(() => useMediaRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.isRecording).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/hooks/__tests__/use-media-recorder.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `src/shared/hooks/use-media-recorder.ts`:

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UseMediaRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioBase64: string | null;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsProcessing(true);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
        );
        setAudioBase64(base64);
        setIsProcessing(false);

        // Clean up stream tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          toast.error("Microphone access denied. Please allow mic access in your browser settings.");
        } else if (error.name === "NotFoundError") {
          toast.error("No microphone found. Please connect a microphone and try again.");
        } else {
          toast.error("Could not access microphone.");
        }
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return { isRecording, isProcessing, startRecording, stopRecording, audioBase64 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/hooks/__tests__/use-media-recorder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/hooks/use-media-recorder.ts src/shared/hooks/__tests__/use-media-recorder.test.ts
git commit -m "feat: add useMediaRecorder hook for browser audio capture"
```

---

## Task 4: VoiceInput Component

**Files:**
- Create: `src/shared/components/voice-input.tsx`

- [ ] **Step 1: Create the VoiceInput component**

Create `src/shared/components/voice-input.tsx`:

```tsx
"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { useMediaRecorder } from "@/shared/hooks/use-media-recorder";

import { api } from "../../../convex/_generated/api";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const { isRecording, isProcessing, startRecording, stopRecording, audioBase64 } =
    useMediaRecorder();
  const transcribe = useAction(api.stt.transcribeSpeech);
  const isTranscribingRef = useRef(false);

  // When audio is captured, send to STT
  useEffect(() => {
    if (!audioBase64 || isTranscribingRef.current) return;
    isTranscribingRef.current = true;

    transcribe({ audioBase64 })
      .then((result) => {
        if (result.transcript.trim()) {
          onTranscript(result.transcript.trim());
        }
      })
      .catch(() => {
        // Toast already shown by hook if needed
      })
      .finally(() => {
        isTranscribingRef.current = false;
      });
  }, [audioBase64, transcribe, onTranscript]);

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const isLoading = isProcessing || isTranscribingRef.current;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={isRecording ? "text-error animate-pulse" : "text-on-surface-variant/60"}
      aria-label={isRecording ? "Stop recording" : "Start voice input"}
    >
      {isLoading ? (
        <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
      ) : (
        <MaterialIcon icon={isRecording ? "stop_circle" : "mic"} size="xs" />
      )}
    </Button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/voice-input.tsx
git commit -m "feat: add VoiceInput component with STT transcription"
```

---

## Task 5: Integrate VoiceInput into Builder ChatPanel

**Files:**
- Modify: `src/features/builder/components/chat-panel.tsx:232-262`

- [ ] **Step 1: Add VoiceInput import and integrate into input area**

In `chat-panel.tsx`, add the import at the top (after existing imports):

```typescript
import { VoiceInput } from "@/shared/components/voice-input";
```

Then modify the input area (lines 232-262). Replace the current `<div className="flex gap-2">` block with:

```tsx
<div className="flex items-center gap-2">
  <VoiceInput
    onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
    disabled={isGenerating}
  />
  <div className="relative flex-1">
    <MaterialIcon icon="chat" size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
    <Input
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder={
        isLive
          ? "Request changes to your app\u2026"
          : "Describe the therapy tool you want to build\u2026"
      }
      disabled={isGenerating}
      className="pl-10"
      aria-label={isLive ? "Request changes to your app" : "Describe the therapy tool you want to build"}
    />
  </div>
  <Button
    type="submit"
    disabled={!input.trim() || isGenerating}
    size="icon"
    className="shrink-0"
    aria-label={isGenerating ? "Generating" : isLive ? "Send message" : "Generate app"}
  >
    {isGenerating ? (
      <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
    ) : isLive ? (
      <MaterialIcon icon="send" size="xs" />
    ) : (
      <MaterialIcon icon="auto_fix_high" size="xs" />
    )}
  </Button>
</div>
```

- [ ] **Step 2: Manually test the mic button in the builder**

Run: `pnpm dev`
Navigate to `/builder`. Verify mic icon appears left of the input. Click it, speak, verify transcript fills the input. Check browser console for errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/components/chat-panel.tsx
git commit -m "feat: integrate VoiceInput mic button into builder chat panel"
```

---

## Task 6: Navigation Update + Flashcard Page Route

**Files:**
- Modify: `src/shared/lib/navigation.ts:1-6`
- Modify: `src/shared/lib/__tests__/navigation.test.ts:4-5`
- Create: `src/app/(app)/flashcards/page.tsx`

- [ ] **Step 1: Add Flashcards to NAV_ITEMS**

In `src/shared/lib/navigation.ts`, add the new item after `My Apps` (line 5):

```typescript
export const NAV_ITEMS = [
  { icon: "home", label: "Home", href: "/dashboard" },
  { icon: "auto_awesome", label: "Builder", href: "/builder" },
  { icon: "collections_bookmark", label: "Flashcards", href: "/flashcards" },
  { icon: "grid_view", label: "Templates", href: "/dashboard?tab=templates" },
  { icon: "folder_open", label: "My Apps", href: "/dashboard?tab=my-projects" },
] as const;
```

Also add a flashcards branch to `isNavActive` (after the builder branch, around line 18):

```typescript
if (href === "/flashcards") {
  return pathname.startsWith("/flashcards");
}
```

- [ ] **Step 2: Update navigation test**

In `src/shared/lib/__tests__/navigation.test.ts`, change line 4-5:

```typescript
it("exports an array with 5 items", () => {
  expect(NAV_ITEMS).toHaveLength(5);
  expect(NAV_ITEMS[0].href).toBe("/dashboard");
  expect(NAV_ITEMS[1].href).toBe("/builder");
  expect(NAV_ITEMS[2].href).toBe("/flashcards");
});
```

Add a flashcards test to the `isNavActive` describe block:

```typescript
describe("flashcards branch (/flashcards)", () => {
  it("returns true for exact /flashcards path", () => {
    expect(isNavActive("/flashcards", "/flashcards", null)).toBe(true);
  });

  it("returns false when pathname is not /flashcards", () => {
    expect(isNavActive("/flashcards", "/builder", null)).toBe(false);
  });
});
```

- [ ] **Step 3: Run navigation tests**

Run: `npx vitest run src/shared/lib/__tests__/navigation.test.ts`
Expected: PASS — all existing + new tests green.

- [ ] **Step 4: Create flashcard page route**

Create `src/app/(app)/flashcards/page.tsx`:

```tsx
"use client";

import { ErrorBoundary } from "react-error-boundary";

import { FlashcardPage } from "@/features/flashcards/components/flashcard-page";
import { Button } from "@/shared/components/ui/button";

function FlashcardErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface text-on-surface">
      <p className="text-lg font-semibold">Something went wrong</p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary FallbackComponent={FlashcardErrorFallback}>
      <FlashcardPage />
    </ErrorBoundary>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/navigation.ts src/shared/lib/__tests__/navigation.test.ts src/app/\(app\)/flashcards/page.tsx
git commit -m "feat: add flashcards navigation item and page route"
```

---

## Task 7: GenerateInputSchema Mode + Flashcard Agent Tools

**Files:**
- Modify: `src/features/builder/lib/schemas/generate.ts`
- Create: `src/features/flashcards/lib/flashcard-tools.ts`
- Create: `src/features/flashcards/lib/flashcard-prompt.ts`

- [ ] **Step 1: Add `mode` to GenerateInputSchema**

In `src/features/builder/lib/schemas/generate.ts`, update to:

```typescript
import { z } from "zod";

export const GenerateInputSchema = z.object({
  query: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  prompt: z.string().min(1).max(10_000).optional(),
  sessionId: z.string().optional(),
  mode: z.enum(["builder", "flashcards"]).default("builder"),
}).refine(
  (data) => data.query || data.prompt,
  { message: "Either query or prompt is required" }
);

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
```

- [ ] **Step 2: Create flashcard agent tools**

Create `src/features/flashcards/lib/flashcard-tools.ts`:

```typescript
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface FlashcardToolContext {
  send: (event: string, data: object) => void;
  sessionId: Id<"sessions">;
  convex: ConvexHttpClient;
}

export function createFlashcardTools(ctx: FlashcardToolContext) {
  const createDeck = betaZodTool({
    name: "create_deck",
    description:
      "Create a new flashcard deck. Call this FIRST before creating cards. Returns the deck ID needed for create_cards.",
    inputSchema: z.object({
      title: z.string().max(100).describe("Deck name, e.g., 'Farm Animals', 'Colors'"),
      description: z.string().max(500).optional().describe("Short description of the deck"),
    }),
    run: async ({ title, description }) => {
      const deckId = await ctx.convex.mutation(api.flashcard_decks.create, {
        title,
        description,
        sessionId: ctx.sessionId,
      });
      ctx.send("activity", { type: "deck_created", message: `Created deck: ${title}` });
      return `Deck created with ID: ${deckId}. Now call create_cards with this deck ID.`;
    },
  });

  const createCards = betaZodTool({
    name: "create_cards",
    description:
      "Create multiple flashcards in a deck at once. Each card gets an AI-generated therapy image and text-to-speech audio. Pass all cards in a single call for efficiency.",
    inputSchema: z.object({
      deckId: z.string().describe("The deck ID returned by create_deck"),
      cards: z.array(z.object({
        label: z.string().describe("The word or phrase for this card, e.g., 'red ball', 'happy'"),
        category: z.string().optional().describe("Category: colors, animals, emotions, daily-activities, food, objects, people, places"),
      })).min(1).max(20).describe("Array of cards to create"),
    }),
    run: async ({ deckId, cards }) => {
      ctx.send("activity", {
        type: "thinking",
        message: `Generating ${cards.length} flashcards with images and audio...`,
      });

      const results = await Promise.allSettled(
        cards.map(async (card, index) => {
          // Generate image
          let imageUrl: string | undefined;
          try {
            const imageResult = await ctx.convex.action(
              api.image_generation.generateTherapyImage,
              { label: card.label, category: card.category ?? "objects" },
            );
            imageUrl = imageResult.imageUrl;
          } catch (err) {
            console.error(`[flashcards] Image gen failed for "${card.label}":`, err);
          }

          // Generate TTS audio
          let audioUrl: string | undefined;
          try {
            const speechResult = await ctx.convex.action(api.aiActions.generateSpeech, {
              text: card.label,
              voice: "child-friendly",
            });
            audioUrl = speechResult.audioUrl;
          } catch (err) {
            console.error(`[flashcards] TTS failed for "${card.label}":`, err);
          }

          // Create card record
          await ctx.convex.mutation(api.flashcard_cards.create, {
            deckId: deckId as Id<"flashcardDecks">,
            label: card.label,
            imageUrl,
            audioUrl,
            sortOrder: index,
            category: card.category,
          });

          ctx.send("activity", {
            type: "card_created",
            message: `Created card: ${card.label}`,
          });

          return { label: card.label, imageUrl: !!imageUrl, audioUrl: !!audioUrl };
        }),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return `Created ${succeeded} cards${failed > 0 ? ` (${failed} failed)` : ""}. Cards are now visible in the deck viewer.`;
    },
  });

  const updateDeck = betaZodTool({
    name: "update_deck",
    description: "Update a deck's title or description.",
    inputSchema: z.object({
      deckId: z.string().describe("The deck ID to update"),
      title: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
    }),
    run: async ({ deckId, title, description }) => {
      await ctx.convex.mutation(api.flashcard_decks.update, {
        deckId: deckId as Id<"flashcardDecks">,
        title,
        description,
      });
      return `Deck updated successfully.`;
    },
  });

  const deleteCards = betaZodTool({
    name: "delete_cards",
    description: "Remove cards from a deck. If no labels specified, removes all cards.",
    inputSchema: z.object({
      deckId: z.string().describe("The deck ID"),
      labels: z.array(z.string()).optional().describe("Specific card labels to delete. Omit to delete all."),
    }),
    run: async ({ deckId, labels }) => {
      const result = await ctx.convex.mutation(api.flashcard_cards.deleteByDeck, {
        deckId: deckId as Id<"flashcardDecks">,
        labels,
      });
      return `Deleted ${result.deleted} card(s).`;
    },
  });

  return [createDeck, createCards, updateDeck, deleteCards];
}
```

- [ ] **Step 3: Create flashcard agent system prompt**

Create `src/features/flashcards/lib/flashcard-prompt.ts`:

```typescript
export const FLASHCARD_SYSTEM_PROMPT = `You are a speech-language therapy flashcard assistant. You help therapists, parents, and caregivers create visual flashcard decks for children learning vocabulary.

## Your Tools

1. **create_deck** — Create a named deck first. Always call this before creating cards.
2. **create_cards** — Generate multiple cards at once. Each card gets an AI-generated image and text-to-speech audio automatically. Pass ALL cards in a single call.
3. **update_deck** — Rename or update a deck's description.
4. **delete_cards** — Remove specific cards or clear a deck.

## Workflow

1. When the user describes what flashcards they want, plan the full set of cards
2. Call create_deck with a clear, descriptive name
3. Call create_cards with ALL planned cards in one batch (max 20 per call)
4. Confirm what was created and ask if they want changes

## Card Design Guidelines

- Labels should be simple, 1-3 words (e.g., "red ball", "happy", "cat")
- Use lowercase unless it's a proper noun
- Group cards by theme within a deck
- Suggest 5-10 cards per deck for manageable study sessions
- Categories help generate better images: colors, animals, emotions, daily-activities, food, objects, people, places

## Interaction Style

- Use warm, supportive language appropriate for therapy contexts
- If the request is vague, ask about: age group, specific vocabulary targets, how many cards
- Suggest related cards the user might not have thought of
- Never use developer jargon — speak in therapy/education language

## Examples

User: "Make flashcards for farm animals"
→ create_deck(title: "Farm Animals", description: "Common farm animals for vocabulary building")
→ create_cards with: cow, pig, horse, chicken, sheep, goat, duck, rooster

User: "I need emotion cards for my 3-year-old"
→ create_deck(title: "Feelings", description: "Basic emotions for early learners")
→ create_cards with: happy, sad, angry, scared, surprised, tired, silly, calm`;

export function buildFlashcardSystemPrompt(): string {
  return FLASHCARD_SYSTEM_PROMPT;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/lib/schemas/generate.ts src/features/flashcards/lib/flashcard-tools.ts src/features/flashcards/lib/flashcard-prompt.ts
git commit -m "feat: add flashcard agent tools, system prompt, and mode to GenerateInputSchema"
```

---

## Task 8: Route Handler — Flashcard Mode Branch

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Add flashcard imports**

At the top of `route.ts`, add after existing imports (around line 13):

```typescript
import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";
import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
```

- [ ] **Step 2: Extract mode from parsed data**

After line 65 (`const query = parsed.data.query ?? parsed.data.prompt!;`), add:

```typescript
const mode = parsed.data.mode;
```

- [ ] **Step 3: Branch on mode inside the stream**

After `send("activity", { type: "thinking", message: "Understanding your request..." });` (line 98), replace the current tool/prompt setup and generation pass (lines 100-132) with mode-branched logic:

```typescript
        const isFlashcardMode = mode === "flashcards";
        const systemPrompt = isFlashcardMode
          ? buildFlashcardSystemPrompt()
          : buildSystemPrompt();

        const collectedFiles = new Map<string, string>();
        let assistantText = "";

        // Only create build dir for builder mode
        if (!isFlashcardMode) {
          buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
          cpSync(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });
        }

        const tools = isFlashcardMode
          ? createFlashcardTools({ send, sessionId, convex })
          : createAgentTools({ send, sessionId, collectedFiles, convex, buildDir: buildDir! });

        const runner = anthropic.beta.messages.toolRunner({
          model: "claude-sonnet-4-6",
          max_tokens: isFlashcardMode ? 4096 : 32768,
          system: systemPrompt,
          tools,
          messages: [{ role: "user", content: query }],
          stream: true,
          max_iterations: 10,
        });

        for await (const messageStream of runner) {
          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              assistantText += event.delta.text;
              send("token", { token: event.delta.text });
            }
          }
        }
```

- [ ] **Step 4: Skip Parcel build + design review for flashcard mode**

Wrap the existing design review pass (lines 134-157) and Parcel build (lines 159-186) in a `if (!isFlashcardMode)` guard:

```typescript
        if (!isFlashcardMode) {
          // Design review pass — re-check generated files for visual polish
          if (collectedFiles.size > 0) {
            // ... existing review code ...
          }

          // Bundle with Parcel
          if (collectedFiles.size > 0) {
            // ... existing Parcel build code ...
          }
        }
```

The rest of the route (file persistence, session state updates, error handling) remains the same. For flashcard mode, `collectedFiles` will be empty so the file persistence loop is a no-op.

- [ ] **Step 5: Test manually**

Run: `pnpm dev`
Test builder mode still works (no regression). Test flashcard mode by sending a POST to `/api/generate` with `{ "query": "test", "mode": "flashcards" }` via curl or the flashcard UI (once built).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: add flashcard mode branch to generate route handler"
```

---

## Task 9: Flashcard Streaming Hook

**Files:**
- Create: `src/features/flashcards/hooks/use-flashcard-streaming.ts`

- [ ] **Step 1: Create the streaming hook**

This hook is a simplified version of `use-streaming.ts` that sends `mode: "flashcards"` and tracks deck/card creation events instead of files.

Create `src/features/flashcards/hooks/use-flashcard-streaming.ts`:

```typescript
"use client";

import { useCallback, useRef, useState } from "react";

import { parseSSEEvent } from "@/features/builder/lib/sse-events";

import type { Id } from "../../../../convex/_generated/dataModel";

export type FlashcardStreamingStatus = "idle" | "generating" | "live" | "failed";

interface UseFlashcardStreamingReturn {
  status: FlashcardStreamingStatus;
  sessionId: Id<"sessions"> | null;
  activityMessage: string;
  generate: (query: string, sessionId?: Id<"sessions">) => Promise<void>;
}

/**
 * Parse raw SSE text into event/data pairs.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 * Replicates the same logic as use-streaming.ts parseSSEEvents.
 */
function parseSSEChunks(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const chunks = text.split("\n\n");
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const lines = chunk.split("\n");
    let eventType = "";
    let dataLine = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice("event: ".length).trim();
      } else if (line.startsWith("data: ")) {
        dataLine = line.slice("data: ".length).trim();
      }
    }
    if (eventType && dataLine) {
      try {
        events.push({ event: eventType, data: JSON.parse(dataLine) });
      } catch {
        // Ignore malformed JSON
      }
    }
  }
  return events;
}

export function useFlashcardStreaming(): UseFlashcardStreamingReturn {
  const [status, setStatus] = useState<FlashcardStreamingStatus>("idle");
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (query: string, existingSessionId?: Id<"sessions">) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("generating");
      setActivityMessage("Understanding your request...");

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            mode: "flashcards",
            sessionId: existingSessionId,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Generation failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE events are delimited by \n\n — only process complete chunks
          const lastDoubleNewline = buffer.lastIndexOf("\n\n");
          if (lastDoubleNewline === -1) continue;

          const toProcess = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);

          const events = parseSSEChunks(toProcess);
          for (const { event: eventType, data } of events) {
            const typed = parseSSEEvent(eventType, data);
            if (!typed) continue;

            switch (typed.event) {
              case "session":
                setSessionId(typed.sessionId as Id<"sessions">);
                break;
              case "status":
                if (typed.status === "live") setStatus("live");
                break;
              case "activity":
                setActivityMessage(typed.message);
                break;
              case "error":
                setStatus("failed");
                setActivityMessage(typed.message);
                break;
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const events = parseSSEChunks(buffer);
          for (const { event: eventType, data } of events) {
            const typed = parseSSEEvent(eventType, data);
            if (!typed) continue;
            if (typed.event === "session") setSessionId(typed.sessionId as Id<"sessions">);
            if (typed.event === "status" && typed.status === "live") setStatus("live");
            if (typed.event === "error") {
              setStatus("failed");
              setActivityMessage(typed.message);
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus("failed");
          setActivityMessage("Something went wrong. Please try again.");
        }
      }
    },
    [],
  );

  return { status, sessionId, activityMessage, generate };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/flashcards/hooks/use-flashcard-streaming.ts
git commit -m "feat: add flashcard streaming hook for SSE generation"
```

---

## Task 10: Deck Navigation Hook

**Files:**
- Create: `src/features/flashcards/hooks/use-deck-navigation.ts`

- [ ] **Step 1: Create the navigation hook**

Create `src/features/flashcards/hooks/use-deck-navigation.ts`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

interface UseDeckNavigationReturn {
  currentIndex: number;
  totalCards: number;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function useDeckNavigation(totalCards: number): UseDeckNavigationReturn {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset when total changes (new deck loaded)
  useEffect(() => {
    setCurrentIndex(0);
  }, [totalCards]);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, totalCards - 1)));
    },
    [totalCards],
  );

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, totalCards - 1));
  }, [totalCards]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  return {
    currentIndex,
    totalCards,
    goTo,
    goNext,
    goPrev,
    isFirst: currentIndex === 0,
    isLast: currentIndex === totalCards - 1,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/flashcards/hooks/use-deck-navigation.ts
git commit -m "feat: add deck navigation hook with keyboard support"
```

---

## Task 11: Flashcard UI Components

**Files:**
- Create: `src/features/flashcards/components/flashcard-card.tsx`
- Create: `src/features/flashcards/components/flashcard-swiper.tsx`
- Create: `src/features/flashcards/components/deck-list.tsx`
- Create: `src/features/flashcards/components/deck-card.tsx`

- [ ] **Step 1: Create FlashcardCard component**

Create `src/features/flashcards/components/flashcard-card.tsx`:

```tsx
"use client";

import { useAction } from "convex/react";
import { useCallback, useRef, useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

interface FlashcardCardProps {
  label: string;
  imageUrl?: string;
  audioUrl?: string;
  index: number;
  total: number;
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23e8e8e8' width='300' height='300'/%3E%3Ctext x='150' y='160' text-anchor='middle' fill='%23999' font-size='16'%3EGenerating...%3C/text%3E%3C/svg%3E";

export function FlashcardCard({ label, imageUrl, audioUrl, index, total }: FlashcardCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(() => {
    if (!audioUrl || isPlaying) return;
    setIsPlaying(true);

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play().catch(() => setIsPlaying(false));
  }, [audioUrl, isPlaying]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-surface-container-lowest shadow-lg">
        {/* Image — using <img> intentionally: dynamic Convex storage URLs
            don't have a fixed domain for next/image remotePatterns */}
        <div className="aspect-square w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl ?? PLACEHOLDER_IMAGE}
            alt={label}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>

        {/* Label + Speaker */}
        <div className="flex items-center justify-between px-6 py-4">
          <span className="font-manrope text-2xl font-semibold text-on-surface">
            {label}
          </span>
          {audioUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={playAudio}
              disabled={isPlaying}
              className="shrink-0 text-primary"
              aria-label={`Listen to "${label}"`}
            >
              <MaterialIcon
                icon="volume_up"
                size="sm"
                className={isPlaying ? "animate-pulse text-primary/70" : ""}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Card counter */}
      <span className="text-sm text-on-surface-variant">
        {index + 1} of {total}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create FlashcardSwiper component**

Create `src/features/flashcards/components/flashcard-swiper.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";

import { useDeckNavigation } from "../hooks/use-deck-navigation";
import { FlashcardCard } from "./flashcard-card";

interface Card {
  _id: string;
  label: string;
  imageUrl?: string;
  audioUrl?: string;
  sortOrder: number;
}

interface FlashcardSwiperProps {
  cards: Card[];
}

export function FlashcardSwiper({ cards }: FlashcardSwiperProps) {
  const { currentIndex, goTo } = useDeckNavigation(cards.length);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync scroll position with currentIndex
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.children[currentIndex] as HTMLElement;
    target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentIndex]);

  // Detect scroll-snap settle to update currentIndex
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const scrollLeft = container.scrollLeft;
        const cardWidth = container.clientWidth;
        const newIndex = Math.round(scrollLeft / cardWidth);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < cards.length) {
          goTo(newIndex);
        }
      }, 100);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [currentIndex, cards.length, goTo]);

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Swipe container */}
      <div
        ref={scrollRef}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {cards.map((card, i) => (
          <div key={card._id} className="w-full flex-none snap-center px-4">
            <FlashcardCard
              label={card.label}
              imageUrl={card.imageUrl}
              audioUrl={card.audioUrl}
              index={i}
              total={cards.length}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-6 bg-primary"
                : "bg-on-surface-variant/30"
            }`}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create DeckCard component**

Create `src/features/flashcards/components/deck-card.tsx`:

```tsx
import { MaterialIcon } from "@/shared/components/material-icon";

interface DeckCardProps {
  title: string;
  cardCount: number;
  coverImageUrl?: string;
  isActive: boolean;
  onClick: () => void;
}

export function DeckCard({ title, cardCount, coverImageUrl, isActive, onClick }: DeckCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-on-surface hover:bg-surface-container-low"
      }`}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-container-low">
        {coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MaterialIcon icon="collections_bookmark" size="xs" className="text-on-surface-variant/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="text-xs text-on-surface-variant">{cardCount} card{cardCount !== 1 ? "s" : ""}</p>
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Create DeckList component**

Create `src/features/flashcards/components/deck-list.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DeckCard } from "./deck-card";

interface DeckListProps {
  activeDeckId: Id<"flashcardDecks"> | null;
  onSelectDeck: (deckId: Id<"flashcardDecks">) => void;
}

export function DeckList({ activeDeckId, onSelectDeck }: DeckListProps) {
  const decks = useQuery(api.flashcard_decks.list, {});

  if (!decks || decks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-on-surface-variant/60">
        <MaterialIcon icon="collections_bookmark" size="lg" />
        <p className="text-sm">No decks yet</p>
        <p className="text-xs">Create flashcards using the chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-3 pb-2 font-manrope text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60">
        Your Decks
      </h3>
      {decks.map((deck) => (
        <DeckCard
          key={deck._id}
          title={deck.title}
          cardCount={deck.cardCount}
          coverImageUrl={deck.coverImageUrl}
          isActive={deck._id === activeDeckId}
          onClick={() => onSelectDeck(deck._id)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/flashcards/components/flashcard-card.tsx src/features/flashcards/components/flashcard-swiper.tsx src/features/flashcards/components/deck-card.tsx src/features/flashcards/components/deck-list.tsx
git commit -m "feat: add flashcard card, swiper, deck list, and deck card components"
```

---

## Task 12: Flashcard Chat Panel + Preview Panel

**Files:**
- Create: `src/features/flashcards/components/flashcard-chat-panel.tsx`
- Create: `src/features/flashcards/components/flashcard-preview-panel.tsx`
- Create: `src/features/flashcards/components/suggestion-chips.tsx`

- [ ] **Step 1: Create SuggestionChips component**

Create `src/features/flashcards/components/suggestion-chips.tsx`:

```tsx
interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

const SUGGESTIONS = [
  { label: "Colors", prompt: "Make flashcards for basic colors like red, blue, green, yellow" },
  { label: "Farm Animals", prompt: "Create a farm animals flashcard deck with common animals" },
  { label: "Feelings", prompt: "Make emotion flashcards for a 3-year-old: happy, sad, angry, scared" },
  { label: "Food", prompt: "Create flashcards for common foods: apple, banana, milk, bread, cookie" },
  { label: "Body Parts", prompt: "Make flashcards for body parts: eyes, nose, mouth, hands, feet" },
];

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          onClick={() => onSelect(s.prompt)}
          className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium text-on-surface transition-colors duration-300 hover:bg-primary/10 hover:text-primary"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create FlashcardChatPanel**

Create `src/features/flashcards/components/flashcard-chat-panel.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { VoiceInput } from "@/shared/components/voice-input";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { FlashcardStreamingStatus } from "../hooks/use-flashcard-streaming";

interface FlashcardChatPanelProps {
  sessionId: Id<"sessions"> | null;
  status: FlashcardStreamingStatus;
  activityMessage: string;
  onSubmit: (query: string) => void;
}

export function FlashcardChatPanel({
  sessionId,
  status,
  activityMessage,
  onSubmit,
}: FlashcardChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const messages = useQuery(
    api.messages.list,
    sessionId ? { sessionId } : "skip",
  );
  const isGenerating = status === "generating";

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activityMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSubmit(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages?.map((msg) => (
            <div
              key={msg._id}
              className={`rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "ml-8 bg-primary/10 text-on-surface"
                  : msg.role === "system"
                    ? "text-xs text-on-surface-variant/60 italic"
                    : "mr-8 bg-surface-container-low text-on-surface"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {isGenerating && activityMessage && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
              {activityMessage}
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border/40 bg-surface-container-lowest px-4 pt-3 pb-4"
      >
        <div className="flex items-center gap-2">
          <VoiceInput
            onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
            disabled={isGenerating}
          />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the flashcards you want..."
            disabled={isGenerating}
            aria-label="Describe the flashcards you want to create"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="shrink-0"
            aria-label="Create flashcards"
          >
            {isGenerating ? (
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
            ) : (
              <MaterialIcon icon="send" size="xs" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create FlashcardPreviewPanel**

Create `src/features/flashcards/components/flashcard-preview-panel.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DeckList } from "./deck-list";
import { FlashcardSwiper } from "./flashcard-swiper";
import { SuggestionChips } from "./suggestion-chips";

interface FlashcardPreviewPanelProps {
  activeDeckId: Id<"flashcardDecks"> | null;
  onSelectDeck: (deckId: Id<"flashcardDecks">) => void;
  onSuggestionSelect: (prompt: string) => void;
  hasSession: boolean;
}

export function FlashcardPreviewPanel({
  activeDeckId,
  onSelectDeck,
  onSuggestionSelect,
  hasSession,
}: FlashcardPreviewPanelProps) {
  const cards = useQuery(
    api.flashcard_cards.listByDeck,
    activeDeckId ? { deckId: activeDeckId } : "skip",
  );

  // Empty state — no session yet
  if (!hasSession && !activeDeckId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <MaterialIcon icon="collections_bookmark" size="lg" className="text-primary" />
          </div>
          <h2 className="font-manrope text-2xl font-semibold text-on-surface">
            Flashcard Creator
          </h2>
          <p className="max-w-md text-on-surface-variant">
            Describe the flashcards you want to create and AI will generate images and audio for each card.
          </p>
        </div>
        <SuggestionChips onSelect={onSuggestionSelect} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Card viewer */}
      <div className="flex flex-1 items-center justify-center px-4">
        {cards && cards.length > 0 ? (
          <FlashcardSwiper cards={cards} />
        ) : (
          <div className="text-center text-on-surface-variant">
            <MaterialIcon icon="progress_activity" size="lg" className="animate-spin" />
            <p className="mt-2 text-sm">Creating your flashcards...</p>
          </div>
        )}
      </div>

      {/* Deck sidebar */}
      <div className="hidden w-64 border-l border-border/40 bg-surface p-4 lg:block">
        <DeckList activeDeckId={activeDeckId} onSelectDeck={onSelectDeck} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/flashcards/components/flashcard-chat-panel.tsx src/features/flashcards/components/flashcard-preview-panel.tsx src/features/flashcards/components/suggestion-chips.tsx
git commit -m "feat: add flashcard chat panel, preview panel, and suggestion chips"
```

---

## Task 13: FlashcardPage Orchestrator

**Files:**
- Create: `src/features/flashcards/components/flashcard-page.tsx`

- [ ] **Step 1: Create the main page component**

Create `src/features/flashcards/components/flashcard-page.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFlashcardStreaming, type FlashcardStreamingStatus } from "../hooks/use-flashcard-streaming";
import { FlashcardChatPanel } from "./flashcard-chat-panel";
import { FlashcardPreviewPanel } from "./flashcard-preview-panel";

export function FlashcardPage() {
  const { status, sessionId, activityMessage, generate } = useFlashcardStreaming();
  const [activeDeckId, setActiveDeckId] = useState<Id<"flashcardDecks"> | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"chat" | "cards">("cards");

  // Auto-select first deck from session when decks are created
  const sessionDecks = useQuery(
    api.flashcard_decks.listBySession,
    sessionId ? { sessionId } : "skip",
  );

  useEffect(() => {
    if (sessionDecks && sessionDecks.length > 0 && !activeDeckId) {
      setActiveDeckId(sessionDecks[0]._id);
    }
  }, [sessionDecks, activeDeckId]);

  const handleSubmit = useCallback(
    (query: string) => {
      generate(query, sessionId ?? undefined);
    },
    [generate, sessionId],
  );

  const handleSuggestionSelect = useCallback(
    (prompt: string) => {
      generate(prompt);
    },
    [generate],
  );

  // Mobile: use CSS to show/hide instead of JS detection to avoid SSR hydration mismatch.
  // The mobile layout is rendered below the desktop layout, wrapped in responsive classes.

  // Desktop layout — resizable split panels (hidden on mobile via md: prefix)
  // Mobile layout — stacked with bottom sheet (hidden on desktop)

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border/40 bg-surface-container-lowest px-4 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard" aria-label="Back to dashboard">
            <MaterialIcon icon="arrow_back" size="xs" />
          </Link>
        </Button>
        <h1 className="font-manrope text-lg font-semibold text-on-surface">
          Flashcard Creator
        </h1>
      </div>

      {/* Desktop: split panels */}
      <div className="hidden flex-1 md:flex">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <FlashcardChatPanel
              sessionId={sessionId}
              status={status}
              activityMessage={activityMessage}
              onSubmit={handleSubmit}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <FlashcardPreviewPanel
              activeDeckId={activeDeckId}
              onSelectDeck={setActiveDeckId}
              onSuggestionSelect={handleSuggestionSelect}
              hasSession={!!sessionId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: stacked layout */}
      <MobileFlashcardLayout
        sessionId={sessionId}
        status={status}
        activityMessage={activityMessage}
        activeDeckId={activeDeckId}
        onSelectDeck={setActiveDeckId}
        onSubmit={handleSubmit}
        onSuggestionSelect={handleSuggestionSelect}
      />
    </div>
  );
}

// Mobile layout — renders below desktop, hidden via CSS on md+ screens
function MobileFlashcardLayout({
  sessionId,
  status,
  activityMessage,
  activeDeckId,
  onSelectDeck,
  onSubmit,
  onSuggestionSelect,
}: {
  sessionId: Id<"sessions"> | null;
  status: FlashcardStreamingStatus;
  activityMessage: string;
  activeDeckId: Id<"flashcardDecks"> | null;
  onSelectDeck: (id: Id<"flashcardDecks">) => void;
  onSubmit: (query: string) => void;
  onSuggestionSelect: (prompt: string) => void;
}) {
  const [showChat, setShowChat] = useState(false);

  // Auto-open chat during generation
  useEffect(() => {
    if (status === "generating") setShowChat(true);
  }, [status]);

  return (
    <div className="relative flex flex-1 flex-col md:hidden">
      {/* Cards full screen */}
      <div className="flex-1">
        <FlashcardPreviewPanel
          activeDeckId={activeDeckId}
          onSelectDeck={onSelectDeck}
          onSuggestionSelect={onSuggestionSelect}
          hasSession={!!sessionId}
        />
      </div>

      {/* Floating chat toggle */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg"
          aria-label="Open chat"
        >
          <MaterialIcon icon="chat" size="sm" />
        </button>
      )}

      {/* Chat bottom sheet */}
      {showChat && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 rounded-t-2xl bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
            <span className="text-sm font-medium">Chat</span>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
              <MaterialIcon icon="close" size="xs" />
            </Button>
          </div>
          <div className="h-[calc(100%-48px)]">
            <FlashcardChatPanel
              sessionId={sessionId}
              status={status}
              activityMessage={activityMessage}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `pnpm dev`
Navigate to `/flashcards`. Verify the page loads with the empty state, suggestion chips work, and the split panel layout renders.

- [ ] **Step 3: Commit**

```bash
git add src/features/flashcards/components/flashcard-page.tsx
git commit -m "feat: add FlashcardPage orchestrator with split-panel layout"
```

---

## Task 14: Stitch Page Design Generation

**Files:**
- Uses Stitch MCP to generate/refine the flashcard page design

- [ ] **Step 1: Use Stitch MCP to generate the flashcard page screen**

Invoke Stitch `generate_screen_from_text` with a prompt describing the flashcard page layout. Apply the existing "Digital Sanctuary" design system. Reference the spec's desktop wireframe and design rules (tonal surfaces, no 1px borders, gradient CTAs, Manrope + Inter).

- [ ] **Step 2: Review generated design and apply styling adjustments to components**

Compare Stitch output with the implemented components. Update Tailwind classes in `flashcard-page.tsx`, `flashcard-card.tsx`, `flashcard-preview-panel.tsx` etc. to match the Stitch design tokens and visual hierarchy.

- [ ] **Step 3: Commit**

```bash
git add -A src/features/flashcards/
git commit -m "style: apply Stitch-generated design to flashcard page components"
```

---

## Task 15: End-to-End Manual Test + Fix

- [ ] **Step 1: Run full Vitest suite**

Run: `npx vitest run`
Expected: All existing tests still pass. Fix any regressions.

- [ ] **Step 2: Manual E2E test — Builder STT**

1. `pnpm dev`
2. Navigate to `/builder`
3. Click mic button → speak → verify transcript fills input
4. Submit the transcribed text → verify app generates normally

- [ ] **Step 3: Manual E2E test — Flashcard Creator**

1. Navigate to `/flashcards`
2. Click a suggestion chip (e.g., "Farm Animals")
3. Verify: session creates, agent calls `create_deck` then `create_cards`
4. Verify: cards appear in the swiper as they're created
5. Verify: TTS speaker icon plays audio on each card
6. Verify: arrow keys navigate between cards
7. Verify: deck appears in the sidebar deck list

- [ ] **Step 4: Fix any issues found**

Address bugs discovered during testing. Common issues to watch for:
- Convex type mismatches between tool args and mutation args
- SSE event parsing for new activity types (`deck_created`, `card_created`)
- Scroll-snap behavior on different browsers
- Audio playback on iOS Safari (may need user gesture)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: address issues from E2E testing of STT and flashcard features"
```
