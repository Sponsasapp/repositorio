-- 0034 — Aviso diário de entregas do dia (base do Calendário Sponsas).
--
-- O calendário em si é só uma view nova sobre `deliverables` (já existe,
-- já tem RLS) — não precisa de tabela nova. Isto aqui é só o aviso diário:
-- "hoje você deve fazer 1 story pra empresa X, 1 reels pra empresa Y".

create or replace function public.notify_deliverables_due_today()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    with linhas as (
      select s.athlete_id,
             c.name as empresa,
             replace(d.type, '_', ' ') as tipo,
             count(*) as qt
      from public.deliverables d
      join public.sponsorships s on s.id = d.sponsorship_id
      join public.profiles c on c.id = s.company_id
      where d.due_date = current_date
        and d.status = 'pending'
      group by s.athlete_id, c.name, d.type
    )
    select athlete_id,
           string_agg(
             qt || 'x ' || tipo || ' pra ' || coalesce(empresa, 'um patrocinador'),
             ', ' order by tipo
           ) as resumo
    from linhas
    group by athlete_id
  loop
    perform public.notify(
      r.athlete_id,
      'deliverables_due',
      'Entregas de hoje',
      'Hoje: ' || r.resumo || '.',
      'Ver calendário',
      '/calendario'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
