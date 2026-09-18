import {
  type CreditLedger,
  PROMO_SIGNUP_IDEMPOTENCY_PREFIX,
  SIGNUP_PROMO_CREDITS,
} from "./ledger";

export async function grantSignupPromo(
  ledger: CreditLedger,
  userId: string,
): Promise<boolean> {
  return ledger.appendIfAbsent({
    userId,
    type: "PROMO_GRANT",
    amountSigned: SIGNUP_PROMO_CREDITS,
    idempotencyKey: `${PROMO_SIGNUP_IDEMPOTENCY_PREFIX}:${userId}`,
  });
}

export function getCreditBalance(
  ledger: CreditLedger,
  userId: string,
): Promise<number> {
  return ledger.getBalance(userId);
}
