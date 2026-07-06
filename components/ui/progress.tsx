import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-yellow-400 transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
