import { useCallback, useState } from "react";

import { useLocalStorage } from "./useLocalStorage";

interface DataConfig {
  type: "trial" | "frequency" | "duration";
  targetCount?: number;
}

interface SessionRecord {
  timestamp: number;
  count: number;
  percentage?: number;
  duration?: number;
}

interface UseDataCollectionReturn {
  count: number;
  percentage: number;
  record: (correct?: boolean) => void;
  reset: () => void;
  sessions: SessionRecord[];
  saveSession: () => void;
}

/**
 * ABA data collection hook for trials, frequency counts, and duration tracking.
 * Persists session history to localStorage.
 */
export function useDataCollection(config: DataConfig): UseDataCollectionReturn {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [sessions, setSessions] = useLocalStorage<SessionRecord[]>(
    `data-collection-${config.type}`,
    []
  );

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const record = useCallback(
    (isCorrect?: boolean) => {
      if (config.type === "trial") {
        setTotal((t) => t + 1);
        if (isCorrect) setCorrect((c) => c + 1);
      } else {
        setCount((c) => c + 1);
      }
    },
    [config.type]
  );

  const reset = useCallback(() => {
    setCorrect(0);
    setTotal(0);
    setCount(0);
  }, []);

  const saveSession = useCallback(() => {
    const entry: SessionRecord = {
      timestamp: Date.now(),
      count: config.type === "trial" ? total : count,
      percentage: config.type === "trial" ? percentage : undefined,
    };
    setSessions((prev) => [...prev, entry]);
    reset();
  }, [config.type, total, count, percentage, setSessions, reset]);

  return {
    count: config.type === "trial" ? total : count,
    percentage,
    record,
    reset,
    sessions,
    saveSession,
  };
}
