import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const supabase = getSupabaseAdmin();
  if (!apiKey || !webhookSecret || !supabase) {
    return NextResponse.json({ error: "RESEND_INBOUND_NOT_CONFIGURED" }, { status: 503 });
  }

  const payload = await request.text();
  const resend = new Resend(apiKey);
  let event: ReturnType<typeof resend.webhooks.verify>;

  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? ""
      },
      webhookSecret
    });
  } catch {
    return NextResponse.json({ error: "INVALID_WEBHOOK_SIGNATURE" }, { status: 401 });
  }

  if (event.type !== "email.received") return NextResponse.json({ ignored: true });
  const recipients = [...event.data.to, ...event.data.received_for].map((value) => value.trim().toLowerCase());
  const { data: alias } = await supabase
    .from("email_aliases")
    .select("id,user_id,address,status")
    .in("address", recipients)
    .neq("status", "revoked")
    .limit(1)
    .maybeSingle();
  if (!alias) return NextResponse.json({ error: "EMAIL_ALIAS_NOT_FOUND" }, { status: 404 });

  const { data: email, error: emailError } = await resend.emails.receiving.get(event.data.email_id, { html_format: "cid" });
  if (emailError || !email) return NextResponse.json({ error: "EMAIL_CONTENT_UNAVAILABLE" }, { status: 502 });

  const sender = extractEmailAddress(email.from);
  const senderDomain = sender.split("@")[1] ?? "";
  const authentication = email.headers?.["authentication-results"] ?? email.headers?.["Authentication-Results"] ?? "";
  const authenticationPasses = /spf=pass/i.test(authentication) && /dkim=pass/i.test(authentication);
  const { data: exactSender } = await supabase.from("bank_senders").select("id").eq("enabled", true).eq("email", sender).limit(1).maybeSingle();
  const { data: domainSender } = exactSender ? { data: null } : await supabase.from("bank_senders").select("id").eq("enabled", true).eq("domain", senderDomain).limit(1).maybeSingle();
  const securityStatus = authenticationPasses && (exactSender || domainSender) ? "trusted" : "partially_trusted";

  const { data: message, error: messageError } = await supabase
    .from("inbound_messages")
    .insert({
      user_id: alias.user_id,
      alias_id: alias.id,
      message_id: email.message_id || event.data.email_id,
      sender,
      subject: email.subject.slice(0, 240),
      received_at: email.created_at,
      security_status: securityStatus,
      processing_status: "validated",
      metadata: {
        provider: "resend",
        resend_email_id: event.data.email_id,
        attachment_count: email.attachments.length,
        authentication_passes: authenticationPasses,
        forwarding_confirmation_url: extractForwardingConfirmationUrl(`${email.text ?? ""}\n${email.html ?? ""}`)
      }
    })
    .select("id")
    .single();
  if (messageError) {
    if (messageError.code === "23505") return NextResponse.json({ duplicate: true });
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  const parsed = parseBankNotification(`${email.subject}\n${email.text ?? stripHtml(email.html ?? "")}`, email.created_at);
  if (!parsed) {
    await Promise.all([
      supabase.from("inbound_messages").update({ processing_status: "needs_review", error_code: "EMAIL_PARSE_FAILED" }).eq("id", message.id),
      activateAlias(supabase, alias.id)
    ]);
    return NextResponse.json({ messageId: message.id, status: "needs_review" }, { status: 202 });
  }

  const { data: account } = await supabase.from("accounts").select("id").eq("user_id", alias.user_id).order("created_at").limit(1).maybeSingle();
  if (!account) {
    await Promise.all([
      supabase.from("inbound_messages").update({ processing_status: "account_required" }).eq("id", message.id),
      activateAlias(supabase, alias.id)
    ]);
    return NextResponse.json({ messageId: message.id, status: "account_required" }, { status: 202 });
  }

  const sourceKey = `resend:${event.data.email_id}`;
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: alias.user_id,
      account_id: account.id,
      merchant: parsed.merchant,
      raw_merchant: parsed.merchant,
      normalized_merchant: parsed.merchant,
      amount: `-${parsed.amount}`,
      date: parsed.date,
      category: "Por revisar",
      description: "Notificacion bancaria recibida por correo",
      is_recurring: false,
      is_ai_categorized: false,
      reviewed: false,
      status: "provisional",
      transaction_type: "expense",
      source_confidence: securityStatus === "trusted" ? "0.85" : "0.65",
      external_transaction_id: sourceKey
    })
    .select("id")
    .single();
  if (transactionError || !transaction) return NextResponse.json({ error: transactionError?.message ?? "TRANSACTION_CREATE_FAILED" }, { status: 500 });

  await Promise.all([
    supabase.from("transaction_sources").insert({
      user_id: alias.user_id,
      transaction_id: transaction.id,
      source_type: "email",
      source_id: message.id,
      source_key: sourceKey,
      evidence: { provider: "resend", security_status: securityStatus }
    }),
    supabase.from("inbound_messages").update({ processing_status: "stored", parser_version: "resend-deterministic-1" }).eq("id", message.id),
    activateAlias(supabase, alias.id)
  ]);

  return NextResponse.json({ transactionId: transaction.id }, { status: 201 });
}

function activateAlias(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, aliasId: string) {
  return supabase.from("email_aliases").update({ status: "active", verified_at: new Date().toISOString() }).eq("id", aliasId);
}

function extractEmailAddress(value: string) {
  return (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase();
}

function stripHtml(value: string) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function extractForwardingConfirmationUrl(value: string) {
  const urls = value.match(/https:\/\/[^\s"'<>]+/gi) ?? [];
  for (const rawUrl of urls) {
    const decoded = rawUrl.replace(/&amp;/g, "&");
    try {
      const url = new URL(decoded);
      if (["mail-settings.google.com", "accounts.google.com", "outlook.live.com", "account.live.com"].includes(url.hostname)) {
        return url.toString();
      }
    } catch {
      continue;
    }
  }
  return null;
}

function parseBankNotification(value: string, rawDate?: string) {
  const amountMatch = value.match(/(?:CLP|\$)\s*([\d.]+(?:,\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = amountMatch[1].includes(",") ? amountMatch[1].replace(/\./g, "").replace(",", ".") : amountMatch[1].replace(/\./g, "");
  const merchantMatch = value.match(/(?:en|comercio|establecimiento)\s*[:\-]?\s*([^\n,.]{3,80})/i);
  const date = rawDate && !Number.isNaN(new Date(rawDate).getTime()) ? new Date(rawDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return { amount, merchant: merchantMatch?.[1]?.trim() ?? "Movimiento bancario", date };
}
