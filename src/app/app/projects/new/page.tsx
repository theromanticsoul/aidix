import Link from "next/link";
import { ProjectForm } from "@/4_features/projects/ui/project-form";

export default function NewProjectPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link className="text-xl font-semibold" href="/app">
        AIDIX
      </Link>
      <section className="mt-20">
        <p className="text-sm text-slate-500">Новый проект</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Опишите комнату
        </h1>
        <p className="mt-4 max-w-xl text-slate-600">
          Позже сюда можно будет добавить фотографию и настройки визуализации.
        </p>
        <div className="mt-10">
          <ProjectForm />
        </div>
      </section>
    </main>
  );
}
