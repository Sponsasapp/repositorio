-- ============================================================
-- Espelha subscriptions.plan em profiles.plan (leitura pública),
-- para destacar PRO na busca sem expor a tabela subscriptions.
-- Fonte da verdade continua sendo subscriptions.
-- ============================================================

alter table profiles add column plan plan_tier not null default 'free';

create or replace function public.sync_profile_plan()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.profiles set plan = new.plan where id = new.profile_id;
  return null;
end $$;

create trigger sync_plan after insert or update of plan on public.subscriptions
for each row execute function public.sync_profile_plan();

update public.profiles p set plan = s.plan
from public.subscriptions s where s.profile_id = p.id;
