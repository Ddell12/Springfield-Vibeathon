# SLP Tools Builder — Plan 2: Runtime Quality

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated therapy apps clinically credible — Fitzgerald-colored AAC boards, animated token rewards, countdown timers on schedules, difficulty-aware matching games, and an SLP session mode that collects and summarises usage data.

**Architecture:** Each template's runtime and editor are updated in place. A new `ShellStateContext` threads the shell sidebar's `difficulty` value into runtime components via React context (avoids prop-threading through `RuntimeShell`'s `children: ReactNode`). Session mode is detected in `ToolRuntimePage` via `?session=true` URL param; two new stateless components (`SessionBanner`, `SessionOverlay`) are rendered around the existing `RuntimeShell`. All animations are gated on `config.highContrast === false`.

**Tech Stack:** React, Tailwind v4 (CSS keyframes in globals.css), shadcn/ui Sheet, Vitest, React Testing Library

**Depends on:** Plan 1 (uses refactored `ToolRuntimePage` structure)

**Out of scope:** bundled SVG symbol library (sourcing 200+ symbols is a standalone effort), AI-generated button images, First/Then Board runtime changes (no spec requirements).

---

## File Map

**Modify:**
- `src/app/globals.css` — add 3 CSS keyframe animations
- `src/features/tools/lib/runtime/runtime-shell.tsx` — provide `ShellStateContext` to children
- `src/features/tools/lib/templates/aac-board/schema.ts` — add `wordCategory` to button, `sentenceStripEnabled` to config
- `src/features/tools/lib/templates/aac-board/editor.tsx` — wordCategory select + sentenceStripEnabled toggle + imageUrl URL input per button
- `src/features/tools/lib/templates/aac-board/runtime.tsx` — Fitzgerald colors, motor planning grid, sentence strip
- `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx` — extend
- `src/features/tools/lib/templates/token-board/runtime.tsx` — styled div tokens, animated fill, celebration overlay, undo, reward image
- `src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx` — extend
- `src/features/tools/lib/templates/visual-schedule/runtime.tsx` — countdown timer, per-step animation, all-done overlay
- `src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx` — extend
- `src/features/tools/lib/templates/matching-game/schema.ts` — add `promptImageUrl` to pair
- `src/features/tools/lib/templates/matching-game/editor.tsx` — promptImageUrl URL input per pair
- `src/features/tools/lib/templates/matching-game/runtime.tsx` — difficulty slicing, prompt images, shake animation
- `src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx` — extend
- `src/features/tools/components/runtime/tool-runtime-page.tsx` — session mode detection + rendering

**Create:**
- `src/features/tools/lib/runtime/shell-state-context.ts`
- `src/features/tools/components/runtime/session-banner.tsx`
- `src/features/tools/components/runtime/session-overlay.tsx`
- `src/features/tools/components/runtime/__tests__/session-banner.test.tsx`
- `src/features/tools/components/runtime/__tests__/session-overlay.test.tsx`

---

## Task 1: CSS keyframe animations

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1.1: Append animations to globals.css**

Add at the very end of `src/app/globals.css`, after all existing blocks:

```css
/* ─── Therapy tool animations ─── */
/* Applied conditionally in JS — always guarded by highContrast flag. */

@keyframes token-fill {
  0%   { transform: scale(0.8); opacity: 0.5; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes checkmark-pop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-4px); }
  40%      { transform: translateX(4px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
```

- [ ] **Step 1.2: Verify build**

```bash
cd /Users/desha/Springfield-Vibeathon
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 1.3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(animations): add token-fill, checkmark-pop, shake keyframes to globals.css"
```

---

## Task 2: ShellStateContext

**Files:**
- Create: `src/features/tools/lib/runtime/shell-state-context.ts`
- Modify: `src/features/tools/lib/runtime/runtime-shell.tsx`

`RuntimeShell` uses `useAppShellState` internally and renders difficulty/sounds controls in its sidebar. The `MatchingGameRuntime` needs to read `difficulty` but is rendered as an opaque `children: ReactNode` — it can't receive it as a prop. A React context solves this cleanly.

- [ ] **Step 2.1: Create the context**

```typescript
// src/features/tools/lib/runtime/shell-state-context.ts
import { createContext, useContext } from "react";

import type { DifficultyLevel } from "./use-app-shell-state";

export interface ShellState {
  difficulty: DifficultyLevel;
  soundsEnabled: boolean;
}

export const ShellStateContext = createContext<ShellState | null>(null);

/** Returns null when rendered outside RuntimeShell (e.g. in tests without a provider). */
export function useShellState(): ShellState | null {
  return useContext(ShellStateContext);
}
```

- [ ] **Step 2.2: Provide context in RuntimeShell**

In `src/features/tools/lib/runtime/runtime-shell.tsx`, add the import at the top:

```tsx
import { ShellStateContext } from "./shell-state-context";
```

Then wrap the `<div>{children}</div>` line (currently the last element inside the hasSidebar grid) with the provider. The full content div becomes:

```tsx
<ShellStateContext.Provider
  value={{ difficulty: state.difficulty, soundsEnabled: state.soundsEnabled }}
>
  <div>{children}</div>
</ShellStateContext.Provider>
```

The surrounding grid structure stays identical — only `<div>{children}</div>` is wrapped.

- [ ] **Step 2.3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "shell-state|runtime-shell"
```

Expected: no output.

- [ ] **Step 2.4: Commit**

```bash
git add src/features/tools/lib/runtime/shell-state-context.ts src/features/tools/lib/runtime/runtime-shell.tsx
git commit -m "feat(runtime): add ShellStateContext so runtimes can read shell difficulty"
```

---

## Task 3: AAC Board schema + editor

**Files:**
- Modify: `src/features/tools/lib/templates/aac-board/schema.ts`
- Modify: `src/features/tools/lib/templates/aac-board/editor.tsx`
- Modify: `src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts`

- [ ] **Step 3.1: Write failing schema tests**

Add to `src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { AACBoardConfigSchema, AACButtonSchema } from "../schema";

describe("AACButtonSchema — wordCategory", () => {
  it("accepts valid wordCategory values", () => {
    expect(() => AACButtonSchema.parse({ id: "1", label: "Go", speakText: "Go", wordCategory: "verb" })).not.toThrow();
    expect(() => AACButtonSchema.parse({ id: "1", label: "Go", speakText: "Go", wordCategory: "core" })).not.toThrow();
  });

  it("rejects unknown wordCategory values", () => {
    expect(() => AACButtonSchema.parse({ id: "1", label: "Go", speakText: "Go", wordCategory: "unknown" })).toThrow();
  });

  it("wordCategory is optional", () => {
    expect(() => AACButtonSchema.parse({ id: "1", label: "Go", speakText: "Go" })).not.toThrow();
  });
});

describe("AACBoardConfigSchema — sentenceStripEnabled", () => {
  const base = {
    title: "Board", gridCols: 3, gridRows: 2,
    buttons: [{ id: "1", label: "Yes", speakText: "Yes" }],
    showTextLabels: true, autoSpeak: true, voice: "child-friendly", highContrast: false,
  };

  it("accepts sentenceStripEnabled: true", () => {
    expect(() => AACBoardConfigSchema.parse({ ...base, sentenceStripEnabled: true })).not.toThrow();
  });

  it("defaults sentenceStripEnabled to false", () => {
    const result = AACBoardConfigSchema.parse(base);
    expect(result.sentenceStripEnabled).toBe(false);
  });
});
```

- [ ] **Step 3.2: Run tests — verify they fail**

```bash
npm test -- --run src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts 2>&1 | tail -15
```

Expected: FAIL — `wordCategory` and `sentenceStripEnabled` not in schema.

- [ ] **Step 3.3: Update schema**

```typescript
// src/features/tools/lib/templates/aac-board/schema.ts
import { z } from "zod";

export const WORD_CATEGORIES = ["verb", "pronoun", "noun", "descriptor", "social", "core"] as const;
export type WordCategory = typeof WORD_CATEGORIES[number];

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
  sentenceStripEnabled: z.boolean().default(false),
  voice: z.enum(["child-friendly", "warm-female", "calm-male"]).default("child-friendly"),
  highContrast: z.boolean().default(false),
});

