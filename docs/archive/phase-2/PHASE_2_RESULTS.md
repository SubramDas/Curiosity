# Phase 2 check results

## Desktop educational search guardrails — 2026-10-17

- Implemented the reviewed separate desktop Search destination, opened from header focus. It supports learning-angle choices, entertainment redirects, goal clarification, filtered results, empty/error states and cancellation. Accepted learning goals are saved; rejected queries are not. Selecting a result reuses existing playback, teacher and resume behavior.
- Added backend intent checks and metadata-purpose batches using only the configured Gemini model. Query decisions last six hours; per-video purpose decisions last 24 hours with metadata/model/policy keys. `SEARCH_GUARD_DAILY_LIMIT` defaults to 40 attempts/UTC day. Teacher → search → background classification priority shares the existing sequential queue. No provider counter was reset or model switched.
- Guarded ordinary search/pagination and user-supplied feed/teacher recommendation queries. Added short-lived, idempotent search jobs with polling. Existing breaks use a timed server permit, server-owned topic and one cached batch of at most three related clips; ordinary search flags cannot enable entertainment mode. The server's elapsed-time gate supplements the existing browser active-learning timer rather than proving active attention.
- Preserved guest/account topic keys and playback records. Kept account disclosure state in app coordination so the graph provider's identity remount no longer closes sign-in/account controls unexpectedly. Existing mobile screens remain; the separate mobile guardrail designs are not implemented.
- Verification: `npm test` passes ten legacy experiment checks and 67 current service/rule checks (77 total). The final browser regression passes all 44 simulated journeys, including six new desktop guardrail cases. Initial regression failures exposed changed navigation assumptions and account disclosure remounts; those were corrected before the passing run. Browser fixtures now reject unmocked app API requests. Representative desktop choice/redirect/result screenshots were inspected. Build/type checks pass with the existing main-bundle size advisory; source whitespace checks pass.
- These checks use simulated model/YouTube/account/player responses. They do not establish live search-policy accuracy, account-specific AI latency/allowances, or completion of a real twelve-minute break session. No new deployment or migration was performed. See [the implementation guide](../../../backend/search/README.md).

## Approved mobile UI implemented

- Added the phone shell, compact search/account header, bottom navigation, broad-topic screen, recent searches, full-screen teacher, viewport/keyboard handling and landscape player layout in `mobile-ui`. Existing desktop layout modules are retained.
- Reused shared accounts, teacher history, topic classification, search/cache, player and saved progress. Teacher opening pauses hidden playback; returning preserves the selected Short. Timestamp buttons return to the matching player. Previous/Next controls supplement Shorts scrolling. The account screen uses the existing confirmation/resend/sign-out actions.
- Build and TypeScript checks pass. All 35 existing service/rule checks and all 30 browser journeys pass. Nine mobile journeys cover 320/360/390/430-pixel widths, search/topics, video/teacher context, timestamps, simulated keyboard resize, Shorts, account access, saved playback, landscape, related breaks and allowance errors. A subsequent focused check confirms player positioning after rotation. `git diff --check` passes.
- Representative phone and landscape screenshots were inspected. Providers, accounts and the player are simulated in browser tests; physical-phone Safari/Android keyboard/autoplay and real account-sync checks remain before a wider release. No live API calls, database changes, quota changes or deployment were required for the UI work.

## Folder separation before mobile implementation

- Moved API modules to `backend`, navigation/layout/styles to `desktop-ui`, reusable frontend features to `shared`, and reserved `mobile-ui` with its approved design handoff. `src` retains the React entry and feature coordination.
- Extracted the current layout while preserving the rendered page structure. Moved the production YouTube provider, HTTP helper and checked source fixture into the backend, removing production imports from the experiments folder. Updated experiment/test imports and root dev/build configuration.
- `npm run build` passes, including TypeScript checks. All 35 existing service/rule checks and all 21 simulated browser journeys pass after the move. Browser journeys cover account persistence and isolation, search/topic grouping, playback/resume, Shorts, breaks, and teacher conversations/timestamps. These checks do not constitute new live provider or real-account verification.
- No new mobile UI, layout switching, database changes, quota changes, commit, or deployment was performed. Restart the root `npm run dev` process after the move.

