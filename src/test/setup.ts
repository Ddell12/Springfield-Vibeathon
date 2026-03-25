import "@testing-library/jest-dom";

import { server } from "./mocks/server";

// onUnhandledRequest: "bypass" lets vi.stubGlobal("fetch") work in hook tests
// without MSW trying to clone the mock response for passthrough processing.
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
