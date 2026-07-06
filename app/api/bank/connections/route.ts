import { NextResponse } from "next/server";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { user, error } = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const supabase = getSupabaseForRequest(request);

  if (!supabase) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const { data, error: dbError } = await supabase
    .from("bank_connections")
    .select("id, provider, institution, status, read_only, last_synced_at, sync_error, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ connections: data ?? [] });
}
