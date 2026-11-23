create table email_unsubscribes (
  email text primary key,
  unsubscribed_at timestamptz not null default now(),
  source text not null default 'link'
);

alter table email_unsubscribes enable row level security;
