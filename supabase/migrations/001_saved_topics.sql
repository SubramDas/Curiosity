-- Run once in the Supabase DEVELOPMENT project's SQL editor.
-- No video metadata or transcripts are stored in this first experiment.
create table if not exists public.saved_topics (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_key text not null check (length(topic_key) between 1 and 500),
  query text not null check (length(query) between 1 and 500),
  category text not null check (category in ('computing','money','science','health','society','language','arts','life','general')),
  related_categories text[] not null default '{}' check (
    cardinality(related_categories) <= 3 and
    related_categories <@ array['computing','money','science','health','society','language','arts','life','general']::text[] and
    not (category = any(related_categories))
  ),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_key)
);
alter table public.saved_topics enable row level security;
revoke all on public.saved_topics from anon;
grant select, insert, update, delete on public.saved_topics to authenticated;
create policy "Users read their own topics" on public.saved_topics for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert their own topics" on public.saved_topics for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own topics" on public.saved_topics for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their own topics" on public.saved_topics for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists saved_topics_recent on public.saved_topics (user_id, updated_at desc);
