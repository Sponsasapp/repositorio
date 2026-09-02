-- ============================================================
-- athlete_packages — tabela de preços do piloto (rate card).
-- Cada item: um produto/pacote que a marca pode contratar.
-- Ex: "Adesivo no carro", "Pacote 3 stories/semana", "Stories + reels".
-- ============================================================

create table if not exists athlete_packages (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_athlete_packages_athlete on athlete_packages(athlete_id);

alter table athlete_packages enable row level security;

-- leitura pública, escrita só do dono (igual aos outros dados do piloto)
create policy "athlete_packages_select_public" on athlete_packages
  for select using (true);
create policy "athlete_packages_write_own" on athlete_packages
  for all using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);
