-- 0019 — notify_email(): resolve o e-mail de um usuário para as notificações,
-- sem depender da service role.
--
-- SECURITY DEFINER (lê auth.users). Guarda: o chamador (auth.uid()) só recebe
-- o e-mail do alvo se os dois tiverem uma relação — proposta, candidatura ou
-- patrocínio. É o suficiente pros pontos onde notifyUser é chamado.

create or replace function public.notify_email(p_target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_related boolean;
begin
  if auth.uid() is null or p_target is null then
    return null;
  end if;

  select
    exists(
      select 1 from public.proposals
      where (from_profile_id = auth.uid() and to_profile_id = p_target)
         or (to_profile_id = auth.uid() and from_profile_id = p_target)
    )
    or exists(
      select 1 from public.applications a
      join public.opportunities o on o.id = a.opportunity_id
      where (a.athlete_id = auth.uid() and o.company_id = p_target)
         or (o.company_id = auth.uid() and a.athlete_id = p_target)
    )
    or exists(
      select 1 from public.sponsorships
      where (athlete_id = auth.uid() and company_id = p_target)
         or (company_id = auth.uid() and athlete_id = p_target)
    )
  into v_related;

  if not v_related then
    return null;
  end if;

  select email into v_email from auth.users where id = p_target;
  return v_email;
end $$;

grant execute on function public.notify_email(uuid) to authenticated;

-- ------------------------------------------------------------------
-- capture_rank_snapshots(): a foto diária do rank, chamada pelo cron
-- sem service role. Idempotente por dia.
-- ------------------------------------------------------------------
create or replace function public.capture_rank_snapshots()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_count int;
begin
  delete from public.athlete_rank_snapshots where captured_on = v_day;

  insert into public.athlete_rank_snapshots
    (athlete_id, modality, score, tier, captured_on)
  select profile_id, modality, rank_score, rank_tier, v_day
  from public.athlete_modalities
  where rank_score is not null;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.capture_rank_snapshots() to anon, authenticated;
