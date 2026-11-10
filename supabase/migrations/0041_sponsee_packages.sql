-- ============================================================
-- 0041 — Cotas de patrocínio (pista, evento, mídia)
--
-- Antes: "espaços"/"cotas" eram texto livre no perfil — sem preço, sem
-- quantidade, sem saber o que já foi vendido.
-- Agora: sponsee_packages = cotas estruturadas (nome, descrição, preço,
-- quantidade). A proposta pode apontar pra uma cota (proposals.package_id);
-- cada patrocínio ATIVO nascido de proposta com aquela cota ocupa 1 vaga.
-- Esgotou → aceitar nova proposta daquela cota falha no banco.
--
-- Preço de cota é PÚBLICO (diferente do piloto): é tabela comercial de
-- evento/pista, feita pra ser divulgada.
-- ============================================================

create table if not exists public.sponsee_packages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric,                -- R$ (null = sob consulta)
  quantity int,                 -- vagas (null = sem limite)
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint sponsee_packages_qty check (quantity is null or quantity >= 1),
  constraint sponsee_packages_price check (price is null or price >= 0)
);

create index if not exists idx_sponsee_packages_profile
  on public.sponsee_packages (profile_id, position);

alter table public.sponsee_packages enable row level security;

drop policy if exists sponsee_packages_select on public.sponsee_packages;
create policy sponsee_packages_select on public.sponsee_packages
  for select using (true);

drop policy if exists sponsee_packages_write_own on public.sponsee_packages;
create policy sponsee_packages_write_own on public.sponsee_packages
  for all
  using (auth.uid() = profile_id)
  with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and type in ('track', 'event', 'media')
    )
  );

-- ---------- proposta → cota ----------
alter table public.proposals
  add column if not exists package_id uuid
    references public.sponsee_packages(id) on delete set null;

-- A cota precisa ser de uma das duas partes da proposta; senão é ignorada.
create or replace function public.proposal_package_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.package_id is not null and not exists (
    select 1 from public.sponsee_packages
    where id = new.package_id
      and profile_id in (new.from_profile_id, new.to_profile_id)
  ) then
    new.package_id := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_proposal_package_guard on public.proposals;
create trigger trg_proposal_package_guard
  before insert on public.proposals
  for each row execute function public.proposal_package_guard();

-- ---------- vagas vendidas ----------
create or replace function public.sponsee_package_sold(p_profile uuid)
returns table (package_id uuid, sold int)
language sql
stable
security definer
set search_path = ''
as $$
  select p.package_id, count(*)::int
    from public.sponsorships s
    join public.proposals p on p.id = s.proposal_id
    join public.sponsee_packages k on k.id = p.package_id
   where k.profile_id = p_profile
     and s.status = 'active'
   group by p.package_id;
$$;

grant execute on function public.sponsee_package_sold(uuid) to anon, authenticated;

-- Esgotou → não nasce patrocínio novo daquela cota.
create or replace function public.sponsorship_package_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pkg uuid;
  v_qty int;
  v_sold int;
begin
  select package_id into v_pkg from public.proposals where id = new.proposal_id;
  if v_pkg is null then return new; end if;

  select quantity into v_qty from public.sponsee_packages where id = v_pkg for update;
  if v_qty is null then return new; end if;

  select count(*) into v_sold
    from public.sponsorships s
    join public.proposals p on p.id = s.proposal_id
   where p.package_id = v_pkg and s.status = 'active';

  if v_sold >= v_qty then
    raise exception 'package_sold_out' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_sponsorship_package_guard on public.sponsorships;
create trigger trg_sponsorship_package_guard
  before insert on public.sponsorships
  for each row execute function public.sponsorship_package_guard();

-- ---------- contraproposta carrega a cota ----------
create or replace function public.counter_proposal(
  p_proposal uuid,
  p_payment_type public.proposal_payment_type,
  p_value numeric,
  p_trade_description text,
  p_trade_value numeric,
  p_duration_months int,
  p_deliverables text[],
  p_message text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.proposals;
  v_new uuid;
begin
  if auth.uid() is null then return 'no_auth'; end if;

  select * into v_prop from public.proposals where id = p_proposal for update;
  if v_prop is null or v_prop.status <> 'pending' then return 'not_pending'; end if;
  if v_prop.to_profile_id <> auth.uid() then return 'not_recipient'; end if;

  if p_payment_type <> 'trade' and (p_value is null or p_value <= 0) then
    return 'bad_value';
  end if;
  if p_payment_type <> 'cash' and coalesce(trim(p_trade_description), '') = '' then
    return 'bad_trade';
  end if;

  insert into public.proposals (
    from_profile_id, to_profile_id, opportunity_id, parent_id, package_id,
    payment_type, value, trade_description, trade_value,
    duration_months, deliverables, message, status
  ) values (
    auth.uid(), v_prop.from_profile_id, v_prop.opportunity_id, v_prop.id,
    v_prop.package_id,
    p_payment_type,
    case when p_payment_type = 'trade' then null else p_value end,
    case when p_payment_type = 'cash' then null else left(p_trade_description, 300) end,
    case when p_payment_type = 'cash' then null else p_trade_value end,
    p_duration_months,
    coalesce(p_deliverables, '{}'),
    left(p_message, 2000),
    'pending'
  )
  returning id into v_new;

  update public.proposals set status = 'countered' where id = v_prop.id;

  return v_new::text;
end $$;
