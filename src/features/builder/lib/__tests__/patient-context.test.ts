// src/features/builder/lib/__tests__/patient-context.test.ts
import { describe, expect, it } from "vitest";

import {
  buildPatientContextBlock,
  sanitizePatientContext,
  type GoalForContext,
  type PatientForContext,
} from "../patient-context";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const fullPatient: PatientForContext = {
  firstName: "Ace",
  diagnosis: "Autism Spectrum Disorder (Level 1)",
  communicationLevel: "Verbal, uses AAC for complex sentences",
  interests: ["trains", "Minecraft", "dogs"],
  sensoryNotes: "Sensitive to loud noises, prefers weighted blanket",
  behavioralNotes: "Responds well to visual schedules",
};

const fullGoals: GoalForContext[] = [
  {
    shortDescription: "Identify emotions from facial expressions",
    domain: "Social/Emotional",
    targetAccuracy: 80,
  },
  {
    shortDescription: "Request preferred items using 2-word phrases",
    domain: "Communication",
    targetAccuracy: 90,
  },
];

const minimalPatient: PatientForContext = {
  firstName: "Sage",
  diagnosis: "Speech delay",
};

// ─── sanitizePatientContext ───────────────────────────────────────────────────

describe("sanitizePatientContext", () => {
  it("returns only allowlisted patient fields", () => {
    const dirty = {
      ...fullPatient,
      // extra fields that should be stripped
      _id: "convex-id-123",
      userId: "user_abc",
      dateOfBirth: "2018-05-01",
      insuranceId: "INS-9999",
    } as unknown as PatientForContext;

    const { patient } = sanitizePatientContext(dirty, []);

    expect(Object.keys(patient).sort()).toEqual(
      [
        "firstName",
        "diagnosis",
        "communicationLevel",
        "interests",
        "sensoryNotes",
        "behavioralNotes",
      ].sort(),
    );
    expect((patient as Record<string, unknown>)._id).toBeUndefined();
    expect((patient as Record<string, unknown>).userId).toBeUndefined();
    expect((patient as Record<string, unknown>).dateOfBirth).toBeUndefined();
    expect((patient as Record<string, unknown>).insuranceId).toBeUndefined();
  });

  it("sanitizes goals to only allowed fields", () => {
    const dirtyGoals = fullGoals.map((g) => ({
      ...g,
      _id: "goal-id",
      patientId: "patient-id",
      status: "active",
    })) as unknown as GoalForContext[];

    const { goals } = sanitizePatientContext(fullPatient, dirtyGoals);

    for (const goal of goals) {
      expect(Object.keys(goal).sort()).toEqual(
        ["shortDescription", "domain", "targetAccuracy"].sort(),
      );
      expect((goal as Record<string, unknown>)._id).toBeUndefined();
      expect((goal as Record<string, unknown>).patientId).toBeUndefined();
      expect((goal as Record<string, unknown>).status).toBeUndefined();
    }
  });

  it("handles missing optional patient fields gracefully", () => {
    const { patient } = sanitizePatientContext(minimalPatient, []);

    expect(patient.firstName).toBe("Sage");
    expect(patient.diagnosis).toBe("Speech delay");
    expect(patient.communicationLevel).toBeUndefined();
    expect(patient.interests).toBeUndefined();
    expect(patient.sensoryNotes).toBeUndefined();
    expect(patient.behavioralNotes).toBeUndefined();
  });

  it("preserves all values from a full patient", () => {
    const { patient } = sanitizePatientContext(fullPatient, fullGoals);

    expect(patient.firstName).toBe(fullPatient.firstName);
    expect(patient.diagnosis).toBe(fullPatient.diagnosis);
    expect(patient.communicationLevel).toBe(fullPatient.communicationLevel);
    expect(patient.interests).toEqual(fullPatient.interests);
    expect(patient.sensoryNotes).toBe(fullPatient.sensoryNotes);
    expect(patient.behavioralNotes).toBe(fullPatient.behavioralNotes);
  });

  it("preserves all goal values", () => {
    const { goals } = sanitizePatientContext(fullPatient, fullGoals);

    expect(goals).toHaveLength(2);
    expect(goals[0].shortDescription).toBe(fullGoals[0].shortDescription);
    expect(goals[0].domain).toBe(fullGoals[0].domain);
    expect(goals[0].targetAccuracy).toBe(fullGoals[0].targetAccuracy);
  });

  it("returns an empty goals array when no goals provided", () => {
    const { goals } = sanitizePatientContext(fullPatient, []);
    expect(goals).toEqual([]);
  });
});

// ─── buildPatientContextBlock ─────────────────────────────────────────────────

describe("buildPatientContextBlock", () => {
  it("formats a complete patient context block with all fields", () => {
    const block = buildPatientContextBlock(fullPatient, fullGoals);

    expect(block).toContain("## Patient Context");
    expect(block).toContain("Ace");
    expect(block).toContain("Autism Spectrum Disorder (Level 1)");
    expect(block).toContain("Verbal, uses AAC for complex sentences");
    expect(block).toContain("trains, Minecraft, dogs");
    expect(block).toContain("Sensitive to loud noises");
    expect(block).toContain("Responds well to visual schedules");
  });

  it("includes all goals in a numbered list", () => {
    const block = buildPatientContextBlock(fullPatient, fullGoals);

    expect(block).toContain("1.");
    expect(block).toContain("2.");
    expect(block).toContain("[Social/Emotional]");
    expect(block).toContain("Identify emotions from facial expressions");
    expect(block).toContain("(target: 80%)");
    expect(block).toContain("[Communication]");
    expect(block).toContain("Request preferred items using 2-word phrases");
    expect(block).toContain("(target: 90%)");
  });

  it("shows 'No active therapy goals defined yet.' when goals is empty", () => {
    const block = buildPatientContextBlock(fullPatient, []);

    expect(block).toContain("No active therapy goals defined yet.");
    expect(block).not.toContain("1.");
  });

  it("shows 'Not specified' for missing communicationLevel", () => {
    const block = buildPatientContextBlock(minimalPatient, []);

    expect(block).toContain("Not specified");
  });

  it("shows 'None noted' for missing interests", () => {
    const block = buildPatientContextBlock(minimalPatient, []);

    expect(block).toContain("None noted");
  });

  it("shows 'None noted' for missing sensoryNotes", () => {
    const block = buildPatientContextBlock(minimalPatient, []);

    // Should appear at least once (sensory + behavioral both missing)
    const matches = block.match(/None noted/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("contains the privacy instruction about child's name", () => {
    const block = buildPatientContextBlock(fullPatient, fullGoals);

    expect(block).toContain("Do not include the child's name");
  });

  it("contains personalization instructions", () => {
    const block = buildPatientContextBlock(fullPatient, fullGoals);

    expect(block).toContain("personalize");
    expect(block).toContain("interests");
    expect(block).toContain("communication level");
  });

  it("starts with the '## Patient Context' heading", () => {
    const block = buildPatientContextBlock(fullPatient, fullGoals);

    expect(block.trimStart()).toMatch(/^## Patient Context/);
  });
});
