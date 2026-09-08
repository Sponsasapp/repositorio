-- 0032 — corrige recompute_sponsee_rank quando o profile não existe.
--
-- Bug da 0031: `if v_type not in ('track','event','media')` — quando o
-- profile já foi apagado (ex.: cascade de delete em auth.users), a busca
-- devolve NULL, `NULL not in (...)` é NULL (não é true), a função segue e
-- tenta `insert into sponsee_rank` com um profile_id inexistente → viola a
-- FK. Basta tratar o NULL: sem profile, não há rank a recalcular.

create or replace function public.recompute_sponsee_rank(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.rank_config;
  v_type public.profile_type;
  v_eng numeric;
  v_appr_total int; v_appr_prazo int; v_penal int;
  v_ativos int; v_concluidos int;
  v_bio_ok boolean; v_social_ok boolean; v_desc_ok boolean;
  p_prazo int; p_apr int; p_pen int; p_patroc int; p_conclu int; p_eng int; p_perfil int;
  v_compl int; v_points int; v_tier text;
begin
  select type into v_type from public.profiles where id = p_id;
  if v_type is null or v_type not in ('track', 'event', 'media') then
    return;
  end if;

  select * into cfg from public.rank_config limit 1;

  select avg(engagement_rate) into v_eng from public.social_links
  where profile_id = p_id and engagement_rate is not null;

  select
    count(*),
    count(*) filter (
      where d.due_date is null
         or coalesce(
              (select max(pp.submitted_at)::date from public.deliverable_proofs pp
               where pp.deliverable_id = d.id),
              current_date) <= d.due_date)
  into v_appr_total, v_appr_prazo
  from public.deliverables d
  join public.sponsorships s on s.id = d.sponsorship_id
  where s.athlete_id = p_id and d.status = 'approved';

  select count(*) into v_penal
  from public.deliverables d
  join public.sponsorships s on s.id = d.sponsorship_id
  where s.athlete_id = p_id
    and (d.status = 'rejected'
         or (d.status = 'pending' and d.due_date is not null and d.due_date < current_date));

  select
    count(*) filter (where status = 'active'
                       and athlete_accepted_at is not null
                       and company_accepted_at is not null),
    count(*) filter (where status = 'ended')
  into v_ativos, v_concluidos
  from public.sponsorships where athlete_id = p_id;

  select (bio is not null) into v_bio_ok from public.profiles where id = p_id;
  v_social_ok := exists(select 1 from public.social_links where profile_id = p_id);
  v_desc_ok := case v_type
    when 'track' then exists(select 1 from public.track_profiles where profile_id = p_id and description is not null)
    when 'event' then exists(select 1 from public.event_profiles where profile_id = p_id and description is not null)
    else exists(select 1 from public.media_profiles where profile_id = p_id and description is not null)
  end;

  p_prazo  := coalesce(v_appr_prazo, 0) * cfg.pts_entrega_prazo;
  p_apr    := (coalesce(v_appr_total, 0) - coalesce(v_appr_prazo, 0)) * cfg.pts_entrega_aprovada;
  p_pen    := coalesce(v_penal, 0) * cfg.pts_penalidade_entrega;
  p_patroc := coalesce(v_ativos, 0) * cfg.pts_patrocinio_fechado;
  p_conclu := coalesce(v_concluidos, 0) * cfg.pts_patrocinio_concluido;
  p_eng    := round(least(coalesce(v_eng, 0), 10) * cfg.pts_engajamento_max / 10.0);
  v_compl  := coalesce(v_bio_ok, false)::int + v_social_ok::int + coalesce(v_desc_ok, false)::int;
  p_perfil := round(cfg.pts_perfil_completo * v_compl / 3.0);

  v_points := greatest(0, p_prazo + p_apr + p_patroc + p_conclu + p_perfil + p_eng - p_pen);
  v_tier := case
    when v_points >= cfg.tier_elite then 'elite'
    when v_points >= cfg.tier_ouro  then 'ouro'
    when v_points >= cfg.tier_prata then 'prata'
    when v_points >= cfg.tier_bronze then 'bronze'
    else 'iniciante' end;

  insert into public.sponsee_rank (profile_id, score, tier, factors, updated_at)
  values (p_id, v_points, v_tier, jsonb_build_object(
    'entregas_prazo', p_prazo, 'entregas_aprovadas', p_apr,
    'patrocinios', p_patroc, 'concluidos', p_conclu, 'perfil', p_perfil,
    'engajamento', p_eng, 'penalidades', p_pen,
    'qt_entregas_prazo', coalesce(v_appr_prazo, 0),
    'qt_entregas_total', coalesce(v_appr_total, 0),
    'qt_patrocinios', coalesce(v_ativos, 0)), now())
  on conflict (profile_id) do update set
    score = excluded.score, tier = excluded.tier,
    factors = excluded.factors, updated_at = now();
end $$;
