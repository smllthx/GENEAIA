"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Landmark, Search, ShieldCheck } from "lucide-react";
import type { Account } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { AccountCard } from "@/components/AccountCard";
import { GlassCard } from "@/components/GlassCard";
import { AppleWalletImportModal, ConnectBankModal, ManualAccountModal } from "@/components/Modals";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function AccountsView({ accounts, hidden, bankingPanel }: { accounts: Account[]; hidden: boolean; bankingPanel?: ReactNode }) {
  const [query, setQuery] = useState("");
  const visibleAccounts = useMemo(() => accounts.filter((account) => [account.name, account.institution, account.type].join(" ").toLocaleLowerCase("es-CL").includes(query.toLocaleLowerCase("es-CL"))), [accounts, query]);
  const total = accounts.filter((account) => !account.is_hidden && !account.exclude_from_total).reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Tu dinero, en un lugar</p><h2 className="text-4xl font-black sm:text-5xl">Cuentas</h2></div>
        <div className="flex flex-wrap gap-2"><ConnectBankModal /><ManualAccountModal /><ManualAccountModal cash /><AppleWalletImportModal /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <GlassCard glow><p className="text-sm font-semibold text-muted-foreground">Saldo total visible</p><p className="mt-2 text-4xl font-black">{hidden ? "••••••" : formatCurrency(total)}</p><Badge className="mt-3">{accounts.length} cuenta(s)</Badge></GlassCard>
        <GlassCard><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-6 w-6 text-emerald-500" /><div><h3 className="font-black">Conexión segura y read-only</h3><p className="mt-1 text-sm text-muted-foreground">Wallet puede leer saldos y movimientos, pero no transferir dinero. Los tokens se guardan cifrados.</p></div></div></GlassCard>
      </div>
      {bankingPanel}
      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-muted-foreground">Bancos, tarjetas, efectivo y billeteras</p><h3 className="text-2xl font-black">Tus cuentas</h3></div>
          <div className="relative w-full sm:w-72"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cuenta" /></div>
        </div>
        {visibleAccounts.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleAccounts.map((account) => <AccountCard key={account.id} account={account} hidden={hidden} />)}</div> : <div className="rounded-[1.4rem] bg-white/55 p-6 text-center dark:bg-white/8"><Landmark className="mx-auto h-8 w-8 text-orange-500" /><p className="mt-3 font-black">{accounts.length === 0 ? "Agrega tu primera cuenta" : "No encontramos esa cuenta"}</p><p className="mt-1 text-sm text-muted-foreground">Puedes conectarla, crearla manualmente o registrar efectivo.</p></div>}
      </GlassCard>
    </div>
  );
}
