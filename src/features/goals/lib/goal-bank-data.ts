export type GoalDomain =
  | "articulation"
  | "language-receptive"
  | "language-expressive"
  | "fluency"
  | "voice"
  | "pragmatic-social"
  | "aac"
  | "feeding";

export interface GoalTemplate {
  id: string;
  domain: GoalDomain;
  shortDescription: string;
  fullGoalText: string;
  defaultTargetAccuracy: number;
  defaultConsecutiveSessions: number;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // ── Articulation ──────────────────────────────────────────────
  {
    id: "artic-initial-r",
    domain: "articulation",
    shortDescription: "Produce /r/ in initial position",
    fullGoalText: "Client will produce /r/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-initial-s",
    domain: "articulation",
    shortDescription: "Produce /s/ in initial position",
    fullGoalText: "Client will produce /s/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-final-s",
    domain: "articulation",
    shortDescription: "Produce /s/ in final position",
    fullGoalText: "Client will produce /s/ in the final position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-s-blends",
    domain: "articulation",
    shortDescription: "Produce /s/ blends in words",
    fullGoalText: "Client will produce /s/ blends (sp, st, sk, sm, sn, sl, sw) in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-l-initial",
    domain: "articulation",
    shortDescription: "Produce /l/ in initial position",
    fullGoalText: "Client will produce /l/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-th-voiced",
    domain: "articulation",
    shortDescription: "Produce voiced /th/ in words",
    fullGoalText: "Client will produce voiced /th/ in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── Language Receptive ────────────────────────────────────────
  {
    id: "lang-rec-2step",
    domain: "language-receptive",
    shortDescription: "Follow 2-step directions",
    fullGoalText: "Client will follow 2-step directions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-rec-wh-questions",
    domain: "language-receptive",
    shortDescription: "Answer WH questions",
    fullGoalText: "Client will correctly answer who, what, where, when, and why questions about a short story with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-rec-basic-concepts",
    domain: "language-receptive",
    shortDescription: "Identify basic concepts",
    fullGoalText: "Client will identify basic concepts (big/little, on/off, in/out) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 3,
  },
  // ── Language Expressive ───────────────────────────────────────
  {
    id: "lang-exp-2word",
    domain: "language-expressive",
    shortDescription: "Use 2-word combinations",
    fullGoalText: "Client will spontaneously use 2-word combinations to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-exp-pronouns",
    domain: "language-expressive",
    shortDescription: "Use subject pronouns correctly",
    fullGoalText: "Client will use subject pronouns (he, she, they) correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-exp-past-tense",
    domain: "language-expressive",
    shortDescription: "Use regular past tense -ed",
    fullGoalText: "Client will use regular past tense -ed in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── Fluency ───────────────────────────────────────────────────
  {
    id: "fluency-easy-onset",
    domain: "fluency",
    shortDescription: "Use easy onset in sentences",
    fullGoalText: "Client will use easy onset technique in structured sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "fluency-self-monitor",
    domain: "fluency",
    shortDescription: "Self-monitor disfluencies",
    fullGoalText: "Client will identify and self-correct disfluencies during structured conversation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  // ── Pragmatic/Social ──────────────────────────────────────────
  {
    id: "prag-turn-taking",
    domain: "pragmatic-social",
    shortDescription: "Demonstrate turn-taking",
    fullGoalText: "Client will demonstrate appropriate turn-taking during structured play activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "prag-topic-maintenance",
    domain: "pragmatic-social",
    shortDescription: "Maintain conversational topic",
    fullGoalText: "Client will maintain a conversational topic for 3+ exchanges with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── AAC ───────────────────────────────────────────────────────
  {
    id: "aac-2word-combo",
    domain: "aac",
    shortDescription: "Combine 2 symbols on AAC device",
    fullGoalText: "Client will independently combine 2 symbols on AAC device to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "aac-navigate-categories",
    domain: "aac",
    shortDescription: "Navigate AAC categories",
    fullGoalText: "Client will independently navigate to the correct category on AAC device to find target vocabulary with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── Feeding ───────────────────────────────────────────────────
  {
    id: "feeding-accept-textures",
    domain: "feeding",
    shortDescription: "Accept varied food textures",
    fullGoalText: "Client will accept presentation of new food textures (touch, smell, or taste) without aversive response with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  // ── Voice ─────────────────────────────────────────────────────
  {
    id: "voice-appropriate-volume",
    domain: "voice",
    shortDescription: "Use appropriate vocal volume",
    fullGoalText: "Client will use appropriate vocal volume in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
];

export function getTemplatesByDomain(domain: GoalDomain): GoalTemplate[] {
  return GOAL_TEMPLATES.filter((t) => t.domain === domain);
}

export function fillTemplate(
  template: GoalTemplate,
  accuracy: number,
  sessions: number,
): string {
  return template.fullGoalText
    .replace("{accuracy}", String(accuracy))
    .replace("{sessions}", String(sessions));
}
