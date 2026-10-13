-- Run once after 001_saved_topics.sql in the development SQL Editor.
begin;
create table public.video_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  topic_key text not null check (length(topic_key) between 1 and 500),
  position_seconds double precision not null check (position_seconds >= 0 and position_seconds <= duration_seconds),
  duration_seconds double precision not null check (duration_seconds > 0 and duration_seconds <= 604800),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
alter table public.video_progress enable row level security;
revoke all on public.video_progress from anon;
grant select, insert, update, delete on public.video_progress to authenticated;
create policy "Read own video progress" on public.video_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own video progress" on public.video_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own video progress" on public.video_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own video progress" on public.video_progress for delete to authenticated using ((select auth.uid()) = user_id);
create index video_progress_user_updated on public.video_progress (user_id, updated_at desc);
commit;
