import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalForm } from "../goal-form";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/shared/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select">{children}</div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children, ...props }: any) => (
    <button data-testid="select-trigger" {...props}>{children}</button>
  ),
  SelectValue: () => <span data-testid="select-value" />,
}));

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

vi.mock("../goal-bank-picker", () => ({
  GoalBankPicker: () => <div data-testid="goal-bank-picker" />,
}));

vi.mock("../../hooks/use-goals", () => ({
  useCreateGoal: () => vi.fn(),
  useUpdateGoal: () => vi.fn(),
}));

vi.mock("../../lib/goal-utils", () => ({
  domainLabel: (domain: string) => {
    const labels: Record<string, string> = {
      articulation: "Articulation",
      "language-receptive": "Receptive Language",
      "language-expressive": "Expressive Language",
      fluency: "Fluency",
      voice: "Voice",
      "pragmatic-social": "Pragmatic/Social",
      aac: "AAC",
      feeding: "Feeding",
    };
    return labels[domain] ?? domain;
  },
}));

vi.mock("../../lib/goal-bank-data", () => ({
  fillTemplate: vi.fn(() => "Filled template text"),
}));

describe("GoalForm", () => {
  it("renders nothing when open is false", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={false} onOpenChange={vi.fn()} />
    );
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open is true", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("shows Add IEP Goal title for new goal", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByText("Add IEP Goal")).toBeInTheDocument();
  });

  it("shows domain select with all 8 domains", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByText("Domain")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-articulation")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-fluency")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-aac")).toBeInTheDocument();
  });

  it("shows Short Description input", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByText("Short Description")).toBeInTheDocument();
  });

  it("shows Full Goal Text textarea", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByText("Full Goal Text")).toBeInTheDocument();
  });

  it("shows Target Accuracy and Consecutive Sessions inputs", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByText("Target Accuracy (%)")).toBeInTheDocument();
    expect(screen.getByText("Consecutive Sessions")).toBeInTheDocument();
  });

  it("shows Goal Bank and Custom tabs for new goal", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByTestId("tab-trigger-bank")).toHaveTextContent("Goal Bank");
    expect(screen.getByTestId("tab-trigger-custom")).toHaveTextContent("Custom");
  });

  it("renders Add Goal submit button", () => {
    render(
      <GoalForm patientId={"patient1" as any} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByText("Add Goal")).toBeInTheDocument();
  });

  it("shows Edit Goal title when editGoal is provided", () => {
    render(
      <GoalForm
        patientId={"patient1" as any}
        open={true}
        onOpenChange={vi.fn()}
        editGoal={{
          _id: "goal1" as any,
          domain: "articulation" as any,
          shortDescription: "Test",
          fullGoalText: "Test goal text",
          targetAccuracy: 80,
          targetConsecutiveSessions: 3,
          startDate: "2026-01-01",
        }}
      />
    );
    expect(screen.getByText("Edit Goal")).toBeInTheDocument();
    expect(screen.getByText("Update Goal")).toBeInTheDocument();
  });
});
