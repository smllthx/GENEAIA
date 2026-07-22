"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit3, Plus, Trash2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Budget, Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function BudgetManager({ transactions, hidden }: { transactions: Transaction[]; hidden: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadBudgets = useCallback(async () => {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from("budgets").select("*").order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setBudgets((data ?? []).map((item) => ({ ...item, limit_amount: Number(item.limit_amount), spent_amount: Number(item.spent_amount) })) as Budget[]);
  }, [session, supabase]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => { void loadBudgets(); }, [loadBudgets]);

  const spentByBudget = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6);
    const monthPrefix = now.toISOString().slice(0, 7);
    return Object.fromEntries(budgets.map((budget) => [budget.id, transactions.filter((transaction) => transaction.amount < 0 && transaction.category.toLocaleLowerCase("es-CL") === budget.category.toLocaleLowerCase("es-CL") && (budget.period === "weekly" ? new Date(transaction.date) >= weekStart : transaction.date.startsWith(monthPrefix))).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)]));
  }, [budgets, transactions]);

  function resetForm() { setEditingId(null); setCategory(""); setLimit(""); setPeriod("monthly"); setMessage(""); }
  function edit(budget: Budget) { setEditingId(budget.id); setCategory(budget.category); setLimit(String(budget.limit_amount)); setPeriod(budget.period); setMessage(""); setOpen(true); }

  async function save() {
    if (!supabase || !session || !category.trim() || !limit || Number(limit) <= 0) { setMessage("Completa categoría y un monto mayor que cero."); return; }
    const payload = { user_id: session.user.id, category: category.trim(), limit_amount: Number(limit), spent_amount: editingId ? spentByBudget[editingId] ?? 0 : 0, period };
    setLoading(true);
    const { error } = editingId ? await supabase.from("budgets").update(payload).eq("id", editingId) : await supabase.from("budgets").insert(payload);
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setOpen(false); resetForm(); await loadBudgets();
  }

  async function remove(budget: Budget) {
    if (!supabase || !window.confirm(`Eliminar el presupuesto de “${budget.category}”?`)) return;
    const { error } = await supabase.from("budgets").delete().eq("id", budget.id);
    if (error) setMessage(error.message); else await loadBudgets();
  }

  const exceeded = budgets.filter((budget) => (spentByBudget[budget.id] ?? 0) > budget.limit_amount).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-muted-foreground">Límites reales</p><h2 className="text-2xl font-black">Presupuestos por categoría</h2></div><Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}><DialogTrigger asChild><Button onClick={resetForm}><Plus className="h-4 w-4" />Nuevo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editingId ? "Editar presupuesto" : "Agregar presupuesto"}</DialogTitle><DialogDescription>Define una categoría, monto y período. El gasto se calcula desde tus movimientos.</DialogDescription></DialogHeader><div className="grid gap-3"><Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categoría, ej. Restaurantes" /><Input value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="Monto máximo" type="number" min="1" /><select className="h-11 rounded-full border border-white/40 bg-white/70 px-4 text-sm font-semibold text-foreground dark:bg-slate-900/80" value={period} onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")}><option value="monthly">Mensual</option><option value="weekly">Semanal</option></select><Button onClick={save} disabled={loading}>Guardar presupuesto</Button>{message && <p className="rounded-2xl bg-orange-400/12 p-3 text-sm font-semibold">{message}</p>}</div></DialogContent></Dialog></div>
        <div className="mt-4 grid gap-3">
          {budgets.length === 0 ? <div className="rounded-[1.4rem] bg-white/55 p-5 text-center dark:bg-white/8"><p className="font-black">Sin presupuestos por categoría</p><p className="mt-1 text-sm text-muted-foreground">Crea uno para comparar tu límite con los gastos reales.</p></div> : budgets.map((budget) => { const spent = spentByBudget[budget.id] ?? 0; const progress = budget.limit_amount > 0 ? Math.min(100, Math.round(spent / budget.limit_amount * 100)) : 0; const over = spent > budget.limit_amount; return <article key={budget.id} className="rounded-[1.4rem] bg-white/55 p-4 dark:bg-white/8"><div className="flex items-start gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${over ? "bg-red-500 text-white" : "bg-orange-500/15 text-orange-600"}`}>{over ? <AlertTriangle className="h-5 w-5" /> : "◉"}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{budget.category}</h3><Badge>{budget.period === "weekly" ? "Semanal" : "Mensual"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{hidden ? "••••" : `${formatCurrency(spent)} / ${formatCurrency(budget.limit_amount)}`}</p><Progress value={progress} className="mt-3" /></div><Button variant="ghost" size="icon" onClick={() => edit(budget)} aria-label={`Editar ${budget.category}`}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove(budget)} aria-label={`Eliminar ${budget.category}`}><Trash2 className="h-4 w-4" /></Button></div>{over && <p className="mt-3 text-sm font-bold text-red-600">Excedido por {hidden ? "••••" : formatCurrency(spent - budget.limit_amount)}</p>}</article>; })}
        </div>
      </GlassCard>
      <GlassCard glow><p className="text-sm font-semibold text-muted-foreground">Resumen inteligente</p><h2 className="mt-1 text-2xl font-black">{exceeded > 0 ? `${exceeded} presupuesto(s) excedido(s)` : "Todo bajo control"}</h2><p className="mt-3 text-sm text-muted-foreground">Las alertas se basan en tus movimientos reales; Wallet no inventa gastos ni predicciones.</p><div className="mt-5 rounded-[1.4rem] bg-orange-400/14 p-4"><p className="font-black">Regla recomendada</p><p className="mt-1 text-sm text-muted-foreground">Revisa una categoría al 80% y ajusta solo después de confirmar los movimientos.</p></div>{message && !open && <p className="mt-3 rounded-2xl bg-orange-400/12 p-3 text-sm font-semibold">{message}</p>}</GlassCard>
    </div>
  );
}
