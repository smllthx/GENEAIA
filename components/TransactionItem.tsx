import type { Account, Transaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const categoryIcon: Record<string, string> = {
  Comida: "🍽️",
  Transporte: "🚇",
  Suscripciones: "🔁",
  Salud: "💚",
  Estudios: "🎓",
  Ocio: "🎧",
  Mascota: "🐾",
  Otros: "✨",
  Ingresos: "💰"
};

export function TransactionItem({
  transaction,
  account,
  hidden
}: {
  transaction: Transaction;
  account?: Account;
  hidden: boolean;
}) {
  const positive = transaction.amount > 0;
  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] bg-white/55 p-3 backdrop-blur dark:bg-white/8">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/5 text-xl dark:bg-white/10">
        {categoryIcon[transaction.category] ?? "•"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold">{transaction.merchant}</p>
          {transaction.is_ai_categorized && <Badge className="shrink-0 px-2 py-0.5">IA</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {transaction.date} · {transaction.category} · {account?.institution ?? "Cuenta"}
        </p>
      </div>
      <p className={`text-right font-black ${positive ? "text-emerald-600" : ""}`}>
        {hidden ? "••••" : formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}
