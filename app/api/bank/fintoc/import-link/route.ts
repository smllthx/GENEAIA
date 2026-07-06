import { NextResponse } from "next/server";
import { importFintocLink } from "@/lib/bank-sync";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const linkToken = typeof body.linkToken === "string" ? body.linkToken.trim() : "";
  const institution = typeof body.institution === "string" ? body.institution.trim() : undefined;

  if (!linkToken || !linkToken.startsWith("link_")) {
    return NextResponse.json({ error: "invalid_fintoc_link_token" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseForRequest(request);

    if (!supabase) {
      return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
    }

    await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? "sin-email@wallet.app",
        name: user.email?.split("@")[0] ?? "Wallet",
        currency: "CLP"
      },
      { onConflict: "id" }
    );

    const connection = await importFintocLink({ userId: user.id, linkToken, institution, supabase });

    return NextResponse.json({
      connection: {
        id: connection.id,
        provider: connection.provider,
        institution: connection.institution,
        status: connection.status
      }
    });
  } catch (importError) {
    return NextResponse.json(
      { error: importError instanceof Error ? importError.message : "fintoc_import_failed" },
      { status: 500 }
    );
  }
}
