# Prototype benchmarks

Developer-only evaluations of the running app. This tool reuses the actual HTTP API, so the app's existing Gemini queue, caches, validation, daily allowances and provider adapters remain in control. It does not start another app server, load credentials, change the model, reset counters or clear caches. Production code does not import these experiments.

## Start with a plan (no API usage)

```bash
npm run benchmark -- search
npm run benchmark -- teacher
npm run benchmark -- classification
```

These commands validate the datasets and print the selected workload without making network calls. Defaults: first case only, one trial. Use `--case-id football-ambiguous` to select another case or `--max-cases 3` to select more.

## Measure live behavior

Start the normal app with `npm run dev` in another terminal. The benchmark uses the existing API at `http://127.0.0.1:8787` and browser Origin `http://127.0.0.1:5173`.

```bash
npm run benchmark -- search --live
npm run benchmark -- teacher --live
npm run benchmark -- classification --live

# Two trials of the same query, preserving existing caches and counters:
npm run benchmark -- search --live --repeats 2

# A hosted build; use its actual model and revision identifiers if known:
npm run benchmark -- teacher --live \
  --base-url https://your-service.run.app \
  --model YOUR_CONFIGURED_MODEL --server-revision YOUR_DEPLOYED_REVISION
```

**Live runs consume the server's existing allowance.** A single search may use multiple model calls, and a new video classification normally uses two. The default is deliberately one trial. There is a hard limit of 30 trials per run. Requests run sequentially. Quota/rate-limit/configuration errors stop subsequent trials, which are recorded as skipped. There are no automatic failed-operation retries; classification polls never set `retry:true`. A timeout also stops the run because accepted server work may still finish after the client disconnects. Existing server fallback behavior remains unchanged.

Use `--help` for all flags. Trial timeout defaults to 180 seconds, including queue waiting and polling. Search jobs poll `/api/search/status`; classification polls its existing ID without resubmission. Search time to first returned videos and time to terminal completion are recorded separately. First-results timing includes the polling interval; it is not an internal provider timing or browser paint measurement.

The older hosted revision might not support the current asynchronous API. Missing/invalid contracts are failures, not successful empty results. Do not compare different revisions without recording them.

## Reports

Each live run creates an ignored, timestamped directory under `.local-data/benchmarks/` with:

- `run.json`: metadata, expectation snapshots, observations, failures and calculated summaries.
- `results.csv`: one row per trial, suitable for a spreadsheet.
- `report.md`: concise results and limitations for preparing the hackathon slide.
- `user-study-template.csv`: a manual worksheet for anonymised usability observations.

Files are updated after every trial, so completed results survive later failures. Output is created before sending requests. Files use restricted local permissions. Raw answers, provider error messages, credentials and conversation text are not stored; inputs are identified by case IDs and hashes. Use only public, nonpersonal sample inputs and reviewer aliases. Do not commit participant records or raw live runs. Review aggregate reports before sharing.

```bash
# Rebuild summaries after adding human reviews to a saved run's case expectations:
npm run benchmark -- report --run .local-data/benchmarks/YOUR_RUN/run.json
```

Report regeneration makes no API calls. It recalculates metrics from stored observations, not an old summary. A different output location can be specified with `--output`. Reuse an existing directory only when intentionally replacing its reports.

The tool records the client source revision (with `-dirty` when appropriate), Node version, target origin, dataset SHA-256 and timing settings. `--model` and `--server-revision` are **operator-declared server metadata**, not configuration changes or automatic verification of a deployed server. If omitted they remain unrecorded. No `.env` contents or API keys are read by the tool.

## Reviewed accuracy samples

The supplied cases are **drafts**, including their suggested expectations. Draft expectations never produce accuracy scores. The classifier case's public video ID is a starting candidate from earlier prototype discovery, not a newly verified/curated sample.

For a meaningful evaluation, review a balanced public sample, including clear education, entertainment and ambiguous cases. Review the actual evidence available to the app: query/goal for search intent; video metadata for topic classification. Freeze expectations before running the evaluation. For each case, set a reviewer alias, date and `status: reviewed`:

```json
{
  "id": "reviewed-gpu-query",
  "input": { "query": "How do GPUs work?" },
  "review": {
    "status": "reviewed",
    "reviewer": "reviewer-1",
    "reviewedAt": "2026-10-18",
    "expected": {
      "action": "allow",
      "videoLabels": {
        "s3yjlRkXhbA": "educational"
      }
    }
  }
}
```

Run a custom dataset with `--cases PATH/TO/cases.json`. For classification, expected fields are `primaryUniverse` (`science`, `commerce`, `arts` or null) and optional accepted `topicLabels` / `wikidataIds`. Topic matching uses an explicit accepted ID or normalized exact label; it does not use an AI judge or fuzzy similarity.

Measurements are deliberately named precisely:

| Measure | Definition |
|---|---|
| Search decision accuracy | Correct allow/choices/redirect decisions / attempted reviewed trials |
| Primary Universe accuracy | Correct primary Universe / attempted reviewed classification trials |
| Topic mapping accuracy | Accepted topic label or QID / attempted reviewed trials with topic expectations |
| Returned-video educational precision | Educational returned videos / returned videos with human purpose labels |

Failed attempted reviewed trials count as incorrect in decision/topic metrics. Skipped trials are excluded but shown explicitly. Repeats are multiple trials of one case, not independent samples. Distinct reviewed cases and attempts are reported separately.

`videoLabels` supports a **human audit of returned search videos**, with educational/entertainment/unclear labels. Unreviewed returned videos are excluded and review coverage is shown. This is **not full education-detector accuracy or recall**: the current public API does not expose all rejected candidates or raw purpose labels. Topic/Universe membership does not establish educational purpose. To claim full detector accuracy, a separate controlled-candidate evaluation is needed.

Teacher observations cover response presence, source basis, relation, video-context label, timestamp presence, recommendations and notices. They do not score factual correctness or timestamp accuracy. Those require human content review.

## Cache and speed interpretation

The API does not expose cache provenance, so every trial records `cacheState: unknown`. Initial/repeated trials are separated; neither is claimed to be a verified cold or warm request. The tool does not bypass approved caches to manufacture cold measurements.

Reports show medians and ranges for successful trials alongside failure/skip counts. They do not claim p95 or load capacity from a handful of requests. API timing excludes UI rendering and YouTube media startup. An AI answer succeeding does not prove teaching quality or learning improvement.

## Functional checks and user observations

Run existing commands separately and attach their actual output to your evaluation evidence:

```bash
npm test
npm run build
npm run test:browser
```

Browser regressions simulate providers/accounts/player; their durations are not live API benchmarks. Automated tests must not fall through to live services.

For usability, record anonymous participant aliases, the same task and workflow (`usual-tools` or `revelink`), completion, duration, context switches and difficulties in the worksheet. Balance the order of workflows across participants to reduce practice effects. Start with 5–10 adult volunteers. Keep this manual study separate from API metrics and do not equate watch time with understanding.
