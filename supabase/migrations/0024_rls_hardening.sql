-- 0024 — auditoria de RLS: fecha brechas onde o próprio usuário conseguia
-- adulterar dados que deveriam ser controlados pelo sistema.
--
-- Achados corrigidos:
--  1. athlete_modalities: piloto podia setar o próprio rank_score/tier direto
--     no banco (policy `am_write_own` é `for all`).
--  2. sponsorships: qualquer parte podia FABRICAR um patrocínio ou mudar os
--     TERMOS depois (valor, status). Patrocínio agora só nasce/muda via RPC.
--  3. deliverables: policy `for all` deixava o PILOTO aprovar a própria
--     entrega (status -> approved) — infla o rank. Aprovação agora é RPC
--     só-empresa; status de "enviada" vem de trigger no proof.
--  4. proposals: update sem `with check` deixava mexer nos termos. Resposta
--     de proposta vira RPC.

-- ============================================================
-- 1) Rank não é editável pelo piloto
-- ============================================================
create or replace function public.trg_protect_rank_cols()
returns trigger
language plpgsql
as $$
begin
  -- pg_trigger_depth() = 1 → escrita direta do usuário.
  -- A recompute escreve a partir de outro trigger (depth >= 2).
  if pg_trigger_depth() = 1 then
    if tg_op = 'UPDATE' then
      new.rank_score := old.rank_score;
      new.rank_tier := old.rank_tier;
      new.rank_factors := old.rank_factors;
      new.rank_updated_at := old.rank_updated_at;
    else
      new.rank_score := null;
      new.rank_tier := null;
      new.rank_factors := null;
      new.rank_updated_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_rank_cols on public.athlete_modalities;
create trigger protect_rank_cols
  before insert or update on public.athlete_modalities
  for each row execute function public.trg_protect_rank_cols();

-- ============================================================
-- 2) Sponsorships: sem escrita direta
-- ============================================================
drop policy if exists "sponsorships_insert_involved" on public.sponsorships;
drop policy if exists "sponsorships_update_involved" on public.sponsorships;
-- mantém sponsorships_select_involved

create or replace function public.respond_proposal(p_proposal uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.proposals;
  v_athlete uuid;
  v_company uuid;
  v_sp uuid;
begin
  if auth.uid() is null then return 'no_auth'; end if;
  if p_action not in ('accept', 'reject', 'withdraw') then return 'bad_action'; end if;

  select * into v_prop from public.proposals where id = p_proposal;
  if v_prop is null or v_prop.status <> 'pending' then return 'not_pending'; end if;

  if p_action = 'withdraw' then
    if v_prop.from_profile_id <> auth.uid() then return 'not_sender'; end if;
    update public.proposals set status = 'withdrawn' where id = p_proposal;
    return 'ok';
  end if;

  -- accept / reject: só o destinatário
  if v_prop.to_profile_id <> auth.uid() then return 'not_recipient'; end if;

  if p_action = 'reject' then
    update public.proposals set status = 'rejected' where id = p_proposal;
    return 'ok';
  end if;

  -- accept
  select id into v_athlete from public.profiles
    where id in (v_prop.from_profile_id, v_prop.to_profile_id) and type = 'athlete';
  select id into v_company from public.profiles
    where id in (v_prop.from_profile_id, v_prop.to_profile_id) and type = 'company';
  if v_athlete is null or v_company is null then return 'bad_parties'; end if;

  select id into v_sp from public.sponsorships where proposal_id = p_proposal;
  if v_sp is null then
    insert into public.sponsorships
      (proposal_id, athlete_id, company_id, payment_type, value,
       trade_description, trade_value, duration_months, status)
    values
      (v_prop.id, v_athlete, v_company, v_prop.payment_type, v_prop.value,
       v_prop.trade_description, v_prop.trade_value, v_prop.duration_months, 'active')
    returning id into v_sp;
  end if;

  update public.proposals set status = 'accepted' where id = p_proposal;
  return v_sp::text;
end $$;

grant execute on function public.respond_proposal(uuid, text) to authenticated;

create or replace function public.end_sponsorship(p_sponsorship uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return false; end if;
  update public.sponsorships set status = 'ended'
   where id = p_sponsorship
     and (athlete_id = auth.uid() or company_id = auth.uid())
     and status = 'active';
  return found;
end $$;

grant execute on function public.end_sponsorship(uuid) to authenticated;

-- ============================================================
-- 3) Deliverables: piloto não aprova a própria entrega
-- ============================================================
drop policy if exists "deliverables_write_involved" on public.deliverables;
-- mantém deliverables_select_involved

create policy "deliverables_insert_involved" on public.deliverables
  for insert with check (
    auth.uid() in (
      select athlete_id from public.sponsorships where id = sponsorship_id
      union
      select company_id from public.sponsorships where id = sponsorship_id
    )
  );

-- Só dá pra apagar entrega que ainda está pendente (não some histórico).
create policy "deliverables_delete_pending" on public.deliverables
  for delete using (
    status = 'pending'
    and auth.uid() in (
      select athlete_id from public.sponsorships where id = sponsorship_id
      union
      select company_id from public.sponsorships where id = sponsorship_id
    )
  );

-- (sem policy de UPDATE — status muda só por trigger/RPC abaixo)

-- Proof enviada → entrega vai pra "submitted" automaticamente.
create or replace function public.trg_proof_marks_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.deliverables
  set status = 'submitted'
  where id = new.deliverable_id
    and status in ('pending', 'rejected');
  return new;
end $$;

drop trigger if exists proof_marks_submitted on public.deliverable_proofs;
create trigger proof_marks_submitted
  after insert on public.deliverable_proofs
  for each row execute function public.trg_proof_marks_submitted();

create or replace function public.review_deliverable(p_deliverable uuid, p_decision text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_ok boolean;
begin
  if auth.uid() is null then return false; end if;
  if p_decision not in ('approved', 'rejected') then return false; end if;

  update public.deliverables d
  set status = p_decision
  from public.sponsorships s
  where d.id = p_deliverable
    and s.id = d.sponsorship_id
    and s.company_id = auth.uid()
    and d.status = 'submitted';
  get diagnostics v_ok = row_count;
  return v_ok > 0;
end $$;

grant execute on function public.review_deliverable(uuid, text) to authenticated;

-- ============================================================
-- 4) Proposals: update só via respond_proposal()
-- ============================================================
drop policy if exists "proposals_update_involved" on public.proposals;
-- mantém proposals_select_involved e proposals_insert_sender

-- ============================================================
-- 5) Applications: fecha o `with check` que faltava (destinatário/empresa)
-- ============================================================
drop policy if exists "applications_update_involved" on public.applications;
create policy "applications_update_involved" on public.applications
  for update using (
    auth.uid() in (select company_id from public.opportunities where id = opportunity_id)
  )
  with check (
    auth.uid() in (select company_id from public.opportunities where id = opportunity_id)
  );
