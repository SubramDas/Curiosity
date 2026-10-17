# Learning graph — local implementation and activation

Status: feature code and migration prepared locally. The database migration, publication, real account access checks and live playback evaluation have not been executed. Nothing has been deployed.

## What is implemented

- Shared published catalog, bounded neighborhoods (40 nodes / 80 edges), flat canonical topics, named connections and cross-Universe references.
- Desktop Explore map below Home, optional Home entry card, desktop/mobile Map/Feed layouts and topic panels. Home remains the ordinary discovery feed.
- SVG map with pan/zoom/reset, keyboard controls, accessible list, personal discovery cues and responsive styling. Graph UI loads in separate chunks.
- Published video-ID hydration through the existing YouTube cache; topic search and teacher actions reuse existing app flows. No model request is needed to move around the map.
- A published video can link back to its canonical map topic after the player resolves its association. The same coordinator tracks eligible playback from graph or ordinary app players.
- Active-viewing measurement distinct from saved playback position. One foreground player contributes time; paused, buffering, hidden, offscreen, stalled/jumped and suspended intervals do not add skipped duration.
- Guest progress in separate browser keys. Guests additionally require a focused document. Account progress uses restricted RPCs, a per-account playback lease, sequence acknowledgements and an atomic 30000ms first-exploration transition.
- First-exploration notification after persistence; no mastery score or quiz. Existing resume keys are preserved when graph playback updates an already-known video.
- Dated weekly stories with sources, concept links and archived states. Publication is owner-operated; no automatic news ingestion or separate drafting worker is running.
- QID/reviewed-alias classification candidate matcher, offline manifest validation and transactional publication SQL preparation. The matcher does not automatically publish associations.

## 1. Apply the schema

In the existing development Supabase project's SQL Editor, execute:

`supabase/migrations/003_learning_graph.sql`

Run it once after migrations 001 and 002. It creates new graph tables, RLS policies, public catalog reads, private learner records and constrained activity/discovery/state RPCs. It does not alter saved_topics or video_progress. No service-role key is needed in the app.

The migration was prepared but not applied from this session: no Supabase administration connector or database owner connection is available here. Applying it and checking two-account isolation remain required before release.

## 2. Review and publish the starter catalog

`content/graph/catalog.json` contains **30 draft starter concepts and 26 proposed relationships**, with stable IDs and positions. Its `reviewed` field is false. Video and story lists are empty. Nothing from the Penpot illustrative feed is presented as a real published video or current news event.

The topics use `status: published` as their intended post-review state; that does not mean they already exist in Supabase. Publication is blocked while `reviewed` is false.

Review labels, aliases, descriptions, relationships and positions. Add source provenance where useful. Mark the reviewed manifest `reviewed: true` only after that review. The initial `expected_revision` is 0; retain topic IDs across future publications.

From the repository root:

```bash
node scripts/graph/validate-catalog.mjs content/graph/catalog.json
node scripts/graph/publish-catalog.mjs content/graph/catalog.json .local-data/graph-publication.sql
```

The second command requires the reviewed manifest and a new output path. It prepares SQL only; it cannot connect to the database. Execute that output in the Supabase SQL Editor as the owner. The transaction checks the expected revision and publication request ID, upserts the supplied records and records a checksum/audit summary.

To inspect a previously obtained classifier result without a model call:

```bash
node scripts/graph/match-classification.mjs content/graph/catalog.json path/to/classification-result.json
```

A match is a review candidate. Add its accepted video association to the next reviewed manifest; it is not automatically eligible for achievements.

## 3. Enable locally

After schema setup and publication, add this non-secret setting to the existing root `.env`:

```dotenv
LEARNING_GRAPH_ENABLED=true
```

Restart `npm run dev`. `/api/config` exposes the boolean, and desktop/mobile navigation gains Explore map. The default in `.env.example` and deployment configuration is false; the actual `.env` was not edited.

Without a published catalog the feature shows an empty/setup state. Without eligible video associations it shows concepts and connections, with an explicit message that learning videos await publication. Search and teacher actions still work through their existing services and allowances.

## 4. Publish eligible videos and weekly stories

A primary video association must reference a topic in the manifest, a real public embeddable 11-character YouTube ID, its checked date and a review rationale:

