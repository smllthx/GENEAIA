"use client";

import { Bot, ChartPie, Home, Mail, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "automatizacion", label: "Correo", icon: Mail },
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "movimientos", label: "Movimientos", icon: ReceiptText },
  { id: "presupuesto", label: "Presupuesto", icon: ChartPie },
  { id: "ia", label: "IA", icon: Bot }
];

export function FloatingTabBar({ active, onChange, order }: { active: string; onChange: (tab: string) => void; order?: string[] }) {
  const orderedTabs = (order ?? tabs.map((tab) => tab.id))
    .map((id) => tabs.find((tab) => tab.id === id))
    .filter((tab): tab is (typeof tabs)[number] => Boolean(tab));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom" aria-label="Navegación principal">
      <div className="mx-auto w-full max-w-3xl px-2 sm:px-3">
        <div className="glass grid min-h-16 grid-cols-5 rounded-[1.65rem] p-1 shadow-glass sm:rounded-full sm:p-1.5">
          {orderedTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={selected ? "page" : undefined}
                variant="ghost"
                className={cn(
                  "h-14 min-w-0 flex-col gap-0.5 rounded-[1.25rem] px-0 text-[9px] sm:rounded-full sm:px-1 sm:text-[11px]",
                  selected && "bg-foreground text-background hover:bg-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
