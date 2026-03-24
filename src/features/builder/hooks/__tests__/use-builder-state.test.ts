import { useBuilderState } from "../use-builder-state";

describe("useBuilderState", () => {
  beforeEach(() => {
    useBuilderState.setState({ threadId: null, toolId: null });
  });

  it("has null threadId and toolId by default", () => {
    const state = useBuilderState.getState();
    expect(state.threadId).toBeNull();
    expect(state.toolId).toBeNull();
  });

  it("setThreadId updates threadId", () => {
    useBuilderState.getState().setThreadId("thread-123");
    expect(useBuilderState.getState().threadId).toBe("thread-123");
  });

  it("setToolId updates toolId", () => {
    useBuilderState.getState().setToolId("tool-456");
    expect(useBuilderState.getState().toolId).toBe("tool-456");
  });

  it("setThreadId does not affect toolId", () => {
    useBuilderState.getState().setToolId("tool-456");
    useBuilderState.getState().setThreadId("thread-123");
    expect(useBuilderState.getState().toolId).toBe("tool-456");
  });

  it("setToolId does not affect threadId", () => {
    useBuilderState.getState().setThreadId("thread-123");
    useBuilderState.getState().setToolId("tool-456");
    expect(useBuilderState.getState().threadId).toBe("thread-123");
  });
});
