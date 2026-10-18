# Learning graph implementation plan

Date: 2026-10-15  
Status: implementation reference; local feature code and migration are now prepared. Database activation, reviewed publication and runtime verification remain pending.

## Local implementation update — 2026-10-15

Prepared: graph catalog/routes and Supabase adapter; migration 003 with RLS/RPCs and transactional owner publication; desktop/mobile Map/Feed navigation and topic/list/event UI; active-viewing coordinator and guest/account state paths; classifier candidate matcher and content CLI tools; 30-topic/26-connection starter draft. Graph workspace/layouts use lazy chunks.

Not yet established: applied schema, published/approved videos or news, live RLS/concurrency/playback behavior, visual runtime evaluation and deployment. The source draft is `reviewed: false`; actual `.env` is unchanged and the feature defaults off. See [the current activation guide](../../backend/graph/README.md) for concrete steps and known limitations. No tests or live provider requests were run during this implementation; TypeScript/build, Node syntax and offline catalog validation were checked.

Implementation refinements: the first Feed presents published topic cards with video choices in the topic panel; weekly publishing is owner-operated rather than a deployed news scheduler; account activity includes a stop endpoint and idempotent start request ID; guests also require browser focus and use storage-event synchronization. Mobile currently uses a below-map topic panel instead of a draggable sheet. These limitations must remain visible in handoffs.

## 1. Purpose and precedence

Build the approved learning world inside the existing Curiosity website: a shared constellation of educational concepts, personal discovery, Map/Feed exploration and first-exploration achievements. Preserve ordinary search, playback, teacher chat, saved searches and account behavior.

This document is the technical reference for graph implementation. Latest founder decisions below override older exploratory suggestions about quiz-based badges, the initial activity-launch trigger, or separate maps per learner. Follow AGENTS.md and ARCHITECTURE.md for repository boundaries. Record material changes here rather than silently changing the rules during implementation.

References:

- [Current architecture](../../ARCHITECTURE.md).
- [Topic relationships and classification decisions](../product/TOPIC_RELATIONSHIPS.md).
- [Existing classification implementation](../../backend/classification/README.md).
- [Shared Gemini scheduling](../../backend/gemini/README.md).
- [Graph D refinement](../../design/penpot/graph/d-refined/README.md).
- [Desktop integration handoff](../../design/penpot/graph/desktop-integration/README.md) and [clickable navigation review](../../design/penpot/graph/desktop-integration/review.html).
- [Original graph design discussion](../../design/penpot/graph/PLAN.md).

## 2. Decisions and implementation defaults

### Confirmed by the founder

1. Three Universes: `science` / Science & Technology, `commerce` / Commerce & Business, `arts` / Arts & Humanities.
2. One shared published map, with personal discovery and exploration state for each learner.
3. Graph D: futuristic constellation styling with Map and Feed views. Desktop integration keeps the existing white header and labeled sidebar around the graph content.
4. An **Explore map** entry below Home opens the feature. Home remains general discovery; the graph Feed belongs to its selected Universe.
5. Topics remain flat concepts. Visual neighborhoods do not introduce nested topic menus.
6. A topic/content item has a primary home. Related Universes are connections, not duplicate learning records or extra progress counts.
7. Award an achievement for exploring a previously unexplored topic. No quiz, mastery claim or knowledge-percentage score in this version.
8. First exploration requires **30 seconds of active video viewing**.
9. The world should grow through weekly educational stories and concept additions, connected to lasting ideas.
10. Reuse only the environment-configured Gemini model and the existing sequential requester.

### Proposed defaults to implement unless deliberately revised

These details were recommended during planning but have not each received separate founder confirmation:

