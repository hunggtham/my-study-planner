-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tasks table
create table tasks (
  id uuid primary key default uuid_generate_v4(),
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
create table goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  period_type varchar(50) not null check (period_type in ('week', 'month')),
  period_start_date varchar(50) not null,
  title text not null,
  category varchar(255),
  is_done boolean default false,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Public Shares table (Option A)
create table public_shares (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  slug varchar(255) not null unique,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table tasks enable row level security;
alter table goals enable row level security;
alter table public_shares enable row level security;

-- Policies for tasks
create policy "Users can view their own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can create their own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete their own tasks" on tasks for delete using (auth.uid() = user_id);

-- Policy to allow public read of tasks via active share link
create policy "Public can view tasks if shared" on tasks for select using (
  exists (
    select 1 from public_shares 
    where public_shares.user_id = tasks.user_id 
    and public_shares.is_active = true
  )
);

-- Policies for goals
create policy "Users can view their own goals" on goals for select using (auth.uid() = user_id);
create policy "Users can create their own goals" on goals for insert with check (auth.uid() = user_id);
create policy "Users can update their own goals" on goals for update using (auth.uid() = user_id);
create policy "Users can delete their own goals" on goals for delete using (auth.uid() = user_id);

-- Policy to allow public read of goals via active share link
create policy "Public can view goals if shared" on goals for select using (
  exists (
    select 1 from public_shares 
    where public_shares.user_id = goals.user_id 
    and public_shares.is_active = true
  )
);

-- Public Dashboard RPC Function for secure read-only access
create or replace function get_public_dashboard_by_slug(p_slug text)
returns table (
  id uuid,
  date date,
  category varchar,
  title varchar,
  status varchar,
  task_type varchar,
  priority varchar
)
language plpgsql
security definer
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

  -- Return only safe fields
  return query
  select t.id, t.date, t.category, t.title, t.status, t.task_type, t.priority
  from tasks t
  where t.user_id = target_user_id
  order by t.date desc, t.start_time asc;
end;
$$;

-- Policies for public_shares
create policy "Anyone can view active public shares" on public_shares for select using (is_active = true);
create policy "Users can view their own share settings" on public_shares for select using (auth.uid() = user_id);
create policy "Users can create their own share settings" on public_shares for insert with check (auth.uid() = user_id);
create policy "Users can update their own share settings" on public_shares for update using (auth.uid() = user_id);
create policy "Users can delete their own share settings" on public_shares for delete using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_tasks_user_id_date on tasks(user_id, date);
create index if not exists idx_tasks_user_id_status on tasks(user_id, status);
create index if not exists idx_tasks_user_id_category on tasks(user_id, category);
create index if not exists idx_goals_user_id_period on goals(user_id, period_type, period_start_date);
create index if not exists idx_public_shares_slug on public_shares(slug);
