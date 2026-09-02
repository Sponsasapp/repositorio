-- ============================================================
-- SPONSAS — SCHEMA INICIAL DO MVP (Supabase / PostgreSQL)
-- ============================================================
-- Rode este arquivo como uma migration no Supabase
-- (supabase/migrations/0001_init.sql)
-- ============================================================

-- Extensões úteis
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- Estende auth.users (gerenciado pelo Supabase Auth)
-- ============================================================
create type profile_type as enum ('athlete', 'company');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  type profile_type not null,
  name text not null,
  photo_url text,
  city text,
  state text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. ATHLETE_PROFILES
-- ============================================================
create table athlete_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  modality text,               -- ex: 'arrancada'
  category text,                -- ex: 'Street', 'Pro', 'Super Street'
  team text,
  car text,
  championship text,
  results text,                 -- histórico livre no MVP
  desired_value_min numeric,
  desired_value_max numeric,
  sponsor_categories text[],    -- tipos de empresa que procura (ex: 'autopeças','bebidas')
  offered_deliverables text[],  -- ex: 'logo_carro','reels','stories','evento'
  availability_notes text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. COMPANY_PROFILES
-- ============================================================
create table company_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  segment text,
  website text,
  instagram text,
  description text,
  campaign_goal text,
  target_audience text,
  budget numeric,
  campaign_duration_months int,
  region_of_interest text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 4. SOCIAL_LINKS  (métricas preenchidas manualmente no MVP)
