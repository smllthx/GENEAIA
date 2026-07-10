export type ParsedStatementRow = {
  rowIndex: number;
  transactionDate: string;
  rawDescription: string;
  debit: string | null;
  credit: string | null;
  balance: string | null;
  reference: string | null;
  confidence: string;
  page: number;
};

type TextPage = { num: number; text: string };

const datePattern = /^(\d{2})[/-](\d{2})(?:[/-](\d{2,4}))?$/;
const rowPattern = /^(\d{2}[/-]\d{2}(?:[/-]\d{2,4})?)\s+(.+?)\s+(-?\$?\s?[\d.]+(?:,\d{1,2})?)(?:\s+(-?\$?\s?[\d.]+(?:,\d{1,2})?))?(?:\s+(-?\$?\s?[\d.]+(?:,\d{1,2})?))?$/;

function normalizeDate(value: string, fallbackYear: number) {
  const match = value.match(datePattern);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = match[3] ? Number(match[3]) : fallbackYear;
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function normalizeAmount(value?: string) {
  if (!value) return null;
  const compact = value.replace(/[$\s]/g, "");
  const negative = compact.startsWith("-");
  const unsigned = compact.replace(/^[-+]/, "");
  const normalized = unsigned.includes(",")
    ? unsigned.replace(/\./g, "").replace(",", ".")
    : unsigned.replace(/\./g, "");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  return `${negative ? "-" : ""}${normalized}`;
}

function positiveAmount(value: string | null) {
  if (!value || value === "0" || value === "0.00") return null;
  return value.startsWith("-") ? value.slice(1) : value;
}

export function parseStatementPages(pages: TextPage[], fallbackYear = new Date().getFullYear()) {
  const parsed: ParsedStatementRow[] = [];

  for (const page of pages) {
    for (const rawLine of page.text.split(/\r?\n/)) {
      const line = rawLine.replace(/\s+/g, " ").trim();
      const match = line.match(rowPattern);
      if (!match) continue;

      const transactionDate = normalizeDate(match[1], fallbackYear);
      const description = match[2]?.trim();
      if (!transactionDate || !description || description.length < 2) continue;

      const first = normalizeAmount(match[3]);
      const second = normalizeAmount(match[4]);
      const third = normalizeAmount(match[5]);
      const signedSingle = first?.startsWith("-") ?? false;
      const debit = match[4] ? positiveAmount(first) : signedSingle ? positiveAmount(first) : positiveAmount(first);
      const credit = match[4] ? positiveAmount(second) : signedSingle ? null : null;

      parsed.push({
        rowIndex: parsed.length,
        transactionDate,
        rawDescription: description.slice(0, 240),
        debit,
        credit,
        balance: positiveAmount(third),
        reference: extractReference(description),
        confidence: match[4] ? "0.82" : "0.72",
        page: page.num
      });
    }
  }

  return parsed;
}

function extractReference(description: string) {
  const match = description.match(/(?:ref(?:erencia)?|operacion|nro)\s*[:#-]?\s*([a-z0-9-]{5,})/i);
  return match?.[1] ?? null;
}

export function hasUnsafePdfActions(data: Uint8Array) {
  const sample = Buffer.from(data).toString("latin1");
  return /\/(?:JavaScript|JS|OpenAction|Launch|EmbeddedFile)\b/i.test(sample);
}