- Accumulate 30 seconds across eligible videos associated with the same topic, including short clips; the threshold is wall-clock viewing time, not media position.
- Count only the selected/foreground player, while at least 50% visible and the document is visible. Muting does not invalidate viewing. Playback at a different speed still counts elapsed active seconds.
- Published topic associations determine eligibility; incidental secondary mentions do not earn multiple topic badges.
- Guests can explore and save progress locally. Account progress is authoritative in Supabase. Do not automatically merge guest activity into an account in the first implementation.
- Existing playback positions and saved queries do not receive retrospective badges automatically.
- A reviewed, small initial catalog covers all three Universes. Start around 10–15 useful concepts per Universe, rather than importing an entire knowledge graph.
- Prepare weekly drafts automatically where useful; founder review precedes publication. Start with a versioned content manifest and a restricted publisher, not a full staff dashboard.
- SVG-based rendering is the initial candidate for a small graph. Confirm pan/zoom, touch, keyboard use and frame performance in a focused spike before selecting any new dependency.

If a default needs changing, document the reason and impact before implementing the dependent work. Do not repeatedly ask for approval of already confirmed product decisions.

## 3. Existing implementation and gaps

| Existing module | Reuse | Graph addition needed |
| --- | --- | --- |
| `backend/classification/` | Gemini topic extraction, Wikidata candidates, focus-based Universe selection, caching | Match accepted classifications to published canonical topics; retain unmatched candidates separately |
| `backend/providers/wikidata.mjs` | Bounded identity and selected factual relationship lookup | Review which links should appear on the learning map |
| `backend/gemini/` | One active model request, spacing, teacher priority, cooldown | All graph content generation must use the same scheduling boundary |
| `backend/cached-youtube.mjs` | Permitted cached search/details and video availability | Hydrate graph video IDs; no independent unbounded search per node |
| `shared/features/videos/VideoPlayer.tsx` | Official embed, player state, visibility, error handling, progress callbacks | Typed active-playback signal and interval measurement suitable for topic exploration |
| `shared/features/progress/useVideoProgress.ts` | Guest/account playback position and Continue watching | Keep this separate from active viewing and graph achievements |
| `shared/features/learning/` | Existing learning/break activity behavior | Consume a common player signal without coupling graph rules to the break timer |
| `backend/supabase.mjs` | Publishable-key transport, authenticated identity checks, existing saved data | Focused graph storage adapter and RPC calls; no service-role key in the learner runtime |
| `backend/server.mjs` | HTTP input handling and dependency composition | Delegate graph routes to a focused feature handler |
| `src/App.tsx` and layouts | Navigation and desktop/mobile composition | New graph view and shared graph feature coordinator |

Important: `position_seconds`, `completed`, and a saved query do not measure active viewing. Existing `onActive` behavior must be audited for document visibility, buffering, seeking and multiple player instances before reuse. Do not assume the break clock or five-second resume-position poll already implements the 30-second rule.

## 4. Architecture and repository ownership

```text
backend/
  graph/
    catalog.mjs              # Published topic lookup, video associations
    relationships.mjs        # Bounded neighborhoods, edge explanations, bridges
    exploration.mjs          # Activity input rules and exploration orchestration
    map-state.mjs            # Restore/save selected Universe, topic and viewport
    publishing.mjs           # Manifest validation and publication coordination
    routes.mjs               # Graph HTTP contracts; calls application services
    contracts.ts             # Small store/service interfaces
    README.md
  storage/
    supabase-graph.mjs        # Graph reads and account RPC adapter
  classification/            # Existing classification remains independent
  gemini/                    # Existing requester and queue
  providers/                 # Existing external-service adapters

shared/features/
  graph/
    graph-types.ts
    graph-client.ts          # Browser API calls and response validation
    GraphWorkspace.tsx       # Shared feature coordination; accepts layout renderers
    useGraph.ts              # Neighborhood, selection, revisions and cancellation
    useExploration.ts        # Activity session, guest state, account sync, unlocks
    graph-view-state.ts      # Viewport/selection serialization and bounded values
    graph-discovery.ts       # Personal discovery display rules
    GraphCanvas.tsx          # Reusable map geometry and accessible interactions
    GraphTopicList.tsx       # Equivalent list navigation
    TopicPanel.tsx
    ExplorationNotice.tsx
    WeeklyEventPanel.tsx
  videos/
    playback-activity.ts     # Focused elapsed-time rules, if justified by the spike
    VideoPlayer.tsx          # Emits activity; does not own graph/database rules
  progress/                  # Existing resume-position behavior stays separate

desktop-ui/features/graph/
  GraphPage.tsx               # Desktop map/feed, topic panel and sidebar integration
  graph.css
mobile-ui/features/graph/
  MobileGraphPage.tsx         # Touch layout, bottom sheet and compact controls
  graph.css

supabase/migrations/
  003_learning_graph.sql      # Confirm next available migration number first
supabase/tests/
  learning_graph_access.sql   # Access/RPC cases when verification is authorized
content/graph/
  catalog.json               # Versioned, reviewed initial topics and named edges
  events/                    # Reviewed weekly story manifests and source details
scripts/graph/
  validate-catalog.mjs        # Offline structural/content checks
  publish-catalog.mjs         # Explicit owner-operated, transactional publication
  README.md
```

