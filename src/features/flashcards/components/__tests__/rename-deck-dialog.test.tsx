import { render, screen, fireEvent } from "@testing-library/react";

import { RenameDeckDialog } from "../rename-deck-dialog";

describe("RenameDeckDialog", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    currentName: "Animal Sounds",
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows current deck name in input when open", () => {
    render(<RenameDeckDialog {...baseProps} />);
    const input = screen.getByLabelText("Deck name");
    expect(input).toHaveValue("Animal Sounds");
  });

  it("submits with new name when form is submitted", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <RenameDeckDialog
        {...baseProps}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    const input = screen.getByLabelText("Deck name");
    fireEvent.change(input, { target: { value: "New Deck Name" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onConfirm).toHaveBeenCalledWith("New Deck Name");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("cancel closes without calling onConfirm", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <RenameDeckDialog
        {...baseProps}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submit button is disabled when name is empty", () => {
    render(<RenameDeckDialog {...baseProps} />);
    const input = screen.getByLabelText("Deck name");
    fireEvent.change(input, { target: { value: "" } });

    const saveButton = screen.getByText("Save");
    expect(saveButton).toBeDisabled();
  });

  it("submit button is disabled when name is unchanged", () => {
    render(<RenameDeckDialog {...baseProps} />);
    const saveButton = screen.getByText("Save");
    expect(saveButton).toBeDisabled();
  });

  it("submit button is enabled when name is changed", () => {
    render(<RenameDeckDialog {...baseProps} />);
    const input = screen.getByLabelText("Deck name");
    fireEvent.change(input, { target: { value: "Different Name" } });

    const saveButton = screen.getByText("Save");
    expect(saveButton).not.toBeDisabled();
  });

  it("does not call onConfirm when name is unchanged (button stays disabled)", () => {
    const onConfirm = vi.fn();
    render(
      <RenameDeckDialog {...baseProps} onConfirm={onConfirm} />,
    );

    // Save button should be disabled when name hasn't changed
    const saveButton = screen.getByText("Save");
    expect(saveButton).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
