-- Prepared migration. Apply as the database owner after 001 and 002.
-- The learner runtime continues using a publishable key and the learner JWT.
begin;
create table public.graph_topics (
 id uuid primary key, slug text unique not null check(length(slug) between 1 and 100),
 label text not null check(length(label) between 1 and 120), description text not null check(length(description)<=1000),
 aliases jsonb not null default '[]' check(jsonb_typeof(aliases)='array' and jsonb_array_length(aliases)<=15),
 primary_universe text not null check(primary_universe in ('science','commerce','arts')),
 related_universes text[] not null default '{}' check(related_universes <@ array['science','commerce','arts']::text[] and cardinality(related_universes)<=2 and not(primary_universe=any(related_universes))),
 wikidata_id text unique check(wikidata_id ~ '^Q[1-9][0-9]*$'),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 map_x double precision not null check(abs(map_x)<=10000), map_y double precision not null check(abs(map_y)<=10000),
 sources jsonb not null default '[]' check(jsonb_typeof(sources)='array'), updated_at timestamptz not null default now()
);
create table public.graph_edges (
 id uuid primary key, from_topic_id uuid not null references public.graph_topics(id), to_topic_id uuid not null references public.graph_topics(id),
 relation_type text not null check(relation_type in ('related_to','helps_explain','part_of','learn_first')),
 explanation text not null check(length(explanation) between 1 and 500), sources jsonb not null default '[]',
 status text not null default 'draft' check(status in ('draft','published','archived')),
 check(from_topic_id<>to_topic_id), check(relation_type<>'related_to' or from_topic_id<to_topic_id), unique(from_topic_id,to_topic_id,relation_type)
);
create table public.graph_topic_videos (
 topic_id uuid not null references public.graph_topics(id), video_id text not null check(video_id ~ '^[A-Za-z0-9_-]{11}$'),
 role text not null default 'primary' check(role in ('primary','supporting')), status text not null default 'draft' check(status in ('draft','published','archived')),
 provenance text not null check(length(provenance) between 1 and 500), checked_at timestamptz not null,
 primary key(topic_id,video_id)
);
create unique index graph_video_primary_home on public.graph_topic_videos(video_id) where role='primary' and status='published';
create table public.graph_events (
 id uuid primary key, title text not null check(length(title) between 1 and 180), summary text not null check(length(summary)<=3000),
 status text not null default 'draft' check(status in ('draft','published','archived')), sources jsonb not null check(jsonb_typeof(sources)='array' and jsonb_array_length(sources) between 1 and 8),
 published_at timestamptz not null, updated_at timestamptz not null, archived_at timestamptz
);
create table public.graph_event_topics (event_id uuid references public.graph_events(id),topic_id uuid references public.graph_topics(id),explanation text not null check(length(explanation) between 1 and 500), primary key(event_id,topic_id));
create table public.graph_catalog_state (id integer primary key check(id=1),revision integer not null default 0,updated_at timestamptz not null default now());
insert into public.graph_catalog_state(id) values(1);
create table public.graph_publications (revision integer primary key,request_id uuid not null unique,checksum text not null,summary text not null,published_by text not null,published_at timestamptz not null default now());
create table public.learner_topic_progress (
 user_id uuid references auth.users(id) on delete cascade, topic_id uuid references public.graph_topics(id),
 discovered_at timestamptz not null default now(), active_viewing_ms integer not null default 0 check(active_viewing_ms between 0 and 30000),
 first_explored_at timestamptz, primary key(user_id,topic_id),check(first_explored_at is null or active_viewing_ms=30000)
);
create table public.learner_map_state (
 user_id uuid references auth.users(id) on delete cascade, universe_id text check(universe_id in ('science','commerce','arts')),
 state jsonb not null,updated_at timestamptz not null default now(),primary key(user_id,universe_id)
);
create table public.graph_playback_sessions (
 user_id uuid primary key references auth.users(id) on delete cascade, session_id uuid not null,
 topic_id uuid not null references public.graph_topics(id), video_id text not null,
 sequence integer not null default 0, client_elapsed integer not null default 0,
 received_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null,
 previous_payload integer,previous_result jsonb
);
-- Public content is immutable to anon/authenticated roles; publishing is owner-only.
do $$ declare t text; begin
 foreach t in array array['graph_topics','graph_edges','graph_topic_videos','graph_events','graph_event_topics','graph_catalog_state','graph_publications','learner_topic_progress','learner_map_state','graph_playback_sessions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
grant select on public.graph_topics,public.graph_edges,public.graph_topic_videos,public.graph_events,public.graph_event_topics,public.graph_catalog_state to anon,authenticated;
create policy graph_topics_read on public.graph_topics for select to anon,authenticated using(status='published');
create policy graph_edges_read on public.graph_edges for select to anon,authenticated using(status='published' and exists(select 1 from public.graph_topics t where t.id=from_topic_id) and exists(select 1 from public.graph_topics t where t.id=to_topic_id));
create policy graph_videos_read on public.graph_topic_videos for select to anon,authenticated using(status='published' and exists(select 1 from public.graph_topics t where t.id=topic_id));
create policy graph_events_read on public.graph_events for select to anon,authenticated using(status in ('published','archived'));
create policy graph_event_links_read on public.graph_event_topics for select to anon,authenticated using(exists(select 1 from public.graph_events e where e.id=event_id) and exists(select 1 from public.graph_topics t where t.id=topic_id));
create policy graph_revision_read on public.graph_catalog_state for select to anon,authenticated using(true);
grant select on public.learner_topic_progress,public.learner_map_state to authenticated;
create policy graph_progress_owner on public.learner_topic_progress for select to authenticated using((select auth.uid())=user_id);
create policy graph_state_owner on public.learner_map_state for select to authenticated using((select auth.uid())=user_id);

-- One snapshot statement gives a consistent published revision. No learner data here.
create function public.graph_snapshot(p_universe text,p_topic uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$
 with recursive neighborhood(id,depth) as (
  select t.id,0 from public.graph_topics t where t.id=p_topic
  union
  select case when e.from_topic_id=n.id then e.to_topic_id else e.from_topic_id end,n.depth+1
  from neighborhood n join public.graph_edges e on e.from_topic_id=n.id or e.to_topic_id=n.id where n.depth<2
 ), chosen as (
  select t.* from public.graph_topics t where t.primary_universe=p_universe or t.id in(select id from neighborhood)
  order by (t.id=p_topic) desc,(t.id in(select id from neighborhood)) desc,t.map_x,t.id limit 40
 ), nodes as (
 select to_jsonb(t)||jsonb_build_object('video_ids',coalesce((select jsonb_agg(v.video_id order by v.video_id) from public.graph_topic_videos v where v.topic_id=t.id and v.role='primary'),'[]'::jsonb)) as data from chosen t
 ), links as (select e.* from public.graph_edges e where e.from_topic_id in(select id from chosen) and e.to_topic_id in(select id from chosen) order by e.id limit 80),
 stories as (select e.*,coalesce((select jsonb_agg(jsonb_build_object('topicId',l.topic_id,'explanation',l.explanation)) from public.graph_event_topics l where l.event_id=e.id),'[]'::jsonb) as topics from public.graph_events e where exists(select 1 from public.graph_event_topics l join public.graph_topics t on t.id=l.topic_id where l.event_id=e.id and t.primary_universe=p_universe) order by e.published_at desc limit 12)
 select jsonb_build_object('revision',(select revision from public.graph_catalog_state where id=1),'topics',coalesce((select jsonb_agg(data) from nodes),'[]'::jsonb),'edges',coalesce((select jsonb_agg(to_jsonb(e)) from links e),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(e)) from stories e),'[]'::jsonb),'truncated',(select count(*)>40 from public.graph_topics where primary_universe=p_universe));
