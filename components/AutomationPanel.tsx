"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  RefreshCw
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
  const [emailProvider, setEmailProvider] = useState("gmail");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};
    const activeSession = session ?? (await supabase.auth.getSession()).data.session;
    return activeSession?.access_token ? { Authorization: `Bearer ${activeSession.access_token}` } : {};
  }, [session, supabase]);

  const loadAutomation = useCallback(async () => {
    if (!session) return;
    try {
      const headers = await authHeaders();
      const [aliasResponse, messageResponse, profileResponse] = await Promise.all([
        fetch("/api/email-aliases", { headers, cache: "no-store" }),
        fetch("/api/inbound-email/messages", { headers, cache: "no-store" }),
        supabase?.from("users").select("email_provider").eq("id", session.user.id).maybeSingle()
      ]);
      if (!aliasResponse.ok || !messageResponse.ok) throw new Error("automation_load_failed");
      const [aliasJson, messageJson] = await Promise.all([
        aliasResponse.json(),
        messageResponse.json()
      ]);
      setAliases(aliasJson.aliases ?? []);
      setInboundMessages(messageJson.messages ?? []);
      if (profileResponse?.data?.email_provider) setEmailProvider(profileResponse.data.email_provider);
      setMessage("");
    } catch {
      setMessage("No se pudo actualizar el correo. Revisa tu conexión e intenta nuevamente.");
    }
  }, [authHeaders, session, supabase]);

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

  useEffect(() => {
    if (!supabase || !session) return;

    const reload = () => {
      void loadAutomation();
      window.dispatchEvent(new Event("wallet-data-changed"));
    };
    const channel = supabase
      .channel(`wallet-email-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_aliases", filter: `user_id=eq.${session.user.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbound_messages", filter: `user_id=eq.${session.user.id}` }, reload)
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadAutomation();
    };
    const interval = window.setInterval(onVisible, 30_000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [loadAutomation, session, supabase]);

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
    setEmailProvider(provider);
    const { error } = await supabase.from("users").update({
      email_provider: provider,
      notification_email: session.user.email ?? null,
      updated_at: new Date().toISOString()
    }).eq("id", session.user.id);
    if (error) setMessage("No se pudo guardar el proveedor de correo.");
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
        initialProvider={emailProvider}
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

      </div>

      {message && <p className="xl:col-span-2 rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold" role="status">{message}</p>}
    </div>
  );
}

function humanError(_code: string) {
  return "No pudimos completar la accion. Intenta nuevamente.";
}
