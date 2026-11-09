-- ============================================================
-- 0037 — Preços do piloto escondidos NO BANCO
--
-- Regra do produto: preço é informação pessoal — só o próprio piloto e
-- EMPRESAS veem a tabela de preços e a faixa de valor. Antes isso era só na
-- tela (/p/[id] apagava o preço do payload), mas `athlete_packages.price` e
-- `athlete_modalities.desired_value_min/max` tinham leitura pública via API.
--
-- Fix: tira o SELECT dessas colunas de anon/authenticated (privilégio por
-- coluna; o resto da tabela continua público) e expõe os valores só por RPCs
-- SECURITY DEFINER que checam quem pergunta.
-- Escrita (insert/upsert/delete do dono) não muda: só o SELECT foi restrito.
-- ============================================================

-- ---------- athlete_packages: tudo menos price ----------
revoke select on public.athlete_packages from anon, authenticated;
grant select (id, athlete_id, modality, title, description, position, created_at)
  on public.athlete_packages to anon, authenticated;

-- ---------- athlete_modalities: tudo menos desired_value_min/max ----------
revoke select on public.athlete_modalities from anon, authenticated;
grant select (
  id, profile_id, modality, category, results, availability_notes,
  offered_deliverables, sponsor_categories,
  list_name, list_member, list_position, list_shark_tank, list_shark_tank_date,
  rank_score, rank_tier, rank_factors, rank_updated_at,
  created_at, updated_at
) on public.athlete_modalities to anon, authenticated;

-- ---------- quem pode ver preço: o próprio piloto ou uma empresa ----------
create or replace function public.can_see_athlete_prices(p_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    auth.uid() = p_athlete
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and type = 'company'
    )
  );
$$;

-- Preços da tabela de um piloto (vazio se quem pergunta não pode ver).
create or replace function public.get_athlete_prices(p_athlete uuid)
returns table (package_id uuid, price numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.price
    from public.athlete_packages p
   where p.athlete_id = p_athlete
     and public.can_see_athlete_prices(p_athlete);
$$;

-- Faixa de valor por modalidade de um piloto (vazio se não pode ver).
create or replace function public.get_athlete_value_ranges(p_athlete uuid)
returns table (modality text, desired_value_min int, desired_value_max int)
language sql
stable
security definer
set search_path = ''
as $$
  select m.modality, m.desired_value_min, m.desired_value_max
    from public.athlete_modalities m
   where m.profile_id = p_athlete
     and public.can_see_athlete_prices(p_athlete);
$$;

-- Valor mínimo de todos os pilotos — só pra EMPRESA (filtro de orçamento
-- da busca /pilotos). Pra qualquer outro, volta vazio.
create or replace function public.athlete_value_floors()
returns table (profile_id uuid, modality text, desired_value_min int)
language sql
stable
security definer
set search_path = ''
as $$
  select m.profile_id, m.modality, m.desired_value_min
    from public.athlete_modalities m
   where exists (
     select 1 from public.profiles
     where id = auth.uid() and type = 'company'
   );
$$;

revoke execute on function public.can_see_athlete_prices(uuid) from public;
grant execute on function public.get_athlete_prices(uuid) to anon, authenticated;
grant execute on function public.get_athlete_value_ranges(uuid) to anon, authenticated;
grant execute on function public.athlete_value_floors() to anon, authenticated;
