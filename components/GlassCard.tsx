import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  glow = false
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <section className={cn("glass rounded-[1.75rem] p-4 shadow-glass", glow && "shadow-glow", className)}>
      {children}
    </section>
  );
}