Names are a working outline, not a requirement to create every file before it is needed. Keep small responsibilities together until a split is useful. Production backend code must not import developer experiments or unpublished local content directly; the publisher loads manifests and production reads published records.

### Dependency direction

- Routes → graph application services → injected storage/provider interfaces.
- `supabase-graph.mjs` implements graph storage; application rules do not import vendor-specific database clients.
- Graph services may consume classification results. The classifier must not import graph services or publish nodes.
- Browser graph modules call the backend API. They never import backend files.
- Shared graph modules import neither desktop nor mobile layouts. `src/App.tsx` selects the layout renderer.
- The existing Universe identifiers remain stable. If validation constants need sharing between backend modules, extract a small policy module rather than importing one entire feature into another.

## 5. Data model

Supabase is the authoritative graph catalog and account-state store. Firestore remains the existing cache/usage store. No dedicated graph database or new microservice is required initially.

All names below are proposed. Use internal stable IDs; labels, positions, classification cache keys and user search strings must not become identifiers.

### Shared content

| Table | Required fields and constraints |
| --- | --- |
| `graph_topics` | `id` UUID PK, `slug` unique, `label`, bounded `aliases`, `description`, `primary_universe`, bounded `related_universes`, nullable `wikidata_id`, `status` draft/published/archived, finite `map_x`/`map_y`, source records, timestamps |
| `graph_edges` | UUID PK, `from_topic_id`, `to_topic_id`, allowed `relation_type`, user-facing explanation, direction, source records, status; prohibit self-edges and duplicate equivalent edges |
| `graph_topic_videos` | Topic FK, valid video ID, `role` primary/supporting, publication status, association provenance and checked date; unique topic/video pair |
| `graph_events` | UUID PK, title, bounded summary, status draft/published/archived, source URLs/publishers/source dates, original publication date, our published/updated dates, archive date |
| `graph_event_topics` | Event/topic pair PK, short explanation of the connection |
| `graph_catalog_state` | Single current revision and publication timestamp; updated in the same transaction as published catalog changes |
| `graph_publications` | Revision, unique publication request ID, manifest checksum, publisher identity, timestamp and correction/change summary |

Source records are bounded structured data, not arbitrary model output. Validate HTTPS URLs and escape rendered text; never render supplied HTML. Server-side URL fetching, if introduced, requires an explicit allowed-source strategy rather than blindly fetching user/model URLs.

A Wikidata QID is optional. For the initial one-concept-per-node catalog, enforce uniqueness of a non-null canonical QID where appropriate. Alias/QID matching proposes identity; ambiguous meanings need review. Do not silently merge two learning concepts because their labels look similar.

For edges, begin with `related_to`, `helps_explain`, `part_of`, and reviewed `learn_first`. `related_to` is symmetric: normalize endpoint order before uniqueness checks. The other types have explicit source → target direction. Never infer a prerequisite merely from a Wikidata connection. Do not add parent-folder nesting to the UI because an edge is `part_of`.

### Personal records

