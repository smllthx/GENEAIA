type SimpleFinConnection = {
  conn_id: string;
  name: string;
  org_id?: string;
  org_name?: string;
  org_url?: string;
  sfin_url?: string;
};

type SimpleFinTransaction = {
  id: string;
  posted: number;
  amount: string;
  description: string;
  pending?: boolean;
  transacted_at?: number;
  extra?: {
    category?: string;
  };
};

type SimpleFinAccount = {
  id: string;
  name: string;
  conn_id: string;
  conn_name?: string;
  currency: string;
  balance: string;
  "available-balance"?: string;
  "balance-date": number;
  transactions?: SimpleFinTransaction[];
};

type SimpleFinAccountSet = {
  errlist?: Array<{ code: string; msg: string; conn_id?: string; account_id?: string }>;
  errors?: string[];
  connections: SimpleFinConnection[];
  accounts: SimpleFinAccount[];
};

export async function claimSimpleFinSetupToken(setupToken: string) {
  const claimUrl = Buffer.from(setupToken.trim(), "base64").toString("utf8");

  if (!claimUrl.startsWith("https://")) {
    throw new Error("SimpleFIN setup token invalid: decoded URL must be HTTPS.");
  }

  const response = await fetch(claimUrl, {
    method: "POST",
    headers: {
      "Content-Length": "0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`SimpleFIN claim failed (${response.status}). The token may already be used or revoked.`);
  }

  const accessUrl = (await response.text()).trim();

  if (!accessUrl.startsWith("https://")) {
    throw new Error("SimpleFIN returned an invalid access URL.");
  }

  return accessUrl;
}

export async function getSimpleFinAccounts(accessUrl: string) {
  const url = new URL(`${accessUrl.replace(/\/$/, "")}/accounts`);
  url.searchParams.set("version", "2");
  url.searchParams.set("pending", "1");

  const response = await fetch(url.toString(), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`SimpleFIN sync failed (${response.status}). Access may be revoked or payment may be required.`);
  }

  const accountSet = (await response.json()) as SimpleFinAccountSet;
  const firstError = accountSet.errlist?.[0]?.msg ?? accountSet.errors?.[0];

  if (firstError) {
    throw new Error(`SimpleFIN: ${sanitizeSimpleFinMessage(firstError)}`);
  }

  return accountSet;
}

export function normalizeSimpleFinAccount(account: SimpleFinAccount, connections: SimpleFinConnection[]) {
  const connection = connections.find((item) => item.conn_id === account.conn_id);

  return {
    external_account_id: account.id,
    name: account.name,
    institution: connection?.org_name ?? connection?.name ?? account.conn_name ?? "SimpleFIN",
    type: inferSimpleFinAccountType(account.name),
    balance: Number(account["available-balance"] ?? account.balance ?? 0),
    currency: normalizeCurrency(account.currency),
    color: "from-emerald-500 to-teal-700",
    icon: "🏦",
    is_manual: false,
    is_hidden: false,
    exclude_from_total: false
  };
}

export function normalizeSimpleFinTransaction(transaction: SimpleFinTransaction) {
  const description = sanitizeSimpleFinMessage(transaction.description);

  return {
    external_transaction_id: transaction.id,
    merchant: description.slice(0, 42) || "Movimiento",
    amount: Number(transaction.amount ?? 0),
    date: new Date((transaction.posted || transaction.transacted_at || Date.now() / 1000) * 1000).toISOString().slice(0, 10),
    category: transaction.extra?.category ?? inferCategory(description),
    description,
    is_recurring: ["spotify", "netflix", "icloud", "rent", "arriendo"].some((name) => description.toLowerCase().includes(name)),
    is_ai_categorized: true,
    reviewed: false
  };
}

function inferSimpleFinAccountType(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("credit") || lower.includes("card") || lower.includes("tarjeta")) return "credit";
  if (lower.includes("saving") || lower.includes("ahorro")) return "savings";
  return "checking";
}

function normalizeCurrency(currency: string) {
  return currency.length === 3 ? currency.toUpperCase() : "USD";
}

function sanitizeSimpleFinMessage(message: string) {
  return message.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function inferCategory(description: string) {
  const lower = description.toLowerCase();

  if (lower.includes("uber") || lower.includes("metro") || lower.includes("transport")) return "Transporte";
  if (lower.includes("restaurant") || lower.includes("coffee") || lower.includes("market") || lower.includes("grocery")) return "Comida";
  if (lower.includes("netflix") || lower.includes("spotify") || lower.includes("icloud")) return "Suscripciones";
  if (lower.includes("pharmacy") || lower.includes("farmacia") || lower.includes("health")) return "Salud";
  if (lower.includes("school") || lower.includes("university") || lower.includes("universidad")) return "Estudios";
  if (lower.includes("pet") || lower.includes("mascota") || lower.includes("vet")) return "Mascota";
  if (lower.includes("payroll") || lower.includes("deposit") || lower.includes("salary")) return "Ingresos";

  return "Otros";
}
