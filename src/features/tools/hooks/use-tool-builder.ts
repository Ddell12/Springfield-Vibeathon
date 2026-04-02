"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { templateRegistry } from "../lib/registry";
import type { ThemePreset } from "../lib/runtime/app-shell-types";

interface BuilderState {
  patientId: Id<"patients"> | null;
  templateType: string | null;
  config: unknown;
  instanceId: Id<"app_instances"> | null;
  publishedShareToken: string | null;
  isSaving: boolean;
  originalDescription: string | null;
  isPublishOpen: boolean;
  appearance: {
    themePreset: ThemePreset;
    accentColor: string;
  };
}

export function useToolBuilder(initialId?: Id<"app_instances"> | null) {
  const existingInstance = useQuery(
    api.tools.get,
    initialId ? { id: initialId } : "skip"
  );

  const [state, setState] = useState<BuilderState>({
    patientId: null,
    templateType: null,
    config: null,
    instanceId: null,
    publishedShareToken: null,
    isSaving: false,
    originalDescription: null,
    isPublishOpen: false,
    appearance: {
      themePreset: "calm",
      accentColor: "#00595c",
    },
  });

  const seeded = useRef(false);

  useEffect(() => {
    if (existingInstance && !seeded.current) {
      seeded.current = true;
      const timer = setTimeout(() => {
        setState({
          patientId: existingInstance.patientId ?? null,
          templateType: existingInstance.templateType,
          config: JSON.parse(existingInstance.configJson),
          instanceId: existingInstance._id,
          publishedShareToken: existingInstance.shareToken ?? null,
          isSaving: false,
          originalDescription: existingInstance.originalDescription ?? null,
          isPublishOpen: false,
          appearance: {
            themePreset: "calm",
            accentColor: "#00595c",
          },
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [existingInstance]);

  const createInstance = useMutation(api.tools.create);
  const updateInstance = useMutation(api.tools.update);
  const publishInstance = useMutation(api.tools.publish);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfigRef = useRef<unknown>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const selectPatient = useCallback(
    (patientId: Id<"patients">) => setState((s) => ({ ...s, patientId })),
    []
  );

  const selectTemplate = useCallback((templateType: string) => {
    const reg = templateRegistry[templateType];
    setState((s) => ({
      ...s,
      templateType,
      config: reg?.defaultConfig ?? null,
    }));
  }, []);

  const openPublish = useCallback(
    () => setState((s) => ({ ...s, isPublishOpen: true })),
    []
  );

  const closePublish = useCallback(
    () => setState((s) => ({ ...s, isPublishOpen: false })),
    []
  );

  const updateConfig = useCallback(
    (config: unknown) => {
      setState((s) => ({ ...s, config }));
      latestConfigRef.current = config;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setState((s) => {
          if (!s.instanceId) return s;
          void updateInstance({
            id: s.instanceId,
            configJson: JSON.stringify(latestConfigRef.current),
          });
          return s;
        });
      }, 1500);
    },
    [updateInstance]
  );

  const updateAppearance = useCallback(
    (appearance: BuilderState["appearance"]) =>
      setState((s) => ({ ...s, appearance })),
    []
  );

  const saveAndAdvance = useCallback(async () => {
    const { patientId, templateType, config, instanceId } = stateRef.current;
    if (!templateType || !config) return;

    setState((s) => ({ ...s, isSaving: true }));
    try {
      if (!instanceId) {
        const payload = {
          templateType,
          title: (config as { title?: string }).title ?? "Untitled",
          configJson: JSON.stringify(config),
          ...(patientId ? { patientId } : {}),
          ...(stateRef.current.originalDescription
            ? { originalDescription: stateRef.current.originalDescription }
            : {}),
        };
        const id = await createInstance(payload);
        setState((s) => ({
          ...s,
          instanceId: id as Id<"app_instances">,
          isSaving: false,
        }));
      } else {
        await updateInstance({
          id: instanceId,
          configJson: JSON.stringify(config),
          title: (config as { title?: string }).title,
        });
        setState((s) => ({ ...s, isSaving: false }));
      }
    } catch {
      setState((s) => ({ ...s, isSaving: false }));
    }
  }, [createInstance, updateInstance]);

  const publish = useCallback(async (): Promise<string | null> => {
    const { instanceId } = stateRef.current;
    if (!instanceId) return null;

    setState((s) => ({ ...s, isSaving: true }));
    try {
      const { shareToken } = await publishInstance({ id: instanceId });
      setState((s) => ({ ...s, publishedShareToken: shareToken, isSaving: false }));
      return shareToken;
    } catch {
      setState((s) => ({ ...s, isSaving: false }));
      return null;
    }
  }, [publishInstance]);

  return {
    ...state,
    selectPatient,
    selectTemplate,
    openPublish,
    closePublish,
    updateConfig,
    updateAppearance,
    saveAndAdvance,
    publish,
  };
}
