// convex/__tests__/generated_files.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("generated_files — version-tracked file operations", () => {
  it("upsert creates a new file with version", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/App.tsx",
      contents: "export default function App() { return <div>Hello</div>; }",
      version: 1,
    });
    const file = await t.query(api.generated_files.getByPath, {
      sessionId,
      path: "src/App.tsx",
    });
    expect(file).not.toBeNull();
    expect(file?.path).toBe("src/App.tsx");
    expect(file?.contents).toBe("export default function App() { return <div>Hello</div>; }");
    expect(file?.version).toBe(1);
  });

  it("upsert on existing path updates contents and version — no duplicate created", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    // Create initial version
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/App.tsx",
      contents: "// version 1",
      version: 1,
    });
    // Update to version 2
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/App.tsx",
      contents: "// version 2 — bigger changes",
      version: 2,
    });
    // Should still be only 1 file record
    const files = await t.query(api.generated_files.list, { sessionId });
    const appFiles = files.filter((f) => f.path === "src/App.tsx");
    expect(appFiles.length).toBe(1);
    expect(appFiles[0].contents).toBe("// version 2 — bigger changes");
    expect(appFiles[0].version).toBe(2);
  });

  it("list returns all files for a session", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/App.tsx",
      contents: "// App",
      version: 1,
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/components/TokenBoard.tsx",
      contents: "// TokenBoard",
      version: 1,
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/styles/therapy.css",
      contents: "/* styles */",
      version: 1,
    });
    const files = await t.query(api.generated_files.list, { sessionId });
    expect(files.length).toBe(3);
    const paths = files.map((f) => f.path);
    expect(paths).toContain("src/App.tsx");
    expect(paths).toContain("src/components/TokenBoard.tsx");
    expect(paths).toContain("src/styles/therapy.css");
  });

  it("list only returns files for the specified session", async () => {
    const t = convexTest(schema, modules);
    const sessionA = await t.mutation(api.sessions.create, {
      title: "Session A",
      query: "test A",
    });
    const sessionB = await t.mutation(api.sessions.create, {
      title: "Session B",
      query: "test B",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId: sessionA,
      path: "src/App.tsx",
      contents: "// A",
      version: 1,
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId: sessionB,
      path: "src/App.tsx",
      contents: "// B",
      version: 1,
    });
    const filesA = await t.query(api.generated_files.list, { sessionId: sessionA });
    expect(filesA.length).toBe(1);
    expect(filesA[0].contents).toBe("// A");
  });

  it("getByPath returns null for nonexistent path", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    const file = await t.query(api.generated_files.getByPath, {
      sessionId,
      path: "src/DoesNotExist.tsx",
    });
    expect(file).toBeNull();
  });

  it("getByPath returns the correct file", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/App.tsx",
      contents: "// the app",
      version: 3,
    });
    const file = await t.query(api.generated_files.getByPath, {
      sessionId,
      path: "src/App.tsx",
    });
    expect(file?.path).toBe("src/App.tsx");
    expect(file?.version).toBe(3);
  });

  it("upsert stores sessionId on the file", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/App.tsx",
      contents: "// app",
      version: 1,
    });
    const file = await t.query(api.generated_files.getByPath, {
      sessionId,
      path: "src/App.tsx",
    });
    expect(file?.sessionId).toBe(sessionId);
  });
});