export type AACBoardConfig = z.infer<typeof AACBoardConfigSchema>;
export type AACButton = z.infer<typeof AACButtonSchema>;
```

- [ ] **Step 3.4: Run tests — verify they pass**

```bash
npm test -- --run src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 3.5: Update AACBoardEditor**

Replace `src/features/tools/lib/templates/aac-board/editor.tsx` entirely:

```tsx
"use client";

import { nanoid } from "nanoid";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";

import type { EditorProps } from "../../registry";
import { WORD_CATEGORIES, type AACBoardConfig, type AACButton } from "./schema";

const CATEGORY_LABELS: Record<string, string> = {
  verb:       "Verb / action (green)",
  pronoun:    "Pronoun / person (yellow)",
  noun:       "Noun / thing (orange)",
  descriptor: "Describing word (blue)",
  social:     "Social phrase (pink)",
  core:       "Core / function word (white)",
};

export function AACBoardEditor({ config, onChange }: EditorProps<AACBoardConfig>) {
  const set = <K extends keyof AACBoardConfig>(key: K, value: AACBoardConfig[K]) =>
    onChange({ ...config, [key]: value });

  const updateButton = (id: string, patch: Partial<AACButton>) =>
    onChange({ ...config, buttons: config.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  const addButton = () =>
    onChange({ ...config, buttons: [...config.buttons, { id: nanoid(), label: "New Button", speakText: "New Button" }] });

  const removeButton = (id: string) =>
    onChange({ ...config, buttons: config.buttons.filter((b) => b.id !== id) });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="board-title">Board title</Label>
        <Input id="board-title" value={config.title}
          onChange={(e) => set("title", e.target.value)} placeholder="e.g. Snack Requests" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-cols">Columns</Label>
          <Select value={String(config.gridCols)} onValueChange={(v) => set("gridCols", Number(v))}>
            <SelectTrigger id="grid-cols"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-rows">Rows</Label>
          <Select value={String(config.gridRows)} onValueChange={(v) => set("gridRows", Number(v))}>
            <SelectTrigger id="grid-rows"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-labels">Show text labels</Label>
          <Switch id="show-labels" checked={config.showTextLabels} onCheckedChange={(v) => set("showTextLabels", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-speak">Speak on tap</Label>
          <Switch id="auto-speak" checked={config.autoSpeak} onCheckedChange={(v) => set("autoSpeak", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sentence-strip">Sentence strip</Label>
          <Switch id="sentence-strip" checked={config.sentenceStripEnabled}
            onCheckedChange={(v) => set("sentenceStripEnabled", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="high-contrast">High contrast</Label>
          <Switch id="high-contrast" checked={config.highContrast} onCheckedChange={(v) => set("highContrast", v)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Buttons ({config.buttons.length})</Label>
          <Button variant="outline" size="sm" onClick={addButton}>Add button</Button>
        </div>

        {config.buttons.map((button, i) => (
          <div key={button.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Button {i + 1}</span>
              <Button variant="ghost" size="sm" aria-label="Remove button"
                onClick={() => removeButton(button.id)}
                className="h-6 text-muted-foreground hover:text-destructive">
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Label</Label>
                <Input value={button.label}
                  onChange={(e) => updateButton(button.id, { label: e.target.value })}
                  placeholder="e.g. Crackers" className="h-8 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Spoken phrase</Label>
                <Input value={button.speakText}
                  onChange={(e) => updateButton(button.id, { speakText: e.target.value })}
                  placeholder="e.g. I want crackers" className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Word category (Fitzgerald color)</Label>
              <Select
                value={button.wordCategory ?? "__none__"}
                onValueChange={(v) =>
                  updateButton(button.id, { wordCategory: v === "__none__" ? undefined : v as AACButton["wordCategory"] })
                }
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {WORD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Image URL (optional)</Label>
              <Input value={button.imageUrl ?? ""}
                onChange={(e) => updateButton(button.id, { imageUrl: e.target.value || undefined })}
                placeholder="https://..." className="h-8 text-sm" type="url" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3.6: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "aac-board/editor"
```

Expected: no output.

- [ ] **Step 3.7: Commit**

```bash
git add src/features/tools/lib/templates/aac-board/
git commit -m "feat(aac): add wordCategory, sentenceStripEnabled, imageUrl to schema and editor"
```

---

## Task 4: AAC Board runtime — Fitzgerald colors, motor planning, sentence strip

**Files:**
- Modify: `src/features/tools/lib/templates/aac-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx`

- [ ] **Step 4.1: Write failing tests**

