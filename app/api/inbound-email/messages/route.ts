import { NextResponse } from "next/server";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const { data, error: dbError } = await supabase
    .from("inbound_messages")
    .select("id,sender,subject,security_status,processing_status,metadata,received_at")
    .eq("user_id", user.id)
    .order("received_at", { ascending: false })
    .limit(10);

  return dbError ? NextResponse.json({ error: dbError.message }, { status: 500 }) : NextResponse.json({ messages: data ?? [] });
}
