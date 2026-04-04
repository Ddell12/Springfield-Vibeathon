"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { type SpeechCoachConfig,TARGET_SOUNDS } from "../lib/config";
import { ThemePicker } from "./theme-picker";

type SessionConfigData = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
  mode?: "classic" | "adventure";
  themeSlug?: string;
};

type Props = {
  speechCoachConfig: SpeechCoachConfig;
  onStart: (config: SessionConfigData) => void;
  lastRecommended?: string[];
  isLoading?: boolean;
  error?: string;
};

export function SessionConfig({ speechCoachConfig, onStart, lastRecommended, isLoading, error }: Props) {
  const [selectedSounds, setSelectedSounds] = useState<string[]>(
    lastRecommended ?? speechCoachConfig.targetSounds
  );
  const [ageRange, setAgeRange] = useState<"2-4" | "5-7">(speechCoachConfig.ageRange);
  const [duration, setDuration] = useState<5 | 8 | 10 | 15>(() => {
    const d = speechCoachConfig.defaultDurationMinutes;
    if (d <= 5) return 5;
    if (d <= 8) return 8;
    if (d <= 10) return 10;
    return 15;
  });
  const [focusArea, setFocusArea] = useState("");
  const [mode, setMode] = useState<"classic" | "adventure">("classic");
  const [themeSlug, setThemeSlug] = useState<string | null>(null);

  const toggleSound = (id: string) => {
    setSelectedSounds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    onStart({
      targetSounds: selectedSounds,
      ageRange,
      durationMinutes: duration,
      focusArea: focusArea.trim() || undefined,
      mode,
      themeSlug: mode === "adventure" ? (themeSlug ?? undefined) : undefined,
    });
  };

  const adventureReady = mode === "adventure" && themeSlug;

  return (
    <div className="flex flex-col gap-8">
      {/* Mode selector */}
      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">
          Session mode
        </h3>
        <div className="mt-3 flex gap-2">
          {(["classic", "adventure"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-300",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              {m === "classic" ? "🎯 Classic" : "🗺️ Adventure"}
            </button>
          ))}
        </div>
        {mode === "adventure" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Your coach will play a character in a story world, embedding speech practice into the narrative.
          </p>
        )}
      </div>

      {/* Theme picker — adventure only */}
      {mode === "adventure" && (
        <div>
          <h3 className="font-body text-lg font-semibold text-foreground">
            Pick a world
          </h3>
          <div className="mt-3">
            <ThemePicker
              selectedSlug={themeSlug}
              ageRange={ageRange}
              onSelect={setThemeSlug}
            />
          </div>
        </div>
      )}

      {/* Target sounds */}
      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">
          What sounds should we practice?
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {TARGET_SOUNDS.map((sound) => (
            <label
              key={sound.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                selectedSounds.includes(sound.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedSounds.includes(sound.id)}
                onChange={() => toggleSound(sound.id)}
                aria-label={sound.label}
              />
              {sound.label}
            </label>
          ))}
        </div>
        {lastRecommended && lastRecommended.length > 0 && (
          <p className="mt-2 text-xs font-medium text-primary">
            ✓ Based on last session&apos;s recommendation
          </p>
        )}
      </div>

      {/* Age range */}
      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">
          How old is your child?
        </h3>
        <div className="mt-3 flex gap-3">
          {(["2-4", "5-7"] as const).map((range) => (
            <label
              key={range}
              className={cn(
                "flex cursor-pointer items-center rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                ageRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name="ageRange"
                value={range}
                checked={ageRange === range}
                onChange={() => setAgeRange(range)}
              />
              Ages {range}
            </label>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">
          How long?
        </h3>
        <div className="mt-3 flex gap-3">
          {([5, 8, 10, 15] as const).map((mins) => (
            <label
              key={mins}
              className={cn(
                "flex cursor-pointer items-center rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                duration === mins
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name="duration"
                value={mins}
                checked={duration === mins}
                onChange={() => setDuration(mins)}
                aria-label={`${mins} minutes`}
              />
              {mins} minutes
            </label>
          ))}
        </div>
      </div>

      {/* Focus area */}
      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">
          Anything specific to practice?
        </h3>
        <Input
          type="text"
          placeholder="e.g. animal names, colors, friend's names"
          value={focusArea}
          onChange={(e) => setFocusArea(e.target.value)}
          className="mt-3 w-full"
        />
      </div>

      {/* Tip */}
      <div className="rounded-lg bg-surface-container-high p-4">
        <p className="text-sm text-muted-foreground">
          Your child&apos;s coach setup is already prepared. Choose the sounds for today&apos;s session and start when ready.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Start */}
      <Button
        onClick={handleStart}
        disabled={selectedSounds.length === 0 || isLoading || (mode === "adventure" && !adventureReady)}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] py-6 text-lg font-semibold"
      >
        {isLoading
          ? "Connecting..."
          : mode === "adventure"
          ? adventureReady
            ? "Start Adventure"
            : "Pick a world to continue"
          : "Start Session"}
      </Button>
    </div>
  );
}
