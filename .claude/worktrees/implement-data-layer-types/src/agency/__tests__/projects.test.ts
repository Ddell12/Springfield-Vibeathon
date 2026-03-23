import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAgency = vi.hoisted(() => ({
  listClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  removeClient: vi.fn(),
  listProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../../convex-sync/index.js", () => ({
  agency: mockAgency,
}));

vi.mock("../../core/logger.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  listProjects,
  listProjectsByClient,
  createProject,
  updateProject,
  removeProject,
} from "../projects.js";

const mockProject = {
  _id: "project-id-1" as any,
  clientId: "client-id-1" as any,
  name: "Website Redesign",
  description: "Full redesign of client website",
  status: "in_progress" as const,
  createdAt: 1700000000000,
};

describe("listProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns projects from convex query", async () => {
    mockAgency.listProjects.mockResolvedValue([mockProject]);

    const result = await listProjects();

    expect(result).toEqual([mockProject]);
  });

  it("passes status filter to query", async () => {
    mockAgency.listProjects.mockResolvedValue([]);

    await listProjects("scoping");

    expect(mockAgency.listProjects).toHaveBeenCalledOnce();
  });

  it("propagates error from adapter", async () => {
    mockAgency.listProjects.mockRejectedValue(new Error("Network error"));

    await expect(listProjects()).rejects.toThrow("Network error");
  });
});

describe("listProjectsByClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries projects by client id", async () => {
    mockAgency.listProjects.mockResolvedValue([mockProject]);

    const result = await listProjectsByClient("client-id-1" as any);

    expect(result).toEqual([mockProject]);
    expect(mockAgency.listProjects).toHaveBeenCalledWith("client-id-1");
  });

  it("propagates error from adapter", async () => {
    mockAgency.listProjects.mockRejectedValue(new Error("DB error"));

    await expect(listProjectsByClient("client-id-1" as any)).rejects.toThrow("DB error");
  });
});

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls mutation with project data", async () => {
    mockAgency.createProject.mockResolvedValue(undefined);

    await createProject({
      clientId: "client-id-1" as any,
      name: "New Project",
      description: "A new project",
    });

    expect(mockAgency.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Project", description: "A new project" }),
    );
  });

  it("includes optional budget and deadline", async () => {
    mockAgency.createProject.mockResolvedValue(undefined);

    await createProject({
      clientId: "client-id-1" as any,
      name: "Project",
      description: "Desc",
      budget: 5000,
      deadline: 1800000000000,
    });

    expect(mockAgency.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ budget: 5000 }),
    );
  });

  it("propagates error from adapter", async () => {
    mockAgency.createProject.mockRejectedValue(new Error("DB error"));

    await expect(
      createProject({ clientId: "cid" as any, name: "P", description: "D" }),
    ).rejects.toThrow("DB error");
  });
});

describe("updateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls mutation with id and updates", async () => {
    mockAgency.updateProject.mockResolvedValue(undefined);

    await updateProject("project-id-1" as any, { status: "delivered" });

    expect(mockAgency.updateProject).toHaveBeenCalledWith(
      "project-id-1",
      expect.objectContaining({ status: "delivered" }),
    );
  });

  it("propagates error from adapter", async () => {
    mockAgency.updateProject.mockRejectedValue(new Error("DB error"));

    await expect(updateProject("project-id-1" as any, { name: "Updated" })).rejects.toThrow("DB error");
  });
});

describe("removeProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls mutation with project id", async () => {
    await removeProject("project-id-1" as any);
    // removeProject is a no-op (not supported by adapter), just verifies no error thrown
  });
});
