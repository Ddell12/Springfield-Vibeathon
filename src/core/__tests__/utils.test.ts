import { cn, extractErrorMessage, settleInBatches } from "../utils";

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

describe("extractErrorMessage", () => {
  it("returns message from Error", () => {
    expect(extractErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns string directly", () => {
    expect(extractErrorMessage("oops")).toBe("oops");
  });

  it("returns fallback for non-error", () => {
    expect(extractErrorMessage(42)).toBe("Unknown error");
  });

  it("uses custom fallback", () => {
    expect(extractErrorMessage(null, "custom")).toBe("custom");
  });

  it("uses custom fallback for object", () => {
    expect(extractErrorMessage({}, "my fallback")).toBe("my fallback");
  });
});

describe("settleInBatches", () => {
  it("resolves all thunks in batches", async () => {
    const results = await settleInBatches(
      [() => Promise.resolve(1), () => Promise.resolve(2), () => Promise.resolve(3)],
      2
    );
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(results[1]).toEqual({ status: "fulfilled", value: 2 });
    expect(results[2]).toEqual({ status: "fulfilled", value: 3 });
  });

  it("handles rejected thunks", async () => {
    const results = await settleInBatches(
      [() => Promise.resolve(1), () => Promise.reject(new Error("fail"))],
      2
    );
    expect(results[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(results[1].status).toBe("rejected");
  });

  it("handles empty array", async () => {
    const results = await settleInBatches([], 2);
    expect(results).toHaveLength(0);
  });

  it("processes thunks in batches of given size", async () => {
    const order: number[] = [];
    const thunks = [
      () => Promise.resolve(order.push(1)),
      () => Promise.resolve(order.push(2)),
      () => Promise.resolve(order.push(3)),
      () => Promise.resolve(order.push(4)),
    ];
    const results = await settleInBatches(thunks, 2);
    expect(results).toHaveLength(4);
    expect(order).toHaveLength(4);
  });

  it("handles batch size larger than thunks array", async () => {
    const results = await settleInBatches(
      [() => Promise.resolve("a"), () => Promise.resolve("b")],
      10
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ status: "fulfilled", value: "a" });
    expect(results[1]).toEqual({ status: "fulfilled", value: "b" });
  });
});
