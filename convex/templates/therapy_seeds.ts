/**
 * Therapy template seed data for Builder V2.
 * These are the 4 core therapy app templates shown in the builder.
 */

export const THERAPY_SEED_PROMPTS = [
  {
    id: "communication-board",
    title: "Communication Board",
    prompt:
      "Build a communication board for a nonverbal child. Include a 3x3 grid with core words (I want, help, more, stop, yes, no, eat, drink, play). Each card has a picture and label. Tapping a card speaks the word aloud and adds it to a sentence strip at the top. The sentence strip has a play button to speak the full sentence and a clear button.",
    category: "communication",
    tags: ["AAC", "non-verbal", "core words", "sentence strip"],
    description:
      "A picture-based AAC board with tap-to-speak cards and a sentence builder strip.",
  },
  {
    id: "visual-schedule",
    title: "Morning Routine",
    prompt:
      "Build a morning routine visual schedule for a 5-year-old. Include 6 steps: wake up, use toilet, brush teeth, get dressed, eat breakfast, put on shoes. Each step has a picture, label, and a checkmark button. Completed steps show a green checkmark. A 'Now' arrow highlights the current step. When all steps are done, show a calm celebration.",
    category: "schedule",
    tags: ["visual schedule", "routine", "independence", "morning"],
    description:
      "A step-by-step morning routine with pictures, progress tracking, and celebration.",
  },
  {
    id: "token-board",
    title: "5-Star Reward Board",
    prompt:
      "Build a 5-star token board. The therapist taps to award a gold star when the child completes a task. Stars fill in left to right with a pop animation. Before starting, the child picks a reward from 3 options (screen time, snack, playground). When all 5 stars are earned, show the chosen reward with a celebration animation and a reset button.",
    category: "reward",
    tags: ["ABA", "positive reinforcement", "token economy", "behavior"],
    description:
      "A reward system where children earn stars toward a chosen prize.",
  },
  {
    id: "social-story",
    title: "Going to the Dentist",
    prompt:
      "Build a social story about going to the dentist for a young child with autism. Include 6 pages: 1) Today I am going to the dentist, 2) The waiting room has chairs and magazines, 3) The dentist will look at my teeth with a small mirror, 4) I might hear buzzing sounds -- that's okay, 5) I will try to sit still and the dentist will be gentle, 6) When it's done, I did a great job! Each page has a large illustration on top and 1-2 sentences below, with a read-aloud button.",
    category: "social-story",
    tags: ["social story", "anxiety", "dental", "preparation"],
    description:
      "A page-by-page social story with illustrations and read-aloud narration.",
  },
] as const;

export type TherapySeedPrompt = (typeof THERAPY_SEED_PROMPTS)[number];
export type TherapySeedCategory = TherapySeedPrompt["category"];
