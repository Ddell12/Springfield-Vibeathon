"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export type ProgressPhase =
  | "started"
  | "title"
  | "description"
  | "code-started"
  | "code-streaming"
  | "file-path"
  | "dependencies"
  | "complete";

type StepStatus = "completed" | "in-progress" | "pending";

const PHASE_ORDER: ProgressPhase[] = [
  "started",
  "title",
  "description",
  "code-started",
  "code-streaming",
  "file-path",
  "dependencies",
  "complete",
];

const PHASE_LABELS: Record<Exclude<ProgressPhase, "complete">, string> = {
  "started": "Analyzing therapy requirements",
  "title": "Naming your tool",
  "description": "Planning the design",
  "code-started": "Writing component code",
  "code-streaming": "Building interactive elements",
  "file-path": "Applying therapy-safe styling",
  "dependencies": "Finalizing accessibility",
};

const DISPLAY_STEPS = PHASE_ORDER.filter(
  (p): p is Exclude<ProgressPhase, "complete"> => p !== "complete"
);

function getStepStatus(stepPhase: ProgressPhase, currentPhase: ProgressPhase): StepStatus {
  const stepIndex = PHASE_ORDER.indexOf(stepPhase);
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentPhase === "complete") return "completed";
  if (currentIndex > stepIndex) return "completed";
  if (currentIndex === stepIndex) return "in-progress";
  return "pending";
}

type FileProgressProps = {
  progressPhase: ProgressPhase;
};

export function FileProgress({ progressPhase }: FileProgressProps) {
  return (
    <div className="flex flex-col gap-3 py-3 px-1">
      <p className="text-sm font-bold text-on-surface mb-1">Let me build this:</p>
      {DISPLAY_STEPS.map((phase, index) => {
        const status = getStepStatus(phase, progressPhase);
        const label = PHASE_LABELS[phase];

        return (
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="flex items-center gap-3"
          >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {status === "completed" && (
                <Check size={16} className="text-green-600 dark:text-green-400" />
              )}
              {status === "in-progress" && (
                <Loader2
                  size={16}
                  className="text-[#00595c] animate-spin"
                />
              )}
              {status === "pending" && (
                <Circle size={16} className="text-muted" />
              )}
            </span>
            <span
              className={
                status === "completed"
                  ? "text-sm text-on-surface/60 line-through"
                  : status === "in-progress"
                    ? "text-sm font-medium text-on-surface"
                    : "text-sm text-muted"
              }
            >
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
