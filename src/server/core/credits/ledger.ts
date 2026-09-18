export const PROMO_SIGNUP_IDEMPOTENCY_PREFIX = "PROMO_SIGNUP_V1";
export const SIGNUP_PROMO_CREDITS = 3;

export type CreditLedgerEntryType =
  | "PROMO_GRANT"
  | "PURCHASE_GRANT"
  | "GENERATION_CHARGE"
  | "GENERATION_REFUND"
  | "MANUAL_ADJUSTMENT"
  | "PAYMENT_REVERSAL";

export type AppendCreditEntryInput = {
  userId: string;
  type: CreditLedgerEntryType;
  amountSigned: number;
  idempotencyKey: string;
  generationId?: string;
  paymentId?: string;
};

export interface CreditLedger {
  appendIfAbsent(input: AppendCreditEntryInput): Promise<boolean>;
  getBalance(userId: string): Promise<number>;
}
