-- onboarding_drafts: persists partial onboarding data so users can resume mid-flow.
-- Deleted by the loading page after the public.users row is created.
create table if not exists public.onboarding_drafts (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  step               text not null default 'profile',
  profile            jsonb,
  identity           text,
  questionnaire      jsonb,
  questionnaire_page integer default 0,
  updated_at         timestamptz default now(),
  constraint onboarding_drafts_user_id_key unique (user_id)
);

alter table public.onboarding_drafts enable row level security;

create policy "Users can manage own drafts"
  on public.onboarding_drafts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
