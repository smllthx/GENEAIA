import type { BankProvider } from "./types";
import { mockProvider } from "./mock-provider";

export const plaidProvider: BankProvider = {
  connectAccount: mockProvider.connectAccount,
  syncBalances: mockProvider.syncBalances,
  syncTransactions: mockProvider.syncTransactions,
  refreshConnection: mockProvider.refreshConnection,
  disconnectAccount: mockProvider.disconnectAccount
};
