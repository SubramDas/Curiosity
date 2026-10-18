# Evaluation evidence and reproducibility

## Current functional checks

During this documentation update on **2026-10-18**, `npm test` passed **114 tests**: 10 legacy provider-service checks and 104 current tests. `npm run build` passed TypeScript checking and the production build, with the existing warning about a main bundle over 500 kB. [Machine-readable check summary](evidence/functional-checks.json).

These checks use simulated/controlled external dependencies, not real teaching-quality labels, live account isolation or a learner study. The verification terminal was Node **20.20.2**; this is recorded for transparency, not a change to the project's supported **Node 22+** setup. The deployment container uses Node 24. Current checks should be repeated in the evaluator's supported environment.

The browser suite was **not rerun** for this documentation-only update. A prior recorded run passed **63/64**; `tests/browser/universes.spec.ts:228` expected a missing “Other saved searches” control. This is historical evidence, not a freshly reproduced diagnosis or a claim that all current browser journeys pass. See [submission evidence](../../submission/README.md#evidence-and-scope).

## Recorded local API measurements

The founder ran the three live benchmark suites on **2026-10-18**, between 08:20 and 08:22 UTC. Each suite attempted **one case once**, against **http://127.0.0.1:8787**, not the hosted website.

| Suite          | Case                 | Observed end-to-end API time | Recorded result                                                                      |
| -------------- | -------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| Search         | `gpu-learning`       | **3,095.88 ms (3.10 s)**     | `allow`, three returned videos; first videos at 3,095.79 ms                          |
| Teacher        | `gpu-ai-explanation` | **4,429.66 ms (4.43 s)**     | General-knowledge answer, no video context/timestamp, two real video recommendations |
| Classification | `gpu-video`          | **4,584.70 ms (4.58 s)**     | `GPU architecture`, primary `science`, **provisional**, no Wikidata QID              |

The [sanitized benchmark summary](evidence/benchmark-summary.json) preserves public observations, dataset hashes, timestamps, source-file SHA-256 hashes and run metadata. Original complete runs remain in ignored `.local-data/benchmarks`; they are **not required downloads** and are not present in a fresh clone. Hashes identify the original local artifacts; the public summary is a projection, not a replacement raw run accepted by the report command.

Limitations of these observations:

- Zero reviewed cases: **no accuracy score** is reported. A request completing successfully is not a correct-content judgment.
- Each feature has one timing sample. No p95, sustained throughput, reliability percentage or population-level speed claim follows from this.
- Cache state is **unknown**. Do not label results “cold” or “warm.”
- Model and server revision were **unrecorded**. The client revision is preserved with a dirty-worktree marker; the original exact server/model environment is not fully reproducible.
- Timing includes API queueing and asynchronous polling, with a **1,500 ms polling interval**. It excludes browser rendering and YouTube playback startup.
- At the time, the local Gemini interval was recorded as **1,500 ms**; the current source/example uses **5,000 ms** and 30-day classification caching. These timings are historical, not predictions for the changed configuration.
- The interval is minimum spacing between request starts, not a fixed sleep added to every request. Internal queue/provider durations were not instrumented. **Do not subtract 1.5 seconds to invent “original” or parallel latency.**
- No raw model answers, personal identities or credentials are included in the public summary. Teacher factual correctness was not scored.

## Reproduce measurements with the current configuration

Start the configured app in one terminal:

```bash
npm run dev
```

In another terminal, inspect plans first:

```bash
npm run benchmark -- search
npm run benchmark -- teacher
npm run benchmark -- classification
```

With provider allowance available, run live suites sequentially:

```bash
npm run benchmark -- search --live
npm run benchmark -- teacher --live
npm run benchmark -- classification --live
```

Each defaults to one case / one trial. The tool writes `run.json`, `results.csv`, `report.md` and an anonymous user-study worksheet under ignored `.local-data/benchmarks`. It does not load credentials, start a second server, reset counters or bypass caches. The default target is the existing local app API.

Record the actual server configuration and source revision separately. Optional `--model` and `--server-revision` fields are operator-declared metadata, not automatic verification or configuration changes. For more cases/repeats, custom reviewed datasets and report regeneration, follow [the benchmark guide](../../experiments/benchmarks/README.md). Do not run legacy CLI experiments simultaneously against the same provider project: they are outside the app queue.

## What should be evaluated next?

| Question                             | Required evidence                                                                                            | Current status                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Are search intent decisions correct? | Balanced, human-reviewed learning/ambiguous/entertainment cases; expected decisions frozen before evaluation | Three draft cases only                                                               |
| Are returned videos educational?     | Human purpose labels with returned-video review coverage                                                     | Not established; precision can be measured, full recall is unavailable from this API |
| Are topic/Universe labels correct?   | Reviewed public-video metadata, accepted labels/QIDs, diverse subjects and ambiguity cases                   | One draft case; accuracy not established                                             |
| Are answers grounded and correct?    | Human source/claim review, general-vs-supported distinction, unsupported-claim recording                     | No current scored factual-quality dataset                                            |
| Do timestamps explain the question?  | Watch suggested segments and record relevance/correctness                                                    | Not established by structural timestamp validation                                   |
| Does one place reduce friction?      | Matched tasks in usual tools vs Revelink; completion, duration, app switches, anonymous observations         | No completed comparative user study                                                  |
| Does it improve learning?            | Appropriate knowledge assessments and study design                                                           | Not measured; viewing/exploration is not mastery                                     |
| Does the app handle load?            | Controlled concurrency, quotas, failures and representative latency distribution                             | No sustained-load claim                                                              |

The [manual demo checklist](DEMO_CHECKLIST.md) gives suggested questions and a blank review record. It is not a completed evaluation dataset. Do not change draft labels to “reviewed” without inspecting evidence and recording reviewer/date.

## Hosted status and evidence boundaries

The checked-in [deployment report](../../deployment/deployment-report.json) records the `revelink` Cloud Run service and deployment date. It does not record a source revision or establish that later local fixes are deployed. The demo URL should be checked in an incognito browser before submission and throughout evaluation.

`GET /api/health` returns `{"status":"ok"}` when the server responds. It does not call Gemini, YouTube, Firestore, Supabase or test the player. Pair uptime monitoring with a small manual core journey; avoid spending model quota on every minute's health probe.

Older deployment, presentation and phase-result documents contain dated observations. They are retained as history, not silently promoted into new production, accuracy or load claims. This documentation change does not deploy code, publish a Git commit or regenerate the deck.
