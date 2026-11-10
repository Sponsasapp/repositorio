-- ============================================================
-- 0039 — Contraproposta
--
-- Quem RECEBE uma proposta pendente pode, em vez de aceitar/recusar,
-- devolver outros termos (valor, permuta, duração, entregas, observação).
-- A contraproposta é uma proposta nova, na direção oposta, ligada à
-- anterior por `parent_id`; a anterior vira `countered`. O vai-e-volta pode
-- seguir quantas vezes for preciso; aceitar qualquer uma cria o patrocínio
-- pelo `respond_proposal` de sempre (não muda).
--
-- Contraproposta NÃO conta no limite de 3 propostas/mês do Free — é
-- negociação de uma conversa que já existe, não prospecção nova.
-- ============================================================

alter type public.proposal_status add value if not exists 'countered';

alter table public.proposals
  add column if not exists parent_id uuid
    references public.proposals(id) on delete set null;

create index if not exists idx_proposals_parent on public.proposals(parent_id);

-- ---------- RPC: contrapropor ----------
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
    from_profile_id, to_profile_id, opportunity_id, parent_id,
    payment_type, value, trade_description, trade_value,
    duration_months, deliverables, message, status
  ) values (
    auth.uid(), v_prop.from_profile_id, v_prop.opportunity_id, v_prop.id,
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

grant execute on function public.counter_proposal(
  uuid, public.proposal_payment_type, numeric, text, numeric, int, text[], text
) to authenticated;

-- ---------- limite do Free: contraproposta não conta ----------
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
  new.parent_id := null; -- contraproposta só nasce pela RPC counter_proposal

  if public.is_free_plan(new.from_profile_id) then
    perform pg_advisory_xact_lock(hashtext('proposals:' || new.from_profile_id::text));
    v_month_start := date_trunc('month', now() at time zone 'America/Sao_Paulo')
                     at time zone 'America/Sao_Paulo';
    select count(*) into v_count
      from public.proposals
     where from_profile_id = new.from_profile_id
       and parent_id is null
       and created_at >= v_month_start;
    if v_count >= 3 then
      raise exception 'plan_limit:proposalsPerMonth' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
