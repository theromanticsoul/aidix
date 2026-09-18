import type {
  CreateProjectInput,
  ProjectRecord,
  ProjectRepository,
} from "./project";

export function createProject(
  repository: ProjectRepository,
  input: CreateProjectInput,
): Promise<ProjectRecord> {
  return repository.create({ ...input, name: input.name.trim() });
}

export function listProjects(
  repository: ProjectRepository,
  userId: string,
): Promise<ProjectRecord[]> {
  return repository.listByUser(userId);
}

export function getProject(
  repository: ProjectRepository,
  id: string,
  userId: string,
): Promise<ProjectRecord | null> {
  return repository.findByIdForUser(id, userId);
}

export function renameProject(
  repository: ProjectRepository,
  id: string,
  userId: string,
  name: string,
): Promise<ProjectRecord | null> {
  return repository.updateName(id, userId, name.trim());
}

export function archiveProject(
  repository: ProjectRepository,
  id: string,
  userId: string,
): Promise<ProjectRecord | null> {
  return repository.archive(id, userId);
}
