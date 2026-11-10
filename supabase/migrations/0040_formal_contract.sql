-- ============================================================
-- 0040 — Contrato formal
--
-- 1. party_legal_info: dados jurídicos de quem NÃO é piloto (empresa, pista,
--    evento, mídia) — razão social, CNPJ/CPF, representante, endereço.
--    Piloto já tem athlete_documents (0028). Só o dono lê/escreve.
-- 2. contract_parties(): devolve a qualificação das DUAS partes de um
--    patrocínio — só pra quem é parte dele (o contrato precisa mostrar o
--    documento da outra parte; a tabela em si continua fechada).
-- 3. contract_acceptances: trilha do aceite (quando, IP, navegador e hash
--    dos termos aceitos). Gravada só pela RPC.
-- 4. set_contract_acceptance v2: aceitar exige dados jurídicos completos e
--    grava a trilha; "não concordo" deixa de valer depois que os dois já
--    aceitaram (aí é encerrar o patrocínio, não cancelar o contrato).
-- ============================================================

-- ---------- 1. dados jurídicos (não-piloto) ----------
create table if not exists public.party_legal_info (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  legal_name text not null,
  document text not null,               -- só dígitos: 11 (CPF) ou 14 (CNPJ)
  rep_name text,                        -- representante legal (se CNPJ)
  rep_cpf text,                         -- só dígitos
  address_zip text not null,
  address_street text not null,
  address_number text not null,
  address_complement text,
  address_district text not null,
  address_city text not null,
  address_state text not null,
  updated_at timestamptz not null default now(),
  constraint party_legal_doc_len check (char_length(document) in (11, 14)),
  constraint party_legal_rep_cpf_len check (rep_cpf is null or char_length(rep_cpf) = 11),
  constraint party_legal_zip_len check (char_length(address_zip) = 8),
  constraint party_legal_uf_len check (char_length(address_state) = 2)
);

alter table public.party_legal_info enable row level security;

drop policy if exists party_legal_info_own on public.party_legal_info;
create policy party_legal_info_own on public.party_legal_info
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ---------- 2. qualificação das partes de um patrocínio ----------
create or replace function public.contract_parties(p_sponsorship uuid)
returns table (
  role text,             -- 'company' | 'sponsee'
  profile_id uuid,
  legal_name text,
  document text,
  rep_name text,
  rep_cpf text,
  address text,
  complete boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sp public.sponsorships;
begin
  select * into v_sp from public.sponsorships where id = p_sponsorship;
  if v_sp is null or auth.uid() is null
     or auth.uid() not in (v_sp.athlete_id, v_sp.company_id) then
    return;
  end if;

  return query
  with ids as (
    select 'company'::text as role, v_sp.company_id as pid
    union all
    select 'sponsee'::text, v_sp.athlete_id
  )
  select
    ids.role,
    ids.pid,
    coalesce(ad.full_legal_name, pl.legal_name),
    coalesce(ad.cpf, pl.document),
    pl.rep_name,
    pl.rep_cpf,
    case
      when ad.profile_id is not null then
        concat_ws(', ', ad.address_street || ' ' || ad.address_number,
                  ad.address_complement, ad.address_district,
                  ad.address_city || '/' || ad.address_state,
                  'CEP ' || ad.address_zip)
      when pl.profile_id is not null then
        concat_ws(', ', pl.address_street || ' ' || pl.address_number,
                  pl.address_complement, pl.address_district,
                  pl.address_city || '/' || pl.address_state,
                  'CEP ' || pl.address_zip)
    end,
    (ad.profile_id is not null or pl.profile_id is not null)
  from ids
  left join public.profiles pr on pr.id = ids.pid
  left join public.athlete_documents ad
    on ad.profile_id = ids.pid and pr.type = 'athlete'
  left join public.party_legal_info pl
    on pl.profile_id = ids.pid and pr.type <> 'athlete';
end $$;

grant execute on function public.contract_parties(uuid) to authenticated;

-- ---------- 3. trilha de aceite ----------
create table if not exists public.contract_acceptances (
  sponsorship_id uuid not null references public.sponsorships(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  ip text,
  user_agent text,
  terms_hash text,                      -- sha256 dos termos que a pessoa viu
  primary key (sponsorship_id, profile_id)
);

alter table public.contract_acceptances enable row level security;

drop policy if exists contract_acceptances_parties on public.contract_acceptances;
create policy contract_acceptances_parties on public.contract_acceptances
  for select using (
    auth.uid() in (
      select athlete_id from public.sponsorships where id = sponsorship_id
      union
      select company_id from public.sponsorships where id = sponsorship_id
    )
  );

-- ---------- 4. aceite v2 ----------
create or replace function public.has_legal_info(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.athlete_documents where profile_id = p_profile)
      or exists (select 1 from public.party_legal_info where profile_id = p_profile);
$$;

grant execute on function public.has_legal_info(uuid) to authenticated;

create or replace function public.set_contract_acceptance_v2(
  p_sponsorship uuid,
  p_accept boolean,
  p_ip text,
  p_user_agent text,
  p_terms_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sp public.sponsorships;
begin
  if auth.uid() is null then return 'no_auth'; end if;

  select * into v_sp from public.sponsorships where id = p_sponsorship for update;
  if v_sp is null then return 'not_found'; end if;
  if auth.uid() not in (v_sp.athlete_id, v_sp.company_id) then return 'not_party'; end if;
  if v_sp.status in ('ended', 'cancelled') then return 'closed'; end if;

  if not p_accept then
    -- Com os dois aceites o contrato já vale: aí é encerrar, não cancelar.
    if v_sp.athlete_accepted_at is not null and v_sp.company_accepted_at is not null then
      return 'already_active';
    end if;
    update public.sponsorships set status = 'cancelled' where id = p_sponsorship;
    update public.proposals set status = 'withdrawn'
      where id = v_sp.proposal_id and status = 'accepted';
    return 'cancelled';
  end if;

  if not public.has_legal_info(auth.uid()) then
    return 'missing_legal';
  end if;

  if auth.uid() = v_sp.athlete_id then
    update public.sponsorships
      set athlete_accepted_at = coalesce(athlete_accepted_at, now())
      where id = p_sponsorship;
  else
    update public.sponsorships
      set company_accepted_at = coalesce(company_accepted_at, now())
      where id = p_sponsorship;
  end if;

  insert into public.contract_acceptances
    (sponsorship_id, profile_id, ip, user_agent, terms_hash)
  values
    (p_sponsorship, auth.uid(), left(p_ip, 64), left(p_user_agent, 300), left(p_terms_hash, 64))
  on conflict (sponsorship_id, profile_id) do nothing;

  return 'ok';
end $$;

grant execute on function public.set_contract_acceptance_v2(uuid, boolean, text, text, text)
  to authenticated;

-- A versão antiga (2 args) passa pela v2: mesmas regras pra quem ainda chamar.
create or replace function public.set_contract_acceptance(
  p_sponsorship uuid,
  p_accept boolean
)
returns text
language sql
security definer
set search_path = ''
as $$
  select public.set_contract_acceptance_v2(p_sponsorship, p_accept, null, null, null);
$$;
