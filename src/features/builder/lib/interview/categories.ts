import type { CategoryConfig, InterviewQuestion } from "./types";

// ---------------------------------------------------------------------------
// Shared age question — used by all 10 categories as the first essential Q
// ---------------------------------------------------------------------------
const AGE_QUESTION: InterviewQuestion = {
  id: "age_range",
  text: "Who will use this app?",
  type: "chips",
  options: [
    { label: "Toddler (1-3)", value: "toddler" },
    { label: "Preschool (3-5)", value: "preschool" },
    { label: "School-age (6-12)", value: "school-age" },
    { label: "Teen/Adult", value: "adolescent" },
  ],
  required: true,
  phase: "essential",
};

// ---------------------------------------------------------------------------
// 4 shared extended questions (identical across all categories)
// ---------------------------------------------------------------------------
const EXTENDED_QUESTIONS: InterviewQuestion[] = [
  {
    id: "interaction_style",
    text: "How should the app respond to touch?",
    type: "chips",
    options: [
      { label: "Tap to select", value: "tap" },
      { label: "Drag and drop", value: "drag" },
      { label: "Sequence/order", value: "sequence" },
      { label: "Free-form", value: "free-form" },
    ],
    required: false,
    phase: "extended",
  },
  {
    id: "reinforcement",
    text: "How should the app celebrate success?",
    type: "chips",
    options: [
      { label: "Stars/tokens", value: "tokens" },
      { label: "Animations", value: "animation" },
      { label: "Sounds", value: "sound" },
      { label: "Points", value: "points" },
      { label: "Just a checkmark", value: "completion" },
    ],
    required: false,
    phase: "extended",
  },
  {
    id: "accessibility",
    text: "Any accessibility needs?",
    type: "chips",
    options: [
      { label: "High contrast", value: "high-contrast" },
      { label: "Large touch targets", value: "large-targets" },
      { label: "No sound required", value: "no-sound" },
      { label: "Simple animations only", value: "simple-animations" },
      { label: "None of these", value: "none" },
    ],
    required: false,
    phase: "extended",
  },
  {
    id: "color_preference",
    text: "What color feel do you prefer?",
    type: "chips",
    options: [
      { label: "Calm/cool tones", value: "cool" },
      { label: "Warm/cheerful", value: "warm" },
      { label: "High contrast", value: "high-contrast" },
      { label: "Let AI decide", value: "auto" },
    ],
    required: false,
    phase: "extended",
  },
];

// ---------------------------------------------------------------------------
// Helper to get a readable age label for prompt templates
// ---------------------------------------------------------------------------
function ageLabel(age_range: string): string {
  const map: Record<string, string> = {
    toddler: "toddler (1–3 years old)",
    preschool: "preschool-age (3–5 years old)",
    "school-age": "school-age (6–12 years old)",
    adolescent: "teen or adult",
  };
  return map[age_range] ?? age_range;
}

// ---------------------------------------------------------------------------
// 10 Category definitions
// ---------------------------------------------------------------------------

