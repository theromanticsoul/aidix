import { Prisma } from "@prisma/client";
import { calculateGenerationCost } from "@/server/core/credits";
import type { GenerationRepository } from "@/server/core/generation";
import {
  GENERATION_PROMPT_VERSION,
  REDESIGN_PHOTO_OPERATION,
} from "@/server/core/generation";
import { db } from "./client";

export class PrismaGenerationRepository implements GenerationRepository {
  async createQueued(
    input: Parameters<GenerationRepository["createQueued"]>[0],
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await db.$transaction(
          async (transaction) => {
            const project = await transaction.project.findFirst({
              where: {
                id: input.projectId,
                userId: input.userId,
                archivedAt: null,
              },
              select: { id: true },
            });
            const source = await transaction.asset.findFirst({
              where: {
                id: input.sourceAssetId,
                userId: input.userId,
                projectId: input.projectId,
                deletedAt: null,
              },
              select: { id: true },
            });
            if (!project || !source) return { reason: "NOT_FOUND" as const };

            const balance = await transaction.creditLedgerEntry.aggregate({
              where: { userId: input.userId },
              _sum: { amountSigned: true },
            });
            const cost = calculateGenerationCost(input.requestedVariants);
            if ((balance._sum.amountSigned ?? 0) < cost) return null;

            const generation = await transaction.generation.create({
              data: {
                id: input.id,
                userId: input.userId,
                projectId: input.projectId,
                sourceAssetId: input.sourceAssetId,
                operation: REDESIGN_PHOTO_OPERATION,
                roomType: input.roomType,
                styleCode: input.styleCode,
                styleVersion: input.styleVersion,
                wishes: input.wishes?.trim() || null,
                immutableInstructions:
                  input.immutableInstructions?.trim() || null,
                requestedVariants: input.requestedVariants,
                status: "QUEUED",
                promptVersion: GENERATION_PROMPT_VERSION,
                creditReservationId: input.creditReservationId,
                variants: {
                  create: Array.from(
                    { length: input.requestedVariants },
                    (_, index) => ({
                      index,
                      status: "PENDING" as const,
                    }),
                  ),
                },
              },
            });

            await transaction.creditLedgerEntry.create({
              data: {
                userId: input.userId,
                type: "GENERATION_CHARGE",
                amountSigned: -cost,
                generationId: input.id,
                idempotencyKey: input.creditReservationId,
              },
            });

            return {
              id: generation.id,
              userId: generation.userId,
              projectId: generation.projectId,
              sourceAssetId: generation.sourceAssetId,
              requestedVariants: generation.requestedVariants,
              status: "QUEUED" as const,
              creditReservationId: generation.creditReservationId,
              promptVersion: generation.promptVersion,
            };
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
}
