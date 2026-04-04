import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "user_slp", issuer: "https://test.convex.dev" };
const CAREGIVER_IDENTITY = { subject: "user_caregiver", issuer: "https://test.convex.dev" };

async function createPatient(t: ReturnType<typeof convexTest>) {
  const { patientId } = await t.withIdentity(SLP_IDENTITY).mutation(api.patients.create, {
    firstName: "Test",
    lastName: "Child",
    dateOfBirth: "2020-01-01",
    diagnosis: "articulation" as const,
  });
  return patientId;
}

test("hasAcceptedLinkForPatient returns false when no link exists", async () => {
  const t = convexTest(schema, modules);
  const patientId = await createPatient(t);

  const result = await t
    .withIdentity(CAREGIVER_IDENTITY)
    .query(api.caregivers.hasAcceptedLinkForPatient, { patientId });
  expect(result).toBe(false);
});

test("hasAcceptedLinkForPatient returns true when accepted link exists", async () => {
  const t = convexTest(schema, modules);
  const patientId = await createPatient(t);
  const slp = t.withIdentity(SLP_IDENTITY);

  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "caregiver@test.com",
  });

  await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.caregivers.acceptInvite, { token });

  const result = await t
    .withIdentity(CAREGIVER_IDENTITY)
    .query(api.caregivers.hasAcceptedLinkForPatient, { patientId });
  expect(result).toBe(true);
});
