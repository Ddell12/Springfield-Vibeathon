# SLP Tools Builder — Plan 2: Runtime Quality Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated therapy apps clinically trustworthy and engaging for kids. This covers Fitzgerald color coding on the AAC board, styled animated tokens, a visual countdown timer on the schedule, difficulty-wired content for the matching game, and a session mode overlay for SLPs — all with strict motion-sensitivity guards (`highContrast: true` disables every animation).

**Architecture:** All template Runtime components remain stateless with respect to session. Session state (banner, floating dot, post-session modal) lives entirely in `tool-runtime-page.tsx` via a `useSearchParams()` check for `?session=true`. The four template runtimes each gain targeted UX improvements independently. Schema changes are additive (`.optional()`) — no migration required. Tests follow the established pattern: `vi.fn()` for `onEvent`, no `voice` prop needed (cast via `shareToken` + `onEvent` pattern already used in existing tests).

**Tech Stack:** React (hooks: `useState`, `useEffect`, `useRef`, `useCallback`, `useSearchParams`), Zod (schema extension), Tailwind v4 (CSS keyframe animations via `@keyframes` in `globals.css` or `[animation:...]` arbitrary), shadcn/ui `Sheet` for the SLP slide-up panel, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-04-02-slp-tools-builder-redesign-design.md` §4

---

## File Map

**Schema changes (additive only):**
- Modify: `src/features/tools/lib/templates/aac-board/schema.ts` — add `wordCategory` to `AACButtonSchema`, `sentenceStripEnabled` to `AACBoardConfigSchema`
- Modify: `src/features/tools/lib/templates/token-board/schema.ts` — `rewardImageUrl` already present; no schema change needed
- Modify: `src/features/tools/lib/templates/matching-game/schema.ts` — add `promptImageUrl` to `MatchPairSchema`

**Runtime changes:**
- Modify: `src/features/tools/lib/templates/aac-board/runtime.tsx` — Fitzgerald colors, motor planning grid, sentence strip
- Modify: `src/features/tools/lib/templates/token-board/runtime.tsx` — styled div tokens, animated fill, celebration overlay, undo, reward image
- Modify: `src/features/tools/lib/templates/visual-schedule/runtime.tsx` — countdown timer, checkmark animation, all-done overlay
- Modify: `src/features/tools/lib/templates/matching-game/runtime.tsx` — difficulty slicing, prompt images, shake animation CSS class

**New session mode components:**
- Create: `src/features/tools/components/runtime/session-banner.tsx`
- Create: `src/features/tools/components/runtime/session-overlay.tsx`
- Modify: `src/features/tools/components/runtime/tool-runtime-page.tsx` — detect `?session=true`, render session components

**Animation globals:**
- Modify: `src/app/globals.css` — add `@keyframes` for token bounce, checkmark scale, shake, and countdown ring

**Test files:**
- Modify: `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx`
- Modify: `src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx`
- Modify: `src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx`
- Modify: `src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx`
- Create: `src/features/tools/components/runtime/__tests__/session-banner.test.tsx`
- Create: `src/features/tools/components/runtime/__tests__/session-overlay.test.tsx`

---

## Task 1: Global CSS animations

Add four `@keyframes` blocks that will be referenced by all templates. All animations are controlled by class — templates apply or skip the class based on `highContrast`.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1.1: Add keyframe animations to globals.css**

Open `src/app/globals.css`. Find the end of the `@layer base` block (or after the last `:root` / `.dark` block) and append:

```css
/* ─── Runtime animation keyframes ─────────────────────────────── */

@keyframes token-fill {
  0%   { transform: scale(1); opacity: 0.4; }
  50%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1.1); opacity: 1; }
}

@keyframes checkmark-pop {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes shake-error {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-4px); }
  40%       { transform: translateX(4px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}

@keyframes countdown-ring {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: 282; } /* 2π × r=45 ≈ 282 */
}
```

- [ ] **Step 1.2: Verify globals.css is valid**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no TypeScript errors from this change (CSS file, not TS). The command passing confirms no adjacent TS files were broken.

---

## Task 2: AAC Board — schema extension

**Files:**
- Modify: `src/features/tools/lib/templates/aac-board/schema.ts`
- Modify: `src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts`

- [ ] **Step 2.1: Write failing schema tests first**

Add to `src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts` (append to existing describe block or create new describe):

```typescript
describe("AACButtonSchema — wordCategory", () => {
  it("accepts valid wordCategory values", () => {
    const btn = {
      id: "1",
      label: "run",
      speakText: "run",
      wordCategory: "verb",
    };
    expect(() => AACButtonSchema.parse(btn)).not.toThrow();
  });

  it("rejects unknown wordCategory values", () => {
    const btn = {
      id: "1",
      label: "run",
      speakText: "run",
      wordCategory: "invalid-category",
    };
    expect(() => AACButtonSchema.parse(btn)).toThrow();
  });

  it("allows wordCategory to be absent", () => {
    const btn = { id: "1", label: "run", speakText: "run" };
    expect(() => AACButtonSchema.parse(btn)).not.toThrow();
  });
});

describe("AACBoardConfigSchema — sentenceStripEnabled", () => {
  it("defaults sentenceStripEnabled to false when absent", () => {
    const config = AACBoardConfigSchema.parse({
      title: "Test",
      gridCols: 3,
      gridRows: 2,
      buttons: [{ id: "1", label: "Yes", speakText: "Yes" }],
      showTextLabels: true,
      autoSpeak: true,
      voice: "child-friendly",
      highContrast: false,
    });
    expect(config.sentenceStripEnabled).toBe(false);
  });

  it("accepts sentenceStripEnabled: true", () => {
    const config = AACBoardConfigSchema.parse({
      title: "Test",
      gridCols: 3,
      gridRows: 2,
      buttons: [{ id: "1", label: "Yes", speakText: "Yes" }],
      showTextLabels: true,
      autoSpeak: true,
      voice: "child-friendly",
      highContrast: false,
      sentenceStripEnabled: true,
    });
    expect(config.sentenceStripEnabled).toBe(true);
  });
});
```

- [ ] **Step 2.2: Run the test — expect failure**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts 2>&1 | tail -20
```

Expected output: tests fail because `wordCategory` and `sentenceStripEnabled` do not exist yet.

- [ ] **Step 2.3: Extend the schema**

Replace the full content of `src/features/tools/lib/templates/aac-board/schema.ts`:

```typescript
import { z } from "zod";

export const WORD_CATEGORIES = [
  "verb",
  "pronoun",
  "noun",
  "descriptor",
  "social",
  "core",
] as const;

export type WordCategory = (typeof WORD_CATEGORIES)[number];

/**
 * Fitzgerald color mapping — standard AAC color system.
 * Applied by the runtime when wordCategory is set.
 * Overrides button.backgroundColor.
 */
export const FITZGERALD_COLORS: Record<WordCategory, string> = {
  verb:       "#16a34a", // green-600
  pronoun:    "#ca8a04", // yellow-600
  noun:       "#ea580c", // orange-600
  descriptor: "#2563eb", // blue-600
  social:     "#db2777", // pink-600
  core:       "#e5e7eb", // gray-200
};

export const AACButtonSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(50),
  speakText: z.string().min(1).max(200),
  imageUrl: z.string().url().optional(),
  backgroundColor: z.string().optional(),
  wordCategory: z.enum(WORD_CATEGORIES).optional(),
});

export const AACBoardConfigSchema = z.object({
  title: z.string().min(1).max(100),
  gridCols: z.number().int().min(2).max(6).default(3),
  gridRows: z.number().int().min(1).max(4).default(2),
  buttons: z.array(AACButtonSchema).min(1).max(24),
  showTextLabels: z.boolean().default(true),
  autoSpeak: z.boolean().default(true),
  voice: z.enum(["child-friendly", "warm-female", "calm-male"]).default("child-friendly"),
  highContrast: z.boolean().default(false),
  sentenceStripEnabled: z.boolean().default(false),
});

export type AACBoardConfig = z.infer<typeof AACBoardConfigSchema>;
export type AACButton = z.infer<typeof AACButtonSchema>;
```

- [ ] **Step 2.4: Run the test — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/features/tools/lib/templates/aac-board/schema.ts \
        src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts
git commit -m "feat(aac-board): add wordCategory + sentenceStripEnabled to schema"
```

---

## Task 3: AAC Board — runtime improvements

Motor planning grid, Fitzgerald colors, sentence strip.

**Files:**
- Modify: `src/features/tools/lib/templates/aac-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx`

- [ ] **Step 3.1: Write failing runtime tests first**

Append these `describe` blocks to `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx` (after the existing imports and mocks, which are already at the top of the file):

```typescript
// Additional imports needed at top of file:
// import { act } from "@testing-library/react";

