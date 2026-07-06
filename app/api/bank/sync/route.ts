import { NextResponse } from "next/server";
import { syncAllBankConnections, syncBankConnection } from "@/lib/bank-sync";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : null;

  try {
    const supabase = getSupabaseForRequest(request);

    if (!supabase) {
      return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
    }

    const result = connectionId
      ? await syncBankConnection(user.id, connectionId, supabase)
      : await syncAllBankConnections(user.id, supabase);

    return NextResponse.json({ result });
  } catch (syncError) {
    return NextResponse.json(
      { error: syncError instanceof Error ? syncError.message : "bank_sync_failed" },
      { status: 500 }
    );
  }
}
