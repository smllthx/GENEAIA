"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Brain, Check, Eye, EyeOff, Fingerprint, KeyRound, Loader2, RotateCcw, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { defaultAdaptivePreferences, sectionLabels, tabLabels, type AdaptivePreferences } from "@/lib/adaptive-preferences";
import { InstallPWAButton } from "@/components/InstallPWAButton";

export { defaultAdaptivePreferences } from "@/lib/adaptive-preferences";
export type { AdaptivePreferences } from "@/lib/adaptive-preferences";

const profileOrders: Record<AdaptivePreferences["profile"], string[]> = {
  auto: ["inicio", "movimientos", "suscripciones", "presupuesto", "cuentas"],
  tea: ["inicio", "movimientos", "presupuesto", "suscripciones", "cuentas"],
  tdah: ["inicio", "movimientos", "presupuesto", "cuentas", "suscripciones"],
  personal: defaultAdaptivePreferences.tabOrder
};

const profiles = [
  { id: "auto" as const, label: "Automático", copy: "Equilibrado y simple", icon: Sparkles },
  { id: "tea" as const, label: "TEA", copy: "Predecible y calmado", icon: Check },
  { id: "tdah" as const, label: "TDAH", copy: "Acciones breves y foco", icon: Brain },
  { id: "personal" as const, label: "Para mí", copy: "Orden totalmente manual", icon: SlidersHorizontal }
];

