import { render, screen } from "@testing-library/react";
import { PricingPage } from "../pricing-page";

it("renders Free and Premium plans with CTAs", () => {
  render(<PricingPage />);
  expect(screen.getByText("Free")).toBeInTheDocument();
  expect(screen.getByText("Premium")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /start free trial/i })).toHaveAttribute(
    "href",
    "/sign-in?role=slp"
  );
});