Add to `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AACBoardRuntime } from "../runtime";

const voice = { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), status: "idle" as const };
const onEvent = vi.fn();

const base = {
  title: "Test Board", gridCols: 3, gridRows: 2,
  buttons: [{ id: "1", label: "Go", speakText: "Go", wordCategory: "verb" as const }],
  showTextLabels: true, autoSpeak: true, sentenceStripEnabled: false,
  voice: "child-friendly" as const, highContrast: false,
};

describe("AACBoardRuntime — Fitzgerald colors", () => {
  it("applies green background to verb buttons", () => {
    render(<AACBoardRuntime config={base} mode="preview" onEvent={onEvent} voice={voice} />);
    const btn = screen.getByRole("button", { name: /go/i });
    expect(btn).toHaveStyle("background-color: rgb(34, 197, 94)");
  });

  it("buttons without wordCategory have no Fitzgerald background", () => {
    const config = { ...base, buttons: [{ id: "1", label: "Test", speakText: "Test" }] };
    render(<AACBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.getByRole("button", { name: /test/i })).not.toHaveStyle("background-color: rgb(34, 197, 94)");
  });
});

describe("AACBoardRuntime — motor planning", () => {
  it("fills grid to gridCols × gridRows with empty placeholder slots", () => {
    // 3 cols × 2 rows = 6 slots, 1 button → 5 empty
    render(<AACBoardRuntime config={base} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(document.querySelectorAll("[data-slot-empty]").length).toBe(5);
  });
});

describe("AACBoardRuntime — sentence strip", () => {
  it("shows strip when sentenceStripEnabled", () => {
    const config = { ...base, sentenceStripEnabled: true, autoSpeak: false };
    render(<AACBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.getByText(/tap buttons to build/i)).toBeInTheDocument();
  });

  it("tapping button appends to strip", () => {
    const config = { ...base, sentenceStripEnabled: true, autoSpeak: false };
    render(<AACBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /go/i }));
    expect(screen.getByRole("button", { name: /^speak$/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx" 2>&1 | tail -15
```

Expected: FAIL.

- [ ] **Step 4.3: Rewrite AAC Board runtime**

```tsx
// src/features/tools/lib/templates/aac-board/runtime.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen } from "../../runtime/premium-primitives";
import type { AACBoardConfig, AACButton } from "./schema";

const FITZGERALD_COLORS: Record<string, string> = {
  verb:       "#22c55e",
  pronoun:    "#eab308",
  noun:       "#f97316",
  descriptor: "#3b82f6",
  social:     "#ec4899",
  core:       "#f1f5f9",
};

function buttonStyle(button: AACButton, highContrast: boolean): React.CSSProperties {
  if (highContrast) return {};
  if (button.wordCategory) return { backgroundColor: FITZGERALD_COLORS[button.wordCategory] };
  if (button.backgroundColor) return { backgroundColor: button.backgroundColor };
  return {};
}

export function AACBoardRuntime({
  config, mode: _mode, onEvent, voice,
}: RuntimeProps<AACBoardConfig>) {
  const [sentence, setSentence] = useState<string[]>([]);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleButtonPress = useCallback((button: AACButton) => {
    onEvent("item_tapped", JSON.stringify({ buttonId: button.id, label: button.label }));
    if (config.sentenceStripEnabled) {
      setSentence((prev) => [...prev, button.speakText]);
    } else if (config.autoSpeak) {
      void voice.speak({ text: button.speakText, voice: config.voice });
    }
  }, [config.sentenceStripEnabled, config.autoSpeak, config.voice, onEvent, voice]);

  const handleSpeak = useCallback(() => {
    if (sentence.length === 0) return;
    void voice.speak({ text: sentence.join(" "), voice: config.voice });
    setSentence([]);
  }, [sentence, config.voice, voice]);

  // Motor planning: pad to gridCols × gridRows fixed slots
  const totalSlots = config.gridCols * config.gridRows;
  const slots = Array.from({ length: totalSlots }, (_, i) => config.buttons[i] ?? null);

  return (
    <div className={cn("p-4", config.highContrast && "high-contrast bg-black")}>
      <PremiumScreen title={config.title} className="h-full">
        {/* Sentence strip */}
        {config.sentenceStripEnabled && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 min-h-[44px]">
            <span className="flex-1 text-sm text-foreground">
              {sentence.length > 0 ? sentence.join(" · ") : (
                <span className="text-muted-foreground">Tap buttons to build a sentence…</span>
              )}
            </span>
            {sentence.length > 0 && (
              <>
                <button onClick={handleSpeak}
                  className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                  Speak
                </button>
                <button onClick={() => setSentence([])} aria-label="Clear strip"
                  className="px-2 py-1 rounded-lg bg-muted text-muted-foreground text-xs">
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        {/* Motor planning grid */}
        <div className="grid gap-3 flex-1"
          style={{ gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))` }}>
          {slots.map((button, slotIndex) =>
            button ? (
              <button key={button.id} onClick={() => handleButtonPress(button)}
                style={buttonStyle(button, config.highContrast)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl p-4",
                  "min-h-[100px] touch-manipulation select-none",
                  "transition-all duration-300 active:scale-95",
                  !button.wordCategory && !button.backgroundColor && (
                    config.highContrast
                      ? "bg-yellow-400 text-black border-4 border-white"
                      : "bg-primary/10 hover:bg-primary/20 text-foreground border-2 border-border"
                  ),
                )}
                aria-label={button.speakText}>
                {button.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={button.imageUrl} alt={button.label} className="w-16 h-16 object-cover rounded-xl" />
                )}
                {config.showTextLabels && (
                  <span className="text-sm font-medium text-center leading-tight">{button.label}</span>
                )}
              </button>
            ) : (
              <div key={`empty-${slotIndex}`} data-slot-empty="true"
                className="rounded-2xl min-h-[100px] bg-muted/20 border-2 border-dashed border-border/30"
                aria-hidden="true" />
            )
          )}
        </div>
      </PremiumScreen>
    </div>
  );
}
```

- [ ] **Step 4.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/features/tools/lib/templates/aac-board/
git commit -m "feat(aac): Fitzgerald colors, motor planning grid, sentence strip"
```

---

## Task 5: Token Board runtime — styled tokens, animated fill, celebration overlay, undo

**Files:**
- Modify: `src/features/tools/lib/templates/token-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx`

Note: `rewardImageUrl` is **already** in `TokenBoardConfigSchema` and `TokenBoardEditor`. The runtime just needs to use it.

- [ ] **Step 5.1: Write failing tests**

Add to `src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TokenBoardRuntime } from "../runtime";

const voice = { speak: vi.fn(), stop: vi.fn(), status: "idle" as const };
const onEvent = vi.fn();
const config = {
  title: "Token Board", tokenCount: 3, rewardLabel: "iPad time",
  rewardImageUrl: undefined, tokenShape: "star" as const,
  tokenColor: "#FBBF24", highContrast: false,
};

describe("TokenBoardRuntime — styled tokens", () => {
  it("does not render emoji tokens", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.queryByText("⭐")).not.toBeInTheDocument();
  });

  it("applies tokenColor to filled tokens via inline style", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    const filledToken = screen.getByRole("button", { name: /token 1/i });
    expect(filledToken).toHaveStyle("background-color: rgb(251, 191, 36)");
  });
});

describe("TokenBoardRuntime — undo", () => {
  it("undo is disabled when no tokens earned", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });

  it("undo decrements earned count", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    expect(screen.getByRole("button", { name: /undo/i })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });
});

describe("TokenBoardRuntime — celebration", () => {
  it("shows celebration overlay when all tokens earned", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 2/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 3/i }));
    expect(screen.getByText("iPad time")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });

  it("shows reward image in celebration when rewardImageUrl is set", () => {
    const cfg = { ...config, rewardImageUrl: "https://example.com/ipad.jpg" };
    render(<TokenBoardRuntime config={cfg} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 2/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 3/i }));
    expect(screen.getByAltText("reward")).toHaveAttribute("src", "https://example.com/ipad.jpg");
  });
});
```

