-- 0033 — Fundação de pagamentos via Asaas (marketplace com split).
--
-- Modelo: Sponsas = conta Asaas principal. Patrocinado (athlete/track/
-- event/media) = subconta Asaas (recebe via split). Empresa = customer
-- (paga). Assinatura mensal do patrocínio com split: 100% − taxa Sponsas
-- vai pro walletId do patrocinado, o resto fica na conta da plataforma.
--
-- Estado do Asaas fica em `payment_accounts` (isolada, leitura só do dono,
-- escrita SÓ pelas rotas /api/asaas/* via service role — nunca pelo app).
-- Espelha o padrão de `athlete_documents`.

create table public.payment_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- se o profile RECEBE (patrocinado) — subconta Asaas:
  asaas_account_id text unique,                 -- id da subconta
  asaas_wallet_id text,                         -- walletId (destino do split)
  onboarding_status text not null default 'none', -- none | pending | active | rejected
  -- se o profile PAGA (empresa) — customer Asaas:
  asaas_customer_id text unique,
  updated_at timestamptz not null default now()
);
alter table public.payment_accounts enable row level security;
create policy payment_accounts_select_own on public.payment_accounts
  for select using (auth.uid() = profile_id);
-- sem insert/update/delete policy: só o service role (rotas Asaas) grava.

-- Taxa da plataforma (%) sobre cada cobrança do patrocínio. Dono ajusta no
-- editor de tabela do Supabase.
alter table public.plan_config
  add column if not exists platform_fee_pct numeric not null default 10;

-- Assinatura do patrocínio no Asaas. `sponsorships` não tem policy de
-- update desde a 0024 — estas colunas só são gravadas via service role.
alter table public.sponsorships
  add column if not exists asaas_subscription_id text unique,
  add column if not exists payment_status text not null default 'none';
comment on column public.sponsorships.payment_status is
  'none | setup (aguardando método/onboarding) | active | overdue | canceled';

-- Idempotência do webhook Asaas: cada evento processado uma vez só.
create table public.payment_events (
  id text primary key,             -- event id do Asaas
  event text not null,             -- PAYMENT_RECEIVED, PAYMENT_OVERDUE, ...
  received_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
-- sem policy: só o service role (webhook) lê/escreve.
