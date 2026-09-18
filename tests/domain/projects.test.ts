import { describe, expect, test } from "bun:test";
import {
  getProject,
  type ProjectRecord,
  type ProjectRepository,
} from "@/server/core/projects";

const project: ProjectRecord = {
  id: "project-1",
  userId: "user-1",
  name: "Living room",
  defaultRoomType: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("project ownership", () => {
  test("passes the authenticated user id to the repository", async () => {
    let requestedUserId = "";
    const repository = {
      findByIdForUser: async (_id: string, userId: string) => {
        requestedUserId = userId;
        return userId === project.userId ? project : null;
      },
    } as ProjectRepository;

    expect(await getProject(repository, project.id, project.userId)).toEqual(
      project,
    );
    expect(requestedUserId).toBe("user-1");
    expect(await getProject(repository, project.id, "other-user")).toBeNull();
  });
});