Date: 2026-10-13.

## Configuration

The configuration check found all four required settings: YouTube key, Gemini key, Gemini model, and developer free-test confirmation. Key values were not displayed.

This checks whether settings are present, not whether the credentials are valid or whether the selected model is free in the account.

## Live checks attempted

| Check | Result | What this establishes |
|---|---|---|
| YouTube GPU search | `NETWORK_ERROR` | The request failed before a provider response was received |
| Gemini CPU/GPU question | `NETWORK_ERROR` | The request failed before a provider response was received |
| DNS lookup for `www.googleapis.com` | Failed with `EBUSY` | This workspace could not resolve the YouTube API host |
| DNS lookup for `generativelanguage.googleapis.com` | Failed with `EBUSY` | This workspace could not resolve the Gemini API host |

The observed blocker is this execution environment's network access. These results do not establish that the founder's keys are incorrect. No successful provider response, real answer, video batch, or speed measurement was obtained. No automatic retry was performed.

## Local checks

Ten simulated-response tests passed. They cover request parameters, pagination, duplicate removal, unavailable details, blank input, quota errors, sanitized network failures, developer data-use confirmation, unknown source rejection, answer reference mapping, and incomplete model output.

These checks do not establish live access, factual answer quality, browser playback, database saving, or shared quota enforcement.

## Next action

Network access was subsequently enabled and the developer reran both example commands successfully. The results below supersede the earlier network blocker.

## Successful live retry — 2026-10-13

- Both API hosts resolved and responded over HTTPS. Root URL HTTP 404 responses established connectivity, not credential validity.
- YouTube: two search calls and one details call returned 18 unique videos; two repeated results were removed. First batch took 358 ms; total search/details time was 867 ms. Returned details marked all 18 videos public and embeddable. Browser playback has not been tested.
- Gemini: one request using the configured `gemini-3.5-flash-lite` model returned a complete answer in 955 ms. It correctly described CPU host code launching GPU kernels, parallel threads, and concurrent CPU/GPU execution, matching the supplied note. Its source reference matched our stored NVIDIA link.
- Both keys worked for these requests. This does not establish the account's billing tier, remaining allowance, or accuracy for other questions. These timings are single observations, not load-test results or streaming measurements.
- No keys were printed. No full 20-question review was run.

Phase 2 remains open. Browser playback, saving/reopening, related-video review, timer behavior, and the full chat review still need implementation or verification.

## Browser prototype and further checks — 2026-10-13

This update supersedes earlier statements that no browser app exists.

### Implemented

- Local React/TypeScript/Vite screens and a Node API bound to localhost. Provider keys remain on the server. Dependencies are pinned with a lockfile.
- Any-topic YouTube search with batches, duplicate removal, original source details, an official player, and unavailable-video handling.
- Note-based chat and an optional related CUDA video drawn from actual search titles. This suggestion is unreviewed and is not cited as evidence for the answer.
- Guest query/category storage, broad topic tiles, alias reuse, ambiguity handling for CA, and related-subject previews that do not create tiles or move topics.
- A 12-minute active-learning timer with a 30-second demo mode. It excludes background pages, offscreen/non-playing videos, long suspended intervals, and double-counting simultaneous activity. It retains offered-break state across reopening and allows returning without requesting clips. Break candidates are capped at three and remain unreviewed.
- Supabase sign-up/sign-in, save/list code, a migration, and a rollback-only SQL ownership check. At this stage login was held in memory; this limitation was corrected on 2026-10-14 using the official Supabase library (see the account-session update below). Guest transfer remains later work.
- Persistent local request allowances and sanitized failure handling. These are for one developer server, not distributed hosting.

