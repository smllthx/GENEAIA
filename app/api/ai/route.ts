import {
  demoAccounts,
  demoBudgets,
  demoDebts,
  demoGoals,
  demoInsights,
  demoSubscriptions,
  demoTransactions,
  totals
} from "@/lib/demo-data";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const fallbackAnswer = {
  diagnosis: "Vas algo justo este mes.",
  key_points: [
    "Comida subió $31.000 frente al mes anterior.",
    "Uber y transporte están acelerando el gasto semanal.",
    "Tienes 3 pagos próximos importantes."
  ],
  action: "Limita comida fuera a $8.000 diarios por 7 días.",
  estimated_amount: 31000,
  urgency: "atención"
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ question: "" }));
  const question = typeof body.question === "string" ? body.question : "";

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ source: "mock", answer: fallbackAnswer });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres Wallet Assistant. Responde en español chileno, claro, breve y práctico. Devuelve JSON con diagnosis, key_points array de 3 strings, action, estimated_amount number y urgency."
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            totals,
            accounts: demoAccounts,
            transactions: demoTransactions,
            budgets: demoBudgets,
            subscriptions: demoSubscriptions,
            debts: demoDebts,
            goals: demoGoals,
            insights: demoInsights
          })
        }
      ]
    });

    const content = response.choices[0]?.message.content;
    return NextResponse.json({
      source: "openai",
      answer: content ? JSON.parse(content) : fallbackAnswer
    });
  } catch {
    return NextResponse.json({ source: "mock", answer: fallbackAnswer });
  }
}
