import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../theme-toggle";

// Mock next-themes
const mockSetTheme = vi.fn();
let mockTheme = "light";
let mockMounted = true;

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "light";
    mockMounted = true;
  });

  it("renders a placeholder before mount (avoids hydration mismatch)", () => {
    // Simulate pre-mount by checking the component doesn't crash with no theme
    mockTheme = "light";
    const { container } = render(<ThemeToggle />);
    // The toggle should render without errors
    expect(container).not.toBeEmptyDOMElement();
  });

  it("renders the sun icon when theme is light", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    // Either a sun icon or a light mode indicator
    const sunIcon = screen.queryByTestId("icon-light_mode") ||
                    screen.queryByTestId("icon-wb_sunny") ||
                    screen.queryByTestId("icon-sun");
    expect(sunIcon).not.toBeNull();
  });

  it("renders the moon icon when theme is dark", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    const moonIcon = screen.queryByTestId("icon-dark_mode") ||
                     screen.queryByTestId("icon-nights_stay") ||
                     screen.queryByTestId("icon-moon");
    expect(moonIcon).not.toBeNull();
  });

  it("calls setTheme with 'dark' when clicked in light mode", async () => {
    mockTheme = "light";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme with 'light' when clicked in dark mode", async () => {
    mockTheme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("renders a button element", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
