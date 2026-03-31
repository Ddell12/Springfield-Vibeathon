const trunc = (s: string, max = 500) => s.length > max ? s.slice(0, max) + "…" : s;

interface PatientContext {
  firstName: string;
  lastName: string;
  diagnosis: string;
  communicationLevel?: string;
  interests?: string[];
}

interface GoalWithData {
  goalId: string;
  shortDescription: string;
  domain: string;
  fullGoalText: string;
  targetAccuracy: number;
  status: string;
  dataPoints: Array<{
    date: string;
    accuracy: number;
    trials?: number;
    correct?: number;
    promptLevel?: string;
  }>;
  trend: "improving" | "stable" | "declining";
  streak: number;
  averageAccuracy: number;
}

export type ReportAudience = "clinical" | "parent" | "iep-team";

export function buildReportPrompt(
  patient: PatientContext,
  goals: GoalWithData[],
  reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report",
  periodStart: string,
  periodEnd: string,
  previousNarrative?: string,
  audience?: ReportAudience,
): string {
  const reportTypeInstructions: Record<string, string> = {
    "weekly-summary":
      "Write a brief, conversational but professional weekly summary. Highlight wins, note any concerns, and suggest focus areas for next week.",
    "monthly-summary":
      "Write a moderately detailed monthly summary. Include per-goal progress analysis, overall trends, and recommendations for the coming month.",
    "iep-progress-report":
      "Write a formal IEP progress report using educational language. Reference measurable criteria from goal statements. Use phrases appropriate for school district documentation. Note progress toward benchmarks with specific data.",
  };

  const audienceInstructions: Record<ReportAudience, string> = {
    clinical:
      "Write for a clinical audience: use formal medical/SLP terminology, include standard scores where relevant, justify medical necessity, and reference clinician credentials. This is for insurance documentation and clinical records.",
    parent:
      "Write for a parent/caregiver audience: use plain, everyday language with no medical jargon. Celebrate progress warmly, explain goals in accessible terms, describe next steps clearly, and suggest home practice activities. Be encouraging but honest.",
    "iep-team":
      "Write for an IEP/educational team audience: use IDEA-aligned educational language, frame progress in terms of educational access and classroom participation, reference academic impact, and tie goals to curriculum standards where applicable.",
  };

  let prompt = `You are a clinical documentation specialist for speech-language pathology, familiar with ASHA documentation standards and IEP compliance requirements.

Generate a progress report for the following patient and goals.

<patient_data>
## Patient
- Name: ${patient.firstName} ${patient.lastName}
- Diagnosis: ${patient.diagnosis}`;

  if (patient.communicationLevel) {
    prompt += `\n- Communication Level: ${patient.communicationLevel}`;
  }
  if (patient.interests?.length) {
    prompt += `\n- Interests: ${trunc(patient.interests.join(", "))}`;
  }

  prompt += `\n</patient_data>`;

  prompt += `\n\n## Report Period: ${periodStart} to ${periodEnd}
## Report Type: ${reportType}

${reportTypeInstructions[reportType]}
${audience ? `\n## Audience\n${audienceInstructions[audience]}` : ""}

## Goals\n`;

  for (const goal of goals) {
    prompt += `\n### ${goal.shortDescription} (${goal.domain})
- Full goal: ${trunc(goal.fullGoalText)}
- Target accuracy: ${goal.targetAccuracy}%
- Status: ${goal.status}
- Data points in period: ${goal.dataPoints.length}
- Average accuracy: ${goal.averageAccuracy}%
- Trend: ${goal.trend}
- Consecutive sessions at target: ${goal.streak}`;

    if (goal.dataPoints.length > 0) {
      prompt += `\n- Recent data:`;
      for (const dp of goal.dataPoints.slice(0, 10)) {
        prompt += `\n  - ${dp.date}: ${dp.accuracy}%`;
        if (dp.trials) prompt += ` (${dp.correct ?? "?"}/${dp.trials})`;
        if (dp.promptLevel) prompt += ` [${dp.promptLevel}]`;
      }
    }
  }

  if (previousNarrative) {
    prompt += `\n\n## Previous Report Narrative (for continuity)
${previousNarrative}`;
  }

  prompt += `\n\n## Output Format

Respond in the following JSON format:
\`\`\`json
{
  "goalSummaries": [
    {
      "goalId": "<goal ID>",
      "narrative": "<2-4 sentence narrative for this goal>"
    }
  ],
  "overallNarrative": "<3-5 sentence overall summary>"
}
\`\`\`

Write exactly one goalSummary per goal listed above, in the same order. Use the goalId values provided.`;

  return prompt;
}

export interface ParsedReport {
  goalSummaries: Array<{ goalId: string; narrative: string }>;
  overallNarrative: string;
}

export function parseReportResponse(text: string): ParsedReport | null {
  try {
    // Try fenced JSON block first (```json ... ```)
    const fencedMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fencedMatch?.[1]) {
      const parsed = JSON.parse(fencedMatch[1].trim());
      if (parsed.goalSummaries && parsed.overallNarrative) return parsed as ParsedReport;
    }

    // Try bare JSON object
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      const parsed = JSON.parse(braceMatch[0]);
      if (parsed.goalSummaries && parsed.overallNarrative) return parsed as ParsedReport;
    }

    return null;
  } catch {
    return null;
  }
}
