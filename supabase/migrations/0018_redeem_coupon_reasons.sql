-- 0018 — redeem_coupon devolve o motivo exato da recusa (debug).
--   'no_user'    — p_user não existe em auth.users
--   'stale_user' — usuário criado há mais de 30 min
--   'no_coupon'  — código não encontrado / inativo
--   'expired'    — cupom vencido
--   'maxed'      — limite de usos atingido
--   'already'    — usuário já resgatou esse cupom
--   'applied:N'  — ok, N meses de PRO

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
  if v_created is null then
    return 'no_user';
  end if;
  if v_created < now() - interval '30 minutes' then
    return 'stale_user';
  end if;

  select * into v_coupon
  from public.coupons
  where code = upper(trim(p_code)) and active = true
  for update;

  if not found then
    return 'no_coupon';
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return 'expired';
  end if;
  if v_coupon.max_uses is not null and v_coupon.uses >= v_coupon.max_uses then
    return 'maxed';
  end if;

  begin
    insert into public.coupon_redemptions (coupon_id, profile_id)
    values (v_coupon.id, p_user);
  exception when unique_violation then
    return 'already';
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
