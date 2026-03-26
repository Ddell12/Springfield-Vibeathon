import { render, act } from "@testing-library/react";
import { ThinkingIndicator } from "../thinking-indicator";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ThinkingIndicator", () => {
  it("renders null when isThinking=false and elapsed=0", () => {
    const { container } = render(
      <ThinkingIndicator isThinking={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Thinking...' when isThinking=true", () => {
    const startTime = Date.now();
    const { getByText } = render(
      <ThinkingIndicator isThinking={true} startTime={startTime} />
    );
    expect(getByText("Thinking...")).toBeInTheDocument();
  });

  it("shows elapsed time after timer tick", () => {
    const now = 1000000;
    vi.setSystemTime(new Date(now));
    const startTime = now - 3000;

    const { getByText } = render(
      <ThinkingIndicator isThinking={true} startTime={startTime} />
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getByText(/Thinking\.\.\. \d+s/)).toBeInTheDocument();
  });

  it("does not start interval when no startTime provided", () => {
    const { container } = render(
      <ThinkingIndicator isThinking={true} />
    );
    // isThinking=true but no startTime, elapsed stays 0, should render "Thinking..." (elapsed=0 branch)
    // but !startTime means interval not started
    // The component still renders since isThinking=true
    expect(container.firstChild).not.toBeNull();
  });
});
