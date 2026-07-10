import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type InboundPayload = {
  recipient?: string;
  sender?: string;
  subject?: string;
  messageId?: string;
  date?: string;
  text?: string;
  spf?: "pass" | "fail" | "neutral";
  dkim?: "pass" | "fail" | "neutral";
  dmarc?: "pass" | "fail" | "neutral";
  verificationToken?: string;
};

export async function POST(request: Request) {
  const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  const supabase = getSupabaseAdmin();
  if (!secret || !supabase) return NextResponse.json({ error: "INBOUND_EMAIL_NOT_CONFIGURED" }, { status: 503 });

  const rawBody = await request.text();
  const receivedSignature = request.headers.get("x-wallet-signature") ?? "";
  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!safeEqual(receivedSignature, expectedSignature)) {
    return NextResponse.json({ error: "INVALID_WEBHOOK_SIGNATURE" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as InboundPayload;
  const recipient = payload.recipient?.trim().toLowerCase();
  const sender = payload.sender?.trim().toLowerCase();
  const messageId = payload.messageId?.trim();
  if (!recipient || !sender || !messageId) return NextResponse.json({ error: "INVALID_INBOUND_MESSAGE" }, { status: 400 });

  const { data: alias } = await supabase.from("email_aliases").select("id,user_id,status").eq("address", recipient).maybeSingle();
  if (!alias || alias.status === "revoked") return NextResponse.json({ error: "EMAIL_ALIAS_NOT_FOUND" }, { status: 404 });

  if (payload.verificationToken) {
    const tokenHash = createHash("sha256").update(payload.verificationToken).digest("hex");
    const { data: verification } = await supabase
      .from("email_verifications")
      .select("id,expires_at")
      .eq("alias_id", alias.id)
      .eq("token_hash", tokenHash)
      .in("status", ["sent", "waiting", "received"])
      .maybeSingle();
    if (verification && new Date(verification.expires_at) > new Date()) {
      await Promise.all([
        supabase.from("email_verifications").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", verification.id),
        supabase.from("email_aliases").update({ status: "active", verified_at: new Date().toISOString() }).eq("id", alias.id)
      ]);
      return NextResponse.json({ verified: true });
    }
  }

  const authenticationPasses = payload.spf === "pass" && payload.dkim === "pass" && payload.dmarc === "pass";
  const senderDomain = sender.split("@")[1] ?? "";
  const { data: exactSender } = await supabase
    .from("bank_senders")
    .select("id,verification_level")
    .eq("enabled", true)
    .eq("email", sender)
    .limit(1)
    .maybeSingle();
  const { data: domainSender } = exactSender ? { data: null } : await supabase
    .from("bank_senders")
    .select("id,verification_level")
    .eq("enabled", true)
    .eq("domain", senderDomain)
    .limit(1)
    .maybeSingle();
  const registeredSender = exactSender ?? domainSender;
  const securityStatus = authenticationPasses && registeredSender ? "trusted" : authenticationPasses ? "partially_trusted" : "suspicious";

  const { data: message, error: messageError } = await supabase
    .from("inbound_messages")
    .insert({
      user_id: alias.user_id,
      alias_id: alias.id,
      message_id: messageId,
      sender,
      subject: payload.subject?.slice(0, 240) ?? null,
      security_status: securityStatus,
      processing_status: securityStatus === "trusted" ? "validated" : "needs_review",
      metadata: { spf: payload.spf, dkim: payload.dkim, dmarc: payload.dmarc }
    })
    .select("id")
    .single();
  if (messageError) {
    if (messageError.code === "23505") return NextResponse.json({ duplicate: true });
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  if (securityStatus !== "trusted") return NextResponse.json({ messageId: message.id, status: "needs_review" }, { status: 202 });
  const parsed = parseBankNotification(`${payload.subject ?? ""}\n${payload.text ?? ""}`, payload.date);
  if (!parsed) {
    await supabase.from("inbound_messages").update({ processing_status: "parse_failed", error_code: "EMAIL_PARSE_FAILED" }).eq("id", message.id);
    return NextResponse.json({ messageId: message.id, status: "parse_failed" }, { status: 202 });
  }

  const { data: account } = await supabase.from("accounts").select("id").eq("user_id", alias.user_id).order("created_at").limit(1).maybeSingle();
  if (!account) return NextResponse.json({ messageId: message.id, status: "account_required" }, { status: 202 });
  const sourceKey = `email:${alias.id}:${messageId}`;
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
      description: "Notificacion bancaria por correo",
      reviewed: false,
      status: "provisional",
      transaction_type: "expense",
      source_confidence: "0.75",
      external_transaction_id: sourceKey
    })
    .select("id")
    .single();
  if (transactionError || !transaction) return NextResponse.json({ error: transactionError?.message ?? "TRANSACTION_CREATE_FAILED" }, { status: 500 });

  await Promise.all([
    supabase.from("transaction_sources").insert({ user_id: alias.user_id, transaction_id: transaction.id, source_type: "email", source_id: message.id, source_key: sourceKey, evidence: { securityStatus } }),
    supabase.from("inbound_messages").update({ processing_status: "stored", parser_version: "email-deterministic-1" }).eq("id", message.id)
  ]);
  return NextResponse.json({ transactionId: transaction.id }, { status: 201 });
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBankNotification(value: string, rawDate?: string) {
  const amountMatch = value.match(/(?:CLP|\$)\s*([\d.]+(?:,\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = amountMatch[1].includes(",") ? amountMatch[1].replace(/\./g, "").replace(",", ".") : amountMatch[1].replace(/\./g, "");
  const merchantMatch = value.match(/(?:en|comercio|establecimiento)\s*[:\-]?\s*([^\n,.]{3,80})/i);
  const date = rawDate && !Number.isNaN(new Date(rawDate).getTime()) ? new Date(rawDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return { amount, merchant: merchantMatch?.[1]?.trim() ?? "Movimiento bancario", date };
}
