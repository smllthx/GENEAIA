import { describe, expect, it } from "vitest";
import { classifyTransaction } from "../lib/ai/transaction-classifier";

describe("transaction classifier", () => {
  it("marks a card purchase as a negative expense and categorizes it", () => {
    const result = classifyTransaction({
      text: "Cargo por compra en Supermercado Jumbo",
      amount: 52390
    });

    expect(result.direction).toBe("expense");
    expect(result.signedAmount).toBe(-52390);
    expect(result.category).toBe("Alimentación");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("marks an incoming salary as a positive income", () => {
    const result = classifyTransaction({
      text: "Abono de remuneración mensual",
      amount: -980000
    });

    expect(result.direction).toBe("income");
    expect(result.signedAmount).toBe(980000);
    expect(result.category).toBe("Ingresos");
  });

  it("uses an explicit provider direction when the description is ambiguous", () => {
    const result = classifyTransaction({
      text: "Movimiento cuenta corriente",
      amount: 12000,
      directionHint: "expense"
    });

    expect(result.signedAmount).toBe(-12000);
    expect(result.category).toBe("Otros");
  });
});
