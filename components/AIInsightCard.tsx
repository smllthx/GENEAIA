import type { AIInsight } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const severityClasses = {
  green: "from-emerald-400/22 to-green-500/10 text-emerald-700 dark:text-emerald-200",
  blue: "from-sky-400/24 to-blue-500/10 text-sky-700 dark:text-sky-200",
  yellow: "from-yellow-300/30 to-amber-500/10 text-amber-800 dark:text-amber-100",
  orange: "from-orange-400/28 to-red-500/10 text-orange-800 dark:text-orange-100",
  red: "from-red-500/26 to-rose-600/12 text-red-800 dark:text-red-100"
};

export function AIInsightCard({ insight }: { insight: AIInsight }) {
  return (
    <article className={`rounded-[1.5rem] bg-gradient-to-br p-4 ${severityClasses[insight.severity]}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/55 text-3xl shadow-sm dark:bg-white/10">
          {insight.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black">{insight.title}</h3>
            <Badge>Urgencia {insight.urgency}/5</Badge>
          </div>
          <p className="mt-1 text-sm font-medium opacity-80">{insight.message}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-white/45 p-3 dark:bg-white/8">
          <p className="text-xs opacity-70">Mes anterior</p>
          <p className="font-black">{insight.previous_month_delta > 0 ? "+" : ""}{insight.previous_month_delta}%</p>
        </div>
        <div className="rounded-2xl bg-white/45 p-3 dark:bg-white/8">
          <p className="text-xs opacity-70">Impacto</p>
          <p className="font-black">{formatCurrency(insight.estimated_impact)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold">{insight.action}</p>
      <Button className="mt-3 w-full" variant="glass" size="sm">
        {insight.quick_button}
      </Button>
    </article>
  );
}
