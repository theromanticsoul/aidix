import type { Prisma } from "@prisma/client";
import type {
  CreateProjectInput,
  ProjectRecord,
  ProjectRepository,
} from "@/server/core/projects";
import { db } from "./client";

function toProjectRecord(
  project: Prisma.ProjectGetPayload<Prisma.ProjectDefaultArgs>,
): ProjectRecord {
  return project;
}

export class PrismaProjectRepository implements ProjectRepository {
  async create(input: CreateProjectInput): Promise<ProjectRecord> {
    return toProjectRecord(
      await db.project.create({
        data: {
          userId: input.userId,
          name: input.name,
          defaultRoomType: input.defaultRoomType,
        },
      }),
    );
  }

  async listByUser(userId: string): Promise<ProjectRecord[]> {
    return (
      await db.project.findMany({
        where: { userId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
      })
    ).map(toProjectRecord);
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<ProjectRecord | null> {
    const project = await db.project.findFirst({
      where: { id, userId, archivedAt: null },
    });
    return project ? toProjectRecord(project) : null;
  }

  async updateName(
    id: string,
    userId: string,
    name: string,
  ): Promise<ProjectRecord | null> {
    const result = await db.project.updateMany({
      where: { id, userId, archivedAt: null },
      data: { name },
    });
    if (result.count === 0) return null;
    return this.findByIdForUser(id, userId);
  }

  async archive(id: string, userId: string): Promise<ProjectRecord | null> {
    const result = await db.project.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (result.count === 0) return null;
    return db.project
      .findFirst({ where: { id, userId } })
      .then((project) => (project ? toProjectRecord(project) : null));
  }
}
