import { describe, expect, it } from "vitest";
import { parseStatementPages } from "../lib/automation/statement-parser";

describe("statement parser", () => {
  it("extracts a Chilean transaction without losing the raw description", () => {
    const rows = parseStatementPages([
      { num: 2, text: "05/07/2026 SUPERMERCADO JUMBO 38.490\ntexto sin movimiento" }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      transactionDate: "2026-07-05",
      rawDescription: "SUPERMERCADO JUMBO",
      debit: "38490",
      page: 2
    });
  });

  it("ignores lines with invalid dates", () => {
    expect(parseStatementPages([{ num: 1, text: "40/19/2026 COMPRA 12.000" }])).toEqual([]);
  });
});
