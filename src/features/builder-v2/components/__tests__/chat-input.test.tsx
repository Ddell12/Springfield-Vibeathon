import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "../chat-input";

describe("ChatInput", () => {
  it("renders the text input area", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    expect(
      screen.getByRole("textbox") || screen.getByPlaceholderText(/message/i)
    ).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button"));

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
    render(<ChatInput onSubmit={vi.fn()} isLoading={true} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-label", "Stop generation");
    expect(btn).not.toBeDisabled();
  });

  it("disables the submit button when input is empty", () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("enables submit button when there is text and not loading", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");

    expect(screen.getByRole("button")).not.toBeDisabled();
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
    // Input may be disabled when loading, but test behavior regardless
    try {
      await user.type(input, "hello{Enter}");
    } catch {
      // input may be disabled
    }

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
