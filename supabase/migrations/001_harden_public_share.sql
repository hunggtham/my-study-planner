-- ==========================================
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
-- Forced update
