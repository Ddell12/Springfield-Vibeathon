// src/features/builder/lib/patient-context.ts

export interface PatientForContext {
  firstName: string;
  diagnosis: string;
  communicationLevel?: string;
  interests?: string[];
  sensoryNotes?: string;
  behavioralNotes?: string;
}

export interface GoalForContext {
  shortDescription: string;
  domain: string;
  targetAccuracy: number;
}

/**
 * Allowlist-based sanitization.
 *
 * Defense-in-depth: explicitly picks only the fields the prompt builder is
 * allowed to use, even though the DB layer already filters via getForContext.
 */
export function sanitizePatientContext(
  patient: PatientForContext,
  goals: GoalForContext[],
): { patient: PatientForContext; goals: GoalForContext[] } {
  const sanitizedPatient: PatientForContext = {
    firstName: patient.firstName,
    diagnosis: patient.diagnosis,
    ...(patient.communicationLevel !== undefined && {
      communicationLevel: patient.communicationLevel,
    }),
    ...(patient.interests !== undefined && { interests: patient.interests }),
    ...(patient.sensoryNotes !== undefined && {
      sensoryNotes: patient.sensoryNotes,
    }),
    ...(patient.behavioralNotes !== undefined && {
      behavioralNotes: patient.behavioralNotes,
    }),
  };

  const sanitizedGoals: GoalForContext[] = goals.map((goal) => ({
    shortDescription: goal.shortDescription,
    domain: goal.domain,
    targetAccuracy: goal.targetAccuracy,
  }));

  return { patient: sanitizedPatient, goals: sanitizedGoals };
}

/**
 * Formats a prompt string block to append to the system prompt.
 *
 * Format:
 * ## Patient Context
 * You are building a therapy tool for {firstName}.
 * - Diagnosis: {diagnosis}
 * - Communication level: {communicationLevel ?? "Not specified"}
 * - Interests: {interests joined with ", " ?? "None noted"}
 * - Sensory notes: {sensoryNotes ?? "None noted"}
 * - Behavioral notes: {behavioralNotes ?? "None noted"}
 *
 * Active therapy goals:
 * 1. [{domain}] {shortDescription} (target: {targetAccuracy}%)
 *
 * Use this context to personalize the activity...
 */
export function buildPatientContextBlock(
  patient: PatientForContext,
  goals: GoalForContext[],
): string {
  const communicationLevel = patient.communicationLevel ?? "Not specified";
  const interests =
    patient.interests && patient.interests.length > 0
      ? patient.interests.join(", ")
      : "None noted";
  const sensoryNotes = patient.sensoryNotes ?? "None noted";
  const behavioralNotes = patient.behavioralNotes ?? "None noted";

  const goalsBlock =
    goals.length === 0
      ? "No active therapy goals defined yet."
      : goals
          .map(
            (g, i) =>
              `${i + 1}. [${g.domain}] ${g.shortDescription} (target: ${g.targetAccuracy}%)`,
          )
          .join("\n");

  return `## Patient Context
You are building a therapy tool for ${patient.firstName}.
- Diagnosis: ${patient.diagnosis}
- Communication level: ${communicationLevel}
- Interests: ${interests}
- Sensory notes: ${sensoryNotes}
- Behavioral notes: ${behavioralNotes}

Active therapy goals:
${goalsBlock}

Use this context to personalize the activity. Reference the child's interests in themes and visuals. Match complexity to their communication level.
Do not include the child's name in the app title or any visible text unless the therapist explicitly asks for it.`;
}
