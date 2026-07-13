"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import { formatCurrency } from "@/lib/utils";

type AIAnswer = {
  diagnosis: string;
  key_points: string[];
  action: string;
  estimated_amount: number;
  urgency: string;
};

const initialAnswer: AIAnswer = {
  diagnosis: "Pregunta por tu dinero y obtén una acción concreta.",
  key_points: ["Cuentas y saldos.", "Gastos y presupuestos.", "Deudas y pagos próximos."],
  action: "Elige una pregunta o escribe la tuya.",
  estimated_amount: 0,
  urgency: "información"
};

const quickQuestions = [
  "¿Cuánto puedo gastar esta semana?",
  "¿Dónde gasté más?",
  "¿Qué deuda debo priorizar?"
];

export function AIChatPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [question, setQuestion] = useState("¿Cuánto puedo gastar esta semana?");
  const [answer, setAnswer] = useState<AIAnswer>(initialAnswer);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("local");
  const [error, setError] = useState("");

  async function ask(nextQuestion = question) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || loading) return;
    setQuestion(cleanQuestion);
    setError("");
    setLoading(true);
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) throw new Error("auth_required");
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ question: cleanQuestion })
      });
      const data = await response.json();
      if (!response.ok || !data.answer) throw new Error(data.error ?? "ai_failed");
      setAnswer(data.answer);
      setSource(data.source ?? "local");
    } catch {
      setError("No pude consultar tus datos ahora. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask();
  }

  return (
    <GlassCard className="space-y-4" glow>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500/14 text-fuchsia-600 dark:text-fuchsia-300"><Sparkles className="h-5 w-5" /></span>
        <div><p className="text-sm font-semibold text-muted-foreground">Wallet Assistant</p><h2 className="text-2xl font-black">IA financiera</h2></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((item) => <Button key={item} type="button" size="sm" variant="glass" onClick={() => void ask(item)} disabled={loading}>{item}</Button>)}
      </div>
      <form className="flex gap-2" onSubmit={submit}>
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Pregunta financiera" />
        <Button size="icon" type="submit" disabled={loading || !question.trim()} aria-label="Enviar">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200" role="alert">{error}</p>}
      <div className="rounded-[1.5rem] bg-white/58 p-4 dark:bg-white/8">
        <p className="text-lg font-black">{answer.diagnosis}</p>
        <ol className="mt-3 space-y-2 text-sm">
          {answer.key_points.map((point, index) => (
            <li key={point}>{index + 1}. {point}</li>
          ))}
        </ol>
        <div className="mt-4 rounded-2xl bg-emerald-400/15 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          Acción: {answer.action}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Impacto estimado: {formatCurrency(answer.estimated_amount)} · urgencia {answer.urgency} · {source === "openai" ? "análisis IA" : "cálculo Wallet"}
        </p>
      </div>
    </GlassCard>
  );
}
