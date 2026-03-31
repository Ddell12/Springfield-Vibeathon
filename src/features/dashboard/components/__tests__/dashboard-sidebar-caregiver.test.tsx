import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardSidebar } from "../dashboard-sidebar";

vi.mock("convex/react", () => ({ useQuery: () => [] }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Parent", lastName: "User", publicMetadata: { role: "caregiver" } } }),
  useClerk: () => ({ signOut: vi.fn() }),
  Show: ({ when, children }: any) => (when === "signed-in" ? <>{children}</> : null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/sessions",
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
});
