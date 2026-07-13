"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CreditCard, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
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

export function DebtBudgetPlanner() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [plans, setPlans] = useState<ExpensePlan[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
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

      setPlans((expenseRows ?? []).map((row) => ({ ...row, amount: Number(row.amount ?? 0) })) as ExpensePlan[]);
      setDebts((debtRows ?? []).map((row) => ({ ...row, amount: Number(row.amount ?? 0), paid_amount: Number(row.paid_amount ?? 0) })) as DebtRow[]);
    }

    void load();
  }, [session, supabase]);

  useEffect(() => {
    if (!supabase || !session) return;
    const reload = () => window.dispatchEvent(new Event("wallet-plans-changed"));
    const channel = supabase
      .channel(`wallet-plans-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_plans", filter: `user_id=eq.${session.user.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "debts", filter: `user_id=eq.${session.user.id}` }, reload)
      .subscribe();
    const refresh = async () => {
      const [{ data: expenseRows }, { data: debtRows }] = await Promise.all([
        supabase.from("expense_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("debts").select("*").order("created_at", { ascending: false })
      ]);
      setPlans((expenseRows ?? []).map((row) => ({ ...row, amount: Number(row.amount ?? 0) })) as ExpensePlan[]);
      setDebts((debtRows ?? []).map((row) => ({ ...row, amount: Number(row.amount ?? 0), paid_amount: Number(row.paid_amount ?? 0) })) as DebtRow[]);
    };
    window.addEventListener("wallet-plans-changed", refresh);
    return () => {
      window.removeEventListener("wallet-plans-changed", refresh);
      void supabase.removeChannel(channel);
    };
  }, [session, supabase]);

  async function addPlan() {
    const amount = Number(planDraft.amount);
    if (!planDraft.name || !amount || !planDraft.category) return;

    if (supabase && session) {
      const { data, error } = await supabase.from("expense_plans").insert({
        user_id: session.user.id,
        name: planDraft.name,
        amount,
        period: planDraft.period,
        category: planDraft.category
      }).select("*").single();
      if (error || !data) {
        setMessage("No se pudo guardar el gasto.");
        return;
      }
      setPlans((current) => [{ ...data, amount: Number(data.amount) } as ExpensePlan, ...current.filter((item) => item.id !== data.id)]);
      setPlanDraft({ name: "", amount: "", period: "monthly", category: "" });
      setMessage("Gasto guardado.");
    }
  }

  async function addDebt() {
    const amount = Number(debtDraft.amount);
    if (!debtDraft.person || !amount) return;

    if (supabase && session) {
      const { data, error } = await supabase.from("debts").insert({
        user_id: session.user.id,
        person_name: debtDraft.person,
        type: debtDraft.type,
        amount,
        paid_amount: 0,
        due_date: debtDraft.due || null,
        status: "pending"
      }).select("*").single();
      if (error || !data) {
        setMessage("No se pudo guardar la deuda.");
        return;
      }
      setDebts((current) => [{ ...data, amount: Number(data.amount), paid_amount: Number(data.paid_amount) } as DebtRow, ...current.filter((item) => item.id !== data.id)]);
      setDebtDraft({ person: "", amount: "", type: "owed_by_me", due: "" });
      setMessage("Deuda guardada.");
    }
  }

  async function editPlan(plan: ExpensePlan) {
    const name = window.prompt("Nombre del gasto", plan.name);
    if (!name) return;
    const amountValue = window.prompt("Monto", String(plan.amount));
    const amount = Number(amountValue);
    if (!amount) return;

    setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, name, amount } : item));

    if (supabase && session) {
      const { error } = await supabase.from("expense_plans").update({ name, amount }).eq("id", plan.id);
      setMessage(error ? error.message : "Gasto actualizado.");
    }
  }

  async function deletePlan(plan: ExpensePlan) {
    if (!window.confirm(`¿Borrar ${plan.name}?`)) return;

    setPlans((current) => current.filter((item) => item.id !== plan.id));

    if (supabase && session) {
      const { error } = await supabase.from("expense_plans").delete().eq("id", plan.id);
      setMessage(error ? error.message : "Gasto borrado.");
    }
  }

  async function editDebt(debt: DebtRow) {
    const personName = window.prompt("Persona o entidad", debt.person_name);
    if (!personName) return;
    const amountValue = window.prompt("Monto total", String(debt.amount));
    const amount = Number(amountValue);
    if (!amount) return;
    const paidValue = window.prompt("Monto pagado", String(debt.paid_amount));
    const paidAmount = Number(paidValue || 0);

    setDebts((current) => current.map((item) => item.id === debt.id ? { ...item, person_name: personName, amount, paid_amount: paidAmount } : item));

    if (supabase && session) {
      const { error } = await supabase
        .from("debts")
        .update({ person_name: personName, amount, paid_amount: paidAmount })
        .eq("id", debt.id);
      setMessage(error ? error.message : "Deuda actualizada.");
    }
  }

  async function deleteDebt(debt: DebtRow) {
    if (!window.confirm(`¿Borrar deuda de ${debt.person_name}?`)) return;

    setDebts((current) => current.filter((item) => item.id !== debt.id));

    if (supabase && session) {
      const { error } = await supabase.from("debts").delete().eq("id", debt.id);
      setMessage(error ? error.message : "Deuda borrada.");
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
          <Badge>Sincronizado</Badge>
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
          {plans.length === 0 && <p className="rounded-[1.25rem] bg-white/55 p-4 text-sm text-muted-foreground dark:bg-white/8">Aún no has creado gastos planificados.</p>}
          {plans.slice(0, 8).map((plan) => (
            <div key={plan.id} className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-white/55 p-3 dark:bg-white/8">
              <div className="min-w-0">
                <p className="truncate font-black">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{periodLabels[plan.period]} · {plan.category}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-lg font-black">{formatCurrency(plan.amount)}</p>
                <Button variant="glass" size="icon" onClick={() => editPlan(plan)} aria-label="Editar gasto">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="glass" size="icon" onClick={() => deletePlan(plan)} aria-label="Borrar gasto">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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
          {debts.length === 0 && <p className="rounded-[1.25rem] bg-white/55 p-4 text-sm text-muted-foreground dark:bg-white/8">Aún no has registrado deudas.</p>}
          {debts.slice(0, 6).map((debt) => (
            <div key={debt.id} className="rounded-[1.25rem] bg-white/55 p-3 dark:bg-white/8">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">{debt.person_name}</p>
                <Badge>{debt.type === "owed_to_me" ? "Me deben" : "Yo debo"}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{debt.due_date ? `Vence ${new Date(debt.due_date).toLocaleDateString("es-CL")}` : "Sin fecha"}</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-black">{formatCurrency(debt.amount - debt.paid_amount)}</p>
                  <Button variant="glass" size="icon" onClick={() => editDebt(debt)} aria-label="Editar deuda">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="glass" size="icon" onClick={() => deleteDebt(debt)} aria-label="Borrar deuda">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
