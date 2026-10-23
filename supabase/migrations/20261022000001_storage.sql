-- Buckets privados. Execute no projeto Supabase, onde o schema storage existe.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false), ('card-art', 'card-art', false)
on conflict (id) do nothing;
