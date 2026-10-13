# Curiosity: local Phase 2 prototype

A learning app experiment: search any topic, choose YouTube videos, ask a doubt, and return to grouped subjects. It is a private adult developer prototype, not ready for public launch.

## Run locally

Use Node 20.19 or newer. From the project folder:

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
4. Search AMD; both searches belong to Computing, as separate smaller topics.
5. Search “Income tax on GPU imports”; it has one home in Money and Business with related tags.
6. Open a related tag; it shows a preview without duplicating the topic or creating a tile.
7. Refresh; guest subject tiles remain in this browser. Reopening a saved query performs a fresh search, not a stored-video replay.
8. Enable the 30-second timer demo, then play a visible video or interact with chat. The normal setting is 12 active minutes. Skip the break or request up to three related candidates.

No understanding scores, learner tests, paid courses, or tile editing are included. The category labels are provisional and the fallback is General/Unsorted.

## Supabase saving

Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to `.env`, then restart the local server. Keep email confirmation enabled in Supabase.

1. Run [the migration](supabase/migrations/001_saved_topics.sql) **once** in the development project's SQL Editor. It creates the table, its access rules, and an index. Do not run it against a production database.
2. Run [the ownership check](supabase/tests/saved_topics_access.sql) in the development SQL Editor. It temporarily creates test records and rolls them back. If it errors, run `rollback;` before further SQL work and share the error without credentials.
3. Expand “Save across devices” in the app, create an account, confirm its email, then sign in.
4. Search a topic. Check for “Saved to your account,” not just a successful video search.
5. Refresh and sign in again. Your account topics should reopen. This prototype holds login tokens in memory and does not yet restore or refresh a login session automatically.

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

- `src/features`: accounts, topics, videos, chat, learning timer.
- `src/lib`: browser-to-server requests and display helpers.
- `server`: local API, Supabase connection, local usage limits.
- `experiments/phase-2`: provider experiments and the source-note fixture.
- `supabase`: development database migration and ownership check.
- `tests`: rule tests and repeatable browser journeys.

## Limits before wider use

- Video results and break candidates are unreviewed. Search ranking is not a quality guarantee. Entertainment relevance needs manual review.
- Chat has one small CUDA note fixture. It cannot inspect video contents, and validated source IDs do not prove answer accuracy.
- Guest saving stores our own query/category records, not YouTube metadata or transcripts. Browser storage can be cleared or unavailable.
- The API and limits are for one local developer process. A hosted version needs shared atomic limits, session refresh/revocation, stronger authentication controls, deletion/export, and release review.
- The selected dependencies are pinned in `package.json` and `package-lock.json`. A successful browser build does not establish Cloudflare deployment compatibility; that check is still pending.

Current evidence and remaining checks: [PHASE_2_RESULTS.md](PHASE_2_RESULTS.md).

## Scrolling videos and continuing playback

- Choose **Short videos** for a vertical scrolling feed. Only the current card has a player; short videos start muted when visible. YouTube controls remain available. The grouping uses duration up to three minutes, not confirmed official Shorts status or video orientation.
- Longer videos play directly above their selected result. **Continue watching** shows unfinished videos for the current topic, including saved videos no longer returned in the latest search.
- Progress is recorded every five seconds while playing, on pause/end, when leaving view, and when the player closes. Finished videos restart from the beginning. This records the last position, not verified learning or a percentage of content understood.
- Guests retain up to 200 recent playback records in this browser. Signed-in users save to their own Supabase records; guest records do not transfer into the account. After refreshing, sign in again to load account progress.
- For account progress, run [002_video_progress.sql](supabase/migrations/002_video_progress.sql) once in the development SQL Editor, then run [video_progress_access.sql](supabase/tests/video_progress_access.sql). This adds a separate table without changing saved topics. The test rolls back its temporary records; if it errors, run `rollback;` before further SQL work.
- Restart `npm run dev` to load the new server routes. The account migration and live account progress check remain pending until the founder runs them. Connection loss or abruptly closing the browser can lose the latest unsynced account position; the interface reports sync failures when the page remains open.
# Curiosity