- [ ] **Step 5.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx" 2>&1 | tail -15
```

Expected: FAIL.

- [ ] **Step 5.3: Rewrite Token Board runtime**

```tsx
// src/features/tools/lib/templates/token-board/runtime.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail } from "../../runtime/premium-primitives";
import type { TokenBoardConfig } from "./schema";

export function TokenBoardRuntime({
  config, mode: _mode, onEvent, voice: _voice,
}: RuntimeProps<TokenBoardConfig>) {
  const [earned, setEarned] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [justFilledIndex, setJustFilledIndex] = useState<number | null>(null);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTokenTap = useCallback((i: number) => {
    if (completed || i !== earned) return;
    const newEarned = earned + 1;
    setJustFilledIndex(i);
    setTimeout(() => setJustFilledIndex(null), 350);
    onEvent("token_added", JSON.stringify({ tokenIndex: i, earned: newEarned }));
    setEarned(newEarned);
    if (newEarned === config.tokenCount) {
      onEvent("activity_completed", JSON.stringify({ tokensEarned: newEarned }));
      setCompleted(true);
    }
  }, [completed, earned, config.tokenCount, onEvent]);

  const handleUndo = useCallback(() => {
    if (earned === 0) return;
    setEarned((e) => e - 1);
    setCompleted(false);
  }, [earned]);

  const handleReset = useCallback(() => {
    setEarned(0);
    setCompleted(false);
    setJustFilledIndex(null);
    onEvent("app_opened");
  }, [onEvent]);

  return (
    <div className={cn("p-4 relative", config.highContrast && "high-contrast bg-black")}>
      {/* Celebration overlay */}
      {completed && (
        <div className={cn(
          "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8",
          config.highContrast ? "bg-black" : "bg-primary/95"
        )}>
          {config.rewardImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.rewardImageUrl} alt="reward"
              className="w-36 h-36 rounded-2xl object-cover shadow-xl" />
          )}
          <p className={cn("font-headline text-3xl font-semibold text-center",
            config.highContrast ? "text-yellow-400" : "text-white")}>
            {config.rewardLabel}
          </p>
          {!config.highContrast && <p className="text-white/80 text-lg">Great work!</p>}
          <button onClick={handleReset} aria-label="Start over"
            className={cn(
              "mt-2 px-8 py-3 rounded-full font-medium transition-colors",
              config.highContrast ? "bg-yellow-400 text-black" : "bg-white text-primary hover:bg-white/90"
            )}>
            Start over
          </button>
        </div>
      )}

      <PremiumScreen title={config.title} className="items-center">
        <ProgressRail current={earned} total={config.tokenCount}
          label={`${earned} of ${config.tokenCount} tokens earned`} />

        {/* Token row */}
        <div className="flex gap-3 flex-wrap justify-center">
          {Array.from({ length: config.tokenCount }).map((_, i) => {
            const isFilled = i < earned;
            return (
              <button key={i} onClick={() => handleTokenTap(i)} aria-label={`Token ${i + 1}`}
                disabled={isFilled || completed}
                className={cn(
                  "w-16 h-16 rounded-full touch-manipulation select-none",
                  "transition-transform duration-300",
                  isFilled ? "scale-110 border-4 border-white shadow-lg" : "opacity-40 bg-muted border-2 border-border",
                  config.highContrast && isFilled && "bg-yellow-400 border-white",
                )}
                style={isFilled ? {
                  backgroundColor: config.highContrast ? undefined : config.tokenColor,
                  animation: !config.highContrast && justFilledIndex === i
                    ? "token-fill 300ms cubic-bezier(0.4, 0, 0.2, 1) both"
                    : undefined,
                } : {}}
              />
            );
          })}
        </div>

        {/* Reward label (idle state) */}
        {!completed && (
          <div className={cn("rounded-2xl p-6 text-center max-w-sm",
            config.highContrast ? "bg-yellow-400 text-black" : "bg-muted/40")}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Reward</p>
            <p className="text-lg font-bold text-foreground">{config.rewardLabel}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={handleUndo} disabled={earned === 0} aria-label="Undo last token"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              "bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed",
              config.highContrast && "bg-white text-black"
            )}>
            Undo
          </button>
          <button onClick={handleReset} aria-label="Reset"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              "bg-muted text-muted-foreground hover:bg-muted/80",
              config.highContrast && "bg-white text-black"
            )}>
            Reset
          </button>
        </div>
      </PremiumScreen>
    </div>
  );
}
```

- [ ] **Step 5.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/features/tools/lib/templates/token-board/
git commit -m "feat(token-board): styled tokens, animated fill, celebration overlay, undo, reward image"
```

---

## Task 6: Visual Schedule runtime — countdown timer, per-step animation, all-done overlay

**Files:**
- Modify: `src/features/tools/lib/templates/visual-schedule/runtime.tsx`
- Modify: `src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx`

- [ ] **Step 6.1: Write failing tests**

Add to `src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx`:

```typescript
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { VisualScheduleRuntime } from "../runtime";

const voice = { speak: vi.fn(), stop: vi.fn(), status: "idle" as const };
const onEvent = vi.fn();
const config = {
  title: "Morning Routine",
  items: [{ id: "1", label: "Wake up", durationMinutes: 1 }, { id: "2", label: "Brush teeth" }],
  showDuration: true, highContrast: false, showCheckmarks: true,
};

describe("VisualScheduleRuntime — countdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows countdown ring for active step with durationMinutes", () => {
    render(<VisualScheduleRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    // Active step "Wake up" has durationMinutes — ring renders immediately
    expect(document.querySelector("[data-countdown-ring]")).toBeInTheDocument();
  });

  it("auto-advances when countdown reaches zero", () => {
    render(<VisualScheduleRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    act(() => { vi.advanceTimersByTime(60 * 1000); });
    expect(screen.getByText("Brush teeth")).toBeInTheDocument();
  });
});

describe("VisualScheduleRuntime — all-done overlay", () => {
  it("shows all-done overlay when last step completed", () => {
    const single = { ...config, items: [{ id: "1", label: "Wake up" }] };
    render(<VisualScheduleRuntime config={single} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /wake up/i }));
    expect(screen.getByText(/all done/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start again/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx" 2>&1 | tail -15
```

Expected: FAIL.

- [ ] **Step 6.3: Rewrite Visual Schedule runtime**

