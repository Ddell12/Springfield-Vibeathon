import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MainPromptInput } from "../main-prompt-input";

var mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

describe("MainPromptInput", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders input with placeholder 'Describe a therapy tool\u2026'", () => {
    render(<MainPromptInput />);
    expect(
      screen.getByPlaceholderText(/Describe a therapy tool/i)
    ).toBeInTheDocument();
  });

  it("submit button is disabled when input is empty", () => {
    render(<MainPromptInput />);
    const btn = screen.getByRole("button", { name: /Submit prompt/i });
    expect(btn).toBeDisabled();
  });

  it("type text and click submit navigates to /builder with encoded prompt", async () => {
    render(<MainPromptInput />);
    const input = screen.getByRole("textbox");
    const btn = screen.getByRole("button", { name: /Submit prompt/i });

    await userEvent.type(input, "token board");
    fireEvent.click(btn);

    expect(mockPush).toHaveBeenCalledWith(
      `/builder?prompt=${encodeURIComponent("token board")}`
    );
  });

  it("pressing Enter in input navigates to /builder", async () => {
    render(<MainPromptInput />);
    const input = screen.getByRole("textbox");

    await userEvent.type(input, "visual schedule");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith(
      `/builder?prompt=${encodeURIComponent("visual schedule")}`
    );
  });

  it("whitespace-only input does not submit", async () => {
    render(<MainPromptInput />);
    const input = screen.getByRole("textbox");
    const btn = screen.getByRole("button", { name: /Submit prompt/i });

    await userEvent.type(input, "   ");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
