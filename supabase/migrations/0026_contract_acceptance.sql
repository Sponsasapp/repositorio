-- 0026 — contrato bilateral: o patrocínio nasce com os termos travados
-- (proposta aceita) mas só "conta como ativo de verdade" depois que as
-- DUAS partes clicam "De acordo" na página do contrato.
--
-- Sem novo valor de enum: `status` continua 'active' desde a criação, e
-- "plenamente ativo" = status='active' AND os dois accepted_at preenchidos.
-- Menos superfície pra quebrar do que uma máquina de estados nova.

alter table public.sponsorships
  add column if not exists athlete_accepted_at timestamptz,
  add column if not exists company_accepted_at timestamptz;

-- Patrocínios que já existem: considera os dois de acordo (retroativo, pra
-- não travar o que já estava rodando).
update public.sponsorships
set athlete_accepted_at = coalesce(athlete_accepted_at, created_at),
    company_accepted_at = coalesce(company_accepted_at, created_at)
where status <> 'cancelled';

-- ------------------------------------------------------------------
-- set_contract_acceptance(p_sponsorship, p_accept):
--   p_accept = true  -> carimba o aceite da parte que chamou
--   p_accept = false -> cancela o contrato (e volta a proposta pra withdrawn)
-- ------------------------------------------------------------------
create or replace function public.set_contract_acceptance(
  p_sponsorship uuid,
  p_accept boolean
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

  select * into v_sp from public.sponsorships where id = p_sponsorship;
  if v_sp is null then return 'not_found'; end if;
  if auth.uid() not in (v_sp.athlete_id, v_sp.company_id) then return 'not_party'; end if;
  if v_sp.status in ('ended', 'cancelled') then return 'closed'; end if;

  if not p_accept then
    update public.sponsorships set status = 'cancelled' where id = p_sponsorship;
    update public.proposals set status = 'withdrawn'
      where id = v_sp.proposal_id and status = 'accepted';
    return 'cancelled';
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

  return 'ok';
end $$;

grant execute on function public.set_contract_acceptance(uuid, boolean) to authenticated;
