# Builder UI — Claude.ai Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Bridges builder UI to match Claude.ai's layout — full-viewport home screen with time-aware greeting + textarea input, and a toolbar-free two-column chat+preview layout.

**Architecture:** `BuilderToolbar` is deleted. Two new column components (`ChatColumn`, `PreviewColumn`) take over the active-session layout. A new `HomeScreen` replaces the empty-state JSX in `BuilderPage`. Shared `InputBar` and `ArtifactCard` components are extracted as reusable leaves.

**Tech Stack:** Next.js 15 App Router, Convex React, Clerk (`useUser`), shadcn/ui, Tailwind v4, Vitest + React Testing Library

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/features/builder/components/input-bar.tsx` | Shared textarea + action-row input card |
| **Create** | `src/features/builder/components/artifact-card.tsx` | Inline artifact/generation indicator in chat |
| **Create** | `src/features/builder/components/home-screen.tsx` | Full-viewport empty/home state |
| **Create** | `src/features/builder/components/chat-column.tsx` | Left panel: header + messages + input |
| **Create** | `src/features/builder/components/preview-column.tsx` | Right panel: header + preview/code |
| **Modify** | `src/features/builder/components/chat-panel.tsx` | Remove input form; redesign message bubbles |
| **Modify** | `src/features/builder/components/builder-page.tsx` | Wire new layout; remove toolbar import |
| **Delete** | `src/features/builder/components/builder-toolbar.tsx` | Deleted entirely |
| **Create** | `src/features/builder/components/__tests__/input-bar.test.tsx` | |
| **Create** | `src/features/builder/components/__tests__/artifact-card.test.tsx` | |
| **Create** | `src/features/builder/components/__tests__/home-screen.test.tsx` | |
| **Modify** | `src/features/builder/components/__tests__/chat-panel.test.tsx` | Remove input assertions; update generating/live |
| **Delete** | `src/features/builder/components/__tests__/builder-toolbar.test.tsx` | Deleted with component |
| **Modify** | `src/features/builder/components/__tests__/builder-page.test.tsx` | Remove toolbar assertions; assert HomeScreen |

---

## Task 1: InputBar component

**Files:**
- Create: `src/features/builder/components/input-bar.tsx`
- Create: `src/features/builder/components/__tests__/input-bar.test.tsx`

- [ ] **Step 1.1: Write the failing test**

Create `src/features/builder/components/__tests__/input-bar.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/voice-input", () => ({
  VoiceInput: ({ disabled }: { disabled: boolean }) => (
    <button data-testid="voice-input" disabled={disabled}>Voice</button>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

import { InputBar } from "../input-bar";

const baseProps = {
  value: "",
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  isGenerating: false,
};

describe("InputBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a textarea with the given placeholder", () => {
    render(<InputBar {...baseProps} placeholder="What would you like to build?" />);
    expect(screen.getByRole("textbox", { name: /what would you like/i })).toBeInTheDocument();
  });

  it("calls onChange when textarea value changes", () => {
    const onChange = vi.fn();
    render(<InputBar {...baseProps} onChange={onChange} value="" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } });
    expect(onChange).toHaveBeenCalledWith("Hello");
  });

  it("calls onSubmit when Enter is pressed without Shift", () => {
    const onSubmit = vi.fn();
    render(<InputBar {...baseProps} value="Build me an AAC board" onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith("Build me an AAC board");
  });

  it("does NOT submit on Shift+Enter", () => {
    const onSubmit = vi.fn();
    render(<InputBar {...baseProps} value="hello" onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit when send button is clicked", () => {
    const onSubmit = vi.fn();
    render(<InputBar {...baseProps} value="Build something" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSubmit).toHaveBeenCalledWith("Build something");
  });

  it("send button is disabled when value is empty", () => {
    render(<InputBar {...baseProps} value="" />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("send button is disabled when isGenerating is true", () => {
    render(<InputBar {...baseProps} value="hello" isGenerating={true} />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("textarea is disabled when isGenerating is true", () => {
    render(<InputBar {...baseProps} isGenerating={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("renders Guided pill when showGuidedPill is true", () => {
    render(<InputBar {...baseProps} showGuidedPill onGuidedClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /guided/i })).toBeInTheDocument();
  });

  it("does NOT render Guided pill when showGuidedPill is false", () => {
    render(<InputBar {...baseProps} showGuidedPill={false} />);
    expect(screen.queryByRole("button", { name: /guided/i })).not.toBeInTheDocument();
  });

  it("clicking Guided pill calls onGuidedClick", () => {
    const onGuidedClick = vi.fn();
    render(<InputBar {...baseProps} showGuidedPill onGuidedClick={onGuidedClick} />);
    fireEvent.click(screen.getByRole("button", { name: /guided/i }));
    expect(onGuidedClick).toHaveBeenCalled();
  });

  it("renders VoiceInput", () => {
    render(<InputBar {...baseProps} />);
    expect(screen.getByTestId("voice-input")).toBeInTheDocument();
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/input-bar.test.tsx
```

Expected: FAIL — "Cannot find module '../input-bar'"

- [ ] **Step 1.3: Implement InputBar**

Create `src/features/builder/components/input-bar.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { VoiceInput } from "@/shared/components/voice-input";

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  isGenerating: boolean;
  className?: string;
  showGuidedPill?: boolean;
  onGuidedClick?: () => void;
}

export function InputBar({
  value,
  onChange,
  onSubmit,
  placeholder = "What would you like to build?",
  isGenerating,
  className,
  showGuidedPill,
  onGuidedClick,
}: InputBarProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isGenerating) {
        onSubmit(value.trim());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isGenerating) {
      onSubmit(value.trim());
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-2xl border border-outline-variant/20 bg-white px-4 pb-3 pt-3 shadow-sm",
        className,
      )}
    >
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isGenerating}
        rows={1}
        aria-label={placeholder}
        className="w-full resize-none overflow-hidden bg-transparent text-sm outline-none placeholder:text-on-surface-variant/40 disabled:opacity-60"
        style={{ minHeight: "24px", maxHeight: "200px" }}
      />
      <div className="mt-2 flex items-center gap-2 border-t border-outline-variant/10 pt-2">
        <VoiceInput
          onTranscript={(text) => onChange(value ? `${value} ${text}` : text)}
          disabled={isGenerating}
        />
        {showGuidedPill && (
          <button
            type="button"
            onClick={onGuidedClick}
            aria-label="Guided"
            className="flex items-center gap-1.5 rounded-full border border-outline-variant/40 px-3 py-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <span className="h-2 w-2 rounded-full bg-primary/60" />
            Guided
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-on-surface-variant/40">Bridges AI</span>
        <button
          type="submit"
          disabled={!value.trim() || isGenerating}
          aria-label="Send"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-sm transition-opacity disabled:opacity-40"
        >
          <MaterialIcon icon="arrow_upward" size="xs" />
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/input-bar.test.tsx
```

Expected: All 12 tests PASS

- [ ] **Step 1.5: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/builder/components/input-bar.tsx src/features/builder/components/__tests__/input-bar.test.tsx && git commit -m "feat(builder): add InputBar component — shared textarea + action row"
```

---

## Task 2: ArtifactCard component

**Files:**
- Create: `src/features/builder/components/artifact-card.tsx`
- Create: `src/features/builder/components/__tests__/artifact-card.test.tsx`

- [ ] **Step 2.1: Write the failing test**

Create `src/features/builder/components/__tests__/artifact-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

import { ArtifactCard } from "../artifact-card";

describe("ArtifactCard", () => {
  it("renders the app title", () => {
    render(<ArtifactCard title="AAC Board" isGenerating={false} />);
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
  });

  it("renders 'Therapy app' subtitle", () => {
    render(<ArtifactCard title="Token Board" isGenerating={false} />);
    expect(screen.getByText("Therapy app")).toBeInTheDocument();
  });

  it("shows spinner with role=status when isGenerating is true", () => {
    render(<ArtifactCard title="AAC Board" isGenerating={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does NOT show spinner when isGenerating is false", () => {
    render(<ArtifactCard title="AAC Board" isGenerating={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/artifact-card.test.tsx
```

Expected: FAIL — "Cannot find module '../artifact-card'"

- [ ] **Step 2.3: Implement ArtifactCard**

Create `src/features/builder/components/artifact-card.tsx`:

```tsx
"use client";

import { MaterialIcon } from "@/shared/components/material-icon";

interface ArtifactCardProps {
  title: string;
  isGenerating: boolean;
}

export function ArtifactCard({ title, isGenerating }: ArtifactCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant">Therapy app</p>
        </div>
        <MaterialIcon
          icon="disabled_by_default"
          size="sm"
          className="text-on-surface-variant/50"
        />
      </div>
      {isGenerating && (
        <div
          role="status"
          aria-label="Building your app"
          className="ml-1 h-6 w-6 animate-spin rounded-full border-2 border-dashed border-primary/40"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/artifact-card.test.tsx
```

Expected: All 4 tests PASS

- [ ] **Step 2.5: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/builder/components/artifact-card.tsx src/features/builder/components/__tests__/artifact-card.test.tsx && git commit -m "feat(builder): add ArtifactCard — inline generation indicator"
```

---

## Task 3: Redesign ChatPanel — remove input, redesign message bubbles

**Files:**
- Modify: `src/features/builder/components/chat-panel.tsx`
- Modify: `src/features/builder/components/__tests__/chat-panel.test.tsx`

**What changes:**
- `UserMessage`: left-aligned, dark bubble (`bg-on-surface/90 text-white`), user avatar initials from Clerk
- `AssistantMessage`: no bubble, plain markdown, Bridges "B" logo icon
- Remove `onGenerate` from `ChatPanelProps` (input moved to `InputBar`)
- Remove the `<form>` at the bottom (lines 221–261 in current file)
- Remove `VoiceInput` import (moved to `InputBar`)
- Remove `SuggestionChips` (moved to `HomeScreen`)
- Remove empty state (moved to `HomeScreen`)
- Replace `ProgressCard` with `ArtifactCard` + spinner during generating
- Replace live success banner with nothing (preview panel shows the app)

- [ ] **Step 3.1: Update chat-panel.test.tsx to remove broken assertions and add new ones**

Replace the contents of `src/features/builder/components/__tests__/chat-panel.test.tsx` with:

```tsx
// src/features/builder/components/__tests__/chat-panel.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockUseQuery = vi.fn().mockReturnValue([]);
vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useAction: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam", lastName: "Lee" } }),
}));

vi.mock("../../hooks/use-streaming", () => ({
  useStreaming: vi.fn().mockReturnValue({
    status: "idle",
    files: [],
    generate: vi.fn(),
    blueprint: null,
    error: null,
    sessionId: null,
  }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

import { ChatPanel } from "../chat-panel";

const defaultProps = {
  sessionId: null as string | null,
  status: "idle" as const,
  blueprint: null as Record<string, unknown> | null,
  error: null as string | null,
  streamingText: "",
  activities: [] as { id: string; type: "thinking" | "writing_file" | "file_written" | "complete"; message: string; path?: string; timestamp: number }[],
  narrationMessage: null as string | null,
  appTitle: "Untitled App",
};

describe("ChatPanel — message rendering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    render(<ChatPanel {...defaultProps} />);
  });

  it("shows user messages with avatar initials", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "user", content: "Build a token board", timestamp: 1 },
    ]);
    render(<ChatPanel {...defaultProps} sessionId="session_123" />);
    expect(screen.getByText("Build a token board")).toBeInTheDocument();
    expect(screen.getByText("SL")).toBeInTheDocument(); // Sam Lee initials
    mockUseQuery.mockReturnValue([]);
  });

  it("shows assistant messages without a bubble wrapper", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg2", role: "assistant", content: "I'll build your token board now.", timestamp: 2 },
    ]);
    render(<ChatPanel {...defaultProps} sessionId="session_123" />);
    expect(screen.getByText(/build your token board/i)).toBeInTheDocument();
    mockUseQuery.mockReturnValue([]);
  });

  it("shows blueprint card when blueprint is provided", () => {
    render(
      <ChatPanel
        {...defaultProps}
        blueprint={{ title: "Token Reward Board", therapyGoal: "Positive reinforcement" }}
      />
    );
    expect(screen.getByText(/Token Reward Board/)).toBeInTheDocument();
  });

  it("shows ArtifactCard with app title when status is generating", () => {
    render(<ChatPanel {...defaultProps} status="generating" appTitle="AAC Board" />);
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows ArtifactCard without spinner when status is live", () => {
    render(<ChatPanel {...defaultProps} status="live" appTitle="AAC Board" />);
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows soft error message when error is set", () => {
    render(<ChatPanel {...defaultProps} error="Claude API unavailable" />);
    expect(screen.getByText(/we hit a small bump/i)).toBeInTheDocument();
    expect(screen.queryByText(/Claude API unavailable/i)).not.toBeInTheDocument();
  });

  it("shows Retry button when error is set and onRetry is provided", () => {
    render(<ChatPanel {...defaultProps} error="Something went wrong" onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not show Retry button when onRetry is not provided", () => {
    render(<ChatPanel {...defaultProps} error="Something went wrong" />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("shows system messages", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "system", content: "Session started", timestamp: 1 },
    ]);
    render(<ChatPanel {...defaultProps} sessionId="session_123" />);
    expect(screen.getByText("Session started")).toBeInTheDocument();
    mockUseQuery.mockReturnValue([]);
  });

  it("does NOT render an input form", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run updated tests to see which fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/chat-panel.test.tsx
```

Expected: Several FAIL — "does NOT render an input form" likely passes, avatar tests fail.

- [ ] **Step 3.3: Rewrite chat-panel.tsx**

Replace `src/features/builder/components/chat-panel.tsx` with:

```tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Activity, StreamingStatus } from "../hooks/use-streaming";
import type { TherapyBlueprint } from "../lib/schemas";
import { ArtifactCard } from "./artifact-card";
import { BlueprintCard } from "./blueprint-card";

function UserMessage({ content }: { content: string }) {
  const { user } = useUser();
  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-on-surface text-xs font-semibold text-white">
        {initials}
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-on-surface/90 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm text-white">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (isStreaming && !content) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        B
      </div>
      <div className="min-w-0 flex-1">
        <div className="overflow-x-auto text-sm text-on-surface [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface-container-lowest [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:ml-4 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-container-lowest [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:ml-4 [&_ul]:list-disc">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {content}
          </ReactMarkdown>
        </div>
        {isStreaming ? (
          <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-primary/60" />
        ) : null}
      </div>
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-center">
      <div className="rounded-full bg-surface-container-low px-4 py-1.5">
        <p className="text-xs text-on-surface-variant">{content}</p>
      </div>
    </div>
  );
}

interface ChatPanelProps {
  sessionId: string | null;
  status: StreamingStatus;
  blueprint: TherapyBlueprint | null;
  error: string | null;
  onRetry?: () => void;
  streamingText: string;
  activities: Activity[];
  pendingPrompt?: string | null;
  onPendingPromptClear?: () => void;
  narrationMessage?: string | null;
  startTime?: number;
  appTitle: string;
}

export function ChatPanel({
  sessionId,
  status,
  blueprint,
  error,
  onRetry,
  streamingText,
  activities,
  pendingPrompt,
  onPendingPromptClear,
  appTitle,
}: ChatPanelProps) {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.messages.list,
    sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip",
  );

  const isGenerating = status === "generating";
  const isLive = status === "live";

  useEffect(() => {
    if (pendingPrompt && messages && messages.some((m) => m.role === "user")) {
      onPendingPromptClear?.();
    }
  }, [messages, pendingPrompt, onPendingPromptClear]);

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length, streamingText, activities.length, isGenerating, isLive, pendingPrompt]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-4">
        {pendingPrompt && (!messages || !messages.some((m) => m.role === "user")) && (
          <UserMessage content={pendingPrompt} />
        )}

        {messages?.map((msg: { _id: string; role: string; content: string }) => {
          if (msg.role === "user") return <UserMessage key={msg._id} content={msg.content} />;
          if (msg.role === "system") return <SystemMessage key={msg._id} content={msg.content} />;
          return <AssistantMessage key={msg._id} content={msg.content} />;
        })}

        {streamingText && <AssistantMessage content={streamingText} isStreaming />}

        {blueprint ? <BlueprintCard blueprint={blueprint} /> : null}

        {(isGenerating || isLive) && (
          <ArtifactCard title={appTitle} isGenerating={isGenerating} />
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">We hit a small bump</p>
            <p className="mt-1 text-xs text-destructive/80">Want to try again?</p>
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive hover:text-destructive"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/chat-panel.test.tsx
```

Expected: All tests PASS

- [ ] **Step 3.5: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/builder/components/chat-panel.tsx src/features/builder/components/__tests__/chat-panel.test.tsx && git commit -m "feat(builder): redesign ChatPanel — Claude-style message bubbles, remove input form"
```

---

## Task 4: HomeScreen component

**Files:**
- Create: `src/features/builder/components/home-screen.tsx`
- Create: `src/features/builder/components/__tests__/home-screen.test.tsx`

- [ ] **Step 4.1: Write the failing test**

Create `src/features/builder/components/__tests__/home-screen.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam" } }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

vi.mock("../input-bar", () => ({
  InputBar: ({ value, onChange, onSubmit, placeholder, showGuidedPill, onGuidedClick }: any) => (
    <div>
      <textarea
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) onSubmit(value);
        }}
      />
      <button onClick={() => onSubmit(value)}>Send</button>
      {showGuidedPill && <button onClick={onGuidedClick}>Guided</button>}
    </div>
  ),
}));

vi.mock("../continue-card", () => ({
  ContinueCard: ({ title }: { title: string }) => <div>Continue: {title}</div>,
}));

vi.mock("../interview/interview-controller", () => ({
  InterviewController: ({ onEscapeHatch }: any) => (
    <div>
      <span>Interview</span>
      <button onClick={onEscapeHatch}>Back</button>
    </div>
  ),
}));

import { HomeScreen } from "../home-screen";

const baseProps = {
  onGenerate: vi.fn(),
};

describe("HomeScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a time-aware greeting with the user's first name", () => {
    render(<HomeScreen {...baseProps} />);
    expect(screen.getByText(/Sam/)).toBeInTheDocument();
    // One of: "Good morning", "Good afternoon", "Good evening"
    const greeting = screen.getByText(/Good (morning|afternoon|evening), Sam/);
    expect(greeting).toBeInTheDocument();
  });

  it("renders category chips", () => {
    render(<HomeScreen {...baseProps} />);
    expect(screen.getByRole("button", { name: /Communication Board/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Visual Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Token Board/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Social Story/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Feelings Check-In/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bridges' choice/i })).toBeInTheDocument();
  });

  it("clicking a category chip pre-fills the textarea", () => {
    render(<HomeScreen {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Communication Board/i }));
    const textarea = screen.getByRole("textbox");
    expect((textarea as HTMLTextAreaElement).value).toMatch(/communication board/i);
  });

  it("clicking Guided shows the InterviewController", () => {
    render(<HomeScreen {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Guided/i }));
    expect(screen.getByText("Interview")).toBeInTheDocument();
  });

  it("InterviewController Back button returns to home screen", () => {
    render(<HomeScreen {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Guided/i }));
    expect(screen.getByText("Interview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.queryByText("Interview")).not.toBeInTheDocument();
    expect(screen.getByText(/Good (morning|afternoon|evening), Sam/)).toBeInTheDocument();
  });

  it("shows ContinueCard when mostRecent is provided", () => {
    render(
      <HomeScreen
        {...baseProps}
        mostRecent={{ _id: "sess_1", title: "My AAC App" } as any}
        onContinueDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/Continue: My AAC App/)).toBeInTheDocument();
  });

  it("does NOT show ContinueCard when mostRecent is null", () => {
    render(<HomeScreen {...baseProps} mostRecent={null} onContinueDismiss={vi.fn()} />);
    expect(screen.queryByText(/Continue:/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/home-screen.test.tsx
```

Expected: FAIL — "Cannot find module '../home-screen'"

- [ ] **Step 4.3: Implement HomeScreen**

Create `src/features/builder/components/home-screen.tsx`:

```tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import { ContinueCard } from "./continue-card";
import { InputBar } from "./input-bar";
import { InterviewController } from "./interview/interview-controller";
import type { TherapyBlueprint } from "../lib/schemas";
import type { Id } from "../../../../convex/_generated/dataModel";

const CATEGORY_CHIPS: { label: string; prompt: string }[] = [
  { label: "Communication Board", prompt: "I need a communication board for a child who " },
  { label: "Visual Schedule", prompt: "I need a visual schedule for " },
  { label: "Token Board", prompt: "I need a token board for a child working on " },
  { label: "Social Story", prompt: "I need a social story about " },
  { label: "Feelings Check-In", prompt: "I need a feelings check-in tool for " },
  { label: "Bridges' choice", prompt: "Build me something useful for a child with " },
];

function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good morning, ${firstName}`;
  if (hour >= 12 && hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

interface HomeScreenProps {
  onGenerate: (prompt: string, blueprint?: TherapyBlueprint) => void;
  mostRecent?: { _id: Id<"sessions">; title: string } | null;
  onContinueDismiss?: () => void;
}

export function HomeScreen({ onGenerate, mostRecent, onContinueDismiss }: HomeScreenProps) {
  const { user } = useUser();
  const firstName = user?.firstName ?? "there";
  const [input, setInput] = useState("");
  const [showGuided, setShowGuided] = useState(false);

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    onGenerate(value.trim());
    setInput("");
  };

  const handleGuidedGenerate = (prompt: string, blueprint?: TherapyBlueprint) => {
    onGenerate(prompt, blueprint);
    setShowGuided(false);
  };

  if (showGuided) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="text-center">
          <h1 className="font-headline text-3xl font-normal text-foreground">
            What would you like to build?
          </h1>
        </div>
        <div className="w-full max-w-2xl">
          <InterviewController
            onGenerate={handleGuidedGenerate}
            onEscapeHatch={() => setShowGuided(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-lg font-bold text-white shadow-sm">
          B
        </div>
        <h1 className="font-headline text-4xl font-normal text-foreground">
          {getGreeting(firstName)}
        </h1>
      </div>

      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder="What would you like to build?"
        isGenerating={false}
        className="w-full max-w-2xl"
        showGuidedPill
        onGuidedClick={() => setShowGuided(true)}
      />

      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setInput(chip.prompt)}
            className="rounded-full border border-outline-variant/30 bg-surface px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {mostRecent && (
        <ContinueCard
          sessionId={mostRecent._id}
          title={mostRecent.title}
          onDismiss={() => onContinueDismiss?.()}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/home-screen.test.tsx
```

Expected: All 7 tests PASS

- [ ] **Step 4.5: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/builder/components/home-screen.tsx src/features/builder/components/__tests__/home-screen.test.tsx && git commit -m "feat(builder): add HomeScreen — Claude-style greeting + input + category chips"
```

---

## Task 5: ChatColumn component

**Files:**
- Create: `src/features/builder/components/chat-column.tsx`
- Create: `src/features/builder/components/__tests__/chat-column.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `src/features/builder/components/__tests__/chat-column.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue([]),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useAction: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam", lastName: "Lee" } }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("../chat-panel", () => ({
  ChatPanel: ({ status }: any) => <div data-testid="chat-panel" data-status={status} />,
}));

vi.mock("../input-bar", () => ({
  InputBar: ({ onSubmit, value, onChange }: any) => (
    <div>
      <input
        data-testid="input-bar-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={() => onSubmit(value)}>Send</button>
    </div>
  ),
}));

vi.mock("../patient-context-card", () => ({
  PatientContextCard: () => <div data-testid="patient-context-card" />,
}));

import { ChatColumn } from "../chat-column";

const baseProps = {
  sessionId: null as string | null,
  status: "idle" as const,
  blueprint: null,
  error: null,
  onGenerate: vi.fn(),
  streamingText: "",
  activities: [],
  appName: "My Token App",
  startTime: Date.now(),
};

describe("ChatColumn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    render(<ChatColumn {...baseProps} />);
  });

  it("shows the app name in the header", () => {
    render(<ChatColumn {...baseProps} appName="My Token App" />);
    expect(screen.getByText("My Token App")).toBeInTheDocument();
  });

  it("clicking app name calls onNameEditStart", () => {
    const onNameEditStart = vi.fn();
    render(<ChatColumn {...baseProps} onNameEditStart={onNameEditStart} />);
    fireEvent.click(screen.getByRole("button", { name: /My Token App/i }));
    expect(onNameEditStart).toHaveBeenCalled();
  });

  it("isEditingName=true renders an input instead of button", () => {
    render(<ChatColumn {...baseProps} isEditingName />);
    expect(screen.getByRole("textbox", { name: /app name/i })).toBeInTheDocument();
  });

  it("input blur calls onNameEditEnd", () => {
    const onNameEditEnd = vi.fn();
    render(<ChatColumn {...baseProps} isEditingName onNameEditEnd={onNameEditEnd} />);
    fireEvent.blur(screen.getByRole("textbox", { name: /app name/i }), {
      target: { value: "New Name" },
    });
    expect(onNameEditEnd).toHaveBeenCalled();
  });

  it("renders ChatPanel", () => {
    render(<ChatColumn {...baseProps} />);
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  it("renders InputBar", () => {
    render(<ChatColumn {...baseProps} />);
    expect(screen.getByTestId("input-bar-textarea")).toBeInTheDocument();
  });

  it("submitting InputBar calls onGenerate", () => {
    const onGenerate = vi.fn();
    render(<ChatColumn {...baseProps} onGenerate={onGenerate} />);
    fireEvent.change(screen.getByTestId("input-bar-textarea"), {
      target: { value: "Build an AAC board" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onGenerate).toHaveBeenCalledWith("Build an AAC board");
  });

  it("renders PatientContextCard when patientId is provided", () => {
    render(<ChatColumn {...baseProps} patientId={"patient_abc12345678901234567890123" as any} />);
    expect(screen.getByTestId("patient-context-card")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/chat-column.test.tsx
```

Expected: FAIL — "Cannot find module '../chat-column'"

- [ ] **Step 5.3: Implement ChatColumn**

Create `src/features/builder/components/chat-column.tsx`:

```tsx
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Input } from "@/shared/components/ui/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { Activity, StreamingStatus } from "../hooks/use-streaming";
import type { TherapyBlueprint } from "../lib/schemas";
import { ChatPanel } from "./chat-panel";
import { InputBar } from "./input-bar";
import { PatientContextCard } from "./patient-context-card";

interface ChatColumnProps {
  sessionId: string | null;
  status: StreamingStatus;
  blueprint: TherapyBlueprint | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
  onRetry?: () => void;
  streamingText: string;
  activities: Activity[];
  pendingPrompt?: string | null;
  onPendingPromptClear?: () => void;
  narrationMessage?: string | null;
  startTime: number;
  appName: string;
  isEditingName?: boolean;
  onNameEditStart?: () => void;
  onNameEditEnd?: (name: string) => void;
  patientId?: Id<"patients"> | null;
  isMobile?: boolean;
  mobilePanel?: "chat" | "preview";
  onMobilePanelChange?: (panel: "chat" | "preview") => void;
}

export function ChatColumn({
  sessionId,
  status,
  blueprint,
  error,
  onGenerate,
  onRetry,
  streamingText,
  activities,
  pendingPrompt,
  onPendingPromptClear,
  narrationMessage,
  startTime,
  appName,
  isEditingName,
  onNameEditStart,
  onNameEditEnd,
  patientId,
  isMobile,
  mobilePanel,
  onMobilePanelChange,
}: ChatColumnProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    onGenerate(value.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center gap-3 border-b border-outline-variant/20 px-4">
        <MaterialIcon
          icon="menu"
          size="sm"
          className="shrink-0 text-on-surface-variant/40"
        />

        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <Input
              autoFocus
              defaultValue={appName}
              maxLength={100}
              aria-label="App name"
              className="h-auto rounded-none border-0 border-b-2 border-b-primary/50 bg-transparent px-0 py-0 text-[13px] font-semibold tracking-tight text-primary outline-none focus-visible:border-transparent focus-visible:border-b-primary focus-visible:bg-transparent"
              onBlur={(e) => onNameEditEnd?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onNameEditEnd?.((e.target as HTMLInputElement).value);
                if (e.key === "Escape") onNameEditEnd?.(appName);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={onNameEditStart}
              className="flex items-center gap-1 truncate text-[13px] font-semibold tracking-tight text-foreground hover:text-primary"
              title="Click to rename"
            >
              <span className="truncate">{appName}</span>
              <MaterialIcon icon="expand_more" size="xs" className="shrink-0 text-on-surface-variant/40" />
            </button>
          )}
        </div>

        {/* Mobile panel toggle */}
        {isMobile && onMobilePanelChange && (
          <ToggleGroup
            type="single"
            value={mobilePanel}
            onValueChange={(value) => {
              if (value) onMobilePanelChange(value as "chat" | "preview");
            }}
            className="rounded-lg bg-surface-container-high p-1"
          >
            <ToggleGroupItem
              value="chat"
              aria-label="Chat"
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
                mobilePanel === "chat"
                  ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                  : "bg-transparent text-on-surface-variant hover:text-primary",
              )}
            >
              Chat
            </ToggleGroupItem>
            <ToggleGroupItem
              value="preview"
              aria-label="Preview"
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
                mobilePanel === "preview"
                  ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                  : "bg-transparent text-on-surface-variant hover:text-primary",
              )}
            >
              Preview
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {/* Patient context */}
      {patientId ? <PatientContextCard patientId={patientId} /> : null}

      {/* Messages */}
      <ChatPanel
        sessionId={sessionId}
        status={status}
        blueprint={blueprint}
        error={error}
        onRetry={onRetry}
        streamingText={streamingText}
        activities={activities}
        pendingPrompt={pendingPrompt}
        onPendingPromptClear={onPendingPromptClear}
        narrationMessage={narrationMessage}
        startTime={startTime}
        appTitle={appName}
      />

      {/* Sticky input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <InputBar
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={
            status === "live"
              ? "Reply to Bridges AI\u2026"
              : "What would you like to build\u2026"
          }
          isGenerating={status === "generating"}
          showGuidedPill
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/chat-column.test.tsx
```

Expected: All 9 tests PASS

- [ ] **Step 5.5: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/builder/components/chat-column.tsx src/features/builder/components/__tests__/chat-column.test.tsx && git commit -m "feat(builder): add ChatColumn — header + messages + sticky InputBar"
```

---

## Task 6: PreviewColumn component

**Files:**
- Create: `src/features/builder/components/preview-column.tsx`
- Create: `src/features/builder/components/__tests__/preview-column.test.tsx`

- [ ] **Step 6.1: Write the failing test**

Create `src/features/builder/components/__tests__/preview-column.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock("../preview-panel", () => ({
  PreviewPanel: () => <div data-testid="preview-panel" />,
}));

vi.mock("../code-panel", () => ({
  CodePanel: () => <div data-testid="code-panel" />,
}));

import { PreviewColumn } from "../preview-column";

const baseProps = {
  bundleHtml: null as string | null,
  status: "idle" as const,
  deviceSize: "desktop" as const,
  buildFailed: false,
  viewMode: "preview" as const,
  onViewChange: vi.fn(),
  files: [],
};

describe("PreviewColumn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    render(<PreviewColumn {...baseProps} />);
  });

  it("shows PreviewPanel when viewMode is 'preview'", () => {
    render(<PreviewColumn {...baseProps} viewMode="preview" />);
    expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
  });

  it("shows CodePanel when viewMode is 'code'", () => {
    render(<PreviewColumn {...baseProps} viewMode="code" />);
    expect(screen.getByTestId("code-panel")).toBeInTheDocument();
  });

  it("clicking eye icon calls onViewChange with 'preview'", () => {
    const onViewChange = vi.fn();
    render(<PreviewColumn {...baseProps} viewMode="code" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(onViewChange).toHaveBeenCalledWith("preview");
  });

  it("clicking code icon calls onViewChange with 'code'", () => {
    const onViewChange = vi.fn();
    render(<PreviewColumn {...baseProps} viewMode="preview" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole("button", { name: /source/i }));
    expect(onViewChange).toHaveBeenCalledWith("code");
  });

  it("shows Publish button", () => {
    render(<PreviewColumn {...baseProps} />);
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
  });

  it("clicking Publish calls onPublish", () => {
    const onPublish = vi.fn();
    render(<PreviewColumn {...baseProps} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    expect(onPublish).toHaveBeenCalled();
  });

  it("clicking X calls onClose", () => {
    const onClose = vi.fn();
    render(<PreviewColumn {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows 'v1' label when bundleHtml is present", () => {
    render(<PreviewColumn {...baseProps} bundleHtml="<html></html>" />);
    expect(screen.getByText("v1")).toBeInTheDocument();
  });

  it("does NOT show 'v1' label when bundleHtml is null", () => {
    render(<PreviewColumn {...baseProps} bundleHtml={null} />);
    expect(screen.queryByText("v1")).not.toBeInTheDocument();
  });

  it("Copy button copies bundleHtml to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PreviewColumn {...baseProps} bundleHtml="<html>test</html>" />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("<html>test</html>");
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/preview-column.test.tsx
```

Expected: FAIL — "Cannot find module '../preview-column'"

- [ ] **Step 6.3: Implement PreviewColumn**

Create `src/features/builder/components/preview-column.tsx`:

```tsx
"use client";

import { toast } from "sonner";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { StreamingStatus } from "../hooks/use-streaming";
import { CodePanel } from "./code-panel";
import { PreviewPanel } from "./preview-panel";

export type DeviceSize = "mobile" | "desktop";
export type ViewMode = "preview" | "code";

interface PreviewColumnProps {
  bundleHtml: string | null;
  status: StreamingStatus;
  error?: string;
  deviceSize: DeviceSize;
  buildFailed: boolean;
  activityMessage?: string;
  onRetry?: () => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  files: { path: string; contents: string }[];
  onPublish?: () => void;
  onClose?: () => void;
}

export function PreviewColumn({
  bundleHtml,
  status,
  error,
  deviceSize,
  buildFailed,
  activityMessage,
  onRetry,
  viewMode,
  onViewChange,
  files,
  onPublish,
  onClose,
}: PreviewColumnProps) {
  const handleCopy = () => {
    if (!bundleHtml) return;
    navigator.clipboard.writeText(bundleHtml).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-outline-variant/20 px-3">
        {/* View toggle tabs */}
        <button
          type="button"
          aria-label="Preview"
          onClick={() => onViewChange("preview")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
            viewMode === "preview"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <MaterialIcon icon="visibility" size="xs" />
        </button>
        <button
          type="button"
          aria-label="Source"
          onClick={() => onViewChange("code")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
            viewMode === "code"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <MaterialIcon icon="code" size="xs" />
        </button>

        {/* Version label */}
        {bundleHtml && (
          <span className="text-xs text-on-surface-variant/50">v1</span>
        )}

        <div className="flex-1" />

        {/* Refresh */}
        {onRetry && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            onClick={onRetry}
            className="h-8 w-8 text-on-surface-variant hover:text-on-surface"
          >
            <MaterialIcon icon="refresh" size="xs" />
          </Button>
        )}

        {/* Copy */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Copy"
          onClick={handleCopy}
          disabled={!bundleHtml}
          className="h-8 gap-1 px-2 text-xs font-semibold text-on-surface-variant"
        >
          Copy
          <MaterialIcon icon="expand_more" size="xs" />
        </Button>

        {/* Publish */}
        <Button
          size="sm"
          aria-label="Publish"
          onClick={onPublish}
          className="h-8 bg-gradient-to-br from-primary to-primary-container px-3 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          Publish
        </Button>

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={onClose}
          className="h-8 w-8 text-on-surface-variant hover:text-on-surface"
        >
          <MaterialIcon icon="close" size="xs" />
        </Button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {viewMode === "preview" ? (
          <PreviewPanel
            bundleHtml={bundleHtml}
            state={status}
            error={error}
            deviceSize={deviceSize}
            buildFailed={buildFailed}
            activityMessage={activityMessage}
            onRetry={onRetry}
          />
        ) : (
          <CodePanel files={files} status={status} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/preview-column.test.tsx
```

Expected: All 11 tests PASS

- [ ] **Step 6.5: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add src/features/builder/components/preview-column.tsx src/features/builder/components/__tests__/preview-column.test.tsx && git commit -m "feat(builder): add PreviewColumn — eye/code tabs, Copy, Publish, X header"
```

---

## Task 7: Rebuild BuilderPage + delete BuilderToolbar

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`
- Modify: `src/features/builder/components/__tests__/builder-page.test.tsx`
- Delete: `src/features/builder/components/builder-toolbar.tsx`
- Delete: `src/features/builder/components/__tests__/builder-toolbar.test.tsx`

- [ ] **Step 7.1: Update builder-page.test.tsx**

Replace `src/features/builder/components/__tests__/builder-page.test.tsx` with:

```tsx
// src/features/builder/components/__tests__/builder-page.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockGet = vi.fn().mockReturnValue(null);
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
  useMutation: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null)),
  useAction: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null)),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam", lastName: "Lee" } }),
}));

vi.mock("@/core/hooks/use-mobile", () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

const mockResumeSession = vi.fn();
vi.mock("../../hooks/use-streaming", () => ({
  useStreaming: vi.fn().mockReturnValue({
    status: "idle",
    files: [],
    generate: vi.fn(),
    resumeSession: mockResumeSession,
    blueprint: null,
    appName: null,
    error: null,
    sessionId: null,
    streamingText: "",
    activities: [],
    bundleHtml: null,
    buildFailed: false,
    notableMessage: null,
    reset: vi.fn(),
  }),
}));

vi.mock("../home-screen", () => ({
  HomeScreen: () => <div data-testid="home-screen" />,
}));

vi.mock("../chat-column", () => ({
  ChatColumn: () => <div data-testid="chat-column" />,
}));

vi.mock("../preview-column", () => ({
  PreviewColumn: () => <div data-testid="preview-column" />,
}));

vi.mock("@/shared/components/share-dialog", () => ({
  ShareDialog: () => null,
}));

vi.mock("@/shared/components/fullscreen-app-view", () => ({
  FullscreenAppView: () => null,
}));

import { BuilderPage } from "../builder-page";

describe("BuilderPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    render(<BuilderPage initialSessionId={null} />);
  });

  it("shows HomeScreen when status is idle and no session", () => {
    render(<BuilderPage initialSessionId={null} />);
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
  });

  it("does NOT render a BuilderToolbar", () => {
    render(<BuilderPage initialSessionId={null} />);
    // No toolbar header with back-to-dashboard link
    expect(screen.queryByRole("link", { name: /back to dashboard/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run updated tests to see failures**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/components/__tests__/builder-page.test.tsx
```

Expected: FAIL on "shows HomeScreen" and "does NOT render a BuilderToolbar" (BuilderPage still uses old layout)

- [ ] **Step 7.3: Rewrite BuilderPage layout**

Replace the render return in `src/features/builder/components/builder-page.tsx`. The state/hooks section (lines 1–308) stays **unchanged**. Only the `return` statement changes.

Find the return statement starting at line 311 (`return (`) and replace through the end of the function with:

```tsx
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showPromptScreen ? (
        <HomeScreen
          onGenerate={handleGenerate}
          mostRecent={!continueDismissed ? mostRecent ?? null : null}
          onContinueDismiss={() => setContinueDismissed(true)}
        />
      ) : (
        <>
          {isMobile ? (
            /* Mobile: single-panel view toggled via ChatColumn header */
            <div className="flex h-full flex-col overflow-hidden">
              {mobilePanel === "chat" ? (
                <ChatColumn
                  sessionId={sessionId}
                  status={status}
                  blueprint={blueprint}
                  error={error}
                  onGenerate={handleGenerate}
                  onRetry={handleRetry}
                  streamingText={streamingText}
                  activities={activities}
                  pendingPrompt={pendingPrompt}
                  onPendingPromptClear={() => setPendingPrompt(null)}
                  narrationMessage={narrationMessage}
                  startTime={generationStartTime}
                  appName={appName}
                  isEditingName={isEditingName}
                  onNameEditStart={() => setIsEditingName(true)}
                  onNameEditEnd={handleNameEditEnd}
                  patientId={patientId}
                  isMobile={isMobile}
                  mobilePanel={mobilePanel}
                  onMobilePanelChange={setMobilePanel}
                />
              ) : (
                <PreviewColumn
                  bundleHtml={bundleHtml}
                  status={status}
                  error={error ?? undefined}
                  deviceSize="mobile"
                  buildFailed={buildFailed}
                  activityMessage={narrationMessage ?? undefined}
                  onRetry={handleRetry}
                  viewMode={viewMode}
                  onViewChange={setViewMode}
                  files={files}
                  onPublish={handleShare}
                  onClose={() => {
                    reset();
                    router.push("/builder");
                  }}
                />
              )}
            </div>
          ) : (
            /* Desktop: resizable side-by-side columns */
            <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
              <ResizablePanel defaultSize={45} minSize={20}>
                <ChatColumn
                  sessionId={sessionId}
                  status={status}
                  blueprint={blueprint}
                  error={error}
                  onGenerate={handleGenerate}
                  onRetry={handleRetry}
                  streamingText={streamingText}
                  activities={activities}
                  pendingPrompt={pendingPrompt}
                  onPendingPromptClear={() => setPendingPrompt(null)}
                  narrationMessage={narrationMessage}
                  startTime={generationStartTime}
                  appName={appName}
                  isEditingName={isEditingName}
                  onNameEditStart={() => setIsEditingName(true)}
                  onNameEditEnd={handleNameEditEnd}
                  patientId={patientId}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={55} minSize={20}>
                <PreviewColumn
                  bundleHtml={bundleHtml}
                  status={status}
                  error={error ?? undefined}
                  deviceSize={deviceSize}
                  buildFailed={buildFailed}
                  activityMessage={narrationMessage ?? undefined}
                  onRetry={handleRetry}
                  viewMode={viewMode}
                  onViewChange={setViewMode}
                  files={files}
                  onPublish={handleShare}
                  onClose={() => {
                    reset();
                    router.push("/builder");
                  }}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </>
      )}

      {isFullscreen && bundleHtml && (
        <FullscreenAppView
          bundleHtml={bundleHtml}
          onExit={() => setIsFullscreen(false)}
        />
      )}

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shareSlug={appRecord?.shareSlug ?? ""}
        appTitle={appName}
      />
    </div>
  );
```

Also update the imports at the top of `builder-page.tsx` — remove `BuilderToolbar` and add the new components. Remove these imports:

```tsx
// REMOVE:
import { BuilderToolbar, type DeviceSize, type ViewMode } from "./builder-toolbar";
// REMOVE:
import { InterviewController } from "./interview/interview-controller";
// REMOVE:
import { PatientContextCard } from "./patient-context-card";
// REMOVE (if present):
import { SuggestionChips } from "@/shared/components/suggestion-chips";
```

Add these imports:

```tsx
import { ChatColumn } from "./chat-column";
import { HomeScreen } from "./home-screen";
import { PreviewColumn, type DeviceSize, type ViewMode } from "./preview-column";
```

Also remove state that is no longer needed in `BuilderPage`:
- Remove `showFreeformInput` state and setter (line 89) — HomeScreen handles it
- Remove `promptInputRef` (line 88) — HomeScreen owns the input
- Remove `promptInput` and `setPromptInput` (line 85–86)

Keep in `BuilderPage`: `pendingPrompt`, `viewMode`, `deviceSize`, `isEditingName`, `shareDialogOpen`, `isFullscreen`, `continueDismissed`, `mobilePanel`.

- [ ] **Step 7.4: Delete BuilderToolbar and its test**

```bash
cd /Users/desha/Springfield-Vibeathon && rm src/features/builder/components/builder-toolbar.tsx src/features/builder/components/__tests__/builder-toolbar.test.tsx
```

- [ ] **Step 7.5: Run full builder test suite**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/builder/
```

Expected: All tests PASS (green). If any test references `BuilderToolbar` or removed state, fix it inline.

- [ ] **Step 7.6: Run full test suite to check for regressions**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test
```

Expected: All tests PASS. If coverage drops below threshold, add a missing test inline.

- [ ] **Step 7.7: Commit**

```bash
cd /Users/desha/Springfield-Vibeathon && git add -A && git commit -m "feat(builder): rebuild layout — HomeScreen + ChatColumn + PreviewColumn, delete BuilderToolbar"
```

---

## Self-Review

**Spec coverage check:**
- ✅ HomeScreen: time-aware greeting, textarea card, category chips, ContinueCard (Task 4)
- ✅ Guided pill → InterviewController (Task 4, HomeScreen)
- ✅ ChatColumn header: session title, inline rename, chevron, mobile toggle (Task 5)
- ✅ UserMessage: left-aligned, dark bubble, Clerk initials (Task 3)
- ✅ AssistantMessage: no bubble, logo icon, markdown (Task 3)
- ✅ ArtifactCard: title, "Therapy app", spinner during generating (Task 2)
- ✅ InputBar: textarea, action row, VoiceInput, Guided pill, send button (Task 1)
- ✅ PreviewColumn header: eye/code tabs, v1, Copy, Publish, X (Task 6)
- ✅ BuilderToolbar deleted (Task 7)
- ✅ Mobile single-panel preserved (Task 7, BuilderPage)
- ✅ Tests updated/deleted (Tasks 3, 7)

**Type consistency check:**
- `ChatPanel` `appTitle: string` prop added — used in Tasks 3, 5 consistently
- `PreviewColumn` exports `DeviceSize` and `ViewMode` — imported in Task 7 (BuilderPage)
- `InputBar` `showGuidedPill?: boolean` — used without value in ChatColumn (defaults to falsy but should be explicit). Fix: ChatColumn passes `showGuidedPill` without value which is `true` in JSX — that is correct.
- `HomeScreen` `mostRecent` prop expects `Id<"sessions">` type — BuilderPage must cast `mostRecent._id` correctly. The existing `mostRecent` from `useSessionResume` already has typed `_id`. ✅

**Placeholder check:** No TBDs, no "implement later", all steps have code. ✅
