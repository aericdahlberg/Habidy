-- ============================================================
-- user_reflections
-- One row per reflection the user submits on the Explore page.
-- ============================================================

create table if not exists user_reflections (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);

alter table user_reflections enable row level security;

create policy "Users can read own reflections"
  on user_reflections for select
  using (auth.uid() = user_id);

create policy "Users can insert own reflections"
  on user_reflections for insert
  with check (auth.uid() = user_id);


-- ============================================================
-- user_profile_context
-- One row per user (unique on user_id). Stores the running
-- AI-generated summary that agents pull into their prompts.
-- ============================================================

create table if not exists user_profile_context (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references auth.users(id) on delete cascade,
  summary    text,
  updated_at timestamptz not null default now()
);

alter table user_profile_context enable row level security;

-- Users can read and manage their own row.
create policy "Users can manage own profile context"
  on user_profile_context for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The service role (used server-side by agents) bypasses RLS automatically.
-- No extra policy is needed — Supabase service_role always bypasses RLS.
