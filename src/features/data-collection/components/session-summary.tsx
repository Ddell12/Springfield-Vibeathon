"use client";

import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";

interface TrialCollection {
  _id: Id<"sessionTrials">;
  targetDescription: string;
  trials: Array<{ correct: boolean; cueLevel: string }>;
}

interface SessionSummaryProps {
  collections: TrialCollection[];
  patientId: Id<"patients">;
  onStartNew: () => void;
}

export function SessionSummary({ collections, patientId, onStartNew }: SessionSummaryProps) {
  const endedCollections = collections.filter((c) => c.trials.length > 0);

  return (
    <div className="flex flex-col gap-6 p-4">
      <h2 className="text-xl font-semibold">Session Summary</h2>

      <div className="flex flex-col gap-3">
        {endedCollections.map((collection) => {
          const total = collection.trials.length;
          const correct = collection.trials.filter((t) => t.correct).length;
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

          return (
            <div
              key={collection._id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="font-medium text-foreground">{collection.targetDescription}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {correct}/{total} correct —{" "}
                <span className="font-semibold text-foreground">{accuracy}%</span>
              </p>
            </div>
          );
        })}

        {endedCollections.length === 0 && (
          <p className="text-sm text-muted-foreground">No trials recorded this session.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link href={`/patients/${patientId}/sessions/new`}>
            Start Session Note
          </Link>
        </Button>
        <Button variant="outline" onClick={onStartNew}>
          Collect More Data
        </Button>
      </div>
    </div>
  );
}