const mockVoice = { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), status: "idle" as const };

describe("AACBoardRuntime — motor planning grid", () => {
  it("renders gridCols × gridRows total slots (empty slots fill gaps)", () => {
    const config: AACBoardConfig = {
      ...mockConfig,
      gridCols: 3,
      gridRows: 2,
      buttons: [
        { id: "1", label: "Yes", speakText: "Yes" },
      ],
    };
    render(<AACBoardRuntime config={config} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    // 3×2 = 6 slots total; 1 real button + 5 empty placeholder cells
    const allCells = document.querySelectorAll("[data-slot]");
    expect(allCells).toHaveLength(6);
  });

  it("empty placeholder slots are not interactive", () => {
    const config: AACBoardConfig = {
      ...mockConfig,
      gridCols: 2,
      gridRows: 1,
      buttons: [{ id: "1", label: "Yes", speakText: "Yes" }],
    };
    render(<AACBoardRuntime config={config} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    // 2×1 = 2 slots; 1 placeholder should not fire events
    mockOnEvent.mockClear();
    const placeholders = document.querySelectorAll("[data-slot-empty]");
    placeholders.forEach((el) => fireEvent.click(el));
    expect(mockOnEvent).not.toHaveBeenCalledWith("item_tapped", expect.anything());
  });
});

describe("AACBoardRuntime — Fitzgerald colors", () => {
  it("applies Fitzgerald green background when wordCategory is verb", () => {
    const config: AACBoardConfig = {
      ...mockConfig,
      buttons: [{ id: "1", label: "Run", speakText: "Run", wordCategory: "verb" }],
    };
    render(<AACBoardRuntime config={config} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    const btn = screen.getByRole("button", { name: /run/i });
    expect(btn).toHaveStyle({ backgroundColor: "#16a34a" });
  });

  it("Fitzgerald color overrides custom backgroundColor", () => {
    const config: AACBoardConfig = {
      ...mockConfig,
      buttons: [
        { id: "1", label: "Run", speakText: "Run", wordCategory: "verb", backgroundColor: "#ff0000" },
      ],
    };
    render(<AACBoardRuntime config={config} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    const btn = screen.getByRole("button", { name: /run/i });
    expect(btn).toHaveStyle({ backgroundColor: "#16a34a" });
  });

  it("uses custom backgroundColor when wordCategory is absent", () => {
    const config: AACBoardConfig = {
      ...mockConfig,
      buttons: [{ id: "1", label: "Run", speakText: "Run", backgroundColor: "#ff0000" }],
    };
    render(<AACBoardRuntime config={config} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    const btn = screen.getByRole("button", { name: /run/i });
    expect(btn).toHaveStyle({ backgroundColor: "#ff0000" });
  });
});

describe("AACBoardRuntime — sentence strip", () => {
  const stripConfig: AACBoardConfig = {
    ...mockConfig,
    sentenceStripEnabled: true,
    autoSpeak: false,
    buttons: [
      { id: "1", label: "I", speakText: "I" },
      { id: "2", label: "want", speakText: "want" },
    ],
  };

  it("shows sentence strip when sentenceStripEnabled is true", () => {
    render(<AACBoardRuntime config={stripConfig} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    expect(screen.getByTestId("sentence-strip")).toBeInTheDocument();
  });

  it("does not show sentence strip when sentenceStripEnabled is false", () => {
    render(<AACBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    expect(screen.queryByTestId("sentence-strip")).not.toBeInTheDocument();
  });

  it("appends button label to strip on tap (does not speak immediately)", () => {
    render(<AACBoardRuntime config={stripConfig} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    fireEvent.click(screen.getByRole("button", { name: /^I$/i }));
    expect(screen.getByTestId("sentence-strip-text")).toHaveTextContent("I");
  });

  it("appends multiple words to strip in order", () => {
    render(<AACBoardRuntime config={stripConfig} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    fireEvent.click(screen.getByRole("button", { name: /^I$/i }));
    fireEvent.click(screen.getByRole("button", { name: /want/i }));
    expect(screen.getByTestId("sentence-strip-text")).toHaveTextContent("I want");
  });

  it("Speak button calls voice.speak with full strip text", async () => {
    render(<AACBoardRuntime config={stripConfig} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    fireEvent.click(screen.getByRole("button", { name: /^I$/i }));
    fireEvent.click(screen.getByRole("button", { name: /want/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /speak/i }));
    });
    expect(mockVoice.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: "I want" })
    );
  });

  it("Speak button clears the strip after speaking", async () => {
    render(<AACBoardRuntime config={stripConfig} shareToken="tok" onEvent={mockOnEvent} voice={mockVoice} />);
    fireEvent.click(screen.getByRole("button", { name: /^I$/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /speak/i }));
    });
    expect(screen.getByTestId("sentence-strip-text")).toHaveTextContent("");
  });
});
```

- [ ] **Step 3.2: Run the new tests — expect failure**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx 2>&1 | tail -30
```

Expected: new tests fail (data-slot, sentence-strip, Fitzgerald style not yet implemented).

- [ ] **Step 3.3: Rewrite runtime.tsx with all improvements**

Replace the full content of `src/features/tools/lib/templates/aac-board/runtime.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen } from "../../runtime/premium-primitives";
import { FITZGERALD_COLORS } from "./schema";
import type { AACBoardConfig, AACButton } from "./schema";

/**
 * Resolve the effective background color for a button.
 * Fitzgerald category overrides custom backgroundColor.
 * Falls back to undefined (Tailwind class handles default).
 */
function resolveButtonColor(button: AACButton): string | undefined {
  if (button.wordCategory) return FITZGERALD_COLORS[button.wordCategory];
  return button.backgroundColor;
}

export function AACBoardRuntime({
  config,
  mode: _mode,
  onEvent,
  voice,
}: RuntimeProps<AACBoardConfig>) {
  const [sentenceWords, setSentenceWords] = useState<string[]>([]);

  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSlots = config.gridCols * config.gridRows;

  const handleButtonPress = useCallback(
    (button: AACButton) => {
      const payloadJson = JSON.stringify({ buttonId: button.id, label: button.label });
      onEvent("item_tapped", payloadJson);

      if (config.sentenceStripEnabled) {
        // Sentence strip mode: accumulate words, don't speak yet
        setSentenceWords((prev) => [...prev, button.speakText]);
      } else if (config.autoSpeak) {
        void voice.speak({ text: button.speakText, voice: config.voice });
      }
    },
    [config.autoSpeak, config.voice, config.sentenceStripEnabled, onEvent, voice]
  );

  const handleStripSpeak = useCallback(async () => {
    if (sentenceWords.length === 0) return;
    const fullText = sentenceWords.join(" ");
    await voice.speak({ text: fullText, voice: config.voice });
    setSentenceWords([]);
  }, [sentenceWords, voice, config.voice]);

  const handleStripClear = useCallback(() => {
    setSentenceWords([]);
  }, []);

  return (
    <div
      className={cn(
        "p-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <PremiumScreen title={config.title} className="h-full">
        {/* Sentence strip — only shown when enabled */}
        {config.sentenceStripEnabled && (
          <div
            data-testid="sentence-strip"
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-3 min-h-[56px]",
              config.highContrast
                ? "bg-gray-800 border-2 border-white"
                : "bg-surface-container border border-border"
            )}
          >
            <p
              data-testid="sentence-strip-text"
              className={cn(
                "flex-1 text-base font-medium min-h-[24px]",
                config.highContrast ? "text-white" : "text-foreground"
              )}
            >
              {sentenceWords.join(" ")}
            </p>
            <button
              onClick={handleStripClear}
              aria-label="Clear sentence"
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors duration-300",
                config.highContrast
                  ? "bg-gray-600 text-white hover:bg-gray-500"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Clear
            </button>
            <button
              onClick={() => void handleStripSpeak()}
              aria-label="Speak sentence"
              className={cn(
                "px-4 py-1.5 rounded-xl text-sm font-bold transition-colors duration-300",
                config.highContrast
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              Speak
            </button>
          </div>
        )}

        {/* Motor planning grid — padded to gridCols × gridRows with empty slots */}
        <div
          className="grid gap-3 flex-1"
          style={{ gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: totalSlots }).map((_, slotIndex) => {
            const button = config.buttons[slotIndex];

            if (!button) {
              // Empty placeholder — preserves motor planning positions
              return (
                <div
                  key={`empty-${slotIndex}`}
                  data-slot={slotIndex}
                  data-slot-empty="true"
                  aria-hidden="true"
                  className={cn(
                    "rounded-2xl min-h-[120px]",
                    config.highContrast
                      ? "border-2 border-gray-700"
                      : "border-2 border-dashed border-border/30"
                  )}
                />
              );
            }

            const bgColor = resolveButtonColor(button);

            return (
              <button
                key={button.id}
                data-slot={slotIndex}
                onClick={() => handleButtonPress(button)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl p-4",
                  "min-h-[120px] touch-manipulation select-none",
                  "transition-all duration-300 active:scale-95",
                  config.highContrast
                    ? "bg-yellow-400 text-black border-4 border-white"
                    : "bg-primary/10 hover:bg-primary/20 text-foreground border-2 border-border"
                )}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
                aria-label={button.speakText}
              >
                {button.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={button.imageUrl}
                    alt={button.label}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                )}
                {config.showTextLabels && (
                  <span
                    className={cn(
                      "text-sm font-medium text-center leading-tight",
                      // Ensure readable contrast on colored Fitzgerald backgrounds
                      button.wordCategory && !config.highContrast && "text-white drop-shadow-sm"
                    )}
                  >
                    {button.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PremiumScreen>
    </div>
  );
}
```

- [ ] **Step 3.4: Run all AAC runtime tests — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx 2>&1 | tail -20
```

Expected: all tests pass including the pre-existing ones.

- [ ] **Step 3.5: Commit**

```bash
git add src/features/tools/lib/templates/aac-board/runtime.tsx \
        src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx
git commit -m "feat(aac-board): motor planning grid, Fitzgerald colors, sentence strip"
```

---

## Task 4: Token Board — styled tokens, animated fill, celebration overlay, undo

The `rewardImageUrl` field already exists in the schema. This task focuses on the runtime.

**Files:**
- Modify: `src/features/tools/lib/templates/token-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx`

- [ ] **Step 4.1: Write failing tests first**

Append to `src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx`:

```typescript
describe("TokenBoardRuntime — styled div tokens (no emoji)", () => {
  it("renders div tokens not emoji", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    // Emoji text should not be present
    expect(screen.queryByText("⭐")).not.toBeInTheDocument();
    expect(screen.queryByText("☆")).not.toBeInTheDocument();
    // Div token elements should exist
    const tokenButtons = screen.getAllByRole("button", { name: /token/i });
    expect(tokenButtons).toHaveLength(mockConfig.tokenCount);
  });
});

describe("TokenBoardRuntime — undo", () => {
  it("shows Undo button", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("Undo button is disabled when earned === 0", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });

  it("Undo button removes last earned token", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /token/i })[0]);
    expect(screen.getByRole("button", { name: /undo/i })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    // After undo, button should be disabled again (back to 0)
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });
});

