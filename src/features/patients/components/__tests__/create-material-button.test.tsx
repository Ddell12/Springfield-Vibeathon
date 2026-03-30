import { render, screen } from "@testing-library/react";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { CreateMaterialButton } from "../create-material-button";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("CreateMaterialButton", () => {
  const patientId = "patients_123" as Id<"patients">;

  it("renders button text", () => {
    render(<CreateMaterialButton patientId={patientId} />);
    expect(screen.getByText("Create Material")).toBeInTheDocument();
  });

  it("links to builder with patientId query param", () => {
    render(<CreateMaterialButton patientId={patientId} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/builder?patientId=${patientId}`);
  });
});
