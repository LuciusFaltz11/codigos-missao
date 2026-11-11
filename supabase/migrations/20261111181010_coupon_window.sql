-- Janela opcional de ativação e expiração dos cupons. Sem datas, o cupom vale até ser desativado.

alter table coupons
  add column starts_at timestamptz,
  add column ends_at timestamptz;

alter table coupons
  add constraint coupon_schedule_order check (
    starts_at is null
    or ends_at is null
    or starts_at < ends_at
  );
