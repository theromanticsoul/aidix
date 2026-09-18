export interface CreditReservation {
  reserve(
    userId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<boolean>;
}

export function reserveCredits(
  reservation: CreditReservation,
  userId: string,
  amount: number,
  idempotencyKey: string,
): Promise<boolean> {
  if (!Number.isInteger(amount) || amount < 1)
    throw new RangeError("Credit amount must be a positive integer");
  return reservation.reserve(userId, amount, idempotencyKey);
}
