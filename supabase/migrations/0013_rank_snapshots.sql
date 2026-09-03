-- 0013 — Snapshots diários do Rank Sponsas.
--
-- O rank_score/rank_tier em athlete_profiles é sempre o valor atual. Para
-- mostrar "movimento na semana / no mês" no /rank, guardamos uma foto por dia.
-- Preenchido por um Vercel Cron (app/api/cron/rank-snapshot) usando a service
-- role — sem policy de INSERT (cliente não escreve). Leitura é pública.

create table if not exists athlete_rank_snapshots (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  score int,
  tier text,
  captured_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique (athlete_id, captured_on)
);

create index if not exists idx_rank_snapshots_captured_on
  on athlete_rank_snapshots (captured_on);

alter table athlete_rank_snapshots enable row level security;

create policy "rank_snapshots_select_public" on athlete_rank_snapshots
  for select using (true);
