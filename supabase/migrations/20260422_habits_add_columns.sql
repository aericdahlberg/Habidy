alter table public.habits
  add column if not exists action        text,
  add column if not exists craving       text,
  add column if not exists reward        text,
  add column if not exists is_active     boolean not null default true,
  add column if not exists time_of_day   text    not null default 'anytime';
