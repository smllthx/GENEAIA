export const tabLabels: Record<string, string> = {
  inicio: "Inicio",
  movimientos: "Movimientos",
  suscripciones: "Suscripciones",
  presupuesto: "Presupuestos",
  cuentas: "Cuentas"
};

export const sectionLabels: Record<string, string> = {
  resumen: "Resumen mensual",
  presupuesto: "Presupuesto",
  tendencia: "Tendencia",
  categorias: "Categorias"
};

export type AdaptivePreferences = {
  profile: "auto" | "tea" | "tdah" | "personal";
  theme: "auto" | "light" | "dark";
  textSize: "normal" | "large";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  highContrast: boolean;
  tabOrder: string[];
  sectionOrder: string[];
  hiddenSections: string[];
};

export const defaultAdaptivePreferences: AdaptivePreferences = {
  profile: "auto",
  theme: "auto",
  textSize: "normal",
  density: "comfortable",
  reduceMotion: false,
  highContrast: false,
  tabOrder: ["inicio", "movimientos", "suscripciones", "presupuesto", "cuentas"],
  sectionOrder: ["resumen", "presupuesto", "tendencia", "categorias"],
  hiddenSections: []
};

const validProfiles = new Set(["auto", "tea", "tdah", "personal"]);
const validThemes = new Set(["auto", "light", "dark"]);

function validOrder(value: unknown, expected: string[]) {
  if (!Array.isArray(value) || value.length !== expected.length) return expected;
  const unique = [...new Set(value.filter((item): item is string => typeof item === "string"))];
  return unique.length === expected.length && expected.every((item) => unique.includes(item)) ? unique : expected;
}

export function sanitizeAdaptivePreferences(value: unknown): AdaptivePreferences {
  const candidate = value && typeof value === "object" ? value as Partial<AdaptivePreferences> : {};
  const profile = validProfiles.has(candidate.profile ?? "") ? candidate.profile! : defaultAdaptivePreferences.profile;
  const theme = validThemes.has(candidate.theme ?? "") ? candidate.theme! : defaultAdaptivePreferences.theme;
  const hiddenSections = Array.isArray(candidate.hiddenSections)
    ? candidate.hiddenSections.filter((item): item is string => typeof item === "string" && item in sectionLabels)
    : [];

  return {
    profile,
    theme,
    textSize: candidate.textSize === "large" ? "large" : "normal",
    density: candidate.density === "compact" ? "compact" : "comfortable",
    reduceMotion: Boolean(candidate.reduceMotion),
    highContrast: Boolean(candidate.highContrast),
    tabOrder: validOrder(candidate.tabOrder, defaultAdaptivePreferences.tabOrder),
    sectionOrder: validOrder(candidate.sectionOrder, defaultAdaptivePreferences.sectionOrder),
    hiddenSections: [...new Set(hiddenSections)]
  };
}
