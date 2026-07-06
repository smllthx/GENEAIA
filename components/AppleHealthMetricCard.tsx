import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppleHealthMetricCard({
  label,
  value,
  icon: Icon,
  color,
  copy
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  copy: string;
}) {
  return (
    <article className="rounded-[1.4rem] bg-white/55 p-4 dark:bg-white/8">
      <Icon className={`h-7 w-7 ${color}`} />
      <p className="mt-4 text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{copy}</span>
        <Button size="sm" variant="glass">ver detalle</Button>
      </div>
    </article>
  );
}
