-- ============================================================
-- 0035 — Endurecimento de segurança (achados da simulação de uso 09/11/2026)
--
-- Regra usada em todos os gatilhos abaixo: escrita "do usuário" é a que chega
-- pela API com o papel `authenticated`/`anon` (current_user). Funções
-- SECURITY DEFINER (sync_profile_plan, redeem_coupon, respond_proposal,
-- review_deliverable, handle_new_user...) rodam como dono da função e NÃO são
-- afetadas — então cupom, signup, aceite e aprovação seguem funcionando.
--
-- 1. subscriptions: usuário não grava mais o próprio plano (virava PRO grátis).
-- 2. profiles: usuário não muda `plan` nem `type` do próprio perfil.
-- 3. deliverables: entrega sempre nasce `pending` (não dá pra criar já aprovada).
-- 4. proposals: proposta sempre nasce `pending`.
-- 5. Limites do plano Free aplicados no banco (antes só na server action):
--    3 propostas/mês (mês de Brasília), 1 oportunidade aberta (inclui reabrir),
--    4 itens na tabela de preços por modalidade. Lock por usuário evita corrida.
-- 6. notifications: `cta_path` só aceita caminho interno (bloqueia link externo).
-- ============================================================

-- helper: a escrita veio direto do usuário (API), não de função do sistema?
create or replace function public.is_user_write()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('authenticated', 'anon');
$$;

-- helper: plano do perfil é free?
create or replace function public.is_free_plan(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select plan = 'free' from public.profiles where id = p_profile), true);
$$;

-- ---------- 1. subscriptions: sem escrita pelo usuário ----------
drop policy if exists "subscriptions_write_own" on public.subscriptions;

-- ---------- 2. profiles: plan/type/id congelados pra escrita do usuário ----------
create or replace function public.protect_profile_cols()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_user_write() then
    new.id   := old.id;
    new.plan := old.plan;
    new.type := old.type;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile_cols on public.profiles;
create trigger trg_protect_profile_cols
  before update on public.profiles
  for each row execute function public.protect_profile_cols();

-- ---------- 3. deliverables: sempre nasce pending ----------
create or replace function public.deliverable_force_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_user_write() then
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists trg_deliverable_force_pending on public.deliverables;
create trigger trg_deliverable_force_pending
  before insert on public.deliverables
  for each row execute function public.deliverable_force_pending();

-- ---------- 4 + 5a. proposals: pending + 3/mês no Free ----------
create or replace function public.proposal_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_month_start timestamptz;
begin
  if not public.is_user_write() then
    return new;
  end if;

  new.status := 'pending';

  if public.is_free_plan(new.from_profile_id) then
    perform pg_advisory_xact_lock(hashtext('proposals:' || new.from_profile_id::text));
    v_month_start := date_trunc('month', now() at time zone 'America/Sao_Paulo')
                     at time zone 'America/Sao_Paulo';
    select count(*) into v_count
      from public.proposals
     where from_profile_id = new.from_profile_id
       and created_at >= v_month_start;
    if v_count >= 3 then
      raise exception 'plan_limit:proposalsPerMonth' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_proposal_insert_guard on public.proposals;
create trigger trg_proposal_insert_guard
  before insert on public.proposals
  for each row execute function public.proposal_insert_guard();

-- ---------- 5b. opportunities: 1 aberta no Free (criar OU reabrir) ----------
create or replace function public.opportunity_open_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not public.is_user_write() then
    return new;
  end if;
  if new.status <> 'open' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'open' then
    return new; -- edição de vaga que já estava aberta
  end if;

  if public.is_free_plan(new.company_id) then
    perform pg_advisory_xact_lock(hashtext('opportunities:' || new.company_id::text));
    select count(*) into v_count
      from public.opportunities
     where company_id = new.company_id
       and status = 'open'
       and id <> new.id;
    if v_count >= 1 then
      raise exception 'plan_limit:openOpportunities' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_opportunity_open_guard on public.opportunities;
create trigger trg_opportunity_open_guard
  before insert or update of status on public.opportunities
  for each row execute function public.opportunity_open_guard();

-- ---------- 5c. athlete_packages: 4 por modalidade no Free ----------
-- (o app apaga e reinsere a tabela inteira da modalidade num insert só;
--  num BEFORE ROW, as linhas anteriores do mesmo insert já são visíveis.)
create or replace function public.package_limit_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not public.is_user_write() then
    return new;
  end if;
  if public.is_free_plan(new.athlete_id) then
    perform pg_advisory_xact_lock(hashtext('packages:' || new.athlete_id::text));
    select count(*) into v_count
      from public.athlete_packages
     where athlete_id = new.athlete_id
       and modality is not distinct from new.modality;
    if v_count >= 4 then
      raise exception 'plan_limit:rateCardItems' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_package_limit_guard on public.athlete_packages;
create trigger trg_package_limit_guard
  before insert on public.athlete_packages
  for each row execute function public.package_limit_guard();

-- ---------- 6. notifications: cta_path só interno ----------
create or replace function public.notification_sanitize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cta_path is not null
     and (left(new.cta_path, 1) <> '/'
          or left(new.cta_path, 2) in ('//', '/\')) then
    new.cta_path := null;
    new.cta_label := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_notification_sanitize on public.notifications;
create trigger trg_notification_sanitize
  before insert or update on public.notifications
  for each row execute function public.notification_sanitize();
