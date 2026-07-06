"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Account } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export function AccountCard({ account, hidden }: { account: Account; hidden: boolean }) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState(account.institution);
  const [balance, setBalance] = useState(String(account.balance));
  const [icon, setIcon] = useState(account.icon);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!supabase || !name || !institution || balance === "") return;

    setLoading(true);
    const { error } = await supabase
      .from("accounts")
      .update({
        name,
        institution,
        balance: Number(balance),
        icon
      })
      .eq("id", account.id);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Cuenta actualizada.");
    setEditing(false);
    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  async function remove() {
    if (!supabase) return;
    const confirmed = window.confirm("Esto borrará la cuenta y sus movimientos. ¿Seguro?");
    if (!confirmed) return;

    setLoading(true);
    const { error } = await supabase.from("accounts").delete().eq("id", account.id);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  return (
    <article className={`rounded-[1.5rem] bg-gradient-to-br ${account.color} p-4 text-white shadow-glass`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-3xl">{account.icon}</div>
        <Badge className="border-white/25 bg-white/18 text-white">{account.last_update}</Badge>
      </div>
      <p className="mt-6 text-sm text-white/75">{account.institution}</p>
      <h3 className="text-lg font-black">{account.name}</h3>
      <p className="mt-2 text-3xl font-black">{hidden ? "••••••" : formatCurrency(account.balance)}</p>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-white/80">
        <span>{account.type.replace("_", " ")}</span>
        <span>{account.variation > 0 ? "+" : ""}{account.variation}%</span>
      </div>
      {editing && (
        <div className="mt-4 grid gap-2 rounded-2xl bg-black/15 p-3">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" />
          <Input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Institución" />
          <Input value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="Saldo" type="number" />
          <Input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="Icono" />
          <Button className="border-white/25 bg-white/18 text-white hover:bg-white/25" variant="glass" size="sm" onClick={save} disabled={loading}>
            Guardar cambios
          </Button>
        </div>
      )}
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <Button className="border-white/25 bg-white/18 text-white hover:bg-white/25" variant="glass" size="sm" onClick={() => setEditing((value) => !value)}>
          {editing ? "Cerrar edición" : "Editar"}
        </Button>
        <Button className="border-white/25 bg-white/18 text-white hover:bg-red-500/45" variant="glass" size="icon" onClick={remove} disabled={loading} aria-label="Borrar cuenta">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {message && <p className="mt-3 rounded-2xl bg-white/18 p-2 text-xs font-semibold">{message}</p>}
    </article>
  );
}
