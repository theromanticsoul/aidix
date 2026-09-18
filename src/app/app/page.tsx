import Link from "next/link";
import { getAuthenticatedUserId } from "@/server/auth/session";
import { listProjects } from "@/server/core/projects";
import { PrismaProjectRepository } from "@/server/infrastructure/db/project-repository";

export default async function DashboardPage() {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        Войдите, чтобы открыть приложение.
      </main>
    );
  const projects = await listProjects(new PrismaProjectRepository(), userId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <Link className="text-xl font-semibold" href="/">
          AIDIX
        </Link>
        <span className="text-sm text-slate-500">
          3 бесплатные генерации для нового аккаунта
        </span>
      </header>
      <section className="mt-20 flex items-end justify-between gap-6">
        <div>
          <p className="text-sm text-slate-500">Рабочее пространство</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Мои проекты
          </h1>
        </div>
        <Link
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
          href="/app/projects/new"
        >
          Новый проект
        </Link>
      </section>
      {projects.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <h2 className="text-xl font-medium">Начните с комнаты</h2>
          <p className="mt-2 text-slate-500">
            Создайте проект, чтобы загрузить фотографию интерьера.
          </p>
        </div>
      ) : (
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-950"
              href={`/app/projects/${project.id}`}
              key={project.id}
            >
              <p className="font-medium">{project.name}</p>
              <p className="mt-2 text-sm text-slate-500">
                {project.defaultRoomType || "Тип комнаты не выбран"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
