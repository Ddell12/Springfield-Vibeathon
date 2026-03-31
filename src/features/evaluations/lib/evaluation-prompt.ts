const trunc = (s: string, max = 500) => s.length > max ? s.slice(0, max) + "..." : s;

export interface EvalPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
}

export interface AssessmentTool {
  name: string;
  scoresRaw?: string;
  scoresStandard?: string;
  percentile?: string;
  notes?: string;
}

export interface DomainFinding {
  narrative: string;
  scores?: string;
}

export interface DomainFindings {
  articulation?: DomainFinding;
  languageReceptive?: DomainFinding;
  languageExpressive?: DomainFinding;
  fluency?: DomainFinding;
  voice?: DomainFinding;
  pragmatics?: DomainFinding;
  aac?: DomainFinding;
}

export interface EvalData {
  evaluationDate: string;
  referralSource?: string;
  backgroundHistory: string;
  assessmentTools: AssessmentTool[];
  domainFindings: DomainFindings;
  behavioralObservations: string;
  diagnosisCodes: { code: string; description: string }[];
  prognosis: string;
}

export function buildEvaluationPrompt(
  patient: EvalPatient,
  evalData: EvalData
): string {
  const patientContext = [
    `<patient_data>`,
    `Patient: ${patient.firstName} ${patient.lastName}`,
    `DOB: ${patient.dateOfBirth}`,
    `Diagnosis: ${patient.diagnosis}`,
    `</patient_data>`,
  ].join("\n");

  const toolsSection = evalData.assessmentTools
    .map((t) => {
      const parts = [`- ${t.name}`];
      if (t.scoresRaw) parts.push(`  Raw Score: ${t.scoresRaw}`);
      if (t.scoresStandard) parts.push(`  Standard Score: ${t.scoresStandard}`);
      if (t.percentile) parts.push(`  Percentile: ${t.percentile}`);
      if (t.notes) parts.push(`  Notes: ${trunc(t.notes)}`);
      return parts.join("\n");
    })
    .join("\n");

  const domainKeys: (keyof DomainFindings)[] = [
    "articulation", "languageReceptive", "languageExpressive",
    "fluency", "voice", "pragmatics", "aac",
  ];
  const domainLabels: Record<string, string> = {
    articulation: "Articulation/Phonology",
    languageReceptive: "Receptive Language",
    languageExpressive: "Expressive Language",
    fluency: "Fluency",
    voice: "Voice",
    pragmatics: "Pragmatics/Social Communication",
    aac: "AAC",
  };
  const domainsSection = domainKeys
    .filter((k) => evalData.domainFindings[k])
    .map((k) => {
      const d = evalData.domainFindings[k]!;
      const parts = [`${domainLabels[k]}:`];
      parts.push(`  Findings: ${trunc(d.narrative)}`);
      if (d.scores) parts.push(`  Scores: ${d.scores}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const diagSection = evalData.diagnosisCodes
    .map((d) => `- ${d.code}: ${d.description}`)
    .join("\n");

  return `You are a clinical documentation assistant for speech-language pathologists.
Generate two sections for a speech-language evaluation report following ASHA documentation standards.

${patientContext}

Evaluation Date: ${evalData.evaluationDate}
${evalData.referralSource ? `Referral Source: ${evalData.referralSource}` : ""}

Background History:
${trunc(evalData.backgroundHistory, 1000)}

Assessment Tools Administered:
${toolsSection}

Domain-Specific Findings:
${domainsSection}

Behavioral Observations:
${trunc(evalData.behavioralObservations, 1000)}

Diagnosis Codes:
${diagSection}

Prognosis: ${evalData.prognosis}

Generate exactly two sections with these headers:

CLINICAL INTERPRETATION:
Write a professional narrative that interprets the assessment scores and clinical observations.
Synthesize findings across domains. Reference specific scores and percentiles.
Explain the clinical significance of results in context of the patient's history.

RECOMMENDATIONS:
Write specific, actionable recommendations for services, referrals, and accommodations.
Include recommended frequency and duration of therapy if applicable.
Address any additional evaluations or referrals needed.`;
}

export interface EvalAIResult {
  clinicalInterpretation: string;
  recommendations: string;
}

export function parseEvaluationResponse(text: string): EvalAIResult | null {
  const interpMatch = text.match(
    /CLINICAL INTERPRETATION:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i
  );
  const recsMatch = text.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i);

  if (!interpMatch || !recsMatch) return null;

  const clinicalInterpretation = interpMatch[1].trim();
  const recommendations = recsMatch[1].trim();

  if (!clinicalInterpretation || !recommendations) return null;

  return { clinicalInterpretation, recommendations };
}
