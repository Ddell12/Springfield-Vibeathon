import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PromptHome } from "../prompt-home";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("PromptHome", () => {
  it("renders the greeting text", () => {
    render(<PromptHome onSubmit={vi.fn()} />);
    expect(
      screen.getByText("What does your child need today?")
    ).toBeInTheDocument();
  });

  it("renders the textarea with correct placeholder", () => {
    render(<PromptHome onSubmit={vi.fn()} />);
    expect(
      screen.getByPlaceholderText(
        "Describe the therapy tool you need — a morning routine, token board, communication board..."
      )
    ).toBeInTheDocument();
  });

  it("renders all four template quick-start cards", () => {
    render(<PromptHome onSubmit={vi.fn()} />);
    expect(screen.getByText("Token Board")).toBeInTheDocument();
    expect(screen.getByText("Visual Schedule")).toBeInTheDocument();
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("Choice Board")).toBeInTheDocument();
  });

  it("calls onSubmit with the Token Board prompt when that card is clicked", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptHome onSubmit={onSubmit} />);
    await user.click(screen.getByText("Token Board").closest("button")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining("5-star token board"));
  });

  it("calls onSubmit with the Visual Schedule prompt when that card is clicked", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptHome onSubmit={onSubmit} />);
    await user.click(screen.getByText("Visual Schedule").closest("button")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining("morning routine"));
  });

  it("calls onSubmit with the Communication Board prompt when that card is clicked", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptHome onSubmit={onSubmit} />);
    await user.click(screen.getByText("Communication Board").closest("button")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining("snack request"));
  });

  it("calls onSubmit with the Choice Board prompt when that card is clicked", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptHome onSubmit={onSubmit} />);
    await user.click(screen.getByText("Choice Board").closest("button")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining("choice board"));
  });

  it("calls onSubmit with the textarea value when Send button is clicked", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptHome onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText(
      "Describe the therapy tool you need — a morning routine, token board, communication board..."
    );
    await user.type(textarea, "Build a custom schedule board");

    const sendButton = screen.getByRole("button", { name: /send prompt/i });
    await user.click(sendButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Build a custom schedule board");
  });

  it("send button is disabled when the textarea is empty", () => {
    render(<PromptHome onSubmit={vi.fn()} />);
    const sendButton = screen.getByRole("button", { name: /send prompt/i });
    expect(sendButton).toBeDisabled();
  });

  it("send button is enabled after typing in the textarea", async () => {
    const user = userEvent.setup();
    render(<PromptHome onSubmit={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(
      "Describe the therapy tool you need — a morning routine, token board, communication board..."
    );
    await user.type(textarea, "Hello");

    const sendButton = screen.getByRole("button", { name: /send prompt/i });
    expect(sendButton).not.toBeDisabled();
  });

  it("does not call onSubmit when send button is clicked with empty textarea", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptHome onSubmit={onSubmit} />);

    // The button is disabled so clicking it shouldn't trigger onSubmit
    const sendButton = screen.getByRole("button", { name: /send prompt/i });
    await user.click(sendButton);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders a Templates link pointing to /templates", () => {
    render(<PromptHome onSubmit={vi.fn()} />);
    const link = screen.getByRole("link", { name: /templates/i });
    expect(link).toHaveAttribute("href", "/templates");
  });
});
