-- ASCEND — database schema
--
-- Run this once in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Everything here is protected by row-level security. The anon key shipped in
-- the browser cannot read or write another user's data even if someone edits
-- the client code: the policies below are enforced by Postgres, not by the app.

-- ---------------------------------------------------------------- profiles --

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  cohort_code  text,                       -- optional: joins a student to a class
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile: read" on public.profiles;
create policy "own profile: read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "own profile: insert" on public.profiles;
create policy "own profile: insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------------- saves --
-- One row per user holding the whole game save as JSON.
--
-- A single JSONB blob rather than normalised columns is deliberate: the save
-- shape changes every time a game system is added, and a schema migration per
-- feature would be a tax on iteration. `save_version` lets the client migrate
-- old blobs forward.

create table if not exists public.saves (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  save_version int  not null default 1,
  data         jsonb not null,
  -- Monotonic counters kept as real columns so a cohort dashboard can query
  -- them without unpacking every blob.
  total_xp     int  not null default 0,
  level        int  not null default 1,
  streak       int  not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "own save: read" on public.saves;
create policy "own save: read"
  on public.saves for select
  using (auth.uid() = user_id);

drop policy if exists "own save: insert" on public.saves;
create policy "own save: insert"
  on public.saves for insert
  with check (auth.uid() = user_id);

drop policy if exists "own save: update" on public.saves;
create policy "own save: update"
  on public.saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------- auto-provision --
-- Create an empty profile row the moment a user signs up, so the client never
-- has to handle a missing profile.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ updated_at ---

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saves_touch on public.saves;
create trigger saves_touch before update on public.saves
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
