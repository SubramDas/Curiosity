# Educational search guardrails

Implemented locally for desktop first. Mobile keeps its existing layout and shows a guard's explanation when a query cannot proceed; the reviewed mobile choice/redirect screens are not implemented yet. Restart `npm run dev` to load the new backend. No migration or deployment is included.

## Behavior

- Focusing the desktop header search opens a separate Search screen. Home remains general discovery.
- Submitted searches are assessed for learning intent: allow, offer learning choices, or redirect entertainment to educational alternatives. Humor within an educational explanation is allowed. Arts, practical skills, sport and gaming tutorials are valid learning subjects.
- A clarification retains the original query while checking the proposed learning goal. Only an accepted goal is used for YouTube retrieval and saved as the returning topic. Rejected/ambiguous searches are not saved.
- Every normal search page is guarded on the server, including saved searches and pagination. Client-supplied approval, mode, labels or metadata cannot bypass this.
- Real, public, embeddable YouTube details are checked for up to `YOUTUBE_SEARCH_PAGE_SIZE` candidates per page (default ten). Desktop background searches return cached approvals first, then check unknown videos in groups of three and append approved results as each group finishes. Other callers retain a single batch. Only metadata judged primarily educational is returned. Entertainment and unclear results are withheld. An empty filtered batch can still have another provider page; pagination remains available.
- User-supplied Home/Universe suggestion searches and teacher recommendations also pass through this search service. The existing general Trending source remains its separate recent-popular Education-category feed; this feature does not establish that its content is independently reviewed.

## Modules

- `search-policy.mjs`: policy, bounded input/evidence and structured decision validation.
- `gemini-search.mjs`: configured-model requests and strict query/video response parsing.
- `query-guard.mjs`: reusable query decisions, including the complete learning goal.
- `video-filter.mjs`: batched, metadata-specific educational-purpose/relatedness decisions.
- `search-jobs.mjs`: bounded opaque jobs, duplicate-request protection and polling.
- `related-break.mjs`: timed, topic-bound break permits and at-most-three cached results.
- `routes.mjs`: ordinary search orchestration and feature HTTP dispatch.

Application services receive the assessor, cache and YouTube client as dependencies. The existing Universe/Wikidata classifier stays independent: a Universe assignment is not evidence of educational purpose. Purpose checks avoid running a multi-stage Wikidata classification for every search result.

## Search page size

Set `YOUTUBE_SEARCH_PAGE_SIZE=3` in the root `.env` to fetch up to three candidates per search page. Supported values are integers from 1 through 20; the default is 10 when omitted. Invalid values fail at startup. Restart `npm run dev` after changing it. Guardrails can return fewer videos; Load more retrieves another page of the configured size.

The setting is applied to the YouTube search request, guardrail candidate limit and search-cache key. Changing it cannot reuse an incompatible page; video metadata, labels and purpose decisions remain reusable. Search-based Home/Universe suggestions use the same page size. Trending retains its existing count, and related breaks retain their three-clip maximum. The deployment helper forwards the setting on the next deployment; no deployment is performed by editing `.env`.

## Model, cache and limits

Uses only existing `GEMINI_API_KEY`, `GEMINI_MODEL` and `ALLOW_GEMINI_FREE_TEST`. No alternative model, key, automatic retry or quota reset. Requests share the existing paced queue: teacher first, search next, background classification after that. An in-flight request finishes normally. Dispatch deadlines/cooldowns remain in `backend/gemini`.

`SEARCH_GUARD_DAILY_LIMIT=40` is a separate persisted global UTC-day cap on model attempts. It covers query checks, new video-purpose batches and related-break checks. It does not increase the provider's own allowance. Existing search/chat/classification allowances are preserved. Each unknown submitted query normally costs one model attempt, followed by up to four small purpose batches for ten uncached desktop candidates (one batch for synchronous callers). Smaller desktop batches improve time to first result but can consume more model attempts and take longer to finish the full page. New/revised break evidence can require another batch. Model results can be wrong; these checks do not fact-check videos or guarantee teaching quality.

Query decisions are cached for six hours, keyed by normalized query, goal, configured model and policy version. Generated alternatives can reflect the submitted wording. Public-video purpose decisions last 24 hours and are keyed by bounded metadata, model, purpose and policy version. Break relevance also includes the topic. The existing local/Firestore bounded backend cache stores these records with hashed keys; failures are not cached as accepted decisions. No account/token data is included. Increment `SEARCH_POLICY_VERSION` when changing the rules.

