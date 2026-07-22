"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Check, Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Account, Subscription, Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type SubscriptionDraft = {
  name: string;
  amount: string;
  nextPaymentDate: string;
  category: string;
  accountId: string;
};

const emptyDraft: SubscriptionDraft = {
  name: "",
  amount: "",
  nextPaymentDate: new Date().toISOString().slice(0, 10),
  category: "Suscripciones",
  accountId: ""
};

export function SubscriptionsView({ accounts, transactions, hidden }: { accounts: Account[]; transactions: Transaction[]; hidden: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [draft, setDraft] = useState<SubscriptionDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadSubscriptions = useCallback(async () => {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from("subscriptions").select("*").order("next_payment_date", { ascending: true });
    if (error) {
      setMessage(error.message);
      return;
    }
    setSubscriptions((data ?? []).map((item) => ({ ...item, amount: Number(item.amount) })) as Subscription[]);
  }, [session, supabase]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    void loadSubscriptions();
    const reload = () => void loadSubscriptions();
    window.addEventListener("wallet-data-changed", reload);
    return () => window.removeEventListener("wallet-data-changed", reload);
  }, [loadSubscriptions]);

  const suggestions = useMemo(() => {
    const merchants = transactions.reduce<Record<string, Transaction[]>>((result, transaction) => {
      if (transaction.amount >= 0) return result;
      const key = transaction.merchant.trim().toLocaleLowerCase("es-CL");
      result[key] = [...(result[key] ?? []), transaction];
      return result;
    }, {});
    const existing = new Set(subscriptions.map((item) => item.name.toLocaleLowerCase("es-CL")));
    return Object.values(merchants)
      .filter((items) => items.some((item) => item.is_recurring) || items.length >= 2)
      .filter((items) => !existing.has(items[0].merchant.toLocaleLowerCase("es-CL")))
      .map((items) => items.sort((a, b) => b.date.localeCompare(a.date))[0])
      .slice(0, 4);
  }, [subscriptions, transactions]);

  const activeSubscriptions = subscriptions.filter((item) => item.active);
  const monthlyTotal = activeSubscriptions.reduce((sum, item) => sum + item.amount, 0);
  const nextSubscription = activeSubscriptions[0];
  const calendarDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date, key, items: activeSubscriptions.filter((item) => item.next_payment_date === key) };
  });

  function startCreate(prefill?: Partial<SubscriptionDraft>) {
    setEditingId(null);
    setDraft({ ...emptyDraft, accountId: accounts[0]?.id ?? "", ...prefill });
    setMessage("");
    setOpen(true);
  }

  function startEdit(subscription: Subscription) {
    setEditingId(subscription.id);
    setDraft({
      name: subscription.name,
      amount: String(subscription.amount),
      nextPaymentDate: subscription.next_payment_date,
      category: subscription.category,
      accountId: subscription.account_id ?? ""
    });
    setMessage("");
    setOpen(true);
  }

  async function save() {
    if (!supabase || !session || !draft.name.trim() || !draft.amount || !draft.nextPaymentDate) {
      setMessage("Completa nombre, monto y próxima fecha.");
      return;
    }
    const payload = {
      user_id: session.user.id,
      name: draft.name.trim(),
      amount: Math.abs(Number(draft.amount)),
      next_payment_date: draft.nextPaymentDate,
      category: draft.category.trim() || "Suscripciones",
      account_id: draft.accountId || null,
      active: true
    };
    setLoading(true);
    const { error } = editingId
      ? await supabase.from("subscriptions").update(payload).eq("id", editingId)
      : await supabase.from("subscriptions").insert(payload);
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setOpen(false);
    await loadSubscriptions();
    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  async function toggleActive(subscription: Subscription) {
    if (!supabase) return;
    const { error } = await supabase.from("subscriptions").update({ active: !subscription.active }).eq("id", subscription.id);
    if (error) setMessage(error.message);
    else await loadSubscriptions();
  }

  async function remove(subscription: Subscription) {
    if (!supabase || !window.confirm(`Eliminar la suscripción “${subscription.name}”?`)) return;
    const { error } = await supabase.from("subscriptions").delete().eq("id", subscription.id);
    if (error) setMessage(error.message);
    else await loadSubscriptions();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Calendario financiero</p>
          <h2 className="text-4xl font-black sm:text-5xl">Suscripciones</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => startCreate()}><Plus className="h-4 w-4" />Añadir</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar suscripción" : "Nueva suscripción"}</DialogTitle>
              <DialogDescription>Registra un cobro recurrente y su próxima fecha. Wallet te lo mostrará en el calendario.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} placeholder="Nombre de la suscripción" />
              <Input value={draft.amount} onChange={(event) => setDraft((value) => ({ ...value, amount: event.target.value }))} placeholder="Monto" type="number" min="0" inputMode="decimal" />
              <Input value={draft.nextPaymentDate} onChange={(event) => setDraft((value) => ({ ...value, nextPaymentDate: event.target.value }))} type="date" />
              <Input value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))} placeholder="Categoría" />
              <select className="h-11 w-full rounded-full border border-white/40 bg-white/70 px-4 text-sm font-semibold text-foreground dark:bg-slate-900/80" value={draft.accountId} onChange={(event) => setDraft((value) => ({ ...value, accountId: event.target.value }))}>
                <option value="">Sin cuenta asignada</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}
              </select>
              <Button onClick={save} disabled={loading}>{editingId ? "Guardar cambios" : "Crear suscripción"}</Button>
              {message && <p className="rounded-2xl bg-orange-400/12 p-3 text-sm font-semibold">{message}</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard><p className="text-sm font-semibold text-muted-foreground">Activas</p><p className="mt-2 text-4xl font-black">{activeSubscriptions.length}</p></GlassCard>
        <GlassCard><p className="text-sm font-semibold text-muted-foreground">Próximo mes</p><p className="mt-2 text-4xl font-black">{hidden ? "••••" : formatCurrency(monthlyTotal)}</p></GlassCard>
        <GlassCard><p className="text-sm font-semibold text-muted-foreground">Próximo cobro</p><p className="mt-2 truncate text-xl font-black">{nextSubscription?.name ?? "Sin cobros"}</p></GlassCard>
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-muted-foreground">Próximos 14 días</p><h3 className="text-2xl font-black">Calendario</h3></div><CalendarDays className="h-6 w-6 text-orange-500" /></div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => (
            <div key={day.key} className={`min-h-20 rounded-2xl border p-2 text-center ${day.items.length > 0 ? "border-orange-300 bg-orange-400/12" : "border-white/45 bg-white/40 dark:bg-white/5"}`}>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{day.date.toLocaleDateString("es-CL", { weekday: "short" })}</p>
              <p className="text-lg font-black">{day.date.getDate()}</p>
              {day.items.slice(0, 2).map((item) => <span key={item.id} title={item.name} className="mx-auto mt-1 block h-2 w-2 rounded-full bg-orange-500" />)}
            </div>
          ))}
        </div>
      </GlassCard>

      {suggestions.length > 0 && (
        <GlassCard glow>
          <div className="flex items-start gap-3"><RefreshCw className="mt-1 h-5 w-5 text-orange-500" /><div><h3 className="text-xl font-black">Posibles cobros recurrentes</h3><p className="text-sm text-muted-foreground">Detectados por repetición o por una marca recurrente. Confirma antes de guardar.</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {suggestions.map((transaction) => (
              <button key={transaction.id} onClick={() => startCreate({ name: transaction.merchant, amount: String(Math.abs(transaction.amount)), category: transaction.category, accountId: transaction.account_id })} className="rounded-2xl bg-white/55 p-3 text-left dark:bg-white/8">
                <span className="block font-black">{transaction.merchant}</span><span className="text-sm text-muted-foreground">{formatCurrency(Math.abs(transaction.amount))} · Revisar y añadir</span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="mb-4"><p className="text-sm font-semibold text-muted-foreground">Todos los cobros</p><h3 className="text-2xl font-black">Administrar</h3></div>
        {subscriptions.length === 0 ? (
          <div className="rounded-[1.4rem] bg-white/55 p-5 text-center dark:bg-white/8"><Bell className="mx-auto h-8 w-8 text-orange-500" /><p className="mt-3 font-black">Aún no hay suscripciones</p><p className="mt-1 text-sm text-muted-foreground">Añádela manualmente o confirma una sugerencia detectada.</p></div>
        ) : (
          <div className="grid gap-2">
            {subscriptions.map((subscription) => (
              <article key={subscription.id} className={`flex flex-col gap-3 rounded-[1.35rem] bg-white/55 p-4 dark:bg-white/8 sm:flex-row sm:items-center ${subscription.active ? "" : "opacity-60"}`}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-white">{subscription.name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><h4 className="truncate font-black">{subscription.name}</h4><p className="text-sm text-muted-foreground">{new Date(`${subscription.next_payment_date}T12:00:00`).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })} · {subscription.category}</p></div>
                <div className="sm:text-right"><p className="text-xl font-black">{hidden ? "••••" : formatCurrency(subscription.amount)}</p><Badge>{subscription.active ? "Activa" : "Pausada"}</Badge></div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(subscription)} aria-label={`Editar ${subscription.name}`}><Edit3 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(subscription)} aria-label={subscription.active ? `Pausar ${subscription.name}` : `Activar ${subscription.name}`}><Check className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(subscription)} aria-label={`Eliminar ${subscription.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {message && !open && <p className="mt-3 rounded-2xl bg-orange-400/12 p-3 text-sm font-semibold">{message}</p>}
      </GlassCard>
    </div>
  );
}
