import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture the mock so individual tests can override return values
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
}));

import { PatientContextCard } from "../patient-context-card";

// ── Test fixtures ────────────────────────────────────────────────────────────

const PATIENT_ID = "patients:test123" as any;

const mockPatient = {
  _id: PATIENT_ID,
  _creationTime: 0,
  slpUserId: "user1",
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2018-01-01",
  diagnosis: "articulation" as const,
  status: "active" as const,
  communicationLevel: "single-words" as const,
  interests: ["dinosaurs", "trains", "Bluey"],
};

const mockGoals = [
  {
    _id: "goals:g1" as any,
    _creationTime: 0,
    patientId: PATIENT_ID,
    slpUserId: "user1",
    domain: "articulation" as const,
    shortDescription: "Produce /r/ initial",
    fullGoalText: "Alex will produce /r/ in initial position with 80% accuracy",
    targetAccuracy: 80,
    targetConsecutiveSessions: 3,
    status: "active" as const,
    startDate: "2026-01-01",
  },
  {
    _id: "goals:g2" as any,
    _creationTime: 0,
    patientId: PATIENT_ID,
    slpUserId: "user1",
    domain: "language-receptive" as const,
    shortDescription: "Follow 2-step directions",
    fullGoalText: "Alex will follow 2-step directions with 90% accuracy",
    targetAccuracy: 90,
    targetConsecutiveSessions: 3,
    status: "active" as const,
    startDate: "2026-01-01",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Default mock: patient + goals both resolved.
 *  useQuery is called twice per render: first for patients.get, then for goals.listActive.
 *  We cycle through patient/goals on even/odd calls so re-renders keep working.
 */
let callCount = 0;
function mockResolved() {
  callCount = 0;
  mockUseQuery.mockImplementation(() => {
    const result = callCount % 2 === 0 ? mockPatient : mockGoals;
    callCount++;
    return result;
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PatientContextCard", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("renders patient name, diagnosis badge, and communication level badge", () => {
    mockResolved();
    render(<PatientContextCard patientId={PATIENT_ID} />);

    expect(screen.getByText(/Building for Alex/)).toBeInTheDocument();
    // "articulation" appears in both the diagnosis badge and the goal domain badge — use getAllBy
    expect(screen.getAllByText("articulation").length).toBeGreaterThan(0);
    expect(screen.getByText("single-words")).toBeInTheDocument();
  });

  it("renders active goals list with domain and description", () => {
    mockResolved();
    render(<PatientContextCard patientId={PATIENT_ID} />);

    expect(screen.getByText("Active Goals (2)")).toBeInTheDocument();
    expect(screen.getByText("Produce /r/ initial")).toBeInTheDocument();
    expect(screen.getByText("Follow 2-step directions")).toBeInTheDocument();
  });

  it("returns null when patient data is loading (undefined)", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<PatientContextCard patientId={PATIENT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when patient is not found (null)", () => {
    // patient resolves to null, goals resolves to []
    mockUseQuery
      .mockReturnValueOnce(null)  // patients.get → not found
      .mockReturnValueOnce([]);   // goals.listActive
    const { container } = render(<PatientContextCard patientId={PATIENT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it("collapses when button is clicked — goals hidden but name still visible", async () => {
    // Force expanded state by setting window.innerWidth to desktop width before render
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });

    mockResolved();
    const user = userEvent.setup();
    render(<PatientContextCard patientId={PATIENT_ID} />);

    // Goals should be visible before collapsing
    expect(screen.getByText("Active Goals (2)")).toBeInTheDocument();

    const collapseBtn = screen.getByRole("button", { name: /collapse patient context/i });
    await user.click(collapseBtn);

    // Goals should now be hidden
    expect(screen.queryByText("Active Goals (2)")).not.toBeInTheDocument();

    // Patient name still present
    expect(screen.getByText(/Building for Alex/)).toBeInTheDocument();

    // Goal count summary shown inline
    expect(screen.getByText(/2 goals/)).toBeInTheDocument();
  });
});
