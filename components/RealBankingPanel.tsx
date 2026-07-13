"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ExternalLink,
  Fingerprint,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import type { Account, Transaction } from "@/lib/types";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BankStatus = {
  supabase: boolean;
  encryption: boolean;
  providers: {
    simplefin: {
      configured: boolean;
      mode: string;
      createUrl: string;
    };
    fintoc: {
      configured: boolean;
      publicKeyConfigured: boolean;
      mode: string;
    };
    plaid: {
      configured: boolean;
      mode: string;
    };
  };
};

type Connection = {
  id: string;
  provider: string;
  institution: string;
  status: string;
  read_only: boolean;
  last_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
};

type ProfileDraft = {
  name: string;
  country: string;
  currency: string;
  main_bank: string;
  daily_budget: string;
  weekly_budget: string;
  monthly_budget: string;
  event_name: string;
  event_budget: string;
};

const defaultProfile: ProfileDraft = {
  name: "",
  country: "Chile",
  currency: "CLP",
  main_bank: "",
  daily_budget: "",
  weekly_budget: "",
  monthly_budget: "",
  event_name: "",
  event_budget: ""
};

export function RealBankingPanel({
  onLiveData,
  showPanel = true
}: {
  onLiveData: (data: { accounts: Account[]; transactions: Transaction[]; liveMode: boolean; budgets: { daily: number; weekly: number; monthly: number } }) => void;
  showPanel?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<BankStatus | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [simpleFinToken, setSimpleFinToken] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [institution, setInstitution] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [profile, setProfile] = useState<ProfileDraft>(defaultProfile);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};

    const currentSession = session ?? (await supabase.auth.getSession()).data.session;
    const token = currentSession?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session, supabase]);

  const loadLiveData = useCallback(async () => {
    if (!supabase || !session) {
      onLiveData({ accounts: [], transactions: [], liveMode: false, budgets: { daily: 0, weekly: 0, monthly: 0 } });
      return;
    }

    const [{ data: accounts }, { data: transactions }, { data: walletProfile }] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("date", { ascending: false }).limit(160),
      supabase.from("users").select("daily_budget,weekly_budget,monthly_budget").eq("id", session.user.id).maybeSingle()
    ]);

    const transactionRows = transactions ?? [];

    const mappedAccounts = (accounts ?? []).map((account) => ({
      id: account.id,
      user_id: account.user_id,
      name: account.name,
      institution: account.institution,
      type: account.type,
      balance: Number(account.balance ?? 0),
      currency: account.currency ?? "CLP",
      color: account.color ?? "from-sky-500 to-blue-700",
      icon: account.icon ?? "🏦",
      is_manual: Boolean(account.is_manual),
      is_hidden: Boolean(account.is_hidden),
      exclude_from_total: Boolean(account.exclude_from_total),
      variation: 0,
      last_update: "Sincronizada",
      created_at: account.created_at
    })) as Account[];

    const mappedTransactions = transactionRows.map((transaction) => ({
      id: transaction.id,
      user_id: transaction.user_id,
      account_id: transaction.account_id,
      merchant: transaction.merchant,
      amount: Number(transaction.amount ?? 0),
      date: transaction.date,
      category: transaction.category,
      description: transaction.description ?? "",
      is_recurring: Boolean(transaction.is_recurring),
      is_ai_categorized: Boolean(transaction.is_ai_categorized),
      reviewed: Boolean(transaction.reviewed),
      tags: ["banco"],
      created_at: transaction.created_at
    })) as Transaction[];

    onLiveData({
      accounts: mappedAccounts,
      transactions: mappedTransactions,
      liveMode: mappedAccounts.length > 0,
      budgets: {
        daily: Number(walletProfile?.daily_budget ?? 0),
        weekly: Number(walletProfile?.weekly_budget ?? 0),
        monthly: Number(walletProfile?.monthly_budget ?? 0)
      }
    });
  }, [onLiveData, session, supabase]);

  const loadConnections = useCallback(async () => {
    if (!session) return;

    const headers = await authHeaders();
    const response = await fetch("/api/bank/connections", { headers });
    const json = await response.json();
    setConnections(json.connections ?? []);
  }, [authHeaders, session]);

  const loadProfile = useCallback(async () => {
    if (!supabase || !session) return;

    const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single();

    if (!data) return;

    setProfile({
      name: data.name ?? "",
      country: data.country ?? "Chile",
      currency: data.currency ?? "CLP",
      main_bank: data.main_bank ?? "",
      daily_budget: data.daily_budget ? String(Math.round(Number(data.daily_budget))) : "",
      weekly_budget: data.weekly_budget ? String(Math.round(Number(data.weekly_budget))) : "",
      monthly_budget: data.monthly_budget ? String(Math.round(Number(data.monthly_budget))) : "",
      event_name: data.event_name ?? "",
      event_budget: data.event_budget ? String(Math.round(Number(data.event_budget))) : ""
    });
  }, [session, supabase]);

  useEffect(() => {
    if (showPanel) {
      fetch("/api/bank/status", { cache: "no-store" })
        .then((response) => response.json())
        .then(setStatus)
        .catch(() => setStatus(null));
    }

    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [showPanel, supabase]);

  useEffect(() => {
    void loadLiveData();
    if (showPanel) {
      void loadConnections();
      void loadProfile();
    }
  }, [loadConnections, loadLiveData, loadProfile, showPanel]);

  useEffect(() => {
    if (!supabase || !session) return;

    const reload = () => {
      void loadLiveData();
      if (showPanel) void loadConnections();
    };

    let channel = supabase
      .channel("wallet-live-balances")
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, reload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${session.user.id}` }, reload);

    if (showPanel) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "bank_connections" }, reload);
    }

    channel.subscribe();

    window.addEventListener("wallet-data-changed", reload);

    return () => {
      window.removeEventListener("wallet-data-changed", reload);
      void supabase.removeChannel(channel);
    };
  }, [loadConnections, loadLiveData, session, showPanel, supabase]);

  async function signIn() {
    if (!supabase || !email) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });
    setLoading(false);
    setMessage(error ? error.message : "Te envié un código al correo. Escríbelo en la pantalla inicial para entrar.");
  }

  async function signInWithOAuth(provider: "google" | "apple") {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${getSiteUrl()}auth/callback?next=/` }
    });
  }

  async function signInWithPasskey() {
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPasskey();
    setLoading(false);
    setMessage(error ? `Passkey no disponible: ${error.message}` : "Sesión iniciada con passkey.");
  }

  async function registerPasskey() {
    if (!supabase || !session) return;

    setLoading(true);
    const { error } = await supabase.auth.registerPasskey();
    setLoading(false);
    setMessage(error ? `No se pudo crear passkey: ${error.message}` : "Passkey creada. En iPhone puede usar FaceID.");
  }

  async function saveProfile() {
    if (!supabase || !session) return;

    setLoading(true);
    const { error } = await supabase.from("users").upsert(
      {
        id: session.user.id,
        email: session.user.email ?? "sin-email@wallet.app",
        name: profile.name || session.user.email?.split("@")[0] || "Wallet",
        country: profile.country || "Chile",
        currency: profile.currency || "CLP",
        main_bank: profile.main_bank,
        daily_budget: Number(profile.daily_budget || 0),
        weekly_budget: Number(profile.weekly_budget || 0),
        monthly_budget: Number(profile.monthly_budget || 0),
        event_name: profile.event_name,
        event_budget: Number(profile.event_budget || 0),
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );
    setLoading(false);
    setMessage(error ? error.message : "Perfil y presupuestos guardados.");
  }

  async function importSimpleFin() {
    if (!session || !simpleFinToken) return;

    setLoading(true);
    setMessage("Conectando banco read-only con SimpleFIN...");

    const response = await fetch("/api/bank/simplefin/import-setup-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: JSON.stringify({ setupToken: simpleFinToken })
    });
    const json = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(json.error ?? "No se pudo importar SimpleFIN.");
      return;
    }

    setSimpleFinToken("");
    setMessage("Banco conectado y saldo actualizado.");
    await loadConnections();
    await loadLiveData();
  }

  async function importFintocLink() {
    if (!session || !linkToken) return;

    setLoading(true);
    setMessage("Conectando banco read-only con Fintoc...");

    const response = await fetch("/api/bank/fintoc/import-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: JSON.stringify({ linkToken, institution })
    });
    const json = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(json.error ?? "No se pudo importar la conexión Fintoc.");
      return;
    }

    setLinkToken("");
    setInstitution("");
    setMessage("Banco conectado y sincronizado.");
    await loadConnections();
    await loadLiveData();
  }

  async function syncAll() {
    if (!session) return;

    setLoading(true);
    setMessage("Actualizando saldos de bancos conectados...");

    const response = await fetch("/api/bank/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: JSON.stringify({})
    });
    const json = await response.json();

    setLoading(false);
    setMessage(response.ok ? "Saldos y movimientos actualizados." : json.error ?? "No se pudo sincronizar.");
    await loadConnections();
    await loadLiveData();
  }

  const liveBalance = connections.length > 0 ? "Modo real activo" : "Sin bancos reales conectados";
  const ready = Boolean(status?.supabase && status.encryption && (status.providers.simplefin.configured || status.providers.fintoc.configured));

  if (!showPanel) return null;

  return (
    <GlassCard className="mb-5" glow>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={ready ? "bg-emerald-500 text-white" : "bg-yellow-400 text-slate-950"}>
              {ready ? "Banca real lista" : "Falta configuración real"}
            </Badge>
            <Badge>{liveBalance}</Badge>
            <Badge>Read-only</Badge>
            <Badge>{connections.length} banco(s)</Badge>
            <Badge>Tiempo real</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-black">Cuenta, seguridad y bancos</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Wallet conecta bancos mediante tokens read-only. No pide contraseñas bancarias, no guarda credenciales y no puede transferir dinero.
          </p>
          {status && !ready && (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <StatusPill ok={status.supabase} label="Supabase" />
              <StatusPill ok={status.encryption} label="Cifrado tokens" />
              <StatusPill ok={status.providers.simplefin.configured} label="SimpleFIN" />
              <StatusPill ok={status.providers.fintoc.configured} label="Fintoc API" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {session && (
            <Button onClick={syncAll} disabled={loading || connections.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar bancos
            </Button>
          )}
        </div>
      </div>

      {!supabase && (
        <p className="mt-4 rounded-2xl bg-yellow-400/20 p-3 text-sm font-semibold">
          Configura Supabase para crear cuentas.
        </p>
      )}

      {supabase && !session && (
        <div className="mt-5 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" type="email" />
            <Button onClick={signIn} disabled={loading || !email}>
              <ShieldCheck className="h-4 w-4" />
              Crear / entrar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="glass" onClick={signInWithPasskey} disabled={loading}>
              <Fingerprint className="h-4 w-4" />
              Entrar con FaceID/passkey
            </Button>
            <Button variant="glass" onClick={() => signInWithOAuth("google")}>
              <KeyRound className="h-4 w-4" />
              Google SSO
            </Button>
            <Button variant="glass" onClick={() => signInWithOAuth("apple")}>
              <KeyRound className="h-4 w-4" />
              Apple SSO
            </Button>
          </div>
        </div>
      )}

      {session && (
        <div className="mt-5 space-y-5">
          <div className="rounded-[1.5rem] bg-white/55 p-4 dark:bg-white/8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Onboarding personal</p>
                <h3 className="text-xl font-black">Tus datos y presupuestos base</h3>
              </div>
              <Button variant="glass" onClick={registerPasskey} disabled={loading}>
                <Fingerprint className="h-4 w-4" />
                Crear FaceID/passkey
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Input value={profile.name} onChange={(event) => setProfile((draft) => ({ ...draft, name: event.target.value }))} placeholder="Nombre" />
              <Input value={profile.country} onChange={(event) => setProfile((draft) => ({ ...draft, country: event.target.value }))} placeholder="País" />
              <Input value={profile.currency} onChange={(event) => setProfile((draft) => ({ ...draft, currency: event.target.value.toUpperCase() }))} placeholder="Moneda" />
              <Input value={profile.main_bank} onChange={(event) => setProfile((draft) => ({ ...draft, main_bank: event.target.value }))} placeholder="Banco que usas" />
              <Input value={profile.daily_budget} onChange={(event) => setProfile((draft) => ({ ...draft, daily_budget: event.target.value }))} placeholder="Presupuesto diario" inputMode="numeric" />
              <Input value={profile.weekly_budget} onChange={(event) => setProfile((draft) => ({ ...draft, weekly_budget: event.target.value }))} placeholder="Presupuesto semanal" inputMode="numeric" />
              <Input value={profile.monthly_budget} onChange={(event) => setProfile((draft) => ({ ...draft, monthly_budget: event.target.value }))} placeholder="Presupuesto mensual" inputMode="numeric" />
              <Input value={profile.event_name} onChange={(event) => setProfile((draft) => ({ ...draft, event_name: event.target.value }))} placeholder="Evento determinado" />
              <Input value={profile.event_budget} onChange={(event) => setProfile((draft) => ({ ...draft, event_budget: event.target.value }))} placeholder="Presupuesto evento" inputMode="numeric" />
              <Button onClick={saveProfile} disabled={loading} className="lg:col-span-3">
                <UserRound className="h-4 w-4" />
                Guardar perfil
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white/55 p-4 dark:bg-white/8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">SimpleFIN Bridge</p>
                  <h3 className="text-xl font-black">Conectar banco sin API key propia</h3>
                </div>
                <Button variant="glass" asChild>
                  <a href={status?.providers.simplefin.createUrl ?? "https://bridge.simplefin.org/simplefin/create"} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Autorizar
                  </a>
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Autoriza el banco fuera de Wallet, copia el setup token y pégalo aquí. Wallet solo guarda un acceso read-only cifrado.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input value={simpleFinToken} onChange={(event) => setSimpleFinToken(event.target.value)} placeholder="SimpleFIN setup token" type="password" />
                <Button onClick={importSimpleFin} disabled={loading || !simpleFinToken}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                  Conectar
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white/55 p-4 dark:bg-white/8">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Fintoc Chile</p>
                <h3 className="text-xl font-black">Opción Chile con proveedor nativo</h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Requiere FINTOC_API_KEY en producción. El token viene del flujo seguro de Fintoc, no de una contraseña bancaria.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Banco, ej. Banco de Chile" />
                <Input value={linkToken} onChange={(event) => setLinkToken(event.target.value)} placeholder="Fintoc link_token" type="password" />
                <Button onClick={importFintocLink} disabled={loading || !linkToken || !status?.providers.fintoc.configured}>
                  Conectar
                </Button>
              </div>
            </div>
          </div>

          {connections.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              {connections.map((connection) => (
                <div key={connection.id} className="rounded-2xl bg-white/55 p-3 text-sm dark:bg-white/8">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black">{connection.institution}</span>
                    <Badge>{connection.provider}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {connection.last_synced_at ? `Actualizado ${new Date(connection.last_synced_at).toLocaleString("es-CL")}` : "Pendiente de sincronizar"}
                  </p>
                  {connection.sync_error && <p className="mt-1 text-xs font-semibold text-red-500">{connection.sync_error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-4 rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold">{message}</p>}
    </GlassCard>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/55 px-3 py-2 dark:bg-white/8">
      <span>{label}</span>
      <span className={ok ? "font-black text-emerald-600" : "font-black text-orange-600"}>{ok ? "OK" : "Falta"}</span>
    </div>
  );
}
