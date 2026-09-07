-- Persistent progress for the public English study page.
-- Curriculum/task definitions stay in src/data/english-plan.json.
-- Mutable study state lives here.

create table if not exists public.english_task_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  completed boolean not null default false,
  note text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create index if not exists english_task_progress_user_id_idx
  on public.english_task_progress(user_id);

alter table public.english_task_progress enable row level security;

drop policy if exists "public can read study progress" on public.english_task_progress;
create policy "public can read study progress"
  on public.english_task_progress
  for select
  using (true);

drop policy if exists "users can insert own study progress" on public.english_task_progress;
create policy "users can insert own study progress"
  on public.english_task_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update own study progress" on public.english_task_progress;
create policy "users can update own study progress"
  on public.english_task_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete own study progress" on public.english_task_progress;
create policy "users can delete own study progress"
  on public.english_task_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.english_task_progress is
  'Mutable progress for tasks defined in src/data/english-plan.json. Public can read; authenticated users can only mutate their own rows.';
