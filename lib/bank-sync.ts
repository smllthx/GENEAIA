import { decryptBankToken, encryptBankToken } from "@/lib/security/token-crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { listFintocAccounts, listFintocMovements, normalizeFintocAccount, normalizeFintocMovement } from "@/lib/bank-providers/fintoc-live";
import {
  claimSimpleFinSetupToken,
  getSimpleFinAccounts,
  normalizeSimpleFinAccount,
  normalizeSimpleFinTransaction
} from "@/lib/bank-providers/simplefin-live";

type SupabaseLike = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export async function importFintocLink({
  userId,
  linkToken,
  institution,
  supabase: providedSupabase
}: {
  userId: string;
  linkToken: string;
  institution?: string;
  supabase?: SupabaseLike;
}) {
  const supabase = providedSupabase ?? getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  const accounts = await listFintocAccounts(linkToken);
  const firstInstitution = accounts[0]?.institution?.name ?? institution ?? "Fintoc";

  const { data: connection, error } = await supabase
    .from("bank_connections")
    .insert({
      user_id: userId,
      provider: "fintoc",
      institution: firstInstitution,
      encrypted_access_token: encryptBankToken(linkToken),
      external_connection_id: accounts.map((account) => account.id).join(","),
      status: "connected",
      read_only: true
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await syncBankConnection(userId, connection.id, supabase);

  return connection;
}

export async function importSimpleFinSetupToken({
  userId,
  setupToken,
  supabase: providedSupabase
}: {
  userId: string;
  setupToken: string;
  supabase?: SupabaseLike;
}) {
  const supabase = providedSupabase ?? getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  const accessUrl = await claimSimpleFinSetupToken(setupToken);
  const accountSet = await getSimpleFinAccounts(accessUrl);
  const firstConnection = accountSet.connections[0];
  const institution = firstConnection?.org_name ?? firstConnection?.name ?? "SimpleFIN Bridge";

  const { data: connection, error } = await supabase
    .from("bank_connections")
    .insert({
      user_id: userId,
      provider: "simplefin",
      institution,
      encrypted_access_token: encryptBankToken(accessUrl),
      external_connection_id: accountSet.connections.map((item) => item.conn_id).join(","),
      status: "connected",
      read_only: true
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await syncSimpleFinConnection(userId, connection, supabase, accountSet);

  return connection;
}

export async function syncBankConnection(userId: string, connectionId: string, providedSupabase?: SupabaseLike) {
  const supabase = providedSupabase ?? getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  const { data: connection, error: connectionError } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .single();

  if (connectionError || !connection) {
    throw connectionError ?? new Error("Bank connection not found.");
  }

  if (connection.provider === "simplefin") {
    return syncSimpleFinConnection(userId, connection, supabase);
  }

  if (connection.provider === "sandbox") {
    return syncSandboxConnection(userId, connection, supabase);
  }

  if (connection.provider !== "fintoc") {
    throw new Error(`Provider ${connection.provider} is not implemented for live sync yet.`);
  }

  const linkToken = decryptBankToken(connection.encrypted_access_token);
  const accounts = await listFintocAccounts(linkToken);

  for (const rawAccount of accounts) {
    const normalizedAccount = normalizeFintocAccount(rawAccount, connection.institution);
    const { data: upsertedAccount, error: accountError } = await supabase
      .from("accounts")
      .upsert(
        {
          user_id: userId,
          bank_connection_id: connection.id,
          ...normalizedAccount
        },
        { onConflict: "user_id,bank_connection_id,external_account_id" }
      )
      .select()
      .single();

    if (accountError) {
      throw accountError;
    }

    const movements = await listFintocMovements(linkToken, rawAccount.id);

    if (movements.length > 0) {
      const rows = movements.map((movement) => ({
        user_id: userId,
        account_id: upsertedAccount.id,
        ...normalizeFintocMovement(movement)
      }));

      const { error: movementsError } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "user_id,account_id,external_transaction_id" });

      if (movementsError) {
        throw movementsError;
      }
    }
  }

  await supabase
    .from("bank_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      status: "connected"
    })
    .eq("id", connection.id);

  return { syncedAccounts: accounts.length };
}

export async function importSandboxBank({
  userId,
  username,
  password,
  supabase: providedSupabase
}: {
  userId: string;
  username: string;
  password: string;
  supabase?: SupabaseLike;
}) {
  const supabase = providedSupabase ?? getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  if (username !== "wallet_test" || password !== "read-only-2026") {
    throw new Error("Credenciales sandbox incorrectas. Usa wallet_test / read-only-2026.");
  }

  const { data: existingConnection } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "sandbox")
    .maybeSingle();

  const connection = existingConnection ?? (await createSandboxConnection(userId, supabase));
  await syncSandboxConnection(userId, connection, supabase);

  return connection;
}

