"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CreditCard, Plus, ReceiptText } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

type ExpensePlan = {
  id: string;
  name: string;
  amount: number;
  period: "daily" | "weekly" | "monthly" | "annual" | "event";
  category: string;
  event_date?: string | null;
  notes?: string | null;
};

type DebtRow = {
  id: string;
  person_name: string;
  type: "owed_by_me" | "owed_to_me";
  amount: number;
  paid_amount: number;
  due_date?: string | null;
  status: "pending" | "partial" | "paid" | "overdue";
  notes?: string | null;
};

const periodLabels: Record<ExpensePlan["period"], string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  annual: "Anual",
  event: "Evento"
};

const defaultPlans: ExpensePlan[] = [
  { id: "local-daily-food", name: "Comida diaria", amount: 9500, period: "daily", category: "Comida" },
  { id: "local-weekly-transport", name: "Transporte semana", amount: 42000, period: "weekly", category: "Transporte" },
  { id: "local-monthly-apps", name: "Apps y streaming", amount: 44990, period: "monthly", category: "Suscripciones" },
  { id: "local-annual-insurance", name: "Seguro anual", amount: 180000, period: "annual", category: "Seguros" },
  { id: "local-event-trip", name: "Viaje / evento", amount: 250000, period: "event", category: "Evento" }
];

const defaultDebts: DebtRow[] = [
  { id: "local-debt-1", person_name: "Martina", type: "owed_to_me", amount: 42000, paid_amount: 0, due_date: "2026-07-20", status: "pending", notes: "Cena pendiente" },
  { id: "local-debt-2", person_name: "Tarjeta crédito", type: "owed_by_me", amount: 185000, paid_amount: 70000, due_date: "2026-07-28", status: "partial", notes: "Cuota mensual" }
];

