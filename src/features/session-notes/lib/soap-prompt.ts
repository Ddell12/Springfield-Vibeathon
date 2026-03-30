import { calculateAccuracy } from "./session-utils";

const trunc = (s: string, max = 500) => s.length > max ? s.slice(0, max) + "…" : s;

export interface SoapPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
  communicationLevel?: string;
  sensoryNotes?: string;
  behavioralNotes?: string;
}

export interface SoapTarget {
  target: string;
  trials?: number;
  correct?: number;
  promptLevel?: string;
  notes?: string;
}

export interface SoapSessionData {
  sessionDate: string;
  sessionDuration: number;
  sessionType: string;
  structuredData: {
    targetsWorkedOn: SoapTarget[];
    behaviorNotes?: string;
    parentFeedback?: string;
    homeworkAssigned?: string;
    nextSessionFocus?: string;
  };
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface PreviousSoap {
  sessionDate: string;
  soapNote: SoapNote;
}

export function buildSoapPrompt(
  patient: SoapPatient,
  session: SoapSessionData,
  previousSoap: PreviousSoap | null
): string {
  const patientContext = [
    `<patient_data>`,
    `Patient: ${patient.firstName} ${patient.lastName}`,
    `DOB: ${patient.dateOfBirth}`,
    `Diagnosis: ${patient.diagnosis}`,
    patient.communicationLevel
      ? `Communication Level: ${patient.communicationLevel}`
      : null,
    patient.sensoryNotes ? `Sensory Notes: ${trunc(patient.sensoryNotes)}` : null,
    patient.behavioralNotes
      ? `Behavioral Notes: ${trunc(patient.behavioralNotes)}`
      : null,
    `</patient_data>`,
  ]
    .filter(Boolean)
    .join("\n");

  const previousSection = previousSoap
    ? [
        `Previous Session (${previousSoap.sessionDate}):`,
        `  Subjective: ${previousSoap.soapNote.subjective}`,
        `  Objective: ${previousSoap.soapNote.objective}`,
        `  Assessment: ${previousSoap.soapNote.assessment}`,
        `  Plan: ${previousSoap.soapNote.plan}`,
      ].join("\n")
    : "No previous session";

  const targetsSection = session.structuredData.targetsWorkedOn
    .map((t) => {
      const accuracy = calculateAccuracy(t.correct, t.trials);
      const parts = [`- ${t.target}`];
      if (t.trials !== undefined) {
        parts.push(
          `  Trials: ${t.correct ?? 0}/${t.trials} (${accuracy !== null ? `${accuracy}%` : "N/A"})`
        );
      }
      if (t.promptLevel) parts.push(`  Prompt Level: ${t.promptLevel}`);
      if (t.notes) parts.push(`  Notes: ${trunc(t.notes)}`);
      return parts.join("\n");
    })
    .join("\n");

  const additionalNotes = [
    session.structuredData.behaviorNotes
      ? `Behavior Notes: ${trunc(session.structuredData.behaviorNotes)}`
      : null,
    session.structuredData.parentFeedback
      ? `Parent Feedback: ${trunc(session.structuredData.parentFeedback)}`
      : null,
    session.structuredData.homeworkAssigned
      ? `Homework Assigned: ${session.structuredData.homeworkAssigned}`
      : null,
    session.structuredData.nextSessionFocus
      ? `Next Session Focus: ${session.structuredData.nextSessionFocus}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a clinical documentation assistant for speech-language pathologists.
Generate a SOAP note following ASHA documentation standards.

${patientContext}

${previousSection}

Current Session:
Date: ${session.sessionDate}
Duration: ${session.sessionDuration} minutes
Type: ${session.sessionType}

Targets Worked On:
${targetsSection}
${additionalNotes ? `\n${additionalNotes}` : ""}

Write a professional SOAP note with exactly these four sections.
Use the headers SUBJECTIVE:, OBJECTIVE:, ASSESSMENT:, and PLAN: (each on its own line).
Be concise, clinical, and specific. Reference accuracy data where available.
Include measurable goals in the Plan section.`;
}

export function parseSoapResponse(text: string): SoapNote | null {
  const subjectiveMatch = text.match(
    /SUBJECTIVE:\s*([\s\S]*?)(?=OBJECTIVE:|$)/i
  );
  const objectiveMatch = text.match(
    /OBJECTIVE:\s*([\s\S]*?)(?=ASSESSMENT:|$)/i
  );
  const assessmentMatch = text.match(
    /ASSESSMENT:\s*([\s\S]*?)(?=PLAN:|$)/i
  );
  const planMatch = text.match(/PLAN:\s*([\s\S]*?)$/i);

  if (!subjectiveMatch || !objectiveMatch || !assessmentMatch || !planMatch) {
    return null;
  }

  const subjective = subjectiveMatch[1].trim();
  const objective = objectiveMatch[1].trim();
  const assessment = assessmentMatch[1].trim();
  const plan = planMatch[1].trim();

  if (!subjective || !objective || !assessment || !plan) {
    return null;
  }

  return { subjective, objective, assessment, plan };
}
