"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ExternalLink, KeyRound, Plus, Upload } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AccountOption = {
  id: string;
  name: string;
  institution: string;
};

export function AddTransactionModal() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) return;
    void loadAccounts();
  }, [session, supabase]);

  async function loadAccounts() {
    const { data } = await supabase!
      .from("accounts")
      .select("id, name, institution")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as AccountOption[];
    setAccounts(rows);
    setAccountId((current) => current || rows[0]?.id || "");
  }

  async function save() {
    if (!supabase || !session || !accountId || !merchant || !amount || !category) {
      setMessage("Completa cuenta, comercio, monto y categoría.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: session.user.id,
      account_id: accountId,
      merchant,
      amount: -Math.abs(Number(amount)),
      date: new Date().toISOString().slice(0, 10),
      category,
      description: "Movimiento manual",
      is_recurring: false,
      is_ai_categorized: false,
      reviewed: false
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMerchant("");
    setAmount("");
    setCategory("");
    setMessage("Movimiento guardado.");
    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="glass"><Plus className="h-4 w-4" />Registrar pago</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>Guarda un gasto real en una de tus cuentas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {accounts.length > 0 ? (
            <select className="h-11 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm font-semibold outline-none dark:bg-white/10" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>
              ))}
            </select>
          ) : (
            <p className="rounded-2xl bg-yellow-400/15 p-3 text-sm font-semibold">Primero agrega una cuenta o efectivo.</p>
          )}
          <Input placeholder="Comercio" value={merchant} onChange={(event) => setMerchant(event.target.value)} />
          <Input placeholder="Monto" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Input placeholder="Categoría" value={category} onChange={(event) => setCategory(event.target.value)} />
          <Button className="w-full" onClick={save} disabled={loading || accounts.length === 0}>Guardar movimiento</Button>
          {message && <p className="rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ManualAccountModal({ cash = false }: { cash?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState(cash ? "Efectivo" : "");
  const [institution, setInstitution] = useState(cash ? "Efectivo" : "");
  const [balance, setBalance] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function save() {
    if (!supabase || !session || !name || !institution || balance === "") {
      setMessage("Completa nombre, institución y saldo.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("accounts").insert({
      user_id: session.user.id,
      name,
      institution,
      type: cash ? "cash" : "checking",
      balance: Number(balance),
      currency: "CLP",
      color: cash ? "from-amber-400 to-orange-600" : "from-sky-500 to-blue-700",
      icon: cash ? "💵" : "🏦",
      is_manual: true,
      is_hidden: false,
      exclude_from_total: false
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setName(cash ? "Efectivo" : "");
    setInstitution(cash ? "Efectivo" : "");
    setBalance("");
    setMessage("Cuenta guardada.");
    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="glass"><Plus className="h-4 w-4" />{cash ? "Agregar efectivo" : "Agregar cuenta manual"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cash ? "Agregar efectivo" : "Agregar cuenta manual"}</DialogTitle>
          <DialogDescription>Esto se suma al saldo total y queda guardado en tu cuenta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Banco o institución" value={institution} onChange={(event) => setInstitution(event.target.value)} />
          <Input placeholder="Saldo actual" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} />
          <Button className="w-full" onClick={save} disabled={loading}>Guardar</Button>
          {message && <p className="rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectBankModal() {
  const supabase = useMemo(() => createClient(), []);
  const [username, setUsername] = useState("wallet_test");
  const [password, setPassword] = useState("read-only-2026");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function connectSandbox() {
    if (!supabase) return;

    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setLoading(false);
      setMessage("Inicia sesión antes de conectar un banco.");
      return;
    }

    const response = await fetch("/api/bank/sandbox/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username, password })
    });
    const json = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(json.error ?? "No se pudo conectar Sandbox Bank.");
      return;
    }

    setMessage("Sandbox Bank conectado. Saldos y movimientos actualizados.");
    window.dispatchEvent(new Event("wallet-data-changed"));
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><Building2 className="h-4 w-4" />Conectar banco</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conexión bancaria segura</DialogTitle>
          <DialogDescription>
            Usa SimpleFIN para autorizar una conexión read-only. Wallet no pide ni guarda contraseñas bancarias.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="rounded-[1.4rem] bg-white/55 p-4 dark:bg-white/8">
            <p className="text-sm font-black">Banco sandbox con credenciales de prueba</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No son credenciales bancarias reales. Sirven para probar saldos, movimientos e IA.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Usuario sandbox" />
              <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Clave sandbox" type="password" />
              <Button onClick={connectSandbox} disabled={loading}>
                <KeyRound className="h-4 w-4" />
                Linkear saldo
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Prueba: usuario <strong>wallet_test</strong> · clave <strong>read-only-2026</strong>
            </p>
          </div>
          <Button asChild>
            <a href="https://bridge.simplefin.org/simplefin/create" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Autorizar con SimpleFIN
            </a>
          </Button>
          <p className="rounded-2xl bg-white/50 p-3 text-sm text-muted-foreground dark:bg-white/8">
            Después de autorizar, copia el setup token y pégalo en “Cuenta, seguridad y bancos”.
          </p>
          <Button variant="glass" disabled>Fintoc Chile requiere clave de proveedor</Button>
          <Button variant="glass" disabled>Plaid / TrueLayer / Tink preparados para futura integración</Button>
          {message && <p className="rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppleWalletImportModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="glass"><Upload className="h-4 w-4" />Apple Wallet Sync</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apple Wallet Sync</DialogTitle>
          <DialogDescription>
            Apple Wallet no entrega una sincronización web completa. Por ahora registra pagos manuales y usa CSV cuando esté disponible.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button variant="glass" disabled>Importar CSV próximamente</Button>
          <Button variant="glass" disabled>Shortcut iPhone próximamente</Button>
          <p className="rounded-2xl bg-white/50 p-3 text-sm text-muted-foreground dark:bg-white/8">
            Para registrar un pago ahora, usa “Registrar pago”.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
