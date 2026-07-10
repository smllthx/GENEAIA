import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const aliasId = typeof body.aliasId === "string" ? body.aliasId : "";
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const { data: alias } = await supabase
    .from("email_aliases")
    .select("id,address")
    .eq("id", aliasId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!alias) return NextResponse.json({ error: "alias_not_found" }, { status: 404 });

  const token = randomBytes(18).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const providerConfigured = Boolean(process.env.INBOUND_EMAIL_DOMAIN && process.env.INBOUND_EMAIL_WEBHOOK_SECRET);

  const { data, error: dbError } = await supabase
    .from("email_verifications")
    .insert({
      user_id: user.id,
      alias_id: alias.id,
      token_hash: tokenHash,
      status: providerConfigured ? "sent" : "waiting",
      attempts: 1,
      expires_at: expiresAt
    })
    .select("id,status,attempts,expires_at,created_at")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  await supabase.from("email_aliases").update({ status: "testing" }).eq("id", alias.id);

  return NextResponse.json({
    verification: data,
    providerConfigured,
    message: providerConfigured
      ? "Prueba creada. El proveedor debe enviar el mensaje de loopback."
      : "Alias creado. Configura dominio y webhook para completar la prueba automatica."
  });
}
