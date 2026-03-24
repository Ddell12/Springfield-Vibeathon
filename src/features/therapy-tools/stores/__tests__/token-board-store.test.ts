import { useTokenBoardStore } from "../token-board-store";

describe("useTokenBoardStore", () => {
  beforeEach(() => {
    useTokenBoardStore.setState({ earnedTokens: 0, totalTokens: 0 });
  });

  it("has default state of 0 earned and 0 total", () => {
    const state = useTokenBoardStore.getState();
    expect(state.earnedTokens).toBe(0);
    expect(state.totalTokens).toBe(0);
  });

  it("init sets totalTokens and earnedTokens", () => {
    useTokenBoardStore.getState().init(5, 2);
    const state = useTokenBoardStore.getState();
    expect(state.totalTokens).toBe(5);
    expect(state.earnedTokens).toBe(2);
  });

  it("earnToken increments earnedTokens by 1", () => {
    useTokenBoardStore.getState().init(5, 0);
    useTokenBoardStore.getState().earnToken();
    expect(useTokenBoardStore.getState().earnedTokens).toBe(1);
  });

  it("earnToken does not exceed totalTokens", () => {
    useTokenBoardStore.getState().init(3, 3);
    useTokenBoardStore.getState().earnToken();
    expect(useTokenBoardStore.getState().earnedTokens).toBe(3);
  });

  it("earnToken caps at totalTokens after multiple calls", () => {
    useTokenBoardStore.getState().init(2, 0);
    useTokenBoardStore.getState().earnToken();
    useTokenBoardStore.getState().earnToken();
    useTokenBoardStore.getState().earnToken();
    expect(useTokenBoardStore.getState().earnedTokens).toBe(2);
  });

  it("reset clears earnedTokens to 0", () => {
    useTokenBoardStore.getState().init(5, 4);
    useTokenBoardStore.getState().reset();
    expect(useTokenBoardStore.getState().earnedTokens).toBe(0);
  });

  it("reset keeps totalTokens unchanged", () => {
    useTokenBoardStore.getState().init(5, 4);
    useTokenBoardStore.getState().reset();
    expect(useTokenBoardStore.getState().totalTokens).toBe(5);
  });
});