export function AdaptiveSettings({
  open,
  value,
  onChange,
  onClose,
  syncState
}: {
  open: boolean;
  value: AdaptivePreferences;
  onChange: (value: AdaptivePreferences) => void;
  onClose: () => void;
  syncState: "local" | "saving" | "synced" | "error";
}) {
  if (!open) return null;

  function chooseProfile(profile: AdaptivePreferences["profile"]) {
    onChange({
      ...value,
      profile,
      reduceMotion: profile === "tea" ? true : value.reduceMotion,
      density: profile === "tdah" ? "compact" : "comfortable",
      tabOrder: [...profileOrders[profile]]
    });
  }

  function moveTab(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.tabOrder.length) return;
    const next = [...value.tabOrder];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...value, profile: "personal", tabOrder: next });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.sectionOrder.length) return;
    const next = [...value.sectionOrder];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...value, profile: "personal", sectionOrder: next });
  }

  function toggleSection(section: string) {
    const hiddenSections = value.hiddenSections.includes(section)
      ? value.hiddenSections.filter((item) => item !== section)
      : [...value.hiddenSections, section];
    onChange({ ...value, profile: "personal", hiddenSections });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/20 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Personalizar experiencia">
      <GlassCard className="max-h-[88vh] w-full max-w-2xl overflow-y-auto border-white/70 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">Experiencia adaptable</p>
            <h2 className="mt-1 text-2xl font-black">Haz que Wallet fluya contigo</h2>
            <p className="mt-1 text-sm text-muted-foreground">{syncState === "saving" ? "Guardando cambios..." : syncState === "error" ? "Guardado local; se reintentara la sincronizacion." : "Sincronizado con tu cuenta."}</p>
          </div>
          <Button variant="glass" size="icon" onClick={onClose} aria-label="Cerrar personalización"><X className="h-4 w-4" /></Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {profiles.map((profile) => {
            const Icon = profile.icon;
            const selected = value.profile === profile.id;
            return (
              <button key={profile.id} onClick={() => chooseProfile(profile.id)} className={cn("rounded-[1.35rem] border p-3 text-left transition", selected ? "border-sky-400 bg-sky-400/15 shadow-sm" : "border-white/45 bg-white/45 hover:bg-white/70 dark:bg-white/5")}>
                <Icon className="h-5 w-5" />
                <span className="mt-3 block font-black">{profile.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{profile.copy}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <SettingToggle label="Texto más grande" copy="Más aire y lectura fácil" checked={value.textSize === "large"} onClick={() => onChange({ ...value, textSize: value.textSize === "large" ? "normal" : "large" })} />
          <SettingToggle label="Reducir movimiento" copy="Menos animaciones y distracción" checked={value.reduceMotion} onClick={() => onChange({ ...value, reduceMotion: !value.reduceMotion })} />
          <SettingToggle label="Alto contraste" copy="Bordes y texto más definidos" checked={value.highContrast} onClick={() => onChange({ ...value, highContrast: !value.highContrast })} />
          <SettingToggle label="Vista compacta" copy="Más información, menos desplazamiento" checked={value.density === "compact"} onClick={() => onChange({ ...value, density: value.density === "compact" ? "comfortable" : "compact" })} />
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-white/45 p-4 dark:bg-white/5">
          <h3 className="font-black">Apariencia</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["auto", "light", "dark"] as const).map((theme) => (
              <Button key={theme} variant={value.theme === theme ? "default" : "glass"} size="sm" onClick={() => onChange({ ...value, theme })}>
                {theme === "auto" ? "Sistema" : theme === "light" ? "Claro" : "Oscuro"}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-white/45 p-4 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black">Orden de menús</h3>
              <p className="text-xs text-muted-foreground">Los perfiles lo ordenan automáticamente; también puedes mover cada opción.</p>
            </div>
            <Button variant="glass" size="sm" onClick={() => onChange(defaultAdaptivePreferences)}><RotateCcw className="h-4 w-4" />Restablecer</Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {value.tabOrder.map((tab, index) => (
              <div key={tab} className="flex items-center gap-2 rounded-2xl bg-white/65 px-3 py-2 dark:bg-white/8">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white dark:bg-white dark:text-slate-950">{index + 1}</span>
                <span className="flex-1 font-bold">{tabLabels[tab]}</span>
                <Button variant="ghost" size="icon" onClick={() => moveTab(index, -1)} disabled={index === 0} aria-label={`Subir ${tabLabels[tab]}`}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => moveTab(index, 1)} disabled={index === value.tabOrder.length - 1} aria-label={`Bajar ${tabLabels[tab]}`}><ArrowDown className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-white/45 p-4 dark:bg-white/5">
          <h3 className="font-black">Orden de Inicio</h3>
          <p className="mt-1 text-xs text-muted-foreground">Mueve u oculta bloques secundarios.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {value.sectionOrder.map((section, index) => {
              const hidden = value.hiddenSections.includes(section);
              return (
                <div key={section} className="flex items-center gap-1 rounded-2xl bg-white/65 px-3 py-2 dark:bg-white/8">
                  <span className="min-w-0 flex-1 truncate font-bold">{sectionLabels[section]}</span>
                  <Button variant="ghost" size="icon" onClick={() => toggleSection(section)} aria-label={hidden ? `Mostrar ${sectionLabels[section]}` : `Ocultar ${sectionLabels[section]}`}>
                    {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`Subir ${sectionLabels[section]}`}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => moveSection(index, 1)} disabled={index === value.sectionOrder.length - 1} aria-label={`Bajar ${sectionLabels[section]}`}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </div>

        <PasskeySettings open={open} />
        <div className="mt-5 flex items-center justify-between gap-3 rounded-[1.5rem] bg-white/45 p-4 dark:bg-white/5">
          <div><h3 className="font-black">App instalada</h3><p className="text-xs text-muted-foreground">Abre Wallet desde tu pantalla de inicio.</p></div>
          <InstallPWAButton />
        </div>
      </GlassCard>
    </div>
  );
}

type PasskeyItem = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

function PasskeySettings({ open }: { open: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supported = typeof window !== "undefined" && "PublicKeyCredential" in window;
  const appleAuthEnabled = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true";

  const loadPasskeys = useCallback(async () => {
    if (!supabase || !supported) return;
    const { data, error } = await supabase.auth.passkey.list();
    if (error) {
      setMessage(error.message.includes("not enabled") ? "Activa Passkeys en Supabase para usar Face ID o huella." : error.message);
      return;
    }
    setPasskeys(data ?? []);
  }, [supabase, supported]);

  useEffect(() => {
    if (open) void loadPasskeys();
  }, [loadPasskeys, open]);

  async function registerPasskey() {
    if (!supabase || !supported) return;
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.registerPasskey();
    setLoading(false);
    setMessage(error ? error.message : "Llave creada. Podras entrar con la biometria disponible en tu dispositivo.");
    if (!error) await loadPasskeys();
  }

  async function deletePasskey(passkeyId: string) {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.passkey.delete({ passkeyId });
    setLoading(false);
    setMessage(error ? error.message : "Llave eliminada.");
    if (!error) await loadPasskeys();
  }

  async function linkApple() {
    if (!supabase) return;
    const { error } = await supabase.auth.linkIdentity({
      provider: "apple",
      options: { redirectTo: `${getSiteUrl()}auth/callback?next=/` }
    });
    if (error) setMessage(error.message);
  }

  return (
    <div className="mt-5 rounded-[1.5rem] bg-white/45 p-4 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <Fingerprint className="mt-1 h-6 w-6 text-sky-500" />
        <div className="min-w-0 flex-1"><h3 className="font-black">Acceso seguro</h3><p className="text-xs text-muted-foreground">Passkeys usan Face ID, huella, PIN o una llave de seguridad. Apple se habilita al completar Apple Developer.</p></div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button onClick={registerPasskey} disabled={loading || !supported}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}Crear passkey</Button>
        <Button variant="glass" onClick={linkApple} disabled={!appleAuthEnabled} title={appleAuthEnabled ? "Vincular cuenta Apple" : "Requiere completar Apple Developer"}><KeyRound className="h-4 w-4" />{appleAuthEnabled ? "Vincular Apple" : "Apple pendiente"}</Button>
      </div>
      {passkeys.map((passkey) => (
        <div key={passkey.id} className="mt-2 flex items-center gap-2 rounded-2xl bg-white/65 p-3 text-sm dark:bg-white/8">
          <Fingerprint className="h-4 w-4" /><span className="min-w-0 flex-1 truncate font-semibold">{passkey.friendly_name || "Passkey"}</span>
          <Button variant="ghost" size="icon" onClick={() => deletePasskey(passkey.id)} disabled={loading} aria-label="Eliminar passkey"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      {!supported && <p className="mt-3 text-sm text-orange-700 dark:text-orange-200">Este navegador no ofrece WebAuthn.</p>}
      {message && <p className="mt-3 rounded-2xl bg-sky-400/12 p-3 text-sm font-semibold">{message}</p>}
    </div>
  );
}

function SettingToggle({ label, copy, checked, onClick }: { label: string; copy: string; checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-[1.3rem] border border-white/45 bg-white/45 p-3 text-left dark:bg-white/5">
      <span className={cn("flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition", checked ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700")}>
        <span className={cn("h-5 w-5 rounded-full bg-white shadow transition", checked && "translate-x-5")} />
      </span>
      <span><span className="block font-black">{label}</span><span className="block text-xs text-muted-foreground">{copy}</span></span>
    </button>
  );
}
