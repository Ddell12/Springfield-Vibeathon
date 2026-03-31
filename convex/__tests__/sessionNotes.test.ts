import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const today = new Date().toISOString().slice(0, 10);

const VALID_SESSION_DATA = {
  sessionDate: today,
  sessionDuration: 30,
  sessionType: "in-person" as const,
  structuredData: {
    targetsWorkedOn: [
      {
        target: "Initial /s/ in words",
        trials: 20,
        correct: 14,
        promptLevel: "verbal-cue" as const,
      },
    ],
  },
};

const VALID_SOAP = {
  subjective:
    "Patient's parent reports increased practice at home this week. Patient appeared eager and engaged at start of session.",
  objective:
    "Patient produced initial /s/ correctly in 14/20 trials (70%) with verbal cues. Improvement from 55% last session.",
  assessment:
    "Patient is making steady progress toward initial /s/ production goal. Verbal cue level is appropriate; ready to begin fading prompts.",
  plan: "Continue initial /s/ in words, begin fading verbal cues to independent. Introduce /s/ blends next session if accuracy exceeds 80%.",
};

/**
 * Helper: creates a patient then a session note, returns both IDs.
 */
async function createPatientAndNote(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  noteOverrides?: Partial<typeof VALID_SESSION_DATA>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const noteId = await t.mutation(api.sessionNotes.create, {
    patientId,
    ...VALID_SESSION_DATA,
    ...noteOverrides,
  });
  return { patientId, noteId };
}

// ── create ──────────────────────────────────────────────────────────────────

describe("sessionNotes.create", () => {
  it("creates note with required fields (status=draft, aiGenerated=false, correct slpUserId)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    const note = await t.query(api.sessionNotes.get, { noteId });
    expect(note).toBeDefined();
    expect(note!.status).toBe("draft");
    expect(note!.aiGenerated).toBe(false);
    expect(note!.slpUserId).toBe("slp-user-123");
    expect(note!.sessionDate).toBe(today);
    expect(note!.sessionDuration).toBe(30);
    expect(note!.sessionType).toBe("in-person");
  });

  it("rejects future sessionDate", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.sessionNotes.create, {
        patientId,
        ...VALID_SESSION_DATA,
        sessionDate: "2099-06-15",
      }),
    ).rejects.toThrow("future");
  });

  it("rejects invalid sessionDuration (e.g., 2 min)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.sessionNotes.create, {
        patientId,
        ...VALID_SESSION_DATA,
        sessionDuration: 2,
      }),
    ).rejects.toThrow("duration");
  });

  it("rejects when correct exceeds trials", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.sessionNotes.create, {
        patientId,
        ...VALID_SESSION_DATA,
        structuredData: {
          targetsWorkedOn: [
            { target: "Final /z/", trials: 10, correct: 15, promptLevel: "model" as const },
          ],
        },
      }),
    ).rejects.toThrow("Correct trials cannot exceed total trials");
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    // We can't create a patient without auth, so we need a valid patientId.
    // Use an authenticated context to create the patient first.
    const authed = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await authed.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.sessionNotes.create, { patientId, ...VALID_SESSION_DATA }),
    ).rejects.toThrow();
  });
});

// ── update ──────────────────────────────────────────────────────────────────

describe("sessionNotes.update", () => {
  it("partial update works on draft, auto-transitions to in-progress", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    // Confirm draft
    let note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.status).toBe("draft");

    await t.mutation(api.sessionNotes.update, {
      noteId,
      sessionDuration: 45,
    });

    note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.sessionDuration).toBe(45);
    expect(note!.status).toBe("in-progress");
  });

  it("rejects update on signed note", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    // Transition: draft -> in-progress -> complete -> signed
    await t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 30 });
    await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" });
    await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });
    await t.mutation(api.sessionNotes.sign, { noteId });

    await expect(
      t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 60 }),
    ).rejects.toThrow("signed");
  });

  it("rejects update by different SLP", async () => {
    const t = convexTest(schema, modules);
    const slp1 = t.withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(slp1);

    const slp2 = t.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.sessionNotes.update, { noteId, sessionDuration: 60 }),
    ).rejects.toThrow("Not authorized");
  });
});

// ── saveSoapFromAI ──────────────────────────────────────────────────────────

