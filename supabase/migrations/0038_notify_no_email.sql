-- ============================================================
-- 0038 — `notify` não devolve mais o e-mail do destinatário
--
-- Problema (simulação de uso 09/11/2026): a RPC `notify` (liberada pra
-- `authenticated`) devolvia o e-mail do alvo. Bastava existir uma proposta
-- entre os dois — que o próprio usuário cria — pra colher e-mails de
-- qualquer piloto/empresa chamando a RPC direto.
--
-- Fix: mesma função e mesma guarda de relação, mas retorna 'ok' (gravou) ou
-- null (sem relação). O e-mail passa a ser resolvido NO SERVIDOR pelo app
-- (service role, `lib/email.ts`), nunca chega ao navegador.
-- Também corta título/corpo em tamanhos sensatos (anti-spam no sininho).
-- ============================================================

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
  v_related boolean;
begin
  if auth.uid() is null or p_target is null or p_target = auth.uid() then
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
  values (
    p_target,
    left(p_type, 40),
    left(p_title, 140),
    left(p_body, 600),
    left(p_cta_label, 40),
    left(p_cta_path, 200)
  );

  return 'ok';
end $$;
