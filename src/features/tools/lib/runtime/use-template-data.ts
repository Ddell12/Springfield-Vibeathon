// src/features/tools/lib/runtime/use-template-data.ts
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import type { TemplateDataStore, ToolEvent } from "./page-types";

export function useTemplateData(
  appInstanceId: Id<"app_instances"> | undefined,
  mode: "preview" | "published"
): TemplateDataStore {
  const { isAuthenticated } = useConvexAuth();
  const useConvexBackend = Boolean(appInstanceId) && (mode === "preview" || isAuthenticated);

  const convexData = useQuery(
    api.app_instance_data.getAll,
    useConvexBackend && appInstanceId
      ? { appInstanceId }
      : "skip"
  );

  const convexEvents = useQuery(
    api.app_instance_data.getEvents,
    useConvexBackend && appInstanceId
      ? { appInstanceId }
      : "skip"
  );

  const upsert = useMutation(api.app_instance_data.upsert);

  // --- Convex get/set ---
  const convexGet = useCallback(
    <T>(key: string, fallback: T): T => {
      if (!convexData) return fallback;
      const entry = convexData.find((e) => e.key === key);
      if (!entry) return fallback;
      try {
        return JSON.parse(entry.valueJson) as T;
      } catch {
        return fallback;
      }
    },
    [convexData]
  );

  const convexSet = useCallback(
    <T>(key: string, value: T) => {
      if (!appInstanceId) return;
      void upsert({
        appInstanceId,
        key,
        valueJson: JSON.stringify(value),
      });
    },
    [upsert, appInstanceId]
  );

  // --- localStorage get/set ---
  const lsPrefix = `tool:${appInstanceId ?? "anon"}`;

  const lsGet = useCallback(
    <T>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(`${lsPrefix}:${key}`);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    [lsPrefix]
  );

  const lsSet = useCallback(
    <T>(key: string, value: T) => {
      try {
        localStorage.setItem(`${lsPrefix}:${key}`, JSON.stringify(value));
      } catch {
        // Storage quota exceeded or private mode — silently ignore
      }
    },
    [lsPrefix]
  );

  // --- history ---
  const events = useMemo((): ToolEvent[] => {
    if (useConvexBackend) {
      return (convexEvents ?? []) as unknown as ToolEvent[];
    }
    return [];
  }, [useConvexBackend, convexEvents]);

  const sessionCount = useMemo(
    () => events.filter((e) => e.eventType === "app_opened").length,
    [events]
  );

  const lastUsedAt = useMemo(() => {
    if (events.length === 0) return null;
    return events.reduce((max, e) => (e._creationTime > max ? e._creationTime : max), 0);
  }, [events]);

  const isLoading = useConvexBackend
    ? convexData === undefined || convexEvents === undefined
    : false;

  return useMemo<TemplateDataStore>(
    () => ({
      get: useConvexBackend ? convexGet : lsGet,
      set: useConvexBackend ? convexSet : lsSet,
      history: { events, sessionCount, lastUsedAt },
      isLoading,
    }),
    [useConvexBackend, convexGet, lsGet, convexSet, lsSet, events, sessionCount, lastUsedAt, isLoading]
  );
}
