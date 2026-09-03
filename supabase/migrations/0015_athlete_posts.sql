-- 0015 — Posts em destaque do piloto (entrada manual por enquanto).
--
-- O piloto cola a URL de um post, a plataforma, o nº de curtidas e a data.
-- A home mostra o post de mais curtidas dos últimos 30 dias. Compartilhado
-- entre modalidades (a audiência do piloto é uma só).

create table if not exists athlete_posts (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  platform text not null,          -- 'instagram' | 'tiktok' | 'youtube'
  url text not null,
  likes int not null default 0,
  posted_on date,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_athlete_posts_athlete on athlete_posts (athlete_id);
create index if not exists idx_athlete_posts_posted_on on athlete_posts (posted_on);

alter table athlete_posts enable row level security;
create policy "athlete_posts_select_public" on athlete_posts
  for select using (true);
create policy "athlete_posts_write_own" on athlete_posts
  for all using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);
