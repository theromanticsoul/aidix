import { randomUUID } from "node:crypto";
import { calculateGenerationCost } from "@/server/core/credits";
import type {
  CreateGenerationInput,
  GenerationRecord,
  GenerationRepository,
} from "./generation";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
  }
}

export class InvalidGenerationInputError extends Error {
  constructor() {
    super("GENERATION_INPUT_INVALID");
  }
}

export class GenerationSourceNotFoundError extends Error {
  constructor() {
    super("GENERATION_SOURCE_NOT_FOUND");
  }
}

export async function createQueuedGeneration(
  repository: GenerationRepository,
  input: CreateGenerationInput,
): Promise<GenerationRecord> {
  if (
    !Number.isInteger(input.requestedVariants) ||
    input.requestedVariants < 1 ||
    input.requestedVariants > 4 ||
    input.references?.length
  )
    throw new InvalidGenerationInputError();

  const id = randomUUID();
  const creditReservationId = `GENERATION_CHARGE:${id}`;
  const generation = await repository.createQueued({
    ...input,
    id,
    creditReservationId,
  });

  if (!generation) throw new InsufficientCreditsError();
  if ("reason" in generation) {
    throw new GenerationSourceNotFoundError();
  }
  return generation;
}

export function generationCost(input: CreateGenerationInput): number {
  return calculateGenerationCost(input.requestedVariants);
}
