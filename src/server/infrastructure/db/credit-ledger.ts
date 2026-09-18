import { Prisma } from "@prisma/client";
import type {
  AppendCreditEntryInput,
  CreditLedger,
  CreditReservation,
} from "@/server/core/credits";
import { db } from "./client";

export class PrismaCreditLedger implements CreditLedger, CreditReservation {
  async appendIfAbsent(input: AppendCreditEntryInput): Promise<boolean> {
    try {
      await db.creditLedgerEntry.create({
        data: {
          userId: input.userId,
          type: input.type,
          amountSigned: input.amountSigned,
          idempotencyKey: input.idempotencyKey,
          generationId: input.generationId,
          paymentId: input.paymentId,
        },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return false;
      throw error;
    }
  }

  async getBalance(userId: string): Promise<number> {
    const result = await db.creditLedgerEntry.aggregate({
      where: { userId },
      _sum: { amountSigned: true },
    });
    return result._sum.amountSigned ?? 0;
  }

  async reserve(
    userId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await db.$transaction(
          async (transaction) => {
            const existing = await transaction.creditLedgerEntry.findUnique({
              where: { idempotencyKey },
            });
            if (existing) return true;
            const balance = await transaction.creditLedgerEntry.aggregate({
              where: { userId },
              _sum: { amountSigned: true },
            });
            if ((balance._sum.amountSigned ?? 0) < amount) return false;
            await transaction.creditLedgerEntry.create({
              data: {
                userId,
                type: "GENERATION_CHARGE",
                amountSigned: -amount,
                idempotencyKey,
              },
            });
            return true;
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
    return false;
  }
}
