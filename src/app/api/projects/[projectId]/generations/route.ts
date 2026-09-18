import * as v from "valibot";
import { getAuthenticatedUserId } from "@/server/auth/session";
import {
  createQueuedGeneration,
  GenerationSourceNotFoundError,
  InsufficientCreditsError,
  InvalidGenerationInputError,
} from "@/server/core/generation";
import { PrismaGenerationRepository } from "@/server/infrastructure/db/generation-repository";

const inputSchema = v.object({
  sourceAssetId: v.pipe(v.string(), v.minLength(1)),
  roomType: v.pipe(v.string(), v.minLength(1)),
  styleCode: v.pipe(v.string(), v.minLength(1)),
  styleVersion: v.pipe(v.string(), v.minLength(1)),
  wishes: v.optional(v.string()),
  immutableInstructions: v.optional(v.string()),
  requestedVariants: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1),
    v.maxValue(4),
  ),
});

const generations = new PrismaGenerationRepository();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = v.safeParse(inputSchema, body);
  if (!parsed.success)
    return Response.json(
      { error: "Некорректные параметры генерации" },
      { status: 400 },
    );

  try {
    const generation = await createQueuedGeneration(generations, {
      ...parsed.output,
      userId,
      projectId: (await params).projectId,
    });
    return Response.json({ generation }, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientCreditsError)
      return Response.json({ error: "Недостаточно credits" }, { status: 402 });
    if (error instanceof InvalidGenerationInputError)
      return Response.json(
        { error: "Некорректные параметры генерации" },
        { status: 400 },
      );
    if (error instanceof GenerationSourceNotFoundError)
      return Response.json(
        { error: "Проект или исходное изображение не найдено" },
        { status: 404 },
      );
    return Response.json(
      { error: "Не удалось поставить генерацию в очередь" },
      { status: 500 },
    );
  }
}