describe("sessionNotes.saveSoapFromAI", () => {
  it("saves SOAP with aiGenerated=true", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });

    const note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.soapNote).toEqual(VALID_SOAP);
    expect(note!.aiGenerated).toBe(true);
  });
});

// ── updateSoap ──────────────────────────────────────────────────────────────

describe("sessionNotes.updateSoap", () => {
  it("manual edit sets aiGenerated=false", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    // First save as AI
    await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });
    let note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.aiGenerated).toBe(true);

    // Manual edit
    const editedSoap = { ...VALID_SOAP, subjective: "Edited by clinician." };
    await t.mutation(api.sessionNotes.updateSoap, { noteId, soapNote: editedSoap });

    note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.soapNote?.subjective).toBe("Edited by clinician.");
    expect(note!.aiGenerated).toBe(false);
  });
});

// ── sign ────────────────────────────────────────────────────────────────────

describe("sessionNotes.sign", () => {
  it("signs complete note with SOAP (status=signed, signedAt set)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    // Transition to complete with SOAP
    await t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 30 });
    await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" });
    await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });

    await t.mutation(api.sessionNotes.sign, { noteId });

    const note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.status).toBe("signed");
    expect(note!.signedAt).toBeDefined();
    expect(note!.signedAt).toBeGreaterThan(0);
  });

  it("rejects signing without SOAP", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    // Move to complete without SOAP
    await t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 30 });
    await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" });

    await expect(t.mutation(api.sessionNotes.sign, { noteId })).rejects.toThrow("SOAP");
  });

  it("rejects signing draft note (must be complete)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    await expect(t.mutation(api.sessionNotes.sign, { noteId })).rejects.toThrow(
      "Only complete session notes can be signed",
    );
  });
});

// ── unsign ──────────────────────────────────────────────────────────────────

describe("sessionNotes.unsign", () => {
  it("reverts signed to complete, clears signedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    // Get to signed state
    await t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 30 });
    await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" });
    await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });
    await t.mutation(api.sessionNotes.sign, { noteId });

    let note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.status).toBe("signed");
    expect(note!.signedAt).toBeDefined();

    await t.mutation(api.sessionNotes.unsign, { noteId });

    note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.status).toBe("complete");
    expect(note!.signedAt).toBeUndefined();
  });
});

// ── remove ──────────────────────────────────────────────────────────────────

describe("sessionNotes.remove", () => {
  it("deletes draft note", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId, patientId } = await createPatientAndNote(t);

    await t.mutation(api.sessionNotes.remove, { noteId });

    const notes = await t.query(api.sessionNotes.list, { patientId });
    expect(notes).toHaveLength(0);
  });

  it("rejects deleting signed note", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { noteId } = await createPatientAndNote(t);

    // Get to signed state
    await t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 30 });
    await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" });
    await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });
    await t.mutation(api.sessionNotes.sign, { noteId });

    await expect(t.mutation(api.sessionNotes.remove, { noteId })).rejects.toThrow(
      "Cannot delete a signed session note",
    );
  });
});

// ── list ────────────────────────────────────────────────────────────────────

describe("sessionNotes.list", () => {
  it("returns notes for patient, rejects other SLP's patient", async () => {
    const t = convexTest(schema, modules);
    const slp1 = t.withIdentity(SLP_IDENTITY);
    const slp2 = t.withIdentity(OTHER_SLP);

    const { patientId } = await createPatientAndNote(slp1);

    const notes = await slp1.query(api.sessionNotes.list, { patientId });
    expect(notes).toHaveLength(1);
    expect(notes[0].sessionDate).toBe(today);

    // Other SLP cannot list
    await expect(
      slp2.query(api.sessionNotes.list, { patientId }),
    ).rejects.toThrow("Not authorized");
  });
});

// ── getLatestSoap ───────────────────────────────────────────────────────────

