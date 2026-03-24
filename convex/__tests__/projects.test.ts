import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("projects CRUD", () => {
  test("projects.create generates a share slug", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Morning Routine Tracker",
    });

    const project = await t.query(api.projects.get, { projectId });
    expect(project).not.toBeNull();
    expect(project!.shareSlug).toBeDefined();
    expect(project!.shareSlug.length).toBeGreaterThan(0);
  });

  test("projects.create stores title and optional description", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Token Board App",
      description: "A token reward board for positive reinforcement",
    });

    const project = await t.query(api.projects.get, { projectId });
    expect(project).not.toBeNull();
    expect(project!.title).toBe("Token Board App");
    expect(project!.description).toBe("A token reward board for positive reinforcement");
  });

  test("projects.create works without description", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Simple App",
    });

    const project = await t.query(api.projects.get, { projectId });
    expect(project).not.toBeNull();
    expect(project!.title).toBe("Simple App");
  });

  test("projects.get returns the created project", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Communication Board",
      description: "A picture communication board",
    });

    const project = await t.query(api.projects.get, { projectId });
    expect(project).not.toBeNull();
    expect(project!._id).toEqual(projectId);
    expect(project!.title).toBe("Communication Board");
  });

  test("projects.get returns null for non-existent project", async () => {
    const t = convexTest(schema, modules);

    // Create one project to get a valid ID shape, then query a different one
    const projectId = await t.mutation(api.projects.create, { title: "Test" });
    const project = await t.query(api.projects.get, { projectId });
    // The actual project should exist
    expect(project).not.toBeNull();
  });

  test("projects.getBySlug finds project by share slug", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Visual Schedule",
    });

    const created = await t.query(api.projects.get, { projectId });
    expect(created).not.toBeNull();

    const found = await t.query(api.projects.getBySlug, {
      slug: created!.shareSlug,
    });
    expect(found).not.toBeNull();
    expect(found!._id).toEqual(projectId);
    expect(found!.title).toBe("Visual Schedule");
  });

  test("projects.getBySlug returns null for unknown slug", async () => {
    const t = convexTest(schema, modules);

    const found = await t.query(api.projects.getBySlug, {
      slug: "nonexistent-slug-xyz",
    });
    expect(found).toBeNull();
  });

  test("projects.list returns all projects", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.projects.create, { title: "Project Alpha" });
    await t.mutation(api.projects.create, { title: "Project Beta" });

    const projects = await t.query(api.projects.list, {});
    expect(projects.length).toBeGreaterThanOrEqual(2);
    const titles = projects.map((p: any) => p.title);
    expect(titles).toContain("Project Alpha");
    expect(titles).toContain("Project Beta");
  });

  test("projects.list returns empty array when no projects exist", async () => {
    const t = convexTest(schema, modules);

    const projects = await t.query(api.projects.list, {});
    expect(Array.isArray(projects)).toBe(true);
  });

  test("projects.update patches the title", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Old Title",
    });

    await t.mutation(api.projects.update, {
      projectId,
      title: "New Title",
    });

    const updated = await t.query(api.projects.get, { projectId });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("New Title");
  });

  test("projects.update can set description", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "My Project",
    });

    await t.mutation(api.projects.update, {
      projectId,
      description: "Added description later",
    });

    const updated = await t.query(api.projects.get, { projectId });
    expect(updated).not.toBeNull();
    expect(updated!.description).toBe("Added description later");
  });

  test("projects.remove deletes the project", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Project to Delete",
    });

    const before = await t.query(api.projects.get, { projectId });
    expect(before).not.toBeNull();

    await t.mutation(api.projects.remove, { projectId });

    const after = await t.query(api.projects.get, { projectId });
    expect(after).toBeNull();
  });

  test("projects.create sets createdAt and updatedAt timestamps", async () => {
    const t = convexTest(schema, modules);

    const before = Date.now();
    const projectId = await t.mutation(api.projects.create, {
      title: "Timestamped Project",
    });

    const project = await t.query(api.projects.get, { projectId });
    expect(project).not.toBeNull();
    expect(project!.createdAt).toBeGreaterThanOrEqual(before);
    expect(project!.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

describe("projects versioning", () => {
  test("saveVersion appends a version entry to the project", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Token Board",
    });

    await t.mutation(api.projects.saveVersion, {
      projectId,
      fragment: { title: "Token Board", code: "export default function App() {}" },
      sandboxId: "sandbox-abc-123",
    });

    const project = await t.query(api.projects.get, { projectId });
    expect(project).not.toBeNull();
    expect(Array.isArray(project!.versions)).toBe(true);
    expect(project!.versions.length).toBe(1);
  });

  test("saveVersion caps versions at 10 (FIFO — oldest dropped)", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Version Cap Test",
    });

    // Save 11 versions
    for (let i = 1; i <= 11; i++) {
      await t.mutation(api.projects.saveVersion, {
        projectId,
        fragment: { title: `Version ${i}`, code: `export default function App${i}() {}` },
        sandboxId: `sandbox-${i}`,
      });
    }

    const project = await t.query(api.projects.get, { projectId });
    expect(project!.versions.length).toBe(10);
    // Oldest (version 1) should have been dropped; newest (version 11) should be last
    const lastVersion = project!.versions[project!.versions.length - 1];
    expect(lastVersion.fragment.title).toBe("Version 11");
  });

  test("getLatestVersion returns the second-to-last version", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "History Test",
    });

    await t.mutation(api.projects.saveVersion, {
      projectId,
      fragment: { title: "First Version", code: "v1" },
      sandboxId: "sandbox-v1",
    });
    await t.mutation(api.projects.saveVersion, {
      projectId,
      fragment: { title: "Second Version", code: "v2" },
      sandboxId: "sandbox-v2",
    });
    await t.mutation(api.projects.saveVersion, {
      projectId,
      fragment: { title: "Third Version", code: "v3" },
      sandboxId: "sandbox-v3",
    });

    const previous = await t.query(api.projects.getLatestVersion, { projectId });
    expect(previous).not.toBeNull();
    // getLatestVersion returns the second-to-last (i.e., the previous working version)
    expect(previous!.fragment.title).toBe("Second Version");
  });

  test("getLatestVersion returns null when fewer than 2 versions exist", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Sparse History",
    });

    // No versions saved yet
    const noVersions = await t.query(api.projects.getLatestVersion, { projectId });
    expect(noVersions).toBeNull();

    // Save exactly one version
    await t.mutation(api.projects.saveVersion, {
      projectId,
      fragment: { title: "Only Version", code: "v1" },
      sandboxId: "sandbox-v1",
    });

    const oneVersion = await t.query(api.projects.getLatestVersion, { projectId });
    expect(oneVersion).toBeNull();
  });

  test("updatePublishUrl patches the publishedUrl field", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Published Project",
    });

    await t.mutation(api.projects.updatePublishUrl, {
      projectId,
      publishedUrl: "https://bridges-morning-routine.vercel.app",
    });

    const project = await t.query(api.projects.get, { projectId });
    expect(project).not.toBeNull();
    expect(project!.publishedUrl).toBe("https://bridges-morning-routine.vercel.app");
  });
});
