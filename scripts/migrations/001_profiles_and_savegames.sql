-- ============================================
-- Riftbound Shop — Migration 001
-- Profiles + Savegames tables
-- ============================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).
-- Before running, configure in Supabase Dashboard > Authentication > URL Configuration:
--   Site URL: http://localhost:3000
--   Redirect URLs: http://localhost:3000/auth/confirm

-- ============================================
-- 1. Profiles table
-- ============================================
-- Auto-created on signup via trigger. Stores display name and metadata.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text default '',
  created_at timestamptz default now() not null,
  last_login_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================
-- 2. Savegames table
-- ============================================
-- One savegame per user. Stores the full game state as JSONB.
create table if not exists public.savegames (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  save_version integer default 1 not null,
  game_data jsonb default '{}'::jsonb not null,
  updated_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.savegames enable row level security;

-- Users can only access their own savegame
create policy "Users can view own savegame"
  on public.savegames for select
  using (auth.uid() = user_id);

create policy "Users can insert own savegame"
  on public.savegames for insert
  with check (auth.uid() = user_id);

create policy "Users can update own savegame"
  on public.savegames for update
  using (auth.uid() = user_id);

create policy "Users can delete own savegame"
  on public.savegames for delete
  using (auth.uid() = user_id);

-- ============================================
-- 3. Auto-create profile on signup
-- ============================================
-- This trigger fires after a new user is created in auth.users
-- and auto-inserts a matching row in public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, created_at, last_login_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    now(),
    now()
  );
  return new;
end;
$$;

-- Drop existing trigger if present (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 4. Update last_login_at on sign-in
-- ============================================
-- Optional: update last_login_at whenever the user signs in.
-- This runs on auth.sessions insert (new session = new login).
create or replace function public.handle_user_login()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set last_login_at = now()
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_auth_session_created on auth.sessions;

create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute function public.handle_user_login();

-- ============================================
-- 5. Indexes
-- ============================================
create index if not exists idx_savegames_user_id on public.savegames (user_id);
create index if not exists idx_savegames_updated_at on public.savegames (updated_at desc);
