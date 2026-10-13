-- Run in the Supabase DEVELOPMENT SQL editor after the migration.
-- Test-only users and records are rolled back. No emails are sent.
-- A failed assertion means the access rules need fixing before user testing.
begin;
insert into auth.users (id, email) values
  ('aa917be5-cd5c-473d-bac8-f6f44922b001', 'rls-check-a@example.invalid'),
  ('aa917be5-cd5c-473d-bac8-f6f44922b002', 'rls-check-b@example.invalid');
insert into public.video_progress (user_id, video_id, topic_key, position_seconds, duration_seconds) values
  ('aa917be5-cd5c-473d-bac8-f6f44922b001', 'Kgcfj_KV-mo', 'computing:gpu', 20, 234),
  ('aa917be5-cd5c-473d-bac8-f6f44922b002', 'abcdefghijk', 'money:tax', 30, 234);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aa917be5-cd5c-473d-bac8-f6f44922b001","role":"authenticated"}', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.video_progress) <> 1 then
    raise exception 'FAIL: another user''s video progress are visible';
  end if;
  update public.video_progress set position_seconds = 99
    where user_id = 'aa917be5-cd5c-473d-bac8-f6f44922b002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: another user''s progress was changed'; end if;
  delete from public.video_progress where user_id = 'aa917be5-cd5c-473d-bac8-f6f44922b002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: another user''s progress was deleted'; end if;
  begin
    insert into public.video_progress (user_id, video_id, topic_key, position_seconds, duration_seconds)
      values ('aa917be5-cd5c-473d-bac8-f6f44922b002', 'zyxwvutsrqp', 'computing:cpu', 12, 234);
    raise exception 'FAIL: saving video progress for another user was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.video_progress set user_id = 'aa917be5-cd5c-473d-bac8-f6f44922b002'
      where topic_key = 'computing:gpu';
    raise exception 'FAIL: changing the owner of video progress was allowed';
  exception when insufficient_privilege then null;
  end;
  insert into public.video_progress (user_id, video_id, topic_key, position_seconds, duration_seconds)
    values ('aa917be5-cd5c-473d-bac8-f6f44922b001', 'Kgcfj_KV-mo', 'computing:gpu', 72, 234)
    on conflict (user_id, video_id) do update set position_seconds = excluded.position_seconds;
  if (select count(*) from public.video_progress) <> 1 then
    raise exception 'FAIL: repeating video progress created a duplicate';
  end if;
end $$;
reset role;
rollback;
select 'PASS: ownership, writes, owner changes, and duplicate-save rules for video progress checked; test data rolled back' as result;
