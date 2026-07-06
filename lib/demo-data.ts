import type {
  Account,
  AIInsight,
  BalancePoint,
  Budget,
  CategoryPoint,
  Debt,
  Goal,
  HeatmapDay,
  Subscription,
  Transaction,
  UserProfile
} from "@/lib/types";

export const demoUser: UserProfile = {
  id: "demo-user",
  email: "demo@wallet.ai",
  name: "Rodrigo",
  currency: "CLP",
  created_at: "2026-06-01T10:00:00.000Z"
};

export const demoAccounts: Account[] = [
  {
    id: "acc-bchile",
    user_id: demoUser.id,
    name: "Cuenta Corriente",
    institution: "Banco de Chile",
    type: "checking",
    balance: 842000,
    currency: "CLP",
    color: "from-sky-500 to-blue-700",
    icon: "🏦",
    is_manual: false,
    is_hidden: false,
    exclude_from_total: false,
    variation: 5.8,
    last_update: "Hoy 09:42",
    created_at: "2026-06-01T10:00:00.000Z"
  },
  {
    id: "acc-santander",
    user_id: demoUser.id,
    name: "Tarjeta Crédito",
    institution: "Santander",
    type: "credit",
    balance: -236500,
    currency: "CLP",
    color: "from-rose-500 to-red-700",
    icon: "💳",
    is_manual: false,
    is_hidden: false,
    exclude_from_total: false,
    variation: -12.4,
    last_update: "Ayer 22:10",
    created_at: "2026-06-01T10:00:00.000Z"
  },
  {
    id: "acc-mp",
    user_id: demoUser.id,
    name: "Billetera Digital",
    institution: "Mercado Pago",
    type: "digital_wallet",
    balance: 96500,
    currency: "CLP",
    color: "from-cyan-400 to-sky-600",
    icon: "📲",
    is_manual: false,
    is_hidden: false,
    exclude_from_total: false,
    variation: 2.1,
    last_update: "Hoy 08:12",
    created_at: "2026-06-01T10:00:00.000Z"
  },
  {
    id: "acc-cash",
    user_id: demoUser.id,
    name: "Efectivo",
    institution: "Manual",
    type: "cash",
    balance: 42000,
    currency: "CLP",
    color: "from-emerald-400 to-green-700",
    icon: "💵",
    is_manual: true,
    is_hidden: false,
    exclude_from_total: false,
    variation: -4.2,
    last_update: "Manual",
    created_at: "2026-06-01T10:00:00.000Z"
  },
  {
    id: "acc-save",
    user_id: demoUser.id,
    name: "Cuenta Ahorro",
    institution: "Banco de Chile",
    type: "savings",
    balance: 1380000,
    currency: "CLP",
    color: "from-violet-500 to-indigo-700",
    icon: "🌱",
    is_manual: true,
    is_hidden: false,
    exclude_from_total: false,
    variation: 9.4,
    last_update: "Hoy 09:42",
    created_at: "2026-06-01T10:00:00.000Z"
  }
];

export const demoTransactions: Transaction[] = [
  ["tx-1", "Uber", -8400, "Transporte", "Viaje a universidad", "acc-santander", true],
  ["tx-2", "Starbucks", -5200, "Comida", "Café", "acc-bchile", true],
  ["tx-3", "Jumbo", -46500, "Comida", "Supermercado", "acc-bchile", true],
  ["tx-4", "Spotify", -4550, "Suscripciones", "Plan individual", "acc-santander", true],
  ["tx-5", "Netflix", -7990, "Suscripciones", "Streaming", "acc-santander", true],
  ["tx-6", "Apple iCloud", -2900, "Suscripciones", "Almacenamiento", "acc-mp", true],
  ["tx-7", "Farmacia", -18600, "Salud", "Medicamentos", "acc-bchile", true],
  ["tx-8", "Universidad", -120000, "Estudios", "Cuota mensual", "acc-bchile", false],
  ["tx-9", "Metro", -3200, "Transporte", "Carga Bip", "acc-cash", true],
  ["tx-10", "Comida", -12800, "Comida", "Almuerzo", "acc-mp", true],
  ["tx-11", "Ropa", -34990, "Ocio", "Polera", "acc-santander", false],
  ["tx-12", "Salud", -26000, "Salud", "Consulta", "acc-bchile", false],
  ["tx-13", "Mascota", -15900, "Mascota", "Alimento Carlino", "acc-mp", true],
  ["tx-14", "Carlino", -8800, "Mascota", "Snack y juguete", "acc-mp", true],
  ["tx-15", "Peluquería", -22000, "Ocio", "Corte mensual", "acc-santander", true],
  ["tx-16", "Compras online", -38990, "Ocio", "Accesorios", "acc-santander", true],
  ["tx-17", "Ingreso freelance", 280000, "Ingresos", "Pago proyecto", "acc-bchile", false]
].map(([id, merchant, amount, category, description, accountId, ai], index) => ({
  id: String(id),
  user_id: demoUser.id,
  account_id: String(accountId),
  merchant: String(merchant),
  amount: Number(amount),
  date: `2026-06-${String(15 - Math.min(index, 13)).padStart(2, "0")}`,
  category: String(category),
  description: String(description),
  is_recurring: ["Spotify", "Netflix", "Apple iCloud", "Universidad"].includes(String(merchant)),
  is_ai_categorized: Boolean(ai),
  reviewed: index % 3 === 0,
  tags: index % 2 === 0 ? ["Apple Pay"] : ["manual"],
  created_at: "2026-06-15T10:00:00.000Z"
}));

