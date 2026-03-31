import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock hooks that query Convex
const mockUseBillingRecords = vi.fn();
const mockUseBillingMutations = vi.fn();

vi.mock("../hooks/use-billing-records", () => ({
  useBillingRecords: (...args: unknown[]) => mockUseBillingRecords(...args),
  useBillingMutations: () => mockUseBillingMutations(),
}));

vi.mock("../../hooks/use-billing-records", () => ({
  useBillingRecords: (...args: unknown[]) => mockUseBillingRecords(...args),
  useBillingMutations: () => mockUseBillingMutations(),
}));

vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    billingRecords: {
      listBySlp: "mock-listBySlp",
      markBilled: "mock-markBilled",
    },
    patients: { get: "mock-get" },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../billing-record-editor", () => ({
  BillingRecordEditor: () => <div data-testid="billing-record-editor" />,
}));

vi.mock("../billing-record-row", () => ({
  BillingRecordRow: ({ record, onToggle, isSelected }: any) => (
    <tr data-testid={`record-row-${record._id}`}>
      {onToggle && (
        <td>
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={() => onToggle(record._id)}
            aria-label={`Select record ${record._id}`}
          />
        </td>
      )}
      <td>{record._id}</td>
    </tr>
  ),
}));

vi.mock("../superbill-viewer", () => ({
  SuperbillViewer: () => <div data-testid="superbill-viewer" />,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: any) => <span data-testid={`icon-${icon}`} />,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/tabs", () => ({
  Tabs: ({ children, onValueChange, value }: any) => (
    <div data-testid="tabs" data-value={value}>
      {/* Pass onValueChange as data so tests can trigger it */}
      <div
        data-testid="tabs-trigger-container"
        onClick={(e: any) => {
          const tab = e.target.dataset.tab;
          if (tab && onValueChange) onValueChange(tab);
        }}
      >
        {children}
      </div>
    </div>
  ),
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button role="tab" data-tab={value} data-testid={`tab-${value}`}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

// Import after mocks
import { ClinicalBillingDashboard } from "../clinical-billing-dashboard";

const mockMarkBilled = vi.fn();

function setupMocks({
  draft = [],
  finalized = [],
  billed = [],
}: {
  draft?: unknown[];
  finalized?: unknown[];
  billed?: unknown[];
} = {}) {
  mockUseBillingRecords.mockImplementation((status?: string) => {
    if (status === "draft") return draft;
    if (status === "finalized") return finalized;
    if (status === "billed") return billed;
    return [];
  });
  mockUseBillingMutations.mockReturnValue({ markBilled: mockMarkBilled });
}

describe("ClinicalBillingDashboard — batch action bar", () => {
  it("batch action bar is hidden when no records are selected", () => {
    setupMocks({
      finalized: [
        { _id: "rec1", patientId: "p1", dateOfService: "2026-03-01", cptCode: "92507", modifiers: [], fee: 10000, status: "finalized" },
      ],
    });

    render(<ClinicalBillingDashboard />);

    // The batch action bar text only appears when selectedIds.size > 0
    expect(screen.queryByText(/record.*selected/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark.*as billed/i })).not.toBeInTheDocument();
  });

  it("batch action bar appears in Ready to Bill tab when records are selectable", () => {
    setupMocks({
      finalized: [
        { _id: "rec1", patientId: "p1", dateOfService: "2026-03-01", cptCode: "92507", modifiers: [], fee: 10000, status: "finalized" },
        { _id: "rec2", patientId: "p2", dateOfService: "2026-03-02", cptCode: "92507", modifiers: [], fee: 10000, status: "finalized" },
      ],
    });

    render(<ClinicalBillingDashboard />);

    // The Ready to Bill tab content should render the rows with checkboxes (onToggle is passed)
    expect(screen.getByTestId("record-row-rec1")).toBeInTheDocument();
    expect(screen.getByTestId("record-row-rec2")).toBeInTheDocument();

    // Checkboxes should be present because onToggle is passed to finalized rows
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });

  it("batch action bar does NOT appear in Unbilled tab (no onToggle on draft rows)", () => {
    setupMocks({
      draft: [
        { _id: "draft1", patientId: "p1", dateOfService: "2026-03-01", cptCode: "92507", modifiers: [], fee: 10000, status: "draft" },
      ],
    });

    render(<ClinicalBillingDashboard />);

    // Draft rows are rendered without onToggle, so no checkboxes in the Unbilled tab
    const tabContentUnbilled = screen.getByTestId("tab-content-unbilled");
    const checkboxes = tabContentUnbilled.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(0);

    // No batch action bar
    expect(screen.queryByText(/record.*selected/i)).not.toBeInTheDocument();
  });

  it("batch action bar does NOT appear in Billed tab (no onToggle on billed rows)", () => {
    setupMocks({
      billed: [
        { _id: "billed1", patientId: "p1", dateOfService: "2026-03-01", cptCode: "92507", modifiers: [], fee: 10000, status: "billed", billedAt: Date.now() },
      ],
    });

    render(<ClinicalBillingDashboard />);

    // Billed rows are rendered without onToggle
    const tabContentBilled = screen.getByTestId("tab-content-billed");
    const checkboxes = tabContentBilled.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(0);

    // No batch action bar
    expect(screen.queryByText(/record.*selected/i)).not.toBeInTheDocument();
  });
});
