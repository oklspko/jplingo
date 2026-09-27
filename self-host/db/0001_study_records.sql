-- 学习记录表（镜像 supabase/migrations/0001_study_records.sql，另补显式授权）
-- 依赖 auth.users / auth.uid()，由 GoTrue 容器首次启动时自动创建，故本文件须在 GoTrue 就绪后执行。

create table if not exists public.study_records (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_records enable row level security;

drop policy if exists "select own record" on public.study_records;
drop policy if exists "insert own record" on public.study_records;
drop policy if exists "update own record" on public.study_records;

create policy "select own record" on public.study_records for select using (auth.uid() = user_id);
create policy "insert own record" on public.study_records for insert with check (auth.uid() = user_id);
create policy "update own record" on public.study_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 自托管需显式授权（hosted Supabase 由平台预授权）
grant all on table public.study_records to anon, authenticated, service_role;
