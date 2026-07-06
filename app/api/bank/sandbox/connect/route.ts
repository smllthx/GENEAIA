import { NextResponse } from "next/server";
import { importSandboxBank } from "@/lib/bank-sync";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  try {
    const supabase = getSupabaseForRequest(request);

    if (!supabase) {
      return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
    }

    await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? user.phone ?? "sin-contacto@wallet.app",
        name: user.email?.split("@")[0] ?? user.phone ?? "Wallet",
        currency: "CLP"
      },
      { onConflict: "id" }
    );

    const connection = await importSandboxBank({ userId: user.id, username, password, supabase });

    return NextResponse.json({
      connection: {
        id: connection.id,
        provider: connection.provider,
        institution: connection.institution,
        status: connection.status
      }
    });
  } catch (connectError) {
    return NextResponse.json(
      { error: connectError instanceof Error ? connectError.message : "sandbox_bank_failed" },
      { status: 400 }
    );
  }
}
