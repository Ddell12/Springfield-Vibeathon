import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { useQuery } from "convex/react";

import { PublishedToolsSection } from "../published-tools-section";

const PATIENT_ID = "pat123" as any;

describe("PublishedToolsSection", () => {
  it("renders null when no published apps", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    const { container } = render(<PublishedToolsSection patientId={PATIENT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when loading", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    const { container } = render(<PublishedToolsSection patientId={PATIENT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders published apps with share links", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "a1", title: "Morning Board", templateType: "aac_board", status: "published", shareToken: "tok-abc" },
      { _id: "a2", title: "Token Stars", templateType: "token_board", status: "draft", shareToken: null },
    ]);
    render(<PublishedToolsSection patientId={PATIENT_ID} />);
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("Morning Board")).toBeInTheDocument();
    expect(screen.queryByText("Token Stars")).not.toBeInTheDocument(); // draft excluded
    const link = screen.getByRole("link", { name: /Morning Board/i });
    expect(link).toHaveAttribute("href", "/apps/tok-abc");
  });
});
