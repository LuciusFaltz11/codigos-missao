-- Cupons de desconto. O código aplicado fica no pedido para o dashboard de vendas.

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('percent', 'fixed')),
  percent integer,
  amount_cents integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupon_discount_shape check (
    (kind = 'percent' and percent is not null and percent between 1 and 100 and amount_cents is null)
    or (kind = 'fixed' and amount_cents is not null and amount_cents >= 1 and percent is null)
  )
);

create trigger coupons_updated before update on coupons
  for each row execute function set_updated_at();

alter table orders
  add column coupon_id uuid references coupons (id) on delete set null,
  add column coupon_code text,
  add column discount_cents integer not null default 0;

alter table coupons enable row level security;
