import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardSidebar } from "../dashboard-sidebar";

let mockPathnameValue = "/sessions";

vi.mock("convex/react", () => ({ useQuery: () => [] }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Parent", lastName: "User", publicMetadata: { role: "caregiver" } } }),
  useClerk: () => ({ signOut: vi.fn() }),
  Show: ({ when, children }: any) => (when === "signed-in" ? <>{children}</> : null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathnameValue,
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/shared/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

beforeEach(() => {
  localStorage.clear();
  mockPathnameValue = "/sessions";
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

  it("renders caregiver navigation without client-side redirect side effects", () => {
    mockPathnameValue = "/tools/new";
    render(<DashboardSidebar />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toHaveTextContent("Home");
    expect(nav).toHaveTextContent("Settings");
  });
});
