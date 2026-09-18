import { safeParse } from "valibot";
import { projectFormSchema } from "@/4_features/projects";
import { getAuthenticatedUserId } from "@/server/auth/session";
import {
  archiveProject,
  getProject,
  renameProject,
} from "@/server/core/projects";
import { PrismaProjectRepository } from "@/server/infrastructure/db/project-repository";

const repository = new PrismaProjectRepository();
type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });
  const project = await getProject(
    repository,
    (await params).projectId,
    userId,
  );
  return project
    ? Response.json({ project })
    : Response.json({ error: "Проект не найден" }, { status: 404 });
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });
  const parsed = safeParse(projectFormSchema, await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Проверьте данные проекта" },
      { status: 400 },
    );
  const project = await renameProject(
    repository,
    (await params).projectId,
    userId,
    parsed.output.name,
  );
  return project
    ? Response.json({ project })
    : Response.json({ error: "Проект не найден" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });
  const project = await archiveProject(
    repository,
    (await params).projectId,
    userId,
  );
  return project
    ? Response.json({ project })
    : Response.json({ error: "Проект не найден" }, { status: 404 });
}