describe("sessionNotes.getLatestSoap", () => {
  it("returns most recent with SOAP, skips drafts; returns null when none exist", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);

    // No notes at all — should return null
    const none = await t.query(api.sessionNotes.getLatestSoap, { patientId });
    expect(none).toBeNull();

    // Create a draft note with SOAP (should be skipped)
    const draftId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });
    await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId: draftId, soapNote: VALID_SOAP });

    // Still null — draft notes are skipped
    const stillNone = await t.query(api.sessionNotes.getLatestSoap, { patientId });
    expect(stillNone).toBeNull();

    // Create a complete note with SOAP
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const completeId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
      sessionDate: yesterdayStr,
    });
    await t.mutation(api.sessionNotes.update, { noteId: completeId, sessionDuration: 30 });
    await t.mutation(api.sessionNotes.updateStatus, { noteId: completeId, status: "complete" });
    await t.mutation(api.sessionNotes.saveSoapFromAI, {
      noteId: completeId,
      soapNote: VALID_SOAP,
    });

    const latest = await t.query(api.sessionNotes.getLatestSoap, { patientId });
    expect(latest).toBeDefined();
    expect(latest!._id).toBe(completeId);
    expect(latest!.soapNote).toEqual(VALID_SOAP);
  });
});

// ── createGroup ────────────────────────────────────────────────────────────

describe("sessionNotes.createGroup", () => {
  it("creates one note per patient with shared groupSessionId", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    // Create 3 patients
    const { patientId: p1 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Patient",
      lastName: "One",
    });
    const { patientId: p2 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Patient",
      lastName: "Two",
    });
    const { patientId: p3 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Patient",
      lastName: "Three",
    });

    const noteIds = await t.mutation(api.sessionNotes.createGroup, {
      patientIds: [p1, p2, p3],
      sessionDate: today,
      sessionDuration: 45,
      sessionType: "in-person" as const,
      structuredData: {
        targetsWorkedOn: [
          { target: "Group activity: turn-taking" },
        ],
      },
    });

    expect(noteIds).toHaveLength(3);

    // All notes share the same groupSessionId
    const note1 = await t.query(api.sessionNotes.get, { noteId: noteIds[0] });
    const note2 = await t.query(api.sessionNotes.get, { noteId: noteIds[1] });
    const note3 = await t.query(api.sessionNotes.get, { noteId: noteIds[2] });

    expect(note1!.groupSessionId).toBeDefined();
    expect(note1!.groupSessionId).toBe(note2!.groupSessionId);
    expect(note2!.groupSessionId).toBe(note3!.groupSessionId);

    // Each note has groupPatientIds listing all 3 patients
    expect(note1!.groupPatientIds).toEqual(expect.arrayContaining([p1, p2, p3]));
    expect(note1!.groupPatientIds).toHaveLength(3);

    // Each note has correct patientId
    expect(note1!.patientId).toBe(p1);
    expect(note2!.patientId).toBe(p2);
    expect(note3!.patientId).toBe(p3);

    // Shared structured data is copied to each
    expect(note1!.structuredData.targetsWorkedOn[0].target).toBe("Group activity: turn-taking");
    expect(note2!.structuredData.targetsWorkedOn[0].target).toBe("Group activity: turn-taking");
  });

  it("rejects fewer than 2 patients", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId: p1 } = await t.mutation(api.patients.create, VALID_PATIENT);

    await expect(
      t.mutation(api.sessionNotes.createGroup, {
        patientIds: [p1],
        sessionDate: today,
        sessionDuration: 30,
        sessionType: "in-person" as const,
        structuredData: { targetsWorkedOn: [{ target: "Test" }] },
      }),
    ).rejects.toThrow("2");
  });

  it("rejects more than 6 patients", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const patientIds = [];
    for (let i = 0; i < 7; i++) {
      const { patientId } = await t.mutation(api.patients.create, {
        ...VALID_PATIENT,
        firstName: `Patient`,
        lastName: `${i}`,
      });
      patientIds.push(patientId);
    }

    await expect(
      t.mutation(api.sessionNotes.createGroup, {
        patientIds,
        sessionDate: today,
        sessionDuration: 30,
        sessionType: "in-person" as const,
        structuredData: { targetsWorkedOn: [{ target: "Test" }] },
      }),
    ).rejects.toThrow("6");
  });

  it("rejects when SLP does not own a patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const slp2 = base.withIdentity(OTHER_SLP);

    const { patientId: ownedPatient } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const { patientId: otherPatient } = await slp2.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Other",
      lastName: "Patient",
    });

    await expect(
      slp1.mutation(api.sessionNotes.createGroup, {
        patientIds: [ownedPatient, otherPatient],
        sessionDate: today,
        sessionDuration: 30,
        sessionType: "in-person" as const,
        structuredData: { targetsWorkedOn: [{ target: "Test" }] },
      }),
    ).rejects.toThrow("Not authorized");
  });
});
