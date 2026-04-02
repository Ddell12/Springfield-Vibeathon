import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplateLibraryPage } from "../template-library-page";

const mockedUseQuery = vi.fn();
const mockedUseMutation = vi.fn(() => vi.fn());

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockedUseQuery(...args),
  useMutation: (...args: any[]) => mockedUseMutation(...args),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe("TemplateLibraryPage", () => {
  it("renders Preview session for each SLP template", async () => {
    mockedUseQuery.mockReturnValue([
      { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active" },
    ]);

    render(<TemplateLibraryPage />);

    expect(screen.getByRole("link", { name: /preview session/i })).toBeInTheDocument();
  });

  it("opens standalone preview link with template id", async () => {
    mockedUseQuery.mockReturnValue([
      { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active" },
    ]);

    render(<TemplateLibraryPage />);
    expect(screen.getByRole("link", { name: /preview session/i })).toHaveAttribute(
      "href",
      "/speech-coach?templateId=tpl1&mode=preview",
    );
  });
});
