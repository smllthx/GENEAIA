"use client";

import { useState } from "react";
import { Send } from "lucide-react";
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
  diagnosis: "Vas algo justo este mes.",
  key_points: ["Comida subió $31.000.", "Uber subió $18.500.", "Tienes 2 pagos próximos."],
  action: "Limita comida fuera a $8.000 diarios por 7 días.",
  estimated_amount: 31000,
  urgency: "atención"
};

export function AIChatPanel() {
  const [question, setQuestion] = useState("¿Cuánto puedo gastar esta semana?");
  const [answer, setAnswer] = useState<AIAnswer>(initialAnswer);
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const data = await response.json();
      setAnswer(data.answer);
    } catch {
      setAnswer(initialAnswer);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard className="space-y-4" glow>
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Wallet Assistant</p>
        <h2 className="text-2xl font-black">IA financiera</h2>
      </div>
      <div className="flex gap-2">
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} />
        <Button size="icon" onClick={ask} disabled={loading} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </div>
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
          Impacto estimado: {formatCurrency(answer.estimated_amount)} · urgencia {answer.urgency}
        </p>
      </div>
    </GlassCard>
  );
}
