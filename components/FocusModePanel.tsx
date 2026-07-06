import { CheckCircle2, Shield } from "lucide-react";
import { AIInsightCard } from "@/components/AIInsightCard";
import { GlassCard } from "@/components/GlassCard";
import { SubscriptionCard } from "@/components/Cards";
import { Button } from "@/components/ui/button";
import type { AIInsight, Subscription } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function FocusModePanel({
  hidden,
  totalBalance,
  availableToday,
  subscriptions,
  urgentInsight
}: {
  hidden: boolean;
  totalBalance: number;
  availableToday: number;
  subscriptions: Subscription[];
  urgentInsight: AIInsight;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <GlassCard glow>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Shield className="h-4 w-4" />
          Focus Mode
        </div>
        <h2 className="mt-2 text-4xl font-black">{hidden ? "••••••" : formatCurrency(totalBalance)}</h2>
        <p className="mt-2 text-lg font-semibold">
          Hoy puedes gastar {hidden ? "••••" : formatCurrency(availableToday)}.
        </p>
      </GlassCard>
      <GlassCard>
        <h3 className="text-xl font-black">Próximos pagos</h3>
        <div className="mt-3 space-y-2">
          {subscriptions.slice(0, 3).map((subscription) => (
            <SubscriptionCard key={subscription.id} subscription={subscription} />
          ))}
        </div>
      </GlassCard>
      <AIInsightCard insight={urgentInsight} />
      <GlassCard>
        <h3 className="text-xl font-black">3 acciones recomendadas</h3>
        <div className="mt-3 grid gap-2">
          {["Registrar el próximo gasto", "Crear presupuesto semanal", "Conectar una cuenta read-only"].map((action) => (
            <Button key={action} variant="glass" className="justify-start">
              <CheckCircle2 className="h-4 w-4" />
              {action}
            </Button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