const communicationBoard: CategoryConfig = {
  id: "communication-board",
  label: "Communication Board",
  icon: "forum",
  description: "Help your child communicate with pictures and words",
  questions: [
    AGE_QUESTION,
    {
      id: "word_count",
      text: "How many words should the board show at once?",
      type: "chips",
      options: [
        { label: "6 words (2×3)", value: "6" },
        { label: "9 words (3×3)", value: "9" },
        { label: "12 words (3×4)", value: "12" },
        { label: "16+ words (4×4)", value: "16" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "word_type",
      text: "What kind of vocabulary should the board focus on?",
      type: "chips",
      options: [
        { label: "Core words (I want, help, more…)", value: "core" },
        { label: "Food & drink", value: "food" },
        { label: "Feelings", value: "feelings" },
        { label: "Activities & places", value: "activities" },
        { label: "Custom / I'll describe", value: "custom" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "sound", description: "Audible word spoken aloud when card is tapped" },
    accessibilityNotes: ["Large touch targets for low-motor-control users"],
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "school-age"));
    const count = String(answers.word_count ?? "9");
    const wordType = String(answers.word_type ?? "core");
    const cols = count === "6" ? 3 : count === "9" ? 3 : count === "12" ? 4 : 4;
    const rows = count === "6" ? 2 : count === "9" ? 3 : count === "12" ? 3 : 4;
    const wordTypeLabel = wordType === "core"
      ? "core AAC words (e.g. I want, help, more, stop, yes, no, eat, drink, play)"
      : wordType === "food" ? "common food and drink vocabulary"
      : wordType === "feelings" ? "emotion and feelings vocabulary (happy, sad, angry, scared, tired, excited)"
      : wordType === "activities" ? "activity and location vocabulary (playground, school, home, read, run, swim)"
      : "custom vocabulary described by the therapist";
    const colorNote = answers.color_preference === "cool"
      ? "Use calm blues and teals."
      : answers.color_preference === "warm"
      ? "Use warm yellows and oranges."
      : answers.color_preference === "high-contrast"
      ? "Use high-contrast black and white with bold color accents."
      : "Choose a calm, friendly color palette appropriate for the age group.";

    return `Build a communication board app for a ${age}. \
The board displays a ${cols}×${rows} grid of ${count} ${wordTypeLabel}. \
Each card shows a clear picture illustration on top and a word label below in large, readable text. \
Tapping a card speaks the word aloud using text-to-speech and adds it to a sentence strip at the top of the screen. \
The sentence strip shows the sequence of selected words and includes a green "Speak sentence" button that reads the full sentence aloud and a red "Clear" button to reset. \
Cards should have rounded corners, generous padding, and be visually distinct with a subtle icon or illustration for each word. \
Include a settings icon in the top-right corner that opens a panel where the caregiver can toggle word categories or hide individual cards. \
${colorNote} \
Prioritize accessibility: touch targets must be at least 60×60px, font size at least 18px, and tapping a card should give immediate audio feedback. \
The layout should be fully responsive and work on both tablets and phones in landscape orientation.`;
  },
};

const visualSchedule: CategoryConfig = {
  id: "visual-schedule",
  label: "Visual Schedule",
  icon: "schedule",
  description: "Step-by-step routines with pictures",
  questions: [
    AGE_QUESTION,
    {
      id: "routine_type",
      text: "Which routine does this schedule cover?",
      type: "chips",
      options: [
        { label: "Morning routine", value: "morning" },
        { label: "Bedtime routine", value: "bedtime" },
        { label: "School day", value: "school" },
        { label: "Mealtime", value: "mealtime" },
        { label: "Custom routine", value: "custom" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "step_count",
      text: "How many steps should the schedule show?",
      type: "chips",
      options: [
        { label: "4 steps (short)", value: "4" },
        { label: "6 steps (medium)", value: "6" },
        { label: "8 steps (longer)", value: "8" },
        { label: "10+ steps", value: "10" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "sequence",
    reinforcementStrategy: { type: "animation", description: "Gentle celebration animation when all steps are completed" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "school-age"));
    const routine = String(answers.routine_type ?? "morning");
    const steps = String(answers.step_count ?? "6");
    const routineLabel = routine === "morning" ? "morning routine (e.g. wake up, use toilet, brush teeth, get dressed, eat breakfast, put on shoes)"
      : routine === "bedtime" ? "bedtime routine (e.g. put on pajamas, brush teeth, wash face, read a book, lights out)"
      : routine === "school" ? "school day routine (e.g. arrive at school, put away backpack, morning work, snack, reading group, lunch, recess, pack up)"
      : routine === "mealtime" ? "mealtime routine (e.g. wash hands, sit at table, use utensils, eat slowly, ask to be excused, clear plate)"
      : "custom routine described by the therapist";
    const arrowNote = Number(steps) <= 6
      ? 'A large "NOW" arrow or highlighted border shows the current step.'
      : 'A progress bar at the top shows how many steps have been completed. The current step is highlighted with a bright border.';

    return `Build a visual schedule app for a ${age} to follow their ${routineLabel}. \
Display ${steps} steps in a vertically scrolling list. \
Each step shows a large, colorful picture illustration on the left, the step name in bold large text, and a circular checkmark button on the right. \
When the child taps the checkmark, the step animates to a "done" state — the picture grays out slightly, a green checkmark appears, and a soft chime plays. \
${arrowNote} \
Completed steps remain visible but visually subdued so the child can see their progress. \
When all steps are completed, show a full-screen celebration with stars and a message like "Great job! You did it!" with a "Start over" button. \
The app should be touch-friendly with large tap targets (minimum 60px height per step). \
Include a reset button accessible only via a long-press on the title to prevent accidental resets. \
Use a clean, uncluttered layout with a white or very light background and distinct step cards.`;
  },
};

const tokenBoard: CategoryConfig = {
  id: "token-board",
  label: "Token Board",
  icon: "star",
  description: "Earn stars and prizes for great work",
  questions: [
    AGE_QUESTION,
    {
      id: "token_count",
      text: "How many tokens to earn a reward?",
      type: "chips",
      options: [
        { label: "3 tokens (quick wins)", value: "3" },
        { label: "5 tokens (standard)", value: "5" },
        { label: "10 tokens (challenging)", value: "10" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "reward_type",
      text: "How are rewards chosen?",
      type: "chips",
      options: [
        { label: "Child picks from 3 options", value: "child-choice" },
        { label: "Sticker collection", value: "stickers" },
        { label: "Screen time minutes", value: "screen-time" },
        { label: "Therapist sets reward", value: "custom" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "tokens", description: "Gold star tokens fill from left to right" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "school-age"));
    const count = String(answers.token_count ?? "5");
    const rewardType = String(answers.reward_type ?? "child-choice");
    const rewardNote = rewardType === "child-choice"
      ? `Before starting, the child picks their reward from 3 picture options (e.g. screen time, snack, outdoor play). The chosen reward is displayed in a small "working for" section at the top.`
      : rewardType === "stickers"
      ? "Earned tokens become collectible stickers that go into a sticker book panel accessible from the top right."
      : rewardType === "screen-time"
      ? "Earned tokens convert to screen-time minutes displayed prominently. The therapist can configure the conversion rate (e.g. 1 token = 5 minutes)."
      : "The therapist sets a custom reward goal before the session. The reward image and name are shown at the top of the board.";

    return `Build a token economy reward board for a ${age}. \
The board shows ${count} token slots arranged in a prominent horizontal row in the center of the screen. \
Each slot starts as an empty circle. When the therapist taps a slot, a gold star fills it with a satisfying pop animation and a bright chime sound. \
Tokens fill from left to right. \
${rewardNote} \
When all ${count} tokens are earned, trigger a full-screen celebration: confetti rains down, an upbeat jingle plays, and the reward is shown in large text with a congratulatory message. \
After the celebration, show a "Reset" button and an optional "Partial reset" that removes only the last token (for mistake corrections). \
The therapist controls all token awarding — the child cannot tap tokens themselves (lock this interaction). \
Include a settings icon for the therapist to adjust the number of tokens, change the reward, or toggle sound. \
Design should be bright, motivating, and age-appropriate — big bold fonts, vivid colors, and playful icons.`;
  },
};

const socialStory: CategoryConfig = {
  id: "social-story",
  label: "Social Story",
  icon: "menu_book",
  description: "Prepare for new experiences with illustrated stories",
  questions: [
    AGE_QUESTION,
    {
      id: "story_topic",
      text: "What experience is this story about?",
      type: "chips",
      options: [
        { label: "Going to the dentist", value: "dentist" },
        { label: "Getting a haircut", value: "haircut" },
        { label: "Starting a new school", value: "new-school" },
        { label: "Playing on the playground", value: "playground" },
        { label: "Custom story", value: "custom" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "page_count",
      text: "How many pages should the story have?",
      type: "chips",
      options: [
        { label: "4 pages (brief)", value: "4" },
        { label: "6 pages (standard)", value: "6" },
        { label: "8 pages (detailed)", value: "8" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "sequence",
    reinforcementStrategy: { type: "completion", description: "A 'Well done!' message appears after the last page" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "preschool"));
    const topic = String(answers.story_topic ?? "dentist");
    const pages = String(answers.page_count ?? "6");
    const topicLabel = topic === "dentist" ? "going to the dentist"
      : topic === "haircut" ? "getting a haircut"
      : topic === "new-school" ? "starting at a new school"
      : topic === "playground" ? "playing on the playground with other children"
      : "the custom experience described by the therapist";
    const storyNote = topic === "dentist"
      ? `Pages should cover: 1) Today I am going to the dentist, 2) The waiting room has chairs and toys, 3) The dentist will count my teeth with a small mirror, 4) I might hear buzzing sounds — that is okay, 5) I will try to sit still, 6) When it is done, I did a great job!`
      : topic === "haircut"
      ? `Pages should cover: 1) Today I am getting a haircut, 2) I will sit in a special chair, 3) The stylist will use scissors and a comb, 4) I might feel the scissors near my ears — that is okay, 5) It will not hurt, 6) When it is done, I will look great!`
      : topic === "new-school"
      ? `Pages should cover: 1) Tomorrow is my first day at a new school, 2) I will meet my new teacher, 3) There will be other kids in my class, 4) We will do fun activities together, 5) If I feel nervous, I can take a deep breath, 6) At the end of the day, I will go home.`
      : topic === "playground"
      ? `Pages should cover: 1) I am going to the playground, 2) Other children will be there, 3) I can ask 'Can I play?' to join a game, 4) We can take turns on the swings, 5) If I feel frustrated, I can walk away and breathe, 6) Playing with friends is fun!`
      : `Write ${pages} pages that walk through the experience step by step, addressing what the child will see, hear, and feel, and how they can cope.`;

    return `Build a social story app to help a ${age} prepare for ${topicLabel}. \
The story has ${pages} pages displayed one at a time in a full-screen, book-like layout. \
Each page shows a large, colorful illustration in the top two-thirds of the screen and 1–2 simple sentences in large text (at least 22px) below. \
${storyNote} \
Include a prominent read-aloud button on each page that speaks the text using warm, child-friendly text-to-speech. \
Navigation uses large left and right arrow buttons at the bottom. Tapping the illustration zooms it in for a closer look. \
Show a progress indicator (e.g. "Page 2 of ${pages}") at the top. \
After the last page, show a "You did it!" screen with a star graphic and a "Read again" button. \
The design should feel warm and reassuring — rounded corners, soft colors, friendly typography, no sharp edges or busy backgrounds.`;
  },
};

const feelingsCheckin: CategoryConfig = {
  id: "feelings-checkin",
  label: "Feelings Check-In",
  icon: "favorite",
  description: "Identify and express emotions",
  questions: [
    AGE_QUESTION,
    {
      id: "emotion_count",
      text: "How many emotions should the app show?",
      type: "chips",
      options: [
        { label: "4 emotions (simple)", value: "4" },
        { label: "6 emotions (standard)", value: "6" },
        { label: "8 emotions (detailed)", value: "8" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "include_journal",
      text: "Should the child be able to leave a note about how they feel?",
      type: "chips",
      options: [
        { label: "Yes, include a journal space", value: "yes" },
        { label: "No, just the emotion picker", value: "no" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "animation", description: "Gentle animation confirms the emotion selected" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "preschool"));
    const count = Number(answers.emotion_count ?? 6);
    const journal = String(answers.include_journal ?? "no") === "yes";
    const emotions4 = "happy, sad, angry, scared";
    const emotions6 = "happy, sad, angry, scared, surprised, tired";
    const emotions8 = "happy, sad, angry, scared, surprised, tired, frustrated, calm";
    const emotionList = count <= 4 ? emotions4 : count <= 6 ? emotions6 : emotions8;
    const journalSection = journal
      ? `Below the emotion grid, show a simple journal area with a large text field where the child can type or dictate why they feel that way. Include a "Save" button that stores the entry with a timestamp and the selected emotion. A "My journal" button in the top right opens a list of past entries.`
      : `After selecting an emotion, show a brief affirmation message (e.g. "It is okay to feel angry. Let's take a deep breath together.") with a calming breathing animation.`;

    return `Build a feelings check-in app for a ${age} to identify and communicate their emotions. \
Display ${count} emotion tiles in a centered grid layout. Each tile shows a large expressive face illustration and the emotion word (${emotionList}) in bold text beneath it. \
Tiles should be at least 100×100px with generous spacing and rounded corners. \
When the child taps an emotion tile, it scales up with a gentle bounce animation, plays a soft confirmation sound, and the tile border glows in the emotion's associated color (e.g. yellow for happy, blue for sad, red for angry). \
${journalSection} \
Include a "How are you feeling?" prompt in large, friendly text at the top of the screen. \
The design should feel safe and inviting: soft pastel backgrounds, rounded everything, no harsh lines. \
Therapist mode (accessible via a long-press on the title) shows a history of the child's emotion selections over time as a simple color-coded timeline.`;
  },
};

const flashcards: CategoryConfig = {
  id: "flashcards",
  label: "Flashcards",
  icon: "style",
  description: "Practice matching and memory skills",
  questions: [
    AGE_QUESTION,
    {
      id: "topic",
      text: "What should the flashcards teach?",
      type: "chips",
      options: [
        { label: "Letters A–Z", value: "letters" },
        { label: "Numbers 1–20", value: "numbers" },
        { label: "Animals", value: "animals" },
        { label: "Colors & shapes", value: "colors" },
        { label: "Custom topic", value: "custom" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "card_count",
      text: "How many cards in the deck?",
      type: "chips",
      options: [
        { label: "8 cards (short session)", value: "8" },
        { label: "12 cards (medium)", value: "12" },
        { label: "16 cards (longer)", value: "16" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "animation", description: "Card flip animation with positive sound on correct answer" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "preschool"));
    const topic = String(answers.topic ?? "letters");
    const count = String(answers.card_count ?? "12");
    const topicLabel = topic === "letters" ? "uppercase and lowercase letter pairs (A/a through Z/z)"
      : topic === "numbers" ? "number recognition and counting (1 through 20 with matching dot arrays)"
      : topic === "animals" ? "common animal names and pictures (dog, cat, bird, fish, horse, cow, pig, duck, frog, rabbit, bear, lion)"
      : topic === "colors" ? "color names and shape recognition (red circle, blue square, green triangle, yellow star, etc.)"
      : "the custom topic described by the therapist";

    return `Build an interactive flashcard app for a ${age} to practice ${topicLabel}. \
The app shows ${count} cards in a deck, one card at a time. \
Each card has a front side showing a picture illustration and a back side showing the word or answer. \
The card flips with a smooth 3D rotation animation when tapped. \
After flipping, show two buttons: a green "Got it!" thumb-up button and a red "Try again" button. \
Cards marked "Got it!" move to a "Mastered" pile shown as a stack in the corner; "Try again" cards cycle back into the deck. \
Show a progress bar at the top: "X of ${count} mastered". \
When all cards are mastered, show a celebration screen with the total time taken and a "Play again" button. \
Cards should be visually large and easy to tap — minimum 280×200px in portrait, 400×280px in landscape. \
Include a shuffle button to randomize card order. \
Speak the card's word/label aloud automatically when the card is flipped to the answer side.`;
  },
};

const dataTracker: CategoryConfig = {
  id: "data-tracker",
  label: "Data Tracker",
  icon: "bar_chart",
  description: "Track behaviors and progress over time",
  questions: [
    AGE_QUESTION,
    {
      id: "tracking_type",
      text: "What type of data does this tracker collect?",
      type: "chips",
      options: [
        { label: "Frequency (how many times)", value: "frequency" },
        { label: "Duration (how long)", value: "duration" },
        { label: "Trial-by-trial (correct/incorrect)", value: "trial" },
        { label: "ABC (antecedent/behavior/consequence)", value: "abc" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "none", description: "No reinforcement — data tool for therapists" },
    dataTracking: ["frequency", "duration", "accuracy", "prompts"],
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "school-age"));
    const type = String(answers.tracking_type ?? "frequency");
    const typeNote = type === "frequency"
      ? `The main screen shows a large tally counter with a + button the therapist taps each time the target behavior occurs. A session timer runs in the background. Data shows total count, rate per minute, and a bar graph of counts across sessions.`
      : type === "duration"
      ? `The main screen shows a large stopwatch. The therapist taps Start when the behavior begins and Stop when it ends. Multiple intervals can be recorded in one session. Data shows total duration, average duration per occurrence, and a timeline visualization.`
      : type === "trial"
      ? `The main screen shows a clean trial-by-trial interface: for each trial the therapist taps one of three buttons — Correct (green), Incorrect (red), or No Response (gray). A running score shows "X/Y correct (Z%)". At the end of the session, show a summary table and a percentage correct graph.`
      : `The main screen shows a structured ABC form: Antecedent (what happened before), Behavior (what the child did), Consequence (what happened after). The therapist fills in each section with quick-tap chips or free text. Each logged incident shows in a scrollable list below.`;

    return `Build a behavior data-tracking app for use by a therapist working with a ${age}. \
${typeNote} \
Include a session setup screen where the therapist enters: the child's name or initials, the target behavior being tracked, and the session date. \
Data persists between sessions. A "History" tab shows all past sessions with sortable columns and sparkline trend graphs. \
Include an "Export" button that copies the session data as a formatted CSV-compatible summary to the clipboard. \
The UI should be clean and professional — this is a clinical tool for therapists. \
Use a neutral color palette (white, gray, with green/red for correct/incorrect). \
Large tap targets for all buttons (minimum 60px) since the therapist is watching the child while tapping. \
Include an undo button for the last recorded data point to correct accidental taps.`;
  },
};

const timerTool: CategoryConfig = {
  id: "timer-tool",
  label: "Timer Tool",
  icon: "timer",
  description: "Manage transitions and time-based activities",
  questions: [
    AGE_QUESTION,
    {
      id: "timer_style",
      text: "What kind of timer does this need?",
      type: "chips",
      options: [
        { label: "Countdown with number", value: "countdown" },
        { label: "Visual shrinking timer", value: "visual-timer" },
        { label: "First-Then board", value: "first-then" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "sound", description: "Gentle chime when time is up" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "school-age"));
    const style = String(answers.timer_style ?? "visual-timer");
    const styleNote = style === "countdown"
      ? `Display a large digital countdown timer (MM:SS) centered on screen. Below it, show a simple activity label (e.g. "Work time" or "Play time") in large text. Include +1min and -1min adjustment buttons. A progress bar shrinks as time counts down. When time reaches zero, flash a gentle alert and play a calming chime.`
      : style === "visual-timer"
      ? `Display a large circular timer that visually shrinks (like a pizza slice disappearing) as time counts down. The remaining time fills with a bright color (green → yellow → red as it gets low). The center of the circle shows the remaining time in large digits. This visual format is ideal for children who struggle with abstract time concepts.`
      : `Display a "First → Then" board with two large panels side by side. The left panel (First) shows the current task with a picture and label. The right panel (Then) shows the upcoming reward or preferred activity. A simple arrow icon points from left to right. Once the child completes the first task, the therapist taps a "Done!" button which highlights the Then panel with a celebratory animation.`;

    return `Build a visual timer and transition tool for a ${age}. \
${styleNote} \
The therapist can preset common durations (1 min, 3 min, 5 min, 10 min) via large quick-tap buttons, or enter a custom time. \
Include a pause button that freezes the timer and dims the screen slightly. \
The screen should remain on while the timer is running (request wake lock). \
When the timer ends, show a clear visual and audio signal — avoid harsh buzzers, use gentle ascending chimes instead. \
The design should be calming and distraction-free: minimal UI chrome, large central timer display, soft background colors. \
Include a dark mode option for low-stimulation environments.`;
  },
};

const choiceBoard: CategoryConfig = {
  id: "choice-board",
  label: "Choice Board",
  icon: "grid_view",
  description: "Make decisions with visual options",
  questions: [
    AGE_QUESTION,
    {
      id: "choice_count",
      text: "How many choices should be shown at once?",
      type: "chips",
      options: [
        { label: "2 choices (simple)", value: "2" },
        { label: "3 choices (standard)", value: "3" },
        { label: "4 choices (more variety)", value: "4" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "choice_context",
      text: "What kinds of choices will this board offer?",
      type: "chips",
      options: [
        { label: "Activity choices", value: "activity" },
        { label: "Food choices", value: "food" },
        { label: "Reward choices", value: "reward" },
        { label: "Work task choices", value: "work" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "animation", description: "Selected choice highlights with glow effect" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "preschool"));
    const count = String(answers.choice_count ?? "3");
    const context = String(answers.choice_context ?? "activity");
    const exampleChoices = context === "activity" ? "reading, coloring, puzzle, building blocks"
      : context === "food" ? "apple, crackers, yogurt, sandwich"
      : context === "reward" ? "stickers, computer time, outdoor play, favorite toy"
      : "writing practice, math worksheet, reading aloud, flashcard review";

    return `Build a visual choice board for a ${age} to make supported decisions. \
Display ${count} choice options as large, equally-sized cards arranged in a ${count === "2" ? "2-column row" : count === "3" ? "3-column row" : "2×2 grid"}. \
Each card shows a large picture illustration on top and a bold label below (example choices: ${exampleChoices}). \
Cards should fill most of the screen — minimum 150×150px each. \
When the child taps a card, it scales up with a gentle bounce, a glowing border appears around it, and a cheerful chime plays. \
The selected choice is spoken aloud via text-to-speech. \
After selection, show a confirmation message: "You chose [choice name]!" in large text, with a 3-second delay before the board resets. \
The therapist/caregiver can edit the choices via a settings panel (long-press on the board title): add/remove choices, upload custom photos, and edit labels. \
Include a "Randomize" button that shuffles which choices appear each time (useful when there are more than ${count} options in the library). \
Design for maximum visual clarity — high contrast between cards, generous whitespace, no distracting backgrounds.`;
  },
};

const articulationPractice: CategoryConfig = {
  id: "articulation-practice",
  label: "Articulation Practice",
  icon: "record_voice_over",
  description: "Practice speech sounds and pronunciation",
  questions: [
    AGE_QUESTION,
    {
      id: "target_sound",
      text: "Which sound are we practicing?",
      type: "chips",
      options: [
        { label: "/s/ sound", value: "s" },
        { label: "/r/ sound", value: "r" },
        { label: "/l/ sound", value: "l" },
        { label: "/th/ sound", value: "th" },
        { label: "Custom sound", value: "custom" },
      ],
      required: true,
      phase: "essential",
    },
    {
      id: "word_position",
      text: "Where in the word does the target sound appear?",
      type: "chips",
      options: [
        { label: "Beginning of word (initial)", value: "initial" },
        { label: "Middle of word (medial)", value: "medial" },
        { label: "End of word (final)", value: "final" },
        { label: "All positions", value: "all" },
      ],
      required: true,
      phase: "essential",
    },
    ...EXTENDED_QUESTIONS,
  ],
  defaults: {
    interactionModel: "tap",
    reinforcementStrategy: { type: "tokens", description: "Stars earned for each successful practice trial" },
  },
  promptTemplate: (answers) => {
    const age = ageLabel(String(answers.age_range ?? "school-age"));
    const sound = String(answers.target_sound ?? "s");
    const position = String(answers.word_position ?? "initial");
    const posLabel = position === "initial" ? "at the beginning of words"
      : position === "medial" ? "in the middle of words"
      : position === "final" ? "at the end of words"
      : "at the beginning, middle, and end of words";
    const exWords = sound === "s" && position === "initial" ? "sun, sock, sandwich, soap, six, sit, sail, seed"
      : sound === "r" && position === "initial" ? "rain, run, rabbit, red, ring, rope, rock, river"
      : sound === "l" && position === "initial" ? "lake, lamp, leaf, lemon, lion, lock, log, lunch"
      : sound === "th" ? "the, this, that, three, thumb, thin, thick, thank"
      : `words featuring the /${sound}/ sound ${posLabel}`;

    return `Build a speech articulation practice app for a ${age} working on the /${sound}/ sound ${posLabel}. \
Display a set of practice word cards one at a time, each showing a large picture illustration and the target word in large, clear text (e.g. ${exWords}). \
The target sound in each word is highlighted in a bright color to draw attention to it. \
Below each card, show three buttons: a speaker icon to hear the word modeled correctly via TTS, a microphone icon to record the child's attempt, and a "Next word" arrow. \
After the child records their attempt, play it back immediately so they can self-monitor. \
Include a simple therapist scoring panel at the bottom: three buttons — Correct (green), Stimulable (yellow), Incorrect (red) — for the SLP to mark each attempt. \
Maintain a running accuracy score shown as "X/Y correct" during the session. \
After 10 cards, show a session summary with accuracy percentage, a sparkline of performance over time, and a motivating message. \
Reward system: for every 5 correct productions, a star token is added to a small token board visible at the top of the screen. \
Use clear, professional typography and a clean layout — this is a clinical tool but should feel engaging for children.`;
  },
};

// ---------------------------------------------------------------------------
// Full CATEGORIES export (top 5 visual + bottom 5 expandable)
// ---------------------------------------------------------------------------
export const CATEGORIES: CategoryConfig[] = [
  communicationBoard,
  visualSchedule,
  tokenBoard,
  socialStory,
  feelingsCheckin,
  flashcards,
  dataTracker,
  timerTool,
  choiceBoard,
  articulationPractice,
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getCategoryById(id: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getEssentialQuestions(categoryId: string): InterviewQuestion[] {
  const cat = getCategoryById(categoryId);
  return cat?.questions.filter((q) => q.phase === "essential") ?? [];
}

export function getExtendedQuestions(categoryId: string): InterviewQuestion[] {
  const cat = getCategoryById(categoryId);
  return cat?.questions.filter((q) => q.phase === "extended") ?? [];
}