export function DebtBudgetPlanner() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [plans, setPlans] = useState<ExpensePlan[]>(defaultPlans);
  const [debts, setDebts] = useState<DebtRow[]>(defaultDebts);
  const [planDraft, setPlanDraft] = useState({ name: "", amount: "", period: "monthly", category: "" });
  const [debtDraft, setDebtDraft] = useState({ person: "", amount: "", type: "owed_by_me", due: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) return;

    async function load() {
      const [{ data: expenseRows }, { data: debtRows }] = await Promise.all([
        supabase!.from("expense_plans").select("*").order("created_at", { ascending: false }),
        supabase!.from("debts").select("*").order("created_at", { ascending: false })
      ]);

      if (expenseRows?.length) {
        setPlans(expenseRows.map((row) => ({ ...row, amount: Number(row.amount ?? 0) })) as ExpensePlan[]);
      }

      if (debtRows?.length) {
        setDebts(debtRows.map((row) => ({ ...row, amount: Number(row.amount ?? 0), paid_amount: Number(row.paid_amount ?? 0) })) as DebtRow[]);
      }
    }

    void load();
  }, [session, supabase]);

  async function addPlan() {
    const amount = Number(planDraft.amount);
    if (!planDraft.name || !amount || !planDraft.category) return;

    const nextPlan: ExpensePlan = {
      id: crypto.randomUUID(),
      name: planDraft.name,
      amount,
      period: planDraft.period as ExpensePlan["period"],
      category: planDraft.category
    };

    setPlans((current) => [nextPlan, ...current]);
    setPlanDraft({ name: "", amount: "", period: "monthly", category: "" });

    if (supabase && session) {
      await supabase.from("expense_plans").insert({
        user_id: session.user.id,
        name: nextPlan.name,
        amount: nextPlan.amount,
        period: nextPlan.period,
        category: nextPlan.category
      });
      setMessage("Gasto guardado en tu cuenta.");
    } else {
      setMessage("Gasto agregado en este dispositivo. Entra a tu cuenta para guardarlo en la nube.");
    }
  }

  async function addDebt() {
    const amount = Number(debtDraft.amount);
    if (!debtDraft.person || !amount) return;

    const nextDebt: DebtRow = {
      id: crypto.randomUUID(),
      person_name: debtDraft.person,
      type: debtDraft.type as DebtRow["type"],
      amount,
      paid_amount: 0,
      due_date: debtDraft.due || null,
      status: "pending"
    };

    setDebts((current) => [nextDebt, ...current]);
    setDebtDraft({ person: "", amount: "", type: "owed_by_me", due: "" });

    if (supabase && session) {
      await supabase.from("debts").insert({
        user_id: session.user.id,
        person_name: nextDebt.person_name,
        type: nextDebt.type,
        amount: nextDebt.amount,
        paid_amount: 0,
        due_date: nextDebt.due_date,
        status: nextDebt.status
      });
      setMessage("Deuda guardada en tu cuenta.");
    } else {
      setMessage("Deuda agregada en este dispositivo. Entra a tu cuenta para guardarla en la nube.");
    }
  }

  const totalsByPeriod = plans.reduce<Record<string, number>>((acc, plan) => {
    acc[plan.period] = (acc[plan.period] ?? 0) + plan.amount;
    return acc;
  }, {});

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Gastos por periodo</p>
            <h2 className="text-2xl font-black">Diario, semanal, mensual, anual y evento</h2>
          </div>
          <Badge>{session ? "Guardado en nube" : "Modo local"}</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(periodLabels) as ExpensePlan["period"][]).map((period) => (
            <div key={period} className="rounded-[1.25rem] bg-white/60 p-3 dark:bg-white/8">
              <p className="text-xs font-bold text-muted-foreground">{periodLabels[period]}</p>
              <p className="mt-1 text-xl font-black">{formatCurrency(totalsByPeriod[period] ?? 0)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_0.7fr_0.8fr_0.8fr_auto]">
          <Input value={planDraft.name} onChange={(event) => setPlanDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Nombre del gasto" />
          <Input value={planDraft.amount} onChange={(event) => setPlanDraft((draft) => ({ ...draft, amount: event.target.value }))} placeholder="Monto" inputMode="numeric" />
          <select className="h-11 rounded-full border border-white/40 bg-white/60 px-4 text-sm font-semibold dark:bg-white/10" value={planDraft.period} onChange={(event) => setPlanDraft((draft) => ({ ...draft, period: event.target.value }))}>
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <Input value={planDraft.category} onChange={(event) => setPlanDraft((draft) => ({ ...draft, category: event.target.value }))} placeholder="Categoría" />
          <Button onClick={addPlan}><CalendarPlus className="h-4 w-4" />Agregar</Button>
        </div>
        <div className="mt-4 space-y-2">
          {plans.slice(0, 8).map((plan) => (
            <div key={plan.id} className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-white/55 p-3 dark:bg-white/8">
              <div className="min-w-0">
                <p className="truncate font-black">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{periodLabels[plan.period]} · {plan.category}</p>
              </div>
              <p className="shrink-0 text-lg font-black">{formatCurrency(plan.amount)}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Deudas y deudores</p>
            <h2 className="text-2xl font-black">Lista editable</h2>
          </div>
          <CreditCard className="h-6 w-6 text-sky-500" />
        </div>
        <div className="mt-4 grid gap-2">
          <Input value={debtDraft.person} onChange={(event) => setDebtDraft((draft) => ({ ...draft, person: event.target.value }))} placeholder="Persona o entidad" />
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
            <Input value={debtDraft.amount} onChange={(event) => setDebtDraft((draft) => ({ ...draft, amount: event.target.value }))} placeholder="Monto" inputMode="numeric" />
            <Input value={debtDraft.due} onChange={(event) => setDebtDraft((draft) => ({ ...draft, due: event.target.value }))} type="date" />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <select className="h-11 rounded-full border border-white/40 bg-white/60 px-4 text-sm font-semibold dark:bg-white/10" value={debtDraft.type} onChange={(event) => setDebtDraft((draft) => ({ ...draft, type: event.target.value }))}>
              <option value="owed_by_me">Yo debo</option>
              <option value="owed_to_me">Me deben</option>
            </select>
            <Button onClick={addDebt}><Plus className="h-4 w-4" />Agregar deuda</Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {debts.slice(0, 6).map((debt) => (
            <div key={debt.id} className="rounded-[1.25rem] bg-white/55 p-3 dark:bg-white/8">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">{debt.person_name}</p>
                <Badge>{debt.type === "owed_to_me" ? "Me deben" : "Yo debo"}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{debt.due_date ? `Vence ${new Date(debt.due_date).toLocaleDateString("es-CL")}` : "Sin fecha"}</p>
                <p className="text-lg font-black">{formatCurrency(debt.amount - debt.paid_amount)}</p>
              </div>
            </div>
          ))}
        </div>
        {message && (
          <p className="mt-3 rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold">
            <ReceiptText className="mr-2 inline h-4 w-4" />
            {message}
          </p>
        )}
      </GlassCard>
    </div>
  );
}
