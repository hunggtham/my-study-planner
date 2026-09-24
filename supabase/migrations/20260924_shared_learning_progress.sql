create extension if not exists pgcrypto;

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  app_id text not null,
  content_namespace text not null,
  content_type text not null,
  content_id text not null,
  content_path text,
  status text,
  progress_pct numeric,
  current_section text,
  completed_sections jsonb not null default '[]'::jsonb,
  bookmarks jsonb not null default '[]'::jsonb,
  state jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_progress_identity_unique unique (user_id, app_id, content_namespace, content_type, content_id),
  constraint learning_progress_progress_pct_check check (progress_pct is null or (progress_pct >= 0 and progress_pct <= 100)),
  constraint learning_progress_schema_version_check check (schema_version >= 1)
);

create index if not exists learning_progress_user_app_idx
  on public.learning_progress (user_id, app_id);
create index if not exists learning_progress_user_namespace_idx
  on public.learning_progress (user_id, content_namespace);
create index if not exists learning_progress_user_updated_idx
  on public.learning_progress (user_id, updated_at desc);

alter table public.learning_progress enable row level security;
revoke all on table public.learning_progress from anon;
grant select, insert, update, delete on table public.learning_progress to authenticated;

drop policy if exists "learning_progress_select_own" on public.learning_progress;
create policy "learning_progress_select_own" on public.learning_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists "learning_progress_insert_own" on public.learning_progress;
create policy "learning_progress_insert_own" on public.learning_progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "learning_progress_update_own" on public.learning_progress;
create policy "learning_progress_update_own" on public.learning_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "learning_progress_delete_own" on public.learning_progress;
create policy "learning_progress_delete_own" on public.learning_progress for delete to authenticated using (user_id = auth.uid());

comment on table public.learning_progress is 'Shared learning state for Study Library, languages-docs, Study Planner integrations, and future learning applications.';
comment on column public.learning_progress.content_id is 'Stable application-level content identifier. Do not use a URL or file path as the identity.';
comment on column public.learning_progress.content_path is 'Current path/URL hint for display and migration only; never part of content identity.';
comment on column public.learning_progress.state is 'Application-specific extension object. Clients must preserve unknown keys during read/merge/write cycles.';
