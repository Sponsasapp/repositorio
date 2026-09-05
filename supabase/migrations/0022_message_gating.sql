-- 0022 — trava quem pode conversar, pra não virar canal de acordo por fora
-- da Sponsas nem feature de graça:
--
-- - piloto ↔ piloto: só se os dois estiverem no plano PRO.
-- - piloto ↔ empresa: só se já existir uma proposta entre os dois.
-- - empresa ↔ empresa: sem caso de uso, bloqueado.
--
-- A checagem vale pra abrir uma conversa NOVA e pra cada mensagem nova
-- (via policy de insert) — se alguém deixa de ser elegível (ex.: piloto sai
-- do PRO), o histórico continua visível mas não dá pra mandar mensagem
-- nova. Conversas já existentes continuam abrindo pra leitura.

create or replace function public.can_message(p_me uuid, p_other uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me_type text;
  v_me_plan text;
  v_other_type text;
  v_other_plan text;
begin
  select type, plan into v_me_type, v_me_plan
  from public.profiles where id = p_me;
  select type, plan into v_other_type, v_other_plan
  from public.profiles where id = p_other;

  if v_me_type is null or v_other_type is null then
    return false;
  end if;

  if v_me_type = 'athlete' and v_other_type = 'athlete' then
    return v_me_plan = 'pro' and v_other_plan = 'pro';
  end if;

  if v_me_type <> v_other_type then
    return exists (
      select 1 from public.proposals
      where (from_profile_id = p_me and to_profile_id = p_other)
         or (from_profile_id = p_other and to_profile_id = p_me)
    );
  end if;

  -- empresa <-> empresa
  return false;
end $$;

grant execute on function public.can_message(uuid, uuid) to authenticated;

-- ------------------------------------------------------------------
-- get_or_create_conversation(): só checa can_message() na hora de CRIAR.
-- Reabrir uma conversa antiga pra leitura não passa pela guarda de novo.
-- ------------------------------------------------------------------
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null or p_other is null or p_other = v_me then
    return null;
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    return null;
  end if;

  v_a := least(v_me, p_other);
  v_b := greatest(v_me, p_other);

  select id into v_id from public.conversations
  where profile_a = v_a and profile_b = v_b;

  if v_id is null then
    if not public.can_message(v_me, p_other) then
      return null;
    end if;

    insert into public.conversations (profile_a, profile_b)
    values (v_a, v_b)
    returning id into v_id;
  end if;

  return v_id;
end $$;

-- ------------------------------------------------------------------
-- messages_insert_own: cada mensagem nova também passa por can_message().
-- ------------------------------------------------------------------
drop policy if exists messages_insert_own on public.messages;

create policy messages_insert_own on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.profile_a = auth.uid() or c.profile_b = auth.uid())
        and public.can_message(
          auth.uid(),
          case when c.profile_a = auth.uid() then c.profile_b else c.profile_a end
        )
    )
  );
