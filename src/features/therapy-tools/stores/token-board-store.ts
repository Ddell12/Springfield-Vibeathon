import { create } from "zustand";

interface TokenBoardState {
  earnedTokens: number;
  totalTokens: number;
  init: (total: number, earned: number) => void;
  earnToken: () => void;
  reset: () => void;
}

export const useTokenBoardStore = create<TokenBoardState>((set) => ({
  earnedTokens: 0,
  totalTokens: 0,
  init: (total, earned) => set({ totalTokens: total, earnedTokens: earned }),
  earnToken: () =>
    set((s) => ({
      earnedTokens: Math.min(s.earnedTokens + 1, s.totalTokens),
    })),
  reset: () => set({ earnedTokens: 0 }),
}));
