-- 0030 — pistas, eventos e mídias entram como novos tipos de PATROCINADO.
--
-- Modelo: de um lado "empresa" (patrocinador), do outro 4 tipos que buscam
-- patrocínio: piloto (athlete), pista (track), evento (event), mídia
-- (media). Proposta/patrocínio agora é empresa ↔ qualquer patrocinado.
--
-- `sponsorships.athlete_id` passa a significar "o patrocinado" (de qualquer
-- tipo). Renomear a coluna quebraria todas as queries — fica o nome antigo
-- com este comentário.

alter type public.profile_type add value if not exists 'track';
alter type public.profile_type add value if not exists 'event';
alter type public.profile_type add value if not exists 'media';

comment on column public.sponsorships.athlete_id is
  'O patrocinado — pode ser athlete, track, event ou media.';

-- ============================================================
-- Tabelas de perfil (espelham company_profiles: select público, escrita
-- só do dono).
-- ============================================================
create table public.track_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  layouts text[] not null default '{}',   -- arrancada, kart, circuito, drift...
  length_m int,
  capacity int,
  sponsor_spaces text,                     -- espaços disponíveis pra marca
  website text,
  instagram text,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.track_profiles enable row level security;
create policy track_profiles_select_public on public.track_profiles
  for select using (true);
create policy track_profiles_write_own on public.track_profiles
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create table public.event_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  event_kind text,                         -- etapa, encontro, test day, feira...
  next_date date,
  track_name text,                         -- pista onde acontece (texto livre)
  expected_public int,
  sponsor_packages text,
  website text,
  instagram text,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.event_profiles enable row level security;
create policy event_profiles_select_public on public.event_profiles
  for select using (true);
create policy event_profiles_write_own on public.event_profiles
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create table public.media_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  roles text[] not null default '{}',      -- foto, video, influencer, podcast...
  portfolio_url text,
  website text,
  instagram text,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.media_profiles enable row level security;
create policy media_profiles_select_public on public.media_profiles
  for select using (true);
create policy media_profiles_write_own on public.media_profiles
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================
-- respond_proposal — empresa ↔ qualquer patrocinado
-- ============================================================
create or replace function public.respond_proposal(p_proposal uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.proposals;
  v_company uuid;
  v_sponsee uuid;
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

  if v_prop.to_profile_id <> auth.uid() then return 'not_recipient'; end if;

  if p_action = 'reject' then
    update public.proposals set status = 'rejected' where id = p_proposal;
    return 'ok';
  end if;

  -- accept: uma parte é 'company', a outra é o patrocinado (qualquer tipo)
  select id into v_company from public.profiles
    where id in (v_prop.from_profile_id, v_prop.to_profile_id) and type = 'company';
  if v_company is null then return 'bad_parties'; end if;
  v_sponsee := case when v_company = v_prop.from_profile_id
                    then v_prop.to_profile_id else v_prop.from_profile_id end;
  if (select type from public.profiles where id = v_sponsee) = 'company' then
    return 'bad_parties';
  end if;

  select id into v_sp from public.sponsorships where proposal_id = p_proposal;
  if v_sp is null then
    insert into public.sponsorships
      (proposal_id, athlete_id, company_id, payment_type, value,
       trade_description, trade_value, duration_months, status)
    values
      (v_prop.id, v_sponsee, v_company, v_prop.payment_type, v_prop.value,
       v_prop.trade_description, v_prop.trade_value, v_prop.duration_months, 'active')
    returning id into v_sp;
  end if;

  update public.proposals set status = 'accepted' where id = p_proposal;
  return v_sp::text;
end $$;

grant execute on function public.respond_proposal(uuid, text) to authenticated;

-- ============================================================
-- can_message — empresa ↔ patrocinado precisa de proposta; piloto ↔ piloto
-- precisa dos dois no PRO; qualquer outra combinação, bloqueado.
-- ============================================================
create or replace function public.can_message(p_me uuid, p_other uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me_type text; v_me_plan text;
  v_other_type text; v_other_plan text;
begin
  select type, plan into v_me_type, v_me_plan from public.profiles where id = p_me;
  select type, plan into v_other_type, v_other_plan from public.profiles where id = p_other;
  if v_me_type is null or v_other_type is null then return false; end if;

  -- exatamente um dos dois é empresa → empresa ↔ patrocinado
  if (v_me_type = 'company') <> (v_other_type = 'company') then
    return exists (
      select 1 from public.proposals
      where (from_profile_id = p_me and to_profile_id = p_other)
         or (from_profile_id = p_other and to_profile_id = p_me)
    );
  end if;

  if v_me_type = 'athlete' and v_other_type = 'athlete' then
    return v_me_plan = 'pro' and v_other_plan = 'pro';
  end if;

  return false;
end $$;

grant execute on function public.can_message(uuid, uuid) to authenticated;
