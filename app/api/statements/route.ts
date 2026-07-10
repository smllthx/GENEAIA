import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hasUnsafePdfActions, parseStatementPages } from "@/lib/automation/statement-parser";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const { data, error: dbError } = await supabase
    .from("statements")
    .select("*,processing_jobs(*),statement_rows(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return dbError
    ? NextResponse.json({ error: dbError.message }, { status: 500 })
    : NextResponse.json({ statements: data ?? [] });
}

export async function POST(request: Request) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const formData = await request.formData();
  const file = formData.get("file");
  const accountId = typeof formData.get("accountId") === "string" ? String(formData.get("accountId")) : null;

  if (!(file instanceof File)) return NextResponse.json({ error: "STATEMENT_FILE_REQUIRED" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "UPLOAD_TOO_LARGE" }, { status: 413 });

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const magic = Buffer.from(bytes.slice(0, 5)).toString("ascii");
  if (file.type !== "application/pdf" || magic !== "%PDF-") {
    return NextResponse.json({ error: "STATEMENT_UNSUPPORTED" }, { status: 415 });
  }
  if (hasUnsafePdfActions(bytes)) return NextResponse.json({ error: "MALWARE_DETECTED" }, { status: 422 });

  const documentHash = createHash("sha256").update(bytes).digest("hex");
  const { data: duplicate } = await supabase
    .from("statements")
    .select("id,status,file_name")
    .eq("user_id", user.id)
    .eq("document_hash", documentHash)
    .maybeSingle();
  if (duplicate) return NextResponse.json({ error: "STATEMENT_DUPLICATE", statement: duplicate }, { status: 409 });

  const { data: job, error: jobError } = await supabase
    .from("processing_jobs")
    .insert({ user_id: user.id, type: "statement", status: "extracting_text", progress: 20, started_at: new Date().toISOString() })
    .select("*")
    .single();
  if (jobError || !job) return NextResponse.json({ error: jobError?.message ?? "JOB_CREATE_FAILED" }, { status: 500 });

  const statementId = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "cartola.pdf";
  const storagePath = `${user.id}/${statementId}/${safeName}`;
  const { data: statement, error: statementError } = await supabase
    .from("statements")
    .insert({
      id: statementId,
      user_id: user.id,
      account_id: accountId || null,
      processing_job_id: job.id,
      document_hash: documentHash,
      storage_path: storagePath,
      file_name: safeName,
      mime_type: "application/pdf",
      status: "extracting_text",
      malware_status: "basic_scan_passed"
    })
    .select("*")
    .single();
  if (statementError || !statement) return NextResponse.json({ error: statementError?.message ?? "STATEMENT_CREATE_FAILED" }, { status: 500 });

  const { error: uploadError } = await supabase.storage
    .from("statements")
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) return failJob(supabase, job.id, statement.id, "STATEMENT_STORAGE_FAILED", uploadError.message);

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    await supabase.from("processing_jobs").update({ status: "parsing_tables", progress: 55 }).eq("id", job.id);
    const textResult = await parser.getText();
    const rows = parseStatementPages(textResult.pages);

    if (rows.length > 0) {
      const { error: rowsError } = await supabase.from("statement_rows").insert(
        rows.map((row) => ({
          statement_id: statement.id,
          row_index: row.rowIndex,
          transaction_date: row.transactionDate,
          raw_description: row.rawDescription,
          debit: row.debit,
          credit: row.credit,
          balance: row.balance,
          reference: row.reference,
          extraction_confidence: row.confidence,
          raw_source_location: { page: row.page }
        }))
      );
      if (rowsError) return failJob(supabase, job.id, statement.id, "STATEMENT_PARSE_FAILED", rowsError.message);
    }

    const status = rows.length > 0 ? "needs_review" : "needs_review";
    await Promise.all([
      supabase.from("statements").update({ status, processed_at: new Date().toISOString() }).eq("id", statement.id),
      supabase.from("processing_jobs").update({ status, progress: 100, completed_at: new Date().toISOString() }).eq("id", job.id)
    ]);

    return NextResponse.json({ statement: { ...statement, status }, extractedRows: rows.length }, { status: 201 });
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "PDF parse failed";
    const code = /password/i.test(message) ? "STATEMENT_PASSWORD_PROTECTED" : "STATEMENT_PARSE_FAILED";
    return failJob(supabase, job.id, statement.id, code, message);
  } finally {
    await parser.destroy();
  }
}

async function failJob(
  supabase: NonNullable<ReturnType<typeof getSupabaseForRequest>>,
  jobId: string,
  statementId: string,
  code: string,
  message: string
) {
  await Promise.all([
    supabase.from("statements").update({ status: "failed" }).eq("id", statementId),
    supabase.from("processing_jobs").update({ status: "failed", error_code: code, error_message: message.slice(0, 300), completed_at: new Date().toISOString() }).eq("id", jobId)
  ]);
  return NextResponse.json({ error: code }, { status: 422 });
}
