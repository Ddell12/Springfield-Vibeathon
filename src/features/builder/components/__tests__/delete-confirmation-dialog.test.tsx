import { fireEvent,render } from "@testing-library/react";

import { DeleteConfirmationDialog } from "../delete-confirmation-dialog";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    );
  },
}));

describe("DeleteConfirmationDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projectName: "ProjectName",
    onConfirmDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows delete title when open=true", () => {
    const { getByText } = render(<DeleteConfirmationDialog {...defaultProps} />);
    expect(getByText(/Delete 'ProjectName'\?/)).toBeInTheDocument();
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <DeleteConfirmationDialog {...defaultProps} open={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    const onOpenChange = vi.fn();
    const { getByText } = render(
      <DeleteConfirmationDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onConfirmDelete and onOpenChange(false) when Delete is clicked", () => {
    const onConfirmDelete = vi.fn();
    const onOpenChange = vi.fn();
    const { getByText } = render(
      <DeleteConfirmationDialog
        {...defaultProps}
        onConfirmDelete={onConfirmDelete}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(getByText("Delete"));
    expect(onConfirmDelete).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
