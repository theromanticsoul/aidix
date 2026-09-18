"use client";

import { Field, Form, useForm } from "@formisch/react";
import {
  type ProjectFormInput,
  projectFormSchema,
} from "@/4_features/projects";
import { Button, Input } from "@/6_shared/ui";

export function ProjectForm({
  projectId,
  initialInput = { name: "", defaultRoomType: "" },
  submitLabel = "Создать проект",
  onSuccess,
}: {
  projectId?: string;
  initialInput?: ProjectFormInput;
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const form = useForm({
    schema: projectFormSchema,
    initialInput,
  });

  const submit = async (input: ProjectFormInput) => {
    const response = await fetch(
      projectId ? `/api/projects/${projectId}` : "/api/projects",
      {
        method: projectId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) throw new Error("Не удалось создать проект");
    const { project } = (await response.json()) as { project: { id: string } };
    if (onSuccess) onSuccess();
    else window.location.assign(`/app/projects/${project.id}`);
  };

  return (
    <Form of={form} onSubmit={submit} className="flex max-w-xl flex-col gap-6">
      <Field of={form} path={["name"]}>
        {(field) => (
          <label
            className="flex flex-col gap-2 text-sm font-medium text-slate-700"
            htmlFor="project-name"
          >
            Название проекта
            <Input
              {...field.props}
              id="project-name"
              value={field.input}
              placeholder="Например, Гостиная"
              aria-invalid={field.errors ? true : undefined}
            />
            {field.errors?.[0] && (
              <span className="text-sm font-normal text-red-600">
                {field.errors[0]}
              </span>
            )}
          </label>
        )}
      </Field>
      <Field of={form} path={["defaultRoomType"]}>
        {(field) => (
          <label
            className="flex flex-col gap-2 text-sm font-medium text-slate-700"
            htmlFor="project-room-type"
          >
            Тип комнаты{" "}
            <span className="font-normal text-slate-400">необязательно</span>
            <Input
              {...field.props}
              id="project-room-type"
              value={field.input ?? ""}
              placeholder="Например, спальня"
            />
          </label>
        )}
      </Field>
      <div>
        <Button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? "Сохраняем..." : submitLabel}
        </Button>
      </div>
    </Form>
  );
}
