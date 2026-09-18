import Link from "next/link";
import { notFound } from "next/navigation";
import { GeneratorForm } from "@/4_features/generation/ui/generator-form";
import { ProjectActions } from "@/4_features/projects/ui/project-actions";
import { SourcePhotoUpload } from "@/4_features/projects/ui/source-photo-upload";
import { getAuthenticatedUserId } from "@/server/auth/session";
import { getProject } from "@/server/core/projects";
import { PrismaAssetRepository } from "@/server/infrastructure/db/asset-repository";
import { PrismaProjectRepository } from "@/server/infrastructure/db/project-repository";
import { S3ObjectStorage } from "@/server/infrastructure/storage/s3";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        Войдите, чтобы открыть проект.
      </main>
    );
  const project = await getProject(
    new PrismaProjectRepository(),
    (await params).projectId,
    userId,
  );
  if (!project) notFound();
  const records = await new PrismaAssetRepository().listByProject(
    userId,
    project.id,
  );
  const storage = new S3ObjectStorage();
  const assets = await Promise.all(
    records.map(async (asset) => ({
      id: asset.id,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      url: await storage.getSignedReadUrl(asset.storageKey, 300),
    })),
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <Link className="text-sm text-slate-500 hover:text-slate-950" href="/app">
        ← Все проекты
      </Link>
      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-slate-500">Проект</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="mt-2 text-slate-500">
              {project.defaultRoomType || "Тип комнаты не выбран"}
            </p>
          </div>
        </div>
        <SourcePhotoUpload projectId={project.id} initialAssets={assets} />
        <GeneratorForm
          projectId={project.id}
          initialAssets={assets}
          initialRoomType={project.defaultRoomType}
        />
        <ProjectActions
          projectId={project.id}
          initialName={project.name}
          initialRoomType={project.defaultRoomType}
        />
      </section>
    </main>
  );
}
