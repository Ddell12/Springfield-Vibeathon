export function getWeekStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

export function getWeekDays(weekStart: number): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * 24 * 60 * 60 * 1000));
}

export function formatTime(time24: string): string {
  const [hour, min] = time24.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${String(min).padStart(2, "0")} ${period}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}
