create table if not exists public.banks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  country text not null default 'CL',
  logo_reference text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_connectors (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.banks(id) on delete cascade,
  version text not null default '1',
  parser_type text not null default 'deterministic',
  supported_events text[] not null default '{}',
  enabled boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_senders (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.bank_connectors(id) on delete cascade,
  email text,
  domain text,
  description text,
  enabled boolean not null default true,
  verification_level text not null default 'partially_trusted',
  created_at timestamptz not null default now()
);

create table if not exists public.email_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  address text not null unique,
  provider text not null default 'unconfigured',
  status text not null default 'pending' check (status in ('pending', 'testing', 'active', 'failed', 'revoked')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  alias_id uuid not null references public.email_aliases(id) on delete cascade,
  token_hash text not null,
  status text not null default 'created' check (status in ('created', 'sent', 'waiting', 'received', 'verified', 'expired', 'failed')),
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  alias_id uuid not null references public.email_aliases(id) on delete cascade,
  message_id text not null,
  sender text not null,
  subject text,
  received_at timestamptz not null default now(),
  security_status text not null check (security_status in ('trusted', 'partially_trusted', 'suspicious', 'rejected')),
  processing_status text not null default 'received',
  parser_version text,
  error_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(alias_id, message_id)
);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  status text not null,
  attempts integer not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bank_id uuid references public.banks(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  processing_job_id uuid references public.processing_jobs(id) on delete set null,
  document_hash text not null,
  storage_path text,
  file_name text not null,
  mime_type text not null,
  period_start date,
  period_end date,
  initial_balance numeric(18,2),
  final_balance numeric(18,2),
  currency text not null default 'CLP',
  status text not null default 'received',
  malware_status text not null default 'basic_scan_passed',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(user_id, document_hash)
);

create table if not exists public.statement_rows (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.statements(id) on delete cascade,
  row_index integer not null,
  transaction_date date,
  posting_date date,
  raw_description text not null,
  debit numeric(18,2),
  credit numeric(18,2),
  balance numeric(18,2),
  reference text,
  extraction_confidence numeric(5,4) not null default 0,
  raw_source_location jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(statement_id, row_index)
);

alter table public.transactions add column if not exists status text not null default 'confirmed';
alter table public.transactions add column if not exists raw_merchant text;
alter table public.transactions add column if not exists normalized_merchant text;
alter table public.transactions add column if not exists transaction_type text not null default 'expense';
alter table public.transactions add column if not exists source_confidence numeric(5,4);

create table if not exists public.transaction_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  source_key text not null,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, source_key)
);

create table if not exists public.classification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  merchant_pattern text,
  bank_pattern text,
  transaction_type text,
  category text,
  subcategory text,
  ownership text,
  frequency text,
  priority integer not null default 100,
  enabled boolean not null default true,
  created_from_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  statement_row_id uuid not null references public.statement_rows(id) on delete cascade,
  score integer not null,
  matched_fields text[] not null default '{}',
  conflicting_fields text[] not null default '{}',
  decision text not null default 'suggested',
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique(transaction_id, statement_row_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  correlation_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id, consent_type, policy_version)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('statements', 'statements', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.email_aliases enable row level security;
alter table public.email_verifications enable row level security;
alter table public.inbound_messages enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.statements enable row level security;
alter table public.statement_rows enable row level security;
alter table public.transaction_sources enable row level security;
alter table public.classification_rules enable row level security;
alter table public.reconciliation_matches enable row level security;
alter table public.audit_events enable row level security;
alter table public.privacy_consents enable row level security;

drop policy if exists "Email aliases owned by user" on public.email_aliases;
create policy "Email aliases owned by user" on public.email_aliases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Email verifications owned by user" on public.email_verifications;
create policy "Email verifications owned by user" on public.email_verifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Inbound messages owned by user" on public.inbound_messages;
create policy "Inbound messages owned by user" on public.inbound_messages for select using (auth.uid() = user_id);
drop policy if exists "Processing jobs owned by user" on public.processing_jobs;
create policy "Processing jobs owned by user" on public.processing_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Statements owned by user" on public.statements;
create policy "Statements owned by user" on public.statements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Statement rows through statement owner" on public.statement_rows;
create policy "Statement rows through statement owner" on public.statement_rows for all using (exists (select 1 from public.statements s where s.id = statement_id and s.user_id = auth.uid())) with check (exists (select 1 from public.statements s where s.id = statement_id and s.user_id = auth.uid()));
drop policy if exists "Transaction sources owned by user" on public.transaction_sources;
create policy "Transaction sources owned by user" on public.transaction_sources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Classification rules owned by user" on public.classification_rules;
create policy "Classification rules owned by user" on public.classification_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Reconciliations owned by user" on public.reconciliation_matches;
create policy "Reconciliations owned by user" on public.reconciliation_matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Audit events readable by user" on public.audit_events;
create policy "Audit events readable by user" on public.audit_events for select using (auth.uid() = user_id);
drop policy if exists "Privacy consents owned by user" on public.privacy_consents;
create policy "Privacy consents owned by user" on public.privacy_consents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Statement files readable by owner" on storage.objects;
create policy "Statement files readable by owner" on storage.objects for select using (bucket_id = 'statements' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Statement files insertable by owner" on storage.objects;
create policy "Statement files insertable by owner" on storage.objects for insert with check (bucket_id = 'statements' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Statement files deletable by owner" on storage.objects;
create policy "Statement files deletable by owner" on storage.objects for delete using (bucket_id = 'statements' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.banks (code, name, country) values
  ('banco_chile', 'Banco de Chile', 'CL'),
  ('santander_cl', 'Santander Chile', 'CL'),
  ('bci', 'BCI', 'CL'),
  ('scotiabank_cl', 'Scotiabank Chile', 'CL'),
  ('itau_cl', 'Itau Chile', 'CL'),
  ('banco_estado', 'BancoEstado', 'CL')
on conflict (code) do update set name = excluded.name, enabled = true;
