"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail } from "../../runtime/premium-primitives";
import type { VisualScheduleConfig } from "./schema";

const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CountdownRing({ totalSeconds, secondsLeft, highContrast }: {
  totalSeconds: number; secondsLeft: number; highContrast: boolean;
}) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  return (
    <svg width="60" height="60" data-countdown-ring="true" className="shrink-0"
      aria-label={`${secondsLeft} seconds remaining`}>
      <circle cx="30" cy="30" r={RADIUS} fill="none" strokeWidth="4"
        className={highContrast ? "stroke-white/30" : "stroke-muted"} />
      <circle cx="30" cy="30" r={RADIUS} fill="none" strokeWidth="4"
        strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        className={highContrast ? "stroke-yellow-400" : "stroke-primary"}
        style={{ transform: "rotate(-90deg)", transformOrigin: "30px 30px", transition: "stroke-dashoffset 1s linear" }} />
      <text x="30" y="35" textAnchor="middle" fontSize="13" fontWeight="600"
        className={highContrast ? "fill-white" : "fill-foreground"}>
        {secondsLeft}
      </text>
    </svg>
  );
}

export function VisualScheduleRuntime({
  config,
  mode: _mode,
  onEvent,
  voice: _voice,
}: RuntimeProps<VisualScheduleConfig>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(() => {
    const first = config.items[0];
    return config.showDuration && first?.durationMinutes ? first.durationMinutes * 60 : null;
  });
  const totalTimerRef = useRef<number>(
    config.showDuration && config.items[0]?.durationMinutes ? config.items[0].durationMinutes * 60 : 0
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs to hold current state for use inside setInterval without stale closure issues
  const currentIndexRef = useRef(0);
  const completedRef = useRef(false);
  const timerSecondsRef = useRef<number | null>(timerSeconds);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const advanceStep = useCallback((index: number) => {
    const item = config.items[index];
    onEvent("item_tapped", JSON.stringify({ itemId: item.id, label: item.label, index }));
    const next = index + 1;
    if (next >= config.items.length) {
      completedRef.current = true;
      setCompleted(true);
      onEvent("activity_completed", JSON.stringify({ itemsCompleted: config.items.length }));
    } else {
      currentIndexRef.current = next;
      setCurrentIndex(next);
      const nextItem = config.items[next];
      if (config.showDuration && nextItem.durationMinutes) {
        const secs = nextItem.durationMinutes * 60;
        totalTimerRef.current = secs;
        timerSecondsRef.current = secs;
        setTimerSeconds(secs);
        startTimer(secs, next);
      } else {
        timerSecondsRef.current = null;
        setTimerSeconds(null);
      }
    }
  }, [config.items, config.showDuration, onEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = useCallback((initialSeconds: number, forIndex: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    let remaining = initialSeconds;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      timerSecondsRef.current = remaining;
      setTimerSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (!completedRef.current) {
          advanceStep(forIndex);
        }
      }
    }, 1000);
  }, [advanceStep]);

  // Start timer for the initial step on mount
  useEffect(() => {
    const first = config.items[0];
    if (config.showDuration && first?.durationMinutes) {
      startTimer(first.durationMinutes * 60, 0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleItemTap = useCallback((index: number) => {
    if (completedRef.current || index !== currentIndexRef.current) return;
    // Cancel any running timer and advance immediately
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    timerSecondsRef.current = null;
    setTimerSeconds(null);
    advanceStep(index);
  }, [advanceStep]);

  const handleReset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    currentIndexRef.current = 0;
    completedRef.current = false;
    setCurrentIndex(0);
    setCompleted(false);
    const first = config.items[0];
    const secs = config.showDuration && first?.durationMinutes ? first.durationMinutes * 60 : null;
    totalTimerRef.current = secs ?? 0;
    timerSecondsRef.current = secs;
    setTimerSeconds(secs);
    if (secs) {
      startTimer(secs, 0);
    }
    onEvent("app_opened");
  }, [config.items, config.showDuration, onEvent, startTimer]);

  return (
    <div className={cn("p-4", config.highContrast && "high-contrast bg-black")}>
      <PremiumScreen title={config.title}>
        <ProgressRail
          current={completed ? config.items.length : currentIndex}
          total={config.items.length}
          label={completed ? "Complete!" : `Step ${currentIndex + 1} of ${config.items.length}`}
        />

        {completed ? (
          <div className="flex flex-col items-center gap-4">
            <div className={cn("rounded-xl px-8 py-6 text-center",
              config.highContrast ? "bg-yellow-400 text-black" : "bg-primary/10")}>
              <p className="font-headline text-2xl font-semibold">All done! 🎉</p>
            </div>
            <button onClick={handleReset} aria-label="Start again"
              className={cn("px-6 py-3 rounded-xl text-sm font-medium transition-colors",
                config.highContrast ? "bg-white text-black" : "bg-muted text-foreground")}>
              Start again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {config.items.map((item, index) => {
              const isDone = index < currentIndex;
              const isActive = index === currentIndex;
              return (
                <button key={item.id} onClick={() => handleItemTap(index)}
                  data-active={isActive ? "true" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl p-4 text-left",
                    "touch-manipulation select-none transition-all duration-300",
                    isDone && "opacity-50 scale-[0.97]",
                    isActive && "scale-[1.02]",
                    isDone
                      ? config.highContrast ? "bg-gray-700 text-gray-400" : "bg-muted/50 text-muted-foreground"
                      : isActive
                        ? config.highContrast ? "bg-yellow-400 text-black border-4 border-white" : "bg-primary text-primary-foreground shadow-lg"
                        : config.highContrast ? "bg-gray-800 text-white border-2 border-gray-600" : "bg-muted text-foreground"
                  )}>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.label} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold">{item.label}</p>
                    {config.showDuration && item.durationMinutes !== undefined && (
                      <p className="text-sm opacity-70">{item.durationMinutes} min</p>
                    )}
                  </div>
                  {config.showCheckmarks && isDone && (
                    <span className="text-2xl flex-shrink-0"
                      style={!config.highContrast ? { animation: "checkmark-pop 300ms cubic-bezier(0.4, 0, 0.2, 1) both" } : undefined}>
                      ✓
                    </span>
                  )}
                  {isActive && config.showDuration && item.durationMinutes && timerSeconds !== null && (
                    <CountdownRing totalSeconds={totalTimerRef.current} secondsLeft={timerSeconds} highContrast={config.highContrast} />
                  )}
                  {isActive && timerSeconds === null && (
                    <span className="text-2xl flex-shrink-0">→</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PremiumScreen>
    </div>
  );
}
