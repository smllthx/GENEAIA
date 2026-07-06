import type { Account } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function WalletCard({ account, hidden }: { account: Account; hidden: boolean }) {
  return (
    <div className={`min-h-44 rounded-[1.7rem] bg-gradient-to-br ${account.color} p-4 text-white shadow-glass`}>
      <div className="flex items-start justify-between">
        <span className="text-3xl" aria-hidden>
          {account.icon}
        </span>
        <Badge className="border-white/25 bg-white/18 text-white">{account.type.replace("_", " ")}</Badge>
      </div>
      <div className="mt-8">
        <p className="text-sm text-white/75">{account.institution}</p>
        <h3 className="text-lg font-bold">{account.name}</h3>
        <p className="mt-2 text-2xl font-black">{hidden ? "••••••" : formatCurrency(account.balance)}</p>
      </div>
    </div>
  );
}
