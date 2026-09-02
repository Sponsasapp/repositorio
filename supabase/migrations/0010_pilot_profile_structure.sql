-- 0010 — Perfil do piloto: conquistas e carros como listas + lista de arrancada.
--
-- Conquistas: antes um blob de texto livre (athlete_profiles.results); agora
-- cada título/recorde/colocação é um item com título (aceita emoji), ano e
-- detalhe.
--
-- Carros: antes campos únicos (car/team/championship/car_photo_url); agora uma
-- lista — um piloto pode ter mais de um carro, em equipes/oficinas diferentes.
--
-- Lista: a lista de arrancada de que o piloto faz parte (nome + número), com a
-- posição dele ou o Shark Tank.

-- Conquistas do piloto
create table if not exists athlete_achievements (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  year text,
  detail text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_athlete_achievements_athlete
  on athlete_achievements(athlete_id);
alter table athlete_achievements enable row level security;
create policy "athlete_achievements_select_public" on athlete_achievements
  for select using (true);
create policy "athlete_achievements_write_own" on athlete_achievements
  for all using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);

-- Carros do piloto
create table if not exists athlete_cars (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  team text,
  championships text,
  photo_url text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_athlete_cars_athlete on athlete_cars(athlete_id);
alter table athlete_cars enable row level security;
create policy "athlete_cars_select_public" on athlete_cars
  for select using (true);
create policy "athlete_cars_write_own" on athlete_cars
  for all using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);

-- Lista (ranking de arrancada) — direto no perfil
alter table athlete_profiles
  add column list_name text,
  add column list_number int,
  add column list_position int,
  add column list_shark_tank boolean not null default false;

-- Migra os campos únicos atuais para o 1º carro
insert into athlete_cars (athlete_id, name, team, championships, photo_url, position)
select profile_id,
       coalesce(nullif(car, ''), 'Carro'),
       nullif(team, ''), nullif(championship, ''), nullif(car_photo_url, ''), 0
from athlete_profiles
where coalesce(car, team, championship, car_photo_url) is not null;