| Table | Required fields and constraints |
| --- | --- |
| `learner_topic_progress` | `(user_id, topic_id)` PK, `discovered_at`, `active_viewing_ms` bounded 0–30000 for this first badge, nullable immutable `first_explored_at`, timestamps |
| `learner_map_state` | `(user_id, universe_id)` PK, nullable selected topic FK, finite viewport center/zoom within allowed limits, last view Map/Feed, update timestamp; retain an account-level last Universe pointer |
| `graph_playback_sessions` | One current lease per user, opaque session ID, eligible topic/video, last accepted sequence, client cumulative counter, server receipt time, expiry; bounded/transient state |

`first_explored_at` is the first-exploration achievement. Store it once with an atomic transition; do not introduce an independent badge table that can disagree with progress. Later achievement types can justify a separate model.

Account deletion cascades personal records. Archiving a topic or video association does not erase earned activity. Topic deletion/merging needs an explicit migration preserving references and one achievement per canonical destination.

Video associations store IDs and our association facts. Resolve display metadata through the existing cache/provider lifecycle. Do not permanently copy API titles/descriptions/thumbnails into graph content manifests as a substitute for metadata refresh.

## 6. Shared map and personal discovery

- Published positions are stable data. Do not run a new force layout on every visit or move established nodes whenever content is added.
- Initially fetch a bounded neighborhood: a selected/starting node, one-hop usable neighbors, and a small set of second-hop discovery hints.
- Default ceiling: 40 nodes and 80 edges per response. These are tunable implementation limits, not a claim about performance already measured.
- A faint node/hint is a visual invitation, not an access restriction. Search or an accessible list can jump to any published concept.
- Opening a node marks it discovered, not explored. Selection is temporary UI state; a server-confirmed 30-second threshold changes exploration.
- Derive reveal state from the learner's discovered/explored topic records and bounded neighborhoods. Avoid storing an unbounded list of every visible edge or allocating a copied graph per account.
- A bridge previews a topic in another Universe using the same topic ID. Following it changes Universe context; it does not duplicate the concept or award another achievement.
- Map and Feed consume the same topic/video associations and learner state. Existing Home and Universe browsing remain independent destinations.
- Restore viewport only after its catalog/context loads; clamp stale values. If a saved selected topic is archived, explain briefly and use an available start node.

## 7. Active-viewing and achievement protocol

### Measurement rules

1. Use monotonic elapsed time (`performance.now()` in the browser), not differences in video position.
2. Count only when the selected player reports playing, at least 50% of its container is visible, and the tab/document is visible.
3. Pause counting for buffering, pause, ended, errors, seeking, hidden tabs, offscreen playback, component disposal or switching identity/video.
4. A seek never adds the skipped media duration. Validate media progression as a corroborating signal and reset the timing baseline on seek/jump.
5. Limit each sampling interval to a small plausible duration. Discard long suspended gaps instead of crediting them on wake.
6. A single coordinator chooses the foreground activity source, so simultaneous cards/Shorts do not multiply time. Keep this separate from the existing break duration counter.
7. Active time is associated with one published canonical topic for that activity. The client cannot nominate arbitrary extra topics from a related tag.
8. Accumulate until 30000ms, then stop reporting for this topic's first-exploration achievement. Existing playback-position saves continue normally.

Audit available YouTube player events and the current Player type during implementation. If seek detection needs position sampling, account for legitimate playback-speed changes; do not equate media seconds with elapsed viewing seconds.

### Account synchronization

- Start an exploration lease only for an eligible published topic/video association, after playback becomes active.
- Send bounded heartbeats around every five seconds, with session ID, increasing sequence and cumulative active milliseconds since this session began.
- Derive the user from the authenticated identity. Never accept `user_id`, award time, or `first_explored_at` from the request.
- Credit only the positive new counter difference, bounded by server elapsed time and a maximum report interval. Start response establishes the initial server baseline.
- For an unexpectedly long report gap, rebaseline without crediting the uncertain interval. Expire inactive leases; an initial candidate is 45 seconds, with no more than 10 seconds credited per report.
- One live lease per account prevents multiple tabs/players earning parallel time. A second tab receives an activity-in-another-tab response or explicitly takes over; it must not silently double credit.
- In one database transaction, validate the lease/sequence/association, lock the relevant learner rows, add bounded credit and set `first_explored_at` if crossing 30000ms for the first time.
- An exact replay must not credit time again. Return `alreadyApplied` or the previous acknowledgement. Older/reordered requests do not advance state.
- Notify the browser of confirmed exploration and canonical progress. Deduplicate the visible achievement by user/topic/timestamp. A retry must not replay the celebration as a new award.
- On unknown request outcome, replay only the same idempotent heartbeat within a small bounded policy; never issue a new increment for that uncertain interval. This is separate from the no-automatic-provider-retry policy for Gemini.
- Reconnect through an explicit recovery state. Do not upload an arbitrary offline backlog as verified account viewing time.

