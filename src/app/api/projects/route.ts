import { safeParse } from "valibot";
import { projectFormSchema } from "@/4_features/projects";
import { getAuthenticatedUserId } from "@/server/auth/session";
import { createProject, listProjects } from "@/server/core/projects";
import { PrismaProjectRepository } from "@/server/infrastructure/db/project-repository";

const repository = new PrismaProjectRepository();

export async function GET(): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });
  return Response.json({ projects: await listProjects(repository, userId) });
}

export async function POST(request: Request): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });

  const parsed = safeParse(projectFormSchema, await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Проверьте данные проекта" },
      { status: 400 },
    );

  const project = await createProject(repository, { userId, ...parsed.output });
  return Response.json({ project }, { status: 201 });
}
