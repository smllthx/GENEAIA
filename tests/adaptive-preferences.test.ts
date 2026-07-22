import { describe, expect, it } from "vitest";
import { defaultAdaptivePreferences, sanitizeAdaptivePreferences } from "../lib/adaptive-preferences";

describe("adaptive preferences", () => {
  it("migrates a stored legacy navigation order to the five finance domains", () => {
    const preferences = sanitizeAdaptivePreferences({
      ...defaultAdaptivePreferences,
      tabOrder: ["inicio", "automatizacion", "movimientos", "presupuesto", "ia"]
    });

    expect(preferences.tabOrder).toEqual(["inicio", "movimientos", "suscripciones", "presupuesto", "cuentas"]);
  });

  it("keeps a valid personal order", () => {
    const order = ["cuentas", "inicio", "movimientos", "presupuesto", "suscripciones"];
    const preferences = sanitizeAdaptivePreferences({ ...defaultAdaptivePreferences, profile: "personal", tabOrder: order });

    expect(preferences.tabOrder).toEqual(order);
  });
});
