-- 学习记录表：每个用户一行，整条 StudyRecord 存 JSON。
-- 在 Supabase 的 SQL Editor 里执行本文件。

create table if not exists public.study_records (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_records enable row level security;

create policy "select own record"
  on public.study_records for select
  using (auth.uid() = user_id);

create policy "insert own record"
  on public.study_records for insert
  with check (auth.uid() = user_id);

create policy "update own record"
  on public.study_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
