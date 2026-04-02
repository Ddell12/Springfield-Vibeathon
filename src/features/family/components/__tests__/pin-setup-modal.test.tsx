import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PinSetupModal } from "../pin-setup-modal";

function renderModal(open = true, onOpenChange = vi.fn(), onPinSet = vi.fn()) {
  return render(
    <PinSetupModal open={open} onOpenChange={onOpenChange} onPinSet={onPinSet} />
  );
}

async function enterFourDigits(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const digit of digits.split("")) {
    await user.click(screen.getByRole("button", { name: digit }));
  }
}

describe("PinSetupModal", () => {
  it("shows the enter step title initially", () => {
    renderModal();
    expect(screen.getByText("Set a Kid Mode PIN")).toBeInTheDocument();
  });

  it("advances to confirm step after entering 4 digits and clicking Next", async () => {
    const user = userEvent.setup();
    renderModal();

    await enterFourDigits(user, "1234");
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Confirm your PIN")).toBeInTheDocument();
  });

  it("shows an error and clears confirm input when PINs don't match", async () => {
    const user = userEvent.setup();
    renderModal();

    // Enter original PIN
    await enterFourDigits(user, "1234");
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Enter different confirmation PIN
    await enterFourDigits(user, "5678");
    await user.click(screen.getByRole("button", { name: /set pin/i }));

    // Error message appears
    expect(screen.getByText(/PINs don't match/i)).toBeInTheDocument();

    // Confirm input cleared — only 0 dots should be filled
    // The Set PIN button should be disabled again (confirmPin is empty, length !== 4)
    expect(screen.getByRole("button", { name: /set pin/i })).toBeDisabled();
  });

  it("allows retry after PIN mismatch", async () => {
    const onPinSet = vi.fn();
    const user = userEvent.setup();
    renderModal(true, vi.fn(), onPinSet);

    // Enter original PIN
    await enterFourDigits(user, "1234");
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Enter wrong confirmation
    await enterFourDigits(user, "5678");
    await user.click(screen.getByRole("button", { name: /set pin/i }));

    // Error shown, PIN cleared — now enter the correct confirmation
    await enterFourDigits(user, "1234");
    await user.click(screen.getByRole("button", { name: /set pin/i }));

    expect(onPinSet).toHaveBeenCalledWith("1234");
  });

  it("resets all state when the modal is closed via the close button", async () => {
    // Use a controlled open state so we can reopen after close
    let isOpen = true;
    const onOpenChange = vi.fn((open: boolean) => {
      isOpen = open;
    });
    const user = userEvent.setup();
    const { rerender } = render(
      <PinSetupModal open={isOpen} onOpenChange={onOpenChange} onPinSet={vi.fn()} />
    );

    // Enter first PIN and advance to confirm step
    await enterFourDigits(user, "1234");
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Confirm your PIN")).toBeInTheDocument();

    // Close the modal via the Dialog's built-in close button (X button)
    await user.click(screen.getByRole("button", { name: /close/i }));

    // Reopen the modal
    rerender(
      <PinSetupModal open={true} onOpenChange={onOpenChange} onPinSet={vi.fn()} />
    );

    // Should be back to the enter step, not confirm
    expect(screen.getByText("Set a Kid Mode PIN")).toBeInTheDocument();
    // Next button should be disabled (PIN cleared)
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });
});
