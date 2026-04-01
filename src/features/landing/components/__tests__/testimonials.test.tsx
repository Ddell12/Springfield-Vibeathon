import { render, screen } from "@testing-library/react";

import { Testimonials } from "../testimonials";

describe("Testimonials", () => {
  it("renders the section heading", () => {
    render(<Testimonials />);
    expect(
      screen.getByText(/Families & Therapists Love Vocali/i)
    ).toBeInTheDocument();
  });

  it("renders 3 testimonial cards", () => {
    render(<Testimonials />);
    // Each card has a name; check all 3 names appear
    expect(screen.getByText("Sarah M.")).toBeInTheDocument();
    expect(screen.getByText("Danielle R.")).toBeInTheDocument();
    expect(screen.getByText("Marcus T.")).toBeInTheDocument();
  });

  it("renders quotes with specific text fragments", () => {
    render(<Testimonials />);
    expect(screen.getByText(/morning routine in plain language/i)).toBeInTheDocument();
    expect(screen.getByText(/token board with custom reinforcers/i)).toBeInTheDocument();
    expect(screen.getByText(/non-verbal/i)).toBeInTheDocument();
  });

  it("renders all three roles", () => {
    render(<Testimonials />);
    expect(screen.getByText("Parent of a 7-year-old")).toBeInTheDocument();
    expect(screen.getByText("Board Certified Behavior Analyst")).toBeInTheDocument();
    expect(screen.getByText("Parent of a 5-year-old")).toBeInTheDocument();
  });

  it("renders avatar initials for each testimonial", () => {
    render(<Testimonials />);
    expect(screen.getByText("SM")).toBeInTheDocument();
    expect(screen.getByText("DR")).toBeInTheDocument();
    expect(screen.getByText("MT")).toBeInTheDocument();
  });
});
