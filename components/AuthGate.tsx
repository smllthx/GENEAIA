"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, CircleDollarSign, Fingerprint, KeyRound, Loader2, Mail, MessageSquareText, UserRound } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { GlassCard } from "@/components/GlassCard";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

function normalizeIdentifier(rawValue: string): { channel: "email" | "sms"; value: string; valid: boolean } {
  const value = rawValue.trim();

  if (value.includes("@")) {
    const email = value.toLowerCase();
    return { channel: "email", value: email, valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) };
  }

  const digits = value.replace(/\D/g, "");
  const normalized =
    digits.startsWith("56") ? `+${digits}` :
    digits.startsWith("9") && digits.length === 9 ? `+56${digits}` :
    digits.startsWith("09") && digits.length === 10 ? `+56${digits.slice(1)}` :
    value.startsWith("+") ? value : `+${digits}`;

  return {
    channel: "sms",
    value: normalized,
    valid: /^\+569\d{8}$/.test(normalized)
  };
}

export function AuthGate({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [profile, setProfile] = useState<ProfileDraft>(defaultProfile);
  const [identifier, setIdentifier] = useState("");
  const [verificationTarget, setVerificationTarget] = useState("");
  const [verificationChannel, setVerificationChannel] = useState<"email" | "sms">("email");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState(1);

  useEffect(() => {
    if (!supabase) {
      setChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setChecked(true);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      setProfileReady(false);
      return;
    }

    async function loadProfile() {
      const { data } = await supabase!
        .from("users")
        .select("*")
        .eq("id", session!.user.id)
        .maybeSingle();

      if (!data) {
        await supabase!.from("users").upsert(
          {
            id: session!.user.id,
            email: session!.user.email ?? session!.user.phone ?? "sin-contacto@wallet.app",
            name: session!.user.email?.split("@")[0] ?? session!.user.phone ?? "",
            currency: "CLP"
          },
          { onConflict: "id" }
        );
        setProfile({ ...defaultProfile, name: session!.user.email?.split("@")[0] ?? session!.user.phone ?? "" });
        setProfileReady(false);
        return;
      }

      const nextProfile = {
        name: data.name ?? "",
        country: data.country ?? "Chile",
        currency: data.currency ?? "CLP",
        main_bank: data.main_bank ?? "",
        daily_budget: data.daily_budget ? String(Math.round(Number(data.daily_budget))) : "",
        weekly_budget: data.weekly_budget ? String(Math.round(Number(data.weekly_budget))) : "",
        monthly_budget: data.monthly_budget ? String(Math.round(Number(data.monthly_budget))) : "",
        event_name: data.event_name ?? "",
        event_budget: data.event_budget ? String(Math.round(Number(data.event_budget))) : ""
      };

      setProfile(nextProfile);
      const complete = isProfileComplete(nextProfile);
      if (complete) {
        const { count } = await supabase!.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", session!.user.id);
        if (!count) {
          await supabase!.from("accounts").insert({
            user_id: session!.user.id,
            name: "Cuenta principal",
            institution: nextProfile.main_bank,
            type: "checking",
            balance: 0,
            currency: nextProfile.currency,
            color: "from-sky-500 to-blue-700",
            icon: "bank",
            is_manual: true,
            is_hidden: false,
            exclude_from_total: false
          });
        }
      }
      setProfileReady(complete);
    }

    void loadProfile();
  }, [session, supabase]);

  async function sendVerificationCode() {
    const target = normalizeIdentifier(identifier);
    if (!supabase || !target.value) return;

    if (!target.valid) {
      setMessage("Escribe un correo válido o un celular chileno como +56912345678.");
      return;
    }

    setLoading(true);
    const { error } =
      target.channel === "email"
        ? await supabase.auth.signInWithOtp({
            email: target.value,
            options: { shouldCreateUser: true }
          })
        : await supabase.auth.signInWithOtp({
            phone: target.value,
            options: {
              shouldCreateUser: true,
              channel: "sms"
            }
          });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setVerificationTarget(target.value);
    setVerificationChannel(target.channel);
    setCodeSent(true);
    setCode("");
    setMessage(target.channel === "email" ? "Te envié un código al correo. Escríbelo aquí para entrar." : "Te envié un código SMS. Escríbelo aquí para entrar.");
  }

  async function verifyCode() {
    if (!supabase || !verificationTarget || !code.trim()) return;

    setLoading(true);
    const { error } =
      verificationChannel === "email"
        ? await supabase.auth.verifyOtp({
            email: verificationTarget,
            token: code.trim(),
            type: "email"
          })
        : await supabase.auth.verifyOtp({
            phone: verificationTarget,
            token: code.trim(),
            type: "sms"
          });
    setLoading(false);
    setMessage(error ? error.message : "Código correcto. Entrando a Wallet.");
  }

  async function signInWithOAuth(provider: "google" | "apple") {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getSiteUrl() }
    });
  }

  async function signInWithPasskey() {
    if (!supabase) return;

    setLoading(true);
    const { error } = await (supabase.auth as unknown as { signInWithPasskey: () => Promise<{ error: Error | null }> }).signInWithPasskey();
    setLoading(false);
    setMessage(error ? `Passkey no disponible: ${error.message}` : "Sesión iniciada.");
  }

  async function saveProfile() {
    if (!supabase || !session || !isProfileComplete(profile)) {
      setMessage("Completa nombre, banco y presupuestos diario, semanal y mensual.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("users").upsert(
      {
        id: session.user.id,
        email: session.user.email ?? session.user.phone ?? "sin-contacto@wallet.app",
        name: profile.name,
        country: profile.country,
        currency: profile.currency.toUpperCase(),
        main_bank: profile.main_bank,
        daily_budget: Number(profile.daily_budget),
        weekly_budget: Number(profile.weekly_budget),
        monthly_budget: Number(profile.monthly_budget),
        event_name: profile.event_name,
        event_budget: Number(profile.event_budget || 0),
        onboarding_completed: true,
        onboarding_step: 4,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const { count } = await supabase.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", session.user.id);
    if (!count) {
      const { error: accountError } = await supabase.from("accounts").insert({
        user_id: session.user.id,
        name: "Cuenta principal",
        institution: profile.main_bank,
        type: "checking",
        balance: 0,
        currency: profile.currency.toUpperCase(),
        color: "from-sky-500 to-blue-700",
        icon: "bank",
        is_manual: true,
        is_hidden: false,
        exclude_from_total: false
      });
      if (accountError) {
        setMessage("Guardamos tu perfil, pero no pudimos crear la cuenta principal.");
        return;
      }
    }

    setProfileReady(true);
  }

  if (!checked) {
    return <AuthShell><LoadingCard /></AuthShell>;
  }

  if (!supabase) {
    return (
      <AuthShell>
        <GlassCard glow>
          <Badge className="bg-red-500 text-white">Configuración incompleta</Badge>
          <h1 className="mt-4 text-3xl font-black">Wallet necesita Supabase</h1>
          <p className="mt-2 text-sm text-muted-foreground">Faltan las variables públicas de Supabase para crear cuentas.</p>
        </GlassCard>
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell>
        <GlassCard glow className="w-full max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <Badge>Cuenta obligatoria</Badge>
            <InstallPWAButton />
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-normal">Entrar a Wallet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea tu cuenta para guardar bancos, saldos, presupuestos, gastos y deudas. No hay modo demo.
          </p>
          {!codeSent ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="correo o +56912345678"
                type="text"
                inputMode="email"
              />
              <Button onClick={sendVerificationCode} disabled={loading || !identifier.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar código
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-white/55 p-3 text-sm font-semibold text-muted-foreground dark:bg-white/8">
                Código enviado a {verificationTarget}. No necesitas abrir ningún link.
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Código de 6 dígitos"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <Button onClick={verifyCode} disabled={loading || code.length < 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                  Verificar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="glass" onClick={sendVerificationCode} disabled={loading}>
                  Reenviar código
                </Button>
                <Button
                  variant="glass"
                  onClick={() => {
                    setCodeSent(false);
                    setCode("");
                    setMessage("");
                  }}
                >
                  Cambiar correo o teléfono
                </Button>
              </div>
            </div>
          )}
          <p className="mt-3 rounded-2xl bg-white/55 p-3 text-xs font-semibold text-muted-foreground dark:bg-white/8">
            Puedes entrar con correo o SMS chileno si Supabase Phone Auth esta activo con Twilio.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="glass" onClick={signInWithPasskey} disabled={loading}>
              <Fingerprint className="h-4 w-4" />
              FaceID/passkey
            </Button>
            <Button variant="glass" onClick={() => signInWithOAuth("google")}>
              <KeyRound className="h-4 w-4" />
              Google
            </Button>
            <Button variant="glass" onClick={() => signInWithOAuth("apple")}>
              <KeyRound className="h-4 w-4" />
              Apple
            </Button>
          </div>
          <p className="mt-4 rounded-2xl bg-white/55 p-3 text-xs font-semibold text-muted-foreground dark:bg-white/8">
            Tus conexiones bancarias serán read-only. Wallet no puede transferir dinero ni mover fondos.
          </p>
          {message && <p className="mt-3 rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold">{message}</p>}
        </GlassCard>
      </AuthShell>
    );
  }

  if (!profileReady) {
    return (
      <AuthShell>
        <GlassCard glow className="w-full max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <Badge>Configuracion inicial</Badge>
            <span className="text-xs font-bold text-muted-foreground">Paso {setupStep} de 4</span>
          </div>
          <Progress className="mt-3" value={setupStep * 25} />

          {setupStep === 1 && (
            <div className="mt-6">
              <UserRound className="h-9 w-9 text-sky-500" />
              <h1 className="mt-4 text-3xl font-black">Partamos por ti</h1>
              <p className="mt-2 text-sm text-muted-foreground">Usamos estos datos para mostrar montos y fechas correctamente.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Input value={profile.name} onChange={(event) => setProfile((draft) => ({ ...draft, name: event.target.value }))} placeholder="Tu nombre" autoComplete="name" />
                <Input value={profile.country} onChange={(event) => setProfile((draft) => ({ ...draft, country: event.target.value }))} placeholder="Pais" />
                <select className="h-11 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm dark:bg-slate-900/80 sm:col-span-2" value={profile.currency} onChange={(event) => setProfile((draft) => ({ ...draft, currency: event.target.value }))}>
                  <option value="CLP">Peso chileno (CLP)</option>
                  <option value="USD">Dolar estadounidense (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
            </div>
          )}

          {setupStep === 2 && (
            <div className="mt-6">
              <Building2 className="h-9 w-9 text-indigo-500" />
              <h1 className="mt-4 text-3xl font-black">¿Que banco usas?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Esto adapta las instrucciones de correo. No te pediremos la clave del banco.</p>
              <select className="mt-5 h-12 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm dark:bg-slate-900/80" value={profile.main_bank} onChange={(event) => setProfile((draft) => ({ ...draft, main_bank: event.target.value }))}>
                <option value="">Selecciona tu banco principal</option>
                {["Banco de Chile", "Santander Chile", "BancoEstado", "BCI", "Scotiabank Chile", "Itau Chile", "Banco Falabella", "Otro"].map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </select>
              <p className="mt-4 rounded-2xl bg-emerald-400/12 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">La conexion sera siempre de lectura. Wallet no puede mover fondos.</p>
            </div>
          )}

          {setupStep === 3 && (
            <div className="mt-6">
              <CircleDollarSign className="h-9 w-9 text-emerald-500" />
              <h1 className="mt-4 text-3xl font-black">Define tus limites</h1>
              <p className="mt-2 text-sm text-muted-foreground">Wallet calculara cuanto puedes gastar sin salirte de tu plan.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Input value={profile.daily_budget} onChange={(event) => setProfile((draft) => ({ ...draft, daily_budget: event.target.value.replace(/\D/g, "") }))} placeholder="Diario" inputMode="numeric" />
                <Input value={profile.weekly_budget} onChange={(event) => setProfile((draft) => ({ ...draft, weekly_budget: event.target.value.replace(/\D/g, "") }))} placeholder="Semanal" inputMode="numeric" />
                <Input value={profile.monthly_budget} onChange={(event) => setProfile((draft) => ({ ...draft, monthly_budget: event.target.value.replace(/\D/g, "") }))} placeholder="Mensual" inputMode="numeric" />
                <Input className="sm:col-span-2" value={profile.event_name} onChange={(event) => setProfile((draft) => ({ ...draft, event_name: event.target.value }))} placeholder="Evento opcional, ej. viaje" />
                <Input value={profile.event_budget} onChange={(event) => setProfile((draft) => ({ ...draft, event_budget: event.target.value.replace(/\D/g, "") }))} placeholder="Monto evento" inputMode="numeric" />
              </div>
            </div>
          )}

          {setupStep === 4 && (
            <div className="mt-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h1 className="mt-4 text-3xl font-black">Tu Wallet esta lista</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Al entrar te guiaremos para crear una cuenta, enlazar tus correos bancarios y comprobar que los movimientos llegan correctamente.</p>
              <div className="mx-auto mt-5 grid max-w-md gap-2 text-left text-sm">
                {["Wallet crea tu cuenta principal", "Crea tu alias privado", "Configura el reenvio", "Envia una prueba y revisa el movimiento"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 dark:bg-white/8"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-black text-white">{index + 1}</span><span className="font-semibold">{item}</span></div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {setupStep > 1 && <Button variant="glass" onClick={() => setSetupStep((step) => Math.max(1, step - 1))}><ArrowLeft className="h-4 w-4" />Atras</Button>}
            {setupStep < 4 ? (
              <Button onClick={() => setSetupStep((step) => Math.min(4, step + 1))} disabled={!isSetupStepComplete(profile, setupStep)}>Continuar<ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={saveProfile} disabled={loading || !isProfileComplete(profile)}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}Entrar a Wallet</Button>
            )}
            <Button variant="glass" onClick={() => supabase.auth.signOut()}>
              Salir
            </Button>
          </div>
          {message && <p className="mt-3 rounded-2xl bg-sky-400/15 p-3 text-sm font-semibold">{message}</p>}
        </GlassCard>
      </AuthShell>
    );
  }

  return <>{children}</>;
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8">
      <div className="w-full">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-[1.35rem] bg-black shadow-glow ring-1 ring-white/35">
            <img src="/icons/wallet-icon-192.png" alt="Wallet" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-2xl font-black">Wallet</p>
            <p className="text-sm text-muted-foreground">Finanzas personales privadas</p>
          </div>
        </div>
        <div className="mx-auto flex justify-center">{children}</div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <GlassCard glow className="w-full max-w-sm text-center">
      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      <p className="mt-3 font-bold">Cargando Wallet</p>
    </GlassCard>
  );
}

function isProfileComplete(profile: ProfileDraft) {
  return Boolean(
    profile.name.trim() &&
      profile.main_bank.trim() &&
      Number(profile.daily_budget) > 0 &&
      Number(profile.weekly_budget) > 0 &&
      Number(profile.monthly_budget) > 0
  );
}

function isSetupStepComplete(profile: ProfileDraft, step: number) {
  if (step === 1) return Boolean(profile.name.trim() && profile.country.trim() && profile.currency.trim());
  if (step === 2) return Boolean(profile.main_bank.trim());
  if (step === 3) return Number(profile.daily_budget) > 0 && Number(profile.weekly_budget) > 0 && Number(profile.monthly_budget) > 0;
  return true;
}
