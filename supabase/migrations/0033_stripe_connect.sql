-- 0033 — Fundação do Stripe Connect (marketplace).
--
-- Modelo: Sponsas = plataforma. Patrocinado (athlete/track/event/media) =
-- connected account Express (recebe). Empresa = customer (paga). Sponsas
-- retém application fee sobre a assinatura mensal do patrocínio.
--
-- Estado do Stripe fica em `stripe_accounts` (isolada, leitura só do dono,
-- escrita SÓ pelo webhook via service role — nunca pelo app). Espelha o
-- padrão de `athlete_documents`.

create table public.stripe_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- se o profile RECEBE (patrocinado):
  account_id text unique,                       -- acct_...
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  -- se o profile PAGA (empresa):
  customer_id text unique,                      -- cus_...
  default_payment_method text,                  -- pm_...
  updated_at timestamptz not null default now()
);
alter table public.stripe_accounts enable row level security;
create policy stripe_accounts_select_own on public.stripe_accounts
  for select using (auth.uid() = profile_id);
-- sem insert/update/delete policy: só o webhook (service role) grava.

-- Taxa da plataforma (%) sobre cada fatura do patrocínio. Dono ajusta no
-- editor de tabela do Supabase.
alter table public.plan_config
  add column if not exists platform_fee_pct numeric not null default 10;

-- Assinatura do patrocínio no Stripe. `sponsorships` não tem policy de
-- update desde a 0024 — estas colunas só são gravadas por RPC/webhook.
alter table public.sponsorships
  add column if not exists stripe_subscription_id text unique,
  add column if not exists payment_status text not null default 'none';
comment on column public.sponsorships.payment_status is
  'none | setup (aguardando método/onboarding) | active | past_due | canceled';

-- Idempotência do webhook: cada evt_... processado uma vez só.
create table public.stripe_events (
  id text primary key,             -- evt_...
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- sem policy: só o service role (webhook) lê/escreve.
