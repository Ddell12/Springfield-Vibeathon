import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FragmentWeb } from "../fragment-web";

describe("FragmentWeb", () => {
  const sandboxUrl = "https://sandbox-abc-123-3000.e2b.app";

  it("renders an iframe element", () => {
    render(<FragmentWeb url={sandboxUrl} />);
    expect(screen.getByTitle(/preview/i) || document.querySelector("iframe")).toBeTruthy();
  });

  it("sets the iframe src to the provided url", () => {
    render(<FragmentWeb url={sandboxUrl} />);
    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute("src")).toBe(sandboxUrl);
  });

  it("includes sandbox attribute on iframe for security", () => {
    render(<FragmentWeb url={sandboxUrl} />);
    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe!.hasAttribute("sandbox")).toBe(true);
  });

  it("sets a title on the iframe for accessibility", () => {
    render(<FragmentWeb url={sandboxUrl} title="Morning Routine App Preview" />);
    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe!.title).toBeTruthy();
  });

  it("uses the provided title for the iframe accessible label", () => {
    render(<FragmentWeb url={sandboxUrl} title="Token Board Preview" />);
    // Either the iframe has a title attribute, or there's a label
    const iframe = document.querySelector("iframe");
    expect(
      iframe?.title?.includes("Token Board") ||
        screen.queryByText(/Token Board/)
    ).toBeTruthy();
  });

  it("renders in full size to fill its container", () => {
    const { container } = render(<FragmentWeb url={sandboxUrl} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    // Should have width/height classes or style for full container fill
    expect(
      iframe!.className.includes("w-full") ||
        iframe!.className.includes("h-full") ||
        iframe!.style.width === "100%" ||
        iframe!.style.height === "100%"
    ).toBe(true);
  });

  it("allows scripts in sandbox for app functionality", () => {
    render(<FragmentWeb url={sandboxUrl} />);
    const iframe = document.querySelector("iframe");
    const sandboxAttr = iframe?.getAttribute("sandbox") ?? "";
    // Should allow at least same-origin or scripts
    expect(sandboxAttr).toMatch(/allow-scripts|allow-same-origin/);
  });
});
