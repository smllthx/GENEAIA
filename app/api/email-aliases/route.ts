import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const { data, error: dbError } = await supabase
    .from("email_aliases")
    .select("id,address,provider,status,created_at,verified_at,revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return dbError
    ? NextResponse.json({ error: dbError.message }, { status: 500 })
    : NextResponse.json({ aliases: data ?? [] });
}

export async function POST(request: Request) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() || "inbox.wallet.local";
  const address = `u_${randomBytes(9).toString("base64url").toLowerCase()}@${domain}`;
  const provider = process.env.INBOUND_EMAIL_PROVIDER || "unconfigured";
  const { data: existingAliases } = await supabase
    .from("email_aliases")
    .select("id,address,provider,status,created_at")
    .eq("user_id", user.id)
    .neq("status", "revoked");
  const matchingAlias = existingAliases?.find((item) => item.address.endsWith(`@${domain}`));
  if (matchingAlias) return NextResponse.json({ alias: matchingAlias, receivingConfigured: domain !== "inbox.wallet.local" });
  if (existingAliases?.length) {
    await supabase.from("email_aliases").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("user_id", user.id).neq("status", "revoked");
  }
  const { data, error: dbError } = await supabase
    .from("email_aliases")
    .insert({ user_id: user.id, address, provider, status: "pending" })
    .select("id,address,provider,status,created_at")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ alias: data, receivingConfigured: domain !== "inbox.wallet.local" }, { status: 201 });
}
