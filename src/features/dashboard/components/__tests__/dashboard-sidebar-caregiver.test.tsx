import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardSidebar } from "../dashboard-sidebar";

let mockPathnameValue = "/sessions";
const mockReplace = vi.fn();

vi.mock("convex/react", () => ({ useQuery: () => [] }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Parent", lastName: "User", publicMetadata: { role: "caregiver" } } }),
  useClerk: () => ({ signOut: vi.fn() }),
  Show: ({ when, children }: any) => (when === "signed-in" ? <>{children}</> : null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathnameValue,
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/shared/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

function mockPathname(path: string) {
  mockPathnameValue = path;
}

function mockCaregiver() {
  // role is caregiver via the @clerk/nextjs mock above
}

beforeEach(() => {
  localStorage.clear();
  mockPathnameValue = "/sessions";
  mockReplace.mockClear();
});

describe("DashboardSidebar (caregiver)", () => {
  it("renders Sessions and Speech Coach only", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Speech Coach")).toBeInTheDocument();
    expect(screen.queryByText("Patients")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
    expect(screen.queryByText("Library")).not.toBeInTheDocument();
  });

  it("does not redirect caregiver on /builder", async () => {
    mockPathname("/builder");
    mockCaregiver();
    render(<DashboardSidebar />);
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it("does not redirect caregiver on /flashcards", async () => {
    mockPathname("/flashcards");
    mockCaregiver();
    render(<DashboardSidebar />);
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it("does not redirect caregiver on /my-tools", async () => {
    mockPathname("/my-tools");
    mockCaregiver();
    render(<DashboardSidebar />);
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
