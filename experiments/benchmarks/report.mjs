import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { scoreResults, validateCases } from "./score.mjs";

export function timingSummary(rows, field = "elapsedMs") {
  const values = rows
    .filter((row) => row.status === "success" && Number.isFinite(row[field]))
    .map((row) => row[field])
    .sort((a, b) => a - b);
  if (!values.length)
    return { count: 0, medianMs: null, minMs: null, maxMs: null };
  const middle = Math.floor(values.length / 2);
  return {
    count: values.length,
    medianMs:
      Math.round(
        (values.length % 2
          ? values[middle]
          : (values[middle - 1] + values[middle]) / 2) * 100,
      ) / 100,
    minMs: values[0],
    maxMs: values.at(-1),
  };
}

export function summarizeRun(run) {
  const count = (status) =>
    run.results.filter((row) => row.status === status).length;
  return {
    success: count("success"),
    failed: count("failed"),
    skipped: count("skipped"),
    httpRequests: run.results.reduce(
      (sum, row) => sum + (row.requests ?? 0),
      0,
    ),
    terminal: timingSummary(run.results),
    firstResults: timingSummary(run.results, "firstResultsMs"),
    initialTrials: timingSummary(run.results.filter((row) => row.repeat === 1)),
    repeatedTrials: timingSummary(run.results.filter((row) => row.repeat > 1)),
    quality: scoreResults(run.cases, run.results, run.suite),
  };
}

export function validateRun(run) {
  const invalid = () => {
    throw new Error(
      "Invalid benchmark report input. Use a saved version-1 run.json.",
    );
  };
  if (
    !run ||
    run.schemaVersion !== 1 ||
    !["search", "teacher", "classification"].includes(run.suite) ||
    run.mode !== "live-api" ||
    !Array.isArray(run.cases) ||
    !Array.isArray(run.results) ||
    run.results.length > 100 ||
    !run.metadata ||
    typeof run.metadata.target !== "string"
  )
    invalid();
  const ids = new Set(run.cases.map((sample) => sample?.id));
  // Saved runs omit question/history text. Validate expectation snapshots using
  // harmless placeholder inputs; scoring never needs the original private text.
  const placeholder =
    run.suite === "search"
      ? { query: "public sample" }
      : run.suite === "teacher"
        ? { question: "public sample", topic: "" }
        : { id: "abcdefghijk" };
  validateCases(
    run.cases.map((sample) => ({ ...sample, input: placeholder })),
    run.suite,
  );
  const trials = new Set();
  for (const row of run.results) {
    if (
      !ids.has(row?.caseId) ||
      !["success", "failed", "skipped"].includes(row?.status) ||
      !Number.isInteger(row.repeat) ||
      row.repeat < 1
    )
      invalid();
    const trial = `${row.caseId}:${row.repeat}`;
    if (trials.has(trial)) invalid();
    trials.add(trial);
    if (
      row.status !== "skipped" &&
      (!Number.isFinite(row.elapsedMs) ||
        row.elapsedMs < 0 ||
        !Number.isInteger(row.requests) ||
        row.requests < 1)
    )
      invalid();
    if (
      row.firstResultsMs != null &&
      (!Number.isFinite(row.firstResultsMs) ||
        row.firstResultsMs < 0 ||
        row.firstResultsMs > row.elapsedMs)
    )
      invalid();
    if (
      row.status === "success" &&
      run.suite === "classification" &&
      (typeof row.observation.topicLabel !== "string" ||
        !["science", "commerce", "arts", null].includes(
          row.observation.primaryUniverse,
        ))
    )
      invalid();
    if (
      row.status === "success" &&
      run.suite === "search" &&
      !["allow", "choices", "redirect"].includes(row.observation.action)
    )
      invalid();
    if (
      row.status === "success" &&
      (!row.observation ||
        (run.suite === "search" && !Array.isArray(row.observation.videoIds)))
    )
      invalid();
  }
  return run;
}

