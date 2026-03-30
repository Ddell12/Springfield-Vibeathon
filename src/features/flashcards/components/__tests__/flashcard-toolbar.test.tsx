import { render, screen, fireEvent } from "@testing-library/react";

import { FlashcardToolbar } from "../flashcard-toolbar";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("FlashcardToolbar", () => {
  const baseProps = {
    status: "idle" as const,
    projectName: "Animal Sounds",
  };

  it("renders deck title when not editing", () => {
    render(<FlashcardToolbar {...baseProps} />);
    expect(screen.getByText("Animal Sounds")).toBeInTheDocument();
  });

  it("shows title as a clickable button for rename", () => {
    const onNameEditStart = vi.fn();
    render(
      <FlashcardToolbar
        {...baseProps}
        onNameEditStart={onNameEditStart}
      />
    );
    const titleButton = screen.getByTitle("Click to rename");
    fireEvent.click(titleButton);
    expect(onNameEditStart).toHaveBeenCalledTimes(1);
  });

  it("shows input when in editing mode", () => {
    render(
      <FlashcardToolbar
        {...baseProps}
        isEditingName={true}
        onNameEditEnd={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Deck name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Animal Sounds")).toBeInTheDocument();
  });

  it("calls onNameEditEnd on input blur", () => {
    const onNameEditEnd = vi.fn();
    render(
      <FlashcardToolbar
        {...baseProps}
        isEditingName={true}
        onNameEditEnd={onNameEditEnd}
      />
    );
    const input = screen.getByLabelText("Deck name");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.blur(input);
    expect(onNameEditEnd).toHaveBeenCalledWith("New Name");
  });

  it("does not show generating indicator when idle", () => {
    render(<FlashcardToolbar {...baseProps} />);
    expect(screen.queryByText(/Generating cards/)).not.toBeInTheDocument();
  });

  it("shows generating indicator during generation", () => {
    render(<FlashcardToolbar {...baseProps} status="generating" />);
    expect(screen.getByText(/Generating cards/)).toBeInTheDocument();
  });

  it("shows Share button", () => {
    const onShare = vi.fn();
    render(<FlashcardToolbar {...baseProps} onShare={onShare} />);
    const shareButton = screen.getByText("Share");
    expect(shareButton).toBeInTheDocument();
  });

  it("shows Save button when onSave is provided", () => {
    render(
      <FlashcardToolbar {...baseProps} onSave={vi.fn()} isSaved={false} />
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("shows Saved state when isSaved is true", () => {
    render(
      <FlashcardToolbar {...baseProps} onSave={vi.fn()} isSaved={true} />
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows back link to dashboard", () => {
    render(<FlashcardToolbar {...baseProps} />);
    expect(screen.getByLabelText("Back to dashboard")).toHaveAttribute("href", "/");
  });

  it("shows New deck button when onNewChat is provided", () => {
    render(<FlashcardToolbar {...baseProps} onNewChat={vi.fn()} />);
    expect(screen.getByLabelText("New deck")).toBeInTheDocument();
  });

  it("does not show New deck button when onNewChat is not provided", () => {
    render(<FlashcardToolbar {...baseProps} />);
    expect(screen.queryByLabelText("New deck")).not.toBeInTheDocument();
  });
});