export const demoBudgets: Budget[] = [
  ["Comida", 180000, 121000],
  ["Transporte", 90000, 64200],
  ["Suscripciones", 45000, 15440],
  ["Salud", 60000, 44600],
  ["Ocio", 100000, 74990],
  ["Mascota", 50000, 24700],
  ["Ahorro", 150000, 112000]
].map(([category, limit, spent], index) => ({
  id: `budget-${index}`,
  user_id: demoUser.id,
  category: String(category),
  limit_amount: Number(limit),
  spent_amount: Number(spent),
  period: "monthly",
  created_at: "2026-06-01T10:00:00.000Z"
}));

export const demoGoals: Goal[] = [
  ["Fondo de emergencia", 1800000, 1380000, "2026-11-30", "from-emerald-400 to-teal-600", "🛟"],
  ["Viaje", 950000, 315000, "2026-12-20", "from-sky-400 to-blue-600", "✈️"],
  ["iPhone", 1250000, 420000, "2026-09-30", "from-zinc-500 to-slate-800", "📱"],
  ["Universidad", 600000, 220000, "2026-08-15", "from-violet-400 to-purple-700", "🎓"],
  ["Carlino", 280000, 120000, "2026-07-25", "from-amber-300 to-orange-600", "🐾"],
  ["Inversión", 1000000, 260000, "2027-01-31", "from-lime-400 to-green-700", "📈"]
].map(([name, target, current, deadline, color, icon], index) => ({
  id: `goal-${index}`,
  user_id: demoUser.id,
  name: String(name),
  target_amount: Number(target),
  current_amount: Number(current),
  deadline: String(deadline),
  color: String(color),
  icon: String(icon),
  created_at: "2026-06-01T10:00:00.000Z"
}));

export const demoSubscriptions: Subscription[] = [
  ["Netflix", 7990, "2026-06-22", "Suscripciones", "acc-santander"],
  ["Spotify", 4550, "2026-06-19", "Suscripciones", "acc-santander"],
  ["iCloud", 2900, "2026-06-24", "Suscripciones", "acc-mp"],
  ["Arriendo", 320000, "2026-07-01", "Hogar", "acc-bchile"],
  ["Tarjeta de crédito", 236500, "2026-06-28", "Deuda", "acc-santander"],
  ["Universidad", 120000, "2026-06-25", "Estudios", "acc-bchile"],
  ["Seguro", 18900, "2026-06-27", "Salud", "acc-bchile"]
].map(([name, amount, date, category, accountId], index) => ({
  id: `sub-${index}`,
  user_id: demoUser.id,
  name: String(name),
  amount: Number(amount),
  next_payment_date: String(date),
  category: String(category),
  account_id: String(accountId),
  active: true,
  created_at: "2026-06-01T10:00:00.000Z"
}));

export const demoDebts: Debt[] = [
  {
    id: "debt-1",
    user_id: demoUser.id,
    person_name: "Camila",
    type: "owed_to_me",
    amount: 45000,
    paid_amount: 10000,
    due_date: "2026-06-20",
    status: "partial",
    notes: "Cena y Uber compartido",
    created_at: "2026-06-02T10:00:00.000Z"
  },
  {
    id: "debt-2",
    user_id: demoUser.id,
    person_name: "Matías",
    type: "owed_by_me",
    amount: 28000,
    paid_amount: 0,
    due_date: "2026-06-18",
    status: "pending",
    notes: "Entrada concierto",
    created_at: "2026-06-03T10:00:00.000Z"
  }
];

