import { render, screen } from "@testing-library/react";
import { MeetVocaliPage } from "../meet-vocali-page";

it("renders the three role cards and primary signup CTA", () => {
  render(<MeetVocaliPage />);
  expect(screen.getByText("Speech-Language Pathologists")).toBeInTheDocument();
  expect(screen.getByText("Caregivers & Parents")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /start building free/i })).toHaveAttribute(
    "href",
    "/sign-up"
  );
});
