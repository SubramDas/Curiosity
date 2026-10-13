-- Run in the Supabase DEVELOPMENT SQL editor after the migration.
-- Test-only users and records are rolled back. No emails are sent.
-- A failed assertion means the access rules need fixing before user testing.
begin;
insert into auth.users (id, email) values
  ('aa917be5-cd5c-473d-bac8-f6f44922b001', 'rls-check-a@example.invalid'),
  ('aa917be5-cd5c-473d-bac8-f6f44922b002', 'rls-check-b@example.invalid');
insert into public.saved_topics (user_id, topic_key, query, category) values
  ('aa917be5-cd5c-473d-bac8-f6f44922b001', 'computing:gpu', 'GPU', 'computing'),
  ('aa917be5-cd5c-473d-bac8-f6f44922b002', 'money:tax', 'Income tax', 'money');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aa917be5-cd5c-473d-bac8-f6f44922b001","role":"authenticated"}', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.saved_topics) <> 1 then
    raise exception 'FAIL: another user''s saved topics are visible';
  end if;
  update public.saved_topics set query = 'Attempted overwrite'
    where user_id = 'aa917be5-cd5c-473d-bac8-f6f44922b002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: another user''s topic was changed'; end if;
  delete from public.saved_topics where user_id = 'aa917be5-cd5c-473d-bac8-f6f44922b002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: another user''s topic was deleted'; end if;
  begin
    insert into public.saved_topics (user_id, topic_key, query, category)
      values ('aa917be5-cd5c-473d-bac8-f6f44922b002', 'computing:cpu', 'CPU', 'computing');
    raise exception 'FAIL: saving a topic for another user was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.saved_topics set user_id = 'aa917be5-cd5c-473d-bac8-f6f44922b002'
      where topic_key = 'computing:gpu';
    raise exception 'FAIL: changing the owner of a topic was allowed';
  exception when insufficient_privilege then null;
  end;
  insert into public.saved_topics (user_id, topic_key, query, category)
    values ('aa917be5-cd5c-473d-bac8-f6f44922b001', 'computing:gpu', 'GPUs', 'computing')
    on conflict (user_id, topic_key) do update set query = excluded.query;
  if (select count(*) from public.saved_topics) <> 1 then
    raise exception 'FAIL: repeating a topic created a duplicate';
  end if;
end $$;
reset role;
rollback;
select 'PASS: ownership, writes, owner changes, and duplicate-save rules checked; test data rolled back' as result;
