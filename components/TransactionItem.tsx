"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import type { Account, Transaction } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

const categoryIcon: Record<string, string> = {
  "Alimentación": "🍽️",
  Comida: "🍽️",
  Transporte: "🚇",
  Suscripciones: "🔁",
  Salud: "💚",
  Estudios: "🎓",
  "Educación": "🎓",
  Ocio: "🎧",
  Mascota: "🐾",
  Mascotas: "🐾",
  Hogar: "🏠",
  Compras: "🛍️",
  Transferencias: "↔️",
  Otros: "✨",
  Ingresos: "💰"
};

export function TransactionItem({
  transaction,
  account,
  hidden
}: {
  transaction: Transaction;
  account?: Account;
  hidden: boolean;
}) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [description, setDescription] = useState(transaction.description);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const positive = transaction.amount > 0;
  const DirectionIcon = positive ? ArrowDownLeft : ArrowUpRight;
  const amountLabel = positive ? "Abono" : "Cargo";

  async function save() {
    if (!supabase || !merchant || amount === "" || !category) return;

    setLoading(true);
    const { error } = await supabase
      .from("transactions")
      .update({
        merchant,
        amount: Number(amount),
        category,
        description,
        reviewed: true
      })
      .eq("id", transaction.id);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Movimiento actualizado.");
    setEditing(false);
    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  async function remove() {
    if (!supabase) return;
    const confirmed = window.confirm("¿Borrar este movimiento?");
    if (!confirmed) return;

    setLoading(true);
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  return (
    <div className={`rounded-[1.25rem] border p-3 backdrop-blur ${positive ? "border-emerald-400/25 bg-emerald-50/55 dark:bg-emerald-400/8" : "border-rose-400/25 bg-rose-50/55 dark:bg-rose-400/8"}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/5 text-xl dark:bg-white/10">
          <DirectionIcon className={`h-5 w-5 ${positive ? "text-emerald-600" : "text-rose-600"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{transaction.merchant}</p>
            <Badge className={positive ? "shrink-0 bg-emerald-500/15 px-2 py-0.5 text-emerald-700" : "shrink-0 bg-rose-500/15 px-2 py-0.5 text-rose-700"}>{amountLabel}</Badge>
            {transaction.is_ai_categorized && <Badge className="shrink-0 px-2 py-0.5">IA · {transaction.category}</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {transaction.date} · {transaction.category} · {account?.institution ?? "Cuenta"}
          </p>
        </div>
        <p className={`text-right font-black tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          {hidden ? "••••" : `${positive ? "+" : "−"}${formatCurrency(Math.abs(transaction.amount))}`}
        </p>
        <div className="flex shrink-0 gap-1">
          <Button variant="glass" size="icon" onClick={() => setEditing((value) => !value)} aria-label="Editar movimiento">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="glass" size="icon" onClick={remove} disabled={loading} aria-label="Borrar movimiento">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Comercio" />
          <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Monto con signo" type="number" />
          <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categoría" />
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Nota" />
          <Button className="md:col-span-4" onClick={save} disabled={loading}>
            Guardar movimiento
          </Button>
        </div>
      )}
      {message && <p className="mt-2 rounded-2xl bg-sky-400/15 p-2 text-xs font-semibold">{message}</p>}
    </div>
  );
}
