"use client";

import { useState } from "react";
import { ProjectForm } from "./project-form";

export function ProjectActions({
  projectId,
  initialName,
  initialRoomType,
}: {
  projectId: string;
  initialName: string;
  initialRoomType: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    if (!window.confirm("Архивировать этот проект?")) return;
    setIsArchiving(true);
    setError(null);
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Не удалось архивировать проект");
      setIsArchiving(false);
      return;
    }
    window.location.assign("/app");
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          type="button"
          onClick={() => setIsEditing((value) => !value)}
        >
          {isEditing ? "Отменить редактирование" : "Изменить проект"}
        </button>
        <button
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          type="button"
          disabled={isArchiving}
          onClick={() => void archive()}
        >
          {isArchiving ? "Архивируем..." : "Архивировать"}
        </button>
      </div>
      {isEditing && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <ProjectForm
            projectId={projectId}
            initialInput={{
              name: initialName,
              defaultRoomType: initialRoomType ?? "",
            }}
            submitLabel="Сохранить изменения"
            onSuccess={() => window.location.reload()}
          />
        </div>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
