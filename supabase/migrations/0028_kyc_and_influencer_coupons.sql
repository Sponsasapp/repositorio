-- 0028 — (1) dados pessoais do piloto numa tabela isolada (LGPD: acesso só
-- do dono, nunca no perfil público) e (2) cupons de influencer com comissão.

-- ============================================================
-- 1) athlete_documents — CPF, RG, endereço, nascimento
-- ============================================================
create table public.athlete_documents (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  full_legal_name text not null,
  cpf text not null,          -- guardado só com dígitos
  rg text not null,
  birth_date date not null,
  address_zip text not null,  -- só dígitos
  address_street text not null,
  address_number text not null,
  address_complement text,
  address_district text not null,
  address_city text not null,
  address_state text not null,
  updated_at timestamptz not null default now(),
  constraint athlete_documents_cpf_len check (char_length(cpf) = 11),
  constraint athlete_documents_zip_len check (char_length(address_zip) = 8),
  constraint athlete_documents_uf_len check (char_length(address_state) = 2),
  constraint athlete_documents_birth check (
    birth_date > date '1920-01-01' and birth_date < current_date
  )
);

alter table public.athlete_documents enable row level security;

-- SÓ o dono. Sem leitura pública, sem acesso de terceiros.
create policy athlete_documents_own on public.athlete_documents
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- submit_athlete_documents(): usado no cadastro (antes de existir sessão,
-- via chave anon — igual redeem_coupon) e depois na edição do perfil.
create or replace function public.submit_athlete_documents(
  p_user uuid,
  p_full_name text,
  p_cpf text,
  p_rg text,
  p_birth date,
  p_zip text,
  p_street text,
  p_number text,
  p_complement text,
  p_district text,
  p_city text,
  p_state text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.profile_type;
  v_created timestamptz;
begin
  select type into v_type from public.profiles where id = p_user;
  if v_type is null then return 'no_user'; end if;
  if v_type <> 'athlete' then return 'not_athlete'; end if;

  -- Autenticado: só pode gravar os próprios dados.
  -- Anônimo (fluxo de cadastro): só se a conta foi criada há pouco.
  if auth.uid() is not null then
    if auth.uid() <> p_user then return 'forbidden'; end if;
  else
    select created_at into v_created from auth.users where id = p_user;
    if v_created is null or v_created < now() - interval '30 minutes' then
      return 'stale_user';
    end if;
  end if;

  if p_full_name is null or p_cpf is null or p_rg is null or p_birth is null
     or p_zip is null or p_street is null or p_number is null
     or p_district is null or p_city is null or p_state is null then
    return 'incomplete';
  end if;

  insert into public.athlete_documents (
    profile_id, full_legal_name, cpf, rg, birth_date, address_zip,
    address_street, address_number, address_complement, address_district,
    address_city, address_state
  ) values (
    p_user, trim(p_full_name), regexp_replace(p_cpf, '\D', '', 'g'),
    trim(p_rg), p_birth, regexp_replace(p_zip, '\D', '', 'g'),
    trim(p_street), trim(p_number), nullif(trim(p_complement), ''),
    trim(p_district), trim(p_city), upper(trim(p_state))
  )
  on conflict (profile_id) do update set
    full_legal_name = excluded.full_legal_name,
    cpf = excluded.cpf,
    rg = excluded.rg,
    birth_date = excluded.birth_date,
    address_zip = excluded.address_zip,
    address_street = excluded.address_street,
    address_number = excluded.address_number,
    address_complement = excluded.address_complement,
    address_district = excluded.address_district,
    address_city = excluded.address_city,
    address_state = excluded.address_state,
    updated_at = now();

  return 'ok';
end $$;

grant execute on function public.submit_athlete_documents(
  uuid, text, text, text, date, text, text, text, text, text, text, text
) to anon, authenticated;

-- ============================================================
-- 2) Cupons de influencer + comissão
-- ============================================================
create table public.plan_config (
  id boolean primary key default true,
  constraint plan_config_singleton check (id),
  pro_monthly_price numeric not null default 39.90
);
insert into public.plan_config (id) values (true) on conflict do nothing;

alter table public.plan_config enable row level security;
create policy plan_config_select_public on public.plan_config for select using (true);

alter table public.coupons
  add column if not exists influencer_id uuid references public.profiles(id) on delete set null,
  add column if not exists commission_pct numeric not null default 5;

create table public.coupon_commissions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  influencer_id uuid not null references public.profiles(id) on delete cascade,
  redeemer_id uuid not null references public.profiles(id) on delete cascade,
  plan_months int not null,
  base_amount numeric not null,
  commission_pct numeric not null,
  commission_amount numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index coupon_commissions_influencer_idx
  on public.coupon_commissions (influencer_id, created_at desc);

alter table public.coupon_commissions enable row level security;
create policy cc_select_influencer on public.coupon_commissions
  for select using (auth.uid() = influencer_id);
-- sem insert/update policy: só a redeem_coupon (definer) grava; pagamento
-- marcado pelo dono no Supabase.

-- redeem_coupon: ao aplicar o PRO, se o cupom tem influencer, registra a
-- comissão.
create or replace function public.redeem_coupon(p_user uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_created timestamptz;
  v_until timestamptz;
  v_price numeric;
  v_base numeric;
begin
  select created_at into v_created from auth.users where id = p_user;
  if v_created is null then return 'no_user'; end if;
  if v_created < now() - interval '30 minutes' then return 'stale_user'; end if;

  select * into v_coupon
  from public.coupons
  where code = upper(trim(p_code)) and active = true
  for update;
  if not found then return 'no_coupon'; end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return 'expired';
  end if;
  if v_coupon.max_uses is not null and v_coupon.uses >= v_coupon.max_uses then
    return 'maxed';
  end if;

  begin
    insert into public.coupon_redemptions (coupon_id, profile_id)
    values (v_coupon.id, p_user);
  exception when unique_violation then
    return 'already';
  end;

  v_until := now() + (v_coupon.plan_months || ' months')::interval;

  insert into public.subscriptions (profile_id, plan, status, renewed_until)
  values (p_user, 'pro', 'active', v_until)
  on conflict (profile_id) do update
    set plan = 'pro', status = 'active', renewed_until = v_until;

  update public.coupons set uses = uses + 1 where id = v_coupon.id;

  if v_coupon.influencer_id is not null then
    select pro_monthly_price into v_price from public.plan_config limit 1;
    v_base := coalesce(v_price, 0) * v_coupon.plan_months;
    insert into public.coupon_commissions (
      coupon_id, influencer_id, redeemer_id, plan_months,
      base_amount, commission_pct, commission_amount
    ) values (
      v_coupon.id, v_coupon.influencer_id, p_user, v_coupon.plan_months,
      v_base, v_coupon.commission_pct,
      round(v_base * v_coupon.commission_pct / 100.0, 2)
    );
  end if;

  return 'applied:' || v_coupon.plan_months;
end $$;

grant execute on function public.redeem_coupon(uuid, text) to anon, authenticated;