### Observed live behavior

- The browser displayed ten real YouTube search results and a real note-based chat answer.
- An actual previously fetched GPU video played through the embedded player. The browser reported `paused=false`, `currentTime=3.56`, and `readyState=4`. This confirms playback of that video, not all returned videos.
- Desktop and 390-pixel mobile screens were visually inspected. The mobile page had no horizontal overflow.
- Supabase authentication settings responded with HTTP 200. After the founder ran the migration, an anonymous table read was denied with HTTP 401 / code 42501. The founder reports that the requested ownership SQL check and account save/reopen journey work. This is user-reported verification; the developer did not independently observe the SQL output or test two real accounts.

### Chat review and configuration correction

- Twenty questions ran sequentially: ten supported by the note and ten unsupported/adversarial. All twenty matched the expected support/limitation flag, with no invented source/video references observed. The supported claims matched the fixture. The request for two sentences in case 7 was answered in one sentence, so formatting adherence was not perfect.
- Full-answer times: minimum 2.61 seconds, median 5.89 seconds, maximum 11.90 seconds. This was not a streaming or concurrent-user test. One initial attempt returned HTTP 503; the developer deliberately retried once. There is no automatic retry loop.
- An inherited terminal Gemini key had overridden `.env` during these and earlier chat checks. These observations do not establish the founder project's quota or billing tier. The loader was corrected and tested to explicitly prefer project settings.
- A new supported example using the actual `.env` Gemini key succeeded in 1.38 seconds with a valid source reference and note-supported claims. YouTube and Supabase settings matched their local file settings throughout the inspected configuration.
- Wider independent accuracy evaluation, Groq comparison if useful, reviewed content, and account allowance/billing verification remain open.

### Local verification

- Nineteen rule/service/configuration tests pass.
- Three repeatable browser journeys pass with simulated API responses: grouping/pagination/reload/tags, chat failure/break behavior, and unavailable-video handling.
- Type checks and the production browser build pass. The browser build did not contain the configured provider key values.
- One initial browser test failed while loading the page; its focused rerun and subsequent full run passed. This is recorded rather than counted as a clean initial run.

### Remaining Phase 2 work

1. The founder reports the SQL ownership check and account save/reopen work. Independently check two real accounts cannot access each other’s topics before a wider trial.
2. Review chosen videos/notes/break candidates, demonstrate a genuinely relevant video alongside an answer, and test real timer behavior for a complete session.
3. Verify free account allowances and deployment suitability, including Cloudflare CPU use. Complete concurrent chat and hosted checks; the local search check below covers only search.
4. Finish applicable platform/privacy review before inviting learners. No public release is implied by the local prototype.

## Follow-up confirmation and capacity check — 2026-10-13

- The founder replied “Yes, its working” to the combined request for the ownership SQL check and account save/reopen journey. These are founder-verified, not independently observed developer results.
- Three simultaneous live requests for “GPU explained for beginners” returned HTTP 200 and ten videos each in 410, 409, and 523 milliseconds. This measures the local search API only, not browser rendering, concurrent chat, or hosted capacity.
- Official published plans were checked again: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) lists free input/output for Gemini 3.5 Flash-Lite; [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase) lists 500 MB per Free project and 50,000 monthly active users. Published allowances do not verify this project's actual billing settings or remaining quota.
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) lists 100,000 requests/day and 10 ms CPU per Free request. The local Node server and file-based usage counter need a hosted adapter and shared usage storage before deployment. A browser build alone does not prove this fit.

## Seamless feed and saved playback — 2026-10-13

