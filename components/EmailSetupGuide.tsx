"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, ExternalLink, Inbox, Mail, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/GlassCard";

type Alias = { id: string; address: string; status: string };
type Status = { provider: string; domain: string; configured: boolean } | null;

const providers = [
  { id: "gmail", label: "Gmail", copy: "Correo de Google" },
  { id: "outlook", label: "Outlook", copy: "Hotmail o Microsoft" },
  { id: "icloud", label: "iCloud", copy: "Correo de Apple" },
  { id: "other", label: "Otro", copy: "Proveedor diferente" }
];

const instructions: Record<string, string[]> = {
  gmail: ["Abre Gmail en un computador.", "Ve a Configuracion > Ver toda la configuracion.", "En Reenvio y POP/IMAP, agrega tu alias de Wallet.", "Vuelve a Wallet cuando Gmail envie la confirmacion."],
  outlook: ["Abre Outlook en la web.", "Ve a Configuracion > Correo > Reenvio.", "Activa el reenvio hacia tu alias de Wallet.", "Conserva una copia en Outlook y guarda."],
  icloud: ["Abre Mail en iCloud.com.", "Ve a Configuracion > Reenvio.", "Activa reenviar mi correo e ingresa tu alias.", "Guarda y vuelve a Wallet para probar."],
  other: ["Abre la configuracion de tu correo.", "Busca Reenvio, Filtros o Reglas.", "Reenvia solo mensajes de tu banco al alias.", "Vuelve a Wallet y envia una prueba."]
};

const settingsLinks: Record<string, string> = {
  gmail: "https://mail.google.com/mail/u/0/#settings/fwdandpop",
  outlook: "https://outlook.live.com/mail/0/options/mail/forwarding",
  icloud: "https://www.icloud.com/mail/"
};

export function EmailSetupGuide({
  status,
  alias,
  loading,
  confirmationUrl,
  onCreateAlias,
  onStartVerification,
  onRefresh,
  onSaveProvider
}: {
  status: Status;
  alias?: Alias;
  loading: boolean;
  confirmationUrl?: string | null;
  onCreateAlias: () => Promise<void>;
  onStartVerification: (aliasId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSaveProvider: (provider: string) => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState("gmail");

  useEffect(() => {
    if (alias?.status === "active") setStep(4);
  }, [alias?.status]);

  async function nextFromProvider() {
    await onSaveProvider(provider);
    setStep(2);
  }

  return (
    <GlassCard glow>
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-muted-foreground">Configuracion guiada</p><h2 className="text-2xl font-black">Enlaza tu correo</h2></div>
        <Badge>Paso {step} de 4</Badge>
      </div>
      <Progress className="mt-3" value={step * 25} />

      {step === 1 && (
        <div className="mt-6">
          <Mail className="h-9 w-9 text-sky-500" />
          <h3 className="mt-4 text-xl font-black">¿Donde recibes los correos del banco?</h3>
          <p className="mt-2 text-sm text-muted-foreground">Wallet solo recibira los mensajes que tu decidas reenviar.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {providers.map((item) => (
              <button key={item.id} type="button" onClick={() => setProvider(item.id)} className={`min-h-20 rounded-2xl border p-3 text-left transition ${provider === item.id ? "border-sky-500 bg-sky-500/12" : "border-white/35 bg-white/45 dark:bg-white/6"}`}>
                <span className="font-black">{item.label}</span><span className="mt-1 block text-xs text-muted-foreground">{item.copy}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <Inbox className="h-9 w-9 text-indigo-500" />
          <h3 className="mt-4 text-xl font-black">Crea tu direccion privada</h3>
          <p className="mt-2 text-sm text-muted-foreground">Es unica para tu cuenta y sirve solo para recibir notificaciones.</p>
          {!status?.configured ? (
            <div className="mt-4 rounded-2xl bg-orange-400/12 p-4 text-sm font-semibold text-orange-700 dark:text-orange-200">Wallet esta esperando la activacion de Resend. Podras continuar cuando el servicio aparezca activo.</div>
          ) : alias ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/60 p-4 dark:bg-white/8"><span className="min-w-0 truncate font-black">{alias.address}</span><Button variant="glass" size="icon" aria-label="Copiar alias" onClick={() => navigator.clipboard.writeText(alias.address)}><Copy className="h-4 w-4" /></Button></div>
          ) : (
            <Button className="mt-4 w-full" onClick={onCreateAlias} disabled={loading}><Inbox className="h-4 w-4" />Crear mi alias</Button>
          )}
        </div>
      )}

      {step === 3 && alias && (
        <div className="mt-6">
          <Send className="h-9 w-9 text-violet-500" />
          <h3 className="mt-4 text-xl font-black">Activa el reenvio en {providers.find((item) => item.id === provider)?.label}</h3>
          <div className="mt-4 space-y-2">
            {instructions[provider].map((instruction, index) => <div key={instruction} className="flex gap-3 rounded-2xl bg-white/55 p-3 text-sm dark:bg-white/8"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-black text-background">{index + 1}</span><span className="pt-1 font-semibold">{instruction}</span></div>)}
          </div>
          {settingsLinks[provider] && <Button asChild variant="glass" className="mt-4 w-full"><a href={settingsLinks[provider]} target="_blank" rel="noreferrer">Abrir configuracion de {providers.find((item) => item.id === provider)?.label}<ExternalLink className="h-4 w-4" /></a></Button>}
          {confirmationUrl && <Button asChild className="mt-2 w-full"><a href={confirmationUrl} target="_blank" rel="noreferrer">Confirmar reenvio recibido<CheckCircle2 className="h-4 w-4" /></a></Button>}
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 text-center">
          {alias?.status === "active" ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /> : <ShieldCheck className="mx-auto h-12 w-12 text-sky-500" />}
          <h3 className="mt-4 text-2xl font-black">{alias?.status === "active" ? "Correo enlazado" : "Haz una prueba"}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{alias?.status === "active" ? "Wallet ya puede recibir notificaciones y dejarlas listas para revisar." : "Reenvia un correo bancario reciente a tu alias y luego comprueba la llegada."}</p>
          {alias && alias.status !== "active" && <Button className="mt-4" onClick={() => onStartVerification(alias.id)} disabled={loading}><Send className="h-4 w-4" />Ya envie la prueba</Button>}
          <Button className="mt-4" variant="glass" onClick={onRefresh} disabled={loading}><RefreshCw className="h-4 w-4" />Comprobar ahora</Button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button variant="glass" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}><ArrowLeft className="h-4 w-4" />Atras</Button>
        {step === 1 && <Button onClick={nextFromProvider}>Continuar<ArrowRight className="h-4 w-4" /></Button>}
        {step === 2 && <Button onClick={() => setStep(3)} disabled={!alias}>Continuar<ArrowRight className="h-4 w-4" /></Button>}
        {step === 3 && <Button onClick={() => setStep(4)}>Ya lo configure<ArrowRight className="h-4 w-4" /></Button>}
      </div>
    </GlassCard>
  );
}
