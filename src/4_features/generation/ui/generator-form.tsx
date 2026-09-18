"use client";

import { Field, Form, useForm } from "@formisch/react";
import {
  type GenerationFormInput,
  generationFormSchema,
} from "@/4_features/generation";
import { Button } from "@/6_shared/ui";

type SourceAsset = { id: string; url: string };

const roomTypes = [
  ["living_room", "Гостиная"],
  ["bedroom", "Спальня"],
  ["kitchen", "Кухня"],
  ["bathroom", "Ванная"],
  ["kids_room", "Детская"],
  ["home_office", "Кабинет"],
  ["hallway", "Прихожая"],
  ["dining_room", "Столовая"],
  ["studio", "Студия"],
  ["other", "Другое"],
] as const;

const styles = [
  ["modern", "Современный"],
  ["scandinavian", "Скандинавский"],
  ["minimalism", "Минимализм"],
  ["loft", "Лофт"],
  ["japandi", "Japandi"],
  ["neoclassic", "Неоклассика"],
  ["cozy", "Уютный"],
] as const;

export function GeneratorForm({
  projectId,
  initialAssets,
  initialRoomType,
}: {
  projectId: string;
  initialAssets: SourceAsset[];
  initialRoomType?: string | null;
}) {
  const form = useForm({
    schema: generationFormSchema,
    initialInput: {
      sourceAssetId: initialAssets[0]?.id ?? "",
      roomType: initialRoomType ?? "living_room",
      styleCode: "modern",
      wishes: "",
      immutableInstructions: "",
      requestedVariants: "1",
    },
  });

  const submit = async (input: GenerationFormInput) => {
    const response = await fetch(`/api/projects/${projectId}/generations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...input,
        requestedVariants: Number(input.requestedVariants),
        styleVersion: `${input.styleCode}-v1`,
      }),
    });
    if (!response.ok)
      throw new Error("Не удалось поставить генерацию в очередь");
    window.location.reload();
  };

  if (initialAssets.length === 0)
    return (
      <div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8">
        <p className="font-medium text-slate-900">
          Сначала добавьте фото комнаты
        </p>
        <p className="mt-1 text-sm text-slate-500">
          После загрузки здесь появятся настройки будущей визуализации.
        </p>
      </div>
    );

  return (
    <section className="mt-12 rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Новый вариант
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Настройте пространство
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          ИИ сохранит общий ракурс комнаты, но результат остаётся визуальной
          концепцией.
        </p>
      </div>
      <Form
        of={form}
        onSubmit={submit}
        className="mt-8 grid gap-5 sm:grid-cols-2"
      >
        <Field of={form} path={["sourceAssetId"]}>
          {(field) => (
            <label
              className="flex flex-col gap-2 text-sm"
              htmlFor="generation-source"
            >
              Фото комнаты
              <select
                {...field.props}
                id="generation-source"
                value={field.input}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none focus:border-white/60"
              >
                {initialAssets.map((asset, index) => (
                  <option
                    className="text-slate-900"
                    key={asset.id}
                    value={asset.id}
                  >
                    Фото {index + 1}
                  </option>
                ))}
              </select>
              {field.errors?.[0] && (
                <span className="text-xs text-rose-300">{field.errors[0]}</span>
              )}
            </label>
          )}
        </Field>
        <Field of={form} path={["roomType"]}>
          {(field) => (
            <label
              className="flex flex-col gap-2 text-sm"
              htmlFor="generation-room"
            >
              Тип комнаты
              <select
                {...field.props}
                id="generation-room"
                value={field.input}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none focus:border-white/60"
              >
                {roomTypes.map(([value, label]) => (
                  <option className="text-slate-900" key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Field>
        <Field of={form} path={["styleCode"]}>
          {(field) => (
            <label
              className="flex flex-col gap-2 text-sm"
              htmlFor="generation-style"
            >
              Стиль
              <select
                {...field.props}
                id="generation-style"
                value={field.input}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none focus:border-white/60"
              >
                {styles.map(([value, label]) => (
                  <option className="text-slate-900" key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Field>
        <Field of={form} path={["requestedVariants"]}>
          {(field) => (
            <label
              className="flex flex-col gap-2 text-sm"
              htmlFor="generation-count"
            >
              Вариантов
              <select
                {...field.props}
                id="generation-count"
                value={field.input}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none focus:border-white/60"
              >
                {["1", "2", "3", "4"].map((value) => (
                  <option className="text-slate-900" key={value} value={value}>
                    {value} {value === "1" ? "вариант" : "варианта"}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Field>
        <Field of={form} path={["wishes"]}>
          {(field) => (
            <label
              className="flex flex-col gap-2 text-sm sm:col-span-2"
              htmlFor="generation-wishes"
            >
              Пожелания <span className="text-slate-500">необязательно</span>
              <textarea
                {...field.props}
                id="generation-wishes"
                value={field.input ?? ""}
                className="min-h-24 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-white/60"
                placeholder="Например: тёплое дерево, больше света, диван у стены"
              />
            </label>
          )}
        </Field>
        <Field of={form} path={["immutableInstructions"]}>
          {(field) => (
            <label
              className="flex flex-col gap-2 text-sm sm:col-span-2"
              htmlFor="generation-keep"
            >
              Оставить без изменений{" "}
              <span className="text-slate-500">необязательно</span>
              <input
                {...field.props}
                id="generation-keep"
                value={field.input ?? ""}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-white/60"
                placeholder="Например: окна и напольное покрытие"
              />
            </label>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Button
            className="bg-white text-slate-950 hover:bg-slate-200"
            type="submit"
            disabled={form.isSubmitting}
          >
            {form.isSubmitting ? "Ставим в очередь..." : "Создать визуализацию"}
          </Button>
        </div>
      </Form>
    </section>
  );
}
