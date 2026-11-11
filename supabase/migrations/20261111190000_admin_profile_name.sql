alter table admin_profiles
  add column if not exists name text;

alter table admin_profiles
  drop constraint if exists admin_profiles_name_len;

alter table admin_profiles
  add constraint admin_profiles_name_len check (name is null or char_length(btrim(name)) between 2 and 80);
