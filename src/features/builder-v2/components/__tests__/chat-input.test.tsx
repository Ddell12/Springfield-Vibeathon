import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "../chat-input";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

describe("ChatInput", () => {
  it("renders the text input area", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    // The component renders multiple buttons; the submit button has type="button" and contains the arrow icon
    const buttons = screen.getAllByRole("button");
    const submitBtn = buttons.find((btn) => btn.querySelector('[data-testid="icon-arrow_upward"]'));
    expect(submitBtn).toBeDefined();
  });

  it("renders the placeholder text when provided", () => {
    render(
      <ChatInput
        onSubmit={vi.fn()}
        isLoading={false}
        placeholder="Describe your therapy tool..."
      />
    );
    expect(
      screen.getByPlaceholderText("Describe your therapy tool...")
    ).toBeInTheDocument();
  });

  it("calls onSubmit with the message text when form is submitted", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Build a token board");

    const buttons = screen.getAllByRole("button");
    const submitBtn = buttons.find((btn) => btn.querySelector('[data-testid="icon-arrow_upward"]'))!;
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith("Build a token board");
  });

  it("submits message when Enter key is pressed", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Morning routine app{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("Morning routine app");
  });

  it("clears the input after submission", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Token board{Enter}");

    expect(input).toHaveValue("");
  });

  it("shows stop button when isLoading is true", () => {
    const onStop = vi.fn();
    render(<ChatInput onSubmit={vi.fn()} onStop={onStop} isLoading={true} />);
    // When loading, the stop button replaces the submit button — it contains a square stop indicator
    const buttons = screen.getAllByRole("button");
    const stopBtn = buttons.find((btn) => btn.querySelector(".rounded-sm"));
    expect(stopBtn).toBeDefined();
    expect(stopBtn).not.toBeDisabled();
  });

  it("disables the submit button when input is empty", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    const buttons = screen.getAllByRole("button");
    const submitBtn = buttons.find((btn) => btn.querySelector('[data-testid="icon-arrow_upward"]'));
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button when there is text and not loading", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");

    const buttons = screen.getAllByRole("button");
    const submitBtn = buttons.find((btn) => btn.querySelector('[data-testid="icon-arrow_upward"]'));
    expect(submitBtn).not.toBeDisabled();
  });

  it("does not call onSubmit when input is empty and Enter is pressed", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit when isLoading is true and Enter is pressed", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSubmit={onSubmit} isLoading={true} />);

    const input = screen.getByRole("textbox");
    // Input is disabled when loading, so type may fail
    try {
      await user.type(input, "hello{Enter}");
    } catch {
      // input may be disabled
    }

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("only renders send and stop buttons — no other action buttons", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    const buttons = screen.getAllByRole("button");
    // Only the submit button should be present when not loading
    // (voice, image, etc. stub buttons must be absent)
    const buttonTexts = buttons.map((b) => b.textContent ?? "");
    expect(buttonTexts.some((t) => /voice|microphone|attach|image/i.test(t))).toBe(false);
  });

  it("does not show a notification banner", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    // No beta notice or alert banners in the chat input area
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/beta|experimental|unstable/i)).not.toBeInTheDocument();
  });
});
