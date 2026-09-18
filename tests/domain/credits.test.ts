import { describe, expect, test } from "bun:test";
import {
  type AppendCreditEntryInput,
  type CreditLedger,
  getCreditBalance,
  grantSignupPromo,
} from "@/server/core/credits";

class FakeCreditLedger implements CreditLedger {
  readonly entries: AppendCreditEntryInput[] = [];

  async appendIfAbsent(input: AppendCreditEntryInput): Promise<boolean> {
    if (
      this.entries.some(
        (entry) => entry.idempotencyKey === input.idempotencyKey,
      )
    )
      return false;
    this.entries.push(input);
    return true;
  }

  async getBalance(userId: string): Promise<number> {
    return this.entries
      .filter((entry) => entry.userId === userId)
      .reduce((balance, entry) => balance + entry.amountSigned, 0);
  }
}

describe("signup credits", () => {
  test("grants exactly three credits once", async () => {
    const ledger = new FakeCreditLedger();
    expect(await grantSignupPromo(ledger, "user-1")).toBe(true);
    expect(await grantSignupPromo(ledger, "user-1")).toBe(false);
    expect(await getCreditBalance(ledger, "user-1")).toBe(3);
    expect(ledger.entries).toHaveLength(1);
  });

  test("keeps balances isolated by user", async () => {
    const ledger = new FakeCreditLedger();
    await grantSignupPromo(ledger, "user-1");
    await grantSignupPromo(ledger, "user-2");
    expect(await getCreditBalance(ledger, "user-1")).toBe(3);
    expect(await getCreditBalance(ledger, "user-2")).toBe(3);
  });
});
