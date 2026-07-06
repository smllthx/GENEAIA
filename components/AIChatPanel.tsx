"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import { formatCurrency } from "@/lib/utils";

type AIAnswer = {
  diagnosis: string;
  key_points: string[];
  action: string;
  estimated_amount: number;
  urgency: string;
};

const initialAnswer: AIAnswer = {
  diagnosis: "Pregúntame algo sobre tus datos.",
  key_points: ["Uso tus cuentas reales.", "Reviso tus movimientos.", "No invento montos si faltan datos."],
  action: "Conecta un banco o registra movimientos para mejorar el cálculo.",
  estimated_amount: 0,
  urgency: "información"
};

export function AIChatPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [question, setQuestion] = useState("¿Cuánto puedo gastar esta semana?");
  const [answer, setAnswer] = useState<AIAnswer>(initialAnswer);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("local");

  async function buildContext() {
    if (!supabase) return null;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) return null;

    const [profile, accounts, transactions, budgets, debts, subscriptions] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("date", { ascending: false }).limit(180),
      supabase.from("budgets").select("*").order("created_at", { ascending: false }),
      supabase.from("debts").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false })
    ]);

    const accountRows = accounts.data ?? [];
    const transactionRows = transactions.data ?? [];
    const spending = transactionRows
      .filter((transaction) => Number(transaction.amount) < 0)
      .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0);
    const income = transactionRows
      .filter((transaction) => Number(transaction.amount) > 0)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const balance = accountRows
      .filter((account) => !account.is_hidden && !account.exclude_from_total)
      .reduce((sum, account) => sum + Number(account.balance ?? 0), 0);
    const byCategory = transactionRows.reduce<Record<string, number>>((acc, transaction) => {
      const amount = Number(transaction.amount);
      if (amount < 0) {
        acc[transaction.category] = (acc[transaction.category] ?? 0) + Math.abs(amount);
      }
      return acc;
    }, {});

    return {
      profile: profile.data,
      summary: {
        balance,
        spending,
        income,
        transaction_count: transactionRows.length,
        account_count: accountRows.length,
        by_category: byCategory
      },
      accounts: accountRows,
      transactions: transactionRows.slice(0, 60),
      budgets: budgets.data ?? [],
      debts: debts.data ?? [],
      subscriptions: subscriptions.data ?? []
    };
  }

  async function ask() {
    setLoading(true);
    try {
      const context = await buildContext();
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context })
      });
      const data = await response.json();
      setAnswer(data.answer);
      setSource(data.source ?? "local");
    } catch {
      setAnswer(initialAnswer);
      setSource("local");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard className="space-y-4" glow>
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Wallet Assistant</p>
        <h2 className="text-2xl font-black">IA financiera</h2>
      </div>
      <div className="flex gap-2">
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} />
        <Button size="icon" onClick={ask} disabled={loading} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="rounded-[1.5rem] bg-white/58 p-4 dark:bg-white/8">
        <p className="text-lg font-black">{answer.diagnosis}</p>
        <ol className="mt-3 space-y-2 text-sm">
          {answer.key_points.map((point, index) => (
            <li key={point}>{index + 1}. {point}</li>
          ))}
        </ol>
        <div className="mt-4 rounded-2xl bg-emerald-400/15 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          Acción: {answer.action}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Impacto estimado: {formatCurrency(answer.estimated_amount)} · urgencia {answer.urgency} · fuente {source}
        </p>
      </div>
    </GlassCard>
  );
}
