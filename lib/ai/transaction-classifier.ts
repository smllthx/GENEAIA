export type TransactionDirection = "expense" | "income";

export type TransactionClassification = {
  direction: TransactionDirection;
  category: string;
  confidence: number;
  signedAmount: number;
};

const categorySignals: Array<{ category: string; signals: string[] }> = [
  { category: "Alimentación", signals: ["jumbo", "lider", "unimarc", "tottus", "supermercado", "restaurant", "restaurante", "cafe", "starbucks", "delivery", "rappi", "uber eats"] },
  { category: "Transporte", signals: ["uber", "cabify", "metro", "bip", "copec", "shell", "bencina", "combustible", "estacionamiento", "peaje"] },
  { category: "Hogar", signals: ["arriendo", "hipoteca", "enel", "aguas", "gasco", "electricidad", "internet", "movistar", "entel", "wom"] },
  { category: "Suscripciones", signals: ["netflix", "spotify", "icloud", "apple.com/bill", "google one", "disney", "hbo", "prime video", "suscripcion"] },
  { category: "Salud", signals: ["farmacia", "cruz verde", "salcobrand", "ahumada", "clinica", "medico", "dental", "isapre", "fonasa"] },
  { category: "Educación", signals: ["universidad", "instituto", "colegio", "matricula", "curso", "libreria"] },
  { category: "Mascotas", signals: ["veterinaria", "mascota", "pet shop", "petshop", "carlino"] },
  { category: "Compras", signals: ["falabella", "paris", "ripley", "mercadolibre", "mercado libre", "amazon", "retail"] },
  { category: "Ocio", signals: ["cine", "cinemark", "cinepolis", "juego", "steam", "concierto", "ticket"] },
  { category: "Transferencias", signals: ["transferencia", "traspaso", "pago recibido", "envio de dinero"] },
  { category: "Ingresos", signals: ["sueldo", "remuneracion", "honorario", "abono", "deposito", "devolucion", "reembolso"] }
];

const incomeSignals = [
  "abono",
  "deposito",
  "transferencia recibida",
  "pago recibido",
  "sueldo",
  "remuneracion",
  "honorario",
  "reembolso",
  "devolucion",
  "acreditado"
];

const expenseSignals = [
  "cargo",
  "compra",
  "pago realizado",
  "debito",
  "retiro",
  "comision",
  "cobro",
  "facturacion"
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyTransaction({
  text,
  amount,
  directionHint
}: {
  text: string;
  amount: number;
  directionHint?: TransactionDirection | null;
}): TransactionClassification {
  const source = normalize(text);
  const incomeScore = incomeSignals.filter((signal) => source.includes(signal)).length;
  const expenseScore = expenseSignals.filter((signal) => source.includes(signal)).length;
  const direction = directionHint ?? (incomeScore > expenseScore ? "income" : expenseScore > incomeScore ? "expense" : amount > 0 ? "income" : "expense");

  const ranked = categorySignals
    .map((item) => ({ ...item, score: item.signals.filter((signal) => source.includes(signal)).length }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const category = direction === "income" && (!best || best.score === 0) ? "Ingresos" : best?.score ? best.category : "Otros";
  const directionEvidence = Math.max(incomeScore, expenseScore);
  const confidence = Math.min(0.98, 0.64 + (best?.score ?? 0) * 0.11 + directionEvidence * 0.08);

  return {
    direction,
    category,
    confidence: Number(confidence.toFixed(2)),
    signedAmount: direction === "income" ? Math.abs(amount) : -Math.abs(amount)
  };
}