Desktop requests use short asynchronous responses and poll one existing job every 1.5 seconds. Filtering snapshots contain only approved videos; pagination is exposed after the whole page finishes. Results remain clickable during checking, and later approvals join the existing player feed without resetting playback. A later batch failure retains already published results and displays an error. Cached approvals appear before new approvals, with no subsequent card reordering. Up to 100 jobs are retained, with five-minute expiry after completion; jobs and queue state are process-local. Reloading or canceling stops browser polling and ignores late responses, but already accepted server work may finish and populate reusable decisions. Current hosting is one instance; additional replicas require shared job routing/scheduling before activation.

## HTTP contracts

- `POST /api/search`: `{query, goal?, pageToken?, background?, requestId?}`. Background requests need a UUID; returns `jobId` and `checking`/`filtering`, then a terminal result via polling. Non-background callers receive the same terminal result directly.
- `POST /api/search/status`: `{jobId}`. Polling never starts a new model operation. Filtering and failed responses may include cumulative approved `videos`, a validated `decision` and a null `nextPageToken`. Ready results contain a validated `decision`, filtered `videos`, `nextPageToken`, and `filteredCount`.
- `POST /api/search/session`: educational query or public educational `videoId`, plus optional local `demo`. Returns an opaque break permit bound to the server-checked topic.
- `POST /api/search/break`: `{permit}`. No arbitrary query or pagination override. The server permits one cached batch of up to three directly related clips per permit; they need not teach something themselves.

Missing model configuration, provider limits, malformed model output and failed video checks stop new results rather than returning unchecked search videos. The desktop also rejects old-server responses without a decision. Existing loaded results and playback remain available where possible.

## Search videos in Universes

Approved results are recorded before they are published, including incremental batches. Existing video classification requests attach server-derived Topic/Universe labels to those references. Approval and classification can arrive in either order; classification alone never makes a video eligible. Related entertainment breaks are not added as learning results.

`backend/universes/search-catalog.mjs` stores a shared public catalog using the existing local cache file or hosted Firestore adapter. It stores up to 100 recent references/classification entries, with individual educational approvals valid for 24 hours. Cache eviction can remove entries earlier. It stores no users, submitted queries, account data or viewing history. This is a temporary discovery catalog, not permanent bookmarks or a personal video library. Model and both policy versions isolate records; changed metadata clears the old label, and outage labels expire after five minutes.

`POST /api/feed/universe/catalog` accepts `{universe: "science" | "commerce" | "arts"}` and returns `{videos}` without YouTube or model calls. Results include approved references matching the primary Universe plus approved references awaiting classification. The existing frontend classification registry can finish pending labels. Related Universes do not duplicate cards. Classification stays lazy; unseen videos are not eagerly classified to populate every Universe.

Desktop Universe feeds load this catalog independently from fresh discovery, deduplicate videos, expose classified Topics as filters and preserve available results if discovery fails. Refreshing/restarting retains unexpired cached references. On the first catalog request in each backend process, a bounded scan recovers older cached public video references when their exact metadata still has a valid educational-purpose decision for the configured model/policy. It uses no provider calls and preserves the earlier metadata/approval expiry. Existing catalog entries also resolve missing labels directly from the separate classification cache using their server-recorded metadata fingerprint. Expired, entertainment, unapproved and changed-evidence entries are not promoted. `recover-cached-search.mjs` owns this compatibility recovery. Restart the backend and refresh to activate it.

## Existing breaks

The existing active-learning timer, skip/return action and three-clip limit remain. Playback or active chat prepares a break session; the browser can restore its permit for the same video during the session. The server independently requires twelve elapsed minutes from session initiation. The 30-second developer option is accepted only by the localhost development server, never by the hosted static server. A permit expires within six hours, and returning to learning resets the next browser session.

The server checks elapsed time, not independently verified active viewing. The browser still measures active learning, so this is a bounded entertainment path rather than proof of attention or a strong anti-cheat system. A lost/expired permit, changed context or an interrupted preparation can delay a restored browser timer's break; failures are explained and learning can continue. No unbounded entertainment-search escape is provided.

## Verification

Focused service/HTTP tests cover decision validation, query/goal caching, batched filtering, malformed model IDs, allowance-independent cache reuse, blocked pagination and forged modes, job deduplication and timed/topic-bound break limits. Browser journeys use simulated providers and players to cover desktop choices, clarification, incremental polling, pagination deduplication, stable playback while results append, partial failures, legacy response rejection, cancellation and compatibility with accounts/playback/mobile. Service tests verify cache-only reads, cached-first publication and exclusion of unchecked/rejected videos.

Representative desktop screenshots were inspected against the reviewed Penpot direction. These checks establish application behavior with simulated responses. Live classification accuracy, account-specific provider latency/allowances and the full real twelve-minute break session still need evaluation; no live accuracy claim or deployment follows from these tests.
