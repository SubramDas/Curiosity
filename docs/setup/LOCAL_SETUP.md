# Local setup and prototype data use

This is the current setup guide. Earlier feasibility instructions are retained under [archive/phase-2](../archive/phase-2/PHASE_2_SETUP.md); their old Cloudflare plans, tool versions and note-only chat scope are historical.

## Start the guest app

Use **Node 22 or newer**. Run commands from the repository root:

```bash
npm ci
# If .env is missing, copy .env.example to .env, then edit it locally.
# Keep an existing configured .env; do not overwrite or commit it.
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on **http://127.0.0.1:8787**. Keep one dev server running; stop it before starting another. Restart after changing `.env` or backend code.

For the core guest journey, no Supabase migration, Firestore instance, downloaded dataset or model-training step is needed. Live discovery/teaching still requires network access and valid provider credentials. `npm test` and `npm run build` do not require live-provider keys.

## Configure external APIs

1. In your Google project, enable **YouTube Data API v3**, create an API key and restrict it to the API/use appropriate to your server. Add it as `YOUTUBE_API_KEY` in `.env`. Browser-referrer restrictions are not appropriate for requests originating from this Node backend.
2. Create an eligible **Gemini API** key and confirm which model and quota your project can use. Set `GEMINI_API_KEY` and the exact `GEMINI_MODEL` ID without a `models/` prefix. Public-video input availability depends on provider/model support.
3. Read the data-use section below before enabling `ALLOW_GEMINI_FREE_TEST=true`. The flag permits calls; it does not select a free billing tier or guarantee zero charges.
4. Keep `LEARNING_GRAPH_ENABLED=false` until its separate schema/content setup is complete. Inspect the other settings in [.env.example](../../.env.example) and the [configuration table](../evaluation/EVALUATOR_GUIDE.md#configuration).

No private account login or OAuth token is needed for public YouTube search/details. The official player streams the media; the app does not download videos. Use the actual provider dashboards for quota and billing availability rather than assuming the app's limits are provider entitlements.

Local project settings explicitly override inherited values for the keys listed in [the configuration loader](../../config/local-environment.mjs), including empty values. Keep `.env` in the repository root; moving documentation does not change where the app reads it.

## Prototype data-use acknowledgement

`ALLOW_GEMINI_FREE_TEST=true` acknowledges external model calls for non-sensitive adult prototype tests. Use the example questions in [the demo checklist](../evaluation/DEMO_CHECKLIST.md).

- Do not submit personal, sensitive or confidential information, credentials or private conversations during demo testing.
- Gemini requests can include the question, bounded recent history, selected-video context, public video URL and supplied source notes. Search terms go to YouTube; extracted topic terms go to Wikidata.
- Review the [Gemini API terms](https://ai.google.dev/gemini-api/terms) and your configured account's applicable data-use settings. Provider retention and usage rules are separate from the app's own storage behavior and can differ by service/account configuration. The flag is not a privacy guarantee, an age check or protection against sensitive input.
- The original developer experiment and this consent switch do not establish approval for a wider launch or use by children. Complete appropriate privacy/content review before broader use.
- The app does not persist chat history to its database, but generated recommendation queries and some input-derived decisions can enter bounded caches. Hashing cache keys is not anonymization. See [the source/storage inventory](../evaluation/DATA_SOURCES.md).

## Handle credentials

Keep keys in the ignored local `.env`, never in frontend code, Markdown, screenshots or issue reports. `.gitignore` prevents ordinary staging but does not encrypt files or undo a previous leak.

The existing cloud deployment uses Secret Manager references injected into Cloud Run at runtime. The browser intentionally receives only the Supabase URL and publishable/anon key for account access; privileged keys are rejected. Do not configure a Supabase service-role key. See [the deployment guide](../deployment/GOOGLE_CLOUD_DEPLOYMENT.md).

## Optional accounts and confirmation emails

For cross-device saving, supply `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for a project you control. Apply migrations [001](../../supabase/migrations/001_saved_topics.sql) and [002](../../supabase/migrations/002_video_progress.sql) in order, then run their [ownership checks](../../supabase/tests). Keep email confirmation enabled. Guest records do not automatically transfer to an account.

If confirmation mail does not arrive:

1. Check inbox/spam and request one resend; avoid repeated requests after a rate-limit response.
2. Inspect Supabase Authentication logs without sharing passwords, tokens or full email addresses.
3. Check sender/custom SMTP configuration and account-specific sending restrictions. A successful API response is not proof of delivery. [Supabase email setup](https://supabase.com/docs/guides/auth/auth-smtp).
4. Set Authentication's Site URL and allowed redirects for the app origins you use: `http://127.0.0.1:5173`, `http://localhost:5173` if needed, and the deployed address for hosted access. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
5. Confirm the address, return to the app and sign in with the existing password. The publishable key cannot administer email settings; a project owner must configure them.

The optional graph additionally requires migration 003 and reviewed catalog publication; follow [graph activation](../../backend/graph/README.md). A manifest flag or enabled feature is not proof of live publication.

## Verify and troubleshoot

```bash
npm test
npm run build
npm run benchmark -- search  # Plan only; does not call APIs
```

To verify live credentials with bounded examples, follow the [evaluator checklist](../evaluation/DEMO_CHECKLIST.md) or [benchmark instructions](../../experiments/benchmarks/README.md). Append `--live` only with a running app and available provider allowance. Legacy `phase2:*` commands are separate experiments, not the main user journey; some have their own counters outside the shared app queue.

Local usage/cache files remain under ignored `.local-data`. Restarting does not reset persisted usage or provider quota; do not delete counters to bypass limits. The supported deployment helper and frontend source paths are unchanged by the documentation move.

See [troubleshooting](../evaluation/EVALUATOR_GUIDE.md#troubleshooting) for missing configuration, unavailable video context, delayed labels, break timing and graph activation.
