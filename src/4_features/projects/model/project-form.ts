import * as v from "valibot";

export const projectFormSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Введите название проекта"),
    v.maxLength(120),
  ),
  defaultRoomType: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
});

export type ProjectFormInput = v.InferInput<typeof projectFormSchema>;
