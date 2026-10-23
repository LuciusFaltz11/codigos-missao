-- Códigos da Missão — esquema inicial.
-- O service role do Supabase ignora RLS. O anon e o authenticated não recebem políticas de escrita.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null check (role in ('super_admin', 'admin', 'editor', 'support')),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  kind text not null check (kind in ('privacy', 'terms', 'marketing')),
  accepted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create table birth_records (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  birth_date date not null,
  birth_time time not null,
  city_label text not null,
  country text,
  latitude numeric not null,
  longitude numeric not null,
  iana_timezone text not null,
  utc_instant timestamptz not null,
  offset_minutes integer not null,
  time_precision text not null default 'minute',
  created_at timestamptz not null default now()
);

create table access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  token_sealed text not null,
  lead_id uuid not null references leads (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table methodology_versions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  status text not null check (status in ('draft', 'provisional', 'published')),
  zodiac text not null default 'tropical',
  house_system text not null default 'placidus',
  node_mode text not null default 'true',
  fortuna_rule text not null default 'pending_approval',
  activate_ascendant boolean not null default false,
  free_preview_point text not null default 'sun',
  activation_points text[] not null,
  rules_validated boolean not null default false,
  rules_note text not null,
  snapshot jsonb,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz not null default now()
);

create unique index methodology_one_draft on methodology_versions (status) where status = 'draft';

create table mission_codes (
  id text primary key,
  number integer not null unique,
  sign_slug text not null,
  sign_name text not null,
  decan integer not null check (decan between 1 and 3),
  start_degree numeric not null,
  end_degree numeric not null,
  archetype text not null,
  keyword text not null,
  decan_ruler text not null,
  light text not null,
  shadow text not null,
  essential_oil text,
  tarot_mirror_card text,
  image_url text,
  source_page integer,
  updated_at timestamptz not null default now(),
  unique (sign_slug, decan)
);

create table house_meanings (
  house_number integer primary key check (house_number between 1 and 12),
  title text not null,
  summary text not null,
  keywords text[] not null default '{}',
  source text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table point_meanings (
  id text primary key,
  name text not null,
  summary text not null,
  keywords text[] not null default '{}',
  source text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table sign_meanings (
  id text primary key,
  name text not null,
  element text not null,
  summary text,
  status text not null default 'PENDENTE_DE_GLOSSARIO_AUTORAL',
  updated_at timestamptz not null default now()
);

create table interpretation_prompts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('individual', 'synthesis')),
  version text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  unique (kind, version)
);

create table natal_charts (
  id uuid primary key default gen_random_uuid(),
  birth_record_id uuid not null references birth_records (id) on delete cascade,
  access_token_id uuid not null unique references access_tokens (id),
  methodology_snapshot jsonb not null,
  status text not null check (status in ('pending', 'calculating', 'complete', 'failed', 'not_configured', 'license_unconfirmed')),
  engine text not null,
  engine_status text not null,
  positions jsonb,
  cusps jsonb,
  ascendant jsonb,
  midheaven jsonb,
  omissions jsonb not null default '[]',
  calculation_version text,
  error_code text,
  created_at timestamptz not null default now()
);

create table mission_activations (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references natal_charts (id) on delete cascade,
  point_id text not null,
  sign_slug text not null,
  degree_within_sign numeric not null,
  house_number integer not null check (house_number between 1 and 12),
  mission_code_id text not null,
  methodology_version text not null,
  longitude numeric not null,
  retrograde boolean,
  code_snapshot jsonb not null,
  trail jsonb not null default '[]',
  is_free_preview boolean not null default false,
  unique (chart_id, point_id)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  price_cents integer,
  currency text not null default 'BRL',
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id),
  chart_id uuid not null references natal_charts (id),
  product_id uuid not null references products (id),
  amount_cents integer not null,
  currency text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  external_reference text not null unique,
  preference_id text,
  init_point text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  provider text not null,
  provider_payment_id text not null,
  status text not null,
  amount_cents integer not null,
  currency text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  delivery_key text not null unique,
  request_id text not null,
  data_id text not null,
  signature_valid boolean not null,
  process_note text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders (id),
  chart_id uuid not null references natal_charts (id),
  lead_id uuid not null references leads (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  refund_pending_policy boolean not null default false
);

create table readings (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references natal_charts (id),
  entitlement_id uuid not null references entitlements (id),
  status text not null check (status in ('queued', 'processing', 'completed', 'retryable_failed', 'permanent_failed', 'failed_validation', 'editorial_blocked')),
  prompt_version text not null,
  model text,
  context_snapshot jsonb,
  result jsonb,
  token_usage jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entitlement_id, prompt_version)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references natal_charts (id),
  reading_id uuid not null unique references readings (id),
  entitlement_id uuid references entitlements (id),
  status text not null check (status in ('processing', 'ready', 'failed')),
  storage_path text,
  snapshot jsonb,
  created_at timestamptz not null default now()
);

create table email_deliveries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id),
  status text not null,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('interpretation', 'pdf', 'email')),
  idempotency_key text not null unique,
  status text not null check (status in ('queued', 'processing', 'completed', 'retryable_failed', 'permanent_failed')),
  payload jsonb not null,
  attempts integer not null default 0,
  next_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chart_id uuid,
  order_id uuid,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table privacy_policy_versions (
  version text primary key,
  title text not null,
  body text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index analytics_events_name_created_idx on analytics_events (name, created_at);
create index orders_chart_idx on orders (chart_id);
create index jobs_status_idx on jobs (status, next_run_at);

create or replace function reject_immutable_methodology()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('published', 'provisional') then
    raise exception 'methodology version % is immutable', old.id;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger methodology_immutable
  before update or delete on methodology_versions
  for each row execute function reject_immutable_methodology();

create or replace function reject_ready_report_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'ready' and (
    new.snapshot is distinct from old.snapshot
    or new.storage_path is distinct from old.storage_path
    or new.status is distinct from old.status
  ) then
    raise exception 'ready report % is immutable', old.id;
  end if;
  return new;
end;
$$;

create trigger reports_immutable
  before update on reports
  for each row execute function reject_ready_report_mutation();

create trigger mission_codes_updated before update on mission_codes
  for each row execute function set_updated_at();
create trigger orders_updated before update on orders
  for each row execute function set_updated_at();
create trigger jobs_updated before update on jobs
  for each row execute function set_updated_at();

alter table admin_profiles enable row level security;
alter table leads enable row level security;
alter table consent_records enable row level security;
alter table birth_records enable row level security;
alter table access_tokens enable row level security;
alter table methodology_versions enable row level security;
alter table mission_codes enable row level security;
alter table house_meanings enable row level security;
alter table point_meanings enable row level security;
alter table sign_meanings enable row level security;
alter table interpretation_prompts enable row level security;
alter table natal_charts enable row level security;
alter table mission_activations enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table payment_webhook_events enable row level security;
alter table entitlements enable row level security;
alter table readings enable row level security;
alter table reports enable row level security;
alter table email_deliveries enable row level security;
alter table jobs enable row level security;
alter table audit_logs enable row level security;
alter table analytics_events enable row level security;
alter table privacy_policy_versions enable row level security;

create policy admin_reads_own_profile on admin_profiles
  for select to authenticated
  using (id = auth.uid());

-- Nenhuma política de escrita para authenticated/anon.
-- Conteúdo de cliente, mapas, pedidos e leituras só passam pelo servidor com service role,
-- depois de checagem de token ou de papel administrativo.
