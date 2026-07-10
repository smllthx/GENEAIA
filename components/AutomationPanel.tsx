"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileCheck2,
  FileText,
  Inbox,
  Link2,
  Loader2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Upload
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type EmailAlias = {
  id: string;
  address: string;
  provider: string;
  status: string;
  verified_at: string | null;
};

type StatementRow = {
  id: string;
  row_index: number;
  transaction_date: string | null;
  raw_description: string;
  debit: number | string | null;
  credit: number | string | null;
  extraction_confidence: number | string;
};

type ProcessingJob = {
  id: string;
  status: string;
  progress: number;
  error_code: string | null;
};

type Statement = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  account_id: string | null;
  statement_rows: StatementRow[];
  processing_jobs: ProcessingJob | ProcessingJob[] | null;
};

type Reconciliation = {
  id: string;
  score: number;
  matched_fields: string[];
  decision: string;
  transactions: { merchant: string; amount: number | string; date: string } | Array<{ merchant: string; amount: number | string; date: string }>;
  statement_rows: { raw_description: string; debit: number | string | null; credit: number | string | null } | Array<{ raw_description: string; debit: number | string | null; credit: number | string | null }>;
};

const statusCopy: Record<string, string> = {
  received: "Recibimos tu cartola",
  extracting_text: "Extrayendo movimientos",
  parsing_tables: "Leyendo tablas",
  needs_review: "Revision lista",
  imported: "Movimientos importados",
  failed: "Necesita atencion",
  pending: "Pendiente",
  testing: "Comprobando reenvio",
  active: "Activo",
  revoked: "Revocado"
};