const cell = (value) => {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export function resultsCsv(run) {
  const fields = [
    "caseId",
    "repeat",
    "status",
    "elapsedMs",
    "firstResultsMs",
    "requests",
    "cacheState",
    "errorCode",
  ];
  return (
    [
      fields.join(","),
      ...run.results.map((row) =>
        fields.map((field) => cell(row[field])).join(","),
      ),
    ].join("\n") + "\n"
  );
}

export function markdownReport(run) {
  const s = summarizeRun(run);
  const ms = (value) => (value === null ? "Not measured" : `${value} ms`);
  const clean = (value) =>
    String(value ?? "unrecorded").replace(/[\r\n|`<>]/g, " ");
  const quality = Object.entries(s.quality.metrics).map(
    ([name, value]) =>
      `| ${name} | ${value.correct}/${value.total} (${value.percentage}%) |`,
  );
  return [
    `# ${run.suite} prototype benchmark`,
    "",
    `Measured: ${clean(run.startedAt)}. Mode: **live API**. Target: ${clean(run.metadata.target)}.`,
    `Run state: ${run.finishedAt ? "finished" : "in progress or interrupted; partial results"}.`,
    `Client revision: ${clean(run.metadata.clientRevision)}; server revision: ${clean(run.metadata.serverRevision)}.`,
    `Server model: ${clean(run.metadata.model)} (operator-declared, not independently verified).`,
    `Dataset SHA-256: ${clean(run.metadata.datasetSha256)}.`,
    "",
    "| Metric | Result |",
    "|---|---|",
    `| Successful / failed / skipped trials | ${s.success} / ${s.failed} / ${s.skipped} |`,
    `| HTTP requests, including polling | ${s.httpRequests} |`,
    `| Terminal latency median; range | ${ms(s.terminal.medianMs)}; ${ms(s.terminal.minMs)}–${ms(s.terminal.maxMs)} |`,
    `| Initial trial median (${s.initialTrials.count} successes) | ${ms(s.initialTrials.medianMs)} |`,
    `| Repeated trial median (${s.repeatedTrials.count} successes) | ${ms(s.repeatedTrials.medianMs)} |`,
    `| First visible videos median (${s.firstResults.count} successes) | ${ms(s.firstResults.medianMs)} |`,
    `| Distinct reviewed cases / attempted reviewed trials | ${s.quality.distinctReviewedCases} / ${s.quality.reviewedAttempts} |`,
    ...quality,
    "",
    ...(quality.length
      ? []
      : [
          "Quality scores: **not measured**. Draft expectations are excluded; teacher factual quality requires human review.",
          "",
        ]),
    "## Interpretation",
    "",
    "- Latency includes network, queue waiting and polling until a terminal response. First-visible-video timing is only meaningful for search.",
    "- Latency summaries include successful trials only. Failures and skipped trials remain in the counts and CSV.",
    "- Initial/repeated trials are not verified cache misses/hits. Cache state is unknown because the API does not expose it. No cache or quota counter was reset.",
    "- Accuracy uses reviewed expectations only. Failed attempted cases count as incorrect; skipped cases do not enter accuracy denominators. Repeats are trials, not additional independent samples.",
    `- Returned-video educational precision covers ${s.quality.reviewedReturnedVideos}/${s.quality.returnedVideos} returned videos in reviewed search trials. Unreviewed videos are excluded; this is not full detector accuracy or recall.`,
    "- These API measurements do not establish browser rendering speed, live video playback, learning improvement, recommendation relevance or load capacity.",
    "- Service/build/browser pass counts come from their existing commands and should be attached separately. Do not treat simulated test results as live latency data.",
    "",
  ].join("\n");
}

export function writeRun(directory, run) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const content = { ...run, summary: summarizeRun(run) };
  for (const [name, value] of [
    ["run.json", JSON.stringify(content, null, 2) + "\n"],
    ["results.csv", resultsCsv(run)],
    ["report.md", markdownReport(run)],
  ]) {
    const path = join(directory, name);
    writeFileSync(`${path}.tmp`, value, { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
  }
  return content.summary;
}
