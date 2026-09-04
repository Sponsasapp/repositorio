-- 0020 — notificações in-app (sininho) + correção do fluxo de e-mail.
--
-- Problema: notifyUser() dependia só do envio de e-mail (best-effort, via
-- Resend). Se o e-mail falhar por qualquer motivo (chave ausente na Vercel,
-- Resend fora do ar, etc.) o usuário nunca fica sabendo. Agora toda
-- notificação também vira uma linha em `notifications`, lida pelo sininho no
-- header — o e-mail continua sendo enviado em cima disso, mas deixa de ser a
-- única forma de aviso.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  cta_label text,
  cta_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_created_idx
  on public.notifications (profile_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (auth.uid() = profile_id);

create policy notifications_update_own on public.notifications
  for update using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ------------------------------------------------------------------
-- notify(): substitui notify_email(). Além de resolver o e-mail do alvo,
-- já grava a notificação in-app — na mesma guarda de relação de antes
-- (proposta, candidatura ou patrocínio entre o chamador e o alvo).
-- ------------------------------------------------------------------
drop function if exists public.notify_email(uuid);

create or replace function public.notify(
  p_target uuid,
  p_type text,
  p_title text,
  p_body text,
  p_cta_label text default null,
  p_cta_path text default null
)
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

  insert into public.notifications (profile_id, type, title, body, cta_label, cta_path)
  values (p_target, p_type, p_title, p_body, p_cta_label, p_cta_path);

  select email into v_email from auth.users where id = p_target;
  return v_email;
end $$;

grant execute on function public.notify(uuid, text, text, text, text, text) to authenticated;

-- ------------------------------------------------------------------
-- recompute_athlete_rank: mesma lógica da 0014, com um adicional — quando o
-- tier de uma modalidade muda, grava uma notificação in-app (sem e-mail;
-- é aviso informativo, não depende de relação com outro usuário).
-- ------------------------------------------------------------------
create or replace function public.recompute_athlete_rank(p_athlete uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_eng numeric; v_total int; v_ontime int; v_ok int; v_bad int;
  v_active int; v_ended int;
  f_prazo numeric; f_demanda numeric; f_eng numeric; f_ativ numeric;
  v_bio_ok boolean; v_social_ok boolean;
  m record; v_compl numeric; f_perf numeric; v_score int; v_tier text;
  v_order text[] := array['iniciante','bronze','prata','ouro','elite'];
begin
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
      rank_score = v_score, rank_tier = v_tier, rank_updated_at = now(),
      rank_factors = jsonb_build_object(
        'prazo',round(f_prazo,3),'demanda',round(f_demanda,3),'engajamento',round(f_eng,3),
        'atividade',round(f_ativ,3),'perfil',round(f_perf,3),
        'entregas_total',coalesce(v_total,0),'entregas_no_prazo',coalesce(v_ontime,0),
        'entregas_aprovadas',coalesce(v_ok,0))
    where id = m.id;
  end loop;
end $$;

-- ------------------------------------------------------------------
-- notify_expiring_plans(): roda no cron diário junto com o snapshot do
-- rank. Avisa quem está no PRO e vence em até 3 dias, no máximo uma vez a
-- cada 3 dias (evita reavisar todo dia até o vencimento).
-- ------------------------------------------------------------------
create or replace function public.notify_expiring_plans()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v_count int;
begin
  insert into public.notifications (profile_id, type, title, body, cta_label, cta_path)
  select
    s.profile_id,
    'plan_expiring',
    'Seu plano PRO vence em breve',
    'Seu plano PRO vence em ' || to_char(s.renewed_until, 'DD/MM') || '. Renove para não perder os benefícios.',
    'Ver plano',
    '/configuracoes'
  from public.subscriptions s
  where s.plan = 'pro'
    and s.status = 'active'
    and s.renewed_until is not null
    and s.renewed_until between now() and now() + interval '3 days'
    and not exists (
      select 1 from public.notifications n
      where n.profile_id = s.profile_id
        and n.type = 'plan_expiring'
        and n.created_at > now() - interval '3 days'
    );
  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.notify_expiring_plans() to anon, authenticated;
