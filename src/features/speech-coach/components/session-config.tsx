"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

const TARGET_SOUNDS = [
  { id: "/s/", label: "/s/ & /z/" },
  { id: "/r/", label: "/r/" },
  { id: "/l/", label: "/l/" },
  { id: "/th/", label: "/th/" },
  { id: "/ch/", label: "/ch/ & /sh/" },
  { id: "/f/", label: "/f/ & /v/" },
  { id: "/k/", label: "/k/ & /g/" },
  { id: "blends", label: "Blends" },
] as const;

type SpeechCoachConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  defaultDurationMinutes: number;
};

type SessionConfigData = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type Props = {
  speechCoachConfig: SpeechCoachConfig;
  onStart: (config: SessionConfigData) => void;
  lastRecommended?: string[];
  isLoading?: boolean;
};

export function SessionConfig({ speechCoachConfig, onStart, lastRecommended, isLoading }: Props) {
  const [selectedSounds, setSelectedSounds] = useState<string[]>(
    lastRecommended ?? speechCoachConfig.targetSounds
  );
  const [ageRange, setAgeRange] = useState<"2-4" | "5-7">(speechCoachConfig.ageRange);
  const [duration, setDuration] = useState<5 | 10>(
    speechCoachConfig.defaultDurationMinutes <= 5 ? 5 : 10
  );
  const [focusArea, setFocusArea] = useState("");

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
    });
  };

  return (
    <div className="flex flex-col gap-8">
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
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
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
          <p className="mt-2 text-sm text-muted-foreground">
            Based on the last session, we recommend practicing these sounds.
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
            <button
              key={range}
              type="button"
              onClick={() => setAgeRange(range)}
              className={cn(
                "rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                ageRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Ages {range}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">
          How long?
        </h3>
        <div className="mt-3 flex gap-3">
          {([5, 10] as const).map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setDuration(mins)}
              className={cn(
                "rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                duration === mins
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {mins} minutes
            </button>
          ))}
        </div>
      </div>

      {/* Focus area */}
      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">
          Anything specific to practice?
        </h3>
        <input
          type="text"
          placeholder="e.g. animal names, colors, friend's names"
          value={focusArea}
          onChange={(e) => setFocusArea(e.target.value)}
          className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Tip */}
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Sit with your child in a quiet space. The coach will guide the session with fun word games and lots of encouragement!
        </p>
      </div>

      {/* Start */}
      <Button
        onClick={handleStart}
        disabled={selectedSounds.length === 0 || isLoading}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] py-6 text-lg font-semibold"
      >
        {isLoading ? "Connecting..." : "Start Session"}
      </Button>
    </div>
  );
}
