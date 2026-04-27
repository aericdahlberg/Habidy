-- Social features migration
-- Run this in the Supabase SQL editor

-- Add social columns to users table
alter table users
  add column if not exists display_name text,
  add column if not exists avatar_url    text,
  add column if not exists email         text;

-- Friend connections
create table if not exists friendships (
  id         uuid    default gen_random_uuid() primary key,
  user_id    uuid    references users(id) on delete cascade not null,
  friend_id  uuid    references users(id) on delete cascade not null,
  status     text    check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- RLS
alter table friendships enable row level security;

drop policy if exists "Users can manage own friendships" on friendships;
create policy "Users can manage own friendships" on friendships
  for all using (auth.uid() = user_id or auth.uid() = friend_id);

-- Indexes for fast lookups
create index if not exists friendships_user_id_idx    on friendships(user_id);
create index if not exists friendships_friend_id_idx  on friendships(friend_id);
create index if not exists users_email_idx            on users(email);
