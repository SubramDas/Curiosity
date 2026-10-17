# Curiosity

A learning app experiment: search any topic, choose YouTube videos, ask a doubt, and return to grouped subjects. A public adult hackathon demo is deployed on Google Cloud; wider release checks remain.

**Live demo: https://curiosity-u2ubbw6fra-el.a.run.app**

Availability target: December 31, 2026. See [deployment details](GOOGLE_CLOUD_DEPLOYMENT.md) for configuration, verification and remaining checks.

## Run locally

Use Node 22 or newer. From the project folder:

```bash
npm ci
# Create .env from .env.example if it does not already exist.
# Add service settings in your editor; never commit the .env file.
npm run dev
```

Open **http://127.0.0.1:5173**. Keep the terminal running; press Ctrl+C to stop it. The browser and API are bound to this computer, not published to the internet.

Restart `npm run dev` after changing `.env` or server code. If port 8787 is already in use, stop the earlier prototype in its terminal first. Avoid running two copies against the same local usage record.

If npm cannot write to its normal cache, use `npm --cache /tmp/startup-npm-cache ci`. Do not change system directory permissions to install this project.

## What to try

1. Search “I want to know about GPUs”; choose a video and start playback.
2. Load another batch of results. Repeated videos should appear once.
3. Ask “How do the CPU and GPU work together in CUDA?” Check the source link.
4. Search AMD; both searches appear in Science & Technology on desktop (Computing & Tech on mobile), as separate saved searches.
5. Search “Income tax on GPU imports”; it has one home in Money and Business with related tags.
6. Open a related tag; it shows a preview without duplicating the topic or creating a tile.
7. Refresh; guest subject tiles remain in this browser. Reopening a saved query reuses cached results when available; YouTube still streams the video.
8. Enable the 30-second timer demo, then play a visible video or interact with chat. The normal setting is 12 active minutes. Skip the break or request up to three related candidates.

No understanding scores, learner tests, paid courses, or tile editing are included. The category labels are provisional and the fallback is General/Unsorted.

## Supabase saving

Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to `.env`, then restart the local server. Keep email confirmation enabled in Supabase.

1. Run [the migration](supabase/migrations/001_saved_topics.sql) **once** in the development project's SQL Editor. It creates the table, its access rules, and an index. Do not run it against a production database.
2. Run [the ownership check](supabase/tests/saved_topics_access.sql) in the development SQL Editor. It temporarily creates test records and rolls them back. If it errors, run `rollback;` before further SQL work and share the error without credentials.
3. Expand “Save across devices” in the app, create an account, confirm its email, then sign in.
4. Search a topic. Check for “Saved to your account,” not just a successful video search.
5. Refresh. You should remain signed in and your account topics should reopen. The official Supabase JavaScript library saves the session in this browser, renews expired tokens, and clears the saved session when you sign out.
6. If you already have a confirmed account, entering its correct email and password under “Create account” signs you in without another confirmation email. A new account still needs confirmation; an existing unconfirmed account can request another confirmation email. A wrong password never grants access.

The browser receives only the Supabase URL and the validated publishable (or legacy anon) key from `/api/config`. This public key is intended for browser use; privileged keys are rejected by the server. YouTube and Gemini secrets remain on the server. Sign-in now goes directly to Supabase through its official library; saved-topic and progress routes still verify the user and use database access rules.

Guest topics and account topics are separate; guest-to-account transfer is not implemented. The founder reports that the SQL ownership check and account save/reopen work in the development project. Independent checks with two real accounts remain before a wider trial. No privileged Supabase key is needed by the app.

## Checks

```bash
npm test                 # API handling, topic rules, timer rules, local limits
npm run build            # Type checks and production browser build
npm run test:browser     # Repeatable browser checks with simulated API responses
npm run phase2:search    # Live YouTube check; consumes API allowance
npm run phase2:chat      # Live example chat; consumes API allowance
npm run phase2:review-chat # Up to 20 live questions; consumes remaining local chat allowance
```

Browser checks use `/usr/bin/google-chrome` if present, or `CHROME_PATH` if set. Otherwise install Playwright Chromium with `npx playwright install chromium` in a normal writable development environment.

Local browser API limits default to 40 search calls and 25 chat calls per UTC day. The usage record survives server restarts in ignored `.local-data/usage.json`. Failed attempts count conservatively. The command-line example checks are separate and do not reserve from this local record; they still consume provider allowance. The chat review shares the local record. Do not delete it to bypass provider quotas.

## Project layout

- `backend`: local and hosted API, provider connections, caching, Supabase access and usage limits.
- `desktop-ui`: current layout, navigation and styles, including the existing narrow-screen fallback.
- `mobile-ui`: approved phone layout, bottom navigation, full-screen chat, search/topics screens and mobile styles.
- `shared/features`: reusable accounts, topics, videos, chat, progress and learning timer.
- `shared/lib` and `shared/components`: frontend API helpers and reusable visual helpers.
- `src`: React entry and application state coordination.
- `experiments/phase-2`: developer checks and the legacy note-only chat experiment.
- `supabase`: development database migration and ownership check.
- `tests`: rule tests and repeatable browser journeys.

