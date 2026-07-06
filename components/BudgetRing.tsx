import { Progress } from "@/components/ui/progress";
import type { Budget } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function BudgetRing({ budget }: { budget: Budget }) {
  const used = Math.round((budget.spent_amount / budget.limit_amount) * 100);
  const risky = used >= 80;
  return (
    <div className="rounded-[1.25rem] bg-white/55 p-3 dark:bg-white/8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">{budget.category}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(budget.limit_amount - budget.spent_amount)} restante</p>
        </div>
        <span className={`text-xl font-black ${risky ? "text-orange-500" : "text-emerald-500"}`}>{used}%</span>
      </div>
      <Progress value={used} />
    </div>
  );
}
