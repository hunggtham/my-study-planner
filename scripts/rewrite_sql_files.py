import os

SCHEMA_CONTENT = """-- ==========================================
-- SUPABASE SCHEMA SETUP
-- Note: This file is for fresh setup. 
-- For existing projects, refer to migrations.
-- ==========================================

-- ------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------
create extension if not exists "uuid-ossp";

-- ------------------------------------------
-- 2. TABLES
-- ------------------------------------------

-- Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  start_time varchar(50),
  end_time varchar(50),
  category varchar(255) not null,
  title varchar(255) not null,
  description text,
  task_type varchar(50) default 'main' check (task_type in ('main', 'secondary', 'exercise', 'review', 'class', 'optional')),
  status varchar(50) default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped', 'moved')),
  priority varchar(50) default 'medium' check (priority in ('high', 'medium', 'low')),
  score_weight int default 1,
  moved_from_task_id uuid references tasks(id) on delete set null,
  moved_count int default 0,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Goals table
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  period_type varchar(50) not null check (period_type in ('week', 'month')),
  period_start_date varchar(50) not null,
  title text not null,
  category varchar(255),
  status varchar(50) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Public shares table
create table if not exists public_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  slug varchar(255) not null unique,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------
-- 3. RLS SETUP & PRIVATE USER POLICIES
-- ------------------------------------------
alter table tasks enable row level security;
alter table goals enable row level security;
alter table public_shares enable row level security;

-- Drop direct public read policies if they exist (hardening cleanup)
drop policy if exists "Public can view tasks if shared" on tasks;
drop policy if exists "Public can view goals if shared" on goals;

-- Private CRUD policies for tasks
create policy "Users can view their own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert their own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete their own tasks" on tasks for delete using (auth.uid() = user_id);

-- Private CRUD policies for goals
create policy "Users can view their own goals" on goals for select using (auth.uid() = user_id);
create policy "Users can insert their own goals" on goals for insert with check (auth.uid() = user_id);
create policy "Users can update their own goals" on goals for update using (auth.uid() = user_id);
create policy "Users can delete their own goals" on goals for delete using (auth.uid() = user_id);

-- Policies for public_shares
create policy "Anyone can view active public shares" on public_shares for select using (is_active = true);
create policy "Users can view their own share settings" on public_shares for select using (auth.uid() = user_id);
create policy "Users can insert their own share settings" on public_shares for insert with check (auth.uid() = user_id);
create policy "Users can update their own share settings" on public_shares for update using (auth.uid() = user_id);
create policy "Users can delete their own share settings" on public_shares for delete using (auth.uid() = user_id);

-- ------------------------------------------
-- 4. PUBLIC SHARE RPC
-- ------------------------------------------
-- Public Dashboard RPC Function for secure read-only access
drop function if exists get_public_dashboard_by_slug(text);

create function get_public_dashboard_by_slug(p_slug text)
returns table (
  date date,
  category varchar,
  title varchar,
  status varchar,
  task_type varchar,
  priority varchar
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  -- Find the user_id for the active slug
  select user_id into target_user_id 
  from public_shares 
  where slug = p_slug and is_active = true;

  if target_user_id is null then
    return;
  end if;

  -- Return only safe fields, strictly omitting internal IDs and notes
  return query
  select t.date, t.category, t.title, t.status, t.task_type, t.priority
  from tasks t
  where t.user_id = target_user_id
  order by t.date desc, t.start_time asc;
end;
$$;

-- ------------------------------------------
-- 5. INDEXES
-- ------------------------------------------
create index if not exists idx_tasks_user_id_date on tasks(user_id, date);
create index if not exists idx_tasks_user_id_status on tasks(user_id, status);
create index if not exists idx_tasks_user_id_category on tasks(user_id, category);
create index if not exists idx_goals_user_id_period on goals(user_id, period_type, period_start_date);
create index if not exists idx_public_shares_slug on public_shares(slug);
"""

MIGRATION_CONTENT = """-- ==========================================
-- MIGRATION: 001_harden_public_share
-- Goal: Remove unsafe direct public SELECT policies and update the secure RPC.
-- ==========================================

set search_path = public;

-- 1. Remove direct public SELECT policies from tasks and goals
do $$
begin
  if to_regclass('public.tasks') is not null then
    drop policy if exists "Public can view tasks if shared" on tasks;
  end if;

  if to_regclass('public.goals') is not null then
    drop policy if exists "Public can view goals if shared" on goals;
  end if;
end $$;

-- 2. Update the RPC function to stop returning internal IDs and private fields
drop function if exists get_public_dashboard_by_slug(text);

create function get_public_dashboard_by_slug(p_slug text)
returns table (
  date date,
  category varchar,
  title varchar,
  status varchar,
  task_type varchar,
  priority varchar
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  -- Find the user_id for the active slug
  select user_id into target_user_id 
  from public_shares 
  where slug = p_slug and is_active = true;

  if target_user_id is null then
    return;
  end if;

  -- Return only safe fields, completely omitting id, user_id, note, etc.
  return query
  select t.date, t.category, t.title, t.status, t.task_type, t.priority
  from tasks t
  where t.user_id = target_user_id
  order by t.date desc, t.start_time asc;
end;
$$;

-- 3. Ensure safety indexes exist
create index if not exists idx_tasks_user_id_date on tasks(user_id, date);
create index if not exists idx_tasks_user_id_status on tasks(user_id, status);
create index if not exists idx_tasks_user_id_category on tasks(user_id, category);
create index if not exists idx_goals_user_id_period on goals(user_id, period_type, period_start_date);
create index if not exists idx_public_shares_slug on public_shares(slug);
"""

def main():
    files_to_write = {
        "supabase/schema.sql": SCHEMA_CONTENT,
        "supabase/migrations/000_initial_schema.sql": SCHEMA_CONTENT,
        "supabase/migrations/001_harden_public_share.sql": MIGRATION_CONTENT
    }

    for file_path, content in files_to_write.items():
        with open(file_path, "w", newline="\n", encoding="utf-8") as f:
            f.write(content)

if __name__ == "__main__":
    main()
