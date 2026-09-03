-- 0017 — redeem_coupon(): aplica um cupom de PRO sem depender da service role.
--
-- Chamada por RPC no signup (cliente anon, ainda sem sessão). SECURITY DEFINER
-- roda como dono do schema e ignora RLS. Guarda contra abuso: só resgata para
-- usuário criado nos últimos 30 minutos e que ainda não resgatou nada.

create or replace function public.redeem_coupon(p_user uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_created timestamptz;
  v_until timestamptz;
begin
  select created_at into v_created from auth.users where id = p_user;
  if v_created is null or v_created < now() - interval '30 minutes' then
    return 'invalid';
  end if;

  select * into v_coupon
  from public.coupons
  where code = upper(trim(p_code)) and active = true
  for update;

  if not found
     or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
     or (v_coupon.max_uses is not null and v_coupon.uses >= v_coupon.max_uses) then
    return 'invalid';
  end if;

  begin
    insert into public.coupon_redemptions (coupon_id, profile_id)
    values (v_coupon.id, p_user);
  exception when unique_violation then
    return 'invalid';
  end;

  v_until := now() + (v_coupon.plan_months || ' months')::interval;

  insert into public.subscriptions (profile_id, plan, status, renewed_until)
  values (p_user, 'pro', 'active', v_until)
  on conflict (profile_id) do update
    set plan = 'pro', status = 'active', renewed_until = v_until;

  update public.coupons set uses = uses + 1 where id = v_coupon.id;

  return 'applied:' || v_coupon.plan_months;
end $$;

grant execute on function public.redeem_coupon(uuid, text) to anon, authenticated;
