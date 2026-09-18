import { getAuthenticatedUserId } from "@/server/auth/session";
import { uploadProjectImage } from "@/server/core/assets";
import { getProject } from "@/server/core/projects";
import { PrismaAssetRepository } from "@/server/infrastructure/db/asset-repository";
import { PrismaProjectRepository } from "@/server/infrastructure/db/project-repository";
import { S3ObjectStorage } from "@/server/infrastructure/storage/s3";

const projects = new PrismaProjectRepository();
const assets = new PrismaAssetRepository();
const storage = new S3ObjectStorage();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });
  const projectId = (await params).projectId;
  if (!(await getProject(projects, projectId, userId)))
    return Response.json({ error: "Проект не найден" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File))
    return Response.json({ error: "Файл не найден" }, { status: 400 });

  try {
    const asset = await uploadProjectImage(storage, assets, {
      userId,
      projectId,
      body: new Uint8Array(await file.arrayBuffer()),
      declaredMime: file.type,
    });
    const url = await storage.getSignedReadUrl(asset.storageKey, 300);
    return Response.json({ asset: { ...asset, url } }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "IMAGE_INVALID";
    const status =
      code === "IMAGE_SIZE_INVALID" ||
      code === "IMAGE_TYPE_INVALID" ||
      code === "IMAGE_INVALID"
        ? 400
        : 500;
    return Response.json(
      {
        error:
          status === 400
            ? "Поддерживается JPEG, PNG или WebP до 15 МБ"
            : "Не удалось сохранить изображение",
      },
      { status },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });
  const projectId = (await params).projectId;
  if (!(await getProject(projects, projectId, userId)))
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  const records = await assets.listByProject(userId, projectId);
  const result = await Promise.all(
    records.map(async (asset) => ({
      ...asset,
      url: await storage.getSignedReadUrl(asset.storageKey, 300),
    })),
  );
  return Response.json({ assets: result });
}
