"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import { templateRegistry } from "../lib/registry";

export type WizardStep = 1 | 2 | 3 | 4;

interface BuilderState {
  step: WizardStep;
  patientId: Id<"patients"> | null;
  templateType: string | null;
  config: unknown;
  instanceId: Id<"app_instances"> | null;
  publishedShareToken: string | null;
  isSaving: boolean;
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
  });

  const seeded = useRef(false);

  useEffect(() => {
    if (existingInstance && !seeded.current) {
      seeded.current = true;
      setState({
        step: 3,
        patientId: existingInstance.patientId ?? null,
        templateType: existingInstance.templateType,
        config: JSON.parse(existingInstance.configJson),
        instanceId: existingInstance._id,
        publishedShareToken: existingInstance.shareToken ?? null,
        isSaving: false,
      });
    }
  }, [existingInstance]);

  const createInstance = useMutation(api.tools.create);
  const updateInstance = useMutation(api.tools.update);
  const publishInstance = useMutation(api.tools.publish);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfigRef = useRef<unknown>(null);

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

  const nextStep = useCallback(
    () => setState((s) => ({ ...s, step: Math.min(4, s.step + 1) as WizardStep })),
    []
  );

  const prevStep = useCallback(
    () => setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as WizardStep })),
    []
  );

  const updateConfig = useCallback(
    (config: unknown) => {
      setState((s) => ({ ...s, config }));
      latestConfigRef.current = config; // always track latest

      // Debounced autosave — fires 1.5s after last edit if instance already exists
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setState((s) => {
          if (!s.instanceId) return s;
          void updateInstance({ id: s.instanceId, configJson: JSON.stringify(latestConfigRef.current) });
          return s;
        });
      }, 1500);
    },
    [updateInstance]
  );

  const saveAndAdvance = useCallback(async () => {
    const { patientId, templateType, config, instanceId } = state;
    if (!templateType || !config) return;

    setState((s) => ({ ...s, isSaving: true }));
    try {
      if (!instanceId) {
        const payload = {
          templateType,
          title: (config as { title?: string }).title ?? "Untitled",
          configJson: JSON.stringify(config),
          ...(patientId ? { patientId } : {}),
        };
        const id = await createInstance(payload);
        setState((s) => ({ ...s, instanceId: id as Id<"app_instances">, isSaving: false }));
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
  }, [state, createInstance, updateInstance]);

  const publish = useCallback(async (): Promise<string | null> => {
    const { instanceId } = state;
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
  }, [state, publishInstance]);

  return { ...state, selectPatient, selectTemplate, nextStep, prevStep, updateConfig, saveAndAdvance, publish };
}
