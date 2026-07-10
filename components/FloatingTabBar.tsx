"use client";

import { Bot, ChartPie, Home, ReceiptText, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "movimientos", label: "Movimientos", icon: ReceiptText },
  { id: "presupuesto", label: "Presupuesto", icon: ChartPie },
  { id: "automatizacion", label: "Automatizar", icon: Workflow },
  { id: "ia", label: "IA", icon: Bot }
];

export function FloatingTabBar({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
      <div className="mx-auto max-w-3xl px-3">
        <div className="glass grid grid-cols-5 rounded-full p-1.5 shadow-glass">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                variant="ghost"
                className={cn(
                  "h-14 flex-col gap-0.5 rounded-full px-1 text-[11px]",
                  selected && "bg-foreground text-background hover:bg-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
