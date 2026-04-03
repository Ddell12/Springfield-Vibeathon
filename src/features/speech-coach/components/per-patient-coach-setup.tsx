"use client";

import { useMemo, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  COACH_TONE_OPTIONS,
  CORRECTION_STYLE_OPTIONS,
  FRUSTRATION_SUPPORT_OPTIONS,
  type SpeechCoachConfig,
  SESSION_PACE_OPTIONS,
  TARGET_SOUNDS,
  ageRangeFromAge,
  getCoachSetup,
} from "../lib/config";

type TemplateOption = {
  _id: Id<"speechCoachTemplates">;
  name: string;
  version: number;
};

type Props = {
  speechCoachConfig: SpeechCoachConfig;
  templates: TemplateOption[];
  onSave: (config: SpeechCoachConfig) => Promise<void> | void;
  isSaving: boolean;
};

export function PerPatientCoachSetup({
  speechCoachConfig,
  templates,
  onSave,
  isSaving,
}: Props) {
  const coachSetup = useMemo(() => getCoachSetup(speechCoachConfig), [speechCoachConfig]);
  const [targetSounds, setTargetSounds] = useState<string[]>(speechCoachConfig.targetSounds);
  const [childAgeInput, setChildAgeInput] = useState(
    String(speechCoachConfig.childAge ?? (speechCoachConfig.ageRange === "2-4" ? 4 : 6))
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    speechCoachConfig.assignedTemplateId ?? ""
  );
  const [slpNotes, setSlpNotes] = useState(coachSetup.slpNotes ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [coachTone, setCoachTone] = useState(coachSetup.coachTone);
  const [sessionPace, setSessionPace] = useState(coachSetup.sessionPace);
  const [correctionStyle, setCorrectionStyle] = useState(coachSetup.correctionStyle);
  const [frustrationSupport, setFrustrationSupport] = useState(coachSetup.frustrationSupport);

  function toggleSound(soundId: string) {
    setTargetSounds((current) =>
      current.includes(soundId)
        ? current.filter((item) => item !== soundId)
        : [...current, soundId]
    );
  }

  async function handleSave() {
    const parsedAge = Number(childAgeInput);
    const childAge = Number.isFinite(parsedAge)
      ? Math.min(12, Math.max(2, Math.round(parsedAge)))
      : 6;
    const assignedTemplate = templates.find((template) => template._id === selectedTemplateId);

    await onSave({
      ...speechCoachConfig,
      targetSounds,
      childAge,
      ageRange: ageRangeFromAge(childAge),
      assignedTemplateId: assignedTemplate?._id,
      lastSyncedTemplateVersion: assignedTemplate?.version,
      coachSetup: {
        ...coachSetup,
        slpNotes: slpNotes.trim() || undefined,
        coachTone,
        sessionPace,
        correctionStyle,
        frustrationSupport,
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="per-patient-template" className="text-sm font-semibold text-foreground">
          Based on template
        </Label>
        <Select value={selectedTemplateId || "__none__"} onValueChange={(value) => setSelectedTemplateId(value === "__none__" ? "" : value)}>
          <SelectTrigger id="per-patient-template">
            <SelectValue placeholder="Choose a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No template</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template._id} value={template._id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Full template editing lives in Speech Coach Templates.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-foreground">Target sounds</Label>
        <div className="flex flex-wrap gap-2">
          {TARGET_SOUNDS.map((sound) => (
            <label
              key={sound.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                targetSounds.includes(sound.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={targetSounds.includes(sound.id)}
                onChange={() => toggleSound(sound.id)}
                aria-label={sound.label}
              />
              {sound.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="per-patient-age" className="text-sm font-semibold text-foreground">
          Child&apos;s age
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="per-patient-age"
            type="number"
            min={2}
            max={12}
            value={childAgeInput}
            onChange={(event) => setChildAgeInput(event.target.value)}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">years old</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="per-patient-slp-notes" className="text-sm font-semibold text-foreground">
          Notes for this child
        </Label>
        <Textarea
          id="per-patient-slp-notes"
          value={slpNotes}
          onChange={(event) => setSlpNotes(event.target.value)}
          rows={3}
          placeholder="Give extra wait time. He likes trains. Avoid food examples."
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          The coach reads these notes before every session with this child.
        </p>
      </div>

      <div className="rounded-2xl bg-background">
        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
        >
          <span>Advanced overrides</span>
          <span className="text-muted-foreground">{showAdvanced ? "Hide" : "Show"}</span>
        </button>
        {showAdvanced ? (
          <div className="grid gap-4 px-4 pb-4 pt-1 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="advanced-tone" className="text-xs font-medium text-muted-foreground">
                Coach tone
              </Label>
              <Select value={coachTone} onValueChange={(value) => setCoachTone(value as typeof coachTone)}>
                <SelectTrigger id="advanced-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COACH_TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="advanced-pace" className="text-xs font-medium text-muted-foreground">
                Session pace
              </Label>
              <Select value={sessionPace} onValueChange={(value) => setSessionPace(value as typeof sessionPace)}>
                <SelectTrigger id="advanced-pace">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_PACE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="advanced-correction" className="text-xs font-medium text-muted-foreground">
                Correction style
              </Label>
              <Select
                value={correctionStyle}
                onValueChange={(value) => setCorrectionStyle(value as typeof correctionStyle)}
              >
                <SelectTrigger id="advanced-correction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORRECTION_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="advanced-frustration" className="text-xs font-medium text-muted-foreground">
                Frustration handling
              </Label>
              <Select
                value={frustrationSupport}
                onValueChange={(value) =>
                  setFrustrationSupport(value as typeof frustrationSupport)
                }
              >
                <SelectTrigger id="advanced-frustration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRUSTRATION_SUPPORT_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={targetSounds.length === 0 || isSaving}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] font-semibold"
      >
        {isSaving ? "Saving…" : "Save setup"}
      </Button>
    </div>
  );
}