The backend cannot prove that someone cognitively attended to an embedded video. The achievement records bounded playback activity reported by the application; it is not an anti-cheat guarantee or evidence of mastery.

### Guests and identity changes

- Store a versioned, validated, bounded graph state under new browser keys, separate from existing topic/progress keys.
- Guest achievements are local to that browser identity; a storage failure must say progress is unsaved.
- Clear active activity leases, timers, pending unlocks and in-memory graph progress immediately when signing in/out or changing accounts. Ignore stale responses using identity generations, following existing account hooks.
- Load account records independently. Do not transfer guest elapsed time/badges automatically or claim guest records were synced.
- Future guest import needs a separate agreed policy. Uniqueness is per account/local guest identity, not proof that a human never explored the concept elsewhere.

## 8. API contracts

Use the existing `/api` JSON conventions. Read operations can initially use POST to match the current browser client; specify routing/methods consistently when implemented. Every public route has bounded input and output. Personal responses must not enter shared caches.

| Route | Access | Input / response responsibility |
| --- | --- | --- |
| `/api/graph/neighborhood` | Public | Universe, optional topic ID/revision; return published nodes, edges, start topic, revision and truncation/continuation info |
| `/api/graph/topic` | Public | Topic ID; return published topic, named connections and bounded hydrated video references, with availability messages |
| `/api/graph/feed` | Public | Universe and bounded cursor/filter; published topic-associated content only, reusing existing metadata hydration |
| `/api/graph/events` | Public | Universe, optional cursor; dated published/archived stories with concept links |
| `/api/graph/progress` | Account | Bounded relevant topic IDs/cursor; return only the current user's discovery/exploration records |
| `/api/graph/discover` | Account | Published topic ID; idempotently record discovery, without active-time credit |
| `/api/graph/activity/start` | Account | Eligible topic/video IDs and replacement intent if needed; return lease ID and expiry |
| `/api/graph/activity/report` | Account | Lease ID, sequence and cumulative active milliseconds; return acknowledgement, bounded progress and first-exploration result |
| `/api/graph/state/load` | Account | Optional Universe; return last context and viewport |
| `/api/graph/state/save` | Account | Universe, selected topic, Map/Feed and bounded viewport; return saved state |

Guests use the same public catalog endpoints and a local progress adapter; do not create a public endpoint that writes someone else's account progress.

Example neighborhood shape:

```json
{
  "revision": 1,
  "universe": "science",
  "startTopicId": "<topic-uuid>",
  "nodes": [{"id": "<topic-uuid>", "label": "GPUs", "primaryUniverse": "science", "position": {"x": 380, "y": 300}}],
  "edges": [],
  "truncated": false
}
```

Example report acknowledgement:

```json
{
  "sessionId": "<opaque-id>",
  "sequence": 6,
  "alreadyApplied": false,
  "topicId": "<topic-uuid>",
  "activeViewingMs": 30000,
  "firstExploredAt": "<server-timestamp>",
  "newlyExplored": true
}
```

The server returns a safe distinction between invalid input, authentication needed, unavailable/archived content, stale revision, expired lease, competing activity, rate limit and storage failure. A stale revision refresh must preserve selection where possible and must not trigger provider request loops.

## 9. Access control and transactions

The existing Supabase integration accepts publishable/anon credentials plus a user's JWT. Preserve that constraint in the learner runtime.