- Added short-video scrolling with one mounted player, muted visible autoplay, pausing on leaving view/tab, and long-video playback immediately above the selected result.
- Added validated playback records, guest storage, account list/save routes using the authenticated owner, and a separate Supabase migration/access test. Continue watching restores fresh details for saved video IDs absent from current search. Completion removes a video from the unfinished list.
- Twenty-two rule/service/configuration checks pass. Seven simulated browser journeys pass, including guest reload/resume, account load/save isolation from guest storage, short-player replacement, missing-result restoration, and completion. The short-feed check also passes at 390-pixel width without horizontal overflow. A mobile screenshot was inspected. Type checks and browser build pass.
- The new account test initially timed out because the test did not open the collapsed account form. The test interaction was corrected and the full browser suite passed. Duplicate React keys found during testing were corrected.
- These new playback/account journeys use a simulated YouTube player and simulated account responses; they are not a live account-progress or real media autoplay verification. The new SQL migration/access test and live account save/reopen remain founder actions. Earlier live video playback evidence predates this change.
- Saved progress is the last playback position, not a score or proof that the entire video was watched. Account writes are serialized and unload writes request browser keepalive, but abruptly closing or losing connectivity can lose unsynced positions.
- Official player methods and restrictions were checked against the [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference). Short grouping is a duration-based app view, not verified YouTube Shorts classification.

## Approved Figma layout implemented — 2026-10-14

- The founder approved implementation and asked for Trending followed by previously searched subject groups in the top bar. The Figma write returned those labels; further Figma reads hit the Starter plan MCP limit, preventing a fresh screenshot of the change.
- Implemented the header search/account controls, broad-topic sidebar, thumbnail video grid, Shorts shelf, mobile drawer, chat column, and shared Continue watching. Saved subjects appear once; Trending clicks do not create new searched-topic tabs. Existing break and playback/account behavior is retained.
- Added a real home-feed route with recent popular education results and up to two recent-search suggestion groups. A ten-minute, bounded server cache and existing local daily allowance limit repeated provider requests. Trending uses recent results ordered by views rather than claiming to reproduce YouTube's Trending chart. English audio and content quality are not guaranteed.
- The initial direct Education chart call returned HTTP 404. A recent-search implementation returned 20 playable videos. The first popularity batch was dominated by short clips, so the final version requests separate medium and short batches before loading details.
- 26 service/rule/configuration checks, nine simulated browser journeys, TypeScript checks, and the production build pass. Initial browser failures involved selectors shared by the sidebar/feed and progress cards; those checks were scoped to their intended controls. A new test's label mismatch and fetch typing were corrected before the passing run.
- Live home/search requests were also exercised through the new server on a temporary local port. No browser JavaScript errors or horizontal overflow were observed in the live mobile topic check. Screenshots cover desktop Home/topic views and mobile layouts. Account sync and player transitions in the repeatable suite use simulated responses, not live account/media verification.
- The founder's running server was still serving old routes; it was not terminated. Restarting that development process is required to use the new feed route. The previously supplied account-progress migration and live ownership/progress checks remain founder actions if not already completed.

- The final balanced provider adapter returned 20 videos from two successful search batches and one details call. The full home route then returned its empty/error state because the existing daily search counter was at 40. The limit was not raised or reset. A focused check verifies that the exhausted allowance makes no provider calls, names the limit, and returns no invented results. A final live Home screenshot attempt timed out waiting for cards under that limit; earlier live screenshots and the passing simulated layout checks provide the visual evidence.


## Account-session update — 2026-10-14

- Fixed lost login after refresh by adopting Supabase's official JavaScript library for persistent sessions and automatic token renewal.
- “Create account” signs in confirmed existing users with matching credentials before any signup request. New users still receive confirmation; unconfirmed accounts are asked to use their existing email.
- Sign-out uses Supabase and clears the saved browser session. Account topics are kept out of guest storage during sign-out; late account loads cannot replace a guest's topics.
- Verification: all 26 existing rule/service checks, 15 simulated browser journeys (including all six new account journeys), and TypeScript/production build pass. The first regression run passed 14 journeys; the Home/mobile-navigation test clicked a part of the backdrop covered by the sidebar. After correcting its click position, that journey passed separately. Account checks cover refresh, expired-token renewal, sign-out followed by refresh, guest/account separation, repeat account creation, new-account confirmation, unconfirmed accounts, wrong credentials, and account video progress.
- A temporary instance of the real local server returned the expected public account configuration; only presence and field names were printed, not key values. No real signups, confirmation emails, or authenticated Supabase calls were made for these checks. Live email and session behavior remain for the founder to verify after restarting `npm run dev`.

