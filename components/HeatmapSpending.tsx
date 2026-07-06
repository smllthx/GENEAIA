import type { HeatmapDay } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function HeatmapSpending({ days }: { days: HeatmapDay[] }) {
  return (
    <div className="mt-4 grid grid-cols-7 gap-2">
      {days.map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${formatCurrency(day.amount)}`}
          className="aspect-square rounded-xl"
          style={{
            backgroundColor: ["#E5E7EB", "#BAE6FD", "#7DD3FC", "#FDBA74", "#F87171"][day.level],
            opacity: 0.96
          }}
        />
      ))}
    </div>
  );
}
