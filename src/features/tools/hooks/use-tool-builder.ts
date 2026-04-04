"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { seedStateFromInstance } from "../lib/tool-config-seed";
import { templateRegistry } from "../lib/registry";
import type { ThemePreset } from "../lib/runtime/app-shell-types";

export type WizardStep = 1 | 2 | 3 | 4;

interface BuilderState {
  step: WizardStep;
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
    step: 1,
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
      return seedStateFromInstance(existingInstance, (seededState) => {
        setState({
          step: 3,
          ...seededState,
          isSaving: false,
          originalDescription: existingInstance.originalDescription ?? null,
          isPublishOpen: false,
          appearance: {
            themePreset: "calm",
            accentColor: "#00595c",
          },
        });
      });
    }
  }, [existingInstance]);

  const createInstance = useMutation(api.tools.create);
  const updateInstance = useMutation(api.tools.update);
  const publishInstance = useMutation(api.tools.publish);
  const archiveInstance = useMutation(api.tools.archive);
  const unpublishInstance = useMutation(api.tools.unpublish);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfigRef = useRef<unknown>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        const s = stateRef.current;
        if (s.instanceId && latestConfigRef.current !== null) {
          void updateInstance({
            id: s.instanceId,
            configJson: JSON.stringify(latestConfigRef.current),
          });
        }
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [updateInstance]);

  const selectPatient = useCallback(
    async (patientId: Id<"patients">) => {
      setState((s) => ({ ...s, patientId }));
      if (state.instanceId) {
        await updateInstance({ id: state.instanceId, patientId });
      }
    },
    [state.instanceId, updateInstance]
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

  const nextStep = useCallback(
    () => setState((s) => {
      const next = Math.min(4, s.step + 1) as WizardStep;
      return { ...s, step: next, isPublishOpen: next === 4 ? true : s.isPublishOpen };
    }),
    []
  );

  const prevStep = useCallback(
    () => setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as WizardStep })),
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

  const unpublish = useCallback(async () => {
    const { instanceId } = stateRef.current;
    if (!instanceId) return;
    setState((s) => ({ ...s, isSaving: true }));
    try {
      await unpublishInstance({ id: instanceId });
      setState((s) => ({ ...s, publishedShareToken: null, isSaving: false }));
    } catch {
      setState((s) => ({ ...s, isSaving: false }));
    }
  }, [unpublishInstance]);

  return {
    ...state,
    selectPatient,
    selectTemplate,
    openPublish,
    nextStep,
    prevStep,
    closePublish,
    updateConfig,
    updateAppearance,
    saveAndAdvance,
    publish,
    unpublish,
  };
}