## Playback, sign-out, and email follow-up — 2026-10-14

- The founder reported a black player when reopening Continue watching, account topics remaining after sign-out, and no email for an unconfirmed second account.
- Saved playback now opens the known video directly instead of spending another search request and rebuilding the result feed first. The player cues the saved position without immediately seeking and pausing an unstarted video. Long players have an explicit Play/Resume button, scroll into view, and offer retry after player errors. A failed YouTube API load can be retried instead of retaining a rejected promise forever.
- Account changes reset the active search, selected video, topic view, and query. Pending searches are invalidated so a response arriving after sign-out cannot restore account results. Guest history remains separate.
- Unconfirmed accounts now have an explicit resend button. Signup/resend request a return to the current app origin. Delivery restrictions and email-rate errors have clear messages. Confirmation messages do not claim that an email was delivered.
- Read-only Supabase settings returned HTTP 200 and confirmed email signup and email confirmation are enabled. SMTP settings are not accessible with the publishable key; no account was created and no real email was sent in these checks.
- Verification: 26 rule/service checks and the production build pass. Browser regression and focused reruns cover 18 journeys, including leaving a video and resuming without another search, sign-out from an account topic, and confirmation resend/rate-limit errors. Initial new-test failures were corrected for signup/resend redirect query strings and the saved video's Continue label.
- A real YouTube iframe was created and reached its ready event without a player error in a guest browser check. Search/configuration responses were simulated to avoid spending API allowance; actual playback and live account progress still need founder confirmation. Email delivery remains unverified until the project sender is configured or its error is inspected.

## Persistent YouTube cache — 2026-10-14

- Added a bounded disk cache for search pages (six hours), individual video metadata (six hours), and Trending (one hour). Shared identical pending requests avoid duplicate calls; cached metadata survives restart. Home suggestions and topic search share the provider wrapper.
- Cache hits do not reserve local allowance. Failed requests are not cached; expired entries require a fresh permitted lookup rather than silently returning stale results. Expired data is removed on startup and periodic cleanup. The exhausted local usage record was not reset, and no real provider request was made for these tests.
- Verification: all 29 rule/service tests and TypeScript/production build pass. New checks cover concurrent requests, pagination, expiry/deletion, failed loads, bounds, overlapping metadata batches, and restart. An actual local-server route check uses simulated YouTube responses and isolated storage; it verifies search/details return HTTP 200 from cache after exhaustion/restart, while an uncached page remains blocked without a provider call.
- Documented Google's current separate search bucket and the daily/per-minute distinction in YOUTUBE_QUOTAS.md. This cache remains for one local server; shared hosted storage remains Phase 2 work.

## Teacher chat implementation — 2026-10-14

