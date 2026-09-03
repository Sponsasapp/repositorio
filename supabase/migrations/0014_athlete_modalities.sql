-- 0014 — Perfil do piloto POR MODALIDADE + empresa com modalidades de interesse.
--
-- Antes: 1 athlete_profiles por conta, uma modalidade. Agora o piloto cadastra
-- a parte esportiva por modalidade (arrancada, kart, circuito, drift), cada uma
-- com sua categoria, carros, conquistas, tabela de preços, lista e rank.
-- Nome, foto, local, bio e redes sociais continuam do piloto (compartilhados).
-- Empresa escolhe as modalidades que patrocina (company_profiles.modalities).

-- ============================================================
-- 1) athlete_modalities — a parte esportiva, uma linha por (piloto, modalidade)
-- ============================================================
create table if not exists athlete_modalities (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  modality text not null,
  category text,
  results text,
  availability_notes text,
  offered_deliverables text[] not null default '{}',
  sponsor_categories text[] not null default '{}',
  desired_value_min int,
  desired_value_max int,
  list_name text,
  list_member boolean not null default false,
  list_position int,
  list_shark_tank boolean not null default false,
  list_shark_tank_date date,
  rank_score int,
  rank_tier text,
  rank_factors jsonb,
  rank_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, modality)
);
create index if not exists idx_athlete_modalities_profile
  on athlete_modalities (profile_id);
create index if not exists idx_athlete_modalities_modality
  on athlete_modalities (modality);

alter table athlete_modalities enable row level security;
create policy "am_select_public" on athlete_modalities
  for select using (true);
create policy "am_write_own" on athlete_modalities
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================
-- 2) migra o athlete_profiles atual (1 linha por piloto) -> athlete_modalities
-- ============================================================
insert into athlete_modalities (
  profile_id, modality, category, results, availability_notes,
  offered_deliverables, sponsor_categories, desired_value_min, desired_value_max,
  list_name, list_member, list_position, list_shark_tank, list_shark_tank_date,
  rank_score, rank_tier, rank_factors, rank_updated_at
)
select
  profile_id,
  coalesce(nullif(modality, ''), 'Arrancada'),
  category, results, availability_notes,
  coalesce(offered_deliverables, '{}'),
  coalesce(sponsor_categories, '{}'),
  desired_value_min, desired_value_max,
  list_name, list_member, list_position, list_shark_tank, list_shark_tank_date,
  rank_score, rank_tier, rank_factors, rank_updated_at
from athlete_profiles
on conflict (profile_id, modality) do nothing;

-- ============================================================
-- 3) modality nos filhos (denormalizado — sem trocar a FK athlete_id)
-- ============================================================
alter table athlete_cars
  add column if not exists modality text not null default 'Arrancada';
alter table athlete_achievements
  add column if not exists modality text not null default 'Arrancada';
alter table athlete_packages
  add column if not exists modality text not null default 'Arrancada';

update athlete_cars c set modality = m.modality
  from athlete_modalities m where m.profile_id = c.athlete_id;
update athlete_achievements a set modality = m.modality
  from athlete_modalities m where m.profile_id = a.athlete_id;
update athlete_packages p set modality = m.modality
  from athlete_modalities m where m.profile_id = p.athlete_id;

create index if not exists idx_athlete_cars_modality
  on athlete_cars (athlete_id, modality);
create index if not exists idx_athlete_achievements_modality
  on athlete_achievements (athlete_id, modality);
create index if not exists idx_athlete_packages_modality
  on athlete_packages (athlete_id, modality);

-- ============================================================
-- 4) empresa: modalidades que patrocina
-- ============================================================
alter table company_profiles
  add column if not exists modalities text[] not null default '{}';

-- ============================================================
-- 5) snapshots do rank por modalidade
-- ============================================================
alter table athlete_rank_snapshots
  add column if not exists modality text;
-- o registro passa a ser por (athlete_id, modality, captured_on)
alter table athlete_rank_snapshots
  drop constraint if exists athlete_rank_snapshots_athlete_id_captured_on_key;
