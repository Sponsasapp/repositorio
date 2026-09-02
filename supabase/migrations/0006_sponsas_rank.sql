-- ============================================================
-- Rank Sponsas — score interno do piloto.
-- Calculado no banco (SECURITY DEFINER) porque depende de dados
-- privados (entregas, patrocínios). O tier é público; score e
-- detalhamento o app só mostra pro próprio piloto.
--
-- Fatores: entrega no prazo (30%), cumprimento da demanda (25%),
-- engajamento atual (20%), atividade de negócios (15%), perfil
-- completo (10%). Crescimento de seguidores/interações no tempo
-- é fator futuro (precisa de snapshots periódicos).
-- ============================================================

alter table athlete_profiles
  add column rank_score int,
  add column rank_tier text,
  add column rank_factors jsonb,
  add column rank_updated_at timestamptz;

create or replace function public.recompute_athlete_rank(p_athlete uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_eng numeric; v_total int; v_ontime int; v_ok int; v_bad int;
  v_active int; v_ended int; v_compl numeric;
  f_prazo numeric; f_demanda numeric; f_eng numeric; f_ativ numeric; f_perf numeric;
  v_score int; v_tier text;
begin
  select avg(engagement_rate) into v_eng
  from public.social_links where profile_id = p_athlete and engagement_rate is not null;

  select
    count(*) filter (where d.status in ('approved','submitted','rejected')
                      or (d.status='pending' and d.due_date is not null and d.due_date < current_date)),
    count(*) filter (where d.status='approved'),
    count(*) filter (where d.status='rejected'
                      or (d.status='pending' and d.due_date is not null and d.due_date < current_date))
  into v_total, v_ok, v_bad
  from public.deliverables d
  join public.sponsorships s on s.id = d.sponsorship_id
  where s.athlete_id = p_athlete;

  select count(*) into v_ontime
  from public.deliverables d
  join public.sponsorships s on s.id = d.sponsorship_id
  where s.athlete_id = p_athlete and d.status in ('approved','submitted')
    and (d.due_date is null
         or coalesce((select max(pp.submitted_at)::date from public.deliverable_proofs pp
                      where pp.deliverable_id = d.id), current_date) <= d.due_date);

  select count(*) filter (where status='active'), count(*) filter (where status='ended')
  into v_active, v_ended from public.sponsorships where athlete_id = p_athlete;

  select (
    (ap.category is not null)::int
    + (exists(select 1 from public.social_links sl where sl.profile_id=p_athlete))::int
    + (exists(select 1 from public.athlete_packages pk where pk.athlete_id=p_athlete))::int
    + (coalesce(array_length(ap.offered_deliverables,1),0) > 0)::int
    + (p.bio is not null)::int
  )::numeric / 5
  into v_compl
  from public.athlete_profiles ap join public.profiles p on p.id = ap.profile_id
  where ap.profile_id = p_athlete;

  if not found then return; end if;

  f_prazo   := case when coalesce(v_total,0)=0 then 0.6 else least(1.0, v_ontime::numeric / v_total) end;
  f_demanda := case when coalesce(v_ok,0)+coalesce(v_bad,0)=0 then 0.6 else v_ok::numeric/(v_ok+v_bad) end;
  f_eng     := case when v_eng is null then 0.3 else least(1.0, v_eng/10.0) end;
  f_ativ    := case when coalesce(v_active,0)+coalesce(v_ended,0)=0 then 0.15
                    else least(1.0, coalesce(v_active,0)*0.4 + coalesce(v_ended,0)*0.2) end;
  f_perf    := coalesce(v_compl, 0);

  v_score := round(100 * (f_prazo*0.30 + f_demanda*0.25 + f_eng*0.20 + f_ativ*0.15 + f_perf*0.10));
  v_tier  := case when v_score>=80 then 'elite' when v_score>=65 then 'ouro'
                  when v_score>=50 then 'prata' when v_score>=35 then 'bronze' else 'iniciante' end;

  update public.athlete_profiles set
    rank_score = v_score, rank_tier = v_tier, rank_updated_at = now(),
    rank_factors = jsonb_build_object(
      'prazo',round(f_prazo,3),'demanda',round(f_demanda,3),'engajamento',round(f_eng,3),
      'atividade',round(f_ativ,3),'perfil',round(f_perf,3),
      'entregas_total',coalesce(v_total,0),'entregas_no_prazo',coalesce(v_ontime,0),
      'entregas_aprovadas',coalesce(v_ok,0))
  where profile_id = p_athlete;
end $$;

create or replace function public.trg_rank_from_deliverable()
returns trigger language plpgsql security definer set search_path='' as $$
declare v uuid;
begin
  select athlete_id into v from public.sponsorships
  where id = coalesce(new.sponsorship_id, old.sponsorship_id);
  if v is not null then perform public.recompute_athlete_rank(v); end if;
  return null;
end $$;
create trigger rank_on_deliverable after insert or update or delete on public.deliverables
for each row execute function public.trg_rank_from_deliverable();

create or replace function public.trg_rank_from_proof()
returns trigger language plpgsql security definer set search_path='' as $$
declare v uuid;
begin
  select s.athlete_id into v from public.deliverables d
  join public.sponsorships s on s.id = d.sponsorship_id
  where d.id = coalesce(new.deliverable_id, old.deliverable_id);
  if v is not null then perform public.recompute_athlete_rank(v); end if;
  return null;
end $$;
create trigger rank_on_proof after insert or update or delete on public.deliverable_proofs
for each row execute function public.trg_rank_from_proof();

create or replace function public.trg_rank_from_social()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.recompute_athlete_rank(coalesce(new.profile_id, old.profile_id));
  return null;
end $$;
create trigger rank_on_social after insert or update or delete on public.social_links
for each row execute function public.trg_rank_from_social();

create or replace function public.trg_rank_from_sponsorship()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.recompute_athlete_rank(coalesce(new.athlete_id, old.athlete_id));
  return null;
end $$;
create trigger rank_on_sponsorship after insert or update or delete on public.sponsorships
for each row execute function public.trg_rank_from_sponsorship();

create or replace function public.trg_rank_from_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if pg_trigger_depth() = 0 then
    perform public.recompute_athlete_rank(new.profile_id);
  end if;
  return null;
end $$;
create trigger rank_on_athlete_profile after insert or update on public.athlete_profiles
for each row execute function public.trg_rank_from_profile();

do $$ declare r record; begin
  for r in select id from public.profiles where type='athlete' loop
    perform public.recompute_athlete_rank(r.id);
  end loop;
end $$;
