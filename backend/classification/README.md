# Video topics and Universe classification

Implemented locally on 2026-10-15. Uses only `GEMINI_MODEL` / `GEMINI_API_KEY`; no alternate model or provider fallback. Wikidata requires no key. No database migration or public deployment was performed.

## Flow

1. A video appears immediately. The shared frontend classification client sends its ID to `POST /api/videos/classify` with `background: true` when the card enters view. One video is processed at a time per page; queued offscreen cards are removed. Short HTTP responses expose waiting/finding/ready/failed states, and polling reads the existing job without reissuing a model operation. Failed work retries only on a manual action.
2. The server obtains the video's real public, embeddable YouTube metadata through the existing cache. Browser-supplied titles, URLs, candidate IDs and labels are ignored.
3. Gemini extracts one flat English topic, an explanation of the main focus, up to two aliases, and whether metadata is sufficient. Input includes title (300 characters), description (5,000), channel (200), up to 25 tags (100 each), and category ID. No search query, user/account information, transcript or video media is sent.
4. Wikidata `wbsearchentities` searches labels/aliases for those names. This is candidate retrieval, not semantic/vector search. At most three searches yield at most six distinct concepts. `wbgetentities` fetches English labels/descriptions/aliases and selected P31/P279/P361/P2578/P101 relationships. One bounded hop supplies relationship target labels; no recursive graph traversal is used. The lookup has a 15-second total deadline and respects maxlag/rate-limit responses without automatic retries.
5. Gemini compares supplied candidates against the original metadata and focus, chooses a real supplied concept ID or null, and assigns one primary Universe and up to two directly related Universes. `universe-policy.mjs` contains the product definitions and cross-subject examples; `prompts.mjs` contains both complete prompts.
6. The server validates returned names, IDs and Universe membership. Matched topics use the candidate's canonical English label. No suitable concept or a Wikidata outage gives a provisional topic. Insufficient metadata can remain unassigned. A match establishes concept identity, not factual accuracy of the video or classification.
7. Search, Trending, Shorts, Continue watching, teacher recommendations and selected players share the frontend registry. Labels update as results arrive, with expandable +1/+2 details that do not start playback. Desktop Universe feeds include only primary-Universe matches. Three neutral subject-checking slots initially request candidate classifications; Explore more videos admits another three, avoiding classification of the entire hidden result set. Pending, unassigned or failed videos remain accessible in search/Trending and do not appear in every Universe. Mobile shows labels within its existing topic navigation.

## Boundaries

`classify-video.mjs` coordinates the process; `gemini-classifier.mjs` owns model requests and response validation. `providers/wikidata.mjs` owns external graph access. `classification-store.mjs` uses the same small cache interface as existing storage. Shared frontend modules do not import backend/layout code.

Existing saved-search categories, topic keys, accounts and playback progress are preserved. Their legacy grouping remains separate from per-video classification. No external graph is treated as the direct definition of our three Universes. Related tags never cause extra primary feed placements.

## Cache, limits and failures

- `VIDEO_CLASSIFICATION=true` enables the feature when the existing Gemini configuration and data-use confirmation are present; `false` disables it. Missing configuration hides labels without blocking videos.
- `CLASSIFICATION_DAILY_LIMIT=40` is a separate global UTC-day allowance of model requests: normally two per newly classified video, one if metadata is insufficient. It does not increase Gemini's provider quota or change teacher limits. Provider failures count; exhausted allowance stops further automatic classification work on that page. A manual Retry label action is available after failures.
- All app Gemini requests share one paced backend queue, with teacher priority. Default spacing is 15 seconds between starts, configurable with `GEMINI_REQUEST_INTERVAL_MS`. Classification jobs run one pipeline at a time across this server; cache hits and identical lookups reuse work. See [scheduler details](../gemini/README.md) for cooldown, daily-quota handling and process boundaries.
- Accepted classifications and first-stage topic extractions use 24-hour caches keyed by video ID, bounded metadata fingerprint, model and policy version. Retrying a failed second stage reuses the accepted extraction rather than repeating the first model request. Wikidata candidates last six hours. Temporary graph-outage results last five minutes, allowing later matching without repeatedly spending model requests on refresh.
- Local data is in ignored `.local-data/classification-cache.json`. Production injects a separate Firestore namespace, `curiosity_classification`, with bounded cache/index records and expiry cleanup. The deployment helper configures TTL and payload index exemptions for both public cache collections on the next deployment. Browser Firestore access remains denied.
- Model/network failures do not receive guessed keyword labels or trigger an alternative model. Gemini rate limits now identify the provider, distinguish recognized daily quota violations, and pause queued model work. The UI keeps videos watchable and offers manual label retry. Cached accepted classifications can be returned after allowance exhaustion.
- Metadata may omit the video's real focus. No classification is guaranteed correct or deterministic merely because temperature is zero or the topic matches Wikidata. Policy changes require incrementing `POLICY_VERSION`.

## Running

Restart `npm run dev`. Existing Gemini/YouTube settings are sufficient. Optional settings are documented in `.env.example`; no real settings are printed by the code.

One bounded live public-video check (normally two model calls, existing YouTube/cache allowance, no automatic retry):

```bash
npm run phase2:classify -- Kgcfj_KV-mo
```

The command shares the app's persisted counters; do not run another local server against the same usage file at the same time. Never delete counters to repeat requests.

## Evidence and limitations

Service/HTTP tests simulate providers and cover allowed IDs, metadata evidence, response validation, canonical/provisional topics, cache reuse, outage expiry, separate budgets and bounded external lookups. Browser tests simulate models/YouTube/accounts and exercise background rendering, primary-only placement, overlap expansion, retry and mobile labels.

One live configured-model check classified the public GPU example as Science & Technology → Graphics card, with no related Universe. Wikidata returned a maxlag response (replication lag above the requested five-second threshold), so this run exercised the provisional fallback; it did not establish a successful live graph match. Separate credential-free checks confirmed search/entity API access. Wider subject accuracy and an end-to-end live Wikidata match remain to review. No model/key was switched and no usage counters were reset.

Official references: [Wikidata search API](https://www.wikidata.org/w/api.php?action=help&modules=wbsearchentities), [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output).
