export type ReconciliationInput = {
  amount: string;
  date: string;
  merchant: string;
  accountId?: string | null;
  currency?: string | null;
  reference?: string | null;
};

export type TransactionCandidate = {
  id: string;
  amount: number | string;
  date: string;
  merchant: string;
  account_id: string;
  currency?: string | null;
  external_transaction_id?: string | null;
};

function comparableMerchant(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function daysBetween(left: string, right: string) {
  return Math.round(Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 86_400_000);
}

export function scoreReconciliation(input: ReconciliationInput, candidate: TransactionCandidate) {
  let score = 0;
  const matched: string[] = [];
  const conflicts: string[] = [];
  const inputAmount = canonicalAmount(input.amount);
  const candidateAmount = canonicalAmount(String(candidate.amount));

  if (input.reference && candidate.external_transaction_id?.includes(input.reference)) {
    score += 60;
    matched.push("reference");
  }

  if (inputAmount === candidateAmount) {
    score += 30;
    matched.push("amount");
  } else {
    conflicts.push("amount");
  }

  if (input.accountId && input.accountId === candidate.account_id) {
    score += 20;
    matched.push("account");
  }

  if (!input.currency || !candidate.currency || input.currency === candidate.currency) {
    score += 10;
    matched.push("currency");
  } else {
    conflicts.push("currency");
  }

  const dayDifference = daysBetween(input.date, candidate.date);
  if (dayDifference <= 1) {
    score += 15;
    matched.push("date");
  } else if (dayDifference <= 3) {
    score += 8;
    matched.push("near_date");
  } else {
    conflicts.push("date");
  }

  const sourceMerchant = comparableMerchant(input.merchant);
  const candidateMerchant = comparableMerchant(candidate.merchant);
  if (sourceMerchant && candidateMerchant && (sourceMerchant.includes(candidateMerchant) || candidateMerchant.includes(sourceMerchant))) {
    score += 10;
    matched.push("merchant");
  }

  return { score, matched, conflicts };
}

function canonicalAmount(value: string) {
  const unsigned = value.replace(/^-/, "");
  const [integerPart, decimalPart = ""] = unsigned.split(".");
  const integer = integerPart.replace(/^0+(?=\d)/, "");
  const decimal = decimalPart.replace(/0+$/, "");
  return decimal ? `${integer}.${decimal}` : integer;
}
