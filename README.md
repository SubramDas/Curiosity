# Revelink

**Watch. Discover. Connect the dots.**

Revelink brings educational video discovery, short-form exploration, an AI teacher and related topics into one learning workspace. The goal is to reduce app switching and make learning more engaging. Improved retention and learning outcomes have not yet been measured.

**[Live demo](https://revelink-u2ubbw6fra-el.a.run.app)** · Team SSRD · Team leader Subram Das

## Start here for evaluation

- [Evaluator guide](docs/evaluation/EVALUATOR_GUIDE.md): architecture, local setup, configuration, feature scope and troubleshooting.
- [Data sources and grounding](docs/evaluation/DATA_SOURCES.md): what data is used, provenance, storage, datasets and limitations.
- [Demo tasks and questions](docs/evaluation/DEMO_CHECKLIST.md): concrete inputs, expected behavior and manual review criteria.
- [Evaluation evidence](docs/evaluation/RESULTS.md): measured timings, reproducibility, test evidence and unmeasured claims.

The app and backend run on **Google Cloud Run**, shared caches/counters use **Firestore**, and optional accounts/user records use **Supabase**. The app is not hosted on Firebase Hosting. The availability target is December 31, 2026, dependent on active billing, credentials and quotas; see [deployment instructions](docs/deployment/GOOGLE_CLOUD_DEPLOYMENT.md).

[All documentation](docs/README.md) · [Current local setup and data-use instructions](docs/setup/LOCAL_SETUP.md)

## Run locally

Use **Node 22 or newer** and run commands from the repository root:

```bash
npm ci
# If .env is missing, copy .env.example to .env, then edit it locally.
# Do not overwrite an existing .env or commit credentials.
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on port **8787**. Restart after changing backend code or `.env`. Keep one local server running to avoid port and usage-file conflicts.

For live discovery and teaching, configure `YOUTUBE_API_KEY`, `GEMINI_API_KEY` and an available `GEMINI_MODEL`. Read [data-use notes](docs/setup/LOCAL_SETUP.md) before enabling `ALLOW_GEMINI_FREE_TEST=true`; it permits API calls, not free usage or a paid-quota exemption. Credentials are not bundled with the repository. Guest use does not require Supabase. See the [configuration table](docs/evaluation/EVALUATOR_GUIDE.md#configuration).

Account saving additionally requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, migrations [001](supabase/migrations/001_saved_topics.sql) and [002](supabase/migrations/002_video_progress.sql), and configured authentication redirects. Apply schema changes only in a database you own and intend to configure. Never use a service-role key in the browser/app configuration.

The optional graph needs migration 003 and reviewed published content; the example configuration keeps it disabled until setup. See [graph activation](backend/graph/README.md).

## Try the core journey

1. Search **“How do GPUs work?”**, select a video and start playback.
2. Ask **“How do the CPU and GPU work together in CUDA?”** Inspect the answer's source basis and link when supplied.
3. Ask **“Explain that more simply.”** The teacher uses recent conversation context.
4. Search **“football”** and **“funny meme compilations”** to examine clarification and educational redirection; AI wording/results can vary.
5. Enable **30-second timer demo**, keep playback visible, and request a related break. Normal sessions use 12 active minutes; demo mode still applies content and quota checks.
6. Refresh and check guest history/progress. Account saving is a separate optional journey.

[Full checklist, including video-context questions and limitations](docs/evaluation/DEMO_CHECKLIST.md).

## Data and AI behavior

- YouTube Data API supplies real public video metadata; the official embedded player streams media. Instagram integration is a future idea, not an implemented data source.
- Gemini assesses search intent and educational purpose, extracts topics, resolves Wikidata candidates and answers questions. Existing models are called through the Gemini Developer API; no model is trained or fine-tuned here.
- The teacher distinguishes **checked notes**, **video analysis** and **general knowledge**. One small developer-prepared CUDA note fixture is included. This is not a broad verified curriculum or a vector-based RAG system.
- Wikidata supplies candidate concept IDs and relationships for matching. Concept matching does not verify a video's factual accuracy.
- The draft graph catalog and benchmark cases are not approved teaching content or a reviewed accuracy dataset.

Read [the data-source inventory](docs/evaluation/DATA_SOURCES.md) before making grounding or accuracy claims.

## Verify the code

```bash
npm test
npm run build
npm run test:browser
```

Service/rule tests use controlled dependencies. Browser tests simulate APIs, accounts and playback; they do not establish live-provider performance. Playwright uses `CHROME_PATH` or `/usr/bin/google-chrome` when available; otherwise install its browser with `npx playwright install chromium`. A historical browser run had one legacy navigation failure; see [evidence and scope](docs/evaluation/RESULTS.md).

API benchmarks use the existing running server:

```bash
npm run benchmark -- search                 # Plan only; no API calls
npm run benchmark -- teacher                # Plan only
npm run benchmark -- classification         # Plan only
# Append --live to run a suite with real provider allowance.
```

[Benchmark instructions](experiments/benchmarks/README.md) explain custom datasets, reviewed labels and timing limitations. Raw runs remain in ignored `.local-data/benchmarks`; a sanitized historical summary is included in [evaluation evidence](docs/evaluation/evidence/benchmark-summary.json).

## Operational limits

Classification defaults to **400 model requests per UTC day**, usually two per uncached video. Search/metadata, search guardrails, chat and video analysis have separate app caps. Gemini requests share a process-local queue with **5 seconds between starts**, teacher priority and provider cooldowns. These are app settings, not verified provider entitlements or an enforced combined 500-request budget. Provider RPM, token and daily quotas still apply.

YouTube metadata is cached for six hours, Trending for one hour, and accepted topic extraction/classification for 30 days. Wikidata-outage classifications last five minutes. Changed metadata/model/policy causes fresh classification; capacity eviction may remove entries earlier. Cloud Run uses Firestore caches and atomic counters; local development uses ignored files. Usage survives restarts and deployment. See [classification](backend/classification/README.md), [search](backend/search/README.md), [scheduler](backend/gemini/README.md) and [YouTube cache](backend/cached-youtube.mjs).

The health endpoint `/api/health` checks that the server responds, not Gemini, YouTube, accounts or remaining quota. Check the actual guest journey during evaluation. Hosted confirmation email delivery, two-account isolation, real-device playback, sustained load, answer correctness and learning outcomes require further checks.

## Code map

| Location                                                   | Responsibility                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `src`                                                      | React entry and coordination of navigation and features             |
| `shared`                                                   | Reusable frontend learning, search, chat, accounts and playback     |
| `desktop-ui`, `mobile-ui`                                  | Separate responsive layouts; full feature parity is not assumed     |
| `backend/chat`, `backend/search`, `backend/classification` | Teacher, search guardrails and topic mapping                        |
| `backend/providers`, `backend/gemini`                      | Provider adapters and shared request scheduling                     |
| `backend/storage`, `supabase`                              | Shared cache/counter adapters, account access and SQL migrations    |
| `backend/graph`, `content/graph`, `scripts/graph`          | Optional graph feature and reviewed publication workflow            |
| `experiments/benchmarks`                                   | API benchmarks and draft evaluation cases                           |
| `experiments/phase-2`                                      | Historical feasibility scripts and narrow note-only chat experiment |
| `tests`                                                    | Automated service/rule and browser checks                           |
| `design`                                                   | Penpot handoffs and approved design decisions; Figma is archival    |
| `deployment`, `submission`                                 | Cloud Run release helper and hackathon presentation artifacts       |

[Architecture](ARCHITECTURE.md) · [Product vision](docs/product/STARTUP_IDEA.md) · [Design handoff](design/review/DESIGN_REVIEW.md) · [Deployment](docs/deployment/GOOGLE_CLOUD_DEPLOYMENT.md)

Phase plans, results and submission artifacts contain dated development evidence. Their older model, link, UI or deployment statements should be read as historical records. The evaluator documents describe current source behavior; a successful deployment record alone does not verify every feature on the live site.