-- ============================================================
create table social_links (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  platform text not null,       -- 'instagram','tiktok','youtube','facebook'
  url text,
  followers int,
  avg_reach int,
  engagement_rate numeric,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. OPPORTUNITIES  (empresa cria vaga de patrocínio)
-- ============================================================
create type opportunity_status as enum ('open', 'closed');

create table opportunities (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  budget numeric,
  duration_months int,
  region text,
  expected_deliverables text[],
  description text,
  status opportunity_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. APPLICATIONS  (piloto se candidata a uma oportunidade)
-- ============================================================
create type application_status as enum ('pending', 'accepted', 'rejected');

create table applications (
  id uuid primary key default uuid_generate_v4(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  message text,
  status application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (opportunity_id, athlete_id)
);

-- ============================================================
-- 7. PROPOSALS  (proposta direta, em qualquer direção)
-- ============================================================
create type proposal_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

create table proposals (
  id uuid primary key default uuid_generate_v4(),
  from_profile_id uuid not null references profiles(id) on delete cascade,
  to_profile_id uuid not null references profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  value numeric,
  duration_months int,
  deliverables text[],
  message text,
  status proposal_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. SPONSORSHIPS  (patrocínio fechado)
-- ============================================================
create type sponsorship_status as enum ('active', 'ended', 'cancelled');

create table sponsorships (
  id uuid primary key default uuid_generate_v4(),
  proposal_id uuid references proposals(id) on delete set null,
  athlete_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references profiles(id) on delete cascade,
  value numeric,
  duration_months int,
  start_date date not null default current_date,
  status sponsorship_status not null default 'active',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. DELIVERABLES  (calendário de entregas do patrocínio)
-- ============================================================
create type deliverable_status as enum ('pending', 'submitted', 'approved', 'rejected');

create table deliverables (
  id uuid primary key default uuid_generate_v4(),
  sponsorship_id uuid not null references sponsorships(id) on delete cascade,
  type text not null,           -- 'story','reel','logo_carro','evento', etc.
  description text,
  due_date date,
  status deliverable_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 10. DELIVERABLE_PROOFS  (comprovação anexada pelo piloto)
-- ============================================================
create table deliverable_proofs (
  id uuid primary key default uuid_generate_v4(),
  deliverable_id uuid not null references deliverables(id) on delete cascade,
  kind text not null,           -- 'link','screenshot','video'
  url text not null,
  submitted_at timestamptz not null default now()
);

-- ============================================================
-- 11. SUBSCRIPTIONS  (controle de plano Free/PRO)
-- ============================================================
create type plan_tier as enum ('free', 'pro');
create type subscription_status as enum ('active', 'cancelled', 'past_due');

create table subscriptions (
  profile_id uuid primary key references profiles(id) on delete cascade,
  plan plan_tier not null default 'free',
  status subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  renewed_until date
);

-- ============================================================
-- ÍNDICES DE APOIO
-- ============================================================
create index idx_opportunities_company on opportunities(company_id);
create index idx_applications_opportunity on applications(opportunity_id);
create index idx_proposals_to on proposals(to_profile_id);
create index idx_proposals_from on proposals(from_profile_id);
create index idx_sponsorships_athlete on sponsorships(athlete_id);
create index idx_sponsorships_company on sponsorships(company_id);
create index idx_deliverables_sponsorship on deliverables(sponsorship_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table athlete_profiles enable row level security;
alter table company_profiles enable row level security;
alter table social_links enable row level security;
alter table opportunities enable row level security;
alter table applications enable row level security;
alter table proposals enable row level security;
alter table sponsorships enable row level security;
alter table deliverables enable row level security;
alter table deliverable_proofs enable row level security;
alter table subscriptions enable row level security;

-- ---- PROFILES: leitura pública, escrita só do dono ----
create policy "profiles_select_public" on profiles
  for select using (true);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ---- ATHLETE_PROFILES / COMPANY_PROFILES: leitura pública, escrita do dono ----
create policy "athlete_profiles_select_public" on athlete_profiles
  for select using (true);
create policy "athlete_profiles_write_own" on athlete_profiles
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "company_profiles_select_public" on company_profiles
  for select using (true);
create policy "company_profiles_write_own" on company_profiles
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ---- SOCIAL_LINKS: leitura pública, escrita do dono ----
create policy "social_links_select_public" on social_links
  for select using (true);
create policy "social_links_write_own" on social_links
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ---- OPPORTUNITIES: leitura pública, escrita só da empresa dona ----
create policy "opportunities_select_public" on opportunities
  for select using (true);
create policy "opportunities_write_own" on opportunities
  for all using (auth.uid() = company_id) with check (auth.uid() = company_id);

-- ---- APPLICATIONS: visível para o piloto candidato e para a empresa da vaga ----
create policy "applications_select_involved" on applications
  for select using (
    auth.uid() = athlete_id
    or auth.uid() in (select company_id from opportunities where id = opportunity_id)
  );
create policy "applications_insert_athlete" on applications
  for insert with check (auth.uid() = athlete_id);
create policy "applications_update_involved" on applications
  for update using (
    auth.uid() = athlete_id
    or auth.uid() in (select company_id from opportunities where id = opportunity_id)
  );

-- ---- PROPOSALS: visível só para remetente e destinatário ----
create policy "proposals_select_involved" on proposals
  for select using (auth.uid() = from_profile_id or auth.uid() = to_profile_id);
create policy "proposals_insert_sender" on proposals
  for insert with check (auth.uid() = from_profile_id);
create policy "proposals_update_involved" on proposals
  for update using (auth.uid() = from_profile_id or auth.uid() = to_profile_id);

-- ---- SPONSORSHIPS: visível só para as partes envolvidas ----
create policy "sponsorships_select_involved" on sponsorships
  for select using (auth.uid() = athlete_id or auth.uid() = company_id);
create policy "sponsorships_insert_involved" on sponsorships
  for insert with check (auth.uid() = athlete_id or auth.uid() = company_id);
create policy "sponsorships_update_involved" on sponsorships
  for update using (auth.uid() = athlete_id or auth.uid() = company_id);

-- ---- DELIVERABLES: visível para as partes do patrocínio ----
create policy "deliverables_select_involved" on deliverables
  for select using (
    auth.uid() in (
      select athlete_id from sponsorships where id = sponsorship_id
      union
      select company_id from sponsorships where id = sponsorship_id
    )
  );
create policy "deliverables_write_involved" on deliverables
  for all using (
    auth.uid() in (
      select athlete_id from sponsorships where id = sponsorship_id
      union
      select company_id from sponsorships where id = sponsorship_id
    )
  );

-- ---- DELIVERABLE_PROOFS: visível para as partes do patrocínio da entrega ----
create policy "deliverable_proofs_select_involved" on deliverable_proofs
  for select using (
    auth.uid() in (
      select s.athlete_id from deliverables d
        join sponsorships s on s.id = d.sponsorship_id
        where d.id = deliverable_id
      union
      select s.company_id from deliverables d
        join sponsorships s on s.id = d.sponsorship_id
        where d.id = deliverable_id
    )
  );
create policy "deliverable_proofs_insert_athlete" on deliverable_proofs
  for insert with check (
    auth.uid() in (
      select s.athlete_id from deliverables d
        join sponsorships s on s.id = d.sponsorship_id
        where d.id = deliverable_id
    )
  );

-- ---- SUBSCRIPTIONS: só o próprio dono vê/edita ----
create policy "subscriptions_select_own" on subscriptions
  for select using (auth.uid() = profile_id);
create policy "subscriptions_write_own" on subscriptions
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================
-- TRIGGER: criar profile + subscription free automaticamente
-- ao registrar um usuário (chamar via metadata no signup)
-- ============================================================
-- Exemplo de uso no signup (client-side):
-- supabase.auth.signUp({
--   email, password,
--   options: { data: { name, type: 'athlete' | 'company' } }
-- })

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, type, name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'type')::profile_type, 'athlete'),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  insert into public.subscriptions (profile_id, plan)
  values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
