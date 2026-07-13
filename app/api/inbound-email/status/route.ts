import { NextResponse } from "next/server";

export async function GET() {
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() ?? "";
  const provider = process.env.INBOUND_EMAIL_PROVIDER?.trim().toLowerCase() ?? "resend";
  const checks = {
    domain: Boolean(domain),
    apiKey: Boolean(process.env.RESEND_API_KEY),
    webhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  };

  return NextResponse.json({
    provider,
    domain,
    configured: provider === "resend" && Object.values(checks).every(Boolean),
    checks
  });
}
