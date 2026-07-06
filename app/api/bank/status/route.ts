import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    encryption: Boolean(process.env.BANK_TOKEN_ENCRYPTION_KEY),
    providers: {
      simplefin: {
        configured: true,
        mode: "bridge_read_only",
        createUrl: "https://bridge.simplefin.org/simplefin/create"
      },
      fintoc: {
        configured: Boolean(process.env.FINTOC_API_KEY),
        publicKeyConfigured: Boolean(process.env.NEXT_PUBLIC_FINTOC_PUBLIC_KEY),
        mode: process.env.FINTOC_API_KEY?.startsWith("sk_live") ? "live" : process.env.FINTOC_API_KEY ? "test" : "not_configured"
      },
      plaid: {
        configured: Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
        mode: process.env.PLAID_ENV ?? "sandbox"
      }
    }
  });
}
