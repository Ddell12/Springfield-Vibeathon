"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { ScoreCards } from "../lib/session-analysis";

type CueDistribution = {
  spontaneous: number;
  model: number;
  phoneticCue: number;
  directCorrection: number;
};

type PositionAccuracyRow = {
  sound: string;
  position: "initial" | "medial" | "final" | "unknown";
  correct: number;
  total: number;
};

type SoundAttempt = {
  sound: string;
  wordsAttempted: number;
  approximateSuccessRate: "high" | "medium" | "low";
  notes: string;
};

type Insights = {
  strengths: string[];
  patterns: string[];
  notableCueingPatterns: string[];
  recommendedNextTargets: string[];
  homePracticeNotes: string[];
};

type ProgressData = {
  summary: string;
  soundsAttempted: SoundAttempt[];
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
  scoreCards?: ScoreCards;
  insights?: Insights;
  cueDistribution?: CueDistribution;
  positionAccuracy?: PositionAccuracyRow[];
  iepNoteDraft?: string;
};

const POSITION_LABELS: Record<string, string> = {
  initial: "Initial",
  medial: "Medial",
  final: "Final",
  unknown: "—",
};

const RATE_STYLES: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-800",
};

export function SlpProgressCard({ progress }: { progress: ProgressData }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!progress.iepNoteDraft) return;
    await navigator.clipboard.writeText(progress.iepNoteDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-muted/30 p-5">
      {/* Score cards */}
      {progress.scoreCards && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Session Scores</h4>
          <div className="grid grid-cols-5 gap-2">
            {(
              [
                ["Overall", progress.scoreCards.overall],
                ["Accuracy", progress.scoreCards.productionAccuracy],
                ["Consistency", progress.scoreCards.consistency],
                ["Cueing", progress.scoreCards.cueingSupport],
                ["Engagement", progress.scoreCards.engagement],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-background p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position accuracy */}
      {progress.positionAccuracy && progress.positionAccuracy.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Production by Position</h4>
          {progress.positionAccuracy.map((row) => {
            const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
            return (
              <div key={`${row.sound}-${row.position}`} className="flex items-center gap-3">
                <span className="w-16 font-mono text-xs font-semibold text-foreground">
                  {row.sound}
                </span>
                <span className="w-16 text-xs text-muted-foreground">
                  {POSITION_LABELS[row.position]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-medium text-foreground">
                  {row.correct}/{row.total}
                </span>
                <span className="w-8 text-right text-xs text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cue distribution */}
      {progress.cueDistribution && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Cue Level Distribution</h4>
          {(
            [
              ["Spontaneous", progress.cueDistribution.spontaneous],
              ["Model only", progress.cueDistribution.model],
              ["Phonetic cue", progress.cueDistribution.phoneticCue],
              ["Direct correction", progress.cueDistribution.directCorrection],
            ] as [string, number][]
          ).map(([label, pct]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-32 text-xs text-muted-foreground">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium text-foreground">{pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Clinical insights */}
      {progress.insights?.patterns && progress.insights.patterns.length > 0 && (
        <div>
          <h4 className="font-body text-sm font-semibold text-foreground">Error Patterns</h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {progress.insights.patterns.map((p) => (
              <li key={p} className="text-sm text-foreground">
                • {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* IEP note draft — HIPAA: clipboard only, no external share */}
      {progress.iepNoteDraft && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-body text-sm font-semibold text-foreground">IEP Note (draft)</h4>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy note"}
            </Button>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{progress.iepNoteDraft}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Review and edit before adding to official records.
          </p>
        </div>
      )}

      {/* Sounds summary row */}
      {progress.soundsAttempted.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Sounds Attempted</h4>
          {progress.soundsAttempted.map((a) => (
            <div key={a.sound} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">{a.sound}</span>
                <span className="text-xs text-muted-foreground">{a.wordsAttempted} words</span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  RATE_STYLES[a.approximateSuccessRate]
                )}
              >
                {a.approximateSuccessRate}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