describe("TokenBoardRuntime — celebration overlay", () => {
  it("shows celebration overlay when all tokens filled (highContrast false)", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    const tokenButtons = screen.getAllByRole("button", { name: /token/i });
    tokenButtons.forEach((btn) => fireEvent.click(btn));
    expect(screen.getByTestId("celebration-overlay")).toBeInTheDocument();
  });

  it("shows ReinforcementBanner (not overlay) when highContrast is true", () => {
    mockOnEvent.mockClear();
    render(
      <TokenBoardRuntime
        config={{ ...mockConfig, highContrast: true }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    const tokenButtons = screen.getAllByRole("button", { name: /token/i });
    tokenButtons.forEach((btn) => fireEvent.click(btn));
    expect(screen.queryByTestId("celebration-overlay")).not.toBeInTheDocument();
    expect(screen.getByText("Goal reached!")).toBeInTheDocument();
  });

  it("shows reward image in celebration overlay when rewardImageUrl is set", () => {
    const configWithImage = {
      ...mockConfig,
      rewardImageUrl: "https://example.com/reward.png",
    };
    render(
      <TokenBoardRuntime config={configWithImage} shareToken="tok" onEvent={mockOnEvent} />
    );
    const tokenButtons = screen.getAllByRole("button", { name: /token/i });
    tokenButtons.forEach((btn) => fireEvent.click(btn));
    const img = screen.getByRole("img", { name: /reward/i });
    expect(img).toHaveAttribute("src", "https://example.com/reward.png");
  });
});
```

- [ ] **Step 4.2: Run the new tests — expect failure**

```bash
npx vitest run src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx 2>&1 | tail -30
```

Expected: new tests fail (emoji still present, no undo button, no celebration overlay testid).

- [ ] **Step 4.3: Rewrite token board runtime**

Replace the full content of `src/features/tools/lib/templates/token-board/runtime.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail, ReinforcementBanner } from "../../runtime/premium-primitives";
import type { TokenBoardConfig } from "./schema";

/** Styled div token — no emoji. Animated fill via CSS keyframe. */
function Token({
  shape,
  color,
  filled,
  highContrast,
  onClick,
  index,
}: {
  shape: "star" | "circle" | "heart";
  color: string;
  filled: boolean;
  highContrast: boolean;
  onClick: () => void;
  index: number;
}) {
  const shapeClass =
    shape === "circle" ? "rounded-full" :
    shape === "heart"  ? "rounded-[50%_50%_50%_50%/60%_60%_40%_40%]" :
    "clip-star rounded-md"; // star uses clip-path below

  const starClip =
    shape === "star"
      ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
      : undefined;

  return (
    <button
      onClick={onClick}
      aria-label={`Token ${index + 1}`}
      className={cn(
        "w-14 h-14 touch-manipulation select-none transition-colors duration-300",
        shapeClass,
        filled
          ? highContrast
            ? "border-4 border-white"
            : "" // color via inline style
          : highContrast
            ? "border-4 border-white bg-transparent"
            : "border-2 border-border bg-muted"
      )}
      style={{
        backgroundColor: filled ? color : undefined,
        clipPath: starClip,
        // Only apply the fill animation when not highContrast
        animation:
          filled && !highContrast
            ? "token-fill 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards"
            : undefined,
      }}
    />
  );
}

/** Full-screen celebration overlay — shown on completion unless highContrast. */
function CelebrationOverlay({
  rewardLabel,
  rewardImageUrl,
  onReset,
}: {
  rewardLabel: string;
  rewardImageUrl?: string;
  onReset: () => void;
}) {
  return (
    <div
      data-testid="celebration-overlay"
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6",
        "bg-background/95 backdrop-blur-sm",
        "animate-in fade-in duration-300"
      )}
    >
      {rewardImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={rewardImageUrl}
          alt="Reward"
          className="w-40 h-40 object-cover rounded-3xl shadow-xl"
        />
      )}
      <p className="font-headline text-4xl font-bold text-foreground text-center px-8">
        {rewardLabel}
      </p>
      <p className="text-muted-foreground text-lg">You did it!</p>
      <button
        onClick={onReset}
        className={cn(
          "mt-4 px-8 py-3 rounded-full font-semibold text-base",
          "bg-primary text-primary-foreground",
          "transition-all duration-300 hover:bg-primary/90 active:scale-95"
        )}
      >
        Start again
      </button>
    </div>
  );
}