async function createSandboxConnection(userId: string, supabase: SupabaseLike) {
  const { data: connection, error } = await supabase
    .from("bank_connections")
    .insert({
      user_id: userId,
      provider: "sandbox",
      institution: "Wallet Sandbox Bank",
      encrypted_access_token: "sandbox-read-only-token",
      external_connection_id: "wallet-sandbox-bank",
      status: "connected",
      read_only: true
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return connection;
}

async function syncSandboxConnection(
  userId: string,
  connection: {
    id: string;
    institution: string;
  },
  supabase: SupabaseLike
) {
  const day = new Date().getDate();
  const accounts = [
    {
      external_account_id: "sandbox-checking",
      name: "Cuenta Corriente Sandbox",
      institution: connection.institution,
      type: "checking",
      balance: 1240000 + day * 1250,
      currency: "CLP",
      color: "from-sky-500 to-blue-800",
      icon: "🏦",
      is_manual: false,
      is_hidden: false,
      exclude_from_total: false
    },
    {
      external_account_id: "sandbox-credit",
      name: "Tarjeta Crédito Sandbox",
      institution: connection.institution,
      type: "credit",
      balance: -286000 - day * 900,
      currency: "CLP",
      color: "from-rose-500 to-orange-700",
      icon: "💳",
      is_manual: false,
      is_hidden: false,
      exclude_from_total: false
    }
  ];

  for (const account of accounts) {
    const { data: upsertedAccount, error: accountError } = await supabase
      .from("accounts")
      .upsert(
        {
          user_id: userId,
          bank_connection_id: connection.id,
          ...account
        },
        { onConflict: "user_id,bank_connection_id,external_account_id" }
      )
      .select()
      .single();

    if (accountError) {
      throw accountError;
    }

    const rows = buildSandboxTransactions(userId, upsertedAccount.id);
    const { error: transactionError } = await supabase
      .from("transactions")
      .upsert(rows, { onConflict: "user_id,account_id,external_transaction_id" });

    if (transactionError) {
      throw transactionError;
    }
  }

  await supabase
    .from("bank_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      status: "connected"
    })
    .eq("id", connection.id);

  return { provider: "sandbox", syncedAccounts: accounts.length };
}

function buildSandboxTransactions(userId: string, accountId: string) {
  const today = new Date();
  const items = [
    ["Uber", -8400, "Transporte", "Viaje sandbox"],
    ["Jumbo", -52390, "Comida", "Supermercado sandbox"],
    ["Spotify", -4550, "Suscripciones", "Suscripción sandbox"],
    ["Farmacia Cruz Verde", -12990, "Salud", "Compra salud sandbox"],
    ["Sueldo", 980000, "Ingresos", "Abono sandbox"],
    ["Metro", -1800, "Transporte", "Transporte sandbox"]
  ] as const;

  return items.map(([merchant, amount, category, description], index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index * 2);
    return {
      user_id: userId,
      account_id: accountId,
      external_transaction_id: `sandbox-${accountId}-${index}`,
      merchant,
      amount,
      date: date.toISOString().slice(0, 10),
      category,
      description,
      is_recurring: merchant === "Spotify",
      is_ai_categorized: true,
      reviewed: false
    };
  });
}

async function syncSimpleFinConnection(
  userId: string,
  connection: {
    id: string;
    institution: string;
    encrypted_access_token: string;
  },
  supabase: SupabaseLike,
  providedAccountSet?: Awaited<ReturnType<typeof getSimpleFinAccounts>>
) {
  const accessUrl = decryptBankToken(connection.encrypted_access_token);
  const accountSet = providedAccountSet ?? (await getSimpleFinAccounts(accessUrl));
  const accounts = accountSet.accounts ?? [];

  for (const rawAccount of accounts) {
    const normalizedAccount = normalizeSimpleFinAccount(rawAccount, accountSet.connections ?? []);
    const { data: upsertedAccount, error: accountError } = await supabase
      .from("accounts")
      .upsert(
        {
          user_id: userId,
          bank_connection_id: connection.id,
          ...normalizedAccount
        },
        { onConflict: "user_id,bank_connection_id,external_account_id" }
      )
      .select()
      .single();

    if (accountError) {
      throw accountError;
    }

    const transactions = rawAccount.transactions ?? [];

    if (transactions.length > 0) {
      const rows = transactions.map((transaction) => ({
        user_id: userId,
        account_id: upsertedAccount.id,
        ...normalizeSimpleFinTransaction(transaction)
      }));

      const { error: transactionsError } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "user_id,account_id,external_transaction_id" });

      if (transactionsError) {
        throw transactionsError;
      }
    }
  }

  await supabase
    .from("bank_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      status: "connected"
    })
    .eq("id", connection.id);

  return { provider: "simplefin", syncedAccounts: accounts.length };
}

export async function syncAllBankConnections(userId: string, providedSupabase?: SupabaseLike) {
  const supabase = providedSupabase ?? getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  const { data: connections, error } = await supabase
    .from("bank_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "connected");

  if (error) {
    throw error;
  }

  const results = [];

  for (const connection of connections ?? []) {
    results.push(await syncBankConnection(userId, connection.id, supabase));
  }

  return results;
}