create unique index if not exists uq_rank_snapshots_athlete_modality_day
  on athlete_rank_snapshots (athlete_id, coalesce(modality, ''), captured_on);

-- ============================================================
-- 6) recompute_athlete_rank — agora escreve por modalidade
-- ============================================================
create or replace function public.recompute_athlete_rank(p_athlete uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_eng numeric; v_total int; v_ontime int; v_ok int; v_bad int;
  v_active int; v_ended int;
  f_prazo numeric; f_demanda numeric; f_eng numeric; f_ativ numeric;
  v_bio_ok boolean; v_social_ok boolean;
  m record; v_compl numeric; f_perf numeric; v_score int; v_tier text;
begin
  -- fatores compartilhados (entrega/patrocínio não são por modalidade hoje)
  select avg(engagement_rate) into v_eng
  from public.social_links
  where profile_id = p_athlete and engagement_rate is not null;

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
  into v_active, v_ended
  from public.sponsorships where athlete_id = p_athlete;

  select (p.bio is not null),
         exists(select 1 from public.social_links sl where sl.profile_id = p_athlete)
  into v_bio_ok, v_social_ok
  from public.profiles p where p.id = p_athlete;

  f_prazo   := case when coalesce(v_total,0)=0 then 0.6 else least(1.0, v_ontime::numeric / v_total) end;
  f_demanda := case when coalesce(v_ok,0)+coalesce(v_bad,0)=0 then 0.6 else v_ok::numeric/(v_ok+v_bad) end;
  f_eng     := case when v_eng is null then 0.3 else least(1.0, v_eng/10.0) end;
  f_ativ    := case when coalesce(v_active,0)+coalesce(v_ended,0)=0 then 0.15
                    else least(1.0, coalesce(v_active,0)*0.4 + coalesce(v_ended,0)*0.2) end;

  for m in select * from public.athlete_modalities where profile_id = p_athlete loop
    v_compl := (
      (m.category is not null)::int
      + v_social_ok::int
      + exists(select 1 from public.athlete_packages pk
               where pk.athlete_id = p_athlete and pk.modality = m.modality)::int
      + (coalesce(array_length(m.offered_deliverables,1),0) > 0)::int
      + coalesce(v_bio_ok, false)::int
    )::numeric / 5;
    f_perf := coalesce(v_compl, 0);

    v_score := round(100 * (f_prazo*0.30 + f_demanda*0.25 + f_eng*0.20 + f_ativ*0.15 + f_perf*0.10));
    v_tier  := case when v_score>=80 then 'elite' when v_score>=65 then 'ouro'
                    when v_score>=50 then 'prata' when v_score>=35 then 'bronze'
                    else 'iniciante' end;

    update public.athlete_modalities set
      rank_score = v_score, rank_tier = v_tier, rank_updated_at = now(),
      rank_factors = jsonb_build_object(
        'prazo',round(f_prazo,3),'demanda',round(f_demanda,3),'engajamento',round(f_eng,3),
        'atividade',round(f_ativ,3),'perfil',round(f_perf,3),
        'entregas_total',coalesce(v_total,0),'entregas_no_prazo',coalesce(v_ontime,0),
        'entregas_aprovadas',coalesce(v_ok,0))
    where id = m.id;
  end loop;
end $$;

-- o gatilho de athlete_profiles vira gatilho de athlete_modalities
drop trigger if exists rank_on_athlete_profile on public.athlete_profiles;

create or replace function public.trg_rank_from_modality()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if pg_trigger_depth() <= 1 then
    perform public.recompute_athlete_rank(coalesce(new.profile_id, old.profile_id));
  end if;
  return null;
end $$;

drop trigger if exists rank_on_athlete_modality on public.athlete_modalities;
create trigger rank_on_athlete_modality
  after insert or update on public.athlete_modalities
  for each row execute function public.trg_rank_from_modality();

-- recalcula todo mundo já no formato novo
do $$ declare r record; begin
  for r in select id from public.profiles where type='athlete' loop
    perform public.recompute_athlete_rank(r.id);
  end loop;
end $$;
