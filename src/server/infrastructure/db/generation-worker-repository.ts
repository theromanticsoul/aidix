import { Prisma } from "@prisma/client";
import { serverEnv } from "@/server/config/env/server";
import type {
  GenerationWorkerRepository,
  PendingGenerationVariant,
  RunningGenerationVariant,
} from "@/server/core/generation";
import { compileRedesignPrompt } from "@/server/core/generation";
import { db } from "./client";

function generationStatus(
  statuses: Array<
    "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED_RETRYABLE" | "FAILED_TERMINAL"
  >,
) {
  const succeeded = statuses.filter((status) => status === "SUCCEEDED").length;
  const active = statuses.some(
    (status) =>
      status === "PENDING" ||
      status === "RUNNING" ||
      status === "FAILED_RETRYABLE",
  );
  if (active) return succeeded > 0 ? "RUNNING" : "RUNNING";
  if (succeeded === statuses.length) return "SUCCEEDED";
  if (succeeded > 0) return "PARTIAL";
  return "FAILED";
}

export class PrismaGenerationWorkerRepository
  implements GenerationWorkerRepository
{
  async claimPending(): Promise<PendingGenerationVariant | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await db.$transaction(
          async (transaction) => {
            const candidate = await transaction.generationVariant.findFirst({
              where: { status: "PENDING" },
              orderBy: { createdAt: "asc" },
              include: {
                generation: { include: { source: true } },
              },
            });
            if (!candidate) return null;

            const claimed = await transaction.generationVariant.updateMany({
              where: { id: candidate.id, status: "PENDING" },
              data: { status: "RUNNING" },
            });
            if (claimed.count !== 1) return null;
            await transaction.generation.update({
              where: { id: candidate.generationId },
              data: { status: "RUNNING" },
            });
            return {
              variantId: candidate.id,
              generationId: candidate.generationId,
              sourceStorageKey: candidate.generation.source.storageKey,
              prompt: compileRedesignPrompt({
                userId: candidate.generation.userId,
                projectId: candidate.generation.projectId,
                sourceAssetId: candidate.generation.sourceAssetId,
                roomType: candidate.generation.roomType,
                styleCode: candidate.generation.styleCode,
                styleVersion: candidate.generation.styleVersion,
                wishes: candidate.generation.wishes ?? undefined,
                immutableInstructions:
                  candidate.generation.immutableInstructions ?? undefined,
                requestedVariants: candidate.generation.requestedVariants,
              }),
              callbackUrl: `${serverEnv.APP_URL}/api/generations/callback`,
            } satisfies PendingGenerationVariant;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < 2
        )
          continue;
        throw error;
      }
    }
    return null;
  }

  async markSubmitted(input: {
    variantId: string;
    providerTaskId: string;
    provider: "kie";
    model: string;
  }): Promise<void> {
    await db.generationVariant.updateMany({
      where: { id: input.variantId, status: "RUNNING" },
      data: {
        providerTaskId: input.providerTaskId,
        provider: input.provider,
        model: input.model,
      },
    });
  }

  async claimRunning(): Promise<RunningGenerationVariant | null> {
    const variant = await db.generationVariant.findFirst({
      where: { status: "RUNNING", providerTaskId: { not: null } },
      orderBy: { updatedAt: "asc" },
      select: { id: true, generationId: true, providerTaskId: true },
    });
    if (!variant?.providerTaskId) return null;
    return {
      variantId: variant.id,
      generationId: variant.generationId,
      providerTaskId: variant.providerTaskId,
    };
  }

  async completeVariant(input: {
    variantId: string;
    generationId: string;
    output: {
      storageKey: string;
      mime: string;
      width: number;
      height: number;
      bytes: number;
      checksum: string;
    };
  }): Promise<void> {
    await db.$transaction(async (transaction) => {
      const current = await transaction.generationVariant.findFirst({
        where: { id: input.variantId, status: "RUNNING" },
        select: { id: true },
      });
      if (!current) return;
      const generation = await transaction.generation.findUniqueOrThrow({
        where: { id: input.generationId },
        select: { userId: true, projectId: true },
      });
      const output = await transaction.asset.create({
        data: {
          userId: generation.userId,
          projectId: generation.projectId,
          kind: "GENERATED",
          ...input.output,
        },
      });
      await transaction.generationVariant.updateMany({
        where: { id: input.variantId, status: "RUNNING" },
        data: { status: "SUCCEEDED", outputAssetId: output.id },
      });
      await this.refreshGenerationStatus(transaction, input.generationId);
    });
  }

  async failVariant(input: {
    variantId: string;
    generationId: string;
    errorCode: string;
    retryable: boolean;
  }): Promise<void> {
    await db.$transaction(async (transaction) => {
      const status = input.retryable ? "FAILED_RETRYABLE" : "FAILED_TERMINAL";
      const updated = await transaction.generationVariant.updateMany({
        where: {
          id: input.variantId,
          status: { in: ["RUNNING", "FAILED_RETRYABLE"] },
        },
        data: { status, errorCode: input.errorCode },
      });
      if (updated.count !== 1 || input.retryable) return;
      const generation = await transaction.generation.findUniqueOrThrow({
        where: { id: input.generationId },
        select: { userId: true },
      });
      await transaction.creditLedgerEntry.create({
        data: {
          userId: generation.userId,
          type: "GENERATION_REFUND",
          amountSigned: 1,
          generationId: input.generationId,
          idempotencyKey: `GENERATION_REFUND:${input.variantId}`,
        },
      });
      await this.refreshGenerationStatus(transaction, input.generationId);
    });
  }

  private async refreshGenerationStatus(
    transaction: Prisma.TransactionClient,
    generationId: string,
  ) {
    const variants = await transaction.generationVariant.findMany({
      where: { generationId },
      select: { status: true },
    });
    await transaction.generation.update({
      where: { id: generationId },
      data: {
        status: generationStatus(variants.map((variant) => variant.status)),
      },
    });
  }
}
