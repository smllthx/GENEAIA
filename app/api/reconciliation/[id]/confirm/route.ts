import { NextResponse } from "next/server";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  const { id } = await params;

  const { data: match } = await supabase
    .from("reconciliation_matches")
    .select("id,transaction_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "RECONCILIATION_NOT_FOUND" }, { status: 404 });

  const now = new Date().toISOString();
  const [{ error: matchError }, { error: transactionError }] = await Promise.all([
    supabase.from("reconciliation_matches").update({ decision: "confirmed", decided_by: user.id, decided_at: now }).eq("id", match.id),
    supabase.from("transactions").update({ status: "confirmed_by_statement", reviewed: true }).eq("id", match.transaction_id)
  ]);
  if (matchError || transactionError) return NextResponse.json({ error: matchError?.message ?? transactionError?.message }, { status: 500 });
  return NextResponse.json({ confirmed: true });
}
