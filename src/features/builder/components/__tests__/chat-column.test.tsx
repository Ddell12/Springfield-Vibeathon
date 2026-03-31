import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue([]),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useAction: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam", lastName: "Lee" } }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("../chat-panel", () => ({
  ChatPanel: ({ status }: any) => <div data-testid="chat-panel" data-status={status} />,
}));

vi.mock("../input-bar", () => ({
  InputBar: ({ onSubmit, value, onChange }: any) => (
    <div>
      <input
        data-testid="input-bar-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={() => onSubmit(value)}>Send</button>
    </div>
  ),
}));

vi.mock("../patient-context-card", () => ({
  PatientContextCard: () => <div data-testid="patient-context-card" />,
}));

vi.mock("@/shared/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children, onValueChange, value }: any) => <div>{children}</div>,
  ToggleGroupItem: ({ children, value, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

import { ChatColumn } from "../chat-column";

const baseProps = {
  sessionId: null as string | null,
  status: "idle" as const,
  blueprint: null,
  error: null,
  onGenerate: vi.fn(),
  streamingText: "",
  activities: [],
  appName: "My Token App",
};

describe("ChatColumn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    render(<ChatColumn {...baseProps} />);
  });

  it("shows the app name in the header", () => {
    render(<ChatColumn {...baseProps} appName="My Token App" />);
    expect(screen.getByText("My Token App")).toBeInTheDocument();
  });

  it("clicking app name calls onNameEditStart", () => {
    const onNameEditStart = vi.fn();
    render(<ChatColumn {...baseProps} onNameEditStart={onNameEditStart} />);
    fireEvent.click(screen.getByRole("button", { name: /My Token App/i }));
    expect(onNameEditStart).toHaveBeenCalled();
  });

  it("isEditingName=true renders an input instead of button", () => {
    render(<ChatColumn {...baseProps} isEditingName />);
    expect(screen.getByRole("textbox", { name: /app name/i })).toBeInTheDocument();
  });

  it("input blur calls onNameEditEnd", () => {
    const onNameEditEnd = vi.fn();
    render(<ChatColumn {...baseProps} isEditingName onNameEditEnd={onNameEditEnd} />);
    fireEvent.blur(screen.getByRole("textbox", { name: /app name/i }), {
      target: { value: "New Name" },
    });
    expect(onNameEditEnd).toHaveBeenCalled();
  });

  it("renders ChatPanel", () => {
    render(<ChatColumn {...baseProps} />);
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  it("renders InputBar", () => {
    render(<ChatColumn {...baseProps} />);
    expect(screen.getByTestId("input-bar-textarea")).toBeInTheDocument();
  });

  it("submitting InputBar calls onGenerate", () => {
    const onGenerate = vi.fn();
    render(<ChatColumn {...baseProps} onGenerate={onGenerate} />);
    fireEvent.change(screen.getByTestId("input-bar-textarea"), {
      target: { value: "Build an AAC board" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onGenerate).toHaveBeenCalledWith("Build an AAC board");
  });

  it("renders PatientContextCard when patientId is provided", () => {
    render(<ChatColumn {...baseProps} patientId={"patient_abc12345678901234567890123" as any} />);
    expect(screen.getByTestId("patient-context-card")).toBeInTheDocument();
  });
});