See [the architecture guide](ARCHITECTURE.md) for module responsibilities and dependency rules. Run commands from the root; `npm run dev` starts `backend/dev.mjs`. The app now selects the mobile layout by screen size while retaining the desktop layout. See [the mobile implementation guide](mobile-ui/README.md) for behaviour and checks.

## Limits before wider use

- Video results and break candidates are unreviewed. Search ranking is not a quality guarantee. Entertainment relevance needs manual review.
- Chat now answers broader questions, uses supplied CUDA notes where applicable, and can analyze supported public YouTube videos for relevant sections. General explanations are labeled separately from supplied-note/video explanations. Recommendations and AI timestamps are not independently reviewed; see [CHATBOT_PLAN.md](CHATBOT_PLAN.md).
- Guest saving stores our own query/category records, not YouTube metadata or transcripts. Browser storage can be cleared or unavailable.
- Hosted cache and daily counters use Firestore transactions. Stronger abuse controls, deletion/export and broader release review remain.
- Dependencies are pinned in `package.json` and `package-lock.json`. The Google Cloud container build and live provider checks passed.

Current evidence and remaining checks: [PHASE_2_RESULTS.md](PHASE_2_RESULTS.md).

The founder selected Google Cloud for hosting. See [the Cloud Run deployment preparation](GOOGLE_CLOUD_DEPLOYMENT.md). Production startup, persistent shared cache/counters and hosted configuration are implemented. The service is deployed in Mumbai.

## Scrolling videos and continuing playback

- Choose **Short videos** for a vertical scrolling feed. Only the current card has a player; short videos start muted when visible. YouTube controls remain available. The grouping uses duration up to three minutes, not confirmed official Shorts status or video orientation.
- Longer videos play directly above their selected result. **Continue watching** shows unfinished videos for the current topic, including saved videos no longer returned in the latest search.
- Progress is recorded every five seconds while playing, on pause/end, when leaving view, and when the player closes. Finished videos restart from the beginning. This records the last position, not verified learning or a percentage of content understood.
- Guests retain up to 200 recent playback records in this browser. Signed-in users save to their own Supabase records; guest records do not transfer into the account. After refreshing, the saved sign-in restores account progress automatically.
- For account progress, run [002_video_progress.sql](supabase/migrations/002_video_progress.sql) once in the development SQL Editor, then run [video_progress_access.sql](supabase/tests/video_progress_access.sql). This adds a separate table without changing saved topics. The test rolls back its temporary records; if it errors, run `rollback;` before further SQL work.
- Restart `npm run dev` to load the new server routes. The account migration and live account progress check remain pending until the founder runs them. Connection loss or abruptly closing the browser can lose the latest unsynced account position; the interface reports sync failures when the page remains open.
# Curiosity

## Approved desktop layout

