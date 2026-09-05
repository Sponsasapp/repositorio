-- 0027 — Rank Sponsas vira ACÚMULO DE PONTOS.
--
-- Antes: score 0–100 (média ponderada de fatores). Agora: cada ação soma
-- pontos, e o tier sai de limiares CRESCENTES (quanto mais alto, mais pontos
-- pro próximo). `rank_score` passa a guardar o total de pontos (sem teto).
--
-- Os valores ficam em `rank_config` (uma linha) — o dono ajusta pelo
-- editor de tabela do Supabase sem mexer em função.

create table if not exists public.rank_config (
  id boolean primary key default true,
  constraint rank_config_singleton check (id),
  pts_entrega_prazo      int not null default 20,  -- entrega aprovada no prazo
  pts_entrega_aprovada   int not null default 8,   -- entrega aprovada fora do prazo
  pts_patrocinio_fechado int not null default 40,  -- contrato ativo (2 aceites)
  pts_patrocinio_concluido int not null default 30,-- patrocínio encerrado ok
  pts_perfil_completo    int not null default 15,  -- perfil da modalidade 100%
  pts_engajamento_max    int not null default 30,  -- teto do bônus de engajamento
  pts_penalidade_entrega int not null default 10,  -- entrega recusada / atrasada
  tier_bronze int not null default 60,
  tier_prata  int not null default 180,
  tier_ouro   int not null default 400,
  tier_elite  int not null default 750
);
insert into public.rank_config (id) values (true) on conflict do nothing;

alter table public.rank_config enable row level security;
drop policy if exists rank_config_select_public on public.rank_config;
create policy rank_config_select_public on public.rank_config for select using (true);
-- sem policy de escrita: só o dono mexe pelo dashboard do Supabase.

-- ------------------------------------------------------------------
-- recompute_athlete_rank — modelo de pontos.
-- ------------------------------------------------------------------
create or replace function public.recompute_athlete_rank(p_athlete uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  cfg public.rank_config;
  v_eng numeric;
  v_appr_total int; v_appr_prazo int; v_penal int;
  v_ativos int; v_concluidos int;
  v_bio_ok boolean; v_social_ok boolean;
  p_entregas_prazo int; p_entregas_apr int; p_penal int;
  p_patroc int; p_conclu int; p_eng int;
  m record; v_compl int; p_perfil int; v_points int; v_tier text;
  v_order text[] := array['iniciante','bronze','prata','ouro','elite'];
begin
  select * into cfg from public.rank_config limit 1;

  select avg(engagement_rate) into v_eng
  from public.social_links
  where profile_id = p_athlete and engagement_rate is not null;

  -- Entregas APROVADAS (só elas pontuam), separando no prazo x fora do prazo.
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
  where s.athlete_id = p_athlete and d.status = 'approved';

  -- Penalidade: entrega recusada ou vencida sem envio.
  select count(*) into v_penal
  from public.deliverables d
  join public.sponsorships s on s.id = d.sponsorship_id
  where s.athlete_id = p_athlete
    and (d.status = 'rejected'
         or (d.status = 'pending' and d.due_date is not null and d.due_date < current_date));

  -- Patrocínios: só os com contrato aceito pelas duas partes.
  select
    count(*) filter (where status = 'active'
                       and athlete_accepted_at is not null
                       and company_accepted_at is not null),
    count(*) filter (where status = 'ended')
  into v_ativos, v_concluidos
  from public.sponsorships where athlete_id = p_athlete;

  select (p.bio is not null),
         exists(select 1 from public.social_links sl where sl.profile_id = p_athlete)
  into v_bio_ok, v_social_ok
  from public.profiles p where p.id = p_athlete;

  p_entregas_prazo := coalesce(v_appr_prazo, 0) * cfg.pts_entrega_prazo;
  p_entregas_apr   := (coalesce(v_appr_total, 0) - coalesce(v_appr_prazo, 0)) * cfg.pts_entrega_aprovada;
  p_penal          := coalesce(v_penal, 0) * cfg.pts_penalidade_entrega;
  p_patroc         := coalesce(v_ativos, 0) * cfg.pts_patrocinio_fechado;
  p_conclu         := coalesce(v_concluidos, 0) * cfg.pts_patrocinio_concluido;
  p_eng            := round(least(coalesce(v_eng, 0), 10) * cfg.pts_engajamento_max / 10.0);

  for m in select * from public.athlete_modalities where profile_id = p_athlete loop
    -- Perfil completo da modalidade: 5 itens, pontos proporcionais.
    v_compl := (
      (m.category is not null)::int
      + v_social_ok::int
      + exists(select 1 from public.athlete_packages pk
               where pk.athlete_id = p_athlete and pk.modality = m.modality)::int
      + (coalesce(array_length(m.offered_deliverables, 1), 0) > 0)::int
      + coalesce(v_bio_ok, false)::int
    );
    p_perfil := round(cfg.pts_perfil_completo * v_compl / 5.0);

    v_points := greatest(
      0,
      p_entregas_prazo + p_entregas_apr + p_patroc + p_conclu + p_perfil + p_eng - p_penal
    );

    v_tier := case
      when v_points >= cfg.tier_elite then 'elite'
      when v_points >= cfg.tier_ouro  then 'ouro'
      when v_points >= cfg.tier_prata then 'prata'
      when v_points >= cfg.tier_bronze then 'bronze'
      else 'iniciante' end;

    if m.rank_tier is not null and m.rank_tier <> v_tier then
      insert into public.notifications (profile_id, type, title, body, cta_label, cta_path)
      values (
        p_athlete,
        case when array_position(v_order, v_tier) > array_position(v_order, m.rank_tier)
             then 'rank_up' else 'rank_down' end,
        case when array_position(v_order, v_tier) > array_position(v_order, m.rank_tier)
             then 'Seu Rank Sponsas subiu'
             else 'Seu Rank Sponsas caiu' end,
        m.modality || ': você passou de ' || initcap(m.rank_tier) || ' para ' || initcap(v_tier) || '.',
        'Ver rank', '/rank'
      );
    end if;

    update public.athlete_modalities set
      rank_score = v_points,
      rank_tier = v_tier,
      rank_updated_at = now(),
      rank_factors = jsonb_build_object(
        'entregas_prazo', p_entregas_prazo,
        'entregas_aprovadas', p_entregas_apr,
        'patrocinios', p_patroc,
        'concluidos', p_conclu,
        'perfil', p_perfil,
        'engajamento', p_eng,
        'penalidades', p_penal,
        'qt_entregas_prazo', coalesce(v_appr_prazo, 0),
        'qt_entregas_total', coalesce(v_appr_total, 0),
        'qt_patrocinios', coalesce(v_ativos, 0)
      )
    where id = m.id;
  end loop;
end $$;

-- Recalcula todo mundo já no modelo novo.
do $$ declare r record; begin
  for r in select id from public.profiles where type = 'athlete' loop
    perform public.recompute_athlete_rank(r.id);
  end loop;
end $$;