$$;
create function public.graph_video_match(p_video text) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(t) from public.graph_topic_videos v join public.graph_topics t on t.id=v.topic_id where v.video_id=p_video and v.role='primary' limit 1;
$$;
create function public.graph_progress() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from (select * from public.learner_topic_progress where user_id=auth.uid() order by discovered_at desc limit 1000) p;
$$;
create function public.graph_state_load() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce((select state from public.learner_map_state where user_id=auth.uid() order by updated_at desc limit 1),'null'::jsonb);
$$;
create function public.graph_discover(p_topic uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare u uuid:=auth.uid(); begin
 if u is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.graph_topics where id=p_topic and status='published') then raise exception 'Topic unavailable'; end if;
 insert into public.learner_topic_progress(user_id,topic_id) values(u,p_topic) on conflict do nothing;
 return (select to_jsonb(p) from public.learner_topic_progress p where user_id=u and topic_id=p_topic);
 end;
$$;
create function public.graph_state_save(p_state jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare u uuid:=auth.uid(); z double precision; x double precision; y double precision; begin
 if u is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(p_state)<>'object' or not(p_state ?& array['universe','view','viewport']) or p_state->>'universe' not in ('science','commerce','arts') or p_state->>'view' not in ('map','feed') then raise exception 'Invalid state'; end if;
 if p_state->>'topicId' is not null and not exists(select 1 from public.graph_topics where id=(p_state->>'topicId')::uuid and status='published' and primary_universe=p_state->>'universe') then raise exception 'Topic unavailable'; end if;
 z:=(p_state#>>'{viewport,zoom}')::double precision;x:=(p_state#>>'{viewport,x}')::double precision;y:=(p_state#>>'{viewport,y}')::double precision;
 if z is null or x is null or y is null or not(z between .5 and 2) or not(abs(x)<=12000) or not(abs(y)<=12000) then raise exception 'Invalid viewport'; end if;
 insert into public.learner_map_state(user_id,universe_id,state) values(u,p_state->>'universe',jsonb_build_object('universe',p_state->>'universe','topicId',p_state->>'topicId','view',p_state->>'view','viewport',jsonb_build_object('x',x,'y',y,'zoom',z))) on conflict(user_id,universe_id) do update set state=excluded.state,updated_at=clock_timestamp();
 return jsonb_build_object('saved',true);
 end;
$$;
create function public.graph_activity_start(p_topic uuid,p_video text,p_replace boolean,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare u uuid:=auth.uid(); s public.graph_playback_sessions; t timestamptz:=clock_timestamp(); begin
 if u is null or p_request is null then raise exception 'Authentication required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 if not exists(select 1 from public.graph_topic_videos v join public.graph_topics g on g.id=v.topic_id where v.topic_id=p_topic and v.video_id=p_video and v.role='primary' and v.status='published' and g.status='published') then raise exception 'Video is not eligible'; end if;
 select * into s from public.graph_playback_sessions where user_id=u for update;
 if s.session_id=p_request and s.expires_at>t and s.topic_id=p_topic and s.video_id=p_video then return jsonb_build_object('sessionId',s.session_id,'sequence',s.sequence,'activeMs',s.client_elapsed); end if;
 if s.expires_at>t and not coalesce(p_replace,false) then return jsonb_build_object('busy',true); end if;
 insert into public.graph_playback_sessions(user_id,session_id,topic_id,video_id,received_at,expires_at) values(u,p_request,p_topic,p_video,t,t+interval '45 seconds') on conflict(user_id) do update set session_id=excluded.session_id,topic_id=excluded.topic_id,video_id=excluded.video_id,sequence=0,client_elapsed=0,received_at=t,expires_at=excluded.expires_at,previous_payload=null,previous_result=null;
 return jsonb_build_object('sessionId',p_request,'sequence',0,'activeMs',0);
 end;
$$;
create function public.graph_activity_report(p_session uuid,p_sequence integer,p_elapsed integer) returns jsonb language plpgsql security definer set search_path='' as $$
 declare u uuid:=auth.uid();s public.graph_playback_sessions;p public.learner_topic_progress;t timestamptz:=clock_timestamp();gap integer;credit integer;earned boolean:=false;answer jsonb;begin
 if u is null then raise exception 'Authentication required';end if;
 if p_session is null or p_sequence is null or p_elapsed is null or p_sequence<1 or p_sequence>1000000 or p_elapsed<0 or p_elapsed>3600000 then raise exception 'Invalid activity';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 select * into s from public.graph_playback_sessions where user_id=u for update;
 if s.session_id is distinct from p_session then return jsonb_build_object('expired',true);end if;
 if p_sequence=s.sequence and p_elapsed=s.previous_payload then return s.previous_result||jsonb_build_object('alreadyApplied',true,'newlyExplored',false);end if;
 if s.expires_at<t then return jsonb_build_object('expired',true);end if;
 if p_sequence<>s.sequence+1 or p_elapsed<s.client_elapsed then raise exception 'Out of order activity';end if;
 if not exists(select 1 from public.graph_topic_videos v join public.graph_topics g on g.id=v.topic_id where v.topic_id=s.topic_id and v.video_id=s.video_id and v.role='primary' and v.status='published' and g.status='published') then return jsonb_build_object('expired',true);end if;
 gap:=greatest(0,floor(extract(epoch from (t-s.received_at))*1000)::integer);
 credit:=case when gap>10000 then 0 else least(p_elapsed-s.client_elapsed,gap,10000) end;
 insert into public.learner_topic_progress(user_id,topic_id) values(u,s.topic_id) on conflict do nothing;
 select * into p from public.learner_topic_progress where user_id=u and topic_id=s.topic_id for update;
 earned:=p.first_explored_at is null and p.active_viewing_ms+credit>=30000;
 update public.learner_topic_progress set active_viewing_ms=least(30000,active_viewing_ms+credit),first_explored_at=case when earned then t else first_explored_at end where user_id=u and topic_id=s.topic_id returning * into p;
 answer:=jsonb_build_object('sessionId',p_session,'sequence',p_sequence,'topicId',s.topic_id,'activeViewingMs',p.active_viewing_ms,'firstExploredAt',p.first_explored_at,'newlyExplored',earned,'alreadyApplied',false);
 update public.graph_playback_sessions set sequence=p_sequence,client_elapsed=p_elapsed,received_at=t,expires_at=case when p.first_explored_at is not null then t else t+interval '45 seconds' end,previous_payload=p_elapsed,previous_result=answer where user_id=u;
 return answer;
 end;
$$;
create function public.graph_activity_stop(p_session uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare u uuid:=auth.uid(); begin
 if u is null then raise exception 'Authentication required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 update public.graph_playback_sessions set expires_at=clock_timestamp() where user_id=u and session_id=p_session;
 return jsonb_build_object('stopped',true);
 end;
$$;
-- Restrict every function explicitly: PostgreSQL otherwise grants execute to PUBLIC.
do $$ declare fn record; begin
 for fn in select p.oid::regprocedure as sig,p.proname as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('graph_snapshot','graph_video_match','graph_progress','graph_state_load','graph_discover','graph_state_save','graph_activity_start','graph_activity_report','graph_activity_stop') loop
 execute format('revoke all on function %s from public, anon, authenticated',fn.sig);
 execute format('grant execute on function %s to authenticated',fn.sig);
 if fn.name in('graph_snapshot','graph_video_match') then execute format('grant execute on function %s to anon',fn.sig);end if;
 end loop;
end $$;
-- Owner-only publication. No learner/service-role credential is introduced.
create function public.graph_publish(p_manifest jsonb,p_checksum text) returns integer language plpgsql security invoker set search_path='' as $$
declare v integer; begin
 if p_manifest->>'reviewed' is distinct from 'true' then raise exception 'Content review required'; end if;
 perform 1 from public.graph_catalog_state where id=1 for update;
 if exists(select 1 from public.graph_publications where request_id=(p_manifest->>'request_id')::uuid) then
  if not exists(select 1 from public.graph_publications where request_id=(p_manifest->>'request_id')::uuid and checksum=p_checksum) then raise exception 'Publication ID reused with different content';end if;
  return (select revision from public.graph_publications where request_id=(p_manifest->>'request_id')::uuid);
 end if;
 if p_manifest->>'expected_revision' is null or (p_manifest->>'expected_revision')::integer<>(select revision from public.graph_catalog_state where id=1) then raise exception 'Catalog changed; review the current revision'; end if;
 insert into public.graph_topics(id,slug,label,description,aliases,primary_universe,related_universes,wikidata_id,status,map_x,map_y,sources)
 select id,slug,label,description,coalesce(aliases,'[]'),primary_universe,coalesce(related_universes,'{}'),wikidata_id,status,map_x,map_y,coalesce(sources,'[]') from jsonb_to_recordset(p_manifest->'topics') as x(id uuid,slug text,label text,description text,aliases jsonb,primary_universe text,related_universes text[],wikidata_id text,status text,map_x double precision,map_y double precision,sources jsonb)
 on conflict(id) do update set slug=excluded.slug,label=excluded.label,description=excluded.description,aliases=excluded.aliases,primary_universe=excluded.primary_universe,related_universes=excluded.related_universes,wikidata_id=excluded.wikidata_id,status=excluded.status,map_x=excluded.map_x,map_y=excluded.map_y,sources=excluded.sources,updated_at=clock_timestamp();
 insert into public.graph_edges(id,from_topic_id,to_topic_id,relation_type,explanation,status,sources)
 select id,from_topic_id,to_topic_id,relation_type,explanation,status,coalesce(sources,'[]') from jsonb_to_recordset(p_manifest->'edges') as x(id uuid,from_topic_id uuid,to_topic_id uuid,relation_type text,explanation text,status text,sources jsonb)
 on conflict(id) do update set from_topic_id=excluded.from_topic_id,to_topic_id=excluded.to_topic_id,relation_type=excluded.relation_type,explanation=excluded.explanation,status=excluded.status,sources=excluded.sources;
 insert into public.graph_topic_videos(topic_id,video_id,role,status,provenance,checked_at)
 select topic_id,video_id,role,status,provenance,checked_at from jsonb_to_recordset(p_manifest->'videos') as x(topic_id uuid,video_id text,role text,status text,provenance text,checked_at timestamptz)
 on conflict(topic_id,video_id) do update set role=excluded.role,status=excluded.status,provenance=excluded.provenance,checked_at=excluded.checked_at;
 insert into public.graph_events(id,title,summary,status,sources,published_at,updated_at,archived_at)
 select id,title,summary,status,sources,published_at,updated_at,archived_at from jsonb_to_recordset(p_manifest->'events') as x(id uuid,title text,summary text,status text,sources jsonb,published_at timestamptz,updated_at timestamptz,archived_at timestamptz)
 on conflict(id) do update set title=excluded.title,summary=excluded.summary,status=excluded.status,sources=excluded.sources,updated_at=excluded.updated_at,archived_at=excluded.archived_at;
 insert into public.graph_event_topics(event_id,topic_id,explanation)
 select event_id,topic_id,explanation from jsonb_to_recordset(p_manifest->'event_topics') as x(event_id uuid,topic_id uuid,explanation text)
 on conflict(event_id,topic_id) do update set explanation=excluded.explanation;
 update public.graph_catalog_state set revision=revision+1,updated_at=clock_timestamp() where id=1 returning revision into v;
 insert into public.graph_publications(revision,request_id,checksum,summary,published_by) values(v,(p_manifest->>'request_id')::uuid,p_checksum,p_manifest->>'summary',current_user);
 return v;
end;
$$;
revoke all on function public.graph_publish(jsonb,text) from public,anon,authenticated;
commit;
