export const REDESIGN_PHOTO_OPERATION = "REDESIGN_PHOTO" as const;
export const GENERATION_PROMPT_VERSION = "redesign-photo-v1" as const;

export type GenerationReferenceInput = {
  assetId: string;
  role: "STYLE" | "FURNITURE" | "MATERIAL";
};

export type CreateGenerationInput = {
  userId: string;
  projectId: string;
  sourceAssetId: string;
  roomType: string;
  styleCode: string;
  styleVersion: string;
  wishes?: string;
  immutableInstructions?: string;
  requestedVariants: number;
  references?: GenerationReferenceInput[];
};

export type GenerationRecord = {
  id: string;
  userId: string;
  projectId: string;
  sourceAssetId: string;
  requestedVariants: number;
  status: "QUEUED";
  creditReservationId: string;
  promptVersion: string;
};

export type GenerationCreationFailure = { reason: "NOT_FOUND" };

export interface GenerationRepository {
  createQueued(
    input: CreateGenerationInput & { id: string; creditReservationId: string },
  ): Promise<GenerationRecord | GenerationCreationFailure | null>;
}
