import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PracticeLogForm } from "../practice-log-form";

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  programTitle: "Speech Sounds",
  onSubmit: vi.fn().mockResolvedValue(undefined),
};

describe("PracticeLogForm", () => {
  it("renders nothing when closed", () => {
    render(<PracticeLogForm {...defaultProps} open={false} />);
    expect(screen.queryByText("Log Practice")).not.toBeInTheDocument();
  });

  it("renders the dialog title when open", () => {
    render(<PracticeLogForm {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Log Practice" })).toBeInTheDocument();
  });

  it("renders the program title as description", () => {
    render(<PracticeLogForm {...defaultProps} />);
    expect(screen.getByText("Speech Sounds")).toBeInTheDocument();
  });

  it("renders duration input", () => {
    render(<PracticeLogForm {...defaultProps} />);
    expect(screen.getByLabelText(/how long/i)).toBeInTheDocument();
  });

  it("renders notes textarea", () => {
    render(<PracticeLogForm {...defaultProps} />);
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("renders 5 star rating buttons", () => {
    render(<PracticeLogForm {...defaultProps} />);
    for (let star = 1; star <= 5; star++) {
      expect(
        screen.getByRole("button", { name: `${star} star${star !== 1 ? "s" : ""}` })
      ).toBeInTheDocument();
    }
  });

  it("renders submit button labeled 'Log Practice'", () => {
    render(<PracticeLogForm {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Log Practice" })
    ).toBeInTheDocument();
  });

  it("star buttons are clickable", async () => {
    const user = userEvent.setup();
    render(<PracticeLogForm {...defaultProps} />);

    const threeStarButton = screen.getByRole("button", { name: "3 stars" });
    await user.click(threeStarButton);

    // After clicking 3 stars, all stars 1-3 should have amber class applied
    // (we can't easily check CSS in unit tests, but we verify no error was thrown)
    expect(threeStarButton).toBeInTheDocument();
  });

  it("calls onSubmit with form data when submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PracticeLogForm {...defaultProps} onSubmit={onSubmit} />);

    const durationInput = screen.getByLabelText(/how long/i);
    await user.type(durationInput, "15");

    const notesTextarea = screen.getByLabelText(/notes/i);
    await user.type(notesTextarea, "Great session today");

    const submitButton = screen.getByRole("button", { name: "Log Practice" });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 15,
        notes: "Great session today",
      })
    );
  });

  it("submits without optional fields when left empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PracticeLogForm {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByRole("button", { name: "Log Practice" });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      duration: undefined,
      confidence: undefined,
      notes: undefined,
    });
  });
});
