// convex/__tests__/messages.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("messages", () => {
  it("create and list roundtrip", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test Session",
      query: "Build a token board",
    });
    await t.mutation(api.messages.create, {
      sessionId,
      role: "user",
      content: "Hello, build me a token board",
      timestamp: 1000,
    });
    const messages = await t.query(api.messages.list, { sessionId });
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Hello, build me a token board");
    expect(messages[0].role).toBe("user");
  });

  it("list returns messages in ascending timestamp order", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Ordering Test",
      query: "test",
    });
    await t.mutation(api.messages.create, {
      sessionId,
      role: "assistant",
      content: "Second message",
      timestamp: 2000,
    });
    await t.mutation(api.messages.create, {
      sessionId,
      role: "user",
      content: "First message",
      timestamp: 1000,
    });
    const messages = await t.query(api.messages.list, { sessionId });
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe("First message");
    expect(messages[1].content).toBe("Second message");
  });

  it("addUserMessage sets role to user automatically", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "User Message Test",
      query: "test",
    });
    await t.mutation(api.messages.addUserMessage, {
      sessionId,
      content: "Build me a visual schedule",
    });
    const messages = await t.query(api.messages.list, { sessionId });
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("Build me a visual schedule");
  });

  it("list returns empty for new session with no messages", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Empty Session",
      query: "test",
    });
    const messages = await t.query(api.messages.list, { sessionId });
    expect(messages).toHaveLength(0);
  });

  it("messages are isolated per session", async () => {
    const t = convexTest(schema, modules);
    const sessionA = await t.mutation(api.sessions.create, {
      title: "Session A",
      query: "test",
    });
    const sessionB = await t.mutation(api.sessions.create, {
      title: "Session B",
      query: "test",
    });
    await t.mutation(api.messages.addUserMessage, {
      sessionId: sessionA,
      content: "Message for A",
    });
    await t.mutation(api.messages.addUserMessage, {
      sessionId: sessionB,
      content: "Message for B",
    });
    const messagesA = await t.query(api.messages.list, { sessionId: sessionA });
    const messagesB = await t.query(api.messages.list, { sessionId: sessionB });
    expect(messagesA).toHaveLength(1);
    expect(messagesA[0].content).toBe("Message for A");
    expect(messagesB).toHaveLength(1);
    expect(messagesB[0].content).toBe("Message for B");
  });
});
