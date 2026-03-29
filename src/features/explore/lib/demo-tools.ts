export type DemoToolCategory =
  | "communication"
  | "schedule"
  | "reward"
  | "social-story"
  | "emotional"
  | "speech";

export interface DemoTool {
  id: string;
  title: string;
  description: string;
  category: DemoToolCategory;
  categoryLabel: string;
  prompt: string;
  icon: string;
  gradient: string;
}

/**
 * Static metadata for the 6 featured demo tools on /explore.
 * Prompts for tools 1-4 are copied from therapy_seeds.ts (not imported —
 * explore owns its copy so the two features evolve independently).
 */
export const EXPLORE_DEMO_TOOLS: DemoTool[] = [
  {
    id: "communication-board",
    title: "Communication Board",
    description:
      "A picture-based AAC board with tap-to-speak cards and a sentence builder strip.",
    category: "communication",
    categoryLabel: "Communication",
    prompt:
      "Build a communication board for a nonverbal child. Include a 3x3 grid with core words (I want, help, more, stop, yes, no, eat, drink, play). Each card has a picture and label. Tapping a card speaks the word aloud and adds it to a sentence strip at the top. The sentence strip has a play button to speak the full sentence and a clear button.",
    icon: "chat",
    gradient: "from-primary to-primary-container",
  },
  {
    id: "morning-routine",
    title: "Morning Routine",
    description:
      "A step-by-step morning routine with pictures, progress tracking, and celebration.",
    category: "schedule",
    categoryLabel: "Daily Living",
    prompt:
      "Build a morning routine visual schedule for a 5-year-old. Include 6 steps: wake up, use toilet, brush teeth, get dressed, eat breakfast, put on shoes. Each step has a picture, label, and a checkmark button. Completed steps show a green checkmark. A 'Now' arrow highlights the current step. When all steps are done, show a calm celebration.",
    icon: "light_mode",
    gradient: "from-tertiary to-tertiary-container",
  },
  {
    id: "token-board",
    title: "5-Star Reward Board",
    description:
      "A reward system where children earn stars toward a chosen prize.",
    category: "reward",
    categoryLabel: "Behavior",
    prompt:
      "Build a 5-star token board. The therapist taps to award a gold star when the child completes a task. Stars fill in left to right with a pop animation. Before starting, the child picks a reward from 3 options (screen time, snack, playground). When all 5 stars are earned, show the chosen reward with a celebration animation and a reset button.",
    icon: "star",
    gradient: "from-tertiary-fixed-dim to-tertiary-fixed",
  },
  {
    id: "social-story",
    title: "Going to the Dentist",
    description:
      "A page-by-page social story with illustrations and read-aloud narration.",
    category: "social-story",
    categoryLabel: "Social Skills",
    prompt:
      "Build a social story about going to the dentist for a young child with autism. Include 6 pages: 1) Today I am going to the dentist, 2) The waiting room has chairs and magazines, 3) The dentist will look at my teeth with a small mirror, 4) I might hear buzzing sounds -- that's okay, 5) I will try to sit still and the dentist will be gentle, 6) When it's done, I did a great job! Each page has a large illustration on top and 1-2 sentences below, with a read-aloud button.",
    icon: "menu_book",
    gradient: "from-secondary to-secondary-container",
  },
  {
    id: "emotion-checkin",
    title: "Emotion Check-In",
    description:
      "A feelings picker with body mapping and coping strategy suggestions.",
    category: "emotional",
    categoryLabel: "Emotional",
    prompt:
      "Build an emotion check-in tool for a child in therapy. Show 6 feeling faces (happy, sad, angry, scared, tired, calm) in a grid. When the child taps a feeling, it highlights and asks 'Where do you feel it in your body?' with a simple body outline they can tap. After selecting, show 3 coping strategies (deep breaths, squeeze a pillow, ask for a hug) with pictures. Include a 'I'm ready' button that resets for the next check-in.",
    icon: "mood",
    gradient: "from-error to-error-container",
  },
  {
    id: "articulation-practice",
    title: "Articulation Practice",
    description:
      "Speech sound practice cards with recording, playback, and therapist scoring.",
    category: "speech",
    categoryLabel: "Speech",
    prompt:
      "Build an articulation practice tool for the 'S' sound. Show a card with a large picture and the target word below (sun, soap, sock, bus, house, yes — 6 words total). The child taps a microphone button to record themselves saying the word, then taps play to hear it back. Include a star button the therapist taps to mark it correct. Show progress as filled stars at the top. When all 6 words are complete, show a celebration.",
    icon: "record_voice_over",
    gradient: "from-primary-fixed-dim to-primary-fixed",
  },
];
