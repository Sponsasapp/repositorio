-- 0033 — Pagamentos via Asaas (marketplace com split).
--
-- Modelo: Sponsas = conta Asaas principal. Patrocinado (athlete/track/
-- event/media) = subconta Asaas (recebe via split). Empresa = customer
-- (paga). Assinatura mensal do patrocínio com split: 100% − taxa Sponsas
-- vai pro walletId do patrocinado, o resto fica na conta da plataforma.
--
-- Estado do Asaas fica em `payment_accounts` (isolada, leitura só do dono,
-- escrita SÓ pelas rotas/actions de servidor via service role).
--
-- Revisada em 10/11/2026 (antes de ser aplicada) após teste no sandbox:
-- guarda a apiKey da subconta (só ela consulta status/documentos da
-- subconta; o Asaas só devolve na criação) — coluna SEM leitura pelo app.

create table if not exists public.payment_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- se o profile RECEBE (patrocinado) — subconta Asaas:
  asaas_account_id text unique,                 -- id da subconta
  asaas_wallet_id text,                         -- walletId (destino do split)
  asaas_api_key text,                           -- chave da subconta (só servidor)
  onboarding_status text not null default 'none', -- none | pending | active | rejected
  onboarding_url text,                          -- link do Asaas pra enviar documentos
  -- se o profile PAGA (empresa) — customer Asaas:
  asaas_customer_id text unique,
  updated_at timestamptz not null default now()
);
alter table public.payment_accounts enable row level security;

drop policy if exists payment_accounts_select_own on public.payment_accounts;
create policy payment_accounts_select_own on public.payment_accounts
  for select using (auth.uid() = profile_id);
-- sem insert/update/delete policy: só o service role grava.

-- A apiKey da subconta nunca sai do servidor: sem SELECT na coluna pro app.
revoke select on public.payment_accounts from anon, authenticated;
grant select (
  profile_id, asaas_account_id, asaas_wallet_id, onboarding_status,
  onboarding_url, asaas_customer_id, updated_at
) on public.payment_accounts to authenticated;

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
  'none | active (cobrança criada, em dia) | overdue | canceled';

-- Idempotência do webhook Asaas: cada evento processado uma vez só.
create table if not exists public.payment_events (
  id text primary key,             -- event id do Asaas
  event text not null,             -- PAYMENT_RECEIVED, PAYMENT_OVERDUE, ...
  received_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
-- sem policy: só o service role (webhook) lê/escreve.
