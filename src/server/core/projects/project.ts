export type ProjectRecord = {
  id: string;
  userId: string;
  name: string;
  defaultRoomType: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectInput = {
  userId: string;
  name: string;
  defaultRoomType?: string;
};

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<ProjectRecord>;
  listByUser(userId: string): Promise<ProjectRecord[]>;
  findByIdForUser(id: string, userId: string): Promise<ProjectRecord | null>;
  updateName(
    id: string,
    userId: string,
    name: string,
  ): Promise<ProjectRecord | null>;
  archive(id: string, userId: string): Promise<ProjectRecord | null>;
}