- Public reads: only published topics, edges between published endpoints, eligible associations and published/archived event content as appropriate.
- Draft records: no anonymous/ordinary-user reads. Owner publishing access is separate.
- Personal reads: RLS checks `auth.uid() = user_id`.
- Do not grant browser clients direct writes to credited active time or exploration timestamps. Backend validation alone is insufficient when the same public Supabase project can be called directly.
- Use narrowly scoped PostgreSQL RPCs for discovery, lease/report transactions and constrained map-state writes. They derive identity from `auth.uid()`, validate parameters and enforce all invariants in the database.
- Where `SECURITY DEFINER` is required, use a safe fixed/empty search path, fully qualified relations, minimum grants, no dynamic SQL and explicit caller checks. Revoke execution from unintended roles and verify both direct REST and direct RPC access cases.
- Do not add service-role credentials to the browser or ordinary backend just to bypass RLS.
- For the initial publisher, apply reviewed manifests through an explicit owner-operated database transaction/migration. Do not expose a generic public SQL or publishing endpoint. Additional publisher credentials, if later justified, stay separate from the learner service and are documented before use.
- Serialize publication around the catalog revision. Validate referential integrity and commit content changes, the revision and an audit record together. A failed publish keeps the last good catalog usable.
- Return a neighborhood from a consistent database snapshot/RPC. Other requests carry the revision so the UI can detect mixed versions.

## 10. Classification, video matching and weekly content

### Initial catalog

1. Prepare a versioned manifest with stable IDs, aliases, positions, meaningful edges and source provenance.
2. Select a small set of playable learning videos per topic, with a primary association and bounded supporting choices.
3. Validate all IDs, references, Universe values, coordinates, source fields and duplicate identities offline.
4. Review educational usefulness and connections; a model-generated assertion is not a reviewed prerequisite.
5. Publish transactionally. Keep the manifest/checksum and reason in publication history.

### Classification bridge

- Use the current Gemini extraction → bounded Wikidata candidate lookup → Gemini classification flow.
- First match a stable published QID where available, then reviewed aliases/context. Avoid raw title-word matching as the final identity decision.
- Labels may be provisional for ordinary browsing; a provisional classification does not silently create a public map node.
- Keep unmatched candidates in a bounded review draft/manifest workflow. Decide whether persistent candidate storage is necessary after the initial catalog; do not create an unlimited queue of every search result.
- Resolve and persist a video's eligible primary graph association before crediting activity. Do not move earned progress when later classifications change.
- Preserve metadata-hash/model/policy caching and current usage reservations. No fresh Gemini call is needed simply to pan, zoom, select a stored node or restore a map.

### Weekly updates

1. On a weekly schedule, collect a bounded candidate set from explicitly chosen educational/news sources.
2. Record original source dates, publisher, URLs, our retrieval date and a brief rationale. Do not call a view-count-based feed a verified news service.
3. If Gemini assists, send bounded public source material and use the configured model through the shared requester. Reject embedded instructions and validate structured output.
4. Propose links to existing concepts; review new concepts separately with stable positions and sources.
5. Founder reviews story accuracy, educational framing, direct concept connections and sources.
6. Publish a dated weekly batch; retain prior published content on job/provider failure.
7. Archive older spotlights without deleting concepts, achievements or story history. Record corrections and updated dates honestly.

First delivery can publish a manually reviewed weekly batch. Add automation only after the source list, review responsibility, schedule/timezone and publishing mechanism are settled. A weekly batch is not a real-time breaking-news promise.

The current Gemini scheduler is process-local. A separate script/process does not automatically share its queue with the running server. Never start a concurrent live drafting worker with the same provider allowance and assume serialization applies. Initially generate drafts through the same running requester or use an explicitly coordinated maintenance operation. A future independent worker or extra replica requires a shared/distributed provider scheduler before use.

## 11. Frontend integration and UX behavior

### Desktop

