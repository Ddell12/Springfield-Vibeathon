import type { Id } from "../../../convex/_generated/dataModel";

export function createMockPatient(overrides?: Record<string, unknown>) {
  return {
    _id: "patients_1" as Id<"patients">,
    _creationTime: Date.now(),
    slpUserId: "user_slp_1",
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-06-15",
    diagnosis: "articulation" as const,
    status: "active" as const,
    ...overrides,
  };
}

export function createMockCaregiverLink(overrides?: Record<string, unknown>) {
  return {
    _id: "caregiverLinks_1" as Id<"caregiverLinks">,
    _creationTime: Date.now(),
    patientId: "patients_1" as Id<"patients">,
    email: "parent@example.com",
    inviteToken: "tok_abc123",
    inviteStatus: "accepted" as const,
    caregiverUserId: "user_caregiver_1",
    relationship: "Parent",
    ...overrides,
  };
}

export function createMockHomeProgram(overrides?: Record<string, unknown>) {
  return {
    _id: "homePrograms_1" as Id<"homePrograms">,
    _creationTime: Date.now(),
    patientId: "patients_1" as Id<"patients">,
    slpUserId: "user_slp_1",
    title: "Articulation Practice",
    instructions: "Practice /s/ sound in initial position",
    frequency: "daily" as const,
    status: "active" as const,
    startDate: "2026-03-01",
    ...overrides,
  };
}

export function createMockActivity(overrides?: Record<string, unknown>) {
  return {
    _id: "activityLog_1" as Id<"activityLog">,
    _creationTime: Date.now(),
    patientId: "patients_1" as Id<"patients">,
    actorUserId: "user_slp_1",
    action: "session-completed" as const,
    description: "Completed therapy session",
    timestamp: Date.now(),
    ...overrides,
  };
}

export function createMockMessage(overrides?: Record<string, unknown>) {
  return {
    _id: "patientMessages_1" as Id<"patientMessages">,
    _creationTime: Date.now(),
    patientId: "patients_1" as Id<"patients">,
    senderUserId: "user_slp_1",
    senderRole: "slp" as const,
    content: "Great progress today!",
    timestamp: Date.now(),
    ...overrides,
  };
}