- Added general/topic-independent explanations, follow-up history, explicit related/unrelated/uncertain labels, real question-specific video search, and timestamp links derived from public-video input. Missing suggestions or unavailable video analysis do not fabricate results/times. Metadata-only decisions are tentative.
- Current-video context tracks both the selected long video and the active short. Timestamp buttons seek using the official player. Old replies identify their original video and can reopen it at the suggested point. Recommendations do not change the player until selected.
- Chat is also available before search. History is kept in memory across navigation; account changes and New conversation invalidate late replies. No database chat history or learner quizzes were added.
- 35 rule/service checks and type checks/build pass. Twenty existing/new browser journeys passed in the regression run; the added standalone-chat journey and expanded timestamp-navigation checks passed in focused reruns, for 21 covered journeys. Desktop/mobile chat screenshots were inspected and the 390-pixel check found no horizontal overflow.
- Live general example returned a compound-interest explanation with two provider video suggestions in 2.167 seconds. The first video example timed out at 20 seconds; video-specific requests now allow 60 seconds. A bounded manual check returned a related 00:37–00:43 section in 5.620 seconds using the configured Gemini 3.5 Flash-Lite model. The returned time is an AI suggestion, not independently verified accuracy. Developer checks used a separate recorded cap of three model requests, two media attempts, and six YouTube operations; it was not an unrestricted retry loop.
- Full details, default video-analysis limits, privacy/history behaviour, provider references, and remaining wider accuracy/load checks are in CHATBOT_PLAN.md. General explanations do not have live web grounding. No public release or complete Phase 2 is implied.

## Google Cloud deployment — 2026-10-14

- Deployed a public adult hackathon demo to https://curiosity-u2ubbw6fra-el.a.run.app in Mumbai. Ready revision `curiosity-00004-28h` receives all traffic. Founder availability target is December 31, 2026; this is not a scheduled shutdown or uptime guarantee.
- Production uses Node 24, Secret Manager, dedicated service identities and Firestore Standard cache/counters. Existing Supabase accounts remain. Founder confirmed the hosted return URLs.
- All 41 service/rule checks and the production build pass; thirty simulated desktop/mobile browser journeys passed. Hosted storage tests simulate Firestore transactions, while the deployed search/teacher checks use real services. The real Cloud Build container succeeded; local Podman execution was unavailable.
- Live pages/configuration/health return HTTP 200. Three simultaneous GPU searches returned ten videos each. A repeat after redeployment did not increase the stored daily provider count. Generic teacher returned an answer and two video recommendations. Firestore rules passed ten actual rules-API deny-access cases before deployment.
- Hosted account email delivery, real-device playback/progress, teaching accuracy and sustained load remain trial checks. Full Phase 2 and hackathon submission are not marked complete. See GOOGLE_CLOUD_DEPLOYMENT.md.
- Hosted desktop/mobile screenshots were inspected at 1440/390 pixels: ten search cards and no horizontal overflow. The live YouTube iframe opened without an app player alert. A browser-console 404 had no matching application failure and remains unattributed. Physical-phone playback is still a founder check. Firestore cache TTL policy is ACTIVE.

## Desktop Universe implementation

- Implemented the approved desktop Penpot Universe navigation, direct feeds, subject filters, per-video labels, overlap tags and unclassified results. Desktop long-video labels sit between title and creator; Shorts retain labels above video media.
- Normal desktop card clicks attempt playback from the saved position; the extra app Play/Resume button is removed. Existing topic keys, private account records and video progress remain unchanged. Mobile uses its existing presentation defaults.
- Universe feeds share the persistent YouTube cache and provider reservations; the new route skips unrelated Trending lookups. Subject filtering makes no additional provider calls. Title classification is provisional, not the deferred knowledge graph.
- Production build/type checks and all 45 service/rule checks pass. Thirty-four browser journeys are covered across regression and focused runs: initial full run passed 32 of 33, then the outdated visible-Watched assertion was corrected and passed separately; four Universe journeys (including one added failure case) passed in a focused run. All nine mobile journeys passed. Desktop screenshots were inspected. These browser checks simulate YouTube and accounts; they do not establish real playback or email delivery on every device.
- Restart the local dev server to load the new route. No new keys or SQL migration are required. This change has not been redeployed to Google Cloud.

## Gemini/Wikidata video classification — 2026-10-15

