import type { Account } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function AccountCard({ account, hidden }: { account: Account; hidden: boolean }) {
  return (
    <article className={`rounded-[1.5rem] bg-gradient-to-br ${account.color} p-4 text-white shadow-glass`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-3xl">{account.icon}</div>
        <Badge className="border-white/25 bg-white/18 text-white">{account.last_update}</Badge>
      </div>
      <p className="mt-6 text-sm text-white/75">{account.institution}</p>
      <h3 className="text-lg font-black">{account.name}</h3>
      <p className="mt-2 text-3xl font-black">{hidden ? "••••••" : formatCurrency(account.balance)}</p>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-white/80">
        <span>{account.type.replace("_", " ")}</span>
        <span>{account.variation > 0 ? "+" : ""}{account.variation}%</span>
      </div>
      <Button className="mt-4 w-full border-white/25 bg-white/18 text-white hover:bg-white/25" variant="glass" size="sm">
        Editar nombre/color/icono
      </Button>
    </article>
  );
}
