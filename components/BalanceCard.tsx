"use client";

import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function BalanceCard({
  balance,
  hidden,
  onToggleHidden
}: {
  balance: number;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-emerald-500 p-5 text-white shadow-glass"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.34),transparent_24%),radial-gradient(circle_at_80%_0%,rgba(255,214,10,0.28),transparent_28%)]" />
      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/72">Saldo total</p>
          <div className="mt-2 break-words text-4xl font-black tracking-normal sm:text-5xl">
            {hidden ? "••••••" : formatCurrency(balance)}
          </div>
        </div>
        <Button onClick={onToggleHidden} variant="glass" size="icon" aria-label="Ocultar saldo">
          {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </Button>
      </div>
      <div className="relative mt-6 flex flex-wrap items-center gap-2">
        <Badge className="border-white/25 bg-white/18 text-white">
          <TrendingUp className="mr-1 h-3.5 w-3.5" />
          +5,8% mensual
        </Badge>
        <Badge className="border-white/25 bg-white/18 text-white">Proyección: {formatCurrency(918000)}</Badge>
      </div>
      <p className="relative mt-5 max-w-full text-sm font-medium text-white/78 sm:max-w-sm">
        Tus conexiones bancarias son solo de lectura. Wallet no puede transferir dinero ni mover fondos.
      </p>
    </motion.section>
  );
}
