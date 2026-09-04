-- 0021 — chat interno: piloto ↔ empresa, piloto ↔ piloto, empresa ↔ empresa.
--
-- Duas tabelas: `conversations` (par de participantes, sempre profile_a <
-- profile_b pra não duplicar) e `messages`. Conversa só é criada via
-- get_or_create_conversation() (SECURITY DEFINER) — sem policy de insert em
-- `conversations`, então ninguém insere uma linha "torta" direto pelo
-- client.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid not null references public.profiles(id) on delete cascade,
  profile_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint conversations_ordered check (profile_a < profile_b),
  constraint conversations_unique unique (profile_a, profile_b)
);

create index conversations_profile_a_idx
  on public.conversations (profile_a, last_message_at desc);
create index conversations_profile_b_idx
  on public.conversations (profile_b, last_message_at desc);

alter table public.conversations enable row level security;

create policy conversations_select_own on public.conversations
  for select using (auth.uid() = profile_a or auth.uid() = profile_b);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy messages_select_own on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.profile_a = auth.uid() or c.profile_b = auth.uid())
    )
  );

create policy messages_insert_own on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.profile_a = auth.uid() or c.profile_b = auth.uid())
    )
  );

-- Mantém `last_message_at` em dia sem precisar de policy de update em
-- conversations (a função roda como dona da tabela).
create or replace function public.trg_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end $$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.trg_touch_conversation();

-- ------------------------------------------------------------------
-- get_or_create_conversation(): acha a conversa entre eu e p_other, ou cria.
-- Qualquer perfil pode falar com qualquer outro — é um chat interno, não
-- tem guarda de relação (diferente de notify()).
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
    insert into public.conversations (profile_a, profile_b)
    values (v_a, v_b)
    returning id into v_id;
  end if;

  return v_id;
end $$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ------------------------------------------------------------------
-- mark_messages_read(): marca como lidas as mensagens da outra pessoa numa
-- conversa. Evita expor uma policy de update em `messages` (leitura marcada
-- via função, não dá pra adulterar corpo/remetente).
-- ------------------------------------------------------------------
create or replace function public.mark_messages_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation
    and sender_id <> auth.uid()
    and read_at is null
    and exists (
      select 1 from public.conversations c
      where c.id = p_conversation
        and (c.profile_a = auth.uid() or c.profile_b = auth.uid())
    );
end $$;

grant execute on function public.mark_messages_read(uuid) to authenticated;

-- ------------------------------------------------------------------
-- notify(): mesma função da 0020, só adicionando conversa como mais um
-- tipo de relação válida pra notificar (mensagem prova a relação por si só).
-- ------------------------------------------------------------------
create or replace function public.notify(
  p_target uuid,
  p_type text,
  p_title text,
  p_body text,
  p_cta_label text default null,
  p_cta_path text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_related boolean;
begin
  if auth.uid() is null or p_target is null then
    return null;
  end if;

  select
    exists(
      select 1 from public.proposals
      where (from_profile_id = auth.uid() and to_profile_id = p_target)
         or (to_profile_id = auth.uid() and from_profile_id = p_target)
    )
    or exists(
      select 1 from public.applications a
      join public.opportunities o on o.id = a.opportunity_id
      where (a.athlete_id = auth.uid() and o.company_id = p_target)
         or (o.company_id = auth.uid() and a.athlete_id = p_target)
    )
    or exists(
      select 1 from public.sponsorships
      where (athlete_id = auth.uid() and company_id = p_target)
         or (company_id = auth.uid() and athlete_id = p_target)
    )
    or exists(
      select 1 from public.conversations
      where (profile_a = auth.uid() and profile_b = p_target)
         or (profile_a = p_target and profile_b = auth.uid())
    )
  into v_related;

  if not v_related then
    return null;
  end if;

  insert into public.notifications (profile_id, type, title, body, cta_label, cta_path)
  values (p_target, p_type, p_title, p_body, p_cta_label, p_cta_path);

  select email into v_email from auth.users where id = p_target;
  return v_email;
end $$;
