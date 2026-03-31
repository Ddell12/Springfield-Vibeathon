/**
 * Goal Bank Seed Data for SLP-Native Experience
 *
 * 200+ evidence-based goals across 8 speech-language pathology domains.
 * Placeholders {accuracy} and {sessions} are replaced at runtime with
 * the therapist's chosen target values.
 */

export interface GoalBankEntry {
  domain:
    | "articulation"
    | "language-receptive"
    | "language-expressive"
    | "fluency"
    | "voice"
    | "pragmatic-social"
    | "aac"
    | "feeding";
  ageRange: "0-3" | "3-5" | "5-8" | "8-12" | "12-18" | "adult";
  skillLevel: string;
  shortDescription: string;
  fullGoalText: string;
  defaultTargetAccuracy: number;
  defaultConsecutiveSessions: number;
  exampleBaseline?: string;
  typicalCriterion?: string;
}

export const GOAL_BANK_SEED: GoalBankEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // ARTICULATION — 40 goals
  // ═══════════════════════════════════════════════════════════════════

  // /r/ progression (7 goals)
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "isolation",
    shortDescription: "Produce /r/ in isolation",
    fullGoalText:
      "Given a verbal model and visual cue, the student will produce the /r/ sound in isolation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently produces /r/ as /w/ in all positions",
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "syllable",
    shortDescription: "Produce /r/ in syllables",
    fullGoalText:
      "Given a verbal model, the student will produce the /r/ sound in CV and VC syllable combinations with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /r/ in initial position of words",
    fullGoalText:
      "Given a verbal model or picture cue, the student will produce the /r/ sound in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently produces /r/ in isolation at 80% but 20% at word level",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /r/ in medial and final positions of words",
    fullGoalText:
      "Given a verbal model or picture cue, the student will produce the /r/ sound in medial and final positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "phrase",
    shortDescription: "Produce /r/ in phrases and short sentences",
    fullGoalText:
      "Given a structured activity, the student will produce the /r/ sound correctly in phrases and short sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Produce /r/ in sentences during structured tasks",
    fullGoalText:
      "Given a reading passage or structured narrative task, the student will produce the /r/ sound correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "articulation",
    ageRange: "12-18",
    skillLevel: "conversation",
    shortDescription: "Produce /r/ in conversational speech",
    fullGoalText:
      "Given a conversational context, the student will produce the /r/ sound correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // /s/ progression (5 goals)
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "isolation",
    shortDescription: "Produce /s/ in isolation",
    fullGoalText:
      "Given a verbal model and tactile cue, the student will produce the /s/ sound in isolation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently substitutes /t/ for /s/ (stopping)",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /s/ in initial position of words",
    fullGoalText:
      "Given a picture cue or verbal model, the student will produce the /s/ sound in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /s/ in final position of words",
    fullGoalText:
      "Given a picture cue or verbal model, the student will produce the /s/ sound in the final position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Produce /s/ in sentences",
    fullGoalText:
      "Given a structured activity, the student will produce the /s/ sound correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "12-18",
    skillLevel: "conversation",
    shortDescription: "Produce /s/ in conversational speech",
    fullGoalText:
      "Given a conversational context, the student will produce the /s/ sound correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // /l/ progression (4 goals)
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "isolation",
    shortDescription: "Produce /l/ in isolation",
    fullGoalText:
      "Given a verbal model and visual cue, the student will produce the /l/ sound in isolation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /l/ in initial position of words",
    fullGoalText:
      "Given a verbal model or picture cue, the student will produce the /l/ sound in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently substitutes /w/ for /l/ in initial position",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "phrase",
    shortDescription: "Produce /l/ in phrases",
    fullGoalText:
      "Given a structured activity, the student will produce the /l/ sound correctly in phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "conversation",
    shortDescription: "Produce /l/ in conversational speech",
    fullGoalText:
      "Given a conversational context, the student will produce the /l/ sound correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // /th/ voiced + voiceless (3 goals)
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce voiceless /th/ in words",
    fullGoalText:
      "Given a verbal model, the student will produce the voiceless /th/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently substitutes /f/ for voiceless /th/",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce voiced /th/ in words",
    fullGoalText:
      "Given a verbal model, the student will produce the voiced /th/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Produce /th/ (voiced and voiceless) in sentences",
    fullGoalText:
      "Given a reading passage, the student will produce both voiced and voiceless /th/ sounds correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // /sh/, /ch/, /j/ (3 goals)
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /sh/ in words",
    fullGoalText:
      "Given a verbal model or picture cue, the student will produce the /sh/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /ch/ in words",
    fullGoalText:
      "Given a verbal model or picture cue, the student will produce the /ch/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "phrase",
    shortDescription: "Produce /j/ in phrases",
    fullGoalText:
      "Given a structured activity, the student will produce the /j/ sound correctly in phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // /k/, /g/ (2 goals)
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /k/ in words",
    fullGoalText:
      "Given a verbal model and tactile cue, the student will produce the /k/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently fronts /k/ to /t/ in all positions",
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /g/ in words",
    fullGoalText:
      "Given a verbal model and tactile cue, the student will produce the /g/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Phonological processes (5 goals)
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Eliminate fronting of velar sounds",
    fullGoalText:
      "Given a structured activity, the student will produce velar sounds /k/ and /g/ without fronting in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently fronts velars in 90% of opportunities",
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Reduce cluster reduction in words",
    fullGoalText:
      "Given a verbal model, the student will produce consonant clusters without reduction in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Eliminate final consonant deletion",
    fullGoalText:
      "Given a verbal model or picture cue, the student will produce final consonants in CVC words without deletion with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently deletes final consonants in 80% of CVC words",
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Eliminate stopping of fricatives",
    fullGoalText:
      "Given a verbal model, the student will produce fricative sounds (/f/, /s/, /sh/) without stopping in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "0-3",
    skillLevel: "word",
    shortDescription: "Reduce phonological process usage in early words",
    fullGoalText:
      "Given play-based activities, the child will reduce use of age-inappropriate phonological processes in early words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },

  // /f/, /v/ (2 goals)
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /f/ in words",
    fullGoalText:
      "Given a verbal model, the student will produce the /f/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "phrase",
    shortDescription: "Produce /v/ in phrases",
    fullGoalText:
      "Given a structured activity, the student will produce the /v/ sound correctly in phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // /z/, /n/ progression (3 goals)
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /z/ in words",
    fullGoalText:
      "Given a verbal model, the student will produce the /z/ sound in all positions of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "0-3",
    skillLevel: "syllable",
    shortDescription: "Produce /n/ in syllables and early words",
    fullGoalText:
      "Given play-based activities, the child will produce the /n/ sound in syllables and early words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Produce /z/ in sentences",
    fullGoalText:
      "Given a structured activity, the student will produce the /z/ sound correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Intelligibility in connected speech (3 goals)
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "conversation",
    shortDescription: "Increase speech intelligibility to unfamiliar listeners",
    fullGoalText:
      "Given structured and unstructured speaking tasks, the student will be understood by unfamiliar listeners with {accuracy}% intelligibility across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently 50% intelligible to unfamiliar listeners",
    typicalCriterion: "80% intelligibility across 3 consecutive sessions",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "conversation",
    shortDescription: "Increase intelligibility in connected speech",
    fullGoalText:
      "Given a narrative or conversational task, the student will produce connected speech that is intelligible to listeners with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "adult",
    skillLevel: "conversation",
    shortDescription: "Increase functional intelligibility in workplace",
    fullGoalText:
      "Given workplace communication contexts, the client will produce speech that is intelligible to coworkers and customers with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 3,
  },

  // Self-monitoring (3 goals)
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "conversation",
    shortDescription: "Self-monitor target sounds in structured tasks",
    fullGoalText:
      "Given a structured speaking task, the student will independently self-monitor and self-correct target sound errors with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "articulation",
    ageRange: "12-18",
    skillLevel: "conversation",
    shortDescription: "Self-monitor target sounds in conversation",
    fullGoalText:
      "Given a conversational context, the student will independently self-monitor and self-correct target sound errors in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "adult",
    skillLevel: "conversation",
    shortDescription: "Self-correct articulation errors across settings",
    fullGoalText:
      "Given functional communication contexts, the client will independently self-correct articulation errors across multiple settings with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════
  // LANGUAGE-RECEPTIVE — 30 goals
  // ═══════════════════════════════════════════════════════════════════

  // Following 1-step directions (3 goals)
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Follow 1-step directions during play",
    fullGoalText:
      "Given a play-based activity, the child will follow 1-step directions (e.g., 'give me the ball') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
    exampleBaseline: "Currently follows 1-step directions with gestural cues 40% of the time",
    typicalCriterion: "80% accuracy across 2 consecutive sessions",
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "single-step",
    shortDescription: "Follow 1-step classroom directions",
    fullGoalText:
      "Given a classroom activity, the student will follow 1-step verbal directions without gestural cues with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "single-step",
    shortDescription: "Follow 1-step directions with temporal concepts",
    fullGoalText:
      "Given a classroom or therapy activity, the student will follow 1-step directions containing temporal concepts (before, after, first, then) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Following 2-step directions (4 goals)
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "multi-step",
    shortDescription: "Follow 2-step directions with familiar routines",
    fullGoalText:
      "Given familiar daily routines, the child will follow 2-step related directions (e.g., 'get your shoes and bring them to me') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "multi-step",
    shortDescription: "Follow 2-step unrelated directions",
    fullGoalText:
      "Given a structured activity, the student will follow 2-step unrelated directions (e.g., 'put the crayon on the table and stand up') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently follows 2-step related directions at 60%",
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Follow 2-step directions in academic tasks",
    fullGoalText:
      "Given academic tasks, the student will follow 2-step verbal directions involving academic vocabulary with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "multi-step",
    shortDescription: "Follow 2-step directions with conditional clauses",
    fullGoalText:
      "Given a structured activity, the student will follow 2-step directions containing conditional clauses (e.g., 'if it is red, put it in the box') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Following 3+ step directions (3 goals)
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "complex",
    shortDescription: "Follow 3-step directions",
    fullGoalText:
      "Given a structured activity, the student will follow 3-step verbal directions in the correct sequence with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Follow multi-step directions with embedded clauses",
    fullGoalText:
      "Given a classroom or therapy activity, the student will follow multi-step directions containing embedded clauses with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "12-18",
    skillLevel: "complex",
    shortDescription: "Follow complex multi-step instructions",
    fullGoalText:
      "Given academic or vocational tasks, the student will follow complex multi-step instructions with sequencing and conditional elements with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Identifying objects/pictures (3 goals)
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Identify common objects by name",
    fullGoalText:
      "Given a field of 3-4 objects, the child will identify common objects by name (e.g., 'show me the cup') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
    exampleBaseline: "Currently identifies 5 common objects by name",
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "single-step",
    shortDescription: "Identify objects by function",
    fullGoalText:
      "Given a field of 4-6 pictures, the student will identify objects by their function (e.g., 'show me what you wear on your feet') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Identify objects by category and attribute",
    fullGoalText:
      "Given a field of pictures, the student will identify objects by category and attribute descriptions (e.g., 'find the big farm animal') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Understanding spatial concepts (3 goals)
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Understand basic spatial concepts (in, on, under)",
    fullGoalText:
      "Given a play-based activity, the child will demonstrate understanding of basic spatial concepts (in, on, under) by placing objects correctly with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "multi-step",
    shortDescription: "Understand spatial concepts (behind, between, next to)",
    fullGoalText:
      "Given a structured activity, the student will demonstrate understanding of spatial concepts (behind, between, next to, in front of) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "complex",
    shortDescription: "Follow directions with multiple spatial concepts",
    fullGoalText:
      "Given a classroom activity, the student will follow directions containing multiple spatial concepts with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Understanding temporal concepts (3 goals)
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "single-step",
    shortDescription: "Understand basic temporal concepts (first, then)",
    fullGoalText:
      "Given a visual schedule, the student will demonstrate understanding of basic temporal concepts (first, then, next) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Understand temporal concepts (before, after, while)",
    fullGoalText:
      "Given a story or activity sequence, the student will demonstrate understanding of temporal concepts (before, after, while, during) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently confuses 'before' and 'after' 60% of the time",
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Sequence events using temporal vocabulary",
    fullGoalText:
      "Given a narrative or expository passage, the student will correctly sequence events using temporal vocabulary with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Understanding wh-questions (4 goals)
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Respond to 'what' and 'where' questions",
    fullGoalText:
      "Given a play-based activity, the child will respond to simple 'what' and 'where' questions by pointing or verbalizing with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "multi-step",
    shortDescription: "Answer 'who', 'what', 'where' questions about stories",
    fullGoalText:
      "Given a short story read aloud, the student will answer 'who', 'what', and 'where' comprehension questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Answer 'why' and 'how' questions about stories",
    fullGoalText:
      "Given a grade-level story, the student will answer 'why' and 'how' comprehension questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Answer inferential wh-questions about passages",
    fullGoalText:
      "Given a grade-level passage, the student will answer inferential wh-questions requiring critical thinking with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Understanding pronouns (3 goals)
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "single-step",
    shortDescription: "Identify referents for basic pronouns (he, she, they)",
    fullGoalText:
      "Given a picture or story context, the student will identify the referent for basic pronouns (he, she, they) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Identify referents for possessive pronouns",
    fullGoalText:
      "Given sentences with possessive pronouns (his, her, their), the student will identify the correct referent with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Resolve pronoun ambiguity in paragraphs",
    fullGoalText:
      "Given paragraphs with multiple characters, the student will correctly resolve pronoun references with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently misidentifies pronoun referents in multi-character passages 50% of the time",
  },

  // Vocabulary comprehension (4 goals)
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Demonstrate understanding of 50+ words",
    fullGoalText:
      "Given daily routines and play, the child will demonstrate receptive understanding of 50 or more words by pointing, looking at, or retrieving named items with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "multi-step",
    shortDescription: "Understand category vocabulary",
    fullGoalText:
      "Given category names, the student will identify items belonging to named categories (animals, food, clothing) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Understand grade-level academic vocabulary",
    fullGoalText:
      "Given grade-level content area texts, the student will demonstrate understanding of academic vocabulary through definitions and context clues with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-receptive",
    ageRange: "adult",
    skillLevel: "complex",
    shortDescription: "Comprehend vocational instructions and vocabulary",
    fullGoalText:
      "Given workplace instructions and materials, the client will demonstrate comprehension of vocational vocabulary and multi-step procedures with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════
  // LANGUAGE-EXPRESSIVE — 30 goals (adding 2 extra for total)
  // ═══════════════════════════════════════════════════════════════════

  // Single-word requests (3 goals)
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "single-word",
    shortDescription: "Use single words to request desired items",
    fullGoalText:
      "Given a motivating activity, the child will use single words to request desired items or actions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
    exampleBaseline: "Currently uses reaching and crying to communicate wants",
    typicalCriterion: "80% accuracy across 2 consecutive sessions",
  },
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "single-word",
    shortDescription: "Label common objects",
    fullGoalText:
      "Given common objects or pictures, the child will expressively label items with single words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "single-word",
    shortDescription: "Use action words to describe activities",
    fullGoalText:
      "Given a structured activity, the student will use action words (verbs) to describe ongoing activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // 2-word combinations (3 goals)
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "phrase",
    shortDescription: "Produce 2-word combinations",
    fullGoalText:
      "Given a motivating activity, the child will produce 2-word combinations (e.g., 'more juice', 'big ball') to communicate with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
    exampleBaseline: "Currently uses single-word utterances primarily",
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Use 2-word agent-action combinations",
    fullGoalText:
      "Given a structured activity, the student will produce 2-word agent-action combinations (e.g., 'Mommy go', 'dog eat') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Use 2-word modifier-noun combinations",
    fullGoalText:
      "Given a structured activity, the student will produce 2-word modifier-noun combinations (e.g., 'red car', 'big dog') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // 3-4 word phrases (3 goals)
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Produce 3-4 word phrases to make requests",
    fullGoalText:
      "Given a motivating activity, the student will produce 3-4 word phrases to make requests (e.g., 'I want more crackers') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Produce 3-4 word phrases to comment",
    fullGoalText:
      "Given a structured play activity, the student will produce 3-4 word phrases to comment on events (e.g., 'the car is fast') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "phrase",
    shortDescription: "Use 3-4 word phrases with correct word order",
    fullGoalText:
      "Given a structured activity, the student will produce 3-4 word phrases using correct subject-verb-object word order with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Subject-verb sentences (3 goals)
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "sentence",
    shortDescription: "Produce subject-verb sentences",
    fullGoalText:
      "Given a picture or activity, the student will produce subject-verb sentences (e.g., 'The boy is running') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Produce subject-verb-object sentences",
    fullGoalText:
      "Given a picture or structured activity, the student will produce complete subject-verb-object sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Use copula and auxiliary verbs in sentences",
    fullGoalText:
      "Given a structured activity, the student will use copula (is, are, was) and auxiliary verbs correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently omits 'is' and 'are' in 70% of obligatory contexts",
  },

  // Complete sentences 5+ words (3 goals)
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Produce complete sentences of 5+ words",
    fullGoalText:
      "Given a picture description task, the student will produce grammatically correct sentences of 5 or more words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Produce compound sentences",
    fullGoalText:
      "Given a structured narrative task, the student will produce compound sentences using coordinating conjunctions (and, but, or) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "12-18",
    skillLevel: "sentence",
    shortDescription: "Produce complex sentences with subordinate clauses",
    fullGoalText:
      "Given a structured speaking task, the student will produce complex sentences with subordinate clauses (because, although, when, if) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Answering wh-questions (4 goals)
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "single-word",
    shortDescription: "Answer 'what' questions with single words",
    fullGoalText:
      "Given familiar objects and activities, the child will answer simple 'what' questions with single-word responses with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Answer 'who', 'what', 'where' questions in phrases",
    fullGoalText:
      "Given a story or activity, the student will answer 'who', 'what', and 'where' questions using phrase-level responses with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Answer 'why' and 'how' questions in complete sentences",
    fullGoalText:
      "Given a grade-level story, the student will answer 'why' and 'how' questions using complete sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "narrative",
    shortDescription: "Answer inferential questions with elaboration",
    fullGoalText:
      "Given a grade-level passage, the student will answer inferential wh-questions with elaborated responses of 2 or more sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Describing objects/pictures (3 goals)
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Describe objects using 2+ attributes",
    fullGoalText:
      "Given an object or picture, the student will describe it using 2 or more attributes (color, size, shape) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Describe pictures using complete sentences",
    fullGoalText:
      "Given a picture, the student will describe the scene using 3 or more complete sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "narrative",
    shortDescription: "Describe objects using category, function, and attributes",
    fullGoalText:
      "Given an object or concept, the student will provide a description including category, function, and 2+ attributes with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently provides 1-attribute descriptions only",
  },

  // Retelling stories (3 goals)
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "narrative",
    shortDescription: "Retell a simple story with key events",
    fullGoalText:
      "Given a short story with picture support, the student will retell the story including at least 3 key events in sequence with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "narrative",
    shortDescription: "Retell a story with story grammar elements",
    fullGoalText:
      "Given a grade-level story, the student will retell using story grammar elements (character, setting, problem, solution) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "narrative",
    shortDescription: "Generate a personal narrative with cohesive elements",
    fullGoalText:
      "Given a topic prompt, the student will generate a personal narrative including an introduction, sequenced events, and conclusion with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Using pronouns correctly (3 goals)
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Use subject pronouns (he, she, they) correctly",
    fullGoalText:
      "Given a picture or activity, the student will use subject pronouns (he, she, they, I) correctly in phrases and sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Use possessive pronouns (his, her, their) correctly",
    fullGoalText:
      "Given a structured activity, the student will use possessive pronouns (his, her, their, my) correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Use reflexive pronouns correctly in sentences",
    fullGoalText:
      "Given a structured activity, the student will use reflexive pronouns (himself, herself, themselves) correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Verb tense accuracy (3 goals)
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Use present progressive -ing correctly",
    fullGoalText:
      "Given an activity or picture, the student will use present progressive verb forms (-ing) correctly in phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently omits -ing in 60% of obligatory contexts",
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Use regular past tense -ed correctly",
    fullGoalText:
      "Given a picture sequence or story retell task, the student will use regular past tense verb forms (-ed) correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Use irregular past tense verbs correctly",
    fullGoalText:
      "Given a narrative task, the student will use irregular past tense verbs (went, saw, ate, ran) correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // ═══════════════════════════════════════════════════════════════════
  // FLUENCY — 15 goals
  // ═══════════════════════════════════════════════════════════════════

  // Identifying fluent vs disfluent speech (2 goals)
  {
    domain: "fluency",
    ageRange: "5-8",
    skillLevel: "awareness",
    shortDescription: "Identify moments of fluent vs disfluent speech",
    fullGoalText:
      "Given recorded speech samples, the student will correctly identify moments of fluent and disfluent speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently unable to distinguish between fluent and disfluent speech",
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "awareness",
    shortDescription: "Identify types of disfluency in own speech",
    fullGoalText:
      "Given a structured speaking task, the student will identify the type of disfluency (repetition, prolongation, block) in their own speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Cancellation technique (2 goals)
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use cancellation after a moment of stuttering",
    fullGoalText:
      "Given a structured speaking task, the student will use the cancellation technique (pause, identify tension, and re-attempt the word) after a moment of stuttering with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "modification",
    shortDescription: "Use cancellation in conversation",
    fullGoalText:
      "Given a conversational context, the student will use the cancellation technique after moments of stuttering with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Pull-out technique (2 goals)
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use pull-out during a moment of stuttering",
    fullGoalText:
      "Given a structured speaking task, the student will use the pull-out technique (ease out of the moment of stuttering) during disfluent speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "modification",
    shortDescription: "Use pull-out in conversational speech",
    fullGoalText:
      "Given a conversational context, the student will use the pull-out technique during moments of stuttering with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Preparatory sets (2 goals)
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use preparatory sets on anticipated difficult words",
    fullGoalText:
      "Given a structured speaking task, the student will use preparatory sets (light contact, slow onset) before anticipated difficult words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "transfer",
    shortDescription: "Use preparatory sets during class presentations",
    fullGoalText:
      "Given a class presentation or formal speaking context, the student will use preparatory sets before anticipated difficult words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently uses preparatory sets in therapy at 80% but 30% in classroom",
  },

  // Easy onset (2 goals)
  {
    domain: "fluency",
    ageRange: "5-8",
    skillLevel: "modification",
    shortDescription: "Use easy onset to begin utterances",
    fullGoalText:
      "Given a structured speaking task, the student will use easy onset (gentle voice start) to begin utterances with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "adult",
    skillLevel: "transfer",
    shortDescription: "Use easy onset during workplace communication",
    fullGoalText:
      "Given workplace communication contexts, the client will use easy onset technique to initiate speech smoothly with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Transfer to phone calls (2 goals)
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "transfer",
    shortDescription: "Use fluency strategies during phone calls",
    fullGoalText:
      "Given phone call scenarios, the student will use learned fluency strategies (easy onset, light contact) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "adult",
    skillLevel: "transfer",
    shortDescription: "Maintain fluency strategies during phone calls",
    fullGoalText:
      "Given professional phone call contexts, the client will maintain use of fluency strategies with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // Transfer to academic settings (1 goal)
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "transfer",
    shortDescription: "Use fluency strategies during classroom participation",
    fullGoalText:
      "Given classroom participation opportunities, the student will use learned fluency strategies during oral reading and class discussions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Reducing avoidance behaviors (2 goals)
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "awareness",
    shortDescription: "Reduce avoidance of speaking situations",
    fullGoalText:
      "Given opportunities to participate in speaking activities, the student will voluntarily engage without avoidance behaviors (word substitution, silence) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently avoids 5 out of 7 classroom speaking opportunities",
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "transfer",
    shortDescription: "Reduce avoidance behaviors across social settings",
    fullGoalText:
      "Given social and academic speaking situations, the student will engage in communication without avoidance behaviors (word substitution, topic avoidance, reduced participation) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════
  // VOICE — 15 goals
  // ═══════════════════════════════════════════════════════════════════

  // Identifying vocal abuse (2 goals)
  {
    domain: "voice",
    ageRange: "5-8",
    skillLevel: "awareness",
    shortDescription: "Identify vocally abusive behaviors",
    fullGoalText:
      "Given a list of behaviors, the student will correctly identify vocally abusive vs. healthy vocal behaviors with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently cannot differentiate vocally abusive from healthy behaviors",
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "awareness",
    shortDescription: "Self-monitor vocal abuse in daily activities",
    fullGoalText:
      "Given a self-monitoring chart, the student will accurately track instances of vocal abuse (yelling, throat clearing, hard glottal attacks) throughout the school day with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },

  // Reducing vocal abuse behaviors (2 goals)
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "production",
    shortDescription: "Reduce frequency of yelling and screaming",
    fullGoalText:
      "Given daily activities, the student will reduce instances of yelling and screaming by using alternative strategies (walking closer, using a normal voice) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "adult",
    skillLevel: "production",
    shortDescription: "Reduce throat clearing and hard glottal attacks",
    fullGoalText:
      "Given daily communication contexts, the client will reduce throat clearing and hard glottal attacks by using replacement behaviors (silent swallow, easy onset) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },

  // Optimal pitch production (2 goals)
  {
    domain: "voice",
    ageRange: "12-18",
    skillLevel: "production",
    shortDescription: "Use optimal pitch during structured tasks",
    fullGoalText:
      "Given a structured speaking task, the student will produce voice at an optimal habitual pitch level with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "adult",
    skillLevel: "production",
    shortDescription: "Maintain optimal pitch in functional contexts",
    fullGoalText:
      "Given functional communication contexts, the client will maintain optimal pitch production using learned techniques with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // Resonant voice technique (2 goals)
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "production",
    shortDescription: "Produce resonant voice during sustained phonation",
    fullGoalText:
      "Given clinician modeling and biofeedback, the student will produce resonant voice (forward focus, easy phonation) during sustained vowels and phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "adult",
    skillLevel: "carryover",
    shortDescription: "Use resonant voice in workplace communication",
    fullGoalText:
      "Given workplace communication contexts, the client will use resonant voice technique during conversations and presentations with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Breath support for voicing (2 goals)
  {
    domain: "voice",
    ageRange: "5-8",
    skillLevel: "production",
    shortDescription: "Use diaphragmatic breathing for voice support",
    fullGoalText:
      "Given a structured breathing task, the student will use diaphragmatic breathing to support voice production during sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently uses clavicular breathing pattern with shallow breath support",
  },
  {
    domain: "voice",
    ageRange: "12-18",
    skillLevel: "production",
    shortDescription: "Coordinate breath support with phrasing",
    fullGoalText:
      "Given a reading passage, the student will coordinate appropriate breath support with natural phrasing to maintain vocal quality with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Carryover in conversation (3 goals)
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "carryover",
    shortDescription: "Maintain healthy voice during classroom activities",
    fullGoalText:
      "Given classroom speaking activities, the student will maintain appropriate vocal quality using learned strategies with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "12-18",
    skillLevel: "carryover",
    shortDescription: "Maintain vocal hygiene across daily activities",
    fullGoalText:
      "Given a vocal hygiene checklist, the student will maintain healthy vocal behaviors throughout the day with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "75% accuracy across 3 consecutive sessions",
  },
  {
    domain: "voice",
    ageRange: "adult",
    skillLevel: "carryover",
    shortDescription: "Maintain healthy voice in high-demand contexts",
    fullGoalText:
      "Given high-demand vocal contexts (teaching, meetings, phone calls), the client will maintain healthy vocal production using learned strategies with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },

  // Reducing laryngeal tension (2 goals)
  {
    domain: "voice",
    ageRange: "12-18",
    skillLevel: "production",
    shortDescription: "Reduce laryngeal tension during phonation",
    fullGoalText:
      "Given laryngeal massage and relaxation exercises, the student will produce voice with reduced laryngeal tension during sustained phonation and sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently demonstrates moderate laryngeal tension during connected speech",
  },
  {
    domain: "voice",
    ageRange: "adult",
    skillLevel: "carryover",
    shortDescription: "Maintain reduced laryngeal tension in conversation",
    fullGoalText:
      "Given functional communication contexts, the client will maintain reduced laryngeal tension during conversational speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════
  // PRAGMATIC-SOCIAL — 25 goals
  // ═══════════════════════════════════════════════════════════════════

  // Maintaining eye contact (2 goals)
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Establish eye contact when communicating",
    fullGoalText:
      "Given a structured play activity, the student will establish eye contact with a communication partner when requesting, commenting, or greeting with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently makes eye contact in 20% of communication exchanges",
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "basic",
    shortDescription: "Maintain appropriate eye contact during conversation",
    fullGoalText:
      "Given a conversational interaction, the student will maintain appropriate eye contact (looking at the speaker's face) during exchanges with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Turn-taking in conversation (3 goals)
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Take turns during structured play",
    fullGoalText:
      "Given a structured play activity, the student will take turns with a peer or adult (waiting for their turn and taking action when appropriate) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Take conversational turns without interrupting",
    fullGoalText:
      "Given a conversational activity with peers, the student will take conversational turns without interrupting the speaker with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "intermediate",
    shortDescription: "Use verbal and nonverbal cues for turn-taking",
    fullGoalText:
      "Given a group discussion, the student will use appropriate verbal and nonverbal cues (raising hand, waiting for a pause) to signal turn-taking with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Topic initiation (3 goals)
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Initiate interaction with peers or adults",
    fullGoalText:
      "Given a play or social setting, the student will initiate an interaction with a peer or adult using a greeting, comment, or question with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "intermediate",
    shortDescription: "Introduce a new topic in conversation",
    fullGoalText:
      "Given a social interaction, the student will introduce a new topic of conversation using an appropriate opener with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently starts talking about preferred topics without introduction",
  },
  {
    domain: "pragmatic-social",
    ageRange: "12-18",
    skillLevel: "advanced",
    shortDescription: "Initiate age-appropriate conversations with peers",
    fullGoalText:
      "Given a social setting, the student will initiate age-appropriate conversations with peers by identifying shared interests or commenting on the environment with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Topic maintenance (3 goals)
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Maintain topic for 3+ conversational turns",
    fullGoalText:
      "Given a conversational interaction, the student will maintain the topic for 3 or more conversational turns by adding relevant comments or asking on-topic questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "intermediate",
    shortDescription: "Stay on topic and recognize topic shifts",
    fullGoalText:
      "Given a group conversation, the student will stay on topic and appropriately signal when shifting topics with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "pragmatic-social",
    ageRange: "12-18",
    skillLevel: "advanced",
    shortDescription: "Maintain extended conversations on varied topics",
    fullGoalText:
      "Given social interactions, the student will maintain conversations on varied topics for 5+ turns, contributing relevant information and asking follow-up questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Understanding facial expressions (2 goals)
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Identify basic facial expressions",
    fullGoalText:
      "Given pictures or real-life situations, the student will identify basic facial expressions (happy, sad, angry, scared) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "intermediate",
    shortDescription: "Interpret complex facial expressions in context",
    fullGoalText:
      "Given social scenarios, the student will interpret complex facial expressions (confused, embarrassed, bored, surprised) and explain what the person might be feeling with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently identifies basic emotions but misreads complex expressions 70% of the time",
  },

  // Understanding body language (2 goals)
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "basic",
    shortDescription: "Identify basic body language cues",
    fullGoalText:
      "Given pictures or video clips, the student will identify what body language cues indicate (e.g., crossed arms = not interested, leaning forward = interested) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "12-18",
    skillLevel: "advanced",
    shortDescription: "Read and respond to nonverbal communication",
    fullGoalText:
      "Given social interactions, the student will accurately read nonverbal communication (body language, tone of voice, facial expressions) and adjust their behavior accordingly with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Perspective-taking (3 goals)
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Identify how characters feel in stories",
    fullGoalText:
      "Given a story or social scenario, the student will identify how a character or person feels and explain why they feel that way with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "advanced",
    shortDescription: "Predict how actions affect others' feelings",
    fullGoalText:
      "Given a social scenario, the student will predict how their actions or words might affect another person's feelings and explain their reasoning with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "pragmatic-social",
    ageRange: "12-18",
    skillLevel: "advanced",
    shortDescription: "Consider multiple perspectives in social situations",
    fullGoalText:
      "Given a complex social situation, the student will consider multiple perspectives and explain how different people might feel or think about the situation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Appropriate greetings/farewells (2 goals)
  {
    domain: "pragmatic-social",
    ageRange: "0-3",
    skillLevel: "basic",
    shortDescription: "Wave or say hi/bye during greetings",
    fullGoalText:
      "Given arrival or departure routines, the child will wave or verbalize a greeting (hi, bye) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "basic",
    shortDescription: "Use appropriate greetings for different people",
    fullGoalText:
      "Given social situations, the student will use appropriate greetings and farewells for different people (peers vs. adults, familiar vs. unfamiliar) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Asking for help appropriately (2 goals)
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Request help using words or gestures",
    fullGoalText:
      "Given a challenging task, the student will request help using words, gestures, or AAC (e.g., 'help me', 'I need help') instead of crying or tantrum behavior with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently cries or throws materials when frustrated",
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "intermediate",
    shortDescription: "Ask for help with appropriate detail",
    fullGoalText:
      "Given a challenging academic or social situation, the student will ask for help by identifying the problem and requesting specific assistance with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Conflict resolution language (3 goals)
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Use words to express frustration instead of actions",
    fullGoalText:
      "Given a frustrating social situation, the student will use words to express frustration (e.g., 'I don't like that', 'Stop please') instead of physical actions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "advanced",
    shortDescription: "Use problem-solving steps in peer conflicts",
    fullGoalText:
      "Given a peer conflict scenario, the student will use problem-solving steps (identify the problem, brainstorm solutions, choose and try a solution) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "12-18",
    skillLevel: "advanced",
    shortDescription: "Negotiate and compromise during disagreements",
    fullGoalText:
      "Given a disagreement with a peer, the student will negotiate and reach a compromise using respectful language and active listening with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // ═══════════════════════════════════════════════════════════════════
  // AAC — 25 goals
  // ═══════════════════════════════════════════════════════════════════

  // Recognizing symbols on device (3 goals)
  {
    domain: "aac",
    ageRange: "0-3",
    skillLevel: "symbol-recognition",
    shortDescription: "Recognize symbols for preferred items on AAC device",
    fullGoalText:
      "Given an AAC device or communication board, the child will recognize and select symbols for 10+ preferred items when named with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
    exampleBaseline: "Currently recognizes 3 symbols on communication board",
    typicalCriterion: "80% accuracy across 2 consecutive sessions",
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "symbol-recognition",
    shortDescription: "Identify category symbols on AAC device",
    fullGoalText:
      "Given an AAC device, the student will identify and navigate to category symbols (food, toys, people, actions) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "symbol-recognition",
    shortDescription: "Recognize 50+ symbols across categories",
    fullGoalText:
      "Given an AAC device, the student will recognize and select 50 or more symbols across multiple categories with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Activating single symbols for requests (3 goals)
  {
    domain: "aac",
    ageRange: "0-3",
    skillLevel: "single-symbol",
    shortDescription: "Activate single symbol to make a request",
    fullGoalText:
      "Given a motivating activity, the child will activate a single symbol on their AAC device to request a desired item or action with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Use single symbols to request, protest, and greet",
    fullGoalText:
      "Given daily routines, the student will use single symbol activations on their AAC device to request, protest, and greet with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently uses AAC for requesting only; protests and greets nonverbally",
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "single-symbol",
    shortDescription: "Use single symbols across 5+ communicative functions",
    fullGoalText:
      "Given structured and unstructured activities, the student will use single symbols on their AAC device across 5 or more communicative functions (request, comment, greet, protest, answer) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Navigating to vocabulary folder (3 goals)
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Navigate to correct vocabulary folder on AAC device",
    fullGoalText:
      "Given a communication need, the student will navigate to the correct vocabulary folder on their AAC device with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Navigate AAC device independently across folders",
    fullGoalText:
      "Given a communication need, the student will independently navigate their AAC device across multiple vocabulary folders to locate target words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "aac",
    ageRange: "8-12",
    skillLevel: "multi-symbol",
    shortDescription: "Efficiently navigate AAC device using search/prediction",
    fullGoalText:
      "Given a communication need, the student will efficiently navigate their AAC device using word prediction or search features to locate vocabulary with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Using 2+ symbol combinations (3 goals)
  {
    domain: "aac",
    ageRange: "0-3",
    skillLevel: "multi-symbol",
    shortDescription: "Combine 2 symbols on AAC device",
    fullGoalText:
      "Given a motivating activity, the child will combine 2 symbols on their AAC device to communicate (e.g., 'want + cookie', 'more + play') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "multi-symbol",
    shortDescription: "Use 2-3 symbol combinations for various functions",
    fullGoalText:
      "Given structured activities, the student will use 2-3 symbol combinations on their AAC device to request, comment, and answer questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Use 3+ symbol combinations with correct word order",
    fullGoalText:
      "Given a structured activity, the student will use 3 or more symbol combinations on their AAC device with correct word order (e.g., 'I want big cookie') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently uses 2-symbol combinations with inconsistent word order",
  },

  // Using AAC across 3+ communication partners (3 goals)
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Use AAC device with 3+ familiar partners",
    fullGoalText:
      "Given daily routines, the student will use their AAC device to communicate with 3 or more familiar communication partners (teacher, parent, therapist) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Use AAC device with unfamiliar communication partners",
    fullGoalText:
      "Given community outings or new social situations, the student will use their AAC device to communicate with unfamiliar communication partners with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "12-18",
    skillLevel: "sentence-construction",
    shortDescription: "Use AAC across community settings with varied partners",
    fullGoalText:
      "Given community settings (stores, restaurants, school), the student will independently use their AAC device to communicate with varied partners with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // Building sentence-level messages (3 goals)
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "sentence-construction",
    shortDescription: "Construct sentence-level messages on AAC device",
    fullGoalText:
      "Given a communication need, the student will construct sentence-level messages (4+ symbols) on their AAC device with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "8-12",
    skillLevel: "sentence-construction",
    shortDescription: "Construct grammatically correct sentences on AAC",
    fullGoalText:
      "Given a communication need, the student will construct grammatically correct sentences on their AAC device using morphology features (plurals, verb tense) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "12-18",
    skillLevel: "sentence-construction",
    shortDescription: "Generate novel sentences for academic participation",
    fullGoalText:
      "Given classroom discussions, the student will generate novel sentences on their AAC device to participate in academic activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Commenting and sharing information (3 goals)
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Comment on activities using AAC device",
    fullGoalText:
      "Given a play or classroom activity, the student will use their AAC device to comment on what they see or are doing (not just to request) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently uses AAC exclusively for requesting; no commenting observed",
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Share personal information using AAC",
    fullGoalText:
      "Given social interactions, the student will use their AAC device to share personal information (preferences, experiences, feelings) using multi-symbol messages with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "8-12",
    skillLevel: "sentence-construction",
    shortDescription: "Share news and retell events using AAC",
    fullGoalText:
      "Given a social context, the student will use their AAC device to share news and retell events using sentence-level messages with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Using AAC in social settings (4 goals)
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Use AAC to greet peers during arrival/departure",
    fullGoalText:
      "Given arrival and departure routines, the student will use their AAC device to greet peers and adults with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Use AAC to participate in group activities",
    fullGoalText:
      "Given a group activity (circle time, game, snack), the student will use their AAC device to participate by commenting, answering questions, and taking turns with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "8-12",
    skillLevel: "sentence-construction",
    shortDescription: "Use AAC to initiate and maintain conversations with peers",
    fullGoalText:
      "Given unstructured social time (recess, lunch), the student will use their AAC device to initiate and maintain conversations with peers for 3+ turns with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "aac",
    ageRange: "adult",
    skillLevel: "sentence-construction",
    shortDescription: "Use AAC for independent community communication",
    fullGoalText:
      "Given community settings (ordering food, asking for directions, shopping), the client will independently use their AAC device to communicate functional needs with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════
  // FEEDING — 20 goals
  // ═══════════════════════════════════════════════════════════════════

  // Oral motor exercises (4 goals)
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Achieve lip closure during spoon feeding",
    fullGoalText:
      "Given spoon-feeding presentations, the child will achieve lip closure to remove food from the spoon with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
    exampleBaseline: "Currently demonstrates poor lip closure with significant food loss during spoon feeding",
    typicalCriterion: "80% accuracy across 2 consecutive sessions",
  },
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Demonstrate tongue lateralization during chewing",
    fullGoalText:
      "Given age-appropriate solid foods, the child will demonstrate tongue lateralization to move food to the molar surface for chewing with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "oral-motor",
    shortDescription: "Demonstrate rotary chewing pattern",
    fullGoalText:
      "Given age-appropriate solid foods, the student will demonstrate a rotary chewing pattern (vs. munching) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently uses a vertical munching pattern for all solid foods",
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "oral-motor",
    shortDescription: "Drink from an open cup with minimal spillage",
    fullGoalText:
      "Given an open cup, the student will drink with lip closure and jaw stability demonstrating minimal spillage with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Accepting new textures (4 goals)
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept puree textures without aversive response",
    fullGoalText:
      "Given puree textures presented on a spoon, the child will accept the food into the mouth without aversive responses (gagging, crying, head turning) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept soft solid foods",
    fullGoalText:
      "Given soft solid foods (banana, avocado, steamed vegetables), the student will accept the food into the mouth and chew without aversive responses with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently accepts only puree textures; refuses all soft solids",
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "texture-acceptance",
    shortDescription: "Tolerate new foods through systematic exposure",
    fullGoalText:
      "Given a systematic desensitization protocol, the student will progress through food exposure hierarchy steps (look, touch, smell, taste, chew) for 5 new foods with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "5-8",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept mixed-texture foods",
    fullGoalText:
      "Given mixed-texture foods (soup with chunks, yogurt with granola), the student will accept and consume the food without sorting or refusing with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "75% accuracy across 3 consecutive sessions",
  },

  // Transitioning texture levels (3 goals)
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "texture-acceptance",
    shortDescription: "Transition from purees to soft mashed foods",
    fullGoalText:
      "Given a gradual texture progression, the child will accept and safely consume soft mashed foods after transitioning from smooth purees with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "texture-acceptance",
    shortDescription: "Transition from soft solids to regular table foods",
    fullGoalText:
      "Given a structured progression, the student will transition from soft solids to regular table foods appropriate for their age with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "5-8",
    skillLevel: "texture-acceptance",
    shortDescription: "Consume age-appropriate textures across food groups",
    fullGoalText:
      "Given mealtime presentations, the student will consume age-appropriate textures across all major food groups (protein, grain, fruit, vegetable, dairy) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 75,
    defaultConsecutiveSessions: 3,
  },

  // Self-feeding with utensils (3 goals)
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "self-feeding",
    shortDescription: "Self-feed with fingers using a raking grasp",
    fullGoalText:
      "Given finger foods, the child will independently self-feed by picking up food and bringing it to the mouth with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 2,
    exampleBaseline: "Currently requires hand-over-hand assistance for all self-feeding",
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "self-feeding",
    shortDescription: "Use a spoon independently with minimal spillage",
    fullGoalText:
      "Given a meal with spoonable foods, the student will independently use a spoon to scoop and bring food to the mouth with minimal spillage with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "5-8",
    skillLevel: "self-feeding",
    shortDescription: "Use fork and knife for cutting and eating",
    fullGoalText:
      "Given a meal requiring utensils, the student will independently use a fork and knife to cut and eat food with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },

  // Appropriate bite size (2 goals)
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "self-feeding",
    shortDescription: "Take appropriately sized bites",
    fullGoalText:
      "Given solid foods, the student will take appropriately sized bites (not overstuffing mouth) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently stuffs 3-4 bites into mouth before chewing",
  },
  {
    domain: "feeding",
    ageRange: "5-8",
    skillLevel: "self-feeding",
    shortDescription: "Manage bite size across varied food types",
    fullGoalText:
      "Given varied food types and textures, the student will independently manage appropriate bite sizes with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // Safe swallowing (2 goals)
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Swallow purees and liquids without coughing",
    fullGoalText:
      "Given purees and thin liquids, the child will demonstrate safe swallowing without coughing, choking, or wet vocal quality with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 2,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "oral-motor",
    shortDescription: "Demonstrate safe swallowing of solids after chewing",
    fullGoalText:
      "Given solid foods, the student will adequately chew and safely swallow without signs of aspiration (coughing, wet voice, throat clearing) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 3,
  },

  // Mealtime duration/pacing (2 goals)
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "self-feeding",
    shortDescription: "Remain seated for the duration of a meal",
    fullGoalText:
      "Given a family-style mealtime, the student will remain seated for the duration of the meal (minimum 15 minutes) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently leaves table after 3-5 minutes",
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "feeding",
    ageRange: "5-8",
    skillLevel: "self-feeding",
    shortDescription: "Maintain appropriate pace during meals",
    fullGoalText:
      "Given a mealtime, the student will maintain an appropriate pace (not rushing or excessively slow) and finish within 30 minutes with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
];
