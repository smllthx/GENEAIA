import { fintocProvider } from "./fintoc";
import { gocardlessProvider } from "./gocardless";
import { mockProvider } from "./mock-provider";
import { plaidProvider } from "./plaid";
import { saltedgeProvider } from "./saltedge";
import { tinkProvider } from "./tink";
import { truelayerProvider } from "./truelayer";

export const bankProviders = {
  mock: mockProvider,
  plaid: plaidProvider,
  gocardless: gocardlessProvider,
  saltedge: saltedgeProvider,
  truelayer: truelayerProvider,
  tink: tinkProvider,
  fintoc: fintocProvider
};

export type BankProviderName = keyof typeof bankProviders;
