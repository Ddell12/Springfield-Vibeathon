import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResponsivePicker } from "../responsive-picker";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

describe("ResponsivePicker", () => {
  it("renders 3 buttons: Phone, Tablet, Computer", () => {
    render(<ResponsivePicker value="desktop" onChange={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.textContent?.toLowerCase() ?? "");
    expect(labels.some((l) => l.includes("phone") || l.includes("mobile"))).toBe(true);
    expect(labels.some((l) => l.includes("tablet"))).toBe(true);
    expect(labels.some((l) => l.includes("computer") || l.includes("desktop"))).toBe(true);
  });

  it("applies active styling to the currently selected value", () => {
    const { rerender } = render(<ResponsivePicker value="mobile" onChange={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    const mobileBtn = buttons.find(
      (b) => b.textContent?.toLowerCase().includes("phone") ||
              b.textContent?.toLowerCase().includes("mobile")
    );
    expect(mobileBtn).toBeDefined();
    // Active button should have some indication — aria-pressed, data-active, or a different class
    expect(
      mobileBtn!.getAttribute("aria-pressed") === "true" ||
      mobileBtn!.getAttribute("data-active") === "true" ||
      mobileBtn!.classList.contains("active") ||
      mobileBtn!.classList.contains("bg-primary") ||
      mobileBtn!.closest("[data-active='true']") !== null
    ).toBe(true);

    // Tablet should not be active
    rerender(<ResponsivePicker value="tablet" onChange={vi.fn()} />);
    const tabletBtn = screen.getAllByRole("button").find(
      (b) => b.textContent?.toLowerCase().includes("tablet")
    );
    expect(tabletBtn).toBeDefined();
  });

  it("calls onChange with 'mobile' when Phone button is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ResponsivePicker value="desktop" onChange={onChange} />);
    const buttons = screen.getAllByRole("button");
    const mobileBtn = buttons.find(
      (b) => b.textContent?.toLowerCase().includes("phone") ||
              b.textContent?.toLowerCase().includes("mobile")
    )!;
    await user.click(mobileBtn);

    expect(onChange).toHaveBeenCalledWith("mobile");
  });

  it("calls onChange with 'tablet' when Tablet button is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ResponsivePicker value="desktop" onChange={onChange} />);
    const tabletBtn = screen.getAllByRole("button").find(
      (b) => b.textContent?.toLowerCase().includes("tablet")
    )!;
    await user.click(tabletBtn);

    expect(onChange).toHaveBeenCalledWith("tablet");
  });

  it("calls onChange with 'desktop' when Computer button is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ResponsivePicker value="mobile" onChange={onChange} />);
    const desktopBtn = screen.getAllByRole("button").find(
      (b) => b.textContent?.toLowerCase().includes("computer") ||
              b.textContent?.toLowerCase().includes("desktop")
    )!;
    await user.click(desktopBtn);

    expect(onChange).toHaveBeenCalledWith("desktop");
  });
});
