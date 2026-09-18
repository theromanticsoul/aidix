import * as v from "valibot";

export const generationFormSchema = v.object({
  sourceAssetId: v.pipe(v.string(), v.minLength(1, "Выберите фотографию")),
  roomType: v.pipe(v.string(), v.minLength(1, "Выберите тип комнаты")),
  styleCode: v.pipe(v.string(), v.minLength(1, "Выберите стиль")),
  wishes: v.optional(v.pipe(v.string(), v.maxLength(1000))),
  immutableInstructions: v.optional(v.pipe(v.string(), v.maxLength(500))),
  requestedVariants: v.picklist(["1", "2", "3", "4"]),
});

export type GenerationFormInput = v.InferInput<typeof generationFormSchema>;