export function TokenBoardRuntime({
  config,
  mode: _mode,
  onEvent,
  voice: _voice,
}: RuntimeProps<TokenBoardConfig>) {
  const [earned, setEarned] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTokenTap = useCallback(
    (tokenIndex: number) => {
      if (completed || tokenIndex !== earned) return;
      const newEarned = earned + 1;
      onEvent("token_added", JSON.stringify({ tokenIndex, earned: newEarned }));
      setEarned(newEarned);

      if (newEarned === config.tokenCount) {
        onEvent("activity_completed", JSON.stringify({ tokensEarned: newEarned }));
        setCompleted(true);
      }
    },
    [completed, earned, config.tokenCount, onEvent]
  );

  const handleUndo = useCallback(() => {
    if (earned === 0) return;
    setEarned((prev) => prev - 1);
    setCompleted(false);
  }, [earned]);

  const handleReset = useCallback(() => {
    setEarned(0);
    setCompleted(false);
    onEvent("app_opened");
  }, [onEvent]);

  return (
    <div
      className={cn(
        "p-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      {/* Full-screen celebration — only when not highContrast */}
      {completed && !config.highContrast && (
        <CelebrationOverlay
          rewardLabel={config.rewardLabel}
          rewardImageUrl={config.rewardImageUrl}
          onReset={handleReset}
        />
      )}

      <PremiumScreen title={config.title} className="items-center">
        <ProgressRail
          current={earned}
          total={config.tokenCount}
          label={`${earned} of ${config.tokenCount} tokens earned`}
        />

        {/* High-contrast completion uses plain ReinforcementBanner */}
        {completed && config.highContrast && (
          <ReinforcementBanner
            title="Goal reached!"
            body={config.rewardLabel}
            className="w-full max-w-sm"
          />
        )}

        {!completed && (
          <>
            <div className="flex gap-3 flex-wrap justify-center">
              {Array.from({ length: config.tokenCount }).map((_, i) => (
                <Token
                  key={i}
                  shape={config.tokenShape}
                  color={config.tokenColor}
                  filled={i < earned}
                  highContrast={config.highContrast}
                  onClick={() => handleTokenTap(i)}
                  index={i}
                />
              ))}
            </div>

            <div
              className={cn(
                "rounded-2xl p-6 text-center max-w-sm",
                config.highContrast
                  ? "bg-yellow-400 text-black"
                  : "bg-surface-container"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium uppercase tracking-wide mb-1",
                  config.highContrast ? "text-black/70" : "text-muted-foreground"
                )}
              >
                Reward
              </p>
              {config.rewardImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.rewardImageUrl}
                  alt="Reward preview"
                  className="w-20 h-20 object-cover rounded-xl mx-auto mb-2"
                />
              )}
              <p
                className={cn(
                  "text-lg font-bold",
                  config.highContrast ? "text-black" : "text-foreground"
                )}
              >
                {config.rewardLabel}
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleUndo}
            disabled={earned === 0}
            aria-label="Undo last token"
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium",
              "transition-colors duration-300",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              config.highContrast
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-surface-container text-muted-foreground hover:bg-surface-container-high"
            )}
          >
            Undo
          </button>
          <button
            onClick={handleReset}
            aria-label="Reset"
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium",
              "transition-colors duration-300",
              config.highContrast
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-surface-container text-muted-foreground hover:bg-surface-container-high"
            )}
          >
            Reset
          </button>
        </div>
      </PremiumScreen>
    </div>
  );
}
```

- [ ] **Step 4.4: Run all token board tests — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/features/tools/lib/templates/token-board/runtime.tsx \
        src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx
git commit -m "feat(token-board): styled tokens, animated fill, celebration overlay, undo, reward image"
```

---

## Task 5: Visual Schedule — countdown timer, checkmark animation, all-done overlay

**Files:**
- Modify: `src/features/tools/lib/templates/visual-schedule/runtime.tsx`
- Modify: `src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx`

- [ ] **Step 5.1: Write failing tests first**

Append to `src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx`:

```typescript
import { act } from "@testing-library/react";

describe("VisualScheduleRuntime — countdown timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows countdown ring on active item when showDuration is true and item has durationMinutes", () => {
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    // Tap the active item to start the countdown
    fireEvent.click(screen.getByText("Wake up"));
    // After tap, countdown SVG ring should appear (re-tap starts timer)
    // Re-render: first item is done, "Get dressed" is now active
    // Click active item to start countdown
    fireEvent.click(screen.getByText("Get dressed"));
    expect(screen.getByTestId("countdown-ring")).toBeInTheDocument();
  });

  it("does not show countdown ring when highContrast is true (motion sensitivity)", () => {
    render(
      <VisualScheduleRuntime
        config={{ ...mockConfig, highContrast: true }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    // Even after tap, no SVG ring in high contrast
    expect(screen.queryByTestId("countdown-ring")).not.toBeInTheDocument();
  });

  it("shows plain minute count instead of ring in highContrast mode", () => {
    render(
      <VisualScheduleRuntime
        config={{ ...mockConfig, highContrast: true }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    // "5 min" text should be visible (showDuration: true)
    expect(screen.getAllByText(/\d+ min/).length).toBeGreaterThan(0);
  });

  it("auto-advances to next step when countdown reaches zero", async () => {
    const singleMinConfig: VisualScheduleConfig = {
      ...mockConfig,
      items: [
        { id: "1", label: "Task A", durationMinutes: 1 },
        { id: "2", label: "Task B", durationMinutes: 2 },
      ],
    };
    render(
      <VisualScheduleRuntime config={singleMinConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    // Tap active item to start countdown (1 minute = 60000ms)
    fireEvent.click(screen.getByText("Task A"));
    await act(async () => {
      vi.advanceTimersByTime(60_001);
    });
    // Should have advanced to Task B (item_tapped fired for Task A auto-complete)
    const activeItem = screen.getByText("Task B").closest("[data-active]");
    expect(activeItem).toBeInTheDocument();
  });
});

describe("VisualScheduleRuntime — checkmark animation", () => {
  it("done items show checkmark with animation class (not highContrast)", () => {
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Wake up"));
    // After completing Wake up, its checkmark should appear with animation class
    const checkmark = document.querySelector("[data-checkmark-animated]");
    expect(checkmark).toBeInTheDocument();
  });

  it("done items show plain checkmark without animation in highContrast", () => {
    render(
      <VisualScheduleRuntime
        config={{ ...mockConfig, highContrast: true }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    fireEvent.click(screen.getByText("Wake up"));
    expect(document.querySelector("[data-checkmark-animated]")).not.toBeInTheDocument();
    // Plain ✓ text should still appear
    expect(screen.getByText("✓")).toBeInTheDocument();
  });
});

describe("VisualScheduleRuntime — all-done overlay", () => {
  it("shows all-done overlay (not plain ReinforcementBanner) on completion", () => {
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Wake up"));
    fireEvent.click(screen.getByText("Get dressed"));
    fireEvent.click(screen.getByText("Eat breakfast"));
    expect(screen.getByTestId("all-done-overlay")).toBeInTheDocument();
  });

  it("all-done overlay resets after 3 seconds automatically", async () => {
    vi.useFakeTimers();
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Wake up"));
    fireEvent.click(screen.getByText("Get dressed"));
    fireEvent.click(screen.getByText("Eat breakfast"));
    expect(screen.getByTestId("all-done-overlay")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(3001);
    });
    expect(screen.queryByTestId("all-done-overlay")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("'Keep showing' button prevents auto-reset", async () => {
    vi.useFakeTimers();
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Wake up"));
    fireEvent.click(screen.getByText("Get dressed"));
    fireEvent.click(screen.getByText("Eat breakfast"));
    fireEvent.click(screen.getByRole("button", { name: /keep showing/i }));
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("all-done-overlay")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 5.2: Run the new tests — expect failure**

```bash
npx vitest run src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx 2>&1 | tail -30
```

Expected: new tests fail (no countdown, no animated checkmark, no all-done overlay).

- [ ] **Step 5.3: Rewrite visual schedule runtime**

Replace the full content of `src/features/tools/lib/templates/visual-schedule/runtime.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail } from "../../runtime/premium-primitives";
import type { VisualScheduleConfig } from "./schema";

/** SVG countdown ring. Animates stroke-dashoffset over durationMinutes. */
function CountdownRing({ durationMs }: { durationMs: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      data-testid="countdown-ring"
      width="32"
      height="32"
      viewBox="0 0 100 100"
      className="flex-shrink-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        opacity="0.2"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset="0"
        strokeLinecap="round"
        style={{
          animation: `countdown-ring ${durationMs}ms linear forwards`,
        }}
      />
    </svg>
  );
}

/** All-done celebration overlay. Auto-resets after 3s unless "Keep showing" is tapped. */
function AllDoneOverlay({ onReset }: { onReset: () => void }) {
  const [pinned, setPinned] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pinned) {
      timerRef.current = setTimeout(onReset, 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pinned, onReset]);

  return (
    <div
      data-testid="all-done-overlay"
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6",
        "bg-background/95 backdrop-blur-sm",
        "animate-in fade-in duration-300"
      )}
    >
      <p className="font-headline text-5xl font-bold text-foreground">All done!</p>
      <p className="text-muted-foreground text-xl">Great work!</p>
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setPinned(true)}
          className={cn(
            "px-6 py-3 rounded-full text-sm font-medium",
            "bg-surface-container text-muted-foreground",
            "transition-colors duration-300 hover:bg-surface-container-high"
          )}
        >
          Keep showing
        </button>
        <button
          onClick={onReset}
          className={cn(
            "px-6 py-3 rounded-full font-semibold text-base",
            "bg-primary text-primary-foreground",
            "transition-all duration-300 hover:bg-primary/90 active:scale-95"
          )}
        >
          Start again
        </button>
      </div>
    </div>
  );
}