- Add `graph` to the existing `PageView` union and an **Explore map** sidebar action below Home.
- Let `App.tsx` select the graph workspace and layout, without implementing graph rules inside App.
- Preserve the current global header/search/account controls and sidebar destinations.
- Render the graph's dark surface inside the normal main content region. Retain Map/Feed switching and topic details.
- Home stays general discovery. Existing Universe navigation must not silently change destination semantics.
- The optional Home discovery card is secondary to the permanent sidebar entry.
- Add a **View this topic on the map** link only when a video has a published graph association; carry the canonical topic ID and preserve playback progress.

### Mobile

- Use the same API, activity rules, node identities and progress coordinator.
- Supply mobile placement through `MobileGraphPage`: compact controls and a topic bottom sheet.
- Prevent the bottom sheet from covering required embedded-player controls; preserve official player behavior.
- Support touch pan/zoom and a list alternative. Do not import desktop modules into shared or mobile features.

### Shared state

Keep distinct state for selected Universe, Map/Feed view, selected canonical topic, viewport, catalog revision, learner progress and active playback lease. Feed switching must not reset the learner or create a second copy of progress. Abort/ignore superseded requests on selection or identity changes.

Personal achievement notifications appear only after confirmed account persistence, or clearly local guest persistence. Do not optimistically display a server-earned badge during an unsynced write.

### Accessibility and performance

- Keyboard-focusable nodes, descriptive names, selected/expanded states, Enter/Space activation and predictable focus return from panels.
- Accessible topic list with the same destinations; color is not the only indication of discovery or selection.
- Reduced-motion mode; subtle selection/route effects only. No continuous expensive layout animation.
- Aim for at least 44px touch targets, including invisible hit areas around small visual nodes.
- Debounce viewport saves and avoid rebuilding the graph for every playback tick. Update only the affected topic state.
- Load bounded neighborhoods and request more on deliberate navigation. Avoid every node initiating a YouTube search or classification request.
- Choose rendering/dependencies after the small performance/accessibility spike; record the decision and observed limits.

## 12. Compatibility, failure behavior and rollout

- Keep existing saved-topic keys, classification cache keys, playback records and guest storage keys intact.
- New graph records reference canonical IDs separately. Do not repurpose `topic_key` into a graph ID throughout the old app.
- No automatic historical achievement backfill from saved position. Reliable activity evidence does not currently exist in the stored schema. A later backfill requires an explicit rule and migration.
- Add a proposed `LEARNING_GRAPH_ENABLED` flag, initially false. Document it in `.env.example` and the environment loader when implemented; do not edit actual secrets or deploy merely to add documentation.
- When enabled without required schema/catalog, show an honest unavailable/setup state. Do not show design-only invented content as live learning material.
- Catalog request failure: explain it, offer bounded user retry and keep other app features available.
- Account progress failure: preserve loaded public content, show that activity cannot currently sync, and stop claiming account achievements are saved.
- Metadata/video failure: retain the topic and offer another eligible video; do not remove the learner's earned exploration.
- Empty neighborhood or no matching node: show available choices/search/list fallback; ordinary video search still works.
- Archived/missing event: retain a useful concept route and explain availability.
- Publication failure: retain the previous revision. For rollback, publish a corrective revision with history instead of erasing learner records.
- Deployment is a later explicit step after code, migration, seed content and checks are reviewable. Disabling the feature hides graph entry without deleting existing graph or learner data.

## 13. Implementation phases and acceptance criteria

### Phase A — Contracts and renderer spike

- [ ] Confirm implementation defaults, exact starter topics/source ownership and next migration number.
- [ ] Define topic/edge/activity/API types and small storage interfaces.
- [ ] Demonstrate a bounded native graph, accessible list and touch/keyboard navigation using static developer fixtures explicitly labeled as such.
- [ ] Record renderer/dependency choice, measured limitations and 1440px/narrower-desktop adaptation of the 1600px integration design.

Accept when IDs, relationships, navigation and rendering approach are concrete without provider calls on graph interaction.

### Phase B — Published catalog and API

- [ ] Create schema, RLS, RPC grants and focused Supabase adapter.
- [ ] Add bounded graph routes and revision handling through dependency injection.
- [ ] Build/validate/review starter manifests for all three Universes.
- [ ] Publish a small real catalog with stable positions and eligible video associations.
- [ ] Implement metadata hydration and honest unavailable states.

