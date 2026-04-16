-- habit_survey_responses: stores per-habit swipe-up survey answers
create table if not exists public.habit_survey_responses (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  habit_id     uuid references public.habits(id) on delete cascade not null,
  date         text not null,
  went_right   text,
  went_wrong   text,
  completion_level text check (completion_level in ('full', 'partial', 'none')),
  created_at   timestamptz default now()
);

alter table public.habit_survey_responses enable row level security;

create policy "users_own_surveys"
  on public.habit_survey_responses
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
