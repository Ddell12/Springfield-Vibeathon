import { describe, expect, it } from "vitest";

import type {
  PreviousSoap,
  SoapPatient,
  SoapSessionData,
} from "../lib/soap-prompt";
import { buildSoapPrompt, parseSoapResponse } from "../lib/soap-prompt";

const basePatient: SoapPatient = {
  firstName: "Ace",
  lastName: "Smith",
  dateOfBirth: "2020-05-15",
  diagnosis: "Autism Spectrum Disorder, Level 1",
};

const baseSession: SoapSessionData = {
  sessionDate: "2026-03-28",
  sessionDuration: 45,
  sessionType: "Individual",
  structuredData: {
    targetsWorkedOn: [
      {
        target: "Request preferred items using 2-word phrases",
        trials: 10,
        correct: 8,
        promptLevel: "Gestural",
        notes: "Responded well to visual cues",
      },
      {
        target: "Turn-taking during play",
        trials: 5,
        correct: 3,
      },
    ],
    behaviorNotes: "Mild frustration during transitions",
    parentFeedback: "Practicing at home with siblings",
  },
};

const previousSoap: PreviousSoap = {
  sessionDate: "2026-03-21",
  soapNote: {
    subjective: "Parent reports increased vocalizations at home.",
    objective: "Request items: 7/10 (70%) with gestural prompts.",
    assessment: "Steady progress toward 2-word phrase targets.",
    plan: "Continue gestural prompt fading; add turn-taking targets.",
  },
};

describe("buildSoapPrompt", () => {
  it("includes patient context", () => {
    const prompt = buildSoapPrompt(basePatient, baseSession, null);
    expect(prompt).toContain("Ace Smith");
    expect(prompt).toContain("2020-05-15");
    expect(prompt).toContain("Autism Spectrum Disorder, Level 1");
  });

  it("includes session data with accuracy calculations", () => {
    const prompt = buildSoapPrompt(basePatient, baseSession, null);
    expect(prompt).toContain("2026-03-28");
    expect(prompt).toContain("45 minutes");
    expect(prompt).toContain("Individual");
    expect(prompt).toContain("8/10 (80%)");
    expect(prompt).toContain("3/5 (60%)");
    expect(prompt).toContain("Gestural");
  });

  it("includes behavior notes and parent feedback", () => {
    const prompt = buildSoapPrompt(basePatient, baseSession, null);
    expect(prompt).toContain("Mild frustration during transitions");
    expect(prompt).toContain("Practicing at home with siblings");
  });

  it("includes previous SOAP when provided", () => {
    const prompt = buildSoapPrompt(basePatient, baseSession, previousSoap);
    expect(prompt).toContain("Previous Session (2026-03-21)");
    expect(prompt).toContain("increased vocalizations");
    expect(prompt).toContain("gestural prompt fading");
  });

  it("shows 'No previous session' when previousSoap is null", () => {
    const prompt = buildSoapPrompt(basePatient, baseSession, null);
    expect(prompt).toContain("No previous session");
    expect(prompt).not.toContain("Previous Session (");
  });

  it("handles optional patient fields", () => {
    const patientWithExtras: SoapPatient = {
      ...basePatient,
      communicationLevel: "Emerging verbal",
      sensoryNotes: "Sensitive to loud sounds",
      behavioralNotes: "Elopes when overwhelmed",
    };
    const prompt = buildSoapPrompt(patientWithExtras, baseSession, null);
    expect(prompt).toContain("Communication Level: Emerging verbal");
    expect(prompt).toContain("Sensory Notes: Sensitive to loud sounds");
    expect(prompt).toContain("Behavioral Notes: Elopes when overwhelmed");
  });

  it("omits optional patient fields when not provided", () => {
    const prompt = buildSoapPrompt(basePatient, baseSession, null);
    expect(prompt).not.toContain("Communication Level:");
    expect(prompt).not.toContain("Sensory Notes:");
    expect(prompt).not.toContain("Behavioral Notes:");
  });

  it("handles targets without trials data", () => {
    const session: SoapSessionData = {
      ...baseSession,
      structuredData: {
        targetsWorkedOn: [{ target: "Eye contact during greetings" }],
      },
    };
    const prompt = buildSoapPrompt(basePatient, session, null);
    expect(prompt).toContain("Eye contact during greetings");
    expect(prompt).not.toContain("Trials:");
  });

  it("includes ASHA documentation instructions", () => {
    const prompt = buildSoapPrompt(basePatient, baseSession, null);
    expect(prompt).toContain("SUBJECTIVE:");
    expect(prompt).toContain("OBJECTIVE:");
    expect(prompt).toContain("ASSESSMENT:");
    expect(prompt).toContain("PLAN:");
    expect(prompt).toContain("ASHA");
  });

  it("includes homework and next session focus when provided", () => {
    const session: SoapSessionData = {
      ...baseSession,
      structuredData: {
        ...baseSession.structuredData,
        homeworkAssigned: "Practice 2-word requests at mealtime",
        nextSessionFocus: "Expand vocabulary targets",
      },
    };
    const prompt = buildSoapPrompt(basePatient, session, null);
    expect(prompt).toContain("Homework Assigned: Practice 2-word requests at mealtime");
    expect(prompt).toContain("Next Session Focus: Expand vocabulary targets");
  });
});

describe("parseSoapResponse", () => {
  it("parses a valid SOAP response", () => {
    const response = `SUBJECTIVE:
Parent reports child is using more words at home.

OBJECTIVE:
Request items: 8/10 (80%) with gestural prompts. Turn-taking: 3/5 (60%).

ASSESSMENT:
Good progress on requesting targets. Turn-taking emerging.

PLAN:
Continue current targets. Begin fading gestural prompts to independent.`;

    const result = parseSoapResponse(response);
    expect(result).not.toBeNull();
    expect(result!.subjective).toContain("using more words at home");
    expect(result!.objective).toContain("8/10 (80%)");
    expect(result!.assessment).toContain("Good progress");
    expect(result!.plan).toContain("fading gestural prompts");
  });

  it("returns null when a section is missing", () => {
    const incomplete = `SUBJECTIVE:
Some subjective text.

OBJECTIVE:
Some objective text.

PLAN:
Some plan text.`;

    expect(parseSoapResponse(incomplete)).toBeNull();
  });

  it("returns null when a section is empty", () => {
    const emptySection = `SUBJECTIVE:

OBJECTIVE:
Some objective text.

ASSESSMENT:
Some assessment.

PLAN:
Some plan.`;

    expect(parseSoapResponse(emptySection)).toBeNull();
  });

  it("handles extra whitespace around sections", () => {
    const response = `SUBJECTIVE:
  Parent reports progress.

OBJECTIVE:
  8/10 trials correct.

ASSESSMENT:
  Improving steadily.

PLAN:
  Continue current approach.  `;

    const result = parseSoapResponse(response);
    expect(result).not.toBeNull();
    expect(result!.subjective).toBe("Parent reports progress.");
    expect(result!.objective).toBe("8/10 trials correct.");
    expect(result!.assessment).toBe("Improving steadily.");
    expect(result!.plan).toBe("Continue current approach.");
  });

  it("returns null for empty string", () => {
    expect(parseSoapResponse("")).toBeNull();
  });

  it("returns null for unstructured text", () => {
    expect(
      parseSoapResponse("This is just a regular paragraph with no headers.")
    ).toBeNull();
  });
});