Accept when public users can read published content only, draft/personal records stay protected, and provider failures do not destroy the map.

### Phase C — Website integration

- [ ] Add sidebar entry, graph navigation state and desktop wrapper.
- [ ] Implement shared Map/Feed, topic panel, teacher entry and existing player reuse.
- [ ] Implement mobile layout, accessible list, reduced motion and keyboard focus.
- [ ] Preserve Home, existing Universe feeds, search and Continue watching.
- [ ] Add graph links from associated videos where appropriate.

Accept when a user can enter from Home, follow a topic, switch Map/Feed in the same Universe, watch an actual eligible video and return without losing existing progress.

### Phase D — Personal exploration and achievements

- [ ] Add robust active-time measurement, including seek/buffering/visibility boundaries.
- [ ] Implement local guest storage and account lease/report transactions.
- [ ] Enforce one foreground activity source, idempotent reports, one unlock per topic and identity isolation.
- [ ] Restore Universe/viewport, handle stale topics and distinguish unsaved from confirmed state.
- [ ] Retain exploration across refresh, Map/Feed switches and new eligible videos of the same topic.

Accept when 29 seconds does not unlock, 30 eligible seconds does, seeking does not count skipped time, and repeated/concurrent requests cannot award twice.

### Phase E — Weekly growth and operational handoff

- [ ] Define a source list, weekly review owner, schedule/timezone and correction process.
- [ ] Add source-backed event manifests and restricted publication/archive commands.
- [ ] Show publication/update dates, sources and event-to-topic explanations.
- [ ] Validate a new batch, a failed batch and a correction without moving established nodes or losing progress.
- [ ] Document quotas, storage retention, publication instructions, configuration and deployment state.

Accept when a reviewed addition becomes visible as a new catalog revision while previous activity and familiar locations remain intact.

## 14. Verification plan for implementation

This section specifies future checks. Writing this plan does not authorize spending live provider quota or imply checks have already run. Follow the active session's instructions about adding/running tests.

- Unit/rule checks: canonical identity, edge direction/deduplication, bounded neighborhood selection, activity timing, threshold, visibility, seek and suspended-gap behavior.
- Database/access checks: anonymous published-only access, two-account isolation, direct REST write denial, authenticated RPC validation, publisher restriction, safe function grants/search paths, atomic first unlock and account deletion.
- Concurrency checks: duplicate heartbeat, out-of-order reports, unknown acknowledgement retry, two players/tabs, lease takeover/expiry and simultaneous threshold crossing.
- Browser journeys: Home → graph → Feed → Home; topic → eligible player; 29s/30s; pause/buffer/seek; short clips accumulating; background/offscreen; reload/revisit; guest/sign-in/sign-out; network loss; source/video unavailable; revised/archived node; mobile and keyboard/list navigation.
- Compatibility checks: existing topic saving, Continue watching, classification labels, teacher flow and break timer remain consistent.
- Publication checks: dry-run validation, duplicate identities, broken references, unsafe source URLs, transactional failure, source dates, corrections and stable positions.
- Type/build checks and targeted existing checks only when authorized for implementation. Clearly separate simulated fixtures, live provider checks and real account evidence.

## 15. Definition of done and handoff

The first graph release is complete when the reviewed catalog is usable through the approved desktop/mobile navigation, Map/Feed share canonical topic progress, 30 eligible seconds earns exactly one exploration achievement, public and private records have verified access boundaries, and weekly additions have an executable reviewed publication path.

The handoff must state:

- What was implemented and which phases remain.
- Applied versus merely prepared migrations and content publications.
- Current configuration/feature-flag values by example, without secrets.
- Real Penpot location, design adjustments and remaining responsive work.
- Checks performed, simulated versus live evidence, and limitations.
- Deployment status and any founder action still required.

Do not mark a checkbox complete from a design export, a mocked provider response or the existence of a file alone. Update this plan as the work progresses.