The app now uses the approved [Figma layout](https://www.figma.com/design/miSY1sBxnsGIfjjUgx6Djp?node-id=5-2): search and sign-in in the header, saved broad subjects in the sidebar, thumbnail videos, a Shorts shelf, and chat beside topic results. Mobile navigation opens from the menu button.

The top bar shows **Trending**, then subjects from successful saved searches. Trending contains recent popular learning videos from YouTube; suggestions use up to two saved searches. English is preferred, but other languages can appear. Views are not a quality review.

**Restart your existing `npm run dev` process** to load the new `/api/feed/home` route. No new keys, packages, or database migration are required for the redesign. Account playback sync still needs the previously documented video-progress setup.

See [the design handoff](design/review/DESIGN_REVIEW.md) for the implementation, optional features, and verification details.


### Playback and account troubleshooting

- Continue watching reopens a saved video directly. Use **Resume video** to play from the saved position. Player failures offer **Retry player** and an Open on YouTube link.
- Signing out closes the account's active topic view and returns to guest history. Guest searches made before signing in may still appear; they do not belong to the signed-out account.
- If an account is unconfirmed, use **Resend confirmation email**. A successful request does not guarantee inbox delivery. Sender setup, rate limits, and allowed confirmation-return URLs are documented in [PHASE_2_SETUP.md](PHASE_2_SETUP.md#missing-confirmation-emails).

## YouTube result cache

Search pages and individual video details are reused for **six hours**; Trending is reused for **one hour**. The server stores this metadata in ignored `.local-data/youtube-cache.json`, so it survives page refreshes and server restarts. It caches video IDs, titles, channels, and playback details; YouTube continues streaming media directly. It never stores account records or credentials in this cache.

- Identical simultaneous requests share one provider request. Pagination tokens and search settings distinguish result pages.
- Home recommendations and topic searches use the same search/detail cache. Overlapping video-detail batches reuse individual records.
- Fresh cache hits spend no local allowance and remain available after the local limit is reached. New or expired results still require allowance. Failures are not cached; expired data is not served as a fallback.
- Up to 500 entries are retained. Expired entries are deleted on startup, writes, and a 15-minute cleanup while the server runs. Cache files have restricted permissions. Query keys are hashed rather than storing the original query as the key.
- Restart `npm run dev` to use this change. Existing exhausted usage is not reset, and results fetched before this cache existed are not automatically recovered. Future successful requests populate the cache.
- This is a cache for one local server. Hosted deployments need shared storage. See [YouTube quota explanations](YOUTUBE_QUOTAS.md).


## Teacher chat

Use **Ask a question** before selecting a video, or ask beside the video you are watching. You can ask about another subject without changing the player. Replies explain whether the question relates to the video, give an answer, and offer up to two actual YouTube results when a matching video section is unavailable. **Watch at …** seeks to an AI-matched section; timing may be approximate. An older reply can reopen its original video at the suggested time.

Follow-up buttons offer simpler explanations, examples, or more depth. The conversation remains available while navigating this page; refresh, New conversation, or an account change clears it. No conversation is stored in the database in this version. Generated recommendation keywords can use the public YouTube metadata cache; question/answer history is not stored in that cache.

Restart `npm run dev` for the new chat route. `CHAT_VIDEO_CONTEXT` defaults to enabled; set it to `false` to use text and notes only. `VIDEO_CHAT_DAILY_LIMIT` defaults to eight analysis attempts per UTC day. Videos longer than 30 minutes, private/unlisted videos, missing details, or exhausted analysis allowance use a text explanation without a timestamp. Unsupported video-input HTTP 400 responses permit one text fallback; network errors are reported without automatic retries. A fallback consumes another chat request. Video requests have a 60-second deadline; ordinary text requests retain 20 seconds. Live web fact-checking is not enabled.

`npm run phase2:teacher-check` runs fixed public developer examples with a separate persisted limit of three model requests, two video attempts, and six YouTube operations per UTC day. Results are ignored under `.local-data/teacher-check`. Do not erase the usage record to repeat calls. These checks consume real provider allowance; they are separate from the browser app's local counter.

## Desktop Universe update

Desktop navigation now uses **Science & Technology**, **Commerce & Business**, and **Arts & Humanities**, with Trending as the default. Universe feeds open directly into videos and subject filters. Long-video labels appear between the title and creator name. A normal video click restores saved playback without a separate app Resume button.

Older searches and progress are preserved. Classification is a provisional rule system; unclear videos remain watchable without a label. Phone navigation remains at its previous design. See [the desktop implementation guide](desktop-ui/features/universes/README.md).

Restart `npm run dev` for the new backend feed route. No new keys or database migration are needed. This update has not been redeployed to the public demo.

## Gemini and Wikidata video labels

Video labels now use background Gemini classification with Wikidata concept matching, replacing video-title keyword rules. One flat topic and one primary Universe determine placement; expandable +1/+2 labels show substantial connections to other Universes. Unmatched concepts remain provisional. Browsing and playback do not wait for classification.

Uses only the existing `GEMINI_MODEL` and credentials. Restart `npm run dev`; no SQL migration is needed. Optional `VIDEO_CLASSIFICATION` and `CLASSIFICATION_DAILY_LIMIT` settings are in `.env.example`. The default separate classification allowance is 40 model requests per UTC day, normally two requests per uncached video. The provider's own allowance still applies.

See [the classification guide](backend/classification/README.md) for prompts, inputs, caching, failure behaviour and live-check evidence. Legacy saved-search grouping is preserved; mobile Universe navigation remains separate work. This update has not been redeployed.


## Sequential Gemini requests

Teacher and video classification now share one backend queue: one Gemini request at a time, teacher priority, and a default 15-second interval between request starts (`GEMINI_REQUEST_INTERVAL_MS`). Videos request labels when they enter view; queued offscreen work is removed. Waiting/finding labels and asynchronous status polling keep browsing responsive. Accepted topic extraction is reused if the second stage needs a manual retry.

Gemini rate limits pause new work, and recognized daily quota errors block it until the provider's next daily reset. This cannot restore an already exhausted provider allowance. Exact account limits have not been supplied; the starting interval is configurable rather than a guarantee against all rate/token limits. Restart `npm run dev` and refresh. No live model requests, model changes, quota resets or deployment were made for this update. See [the scheduler guide](backend/gemini/README.md).

## Learning graph implementation

A local implementation of Explore map is prepared: shared constellation map, Map/Feed views, desktop/mobile integration, personal discovery and 30-second exploration achievements. It defaults off. Apply the new Supabase migration, review/publish catalog content, and enable `LEARNING_GRAPH_ENABLED=true` before using it. The starter has 30 concepts/26 connections and deliberately no unreviewed videos or current-news stories.

See [setup, publication, evidence and limitations](backend/graph/README.md) and [the implementation reference](GRAPH_IMPLEMENTATION_PLAN.md). No migration, live provider check or deployment was performed for this feature.
