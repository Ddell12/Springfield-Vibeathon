import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockedCanShowDeveloperAccelerators = vi.hoisted(() => vi.fn());

vi.mock("@/shared/lib/developer-gate", () => ({
  canShowDeveloperAccelerators: (...args: unknown[]) =>
    mockedCanShowDeveloperAccelerators(...args),
}));
vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}));
vi.mock("@/features/auth/hooks/use-current-user", () => ({
  useCurrentUser: () => ({
    _id: "slp-user-123",
    email: "dev@bridges.ai",
    role: "slp",
    name: "Test SLP",
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/sessions",
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));
vi.mock("@/features/patients/hooks/use-patients", () => ({
  usePatients: () => [],
}));
vi.mock("../hooks/use-appointments", () => ({
  useAppointments: () => [],
  useAppointmentActions: () => ({
    create: vi.fn(),
    bookAsCaregiver: vi.fn(),
    cancel: vi.fn(),
    startSession: vi.fn(),
    completeSession: vi.fn(),
    markNoShow: vi.fn(),
    startDeveloperTestCall: vi.fn(),
  }),
}));
vi.mock("../hooks/use-availability", () => ({
  useAvailability: () => ({ slots: [], createSlot: vi.fn(), removeSlot: vi.fn() }),
}));
vi.mock("../hooks/use-calendar", () => ({
  useCalendar: () => ({
    currentDate: new Date(),
    weekStart: Date.now(),
    view: "week",
    setView: vi.fn(),
    goToToday: vi.fn(),
    goToPrevious: vi.fn(),
    goToNext: vi.fn(),
  }),
}));

import { SessionsPage } from "../sessions-page";

describe("SessionsPage developer accelerators", () => {
  it("shows Start test call only for allowlisted developers", () => {
    mockedCanShowDeveloperAccelerators.mockReturnValue(true);
    render(<SessionsPage />);
    expect(screen.getByRole("button", { name: /start test call/i })).toBeInTheDocument();
  });

  it("hides Start test call for normal SLP accounts", () => {
    mockedCanShowDeveloperAccelerators.mockReturnValue(false);
    render(<SessionsPage />);
    expect(screen.queryByRole("button", { name: /start test call/i })).not.toBeInTheDocument();
  });
});
