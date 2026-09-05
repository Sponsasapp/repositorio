-- 0029 — submit_athlete_documents(): guarda mais robusta.
--
-- Antes: se o chamador estava logado como OUTRO usuário (ex.: cookie de
-- sessão antigo) a função retornava 'forbidden' e travava o cadastro.
-- Agora: se não é o próprio usuário logado, cai na regra de "conta recente"
-- (vale pro cadastro anônimo E pra alguém logado criando outra conta).

create or replace function public.submit_athlete_documents(
  p_user uuid,
  p_full_name text,
  p_cpf text,
  p_rg text,
  p_birth date,
  p_zip text,
  p_street text,
  p_number text,
  p_complement text,
  p_district text,
  p_city text,
  p_state text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.profile_type;
  v_created timestamptz;
begin
  select type into v_type from public.profiles where id = p_user;
  if v_type is null then return 'no_user'; end if;
  if v_type <> 'athlete' then return 'not_athlete'; end if;

  if auth.uid() is null or auth.uid() <> p_user then
    -- fluxo de cadastro: só se a conta foi criada há pouco
    select created_at into v_created from auth.users where id = p_user;
    if v_created is null or v_created < now() - interval '30 minutes' then
      return 'stale_user';
    end if;
  end if;

  if p_full_name is null or p_cpf is null or p_rg is null or p_birth is null
     or p_zip is null or p_street is null or p_number is null
     or p_district is null or p_city is null or p_state is null then
    return 'incomplete';
  end if;

  insert into public.athlete_documents (
    profile_id, full_legal_name, cpf, rg, birth_date, address_zip,
    address_street, address_number, address_complement, address_district,
    address_city, address_state
  ) values (
    p_user, trim(p_full_name), regexp_replace(p_cpf, '\D', '', 'g'),
    trim(p_rg), p_birth, regexp_replace(p_zip, '\D', '', 'g'),
    trim(p_street), trim(p_number), nullif(trim(p_complement), ''),
    trim(p_district), trim(p_city), upper(trim(p_state))
  )
  on conflict (profile_id) do update set
    full_legal_name = excluded.full_legal_name,
    cpf = excluded.cpf,
    rg = excluded.rg,
    birth_date = excluded.birth_date,
    address_zip = excluded.address_zip,
    address_street = excluded.address_street,
    address_number = excluded.address_number,
    address_complement = excluded.address_complement,
    address_district = excluded.address_district,
    address_city = excluded.address_city,
    address_state = excluded.address_state,
    updated_at = now();

  return 'ok';
end $$;
