import "@testing-library/jest-dom";

import { server } from "./mocks/server";

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
