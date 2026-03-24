import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BuilderState {
  threadId: string | null;
  toolId: string | null;
  setThreadId: (id: string) => void;
  setToolId: (id: string) => void;
  reset: () => void;
}

export const useBuilderState = create<BuilderState>()(
  persist(
    (set) => ({
      threadId: null,
      toolId: null,
      setThreadId: (id) => set({ threadId: id }),
      setToolId: (id) => set({ toolId: id }),
      reset: () => set({ threadId: null, toolId: null }),
    }),
    { name: "bridges-builder-state" }
  )
);
