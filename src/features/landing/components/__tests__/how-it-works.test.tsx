import { render, screen } from "@testing-library/react";

import { HowItWorks } from "../how-it-works";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("HowItWorks", () => {
  it("renders the section heading", () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole("heading", { name: /How it Works/ })
    ).toBeInTheDocument();
  });

  it("renders all three step titles", () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole("heading", { name: "Describe" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Build" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Share" })
    ).toBeInTheDocument();
  });

  it("renders the Describe step with its example quote", () => {
    render(<HowItWorks />);
    expect(
      screen.getByText(/Tell Bridges what your child needs/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A visual schedule for a trip to the dentist/)
    ).toBeInTheDocument();
  });

  it("renders description text for Build and Share steps", () => {
    render(<HowItWorks />);
    expect(
      screen.getByText(/AI creates an interactive therapy app in seconds/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Use at home, school, or therapy — share with your team instantly/
      )
    ).toBeInTheDocument();
  });
});
