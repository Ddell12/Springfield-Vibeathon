import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach,describe, expect, it, vi } from "vitest";

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
  it("renders caregiver navigation including Settings", () => {
    render(<DashboardSidebar />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toHaveTextContent("Home");
    expect(nav).toHaveTextContent("Sessions");
    expect(nav).toHaveTextContent("Speech Coach");
    expect(nav).toHaveTextContent("Tools");
    expect(nav).toHaveTextContent("Settings");
    expect(nav).not.toHaveTextContent("Patients");
    expect(nav).not.toHaveTextContent("Billing");
    expect(nav).not.toHaveTextContent("Library");
  });

  it("does not redirect caregiver on /tools/new", async () => {
    mockPathname("/tools/new");
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

  it("does not redirect caregiver on /templates", async () => {
    mockPathname("/templates");
    mockCaregiver();
    render(<DashboardSidebar />);
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
