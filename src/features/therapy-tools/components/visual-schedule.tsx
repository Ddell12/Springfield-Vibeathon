"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { VisualScheduleConfig } from "../types/tool-configs";

type Step = VisualScheduleConfig["steps"][number];

function SortableStep({
  step,
  index,
  isCurrent,
  isCompleted,
  onToggle,
}: {
  step: Step;
  index: number;
  isCurrent: boolean;
  isCompleted: boolean;
  onToggle: (index: number) => void;
}) {
  const { ref } = useSortable({ id: step.id, index });

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={() => onToggle(index)}
        disabled={isCompleted}
        className={cn(
          "flex items-center p-4 rounded-xl transition-all duration-300 text-left w-full",
          isCompleted && "bg-[#f0f9f9]",
          isCurrent &&
            "bg-surface-container-lowest border-l-4 border-primary scale-[1.02] sanctuary-shadow p-5",
          !isCompleted && !isCurrent && "bg-surface-container-lowest",
          !isCurrent && "border-l-4 border-transparent",
        )}
      >
        {/* Drag handle */}
        <div
          className="text-outline-variant mr-4"
          style={{ touchAction: "none" }}
        >
          <MaterialIcon icon="drag_indicator" />
        </div>

        {/* Icon + Label */}
        <div className="flex-grow flex items-center gap-4">
          <div
            className={cn(
              "rounded-full flex items-center justify-center text-2xl",
              isCurrent
                ? "w-14 h-14 bg-surface-container-low shadow-sm text-3xl"
                : "w-12 h-12 bg-white",
            )}
          >
            {step.icon}
          </div>
          <div>
            <h3
              className={cn(
                "font-headline font-bold",
                isCompleted && "text-primary line-through opacity-60 text-lg",
                isCurrent && "text-on-surface text-xl",
                !isCompleted && !isCurrent && "text-on-surface text-lg",
              )}
            >
              {step.label}
            </h3>
            {isCurrent && (
              <p className="font-label text-sm text-primary font-semibold">
                Happening Now
              </p>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className="ml-auto">
          {isCompleted ? (
            <MaterialIcon
              icon="check_circle"
              filled
              className="text-primary text-3xl"
            />
          ) : isCurrent ? (
            <div className="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          ) : (
            <MaterialIcon
              icon="radio_button_unchecked"
              className="text-outline-variant text-3xl"
            />
          )}
        </div>
      </button>
    </motion.div>
  );
}

export function VisualSchedule({ config }: { config: VisualScheduleConfig }) {
  const [steps, setSteps] = useState(config.steps.map((s) => ({ ...s })));

  const completedCount = steps.filter((s) => s.completed).length;
  const percentage =
    steps.length > 0
      ? Math.round((completedCount / steps.length) * 100)
      : 0;

  const currentIndex = steps.findIndex((s) => !s.completed);

  function handleToggle(index: number) {
    if (steps[index].completed) return;
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, completed: true } : s)),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleDragEnd(event: any) {
    const sourceIndex = event.operation?.source?.sortable?.index as
      | number
      | undefined;
    const targetIndex = event.operation?.target?.sortable?.index as
      | number
      | undefined;
    if (sourceIndex === undefined || targetIndex === undefined) return;
    if (sourceIndex === targetIndex) return;

    setSteps((prev) => {
      const next = [...prev];
      const [removed] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MaterialIcon
          icon="light_mode"
          filled
          className="text-primary text-3xl"
        />
        <div>
          <h1 className="font-headline text-2xl font-bold text-primary">
            {config.title}
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">
            {steps.length} steps to complete
          </p>
        </div>
      </div>

      {/* Step List */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {steps.map((step, index) => {
              const isCurrent = index === currentIndex;
              const isCompleted = step.completed;

              return (
                <SortableStep
                  key={step.id}
                  step={step}
                  index={index}
                  isCurrent={isCurrent}
                  isCompleted={isCompleted}
                  onToggle={handleToggle}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </DragDropProvider>

      {/* Progress Card */}
      <div className="bg-surface-container-low rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="font-headline font-bold text-primary">Progress</span>
          <span className="font-label font-semibold text-primary">
            {completedCount} of {steps.length} steps
          </span>
        </div>
        <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-gradient rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
