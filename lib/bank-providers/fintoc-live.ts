import { classifyTransaction } from "@/lib/ai/transaction-classifier";

type FintocAccount = {
  id: string;
  name?: string;
  official_name?: string;
  type?: string;
  currency?: string;
  balance?: {
    available?: number;
    current?: number;
    limit?: number;
  };
  holder?: {
    name?: string;
  };
  institution?: {
    id?: string;
    name?: string;
  };
};

type FintocMovement = {
  id: string;
  amount: number;
  post_date?: string;
  transaction_date?: string;
  description?: string;
  currency?: string;
  type?: string;
  pending?: boolean;
};

const FINTOC_BASE_URL = "https://api.fintoc.com/v1";

function getFintocSecretKey() {
  const key = process.env.FINTOC_API_KEY;

  if (!key) {
    throw new Error("FINTOC_API_KEY is required for live bank sync.");
  }

  return key;
}

async function fintocRequest<T>(path: string) {
  const response = await fetch(`${FINTOC_BASE_URL}${path}`, {
    headers: {
      Authorization: getFintocSecretKey(),
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Fintoc error ${response.status}: ${message.slice(0, 500)}`);
  }

  return (await response.json()) as T;
}

export async function listFintocAccounts(linkToken: string) {
  const params = new URLSearchParams({ link_token: linkToken });
  return fintocRequest<FintocAccount[]>(`/accounts?${params.toString()}`);
}

export async function listFintocMovements(linkToken: string, accountId: string, since?: string) {
  const params = new URLSearchParams({
    link_token: linkToken,
    per_page: "100"
  });

  if (since) {
    params.set("since", since);
  }

  return fintocRequest<FintocMovement[]>(`/accounts/${accountId}/movements?${params.toString()}`);
}

export function normalizeFintocAccount(account: FintocAccount, fallbackInstitution = "Fintoc") {
  return {
    external_account_id: account.id,
    name: account.name ?? account.official_name ?? "Cuenta bancaria",
    institution: account.institution?.name ?? fallbackInstitution,
    type: account.type?.includes("credit") ? "credit" : account.type?.includes("sight") ? "checking" : "checking",
    balance: account.balance?.available ?? account.balance?.current ?? 0,
    currency: account.currency ?? "CLP",
    color: "from-sky-500 to-blue-700",
    icon: "🏦",
    is_manual: false,
    is_hidden: false,
    exclude_from_total: false
  };
}

export function normalizeFintocMovement(movement: FintocMovement) {
  const description = movement.description ?? "Movimiento bancario";
  const classification = classifyTransaction({
    text: description,
    amount: movement.amount,
    directionHint: movement.amount > 0 ? "income" : "expense"
  });

  return {
    external_transaction_id: movement.id,
    merchant: cleanMerchant(description),
    amount: classification.signedAmount,
    date: (movement.post_date ?? movement.transaction_date ?? new Date().toISOString()).slice(0, 10),
    category: classification.category,
    description,
    is_recurring: ["Spotify", "Netflix", "iCloud"].some((name) => description.toLowerCase().includes(name.toLowerCase())),
    is_ai_categorized: true,
    reviewed: false
  };
}

function cleanMerchant(description: string) {
  return description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42) || "Movimiento";
}