export const demoInsights: AIInsight[] = [
  {
    id: "insight-1",
    user_id: demoUser.id,
    title: "Estás gastando más rápido",
    message: "Tu ritmo de gasto va 18% sobre lo normal para esta fecha.",
    severity: "orange",
    type: "riesgo",
    urgency: 4,
    action: "Baja comida fuera a $8.000 diarios por 7 días.",
    action_label: "Crear límite",
    quick_button: "Crear límite",
    previous_month_delta: 18,
    estimated_impact: 31000,
    icon: "⚡",
    created_at: "2026-06-15T10:00:00.000Z"
  },
  {
    id: "insight-2",
    user_id: demoUser.id,
    title: "Comida subió 28%",
    message: "Jumbo y comidas rápidas explican la mayor parte del alza.",
    severity: "yellow",
    type: "habito",
    urgency: 3,
    action: "Revisa 3 compras grandes y marca las necesarias.",
    action_label: "Revisar gasto",
    quick_button: "Revisar gasto",
    previous_month_delta: 28,
    estimated_impact: 18000,
    icon: "🍽️",
    created_at: "2026-06-15T10:00:00.000Z"
  },
  {
    id: "insight-3",
    user_id: demoUser.id,
    title: "Te quedan $9.500 diarios",
    message: "Con ese ritmo llegas bien al cierre del mes.",
    severity: "blue",
    type: "presupuesto",
    urgency: 2,
    action: "Mantén los pagos chicos bajo $10.000 diarios.",
    action_label: "Ver Hoy",
    quick_button: "Ver Hoy",
    previous_month_delta: -6,
    estimated_impact: 0,
    icon: "🧭",
    created_at: "2026-06-15T10:00:00.000Z"
  },
  {
    id: "insight-4",
    user_id: demoUser.id,
    title: "Ahorro va mejor",
    message: "Este mes ahorraste $22.000 más que el anterior.",
    severity: "green",
    type: "tendencia_positiva",
    urgency: 1,
    action: "Mueve $20.000 extra al fondo de emergencia.",
    action_label: "Ahorrar ahora",
    quick_button: "Ahorrar ahora",
    previous_month_delta: 12,
    estimated_impact: 22000,
    icon: "🌱",
    created_at: "2026-06-15T10:00:00.000Z"
  },
  {
    id: "insight-5",
    user_id: demoUser.id,
    title: "3 pagos próximos",
    message: "Spotify, Netflix y Universidad vencen dentro de 10 días.",
    severity: "red",
    type: "alerta",
    urgency: 5,
    action: "Reserva $132.540 para no quedar justo.",
    action_label: "Ver pagos",
    quick_button: "Ver pagos",
    previous_month_delta: 0,
    estimated_impact: 132540,
    icon: "📅",
    created_at: "2026-06-15T10:00:00.000Z"
  }
];

export const balanceTrend: BalancePoint[] = Array.from({ length: 30 }, (_, index) => {
  const base = 1960000 - index * 8200 + Math.sin(index / 2) * 42000;
  return {
    day: `${index + 1}`,
    balance: Math.round(base),
    projected: index > 22 ? Math.round(base - (index - 22) * 16000) : undefined
  };
});

export const categoryData: CategoryPoint[] = [
  { name: "Alimentación", value: 121000, color: "#FF9F0A" },
  { name: "Transporte", value: 64200, color: "#0A84FF" },
  { name: "Ocio", value: 74990, color: "#BF5AF2" },
  { name: "Estudios", value: 120000, color: "#64D2FF" },
  { name: "Salud", value: 44600, color: "#30D158" },
  { name: "Suscripciones", value: 15440, color: "#FF375F" },
  { name: "Mascota", value: 24700, color: "#AC8E68" },
  { name: "Otros", value: 15900, color: "#8E8E93" }
];

export const heatmapDays: HeatmapDay[] = Array.from({ length: 28 }, (_, index) => {
  const amount = Math.round(2500 + Math.abs(Math.sin(index * 1.7)) * 52000);
  return {
    date: `2026-06-${String(index + 1).padStart(2, "0")}`,
    amount,
    level: amount > 45000 ? 4 : amount > 30000 ? 3 : amount > 16000 ? 2 : amount > 7000 ? 1 : 0
  };
});

export const totals = {
  consolidatedBalance: demoAccounts
    .filter((account) => !account.is_hidden && !account.exclude_from_total)
    .reduce((sum, account) => sum + account.balance, 0),
  monthlyIncome: 1620000,
  monthlySpent: 507920,
  monthlyBudget: 675000,
  availableToday: 12400,
  availableWeek: 42000,
  savedThisMonth: 112000,
  projectedEndBalance: 918000
};
