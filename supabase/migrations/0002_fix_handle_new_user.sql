-- ============================================================
-- FIX: trigger de signup falhava com "Database error saving new user".
-- Causa: função security definer sem search_path fixo — o cast
-- ::profile_type e as tabelas public.* não resolviam de forma confiável.
-- Solução (padrão recomendado pelo Supabase): search_path = '' + tudo
-- totalmente qualificado com o schema public.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, type, name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'type')::public.profile_type, 'athlete'),
    coalesce(new.raw_user_meta_data->>'name', '')
  );

  insert into public.subscriptions (profile_id, plan)
  values (new.id, 'free');

  return new;
end;
$$;

-- Recria o trigger (idempotente).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
