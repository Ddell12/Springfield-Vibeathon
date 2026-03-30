export type CelebrationTrigger =
  | { type: "streak"; value: number }
  | { type: "weekly-complete" }
  | { type: "goal-met"; goalDescription: string };

/**
 * Returns a celebratory message string for milestone events, or null if
 * the trigger doesn't warrant a celebration (e.g. non-milestone streak).
 *
 * @param trigger - The event that may warrant a celebration
 * @param childName - The child's first name for personalised messages
 */
export function getCelebrationMessage(
  trigger: CelebrationTrigger,
  childName: string
): string | null {
  switch (trigger.type) {
    case "streak": {
      const message = STREAK_MILESTONES[trigger.value];
      if (!message) return null;
      return message.replace("{name}", childName);
    }
    case "weekly-complete":
      return `Amazing work — ${childName}'s weekly practice is complete! Every session adds up.`;
    case "goal-met":
      return `${childName} has met the goal for ${trigger.goalDescription}! Fantastic progress.`;
  }
}

// ---------------------------------------------------------------------------
// Streak milestone messages
// ---------------------------------------------------------------------------

const STREAK_MILESTONES: Record<number, string> = {
  3: `🎉 {name} is on a 3-day streak! Consistency is the secret ingredient.`,
  7: `🌟 One full week of practice! {name} has built an incredible habit.`,
  14: `💪 Two weeks strong! {name}'s dedication is truly inspiring.`,
  30: `🏆 30-day streak! {name} has achieved something extraordinary.`,
};
