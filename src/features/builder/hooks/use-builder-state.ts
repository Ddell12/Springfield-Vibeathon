import { create } from "zustand";

interface BuilderState {
  threadId: string | null;
  toolId: string | null;
  setThreadId: (id: string) => void;
  setToolId: (id: string) => void;
}

export const useBuilderState = create<BuilderState>((set) => ({
  threadId: null,
  toolId: null,
  setThreadId: (id) => set({ threadId: id }),
  setToolId: (id) => set({ toolId: id }),
}));