```tsx
// src/features/tools/lib/templates/visual-schedule/runtime.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail } from "../../runtime/premium-primitives";
import type { VisualScheduleConfig } from "./schema";

const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CountdownRing({ totalSeconds, secondsLeft, highContrast }: {
  totalSeconds: number; secondsLeft: number; highContrast: boolean;
}) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  return (
    <svg width="60" height="60" data-countdown-ring="true" className="shrink-0"
      aria-label={`${secondsLeft} seconds remaining`}>
      <circle cx="30" cy="30" r={RADIUS} fill="none" strokeWidth="4"
        className={highContrast ? "stroke-white/30" : "stroke-muted"} />
      <circle cx="30" cy="30" r={RADIUS} fill="none" strokeWidth="4"
        strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        className={highContrast ? "stroke-yellow-400" : "stroke-primary"}
        style={{ transform: "rotate(-90deg)", transformOrigin: "30px 30px", transition: "stroke-dashoffset 1s linear" }} />
      <text x="30" y="35" textAnchor="middle" fontSize="13" fontWeight="600"
        className={highContrast ? "fill-white" : "fill-foreground"}>
        {secondsLeft}
      </text>
    </svg>
  );
}

export function VisualScheduleRuntime({
  config, mode: _mode, onEvent, voice: _voice,
}: RuntimeProps<VisualScheduleConfig>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(() => {
    const first = config.items[0];
    return config.showDuration && first?.durationMinutes ? first.durationMinutes * 60 : null;
  });
  const totalTimerRef = useRef<number>(
    config.showDuration && config.items[0]?.durationMinutes ? config.items[0].durationMinutes * 60 : 0
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const advanceStep = useCallback((index: number) => {
    const item = config.items[index];
    onEvent("item_tapped", JSON.stringify({ itemId: item.id, label: item.label, index }));
    const next = index + 1;
    if (next >= config.items.length) {
      setCompleted(true);
      onEvent("activity_completed", JSON.stringify({ itemsCompleted: config.items.length }));
    } else {
      setCurrentIndex(next);
      const nextItem = config.items[next];
      if (config.showDuration && nextItem.durationMinutes) {
        const secs = nextItem.durationMinutes * 60;
        totalTimerRef.current = secs;
        setTimerSeconds(secs);
      } else {
        setTimerSeconds(null);
      }
    }
  }, [config.items, config.showDuration, onEvent]);

  // Countdown tick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerSeconds === null || timerSeconds <= 0) return;
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s === null || s <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setCurrentIndex((idx) => { advanceStep(idx); return idx; });
          return null;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerSeconds, advanceStep]);

  const handleItemTap = useCallback((index: number) => {
    if (completed || index !== currentIndex) return;
    const item = config.items[index];
    // If item has a timer and it's not yet started, just let the auto-countdown handle it
    if (config.showDuration && item.durationMinutes && timerSeconds !== null) return;
    // For items without timer, advance immediately
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimerSeconds(null);
    advanceStep(index);
  }, [completed, currentIndex, config.items, config.showDuration, timerSeconds, advanceStep]);

  const handleReset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCurrentIndex(0);
    setCompleted(false);
    const first = config.items[0];
    const secs = config.showDuration && first?.durationMinutes ? first.durationMinutes * 60 : null;
    totalTimerRef.current = secs ?? 0;
    setTimerSeconds(secs);
    onEvent("app_opened");
  }, [config.items, config.showDuration, onEvent]);

  return (
    <div className={cn("p-4", config.highContrast && "high-contrast bg-black")}>
      <PremiumScreen title={config.title}>
        <ProgressRail
          current={completed ? config.items.length : currentIndex}
          total={config.items.length}
          label={completed ? "All done!" : `Step ${currentIndex + 1} of ${config.items.length}`}
        />

        {completed ? (
          <div className="flex flex-col items-center gap-4">
            <div className={cn("rounded-xl px-8 py-6 text-center",
              config.highContrast ? "bg-yellow-400 text-black" : "bg-primary/10")}>
              <p className="font-headline text-2xl font-semibold">All done! 🎉</p>
            </div>
            <button onClick={handleReset} aria-label="Start again"
              className={cn("px-6 py-3 rounded-xl text-sm font-medium transition-colors",
                config.highContrast ? "bg-white text-black" : "bg-muted text-foreground")}>
              Start again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {config.items.map((item, index) => {
              const isDone = index < currentIndex;
              const isActive = index === currentIndex;
              return (
                <button key={item.id} onClick={() => handleItemTap(index)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl p-4 text-left",
                    "touch-manipulation select-none transition-all duration-300",
                    isDone && "opacity-50 scale-[0.97]",
                    isActive && "scale-[1.02]",
                    isDone
                      ? config.highContrast ? "bg-gray-700 text-gray-400" : "bg-muted/50 text-muted-foreground"
                      : isActive
                        ? config.highContrast ? "bg-yellow-400 text-black border-4 border-white" : "bg-primary text-primary-foreground shadow-lg"
                        : config.highContrast ? "bg-gray-800 text-white border-2 border-gray-600" : "bg-muted text-foreground"
                  )}>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.label} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold">{item.label}</p>
                    {config.showDuration && item.durationMinutes !== undefined && (
                      <p className="text-sm opacity-70">{item.durationMinutes} min</p>
                    )}
                  </div>
                  {config.showCheckmarks && isDone && (
                    <span className="text-2xl flex-shrink-0"
                      style={!config.highContrast ? { animation: "checkmark-pop 300ms cubic-bezier(0.4, 0, 0.2, 1) both" } : undefined}>
                      ✓
                    </span>
                  )}
                  {isActive && config.showDuration && item.durationMinutes && timerSeconds !== null && (
                    <CountdownRing totalSeconds={totalTimerRef.current} secondsLeft={timerSeconds} highContrast={config.highContrast} />
                  )}
                  {isActive && timerSeconds === null && (
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

- [ ] **Step 6.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/features/tools/lib/templates/visual-schedule/
git commit -m "feat(visual-schedule): countdown timer, checkmark-pop animation, all-done overlay"
```

---

## Task 7: Matching Game — promptImageUrl, difficulty wiring, shake

**Files:**
- Modify: `src/features/tools/lib/templates/matching-game/schema.ts`
- Modify: `src/features/tools/lib/templates/matching-game/editor.tsx`
- Modify: `src/features/tools/lib/templates/matching-game/runtime.tsx`
- Modify: `src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx`

- [ ] **Step 7.1: Write failing tests**

