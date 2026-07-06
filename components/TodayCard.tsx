"use client";

import { Sparkles } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function TodayCard({ availableToday, hidden }: { availableToday: number; hidden: boolean }) {
  return (
    <GlassCard glow>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">Hoy</p>
          <h2 className="break-words text-3xl font-black">
            Puedes gastar {hidden ? "••••" : formatCurrency(availableToday)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Sin salirte del presupuesto.</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-600">
          <Sparkles className="h-7 w-7" />
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button variant="glass">Revisar gasto</Button>
        <Button variant="glass">Ahorrar ahora</Button>
        <Button variant="glass">Ver próximos pagos</Button>
      </div>
    </GlassCard>
  );
}