```json
{
  "topic_id": "<existing-topic-uuid>",
  "video_id": "<real-video-id>",
  "role": "primary",
  "status": "published",
  "provenance": "Record why this video primarily teaches this topic.",
  "checked_at": "<actual-check-time-in-ISO-format>"
}
```

Replace every placeholder; the example intentionally is not valid publishable content. A video has one published primary home. Supporting links do not credit additional topics. API display metadata is retrieved through the existing cache rather than copied permanently into the catalog.

Weekly manifests use the same validated `events` and `event_topics` arrays. Each event needs title, summary, original published/updated timestamps, status and 1–8 source records containing title, publisher, HTTPS URL and source publication date. Event-topic links contain the two IDs and an explanation. Use a fresh publication request ID, the current expected revision and a meaningful change summary. Include all referenced topic/event records in the manifest.

Archive a record explicitly by including it with status `archived`; omission does not delete existing records. Changing a video's primary home may require archiving the prior association in an earlier transaction to satisfy the unique primary-home index. Never reassign historical achievements automatically. Preserve familiar node positions unless a deliberate correction is documented.

The initial weekly workflow is manual review/publication. No feed scraper, automatic model drafting, scheduler or staff dashboard has been deployed. A future separate model worker must share provider scheduling; the current Gemini queue is process-local.

## Modules and contracts

- `routes.mjs`: bounded HTTP input and application dispatch; `catalog.mjs`: snapshot/topic DTOs and permitted video hydration.
- `storage/supabase-graph.mjs`: small RPC adapter; the existing Supabase transport validates public-key configuration.
- `publishing.mjs`: manifest validation / SQL preparation; `classification-match.mjs`: deterministic candidate identity matching.
- `shared/features/graph`: shared types, data loading, map/list/panels, activity coordinator, local persistence and notifications.
- Layout folders arrange shared content. The browser imports no backend files; shared features import no layout files.

Public POST routes: `/api/graph/neighborhood`, `/topic`, `/feed`, `/events`, `/video-match`. Feed/events currently reuse the bounded neighborhood snapshot rather than loading an independent unbounded feed.

Account POST routes: `/progress`, `/discover`, `/activity/start`, `/activity/report`, `/activity/stop`, `/state/load`, `/state/save` under `/api/graph`. Personal data never enters a shared cache. Map state is debounced and validated. Start is idempotent for its request ID; report replays do not add credit. Activity requests are serialized per browser coordinator; PostgreSQL serializes per-account mutations.

## Evidence and limits

- TypeScript and Vite production build pass. The main JS chunk is about 503kB minified and produces Vite's 500kB advisory; the graph workspace/layouts are separate lazy chunks.
- Node syntax checks pass for the changed backend/CLI entry points. Offline catalog validation accepts 30 topics, 26 edges, no videos and no events, with review still false.
- No tests were added or run, and no live Gemini/YouTube calls were made during implementation.
- The SQL has not been executed against PostgreSQL/Supabase. RLS/RPC behavior, concurrent accounts/tabs, real embedded playback timing and visual runtime/browser evaluation remain unverified.
- Guest cross-tab state uses browser storage events and foreground focus, not the database lease. Guest awards are local and editable, not account-verified or a strong cross-window anti-cheat guarantee.
- Activity is sampled conservatively. Initial association/session negotiation, uncertain gaps and page shutdown can lose small unconfirmed intervals; offline time is not uploaded later as verified account activity. Brief pauses can resume the same lease; a long pause may require manual retry.
- No automatic guest/account merge or historical badge backfill. Existing playback positions do not prove active viewing.
- The initial Feed presents published topics with associated video choices in the topic panel. It is not an additional video-search feed, and there are no invented videos when associations are empty.
- Mobile uses a reduced map viewport and a below-map topic panel. Drag-to-expand sheets, detailed hover animation and performance evaluation beyond the small initial neighborhood remain follow-up refinements.

See [GRAPH_IMPLEMENTATION_PLAN.md](../../GRAPH_IMPLEMENTATION_PLAN.md) for acceptance criteria and remaining phases. Code presence is not evidence that account playback or publication has been exercised live.
