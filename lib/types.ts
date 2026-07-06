export type Currency = "CLP" | "USD" | "EUR";

export type AccountType =
  | "checking"
  | "credit"
  | "savings"
  | "cash"
  | "digital_wallet"
  | "crypto";

export type InsightType =
  | "ahorro"
  | "alerta"
  | "oportunidad"
  | "riesgo"
  | "habito"
  | "presupuesto"
  | "deuda"
  | "suscripcion"
  | "tendencia_positiva"
  | "tendencia_negativa";

export type InsightSeverity = "green" | "blue" | "yellow" | "orange" | "red";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  currency: Currency;
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  color: string;
  icon: string;
  is_manual: boolean;
  is_hidden: boolean;
  exclude_from_total?: boolean;
  variation: number;
  last_update: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  is_recurring: boolean;
  is_ai_categorized: boolean;
  reviewed: boolean;
  tags: string[];
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  spent_amount: number;
  period: "weekly" | "monthly";
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  color: string;
  icon: string;
  created_at: string;
};

export type Debt = {
  id: string;
  user_id: string;
  person_name: string;
  type: "owed_by_me" | "owed_to_me";
  amount: number;
  paid_amount: number;
  due_date: string;
  status: "pending" | "partial" | "paid" | "overdue";
  notes: string;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  next_payment_date: string;
  category: string;
  account_id: string;
  active: boolean;
  created_at: string;
};

export type AIInsight = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  severity: InsightSeverity;
  type: InsightType;
  urgency: number;
  action: string;
  action_label?: string;
  quick_button: string;
  previous_month_delta: number;
  estimated_impact: number;
  icon: string;
  created_at: string;
};

export type BalancePoint = {
  day: string;
  balance: number;
  projected?: number;
};

export type CategoryPoint = {
  name: string;
  value: number;
  color: string;
};

export type HeatmapDay = {
  date: string;
  amount: number;
  level: 0 | 1 | 2 | 3 | 4;
};
