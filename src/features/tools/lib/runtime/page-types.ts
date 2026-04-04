// src/features/tools/lib/runtime/page-types.ts

export interface ToolEvent {
  _id: string;
  _creationTime: number;
  appInstanceId: string;
  eventType: string;
  eventPayloadJson?: string;
  sessionId?: string;
  eventSource?: "child" | "slp";
}

export interface HistoryStat {
  label: string;
  value: string | number;
}

export interface TemplateDataStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  history: {
    events: ToolEvent[];
    sessionCount: number;
    lastUsedAt: number | null;
  };
  isLoading: boolean;
}
