import type { Account, Transaction } from "@/lib/types";

export type BankConnection = {
  provider: string;
  connectionId: string;
  status: "connected" | "reauth_required" | "disconnected";
  readOnly: true;
};

export type BankProvider = {
  connectAccount: () => Promise<BankConnection>;
  syncBalances: () => Promise<Account[]>;
  syncTransactions: () => Promise<Transaction[]>;
  refreshConnection: (connectionId: string) => Promise<BankConnection>;
  disconnectAccount: (connectionId: string) => Promise<{ ok: boolean }>;
};
