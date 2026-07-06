"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Account, Transaction } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

const categoryIcon: Record<string, string> = {
  Comida: "🍽️",
  Transporte: "🚇",
  Suscripciones: "🔁",
  Salud: "💚",
  Estudios: "🎓",
  Ocio: "🎧",
  Mascota: "🐾",
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
    <div className="rounded-[1.25rem] bg-white/55 p-3 backdrop-blur dark:bg-white/8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/5 text-xl dark:bg-white/10">
          {categoryIcon[transaction.category] ?? "•"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{transaction.merchant}</p>
            {transaction.is_ai_categorized && <Badge className="shrink-0 px-2 py-0.5">IA</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {transaction.date} · {transaction.category} · {account?.institution ?? "Cuenta"}
          </p>
        </div>
        <p className={`text-right font-black ${positive ? "text-emerald-600" : ""}`}>
          {hidden ? "••••" : formatCurrency(transaction.amount)}
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
