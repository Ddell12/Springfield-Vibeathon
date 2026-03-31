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
