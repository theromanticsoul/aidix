import { describe, expect, test } from "bun:test";
import {
  type CreateGenerationInput,
  compileRedesignPrompt,
  createQueuedGeneration,
  type GenerationRepository,
  generationCost,
  InsufficientCreditsError,
  InvalidGenerationInputError,
} from "@/server/core/generation";

const input: CreateGenerationInput = {
  userId: "user-1",
  projectId: "project-1",
  sourceAssetId: "asset-1",
  roomType: "living_room",
  styleCode: "japandi",
  styleVersion: "japandi-v1",
  wishes: "More natural light",
  immutableInstructions: "Keep the windows",
  requestedVariants: 2,
};

class FakeGenerationRepository implements GenerationRepository {
  shouldCreate = true;
  received: Parameters<GenerationRepository["createQueued"]>[0] | null = null;

  async createQueued(
    value: Parameters<GenerationRepository["createQueued"]>[0],
  ) {
    this.received = value;
    if (!this.shouldCreate) return null;
    return {
      id: value.id,
      userId: value.userId,
      projectId: value.projectId,
      sourceAssetId: value.sourceAssetId,
      requestedVariants: value.requestedVariants,
      status: "QUEUED" as const,
      creditReservationId: value.creditReservationId,
      promptVersion: "redesign-photo-v1",
    };
  }
}

describe("photo redesign generation", () => {
  test("calculates one credit per requested variant", () => {
    expect(generationCost(input)).toBe(2);
  });

  test("creates a queued generation with an idempotent charge key", async () => {
    const repository = new FakeGenerationRepository();
    const generation = await createQueuedGeneration(repository, input);
    expect(generation.status).toBe("QUEUED");
    expect(repository.received?.creditReservationId).toStartWith(
      "GENERATION_CHARGE:",
    );
    expect(repository.received?.id).toBe(
      repository.received?.creditReservationId?.replace(
        "GENERATION_CHARGE:",
        "",
      ),
    );
  });

  test("rejects more than four variants", async () => {
    await expect(
      createQueuedGeneration(new FakeGenerationRepository(), {
        ...input,
        requestedVariants: 5,
      }),
    ).rejects.toBeInstanceOf(InvalidGenerationInputError);
  });

  test("does not hide an insufficient balance", async () => {
    const repository = new FakeGenerationRepository();
    repository.shouldCreate = false;
    await expect(
      createQueuedGeneration(repository, input),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  test("compiles a prompt with immutable room constraints", () => {
    const prompt = compileRedesignPrompt(input);
    expect(prompt).toContain("Preserve the camera perspective");
    expect(prompt).toContain("Keep unchanged: Keep the windows.");
    expect(prompt).toContain("More natural light");
  });
});
