import { fireEvent, render, screen } from "@testing-library/react";

import { AppearanceSection } from "../appearance-section";

const mockSetTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("AppearanceSection", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it("renders the Appearance heading", () => {
    render(<AppearanceSection />);
    expect(screen.getByRole("heading", { name: /Appearance/i })).toBeInTheDocument();
  });

  it("renders Light, Dark, and System theme options", () => {
    render(<AppearanceSection />);
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("clicking Dark calls setTheme with 'dark'", () => {
    render(<AppearanceSection />);
    // Find the Dark button — it's a button containing the text "Dark"
    const darkButton = screen.getByRole("button", { name: /Dark/i });
    fireEvent.click(darkButton);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("clicking System calls setTheme with 'system'", () => {
    render(<AppearanceSection />);
    const systemButton = screen.getByRole("button", { name: /System/i });
    fireEvent.click(systemButton);
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("clicking Light calls setTheme with 'light'", () => {
    render(<AppearanceSection />);
    const lightButton = screen.getByRole("button", { name: /Light/i });
    fireEvent.click(lightButton);
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
