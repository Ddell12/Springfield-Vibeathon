"use client";

import { useCallback, useState } from "react";

import { getWeekStart } from "../lib/time-slots";

type CalendarView = "week" | "day";

export function useCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("week");

  const weekStart = getWeekStart(currentDate);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - (view === "week" ? 7 : 1));
      return d;
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (view === "week" ? 7 : 1));
      return d;
    });
  }, [view]);

  return {
    currentDate,
    weekStart,
    view,
    setView,
    goToToday,
    goToPrevious,
    goToNext,
  };
}
