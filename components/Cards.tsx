import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Debt, Goal, Subscription } from "@/lib/types";
import { daysUntil, formatCurrency } from "@/lib/utils";

export function AccountCardMini({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-[1.4rem] bg-white/55 p-4 dark:bg-white/8">
      <div className="text-2xl">{icon}</div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

export function GoalCard({ goal }: { goal: Goal }) {
  const progress = Math.round((goal.current_amount / goal.target_amount) * 100);
  return (
    <div className={`rounded-[1.5rem] bg-gradient-to-br ${goal.color} p-4 text-white`}>
      <div className="flex items-start justify-between">
        <span className="text-3xl">{goal.icon}</span>
        <Badge className="border-white/25 bg-white/18 text-white">{progress}%</Badge>
      </div>
      <h3 className="mt-4 font-black">{goal.name}</h3>
      <p className="text-sm text-white/75">{formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function DebtCard({ debt }: { debt: Debt }) {
  const paid = Math.round((debt.paid_amount / debt.amount) * 100);
  return (
    <div className="rounded-[1.4rem] bg-white/55 p-4 dark:bg-white/8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{debt.person_name}</p>
          <p className="text-xs text-muted-foreground">{debt.type === "owed_to_me" ? "Me deben" : "Debo"} · vence en {daysUntil(debt.due_date)} días</p>
        </div>
        <Badge>{debt.status}</Badge>
      </div>
      <p className="mt-3 text-2xl font-black">{formatCurrency(debt.amount - debt.paid_amount)}</p>
      <Progress value={paid} className="mt-3" />
    </div>
  );
}

export function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-white/55 p-3 dark:bg-white/8">
      <div>
        <p className="font-black">{subscription.name}</p>
        <p className="text-xs text-muted-foreground">Próximo pago en {daysUntil(subscription.next_payment_date)} días</p>
      </div>
      <div className="text-right">
        <p className="font-black">{formatCurrency(subscription.amount)}</p>
        <Button variant="ghost" size="sm">Avisar</Button>
      </div>
    </div>
  );
}