export function AutomationPanel({ accounts }: { accounts: Account[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [matches, setMatches] = useState<Reconciliation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};
    const activeSession = session ?? (await supabase.auth.getSession()).data.session;
    return activeSession?.access_token ? { Authorization: `Bearer ${activeSession.access_token}` } : {};
  }, [session, supabase]);

  const loadAutomation = useCallback(async () => {
    if (!session) return;
    const headers = await authHeaders();
    const [aliasResponse, statementResponse, matchResponse] = await Promise.all([
      fetch("/api/email-aliases", { headers }),
      fetch("/api/statements", { headers }),
      fetch("/api/reconciliation", { headers })
    ]);
    const [aliasJson, statementJson, matchJson] = await Promise.all([
      aliasResponse.json(),
      statementResponse.json(),
      matchResponse.json()
    ]);
    setAliases(aliasJson.aliases ?? []);
    setStatements(statementJson.statements ?? []);
    setMatches(matchJson.matches ?? []);
  }, [authHeaders, session]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!selectedAccount && accounts[0]) setSelectedAccount(accounts[0].id);
  }, [accounts, selectedAccount]);

  useEffect(() => {
    void loadAutomation();
  }, [loadAutomation]);

  async function createAlias() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/email-aliases", { method: "POST", headers: await authHeaders() });
    const json = await response.json();
    setLoading(false);
    setMessage(response.ok
      ? json.receivingConfigured ? "Alias creado y listo para verificar." : "Alias reservado. Falta configurar el dominio de recepcion en Vercel."
      : humanError(json.error));
    if (response.ok) await loadAutomation();
  }

  async function startVerification(aliasId: string) {
    setLoading(true);
    const response = await fetch("/api/email-verifications/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ aliasId })
    });
    const json = await response.json();
    setLoading(false);
    setMessage(response.ok ? json.message : humanError(json.error));
    await loadAutomation();
  }

  async function uploadStatement() {
    if (!file) return;
    setLoading(true);
    setMessage("Subiendo y leyendo la cartola...");
    const formData = new FormData();
    formData.append("file", file);
    if (selectedAccount) formData.append("accountId", selectedAccount);
    const response = await fetch("/api/statements", { method: "POST", headers: await authHeaders(), body: formData });
    const json = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Revision lista: ${json.extractedRows} movimientos encontrados.` : humanError(json.error));
    if (response.ok) {
      setFile(null);
      await loadAutomation();
    }
  }

  async function importStatement(statementId: string) {
    setLoading(true);
    const response = await fetch(`/api/statements/${statementId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ accountId: selectedAccount || undefined })
    });
    const json = await response.json();
    setLoading(false);
    setMessage(response.ok ? `${json.created} movimientos creados y ${json.matched} conciliados sin duplicar.` : humanError(json.error));
    if (response.ok) {
      window.dispatchEvent(new Event("wallet-data-changed"));
      await loadAutomation();
    }
  }

  async function confirmMatch(matchId: string) {
    setLoading(true);
    const response = await fetch(`/api/reconciliation/${matchId}/confirm`, { method: "POST", headers: await authHeaders() });
    const json = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Coincidencia confirmada. No se creo un gasto duplicado." : humanError(json.error));
    if (response.ok) {
      window.dispatchEvent(new Event("wallet-data-changed"));
      await loadAutomation();
    }
  }

  const activeAlias = aliases.find((alias) => alias.status !== "revoked");

  return (
    <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
      <div className="space-y-5">
        <GlassCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Correos bancarios</p>
              <h2 className="text-2xl font-black">Alias privado</h2>
            </div>
            <Badge><ShieldCheck className="mr-1 h-3 w-3" />Sin claves</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Reenvia solo las notificaciones bancarias. Wallet no necesita acceso a tu bandeja de entrada.
          </p>
          {activeAlias ? (
            <div className="mt-4 rounded-2xl bg-white/60 p-4 dark:bg-white/8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-black">{activeAlias.address}</p>
                  <p className="text-xs text-muted-foreground">{statusCopy[activeAlias.status] ?? activeAlias.status}</p>
                </div>
                <Button variant="glass" size="icon" aria-label="Copiar alias" onClick={() => navigator.clipboard.writeText(activeAlias.address)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="mt-3 w-full" variant="glass" onClick={() => startVerification(activeAlias.id)} disabled={loading || activeAlias.status === "active"}>
                <MailCheck className="h-4 w-4" />
                {activeAlias.status === "active" ? "Reenvio verificado" : "Comprobar reenvio"}
              </Button>
            </div>
          ) : (
            <Button className="mt-4 w-full" onClick={createAlias} disabled={loading}>
              <Inbox className="h-4 w-4" />Crear mi alias
            </Button>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black">Privacidad por diseno</h2>
              <p className="mt-1 text-sm text-muted-foreground">Los PDF son privados. Se conserva la evidencia estructurada y nunca se registran documentos completos en logs.</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-5">
        <GlassCard glow>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Cartolas PDF</p>
              <h2 className="text-2xl font-black">Importar y revisar</h2>
            </div>
            <Upload className="h-6 w-6 text-sky-500" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-sky-400/60 bg-sky-400/8 p-4 text-center">
              <FileText className="h-6 w-6 text-sky-500" />
              <span className="mt-2 text-sm font-black">{file?.name ?? "Seleccionar PDF"}</span>
              <span className="text-xs text-muted-foreground">Maximo 10 MB</span>
              <input className="sr-only" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="statement-account">Cuenta asociada</label>
              <select
                id="statement-account"
                className="h-11 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm dark:bg-slate-900/80"
                value={selectedAccount}
                onChange={(event) => setSelectedAccount(event.target.value)}
              >
                <option value="">Seleccionar automaticamente</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
              <Button className="w-full" onClick={uploadStatement} disabled={loading || !file}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Procesar cartola
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Documentos</h2>
            <Button variant="glass" size="icon" onClick={() => loadAutomation()} aria-label="Actualizar documentos">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {statements.length === 0 ? (
              <div className="rounded-2xl bg-white/55 p-4 text-sm dark:bg-white/8">
                <p className="font-black">Aun no hay cartolas</p>
                <p className="mt-1 text-muted-foreground">Sube un PDF para extraer sus movimientos.</p>
              </div>
            ) : statements.map((statement) => {
              const job = Array.isArray(statement.processing_jobs) ? statement.processing_jobs[0] : statement.processing_jobs;
              return (
                <div key={statement.id} className="rounded-2xl bg-white/55 p-4 dark:bg-white/8">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black">{statement.file_name}</p>
                      <p className="text-xs text-muted-foreground">{statusCopy[statement.status] ?? statement.status} · {statement.statement_rows?.length ?? 0} filas</p>
                    </div>
                    {statement.status === "failed" ? <AlertTriangle className="h-5 w-5 text-orange-500" /> : <FileCheck2 className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <Progress className="mt-3" value={job?.progress ?? (statement.status === "imported" ? 100 : 0)} />
                  {statement.statement_rows?.slice(0, 3).map((row) => (
                    <div key={row.id} className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">{row.raw_description}</span>
                      <span className="shrink-0 font-bold">{formatCurrency(Number(row.credit ?? 0) || -Number(row.debit ?? 0))}</span>
                    </div>
                  ))}
                  {statement.status === "needs_review" && statement.statement_rows?.length > 0 && (
                    <Button className="mt-3 w-full" onClick={() => importStatement(statement.id)} disabled={loading || accounts.length === 0}>
                      <Link2 className="h-4 w-4" />Importar y conciliar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>

        {matches.length > 0 && (
          <GlassCard>
            <h2 className="text-xl font-black">Coincidencias sugeridas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Revisa antes de confirmar. Wallet evita crear el mismo gasto dos veces.</p>
            <div className="mt-4 space-y-3">
              {matches.map((match) => {
                const transaction = Array.isArray(match.transactions) ? match.transactions[0] : match.transactions;
                const row = Array.isArray(match.statement_rows) ? match.statement_rows[0] : match.statement_rows;
                return (
                  <div key={match.id} className="rounded-2xl bg-white/55 p-4 dark:bg-white/8">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{transaction?.merchant ?? "Movimiento"}</p>
                        <p className="text-xs text-muted-foreground">Coincide con {row?.raw_description ?? "fila de cartola"}</p>
                      </div>
                      <Badge>{match.score} puntos</Badge>
                    </div>
                    <Button className="mt-3 w-full" variant="glass" onClick={() => confirmMatch(match.id)} disabled={loading}>
                      <CheckCircle2 className="h-4 w-4" />Confirmar coincidencia
                    </Button>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>

      {message && <p className="xl:col-span-2 rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold" role="status">{message}</p>}
    </div>
  );
}

function humanError(code: string) {
  const messages: Record<string, string> = {
    STATEMENT_DUPLICATE: "Esta cartola ya fue importada.",
    STATEMENT_PASSWORD_PROTECTED: "La cartola esta protegida. Exporta una copia sin clave.",
    STATEMENT_UNSUPPORTED: "El archivo no es un PDF valido.",
    STATEMENT_PARSE_FAILED: "No pudimos leer esta cartola. Quedo marcada para revision.",
    UPLOAD_TOO_LARGE: "El PDF supera el limite de 10 MB.",
    MALWARE_DETECTED: "El PDF contiene acciones no permitidas y fue rechazado.",
    ACCOUNT_REQUIRED: "Agrega o conecta una cuenta antes de importar movimientos."
  };
  return messages[code] ?? "No pudimos completar la accion. Intenta nuevamente.";
}
