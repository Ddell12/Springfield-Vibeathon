"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import {
  COACH_TONE_OPTIONS,
  type CoachSetup,
  CORRECTION_STYLE_OPTIONS,
  FRUSTRATION_SUPPORT_OPTIONS,
  getCoachSetup,
  MAX_RETRIES_OPTIONS,
  PROMPT_STYLE_OPTIONS,
  SESSION_GOAL_OPTIONS,
  SESSION_PACE_OPTIONS,
  type SpeechCoachConfig,
  TARGET_POSITION_OPTIONS,
} from "../lib/config";

type Props = {
  speechCoachConfig: SpeechCoachConfig;
  onSave: (config: SpeechCoachConfig) => Promise<void>;
  isSaving?: boolean;
};

function parseTagList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CoachSetupTab({ speechCoachConfig, onSave, isSaving = false }: Props) {
  const [form, setForm] = useState<CoachSetup>(() => getCoachSetup(speechCoachConfig));
  const [preferredThemesInput, setPreferredThemesInput] = useState(
    () => getCoachSetup(speechCoachConfig).preferredThemes.join(", ")
  );
  const [avoidThemesInput, setAvoidThemesInput] = useState(
    () => getCoachSetup(speechCoachConfig).avoidThemes.join(", ")
  );

  function updateForm<K extends keyof CoachSetup>(key: K, value: CoachSetup[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePosition(position: CoachSetup["targetPositions"][number]) {
    setForm((current) => ({
      ...current,
      targetPositions: current.targetPositions.includes(position)
        ? current.targetPositions.filter((item) => item !== position)
        : [...current.targetPositions, position],
    }));
  }

  async function handleSave() {
    const cleanedForm: CoachSetup = {
      ...form,
      targetPositions:
        form.targetPositions.length > 0 ? form.targetPositions : ["initial"],
      preferredThemes: parseTagList(preferredThemesInput),
      avoidThemes: parseTagList(avoidThemesInput),
      slpNotes: form.slpNotes?.trim() ? form.slpNotes.trim() : undefined,
    };

    await onSave({
      ...speechCoachConfig,
      coachSetup: cleanedForm,
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <Card className="gap-4 rounded-xl bg-background/80 py-5">
        <CardHeader className="gap-1 px-5">
          <CardTitle className="font-headline text-xl text-foreground">Coach Setup</CardTitle>
          <CardDescription>
            Shape how the speech coach talks, cues, and adjusts when practice gets easier or harder.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <p className="text-sm leading-6 text-muted-foreground">
            These settings are saved for this child&apos;s Speech Coach program. Caregivers still choose the sounds and focus for each session, but the coach will follow your setup during live practice.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-5 rounded-xl py-5">
        <CardHeader className="gap-1 px-5">
          <CardTitle className="text-lg text-foreground">Targets</CardTitle>
          <CardDescription>Tell the coach what kind of practice you want emphasized.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 px-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Target positions</Label>
            <div className="grid gap-2">
              {TARGET_POSITION_OPTIONS.map((option) => (
                <label key={option.id} className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-3 text-sm">
                  <Checkbox
                    checked={form.targetPositions.includes(option.id)}
                    onCheckedChange={() => togglePosition(option.id)}
                    className="mt-0.5"
                  />
                  <span className="text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-setup-goal" className="text-sm font-medium text-foreground">Session goal</Label>
            <Select
              value={form.sessionGoal}
              onValueChange={(value) => updateForm("sessionGoal", value as CoachSetup["sessionGoal"])}
            >
              <SelectTrigger id="coach-setup-goal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_GOAL_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              Choose whether the coach should stay drill-heavy, mix things up, or push carryover language.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-5 rounded-xl py-5">
        <CardHeader className="gap-1 px-5">
          <CardTitle className="text-lg text-foreground">How The Coach Talks</CardTitle>
          <CardDescription>Set the feel and pacing of the conversation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 px-5 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-tone" className="text-sm font-medium text-foreground">Coach tone</Label>
            <Select
              value={form.coachTone}
              onValueChange={(value) => updateForm("coachTone", value as CoachSetup["coachTone"])}
            >
              <SelectTrigger id="coach-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COACH_TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-pace" className="text-sm font-medium text-foreground">Session pace</Label>
            <Select
              value={form.sessionPace}
              onValueChange={(value) => updateForm("sessionPace", value as CoachSetup["sessionPace"])}
            >
              <SelectTrigger id="coach-pace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_PACE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-prompt-style" className="text-sm font-medium text-foreground">Prompt style</Label>
            <Select
              value={form.promptStyle}
              onValueChange={(value) => updateForm("promptStyle", value as CoachSetup["promptStyle"])}
            >
              <SelectTrigger id="coach-prompt-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-5 rounded-xl py-5">
        <CardHeader className="gap-1 px-5">
          <CardTitle className="text-lg text-foreground">Cueing & Correction</CardTitle>
          <CardDescription>Control how directly the coach models and repairs attempts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 px-5 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-correction-style" className="text-sm font-medium text-foreground">Correction style</Label>
            <Select
              value={form.correctionStyle}
              onValueChange={(value) => updateForm("correctionStyle", value as CoachSetup["correctionStyle"])}
            >
              <SelectTrigger id="coach-correction-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CORRECTION_STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-retries" className="text-sm font-medium text-foreground">Retries per word</Label>
            <Select
              value={String(form.maxRetriesPerWord)}
              onValueChange={(value) =>
                updateForm("maxRetriesPerWord", Number(value) as CoachSetup["maxRetriesPerWord"])
              }
            >
              <SelectTrigger id="coach-retries">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_RETRIES_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-frustration-support" className="text-sm font-medium text-foreground">Frustration handling</Label>
            <Select
              value={form.frustrationSupport}
              onValueChange={(value) => updateForm("frustrationSupport", value as CoachSetup["frustrationSupport"])}
            >
              <SelectTrigger id="coach-frustration-support">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRUSTRATION_SUPPORT_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-5 rounded-xl py-5">
        <CardHeader className="gap-1 px-5">
          <CardTitle className="text-lg text-foreground">Child Fit</CardTitle>
          <CardDescription>Help the coach lean into what works and stay away from what does not.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 px-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-preferred-themes" className="text-sm font-medium text-foreground">Preferred themes</Label>
            <Input
              id="coach-preferred-themes"
              value={preferredThemesInput}
              onChange={(event) => setPreferredThemesInput(event.target.value)}
              placeholder="e.g. animals, trains, dinosaurs"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Comma-separated topics the coach can use for examples and games.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-avoid-themes" className="text-sm font-medium text-foreground">Avoid themes</Label>
            <Input
              id="coach-avoid-themes"
              value={avoidThemesInput}
              onChange={(event) => setAvoidThemesInput(event.target.value)}
              placeholder="e.g. food play, spooky topics"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Comma-separated topics the coach should avoid using for examples.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-5 rounded-xl py-5">
        <CardHeader className="gap-1 px-5">
          <CardTitle className="text-lg text-foreground">Clinician Guidance</CardTitle>
          <CardDescription>Add any child-specific coaching notes you want the AI coach to follow.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coach-slp-notes" className="text-sm font-medium text-foreground">SLP notes</Label>
            <Textarea
              id="coach-slp-notes"
              value={form.slpNotes ?? ""}
              onChange={(event) => updateForm("slpNotes", event.target.value)}
              rows={5}
              placeholder="e.g. Give extra wait time before repeating. Keep praise warm but not overly animated. Use vehicle words first."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Coach Setup"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
