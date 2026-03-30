"use client";

import { cn } from "@/core/utils";
import { Card, CardContent } from "@/shared/components/ui/card";

interface StreakTrackerProps {
  streakData: {
    currentStreak: number;
    weeklyPracticeDays: number;
    weeklyTarget: number;
  };
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Returns which day-of-week indices (0=Mon…6=Sun) were practiced this week,
 * based on the weeklyPracticeDays count and today's position in the week.
 * We fill from Monday up to (and including) today.
 */
function getPracticedIndices(
  weeklyPracticeDays: number,
  currentStreak: number
): Set<number> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon…6=Sat
  // Convert to Mon=0…Sun=6
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const practiced = new Set<number>();
  // Fill backward from today for the number of streak days (capped to this week)
  const daysToFill = Math.min(currentStreak, weeklyPracticeDays, todayIndex + 1);
  for (let i = 0; i < daysToFill; i++) {
    practiced.add(todayIndex - i);
  }
  return practiced;
}

export function StreakTracker({ streakData }: StreakTrackerProps) {
  const { currentStreak, weeklyPracticeDays } = streakData;

  const icon =
    currentStreak >= 3 ? "🔥" : currentStreak > 0 ? "✨" : null;

  const label =
    currentStreak === 0
      ? "Start your streak!"
      : `${currentStreak}-day streak!`;

  const practicedIndices = getPracticedIndices(weeklyPracticeDays, currentStreak);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Streak count row */}
        <div className="mb-4 flex items-center gap-3">
          {icon && (
            <span className="text-3xl leading-none" role="img" aria-label="streak icon">
              {icon}
            </span>
          )}
          {!icon && (
            <span className="text-3xl leading-none" role="img" aria-label="practice prompt">
              💪
            </span>
          )}
          <div>
            <p className="text-2xl font-bold text-caution">
              {label}
            </p>
            {currentStreak > 0 && (
              <p className="text-sm text-muted-foreground">
                Keep it going — every day counts!
              </p>
            )}
            {currentStreak === 0 && (
              <p className="text-sm text-muted-foreground">
                Log your first practice to get started
              </p>
            )}
          </div>
        </div>

        {/* Day dots */}
        <div className="flex items-center gap-2">
          {DAY_LABELS.map((day, i) => {
            const practiced = practicedIndices.has(i);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full transition-colors duration-300",
                    practiced
                      ? "bg-caution shadow-sm shadow-caution/20 dark:bg-caution"
                      : "bg-muted"
                  )}
                  aria-label={practiced ? `${day} practiced` : `${day} not practiced`}
                />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