Add to `src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ShellStateContext } from "../../../../lib/runtime/shell-state-context";
import { MatchingGameRuntime } from "../runtime";

const voice = { speak: vi.fn(), stop: vi.fn(), status: "idle" as const };
const onEvent = vi.fn();
const config = {
  title: "Animals",
  pairs: [
    { id: "1", prompt: "Dog", answer: "Woof" },
    { id: "2", prompt: "Cat", answer: "Meow" },
    { id: "3", prompt: "Cow", answer: "Moo" },
    { id: "4", prompt: "Duck", answer: "Quack" },
    { id: "5", prompt: "Pig", answer: "Oink" },
  ],
  showAnswerImages: false, celebrateCorrect: true, highContrast: false,
};

function withDifficulty(difficulty: "easy" | "medium" | "hard") {
  return render(
    <ShellStateContext.Provider value={{ difficulty, soundsEnabled: true }}>
      <MatchingGameRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />
    </ShellStateContext.Provider>
  );
}

describe("MatchingGameRuntime — difficulty slicing", () => {
  it("shows 2 pairs on easy", () => {
    withDifficulty("easy");
    expect(screen.getByText("Dog")).toBeInTheDocument();
    expect(screen.getByText("Cat")).toBeInTheDocument();
    expect(screen.queryByText("Cow")).not.toBeInTheDocument();
  });

  it("shows 4 pairs on medium", () => {
    withDifficulty("medium");
    expect(screen.getByText("Duck")).toBeInTheDocument();
    expect(screen.queryByText("Pig")).not.toBeInTheDocument();
  });

  it("shows all pairs on hard", () => {
    withDifficulty("hard");
    expect(screen.getByText("Pig")).toBeInTheDocument();
  });
});

describe("MatchingGameRuntime — promptImageUrl", () => {
  it("renders prompt image when promptImageUrl is set", () => {
    const cfg = { ...config, pairs: [{ id: "1", prompt: "Dog", answer: "Woof", promptImageUrl: "https://ex.com/dog.jpg" }] };
    render(
      <ShellStateContext.Provider value={{ difficulty: "hard", soundsEnabled: true }}>
        <MatchingGameRuntime config={cfg} mode="preview" onEvent={onEvent} voice={voice} />
      </ShellStateContext.Provider>
    );
    expect(screen.getByAltText("Dog")).toHaveAttribute("src", "https://ex.com/dog.jpg");
  });
});
```

- [ ] **Step 7.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx" 2>&1 | tail -15
```

Expected: FAIL.

- [ ] **Step 7.3: Update MatchPairSchema**

```typescript
// src/features/tools/lib/templates/matching-game/schema.ts
import { z } from "zod";

export const MatchPairSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1).max(100),
  answer: z.string().min(1).max(100),
  imageUrl: z.string().url().optional(),       // answer column image
  promptImageUrl: z.string().url().optional(), // prompt column image ← new
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

- [ ] **Step 7.4: Add promptImageUrl input to MatchingGameEditor**

In `src/features/tools/lib/templates/matching-game/editor.tsx`, inside `{config.pairs.map(...)}`, add a third input after the existing prompt/answer grid:

```tsx
// After the prompt/answer grid div, add:
<div className="flex flex-col gap-1">
  <Label className="text-xs">Prompt image URL (optional)</Label>
  <Input
    value={pair.promptImageUrl ?? ""}
    onChange={(e) => updatePair(pair.id, { promptImageUrl: e.target.value || undefined })}
    placeholder="https://..."
    className="h-8 text-sm"
    type="url"
  />
</div>
```

Full updated pair card (replace the existing one):

```tsx
{config.pairs.map((pair, i) => (
  <div key={pair.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">Pair {i + 1}</span>
      <Button variant="ghost" size="sm" aria-label="Remove pair"
        onClick={() => removePair(pair.id)}
        className="h-6 text-muted-foreground hover:text-destructive">
        Remove
      </Button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Prompt</Label>
        <Input value={pair.prompt}
          onChange={(e) => updatePair(pair.id, { prompt: e.target.value })}
          placeholder="e.g. Dog" className="h-8 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Answer</Label>
        <Input value={pair.answer}
          onChange={(e) => updatePair(pair.id, { answer: e.target.value })}
          placeholder="e.g. Woof" className="h-8 text-sm" />
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <Label className="text-xs">Prompt image URL (optional)</Label>
      <Input value={pair.promptImageUrl ?? ""}
        onChange={(e) => updatePair(pair.id, { promptImageUrl: e.target.value || undefined })}
        placeholder="https://..." className="h-8 text-sm" type="url" />
    </div>
  </div>
))}
```

- [ ] **Step 7.5: Update MatchingGameRuntime**

