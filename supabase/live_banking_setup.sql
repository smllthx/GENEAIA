create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  currency text not null default 'CLP',
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists country text default 'Chile';
alter table public.users add column if not exists main_bank text;
alter table public.users add column if not exists monthly_budget numeric(14,2) not null default 0;
alter table public.users add column if not exists weekly_budget numeric(14,2) not null default 0;
alter table public.users add column if not exists daily_budget numeric(14,2) not null default 0;
alter table public.users add column if not exists event_name text;
alter table public.users add column if not exists event_budget numeric(14,2) not null default 0;
alter table public.users add column if not exists updated_at timestamptz not null default now();

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  institution text not null,
  status text not null default 'connected',
  read_only boolean not null default true,
  encrypted_access_token text not null,
  external_connection_id text,
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  institution text not null,
  type text not null,
  balance numeric(14,2) not null default 0,
  currency text not null default 'CLP',
  color text,
  icon text,
  is_manual boolean not null default true,
  is_hidden boolean not null default false,
  exclude_from_total boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.accounts add column if not exists bank_connection_id uuid references public.bank_connections(id) on delete set null;
alter table public.accounts add column if not exists external_account_id text;
alter table public.accounts add column if not exists exclude_from_total boolean not null default false;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  merchant text not null,
  amount numeric(14,2) not null,
  date date not null,
  category text not null,
  description text,
  is_recurring boolean not null default false,
  is_ai_categorized boolean not null default false,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists external_transaction_id text;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null,
  limit_amount numeric(14,2) not null,
  spent_amount numeric(14,2) not null default 0,
  period text not null default 'monthly',
  created_at timestamptz not null default now()
);

create table if not exists public.expense_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  period text not null check (period in ('daily', 'weekly', 'monthly', 'annual', 'event')),
  category text not null default 'Otros',
  event_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  deadline date,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  person_name text not null,
  type text not null check (type in ('owed_by_me', 'owed_to_me')),
  amount numeric(14,2) not null,
  paid_amount numeric(14,2) not null default 0,
  due_date date,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  next_payment_date date not null,
  category text not null,
  account_id uuid references public.accounts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  severity text not null,
  type text not null,
  action_label text,
  estimated_impact numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists accounts_external_unique
  on public.accounts(user_id, bank_connection_id, external_account_id)
  where external_account_id is not null;

create unique index if not exists transactions_external_unique
  on public.transactions(user_id, account_id, external_transaction_id)
  where external_transaction_id is not null;

alter table public.users enable row level security;
alter table public.bank_connections enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.expense_plans enable row level security;
alter table public.goals enable row level security;
alter table public.debts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_insights enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Users can read own profile') then
    create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bank_connections' and policyname = 'Bank connections owned by user') then
    create policy "Bank connections owned by user" on public.bank_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'Accounts owned by user') then
    create policy "Accounts owned by user" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'Transactions owned by user') then
    create policy "Transactions owned by user" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'budgets' and policyname = 'Budgets owned by user') then
    create policy "Budgets owned by user" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'expense_plans' and policyname = 'Expense plans owned by user') then
    create policy "Expense plans owned by user" on public.expense_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'Goals owned by user') then
    create policy "Goals owned by user" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'debts' and policyname = 'Debts owned by user') then
    create policy "Debts owned by user" on public.debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'Subscriptions owned by user') then
    create policy "Subscriptions owned by user" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_insights' and policyname = 'AI insights owned by user') then
    create policy "AI insights owned by user" on public.ai_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
