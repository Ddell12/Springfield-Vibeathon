import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "https://test.convex.dev" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "https://test.convex.dev",
};
const STRANGER = { subject: "stranger-000", issuer: "https://test.convex.dev" };

async function setupWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "parent@test.com",
  });
  await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.caregivers.acceptInvite, { token });
  return { patientId };
}

describe("patientMessages.send", () => {
  it("SLP can send with role=slp", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    const msgId = await t.withIdentity(SLP_IDENTITY).mutation(
      api.patientMessages.send,
      { patientId, content: "Hello from the SLP!" }
    );
    expect(msgId).toBeDefined();

    const messages = await t.withIdentity(SLP_IDENTITY).query(
      api.patientMessages.list,
      { patientId }
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].senderRole).toBe("slp");
    expect(messages[0].content).toBe("Hello from the SLP!");
  });

  it("caregiver can send with role=caregiver", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    const msgId = await t.withIdentity(CAREGIVER_IDENTITY).mutation(
      api.patientMessages.send,
      { patientId, content: "Hello from the caregiver!" }
    );
    expect(msgId).toBeDefined();

    const messages = await t.withIdentity(SLP_IDENTITY).query(
      api.patientMessages.list,
      { patientId }
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].senderRole).toBe("caregiver");
    expect(messages[0].content).toBe("Hello from the caregiver!");
  });

  it("stranger cannot send", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    await expect(
      t.withIdentity(STRANGER).mutation(api.patientMessages.send, {
        patientId,
        content: "sneaky message",
      })
    ).rejects.toThrow();
  });

  it("logs message-sent to activity log", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Test activity log",
    });

    const logs = await t.withIdentity(SLP_IDENTITY).query(
      api.activityLog.listByPatient,
      { patientId }
    );
    const messageSentLog = logs.find((l) => l.action === "message-sent");
    expect(messageSentLog).toBeDefined();
  });
});

describe("patientMessages.list", () => {
  it("returns messages for patient ordered by timestamp desc", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "First message",
    });
    await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Second message",
    });

    const messages = await t.withIdentity(SLP_IDENTITY).query(
      api.patientMessages.list,
      { patientId }
    );
    expect(messages).toHaveLength(2);
    // Ordered desc — second message should come first
    expect(messages[0].content).toBe("Second message");
    expect(messages[1].content).toBe("First message");
  });
});

describe("patientMessages.markRead", () => {
  it("recipient can mark a message as read", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    // SLP sends a message
    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Message to be read",
    });

    const messages = await t.withIdentity(CAREGIVER_IDENTITY).query(
      api.patientMessages.list,
      { patientId }
    );
    expect(messages[0].readAt).toBeUndefined();

    // Caregiver (recipient) marks it read
    await t.withIdentity(CAREGIVER_IDENTITY).mutation(
      api.patientMessages.markRead,
      { messageId: messages[0]._id }
    );

    const after = await t.withIdentity(CAREGIVER_IDENTITY).query(
      api.patientMessages.list,
      { patientId }
    );
    expect(after[0].readAt).toBeDefined();
  });

  it("sender cannot mark own message as read", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Own message",
    });

    const messages = await t.withIdentity(SLP_IDENTITY).query(
      api.patientMessages.list,
      { patientId }
    );

    await expect(
      t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.markRead, {
        messageId: messages[0]._id,
      })
    ).rejects.toThrow("Cannot mark your own message as read");
  });
});

describe("patientMessages.getUnreadCount", () => {
  it("returns correct unread count", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    // SLP sends 2 messages — caregiver should see 2 unread
    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Message 1",
    });
    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Message 2",
    });

    const count = await t.withIdentity(CAREGIVER_IDENTITY).query(
      api.patientMessages.getUnreadCount,
      { patientId }
    );
    expect(count).toBe(2);
  });

  it("decrements after markRead", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Message A",
    });
    await t.withIdentity(SLP_IDENTITY).mutation(api.patientMessages.send, {
      patientId,
      content: "Message B",
    });

    const messages = await t.withIdentity(CAREGIVER_IDENTITY).query(
      api.patientMessages.list,
      { patientId }
    );

    await t.withIdentity(CAREGIVER_IDENTITY).mutation(
      api.patientMessages.markRead,
      { messageId: messages[0]._id }
    );

    const count = await t.withIdentity(CAREGIVER_IDENTITY).query(
      api.patientMessages.getUnreadCount,
      { patientId }
    );
    expect(count).toBe(1);
  });
});
