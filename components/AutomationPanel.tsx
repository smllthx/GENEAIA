"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailSetupGuide } from "@/components/EmailSetupGuide";

type EmailAlias = {
  id: string;
  address: string;
  provider: string;
  status: string;
  verified_at: string | null;
};

type InboundStatus = {
  provider: string;
  domain: string;
  configured: boolean;
  checks: { domain: boolean; apiKey: boolean; webhookSecret: boolean; serviceRole: boolean };
};

type InboundMessage = {
  id: string;
  sender: string;
  subject: string | null;
  processing_status: string;
  received_at: string;
  metadata: { forwarding_confirmation_url?: string | null } | null;
};

export function AutomationPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [inboundStatus, setInboundStatus] = useState<InboundStatus | null>(null);
  const [inboundMessages, setInboundMessages] = useState<InboundMessage[]>([]);
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
    const [aliasResponse, messageResponse] = await Promise.all([
      fetch("/api/email-aliases", { headers }),
      fetch("/api/inbound-email/messages", { headers })
    ]);
    const [aliasJson, messageJson] = await Promise.all([
      aliasResponse.json(),
      messageResponse.json()
    ]);
    setAliases(aliasJson.aliases ?? []);
    setInboundMessages(messageJson.messages ?? []);
  }, [authHeaders, session]);

  useEffect(() => {
    if (!supabase) return;
    fetch("/api/inbound-email/status").then((response) => response.json()).then(setInboundStatus).catch(() => setInboundStatus(null));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

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

  async function saveEmailProvider(provider: string) {
    if (!supabase || !session) return;
    await supabase.from("users").update({
      email_provider: provider,
      notification_email: session.user.email ?? null,
      updated_at: new Date().toISOString()
    }).eq("id", session.user.id);
  }

  const activeAlias = aliases.find((alias) => alias.status !== "revoked");
  const guideAlias = activeAlias && inboundStatus?.configured && activeAlias.address.endsWith(`@${inboundStatus.domain}`) ? activeAlias : undefined;
  const confirmationUrl = inboundMessages.find((item) => item.metadata?.forwarding_confirmation_url)?.metadata?.forwarding_confirmation_url;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <EmailSetupGuide
        status={inboundStatus}
        alias={guideAlias}
        loading={loading}
        confirmationUrl={confirmationUrl}
        onCreateAlias={createAlias}
        onStartVerification={startVerification}
        onRefresh={loadAutomation}
        onSaveProvider={saveEmailProvider}
      />

      <div className="space-y-5">
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-muted-foreground">Bandeja automatica</p><h2 className="text-xl font-black">Correos recibidos</h2></div>
            <Button variant="glass" size="icon" onClick={() => loadAutomation()} aria-label="Actualizar correos"><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <div className="mt-4 space-y-2">
            {inboundMessages.length === 0 ? (
              <div className="rounded-2xl bg-white/55 p-4 text-sm dark:bg-white/8"><p className="font-black">Esperando tu primera prueba</p><p className="mt-1 text-muted-foreground">Los avisos del banco apareceran aqui y luego en Movimientos.</p></div>
            ) : inboundMessages.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white/55 p-3 text-sm dark:bg-white/8">
                <div className="min-w-0"><p className="truncate font-black">{item.subject || "Correo bancario"}</p><p className="truncate text-xs text-muted-foreground">{item.sender}</p></div>
                <Badge>{item.processing_status === "stored" ? "Movimiento creado" : "Por revisar"}</Badge>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-black">Solo reenvio, nunca acceso total</h2><p className="mt-1 text-sm text-muted-foreground">Wallet no entra a tu correo. Solo procesa los mensajes bancarios que tu regla envia al alias privado.</p></div>
          </div>
        </GlassCard>
      </div>

      {message && <p className="xl:col-span-2 rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold" role="status">{message}</p>}
    </div>
  );
}

function humanError(_code: string) {
  return "No pudimos completar la accion. Intenta nuevamente.";
}
