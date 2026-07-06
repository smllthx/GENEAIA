import { demoAccounts, demoTransactions } from "@/lib/demo-data";
import type { BankProvider } from "./types";

export const mockProvider: BankProvider = {
  async connectAccount() {
    return {
      provider: "mock",
      connectionId: "mock-readonly-connection",
      status: "connected",
      readOnly: true
    };
  },
  async syncBalances() {
    return demoAccounts;
  },
  async syncTransactions() {
    return demoTransactions;
  },
  async refreshConnection(connectionId: string) {
    return {
      provider: "mock",
      connectionId,
      status: "connected",
      readOnly: true
    };
  },
  async disconnectAccount() {
    return { ok: true };
  }
};