export function VisualScheduleRuntime({
  config,
  mode: _mode,
  onEvent,
  voice: _voice,
}: RuntimeProps<VisualScheduleConfig>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  // Track which items have been checked off (for checkmark animation)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  // Countdown: which item is currently counting down and its timer handle
  const [countingDownIndex, setCountingDownIndex] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, []);

  const advanceStep = useCallback(
    (index: number) => {
      const item = config.items[index];
      if (!item) return;
      const payloadJson = JSON.stringify({ itemId: item.id, label: item.label, index });
      onEvent("item_tapped", payloadJson);
      setDoneIds((prev) => new Set([...prev, item.id]));

      const nextIndex = index + 1;
      if (nextIndex >= config.items.length) {
        setCompleted(true);
        onEvent("activity_completed", JSON.stringify({ itemsCompleted: config.items.length }));
      } else {
        setCurrentIndex(nextIndex);
      }
      setCountingDownIndex(null);
    },
    [config.items, onEvent]
  );

  const handleItemTap = useCallback(
    (index: number) => {
      if (completed || index !== currentIndex) return;

      const item = config.items[index];

      // If showDuration + durationMinutes is set + not highContrast: start/restart countdown
      if (
        config.showDuration &&
        item.durationMinutes !== undefined &&
        !config.highContrast
      ) {
        // If already counting down this item, a second tap marks it done immediately
        if (countingDownIndex === index) {
          if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
          advanceStep(index);
          return;
        }
        // Start countdown
        setCountingDownIndex(index);
        if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = setTimeout(
          () => {
            advanceStep(index);
          },
          item.durationMinutes * 60 * 1000
        );
        return;
      }

      // No countdown — immediate advance
      advanceStep(index);
    },
    [
      completed,
      currentIndex,
      config.items,
      config.showDuration,
      config.highContrast,
      countingDownIndex,
      advanceStep,
    ]
  );

  const handleReset = useCallback(() => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCurrentIndex(0);
    setCompleted(false);
    setDoneIds(new Set());
    setCountingDownIndex(null);
    onEvent("app_opened");
  }, [onEvent]);

  return (
    <div
      className={cn(
        "p-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      {completed && !config.highContrast && (
        <AllDoneOverlay onReset={handleReset} />
      )}

      <PremiumScreen title={config.title}>
        <ProgressRail
          current={completed ? config.items.length : currentIndex}
          total={config.items.length}
          label={completed ? "All done!" : `Step ${currentIndex + 1} of ${config.items.length}`}
        />

        {completed && config.highContrast ? (
          <div className="flex flex-col items-center gap-4">
            <p className="font-headline text-2xl font-bold text-foreground">All done! Great work!</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-surface-container text-sm font-medium"
            >
              Start again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {config.items.map((item, index) => {
              const isDone = doneIds.has(item.id);
              const isActive = index === currentIndex && !completed;
              const isCountingDown = countingDownIndex === index;

              return (
                <button
                  key={item.id}
                  data-active={isActive ? "true" : undefined}
                  onClick={() => handleItemTap(index)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl p-4 text-left",
                    "touch-manipulation select-none transition-all duration-300",
                    isActive && "scale-[1.02]",
                    isDone
                      ? config.highContrast
                        ? "bg-gray-700 text-gray-400"
                        : "bg-muted/50 text-muted-foreground"
                      : isActive
                        ? config.highContrast
                          ? "bg-yellow-400 text-black border-4 border-white"
                          : "bg-primary text-primary-foreground shadow-lg"
                        : config.highContrast
                          ? "bg-gray-800 text-white border-2 border-gray-600"
                          : "bg-muted text-foreground"
                  )}
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.label}
                      className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold">{item.label}</p>
                    {config.showDuration && item.durationMinutes !== undefined && (
                      <p className="text-sm opacity-70">{item.durationMinutes} min</p>
                    )}
                  </div>
                  {/* Checkmark — animated when not highContrast */}
                  {config.showCheckmarks && isDone && (
                    config.highContrast ? (
                      <span className="text-2xl flex-shrink-0">✓</span>
                    ) : (
                      <span
                        data-checkmark-animated="true"
                        className="text-2xl flex-shrink-0 inline-block"
                        style={{
                          animation: "checkmark-pop 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
                        }}
                      >
                        ✓
                      </span>
                    )
                  )}
                  {/* Countdown ring — only for active item being counted down, not highContrast */}
                  {isCountingDown && !config.highContrast && item.durationMinutes && (
                    <CountdownRing durationMs={item.durationMinutes * 60 * 1000} />
                  )}
                  {isActive && !isCountingDown && (
                    <span className="text-2xl flex-shrink-0">→</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PremiumScreen>
    </div>
  );
}
```

- [ ] **Step 5.4: Run all visual schedule tests — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/features/tools/lib/templates/visual-schedule/runtime.tsx \
        src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx
git commit -m "feat(visual-schedule): countdown timer, checkmark animation, all-done overlay"
```

---

## Task 6: Matching Game — schema extension, difficulty slicing, prompt images, shake animation

**Files:**
- Modify: `src/features/tools/lib/templates/matching-game/schema.ts`
- Modify: `src/features/tools/lib/templates/matching-game/runtime.tsx`
- Modify: `src/features/tools/lib/templates/matching-game/__tests__/schema.test.ts`
- Modify: `src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx`

- [ ] **Step 6.1: Write failing schema test**

Add to `src/features/tools/lib/templates/matching-game/__tests__/schema.test.ts`:

```typescript
describe("MatchPairSchema — promptImageUrl", () => {
  it("accepts valid promptImageUrl", () => {
    const pair = {
      id: "1",
      prompt: "Dog",
      answer: "Woof",
      promptImageUrl: "https://example.com/dog.png",
    };
    expect(() => MatchPairSchema.parse(pair)).not.toThrow();
  });

  it("allows promptImageUrl to be absent", () => {
    const pair = { id: "1", prompt: "Dog", answer: "Woof" };
    expect(() => MatchPairSchema.parse(pair)).not.toThrow();
  });
});
```

- [ ] **Step 6.2: Run the schema test — expect failure**

```bash
npx vitest run src/features/tools/lib/templates/matching-game/__tests__/schema.test.ts 2>&1 | tail -10
```

Expected: fails because `promptImageUrl` does not exist in `MatchPairSchema`.

- [ ] **Step 6.3: Extend the schema**

Replace the full content of `src/features/tools/lib/templates/matching-game/schema.ts`:

```typescript
import { z } from "zod";

export const MatchPairSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1).max(100),
  answer: z.string().min(1).max(100),
  imageUrl: z.string().url().optional(),       // answer column image
  promptImageUrl: z.string().url().optional(), // prompt column image
});

export const MatchingGameConfigSchema = z.object({
  title: z.string().min(1).max(100),
  pairs: z.array(MatchPairSchema).min(2).max(8),
  showAnswerImages: z.boolean().default(false),
  celebrateCorrect: z.boolean().default(true),
  highContrast: z.boolean().default(false),
});

export type MatchingGameConfig = z.infer<typeof MatchingGameConfigSchema>;
export type MatchPair = z.infer<typeof MatchPairSchema>;
```

- [ ] **Step 6.4: Run the schema test — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/matching-game/__tests__/schema.test.ts 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 6.5: Write failing runtime tests**

Append to `src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx`:

```typescript
const sixPairConfig: MatchingGameConfig = {
  title: "Animals",
  pairs: [
    { id: "1", prompt: "Dog", answer: "Woof" },
    { id: "2", prompt: "Cat", answer: "Meow" },
    { id: "3", prompt: "Cow", answer: "Moo" },
    { id: "4", prompt: "Duck", answer: "Quack" },
    { id: "5", prompt: "Pig", answer: "Oink" },
    { id: "6", prompt: "Sheep", answer: "Baa" },
  ],
  showAnswerImages: false,
  celebrateCorrect: true,
  highContrast: false,
};

describe("MatchingGameRuntime — difficulty slicing", () => {
  it("easy difficulty shows only first 2 pairs", () => {
    render(
      <MatchingGameRuntime
        config={sixPairConfig}
        shareToken="tok"
        onEvent={mockOnEvent}
        shellDifficulty="easy"
      />
    );
    expect(screen.getByText("Dog")).toBeInTheDocument();
    expect(screen.getByText("Cat")).toBeInTheDocument();
    expect(screen.queryByText("Cow")).not.toBeInTheDocument();
  });

  it("medium difficulty shows first 4 pairs", () => {
    render(
      <MatchingGameRuntime
        config={sixPairConfig}
        shareToken="tok"
        onEvent={mockOnEvent}
        shellDifficulty="medium"
      />
    );
    expect(screen.getByText("Dog")).toBeInTheDocument();
    expect(screen.getByText("Duck")).toBeInTheDocument();
    expect(screen.queryByText("Pig")).not.toBeInTheDocument();
  });

  it("hard difficulty shows all pairs", () => {
    render(
      <MatchingGameRuntime
        config={sixPairConfig}
        shareToken="tok"
        onEvent={mockOnEvent}
        shellDifficulty="hard"
      />
    );
    expect(screen.getByText("Sheep")).toBeInTheDocument();
  });

  it("defaults to medium (shows 4) when shellDifficulty is undefined", () => {
    render(
      <MatchingGameRuntime
        config={sixPairConfig}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    expect(screen.getByText("Duck")).toBeInTheDocument();
    expect(screen.queryByText("Pig")).not.toBeInTheDocument();
  });
});

describe("MatchingGameRuntime — prompt images", () => {
  it("renders promptImageUrl in the prompt column", () => {
    const configWithPromptImages: MatchingGameConfig = {
      ...mockConfig,
      pairs: [
        { id: "1", prompt: "Dog", answer: "Woof", promptImageUrl: "https://example.com/dog.png" },
        { id: "2", prompt: "Cat", answer: "Meow" },
      ],
    };
    render(
      <MatchingGameRuntime config={configWithPromptImages} shareToken="tok" onEvent={mockOnEvent} />
    );
    const img = screen.getByAltText("Dog");
    expect(img).toHaveAttribute("src", "https://example.com/dog.png");
  });
});

describe("MatchingGameRuntime — shake animation on incorrect", () => {
  it("applies shake-error class to incorrect answer button", async () => {
    render(
      <MatchingGameRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Dog")); // select prompt
    fireEvent.click(screen.getByText("Meow")); // wrong answer
    // The Meow button should have the shake animation applied
    const meowBtn = screen.getByText("Meow").closest("button");
    expect(meowBtn).toHaveStyle({ animation: expect.stringContaining("shake-error") });
  });
});
```

Note: `shellDifficulty` is a new prop being added to `MatchingGameRuntime`. The test file imports `MatchingGameRuntime` — update the component signature.

- [ ] **Step 6.6: Run the runtime tests — expect failure**

```bash
npx vitest run src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx 2>&1 | tail -30
```

Expected: fails on `shellDifficulty` prop (unknown), no difficulty slicing, no prompt images.

- [ ] **Step 6.7: Rewrite matching game runtime**

Replace the full content of `src/features/tools/lib/templates/matching-game/runtime.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import type { DifficultyLevel } from "../../runtime/use-app-shell-state";
import { PremiumScreen, ReinforcementBanner } from "../../runtime/premium-primitives";
import type { MatchingGameConfig } from "./schema";

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Slice pairs according to difficulty level. */
function slicePairsByDifficulty<T>(pairs: T[], difficulty: DifficultyLevel): T[] {
  if (difficulty === "easy")   return pairs.slice(0, 2);
  if (difficulty === "medium") return pairs.slice(0, 4);
  return pairs; // hard = all
}

export function MatchingGameRuntime({
  config,
  mode: _mode,
  onEvent,
  voice: _voice,
  shellDifficulty,
}: RuntimeProps<MatchingGameConfig> & { shellDifficulty?: DifficultyLevel }) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [incorrectAnswerId, setIncorrectAnswerId] = useState<string | null>(null);
  const incorrectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slice pairs by difficulty (default: medium)
  const activePairs = useMemo(
    () => slicePairsByDifficulty(config.pairs, shellDifficulty ?? "medium"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.pairs.map((p) => p.id).join(","), shellDifficulty]
  );

  const shuffledAnswers = useMemo(
    () => shuffleArray(activePairs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePairs.map((p) => p.id).join(",")]
  );

  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activePairs.length === 0) return;
    const percent = Math.round((matchedPairIds.size / activePairs.length) * 100);
    onEvent("progress_updated", JSON.stringify({ percent }));
  }, [matchedPairIds, activePairs.length, onEvent]);

  useEffect(() => {
    return () => {
      if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current);
    };
  }, []);

  const handlePromptTap = useCallback(
    (pairId: string) => {
      if (matchedPairIds.has(pairId)) return;
      setSelectedPromptId(pairId);
      setIncorrectAnswerId(null);
    },
    [matchedPairIds]
  );

  const handleAnswerTap = useCallback(
    (answerId: string) => {
      if (!selectedPromptId) return;
      if (matchedPairIds.has(answerId)) return;

      const isCorrect = selectedPromptId === answerId;
      const payloadJson = JSON.stringify({ promptId: selectedPromptId, answerId });

      if (isCorrect) {
        onEvent("answer_correct", payloadJson);
        const newMatched = new Set(matchedPairIds);
        newMatched.add(answerId);
        setMatchedPairIds(newMatched);
        setSelectedPromptId(null);

        if (newMatched.size === activePairs.length) {
          onEvent("activity_completed", JSON.stringify({ pairsMatched: activePairs.length }));
        }
      } else {
        onEvent("answer_incorrect", payloadJson);
        setIncorrectAnswerId(answerId);
        if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current);
        incorrectTimeoutRef.current = setTimeout(() => {
          setIncorrectAnswerId(null);
          incorrectTimeoutRef.current = null;
        }, 800);
      }
    },
    [selectedPromptId, matchedPairIds, activePairs.length, onEvent]
  );

  const allDone = matchedPairIds.size === activePairs.length;

  return (
    <div
      className={cn(
        "p-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <PremiumScreen title={config.title}>
        {allDone ? (
          <ReinforcementBanner
            title={config.celebrateCorrect ? "Amazing! All matched!" : "Complete!"}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Prompts column */}
            <div className="flex flex-col gap-3">
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide text-center mb-1",
                  config.highContrast ? "text-gray-400" : "text-muted-foreground"
                )}
              >
                Match
              </p>
              {activePairs.map((pair) => {
                const isMatched = matchedPairIds.has(pair.id);
                const isSelected = selectedPromptId === pair.id;
                return (
                  <button
                    key={pair.id}
                    onClick={() => handlePromptTap(pair.id)}
                    className={cn(
                      "rounded-2xl p-4 text-center font-semibold text-base",
                      "min-h-[64px] touch-manipulation select-none",
                      "transition-all duration-300 active:scale-95",
                      isMatched
                        ? config.highContrast
                          ? "bg-green-700 text-white"
                          : "bg-green-100 text-green-700 border-2 border-green-300"
                        : isSelected
                          ? config.highContrast
                            ? "bg-yellow-400 text-black border-4 border-white"
                            : "bg-primary text-primary-foreground border-2 border-primary scale-105"
                          : config.highContrast
                            ? "bg-gray-800 text-white border-2 border-gray-600"
                            : "bg-muted text-foreground border-2 border-border"
                    )}
                  >
                    {pair.promptImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pair.promptImageUrl}
                        alt={pair.prompt}
                        className="w-12 h-12 object-cover rounded-lg mb-1 mx-auto"
                      />
                    )}
                    {pair.prompt}
                  </button>
                );
              })}
            </div>

            {/* Answers column */}
            <div className="flex flex-col gap-3">
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide text-center mb-1",
                  config.highContrast ? "text-gray-400" : "text-muted-foreground"
                )}
              >
                Answer
              </p>
              {shuffledAnswers.map((pair) => {
                const isMatched = matchedPairIds.has(pair.id);
                const isIncorrect = incorrectAnswerId === pair.id;
                return (
                  <button
                    key={pair.id}
                    onClick={() => handleAnswerTap(pair.id)}
                    className={cn(
                      "rounded-2xl p-4 text-center font-semibold text-base",
                      "min-h-[64px] touch-manipulation select-none",
                      "transition-all duration-300 active:scale-95",
                      isMatched
                        ? config.highContrast
                          ? "bg-green-700 text-white"
                          : "bg-green-100 text-green-700 border-2 border-green-300"
                        : isIncorrect
                          ? config.highContrast
                            ? "bg-red-600 text-white border-4 border-white"
                            : "bg-red-100 text-red-700 border-2 border-red-300"
                          : config.highContrast
                            ? "bg-gray-800 text-white border-2 border-gray-600"
                            : "bg-muted text-foreground border-2 border-border"
                    )}
                    style={
                      isIncorrect && !config.highContrast
                        ? { animation: "shake-error 300ms cubic-bezier(0.4, 0, 0.2, 1)" }
                        : undefined
                    }
                  >
                    {config.showAnswerImages && pair.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pair.imageUrl}
                        alt={pair.answer}
                        className="w-12 h-12 object-cover rounded-lg mb-1 mx-auto"
                      />
                    )}
                    {pair.answer}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PremiumScreen>
    </div>
  );
}
```

- [ ] **Step 6.8: Run all matching game tests — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx \
              src/features/tools/lib/templates/matching-game/__tests__/schema.test.ts 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6.9: Commit**

```bash
git add src/features/tools/lib/templates/matching-game/schema.ts \
        src/features/tools/lib/templates/matching-game/runtime.tsx \
        src/features/tools/lib/templates/matching-game/__tests__/schema.test.ts \
        src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx
git commit -m "feat(matching-game): difficulty slicing, prompt images, shake animation, schema extension"
```

---

## Task 7: Session mode — SessionBanner component

A thin top bar that shows `Session · [date] · [elapsed time]`. Only visible in session mode; never inside the Runtime components themselves.

**Files:**
- Create: `src/features/tools/components/runtime/session-banner.tsx`
- Create: `src/features/tools/components/runtime/__tests__/session-banner.test.tsx`

- [ ] **Step 7.1: Write failing tests first**

Create `src/features/tools/components/runtime/__tests__/session-banner.test.tsx`:

```typescript
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { SessionBanner } from "../session-banner";

describe("SessionBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin date to 2026-04-02
    vi.setSystemTime(new Date("2026-04-02T10:30:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'Session' label", () => {
    render(<SessionBanner />);
    expect(screen.getByText(/session/i)).toBeInTheDocument();
  });

  it("renders today's date", () => {
    render(<SessionBanner />);
    // Should show Apr 2 or April 2 or 4/2 — check for some date indicator
    expect(screen.getByTestId("session-date")).toBeInTheDocument();
  });

  it("shows elapsed time starting at 0:00", () => {
    render(<SessionBanner />);
    expect(screen.getByTestId("session-elapsed")).toHaveTextContent("0:00");
  });

  it("increments elapsed time every second", async () => {
    render(<SessionBanner />);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId("session-elapsed")).toHaveTextContent("0:03");
  });

  it("formats elapsed time as M:SS", async () => {
    render(<SessionBanner />);
    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });
    expect(screen.getByTestId("session-elapsed")).toHaveTextContent("1:05");
  });
});
```

- [ ] **Step 7.2: Run the test — expect failure**

```bash
npx vitest run src/features/tools/components/runtime/__tests__/session-banner.test.tsx 2>&1 | tail -15
```

Expected: module not found.

- [ ] **Step 7.3: Create SessionBanner component**

Create `src/features/tools/components/runtime/session-banner.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

import { cn } from "@/core/utils";

/** Formats seconds as M:SS */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Formats a Date as "Apr 2" */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface SessionBannerProps {
  className?: string;
}

/**
 * Thin top bar showing session context to the SLP.
 * Mounts an elapsed-time counter from mount time.
 * Stateless regarding the actual session — purely display.
 */
export function SessionBanner({ className }: SessionBannerProps) {
  const [elapsed, setElapsed] = useState(0);
  const sessionDate = new Date();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between px-4 py-2",
        "bg-primary/5 border-b border-primary/10 backdrop-blur-sm",
        "text-xs font-medium text-muted-foreground",
        className
      )}
    >
      <span className="font-semibold text-primary uppercase tracking-wide">
        Session
      </span>
      <span data-testid="session-date">
        {formatDate(sessionDate)}
      </span>
      <span data-testid="session-elapsed">
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
}
```

- [ ] **Step 7.4: Run the test — expect pass**

```bash
npx vitest run src/features/tools/components/runtime/__tests__/session-banner.test.tsx 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add src/features/tools/components/runtime/session-banner.tsx \
        src/features/tools/components/runtime/__tests__/session-banner.test.tsx
git commit -m "feat(session): add SessionBanner component with elapsed timer"
```

---

## Task 8: Session mode — SessionOverlay (floating dot + SLP panel + post-session summary)

**Files:**
- Create: `src/features/tools/components/runtime/session-overlay.tsx`
- Create: `src/features/tools/components/runtime/__tests__/session-overlay.test.tsx`

- [ ] **Step 8.1: Write failing tests first**

Create `src/features/tools/components/runtime/__tests__/session-overlay.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionOverlay } from "../session-overlay";

const mockEvents = [
  { type: "item_tapped", payloadJson: '{"label":"more"}', timestamp: Date.now() - 14000 },
  { type: "answer_correct", payloadJson: undefined, timestamp: Date.now() - 30000 },
];

describe("SessionOverlay", () => {
  it("renders a floating clipboard button", () => {
    render(<SessionOverlay events={mockEvents} onEndSession={vi.fn()} />);
    expect(screen.getByRole("button", { name: /session menu/i })).toBeInTheDocument();
  });

  it("opens SLP panel when floating button is tapped", () => {
    render(<SessionOverlay events={mockEvents} onEndSession={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /session menu/i }));
    expect(screen.getByTestId("slp-panel")).toBeInTheDocument();
  });

  it("shows event count in panel", () => {
    render(<SessionOverlay events={mockEvents} onEndSession={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /session menu/i }));
    expect(screen.getByText(/2 events/i)).toBeInTheDocument();
  });

  it("shows 'End session' button in panel", () => {
    render(<SessionOverlay events={mockEvents} onEndSession={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /session menu/i }));
    expect(screen.getByRole("button", { name: /end session/i })).toBeInTheDocument();
  });

  it("calls onEndSession and shows summary modal when End session is clicked", () => {
    const onEndSession = vi.fn();
    render(<SessionOverlay events={mockEvents} onEndSession={onEndSession} />);
    fireEvent.click(screen.getByRole("button", { name: /session menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    expect(screen.getByTestId("session-summary")).toBeInTheDocument();
  });

  it("summary modal shows total event count", () => {
    render(<SessionOverlay events={mockEvents} onEndSession={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /session menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it("summary modal has 'Add note' text area", () => {
    render(<SessionOverlay events={mockEvents} onEndSession={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /session menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    expect(screen.getByPlaceholderText(/add.*note/i)).toBeInTheDocument();
  });

  it("summary modal has 'Done' button", () => {
    render(<SessionOverlay events={mockEvents} onEndSession={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /session menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2: Run the test — expect failure**

```bash
npx vitest run src/features/tools/components/runtime/__tests__/session-overlay.test.tsx 2>&1 | tail -15
```

Expected: module not found.

- [ ] **Step 8.3: Create SessionOverlay component**

Create `src/features/tools/components/runtime/session-overlay.tsx`:

```typescript
"use client";

import { useCallback, useState } from "react";
import { ClipboardList, X } from "lucide-react";

import { cn } from "@/core/utils";

export interface SessionEvent {
  type: string;
  payloadJson?: string;
  timestamp: number;
}

interface SessionOverlayProps {
  events: SessionEvent[];
  onEndSession: () => void;
  className?: string;
}

/** Derive the most-tapped item label from item_tapped events. */
function getMostTapped(events: SessionEvent[]): string | null {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.type !== "item_tapped" || !ev.payloadJson) continue;
    try {
      const payload = JSON.parse(ev.payloadJson) as { label?: string };
      if (payload.label) {
        counts[payload.label] = (counts[payload.label] ?? 0) + 1;
      }
    } catch {
      // ignore malformed payload
    }
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return `"${entries[0][0]}" (${entries[0][1]}×)`;
}

/** Formats milliseconds as "M min N sec". */
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m} min ${s} sec`;
}

/** Post-session summary modal (no Convex save — Plan 3). */
function SessionSummaryModal({
  events,
  sessionStartMs,
  onDone,
}: {
  events: SessionEvent[];
  sessionStartMs: number;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const duration = Date.now() - sessionStartMs;
  const completions = events.filter((e) => e.type === "activity_completed").length;
  const mostTapped = getMostTapped(events);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-label="Session summary"
    >
      <div
        data-testid="session-summary"
        className={cn(
          "bg-background rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4",
          "shadow-2xl"
        )}
      >
        <h2 className="font-headline text-xl font-semibold text-foreground">
          Session summary
        </h2>

        <div className="rounded-xl bg-surface-container p-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium text-foreground">{formatDuration(duration)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total events</span>
            <span className="font-medium text-foreground">{events.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completions</span>
            <span className="font-medium text-foreground">{completions}</span>
          </div>
          {mostTapped && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Most tapped</span>
              <span className="font-medium text-foreground">{mostTapped}</span>
            </div>
          )}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className={cn(
            "w-full rounded-xl border border-border bg-background px-4 py-3",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          )}
        />

        <button
          onClick={onDone}
          className={cn(
            "w-full py-3 rounded-2xl font-semibold text-base",
            "bg-primary text-primary-foreground",
            "transition-all duration-300 hover:bg-primary/90 active:scale-95"
          )}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/**
 * Session mode overlay for SLPs:
 * - Floating circular button (bottom-right, z-50, clipboard icon)
 * - Opens a slide-up panel with event count + "End session"
 * - End session fires onEndSession callback + shows post-session summary modal
 *
 * Keeps individual template runtimes stateless — this lives in tool-runtime-page.tsx.
 */
export function SessionOverlay({ events, onEndSession, className }: SessionOverlayProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sessionStartMs] = useState(() => Date.now());

  const handleEndSession = useCallback(() => {
    setPanelOpen(false);
    onEndSession();
    setSummaryOpen(true);
  }, [onEndSession]);

  return (
    <>
      {/* Floating SLP dot */}
      <button
        onClick={() => setPanelOpen((prev) => !prev)}
        aria-label="Session menu"
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-12 h-12 rounded-full flex items-center justify-center",
          "bg-primary text-primary-foreground shadow-lg",
          "transition-all duration-300 hover:scale-110 active:scale-95",
          className
        )}
      >
        <ClipboardList className="w-5 h-5" />
      </button>

      {/* Slide-up SLP panel */}
      {panelOpen && (
        <div
          className={cn(
            "fixed bottom-0 inset-x-0 z-50 bg-background rounded-t-3xl",
            "border-t border-border shadow-2xl p-6 flex flex-col gap-4",
            "animate-in slide-in-from-bottom duration-300"
          )}
        >
          <div data-testid="slp-panel" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-semibold text-foreground">
                Session
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                aria-label="Close session panel"
                className="rounded-full p-1 hover:bg-muted transition-colors duration-200"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="rounded-xl bg-surface-container px-4 py-3 text-sm text-muted-foreground">
              {events.length} {events.length === 1 ? "event" : "events"} logged
            </div>

            <button
              onClick={handleEndSession}
              className={cn(
                "w-full py-3 rounded-2xl font-semibold text-base",
                "bg-destructive text-destructive-foreground",
                "transition-all duration-300 hover:opacity-90 active:scale-95"
              )}
            >
              End session
            </button>
          </div>
        </div>
      )}

      {/* Post-session summary modal */}
      {summaryOpen && (
        <SessionSummaryModal
          events={events}
          sessionStartMs={sessionStartMs}
          onDone={() => setSummaryOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 8.4: Run the test — expect pass**

```bash
npx vitest run src/features/tools/components/runtime/__tests__/session-overlay.test.tsx 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add src/features/tools/components/runtime/session-overlay.tsx \
        src/features/tools/components/runtime/__tests__/session-overlay.test.tsx
git commit -m "feat(session): add SessionOverlay with floating dot, SLP panel, and post-session summary"
```

---

## Task 9: Wire session mode into tool-runtime-page.tsx

Detect `?session=true` from `useSearchParams()`. Collect events for the session overlay. Render `SessionBanner` and `SessionOverlay` when in session mode.

**Files:**
- Modify: `src/features/tools/components/runtime/tool-runtime-page.tsx`

- [ ] **Step 9.1: Update tool-runtime-page.tsx**

Replace the full content of `src/features/tools/components/runtime/tool-runtime-page.tsx`:

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

import { templateRegistry } from "../../lib/registry";
import { DEFAULT_APP_SHELL } from "../../lib/runtime/app-shell-types";
import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";
import { SessionBanner } from "./session-banner";
import { SessionOverlay } from "./session-overlay";
import type { SessionEvent } from "./session-overlay";

interface ToolRuntimePageProps {
  shareToken: string;
  templateType: string;
  configJson: string;
}

export function ToolRuntimePage({ shareToken, templateType, configJson }: ToolRuntimePageProps) {
  const logEvent = useMutation(api.tools.logEvent);
  const voice = useVoiceController();
  const searchParams = useSearchParams();
  const isSessionMode = searchParams.get("session") === "true";

  // Collect events for the session overlay event count + summary
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  // Ref to avoid stale closure in handleEvent
  const sessionEventsRef = useRef<SessionEvent[]>([]);

  const registration = templateRegistry[templateType];
  if (!registration) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Unknown tool type.
      </div>
    );
  }

  const config = registration.parseConfig(configJson);
  const { Runtime } = registration;

  const handleEvent = useCallback(
    (eventType: string, payloadJson?: string) => {
      void logEvent({
        shareToken,
        eventType: eventType as Parameters<typeof logEvent>[0]["eventType"],
        eventPayloadJson: payloadJson,
      });

      if (isSessionMode) {
        const ev: SessionEvent = {
          type: eventType,
          payloadJson,
          timestamp: Date.now(),
        };
        sessionEventsRef.current = [...sessionEventsRef.current, ev];
        setSessionEvents(sessionEventsRef.current);
      }
    },
    [logEvent, shareToken, isSessionMode]
  );

  const handleEndSession = useCallback(() => {
    handleEvent("app_closed");
  }, [handleEvent]);

  const handleExit = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };

  return (
    <>
      {isSessionMode && <SessionBanner />}
      <RuntimeShell mode="published" shell={DEFAULT_APP_SHELL} title="App" onExit={handleExit}>
        <Runtime
          config={config}
          mode="published"
          onEvent={handleEvent}
          voice={voice}
        />
      </RuntimeShell>
      {isSessionMode && (
        <SessionOverlay
          events={sessionEvents}
          onEndSession={handleEndSession}
        />
      )}
    </>
  );
}
```

- [ ] **Step 9.2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "tool-runtime-page|session" | head -20
```

Expected: no errors in the session-related files.

- [ ] **Step 9.3: Run the full tools test suite**

```bash
npx vitest run src/features/tools/ 2>&1 | tail -30
```

Expected: all tests pass. The only pre-existing failures known on `main` are the ElevenLabs voice ID test and the settings `bg-white` test — those are unrelated.

- [ ] **Step 9.4: Commit**

```bash
git add src/features/tools/components/runtime/tool-runtime-page.tsx
git commit -m "feat(session): wire session mode detection and overlay into tool-runtime-page"
```

---

## Task 10: Full test run + typecheck verification

- [ ] **Step 10.1: Run the full test suite**

```bash
npx vitest run 2>&1 | tail -40
```

Expected output pattern:
```
Test Files  N passed
Tests       636+ passed (any pre-existing failures are the 2 known ones on main)
```

- [ ] **Step 10.2: TypeScript clean check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors (or only pre-existing non-plan-2 errors if any exist on main).

- [ ] **Step 10.3: Lint check**

```bash
npx eslint src/features/tools/lib/templates/ src/features/tools/components/runtime/ --max-warnings=0 2>&1 | tail -20
```

Expected: 0 errors, 0 warnings. If there are `@next/next/no-img-element` warnings inside the runtimes, they are suppressed with the existing `// eslint-disable-next-line` comments already present in the codebase.

- [ ] **Step 10.4: Final commit if any housekeeping needed**

```bash
git status
# Commit any remaining unstaged changes
git add -p  # review each hunk
git commit -m "chore: plan 2 cleanup — lint fixes and stray import tidying"
```

---

## Rollout Notes

- All features are behind the existing `config` object — no feature flags needed. New fields are `.optional()` with safe defaults so existing saved tools (which lack `wordCategory`, `sentenceStripEnabled`, `promptImageUrl`) parse correctly via Zod and simply render without the new features.
- Session mode is URL-opt-in (`?session=true`). No existing links break. Plan 3 will add the "Open in Session" CTA in the publish panel that constructs this URL.
- The matching game's `shellDifficulty` prop defaults to `"medium"` when absent, matching the existing `useAppShellState` default of `"medium"`. The `RuntimeShell` sidebar already exposes the difficulty selector for matching game (it has `enableDifficulty: true` in the registry). Plan 3 will thread the `difficulty` state value down as `shellDifficulty` prop — for now the runtime is ready to receive it.
- The `token-fill` animation is `forwards` fill-mode — the filled token stays scaled at 1.1x, which is the filled state. On `highContrast: true`, no `animation` style is applied, so the token is static. This intentionally removes all motion for autistic users who are motion-sensitive.

## Known Remaining Gaps (tracked for Plan 3)

- Session overlay event feed ("tapped 'more' · 14s ago") is not yet shown — `events` array is available but the rendered list is not included to keep the panel small. Add in Plan 3 alongside Convex save.
- `shellDifficulty` prop is manually passed from `tool-runtime-page.tsx` but `RuntimeShell` reads difficulty into `useAppShellState`. Plan 3 will lift `shellState.difficulty` up to `ToolRuntimePage` and pass it to `Runtime` as `shellDifficulty`.
- Reward image data URLs from the editor are stored in `configJson`. For large images this can hit Convex document size limits. Tracked as a future optimization (move to Convex file storage).
