import "@testing-library/jest-dom";

import React from "react";

import { server } from "./mocks/server";

// Replace next/dynamic with a synchronous test shim.
//
// Strategy (via vi.hoisted + beforeAll):
//   1. vi.hoisted() runs before vi.mock() hoisting — gives us a stable array ref
//   2. Each dynamic() call pushes the loader promise into ALL_INITIALIZERS
//   3. beforeAll() awaits all promises, resolving every component before tests run
//   4. The returned wrapper is a plain synchronous function — no Suspense, no lazy
//
// Result: screen.getBy*() assertions work without waitFor or findBy*.
const ALL_INITIALIZERS = vi.hoisted(() => [] as Promise<void>[]);

vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
    _options?: { ssr?: boolean; loading?: React.ComponentType },
  ): React.ComponentType<Record<string, unknown>> => {
    let Component: React.ComponentType<Record<string, unknown>> | null = null;

    ALL_INITIALIZERS.push(
      loader().then((mod) => {
        Component = mod.default;
      }),
    );

    return function DynamicShim(props: Record<string, unknown>) {
      if (!Component) return null;
      return React.createElement(Component, props);
    };
  },
}));

beforeAll(async () => {
  await Promise.all(ALL_INITIALIZERS);
});

// Suppress convex-test scheduler noise: acceptInvite calls ctx.scheduler.runAfter
// which tries to write to _scheduled_functions outside the transaction boundary.
// This is expected — the scheduled Clerk API call only runs in production.
process.on("unhandledRejection", (reason: unknown) => {
  if (
    reason instanceof Error &&
    reason.message.includes("Write outside of transaction")
  ) {
    return; // swallow
  }
  // Don't re-throw here — let Vitest's default handler report other rejections
});

// onUnhandledRequest: "bypass" lets vi.stubGlobal("fetch") work in hook tests
// without MSW trying to clone the mock response for passthrough processing.
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
