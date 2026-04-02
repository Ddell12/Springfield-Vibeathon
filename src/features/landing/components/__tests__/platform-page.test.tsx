import { render, screen } from "@testing-library/react";
import { PlatformPage } from "../platform-page";

it("renders the pipeline and builder CTA", () => {
  render(<PlatformPage />);
  expect(screen.getByText("How it works")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /try the builder/i })).toHaveAttribute(
    "href",
    "/builder?new=1"
  );
});