```tsx
// src/features/tools/lib/templates/matching-game/runtime.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { useShellState } from "../../runtime/shell-state-context";
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

export function MatchingGameRuntime({
  config, mode: _mode, onEvent, voice: _voice,
}: RuntimeProps<MatchingGameConfig>) {
  const shellState = useShellState();
  const difficulty = shellState?.difficulty ?? "hard";

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [incorrectAnswerId, setIncorrectAnswerId] = useState<string | null>(null);
  const incorrectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current); }, []);

  const visiblePairs = useMemo(() => {
    if (difficulty === "easy") return config.pairs.slice(0, 2);
    if (difficulty === "medium") return config.pairs.slice(0, 4);
    return config.pairs;
  }, [config.pairs, difficulty]);

  const shuffledAnswers = useMemo(
    () => shuffleArray(visiblePairs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visiblePairs.map((p) => p.id).join(",")]
  );

  // Reset selections when difficulty changes
  useEffect(() => {
    setSelectedPromptId(null);
    setMatchedPairIds(new Set());
    setIncorrectAnswerId(null);
  }, [difficulty]);

  useEffect(() => {
    if (visiblePairs.length === 0) return;
    const percent = Math.round((matchedPairIds.size / visiblePairs.length) * 100);
    onEvent("progress_updated", JSON.stringify({ percent }));
  }, [matchedPairIds, visiblePairs.length, onEvent]);

  const handlePromptTap = useCallback((pairId: string) => {
    if (matchedPairIds.has(pairId)) return;
    setSelectedPromptId(pairId);
    setIncorrectAnswerId(null);
  }, [matchedPairIds]);

  const handleAnswerTap = useCallback((answerId: string) => {
    if (!selectedPromptId || matchedPairIds.has(answerId)) return;
    const isCorrect = selectedPromptId === answerId;
    const payloadJson = JSON.stringify({ promptId: selectedPromptId, answerId });
    if (isCorrect) {
      onEvent("answer_correct", payloadJson);
      const newMatched = new Set(matchedPairIds);
      newMatched.add(answerId);
      setMatchedPairIds(newMatched);
      setSelectedPromptId(null);
      if (newMatched.size === visiblePairs.length) {
        onEvent("activity_completed", JSON.stringify({ pairsMatched: visiblePairs.length }));
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
  }, [selectedPromptId, matchedPairIds, visiblePairs.length, onEvent]);

  const allDone = matchedPairIds.size === visiblePairs.length && visiblePairs.length > 0;

  return (
    <div className={cn("p-4", config.highContrast && "high-contrast bg-black")}>
      <PremiumScreen title={config.title}>
        {allDone ? (
          <ReinforcementBanner title={config.celebrateCorrect ? "Amazing! All matched!" : "Complete!"} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Prompts */}
            <div className="flex flex-col gap-3">
              <p className={cn("text-xs font-semibold uppercase tracking-wide text-center mb-1",
                config.highContrast ? "text-gray-400" : "text-muted-foreground")}>Match</p>
              {visiblePairs.map((pair) => {
                const isMatched = matchedPairIds.has(pair.id);
                const isSelected = selectedPromptId === pair.id;
                return (
                  <button key={pair.id} onClick={() => handlePromptTap(pair.id)}
                    className={cn(
                      "rounded-2xl p-4 text-center font-semibold text-base",
                      "min-h-[64px] touch-manipulation select-none transition-all duration-300 active:scale-95",
                      isMatched ? (config.highContrast ? "bg-green-700 text-white" : "bg-green-100 text-green-700 border-2 border-green-300")
                        : isSelected ? (config.highContrast ? "bg-yellow-400 text-black border-4 border-white" : "bg-primary text-primary-foreground border-2 border-primary scale-105")
                          : (config.highContrast ? "bg-gray-800 text-white border-2 border-gray-600" : "bg-muted text-foreground border-2 border-border")
                    )}>
                    {pair.promptImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pair.promptImageUrl} alt={pair.prompt} className="w-12 h-12 object-cover rounded-lg mx-auto mb-1" />
                    )}
                    {pair.prompt}
                  </button>
                );
              })}
            </div>

            {/* Answers */}
            <div className="flex flex-col gap-3">
              <p className={cn("text-xs font-semibold uppercase tracking-wide text-center mb-1",
                config.highContrast ? "text-gray-400" : "text-muted-foreground")}>Answer</p>
              {shuffledAnswers.map((pair) => {
                const isMatched = matchedPairIds.has(pair.id);
                const isIncorrect = incorrectAnswerId === pair.id;
                return (
                  <button key={pair.id} onClick={() => handleAnswerTap(pair.id)}
                    className={cn(
                      "rounded-2xl p-4 text-center font-semibold text-base",
                      "min-h-[64px] touch-manipulation select-none transition-all duration-300 active:scale-95",
                      isMatched ? (config.highContrast ? "bg-green-700 text-white" : "bg-green-100 text-green-700 border-2 border-green-300")
                        : isIncorrect ? (config.highContrast ? "bg-red-600 text-white border-4 border-white" : "bg-red-100 text-red-700 border-2 border-red-300")
                          : (config.highContrast ? "bg-gray-800 text-white border-2 border-gray-600" : "bg-muted text-foreground border-2 border-border")
                    )}
                    style={isIncorrect && !config.highContrast
                      ? { animation: "shake 300ms cubic-bezier(0.4, 0, 0.2, 1)" }
                      : undefined}>
                    {config.showAnswerImages && pair.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pair.imageUrl} alt={pair.answer} className="w-12 h-12 object-cover rounded-lg mb-1" />
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

- [ ] **Step 7.6: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 7.7: Commit**

```bash
git add src/features/tools/lib/templates/matching-game/
git commit -m "feat(matching-game): difficulty slicing, promptImageUrl, shake animation"
```

---

## Task 8: Session components

**Files:**
- Create: `src/features/tools/components/runtime/session-banner.tsx`
- Create: `src/features/tools/components/runtime/session-overlay.tsx`
- Create: `src/features/tools/components/runtime/__tests__/session-banner.test.tsx`
- Create: `src/features/tools/components/runtime/__tests__/session-overlay.test.tsx`

- [ ] **Step 8.1: Write failing tests for SessionBanner**

```typescript
// src/features/tools/components/runtime/__tests__/session-banner.test.tsx
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionBanner } from "../session-banner";