- Added `backend/classification` and a Wikidata provider. Gemini extracts a flat topic/focus from YouTube title, description, tags, channel and category; bounded Wikidata search/entity retrieval supplies concept candidates and selected relationships; a second Gemini request chooses a real candidate or provisional topic and one primary Universe plus direct related Universes. Only the existing configured model is used.
- Video labels now use server decisions rather than title keywords. Shared background requests keep search, Trending, Shorts, teacher recommendations, saved-video restoration and playback usable while labels arrive. Expandable +1/+2 tags do not open the player or duplicate primary Universe placement. Legacy saved-search keys/grouping and private records are preserved.
- Separate persisted classification allowance defaults to 40 model attempts/UTC day, normally two per new video. Classifications are cached by metadata/model/policy; Wikidata outages use a short-lived provisional result. Local and Firestore storage are supported, with deployment configuration prepared for the new cache namespace. No credentials, quota limits, Supabase schema or deployed revision were changed; the live check consumed the normal local allowances.
- `npm test`: all 57 service/rule checks pass (10 legacy experiment checks and 47 current checks). `npm run build`: TypeScript and production build pass. All 36 simulated browser journeys pass, including two new classification journeys. Desktop and 390-pixel mobile screenshots were inspected. JavaScript syntax and `git diff --check` pass.
- One bounded live public-video check used the existing configured Gemini model and shared local counters. It returned Science & Technology → Graphics card, provisional, with no related Universe. Wikidata returned a maxlag error; the fallback worked. Separate public API checks returned HTTP 200 for search/entity access. A successful live matched classification and broader subject accuracy remain unverified; simulated tests cover the matched path. No model switch, unrestricted retry or quota reset was used.
- Restart the development server and refresh to load the new route/configuration. No new key or SQL migration is needed. The public demo has not been redeployed. See `backend/classification/README.md` for exact prompts, flow, settings and limits.

## Sequential Gemini queue and visible-card classification — 2026-10-15

- Teacher and classifier adapters now share one Gemini requester/queue in the app server. One provider request runs at a time; teacher questions take the next available slot. Default minimum request-start spacing is 15 seconds, configurable with `GEMINI_REQUEST_INTERVAL_MS`. Provider timeout starts at dispatch rather than while queued. Overflow, shutdown and queue-wait expiry are bounded.
- Safe Gemini 429 handling distinguishes recognized daily quota violations from rate limits, observes retry delays for new work, and never automatically retries a failed model request. Recognized daily quota blocks clear when the Pacific calendar day changes. Scheduling/cooldown state is process-local; persistent app counters and caches remain. The current hosted one-instance setting is retained in prepared deployment configuration.
- Classification now returns short asynchronous job responses instead of holding HTTP requests open throughout queued work. Repeated polls share one job per video. The browser processes one video at a time, admits cards as they enter view, and removes queued offscreen cards. Waiting/finding states describe current work. Universe feeds admit three subject-checking candidates at a time, with an explicit action for more candidates.
- First-stage extracted topics are cached independently; manually retrying a failed resolution reuses the accepted extraction. The configured Gemini model, keys and daily allowance settings were preserved. No local counters were reset and no live model requests or deployment were performed during this scheduling change.
- Verification: production build/TypeScript pass; all 68 service/rule checks pass (10 experiment checks plus 58 current checks). The 36-journey browser regression passes, plus focused checks covering four classification journeys, for 38 distinct covered journeys. New checks exercise serialization/pacing/teacher priority, real adapter sharing, cooldown/daily blocking, queue bounds, asynchronous HTTP status, partial-stage cache reuse, single-video polling, visibility cancellation and scroll-triggered labels. An HTTP status test was corrected to wait for the asynchronous metadata lookup; a timing check exposed scheduling before the dispatch microtask, which was corrected to record actual dispatch. No live allowance was spent to exercise rate limits.
- Restart `npm run dev` and refresh to activate the backend queue. No new credential or SQL migration is required. Existing exhausted provider quotas still need their normal reset; the default interval is not a measurement of account RPM/TPM/RPD. See `backend/gemini/README.md`.
