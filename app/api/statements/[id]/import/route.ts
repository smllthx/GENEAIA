import { NextResponse } from "next/server";
import { scoreReconciliation, type TransactionCandidate } from "@/lib/automation/reconciliation";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const requestedAccountId = typeof body.accountId === "string" ? body.accountId : null;
  const { data: statement } = await supabase
    .from("statements")
    .select("id,user_id,account_id,currency,status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!statement) return NextResponse.json({ error: "STATEMENT_NOT_FOUND" }, { status: 404 });

  const { data: account } = requestedAccountId
    ? await supabase.from("accounts").select("id,currency").eq("id", requestedAccountId).eq("user_id", user.id).maybeSingle()
    : statement.account_id
      ? await supabase.from("accounts").select("id,currency").eq("id", statement.account_id).eq("user_id", user.id).maybeSingle()
      : await supabase.from("accounts").select("id,currency").eq("user_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!account) return NextResponse.json({ error: "ACCOUNT_REQUIRED" }, { status: 400 });

  const { data: rows, error: rowsError } = await supabase
    .from("statement_rows")
    .select("*")
    .eq("statement_id", statement.id)
    .order("row_index");
  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ error: "STATEMENT_HAS_NO_ROWS" }, { status: 400 });

  const dates = rows.map((row) => row.transaction_date).filter(Boolean).sort();
  const minDate = shiftDate(dates[0], -3);
  const maxDate = shiftDate(dates[dates.length - 1], 3);
  const { data: candidates } = await supabase
    .from("transactions")
    .select("id,amount,date,merchant,account_id,external_transaction_id,status")
    .eq("user_id", user.id)
    .gte("date", minDate)
    .lte("date", maxDate);

  let created = 0;
  let matched = 0;

  for (const row of rows) {
    if (!row.transaction_date) continue;
    const isCredit = Number(row.credit ?? 0) > 0;
    const rawAmount = String(isCredit ? row.credit : row.debit ?? "0");
    if (rawAmount === "0") continue;
    const signedAmount = isCredit ? rawAmount : `-${rawAmount}`;
    const sourceKey = `statement:${statement.id}:${row.row_index}`;
    const alreadyImported = await supabase
      .from("transaction_sources")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_key", sourceKey)
      .maybeSingle();
    if (alreadyImported.data) continue;

    const scored = ((candidates ?? []) as TransactionCandidate[])
      .map((candidate) => ({ candidate, ...scoreReconciliation({
        amount: signedAmount,
        date: row.transaction_date,
        merchant: row.raw_description,
        accountId: account.id,
        currency: account.currency,
        reference: row.reference
      }, candidate) }))
      .sort((left, right) => right.score - left.score);
    const best = scored[0];

    if (best && best.score >= 70) {
      await supabase.from("reconciliation_matches").upsert({
        user_id: user.id,
        transaction_id: best.candidate.id,
        statement_row_id: row.id,
        score: best.score,
        matched_fields: best.matched,
        conflicting_fields: best.conflicts,
        decision: best.score >= 90 ? "auto_confirmed" : "suggested",
        decided_by: best.score >= 90 ? "system" : null,
        decided_at: best.score >= 90 ? new Date().toISOString() : null
      }, { onConflict: "transaction_id,statement_row_id" });
      await supabase.from("transaction_sources").insert({
        user_id: user.id,
        transaction_id: best.candidate.id,
        source_type: "statement",
        source_id: row.id,
        source_key: sourceKey,
        evidence: { score: best.score, page: row.raw_source_location?.page ?? null }
      });
      if (best.score >= 90) {
        await supabase.from("transactions").update({ status: "confirmed_by_statement", reviewed: true }).eq("id", best.candidate.id);
      }
      matched += 1;
      continue;
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: account.id,
        merchant: row.raw_description,
        raw_merchant: row.raw_description,
        normalized_merchant: row.raw_description,
        amount: signedAmount,
        date: row.transaction_date,
        category: "Por revisar",
        description: `Importado desde ${statement.id.slice(0, 8)}`,
        is_recurring: false,
        is_ai_categorized: false,
        reviewed: false,
        status: "provisional",
        transaction_type: isCredit ? "income" : "expense",
        source_confidence: row.extraction_confidence,
        external_transaction_id: sourceKey
      })
      .select("id")
      .single();
    if (transactionError || !transaction) continue;

    await supabase.from("transaction_sources").insert({
      user_id: user.id,
      transaction_id: transaction.id,
      source_type: "statement",
      source_id: row.id,
      source_key: sourceKey,
      evidence: { page: row.raw_source_location?.page ?? null, confidence: row.extraction_confidence }
    });
    created += 1;
  }

  await Promise.all([
    supabase.from("statements").update({ status: "imported" }).eq("id", statement.id),
    supabase.from("audit_events").insert({
      user_id: user.id,
      action: "statement_imported",
      entity_type: "statement",
      entity_id: statement.id,
      metadata: { created, matched }
    })
  ]);
  return NextResponse.json({ created, matched });
}

function shiftDate(value: string | undefined, days: number) {
  const date = value ? new Date(`${value}T00:00:00Z`) : new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