describe("SessionBanner", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders Session label", () => {
    render(<SessionBanner />);
    expect(screen.getByText("Session")).toBeInTheDocument();
  });

  it("starts elapsed at 0:00", () => {
    render(<SessionBanner />);
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("increments elapsed every second", () => {
    render(<SessionBanner />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText("0:03")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2: Write failing tests for SessionOverlay**

```typescript
// src/features/tools/components/runtime/__tests__/session-overlay.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionOverlay } from "../session-overlay";

const onEndSession = vi.fn();
const baseProps = {
  events: [], startTimeMs: Date.now(),
  toolTitle: "Test Tool", templateType: "token_board",
  onEndSession,
};

describe("SessionOverlay", () => {
  it("renders floating session button", () => {
    render(<SessionOverlay {...baseProps} />);
    expect(screen.getByRole("button", { name: /session controls/i })).toBeInTheDocument();
  });

  it("opens panel on click", () => {
    render(<SessionOverlay {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /session controls/i }));
    expect(screen.getByRole("button", { name: /end session/i })).toBeInTheDocument();
  });

  it("shows event count in panel", () => {
    const events = [
      { type: "item_tapped", timestamp: Date.now() },
      { type: "token_added", timestamp: Date.now() },
    ];
    render(<SessionOverlay {...baseProps} events={events} />);
    fireEvent.click(screen.getByRole("button", { name: /session controls/i }));
    expect(screen.getByText(/2 events/i)).toBeInTheDocument();
  });

  it("calls onEndSession when End Session clicked", () => {
    render(<SessionOverlay {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /session controls/i }));
    fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    expect(onEndSession).toHaveBeenCalled();
  });
});
```

- [ ] **Step 8.3: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/components/runtime/__tests__/session-banner.test.tsx" "src/features/tools/components/runtime/__tests__/session-overlay.test.tsx" 2>&1 | tail -15
```

Expected: FAIL — modules not found.

- [ ] **Step 8.4: Implement SessionBanner**

```tsx
// src/features/tools/components/runtime/session-banner.tsx
"use client";

import { useEffect, useState } from "react";

interface SessionBannerProps {
  patientName?: string;
}

export function SessionBanner({ patientName }: SessionBannerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const elapsedStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 bg-primary/10 border-b border-primary/20 px-4 py-1.5 text-xs text-primary font-medium">
      <span>Session</span>
      <span className="text-primary/50">·</span>
      <span>{dateStr}</span>
      {patientName && (
        <>
          <span className="text-primary/50">·</span>
          <span>{patientName}</span>
        </>
      )}
      <span className="text-primary/50">·</span>
      <span className="font-mono">{elapsedStr}</span>
    </div>
  );
}
```

- [ ] **Step 8.5: Implement SessionOverlay**

```tsx
// src/features/tools/components/runtime/session-overlay.tsx
"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/shared/components/ui/sheet";

export interface SessionEvent {
  type: string;
  payloadJson?: string;
  timestamp: number;
}

interface SessionOverlayProps {
  events: SessionEvent[];
  startTimeMs: number;
  toolTitle: string;
  templateType: string;
  onEndSession: () => void;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function SessionOverlay({
  events, startTimeMs, toolTitle, templateType: _t, onEndSession,
}: SessionOverlayProps) {
  const [open, setOpen] = useState(false);

  const elapsedSec = Math.floor((Date.now() - startTimeMs) / 1000);
  const completions = events.filter((e) => e.type === "activity_completed").length;
  const recentEvents = events.slice(-5).reverse();

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Session controls"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors">
        <ClipboardList className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="text-left">{toolTitle}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center rounded-xl bg-muted/40 px-4 py-3 flex-1">
                <span className="text-2xl font-bold">{events.length}</span>
                <span className="text-xs text-muted-foreground">events</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-muted/40 px-4 py-3 flex-1">
                <span className="text-2xl font-bold">{completions}</span>
                <span className="text-xs text-muted-foreground">completions</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-muted/40 px-4 py-3 flex-1">
                <span className="text-sm font-bold">
                  {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground">elapsed</span>
              </div>
            </div>
            {recentEvents.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent</p>
                {recentEvents.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {e.type.replace(/_/g, " ")} · {relativeTime(e.timestamp)}
                  </p>
                ))}
              </div>
            )}
            <Button variant="destructive" className="w-full"
              onClick={() => { setOpen(false); onEndSession(); }}>
              End session
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 8.6: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/components/runtime/__tests__/session-banner.test.tsx" "src/features/tools/components/runtime/__tests__/session-overlay.test.tsx" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 8.7: Commit**

```bash
git add src/features/tools/components/runtime/session-banner.tsx src/features/tools/components/runtime/session-overlay.tsx src/features/tools/components/runtime/__tests__/
git commit -m "feat(session): SessionBanner + SessionOverlay components"
```

---

## Task 9: ToolRuntimePage — session mode wiring

**Files:**
- Modify: `src/features/tools/components/runtime/tool-runtime-page.tsx`

- [ ] **Step 9.1: Rewrite ToolRuntimePage**

```tsx
// src/features/tools/components/runtime/tool-runtime-page.tsx
"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { templateRegistry } from "../../lib/registry";
import { DEFAULT_APP_SHELL } from "../../lib/runtime/app-shell-types";
import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";
import { SessionBanner } from "./session-banner";
import { SessionOverlay, type SessionEvent } from "./session-overlay";

interface ToolRuntimePageProps {
  shareToken: string;
  templateType: string;
  configJson: string;
  patientName?: string;
}

export function ToolRuntimePage({ shareToken, templateType, configJson, patientName }: ToolRuntimePageProps) {
  const logEvent = useMutation(api.tools.logEvent);
  const voice = useVoiceController();
  const searchParams = useSearchParams();
  const isSession = searchParams.get("session") === "true";

  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const sessionStartMs = useRef(Date.now());
  const [showSummary, setShowSummary] = useState(false);

  const registration = templateRegistry[templateType];
  if (!registration) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Unknown tool type.
      </div>
    );
  }

  const config = registration.parseConfig(configJson);
  const title = (config as { title?: string }).title ?? registration.meta.name;
  const { Runtime } = registration;

  const handleEvent = (eventType: string, payloadJson?: string) => {
    void logEvent({
      shareToken,
      eventType: eventType as Parameters<typeof logEvent>[0]["eventType"],
      eventPayloadJson: payloadJson,
    });
    if (isSession) {
      setSessionEvents((prev) => [...prev, { type: eventType, payloadJson, timestamp: Date.now() }]);
    }
  };

  const handleExit = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {isSession && <SessionBanner patientName={patientName} />}

      <RuntimeShell mode="published" shell={DEFAULT_APP_SHELL} title={title} onExit={handleExit}>
        <Runtime config={config} mode="published" onEvent={handleEvent} voice={voice} />
      </RuntimeShell>

      {isSession && !showSummary && (
        <SessionOverlay
          events={sessionEvents}
          startTimeMs={sessionStartMs.current}
          toolTitle={title}
          templateType={templateType}
          onEndSession={() => { handleEvent("app_closed"); setShowSummary(true); }}
        />
      )}

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-background rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <h2 className="font-headline text-xl font-semibold">Session summary</h2>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Tool: {title}</p>
              <p>Events: {sessionEvents.length}</p>
              <p>
                Completions: {sessionEvents.filter((e) => e.type === "activity_completed").length}
              </p>
              <p>
                Duration:{" "}
                {Math.floor((Date.now() - sessionStartMs.current) / 60000)} min{" "}
                {Math.floor(((Date.now() - sessionStartMs.current) % 60000) / 1000)} sec
              </p>
            </div>
            <button onClick={handleExit}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9.2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep tool-runtime-page
```

Expected: no output.

- [ ] **Step 9.3: Commit**

```bash
git add src/features/tools/components/runtime/tool-runtime-page.tsx
git commit -m "feat(session): wire ?session=true URL param in ToolRuntimePage"
```

---

## Task 10: Full verification

- [ ] **Step 10.1: Run full test suite**

```bash
npm test -- --run 2>&1 | tail -30
```

Expected: all tests pass. The 2 pre-existing failures on `main` (ElevenLabs voice ID, settings bg-white) are not regressions from this plan.

- [ ] **Step 10.2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 10.3: Lint**

```bash
npm run lint 2>&1 | grep "error" | head -20
```

Expected: no new errors.

---

## Self-Review

| Spec §4 requirement | Task |
|---|---|
| AAC: Fitzgerald color coding | Tasks 3, 4 |
| AAC: image per button (URL) | Task 3 (editor), Task 4 (runtime) |
| AAC: motor planning grid | Task 4 |
| AAC: sentence strip | Tasks 3, 4 |
| Token: animated token fill | Tasks 1, 5 |
| Token: completion celebration | Task 5 |
| Token: reward image in celebration | Task 5 |
| Token: undo last token | Task 5 |
| Visual schedule: countdown timer | Task 6 |
| Visual schedule: per-step checkmark animation | Tasks 1, 6 |
| Visual schedule: all-done overlay | Task 6 |
| Matching game: difficulty wired to content | Tasks 2, 7 |
| Matching game: shake animation on incorrect | Tasks 1, 7 |
| Matching game: prompt image support | Task 7 |
| Session: URL param detection | Task 9 |
| Session: context banner with elapsed time | Task 8 |
| Session: floating SLP dot + panel | Task 8 |
| Session: post-session summary | Task 9 |

**Bundled SVG symbol library** (~200 symbols): explicitly out of scope. The `imageUrl` URL input covers the use case via pasted URLs now. Symbol library requires separate sourcing, search UI, and bundle size decisions — that is a standalone follow-up.
