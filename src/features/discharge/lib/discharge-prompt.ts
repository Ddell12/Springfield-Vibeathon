export interface DischargePatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
}

export interface GoalOutcome {
  shortDescription: string;
  finalAccuracy: number;
  status: "achieved" | "not-met";
  reason?: string;
}

export interface DischargeData {
  serviceStartDate: string;
  serviceEndDate: string;
  presentingDiagnosis: string;
  dischargeReason: string;
  dischargeReasonOther?: string;
  goals: GoalOutcome[];
  totalSessions: number;
}

export function buildDischargePrompt(
  patient: DischargePatient,
  data: DischargeData
): string {
  const patientContext = [
    `<patient_data>`,
    `Patient: ${patient.firstName} ${patient.lastName}`,
    `DOB: ${patient.dateOfBirth}`,
    `Diagnosis: ${patient.diagnosis}`,
    `</patient_data>`,
  ].join("\n");

  const goalsSection = data.goals
    .map((g) => {
      const status = g.status === "achieved" ? "ACHIEVED" : "NOT MET";
      const parts = [`- [${status}] ${g.shortDescription} (Final accuracy: ${g.finalAccuracy}%)`];
      if (g.reason) parts.push(`  Reason: ${g.reason}`);
      return parts.join("\n");
    })
    .join("\n");

  const reasonDisplay = data.dischargeReason === "other" && data.dischargeReasonOther
    ? data.dischargeReasonOther
    : data.dischargeReason.replace(/-/g, " ");

  return `You are a clinical documentation assistant for speech-language pathologists.
Generate two sections for a discharge summary following ASHA documentation standards.

${patientContext}

Service Period: ${data.serviceStartDate} to ${data.serviceEndDate}
Total Sessions: ${data.totalSessions}
Presenting Diagnosis: ${data.presentingDiagnosis}
Discharge Reason: ${reasonDisplay}

Goal Outcomes:
${goalsSection}

Generate exactly two sections with these headers:

NARRATIVE:
Write a professional summary of the treatment course.
Describe the presenting concerns, services provided, and progress made.
Reference specific goal outcomes and accuracy data.
Explain the rationale for discharge in context of the treatment goals.

RECOMMENDATIONS:
Write specific post-discharge recommendations.
Include any continued services, home strategies, follow-up timeline.
Address conditions that should prompt return to therapy.`;
}

export interface DischargeAIResult {
  narrative: string;
  recommendations: string;
}

export function parseDischargeResponse(text: string): DischargeAIResult | null {
  const narrativeMatch = text.match(
    /NARRATIVE:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i
  );
  const recsMatch = text.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i);

  if (!narrativeMatch || !recsMatch) return null;

  const narrative = narrativeMatch[1].trim();
  const recommendations = recsMatch[1].trim();

  if (!narrative || !recommendations) return null;

  return { narrative, recommendations };
}
