/**
 * Calculates the current consecutive-day streak from a list of practice dates.
 *
 * @param dates - ISO date strings ("YYYY-MM-DD"), may contain duplicates
 * @param today - The reference date as "YYYY-MM-DD"
 * @returns Number of consecutive days in the streak (0 if none)
 */
export function calculateStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0;

  // Deduplicate and sort descending
  const unique = Array.from(new Set(dates)).sort().reverse();

  const todayMs = dateToMs(today);
  const yesterdayMs = todayMs - MS_PER_DAY;

  // Streak must start from today or yesterday
  const mostRecentMs = dateToMs(unique[0]);
  if (mostRecentMs !== todayMs && mostRecentMs !== yesterdayMs) return 0;

  let streak = 1;
  let prevMs = mostRecentMs;

  for (let i = 1; i < unique.length; i++) {
    const currMs = dateToMs(unique[i]);
    if (prevMs - currMs === MS_PER_DAY) {
      streak++;
      prevMs = currMs;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Counts the number of unique practice days within the current ISO week
 * (Monday through Sunday) that contains `today`.
 *
 * @param dates - ISO date strings ("YYYY-MM-DD")
 * @param today - The reference date as "YYYY-MM-DD"
 * @returns Count of unique days practiced this week
 */
export function getWeeklyPracticeDays(dates: string[], today: string): number {
  const todayMs = dateToMs(today);

  // JS getDay(): 0=Sun, 1=Mon … 6=Sat. Shift so Monday=0.
  const todayDate = new Date(todayMs);
  const dowSunday = todayDate.getUTCDay(); // 0=Sun
  const dowMonday = (dowSunday + 6) % 7;  // 0=Mon … 6=Sun

  const mondayMs = todayMs - dowMonday * MS_PER_DAY;
  const sundayMs = mondayMs + 6 * MS_PER_DAY;

  const unique = new Set(
    dates.filter((d) => {
      const ms = dateToMs(d);
      return ms >= mondayMs && ms <= sundayMs;
    })
  );

  return unique.size;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** Parse a "YYYY-MM-DD" string to UTC midnight milliseconds. */
function dateToMs(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
