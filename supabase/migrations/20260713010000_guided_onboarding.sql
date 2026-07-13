alter table public.users add column if not exists onboarding_completed boolean not null default false;
alter table public.users add column if not exists onboarding_step integer not null default 1;
alter table public.users add column if not exists email_provider text;
alter table public.users add column if not exists notification_email text;

update public.users
set onboarding_completed = true,
    onboarding_step = 4
where coalesce(name, '') <> ''
  and coalesce(main_bank, '') <> ''
  and monthly_budget > 0;
