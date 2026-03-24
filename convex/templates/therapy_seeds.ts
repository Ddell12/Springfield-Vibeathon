/**
 * Therapy template seed data for Builder V2.
 * These are example prompts shown to users as inspiration in the builder interface.
 */

export const THERAPY_SEED_PROMPTS = [
  {
    id: "token-board-basic",
    title: "Token Board",
    prompt:
      "Build a token board with 5 star tokens. When all tokens are earned, show a celebration and let the child choose a reward from: screen time, favorite snack, or choose a game.",
    category: "rewards",
    tags: ["ABA", "positive reinforcement", "behavior"],
  },
  {
    id: "morning-routine",
    title: "Morning Routine Tracker",
    prompt:
      "Create a visual morning routine for a child with autism. Steps: wake up, brush teeth, get dressed, eat breakfast, pack backpack. Each step has a fun icon and can be tapped to mark as done.",
    category: "routines",
    tags: ["visual schedule", "independence", "morning"],
  },
  {
    id: "feelings-board",
    title: "Feelings Communication Board",
    prompt:
      "Make a feelings board where a child can tap an emotion card to communicate how they feel. Include: happy, sad, angry, scared, excited, tired, calm, and worried. Each card says the word out loud when tapped.",
    category: "communication",
    tags: ["AAC", "emotions", "non-verbal"],
  },
  {
    id: "bedtime-routine",
    title: "Bedtime Routine",
    prompt:
      "Create a calming bedtime visual schedule with 6 steps: put on pajamas, brush teeth, wash face, read a book, deep breaths, lights off. Use a soothing dark blue theme.",
    category: "routines",
    tags: ["visual schedule", "sleep", "routine"],
  },
  {
    id: "basic-needs-board",
    title: "Basic Needs Board",
    prompt:
      "Build a simple AAC board for a non-verbal child to request basic needs: water, food, bathroom, break, help, and sleep. Large buttons with icons and text that speak when tapped.",
    category: "communication",
    tags: ["AAC", "non-verbal", "basic needs"],
  },
  {
    id: "social-story-app",
    title: "Social Story Viewer",
    prompt:
      "Create a social story app for going to the doctor. Show 5 illustrated steps: arrive at clinic, check in at desk, wait in waiting room, meet the doctor, get a sticker for being brave. Simple text and colorful illustrations.",
    category: "social-skills",
    tags: ["social story", "anxiety", "medical"],
  },
  {
    id: "countdown-timer",
    title: "Visual Countdown Timer",
    prompt:
      "Build a visual countdown timer for transitions. When I set 5 minutes, show a shrinking colored bar so a child can see time passing. Add a gentle sound when time is up. Include presets for 1, 3, 5, and 10 minutes.",
    category: "transitions",
    tags: ["timer", "transitions", "anxiety"],
  },
  {
    id: "choice-board",
    title: "Free Time Choice Board",
    prompt:
      "Create a choice board with 6 free time activity options: read a book, draw a picture, play with LEGOs, watch a video, go outside, and quiet time. Tapping a card speaks the choice aloud and highlights it.",
    category: "communication",
    tags: ["choice making", "free time", "AAC"],
  },
] as const;

export type TherapySeedPrompt = (typeof THERAPY_SEED_PROMPTS)[number];
export type TherapySeedCategory = TherapySeedPrompt["category"];
