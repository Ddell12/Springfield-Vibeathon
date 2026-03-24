import { cn } from "../utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts by keeping the last value", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });
});
