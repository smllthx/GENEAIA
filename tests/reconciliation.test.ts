import { describe, expect, it } from "vitest";
import { scoreReconciliation } from "../lib/automation/reconciliation";

describe("reconciliation scoring", () => {
  it("suggests a close match without requiring a rigid hash", () => {
    const result = scoreReconciliation(
      { amount: "-38490.00", date: "2026-07-05", merchant: "Supermercado Jumbo", accountId: "account-1", currency: "CLP" },
      { id: "tx-1", amount: "-38490", date: "2026-07-06", merchant: "Jumbo", account_id: "account-1", currency: "CLP" }
    );

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.matched).toContain("amount");
    expect(result.matched).toContain("date");
  });

  it("raises confidence when the bank reference matches", () => {
    const result = scoreReconciliation(
      { amount: "-10000", date: "2026-07-05", merchant: "Metro", reference: "ABC123" },
      { id: "tx-2", amount: "-10000.00", date: "2026-07-05", merchant: "Metro", account_id: "account-1", external_transaction_id: "bank:ABC123" }
    );

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.matched).toContain("reference");
  });
});
