// convex/__tests__/generated_files.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

const TEST_IDENTITY = { subject: "test-user-123", issuer: "https://test.convex.dev" };
const OTHER_IDENTITY = { subject: "other-user-456", issuer: "https://test.convex.dev" };

describe("generated_files — version-tracked file operations", () => {
  it("upsert creates a new file with version", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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

  it("upsertAutoVersion creates a new file with auto version 1", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    const result = await t.mutation(api.generated_files.upsertAutoVersion, {
      sessionId,
      path: "src/App.tsx",
      contents: "// version auto",
    });
    expect(result.version).toBe(1);
    const file = await t.query(api.generated_files.getByPath, {
      sessionId,
      path: "src/App.tsx",
    });
    expect(file?.contents).toBe("// version auto");
    expect(file?.version).toBe(1);
  });

  it("upsertAutoVersion increments version on existing file", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    // Create version 1
    await t.mutation(api.generated_files.upsertAutoVersion, {
      sessionId,
      path: "src/App.tsx",
      contents: "// version 1",
    });
    // Update — should become version 2
    const result = await t.mutation(api.generated_files.upsertAutoVersion, {
      sessionId,
      path: "src/App.tsx",
      contents: "// version 2",
    });
    expect(result.version).toBe(2);
    const file = await t.query(api.generated_files.getByPath, {
      sessionId,
      path: "src/App.tsx",
    });
    expect(file?.contents).toBe("// version 2");
    expect(file?.version).toBe(2);
  });

  it("upsert stores sessionId on the file", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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

  describe("authorization — cross-user rejection", () => {
    it("upsert rejects cross-user access", async () => {
      const t = convexTest(schema, modules);
      const sessionId = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      await expect(
        t.withIdentity(OTHER_IDENTITY).mutation(api.generated_files.upsert, {
          sessionId,
          path: "src/malicious.tsx",
          contents: "// injected",
          version: 1,
        }),
      ).rejects.toThrow("Not authorized");
    });

    it("list returns empty for another user's session", async () => {
      const t = convexTest(schema, modules);
      const sessionId = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      await t.withIdentity(TEST_IDENTITY).mutation(api.generated_files.upsert, {
        sessionId,
        path: "src/App.tsx",
        contents: "// private",
        version: 1,
      });
      const files = await t.withIdentity(OTHER_IDENTITY).query(api.generated_files.list, { sessionId });
      expect(files).toEqual([]);
    });

    it("getByPath returns null for another user's session", async () => {
      const t = convexTest(schema, modules);
      const sessionId = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      await t.withIdentity(TEST_IDENTITY).mutation(api.generated_files.upsert, {
        sessionId,
        path: "src/App.tsx",
        contents: "// private",
        version: 1,
      });
      const file = await t.withIdentity(OTHER_IDENTITY).query(api.generated_files.getByPath, {
        sessionId,
        path: "src/App.tsx",
      });
      expect(file).toBeNull();
    });
  });
});

describe("getBundleByAppId — public bundle serving by appId", () => {
  it("returns bundle HTML for valid appId", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    const appId = await t.run(async (ctx) => {
      return await ctx.db.insert("apps", {
        title: "Play App",
        description: "Test",
        shareSlug: "play-app-slug",
        sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "_bundle.html",
      contents: "<html><body>Kid Mode</body></html>",
      version: 1,
    });
    const html = await t.query(api.generated_files.getBundleByAppId, { appId });
    expect(html).toBe("<html><body>Kid Mode</body></html>");
  });

  it("returns null for nonexistent appId", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    // Create a real app so we have a valid Id shape, then use a different one
    const appId = await t.run(async (ctx) => {
      return await ctx.db.insert("apps", {
        title: "Temp",
        description: "temp",
        shareSlug: "temp-slug-nonexistent",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    // Delete it so the id no longer resolves
    await t.run(async (ctx) => {
      await ctx.db.delete(appId);
    });
    const html = await t.query(api.generated_files.getBundleByAppId, { appId });
    expect(html).toBeNull();
  });

  it("returns null when app has no session", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const appId = await t.run(async (ctx) => {
      return await ctx.db.insert("apps", {
        title: "No Session",
        description: "no session",
        shareSlug: "no-session-app-slug",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // sessionId intentionally omitted
      });
    });
    const html = await t.query(api.generated_files.getBundleByAppId, { appId });
    expect(html).toBeNull();
  });

  it("returns null when app has session but no _bundle.html file", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "No Bundle",
      query: "test",
    });
    const appId = await t.run(async (ctx) => {
      return await ctx.db.insert("apps", {
        title: "No Bundle App",
        description: "no bundle",
        shareSlug: "no-bundle-app-slug",
        sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const html = await t.query(api.generated_files.getBundleByAppId, { appId });
    expect(html).toBeNull();
  });
});

describe("getPublicBundle — public bundle serving via share slug", () => {
  it("returns bundle HTML when app and _bundle.html exist", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.apps.create, {
      title: "Shared App",
      description: "Test app",
      shareSlug: "bundle-test-slug",
      sessionId,
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "_bundle.html",
      contents: "<html><body>Hello World</body></html>",
      version: 1,
    });
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "bundle-test-slug",
    });
    expect(html).toBe("<html><body>Hello World</body></html>");
  });

  it("returns null when share slug does not exist", async () => {
    const t = convexTest(schema, modules);
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "nonexistent-slug",
    });
    expect(html).toBeNull();
  });

  it("returns null when app has no sessionId", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    await t.mutation(api.apps.create, {
      title: "No Session App",
      description: "Missing session",
      shareSlug: "no-session-slug",
    });
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "no-session-slug",
    });
    expect(html).toBeNull();
  });

  it("returns null when _bundle.html does not exist for session", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.apps.create, {
      title: "No Bundle App",
      description: "No bundle yet",
      shareSlug: "no-bundle-slug",
      sessionId,
    });
    const html = await t.query(api.generated_files.getPublicBundle, {
      shareSlug: "no-bundle-slug",
    });
    expect(html).toBeNull();
  });
});
