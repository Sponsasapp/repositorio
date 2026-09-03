-- 0016 — Cupons promocionais que liberam o plano PRO por um período.
--
-- O admin cria os códigos no SQL Editor. No fim do cadastro o piloto/empresa
-- digita o código; o signup action (service role) valida e ativa o PRO.
--
-- Exemplo de criação de cupons:
--   insert into coupons (code, plan_months, note) values
--     ('LANCAMENTO1', 1, 'campanha de lançamento'),
--     ('PRO3MESES',   3, 'parceria X'),
--     ('ANOPRO',     12, 'embaixador');
--   -- com limite de usos e validade:
--   insert into coupons (code, plan_months, max_uses, expires_at, note)
--     values ('BLACKFRIDAY', 6, 100, '2026-12-01', 'black friday');

create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  plan_months int not null,
  max_uses int,                       -- null = ilimitado
  uses int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists coupon_redemptions (
  coupon_id uuid not null references coupons(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (coupon_id, profile_id)
);

alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;

-- Sem policy para o cliente ler/escrever cupons: a validação é 100% no
-- servidor (service role). O usuário só enxerga os próprios resgates.
create policy "cr_select_own" on coupon_redemptions
  for select using (auth.uid() = profile_id);
