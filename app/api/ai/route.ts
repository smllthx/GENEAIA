import { NextResponse } from "next/server";
import OpenAI from "openai";

const fallbackAnswer = {
  diagnosis: "Todavía necesito tus datos reales.",
  key_points: [
    "Agrega una cuenta o conecta un banco.",
    "Registra algunos movimientos.",
    "Crea tus presupuestos base."
  ],
  action: "Empieza agregando efectivo o una cuenta manual.",
  estimated_amount: 0,
  urgency: "información"
};

type WalletContext = {
  profile?: {
    daily_budget?: number;
    weekly_budget?: number;
    monthly_budget?: number;
  } | null;
  summary?: {
    balance?: number;
    spending?: number;
    income?: number;
    transaction_count?: number;
    account_count?: number;
    by_category?: Record<string, number>;
  };
  debts?: Array<{ amount?: number; paid_amount?: number; status?: string }>;
  subscriptions?: Array<{ amount?: number; active?: boolean }>;
};

function localFinancialAnswer(question: string, context: WalletContext | null) {
  if (!context?.summary || (context.summary.account_count ?? 0) === 0) {
    return fallbackAnswer;
  }

  const balance = Number(context.summary.balance ?? 0);
  const spending = Number(context.summary.spending ?? 0);
  const income = Number(context.summary.income ?? 0);
  const weeklyBudget = Number(context.profile?.weekly_budget ?? 0);
  const dailyBudget = Number(context.profile?.daily_budget ?? 0);
  const monthlyBudget = Number(context.profile?.monthly_budget ?? 0);
  const daysLeft = Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1);
  const availableToday = dailyBudget > 0 ? Math.max(0, dailyBudget - Math.round(spending / Math.max(1, new Date().getDate()))) : Math.max(0, Math.floor(balance / daysLeft));
  const availableWeek = weeklyBudget > 0 ? Math.max(0, weeklyBudget - spending) : Math.max(0, Math.floor(balance / 4));
  const categories = Object.entries(context.summary.by_category ?? {}).sort(([, a], [, b]) => Number(b) - Number(a));
  const topCategory = categories[0];
  const activeSubscriptions = (context.subscriptions ?? []).filter((item) => item.active !== false);
  const subscriptionTotal = activeSubscriptions.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const pendingDebt = (context.debts ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0) - Number(item.paid_amount ?? 0)), 0);
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes("semana")) {
    return {
      diagnosis: `Puedes gastar cerca de ${formatNumber(availableWeek)} esta semana.`,
      key_points: [
        `Saldo actual: ${formatNumber(balance)}.`,
        `Gasto registrado: ${formatNumber(spending)}.`,
        topCategory ? `Mayor categoría: ${topCategory[0]} con ${formatNumber(Number(topCategory[1]))}.` : "Aún no hay categorías fuertes."
      ],
      action: availableWeek > 0 ? "Divide ese monto en 7 días y registra cada gasto importante." : "Pausa gastos variables hasta cargar ingresos o ajustar presupuesto.",
      estimated_amount: availableWeek,
      urgency: availableWeek > 0 ? "información" : "alta"
    };
  }

  if (lowerQuestion.includes("suscrip")) {
    return {
      diagnosis: activeSubscriptions.length > 0 ? "Tienes suscripciones activas para revisar." : "Aún no hay suscripciones registradas.",
      key_points: [
        `Suscripciones activas: ${activeSubscriptions.length}.`,
        `Costo estimado: ${formatNumber(subscriptionTotal)}.`,
        "Cancela primero las que no usaste este mes."
      ],
      action: "Revisa pagos recurrentes y marca como suscripción los cargos repetidos.",
      estimated_amount: subscriptionTotal,
      urgency: subscriptionTotal > 0 ? "atención" : "información"
    };
  }

  if (lowerQuestion.includes("deuda")) {
    return {
      diagnosis: pendingDebt > 0 ? "Hay deuda pendiente en tu Wallet." : "No hay deuda pendiente registrada.",
      key_points: [
        `Deuda pendiente: ${formatNumber(pendingDebt)}.`,
        `Saldo actual: ${formatNumber(balance)}.`,
        pendingDebt > balance ? "La deuda supera tu saldo disponible." : "Tu saldo cubre la deuda registrada."
      ],
      action: "Ordena deudas por fecha límite y paga primero la más cercana.",
      estimated_amount: pendingDebt,
      urgency: pendingDebt > balance ? "alta" : "media"
    };
  }

  return {
    diagnosis: balance > 0 ? "Tu situación se puede calcular con tus datos actuales." : "Tu saldo está bajo o no cargado.",
    key_points: [
      `Saldo total: ${formatNumber(balance)}.`,
      `Ingresos registrados: ${formatNumber(income)}.`,
      monthlyBudget > 0 ? `Presupuesto mensual: ${formatNumber(monthlyBudget)}.` : `Gasto registrado: ${formatNumber(spending)}.`
    ],
    action: `Hoy intenta mantenerte bajo ${formatNumber(availableToday)}.`,
    estimated_amount: availableToday,
    urgency: availableToday > 0 ? "información" : "atención"
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ question: "", context: null }));
  const question = typeof body.question === "string" ? body.question : "";
  const context = body.context && typeof body.context === "object" ? body.context : null;

  if (!process.env.OPENAI_API_KEY || !context) {
    return NextResponse.json({ source: context ? "local-calculation" : "fallback", answer: localFinancialAnswer(question, context as WalletContext | null) });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres Wallet Assistant. Responde en español chileno, claro, breve y práctico. No inventes datos. Devuelve JSON con diagnosis, key_points array de 3 strings, action, estimated_amount number y urgency."
        },
        {
          role: "user",
          content: JSON.stringify({ question, context })
        }
      ]
    });

    const content = response.choices[0]?.message.content;
    return NextResponse.json({
      source: "openai",
      answer: content ? JSON.parse(content) : fallbackAnswer
    });
  } catch {
    return NextResponse.json({ source: "fallback", answer: fallbackAnswer });
  }
}
