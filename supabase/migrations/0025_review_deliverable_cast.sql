-- 0025 — fix: review_deliverable() precisa de cast explícito de text pro
-- enum deliverable_status (parâmetro text não faz cast implícito, só literal).

create or replace function public.review_deliverable(p_deliverable uuid, p_decision text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_ok int;
begin
  if auth.uid() is null then return false; end if;
  if p_decision not in ('approved', 'rejected') then return false; end if;

  update public.deliverables d
  set status = p_decision::public.deliverable_status
  from public.sponsorships s
  where d.id = p_deliverable
    and s.id = d.sponsorship_id
    and s.company_id = auth.uid()
    and d.status = 'submitted';
  get diagnostics v_ok = row_count;
  return v_ok > 0;
end $$;
