import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createMeasurementClient,
  runCases,
} from "../experiments/benchmarks/measure.mjs";
import {
  validateCases,
  scoreResults,
} from "../experiments/benchmarks/score.mjs";
import {
  timingSummary,
  markdownReport,
  resultsCsv,
  validateRun,
} from "../experiments/benchmarks/report.mjs";
import { readOptions } from "../experiments/benchmarks/run.mjs";
import { startServer } from "../backend/server.mjs";

const execute = promisify(execFile);
const video = { id: "abcdefghijk" };
const searchCase = {
  id: "gpu",
  input: { query: "How do GPUs work?" },
  review: { status: "draft", expected: { action: "allow" } },
};
const decision = { action: "allow", reason: "Learning.", choices: [] };
const reviewed = (expected: any) => ({
  status: "reviewed",
  reviewer: "reviewer-1",
  reviewedAt: "2026-10-18",
  expected,
});

function clientWithResponses(responses: any[]) {
  let time = 0;
  const requests: { path: string; body: any; signal: AbortSignal }[] = [];
  const measure = createMeasurementClient({
    baseUrl: "http://127.0.0.1:8787",
    origin: "http://127.0.0.1:5173",
    pollMs: 1000,
    now: () => time,
    sleep: (async (ms: number) => {
      time += ms;
    }) as any,
    fetchRequest: (async (url: URL, options: any) => {
      time += 25;
      requests.push({
        path: url.pathname,
        body: JSON.parse(options.body),
        signal: options.signal,
      });
      if (!responses.length)
        throw new Error(
          "Unexpected request: simulated test must not reach the network.",
        );
      const next = responses.shift();
      return Response.json(next.body ?? next, {
        status: next.httpStatus ?? 200,
      });
    }) as any,
  });
  return { measure, requests };
}

test("Benchmarks time asynchronous searches to completion and separately time first videos", async () => {
  const jobId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const { measure, requests } = clientWithResponses([
    { httpStatus: 202, body: { status: "checking", jobId } },
    {
      httpStatus: 202,
      body: { status: "filtering", jobId, decision, videos: [video] },
    },
    { status: "ready", jobId, decision, videos: [video], filteredCount: 2 },
  ]);
  const row = await measure("search", searchCase, 1);
  assert.equal(row.status, "success");
  assert.equal(row.firstResultsMs, 1050);
  assert.equal(row.elapsedMs, 2075);
  assert.equal(row.requests, 3);
  assert.equal(row.cacheState, "unknown");
  assert.deepEqual(
    requests.map((r) => r.path),
    ["/api/search", "/api/search/status", "/api/search/status"],
  );
  assert.match(requests[0].body.requestId, /^[\da-f-]{36}$/i);
  assert.deepEqual(requests[1].body, { jobId });
});

test("Classification polling reuses its ID without retrying a failed model job", async () => {
  const { measure, requests } = clientWithResponses([
    { httpStatus: 202, body: { status: "waiting" } },
    {
      status: "failed",
      code: "GEMINI_DAILY_LIMIT",
      message: "private provider detail",
    },
  ]);
  const sample = { ...searchCase, input: { id: video.id } };
  const results = await runCases({
    suite: "classification",
    cases: [sample],
    repeats: 3,
    measure,
  });
  assert.deepEqual(
    results.map((row) => row.status),
    ["failed", "skipped", "skipped"],
  );
  assert.equal(requests.length, 2);
  assert.ok(
    requests.every(
      (r) =>
        r.body.id === video.id && r.body.background === true && !r.body.retry,
    ),
  );
  assert.ok(!JSON.stringify(results).includes("private provider detail"));
});

test("Quota HTTP failures and partial job failures remain failures, without resubmission", async () => {
  const { measure } = clientWithResponses([
    { httpStatus: 429, body: { code: "GEMINI_RATE_LIMIT" } },
  ]);
  const rows = await runCases({
    suite: "search",
    cases: [searchCase],
    repeats: 2,
    measure,
  });
  assert.equal(rows[0].httpStatus, 429);
  assert.equal(rows[1].status, "skipped");
  const partial = clientWithResponses([
    { status: "failed", code: "SEARCH_UNAVAILABLE", decision, videos: [video] },
  ]);
  const row = await partial.measure("search", searchCase, 1);
  assert.equal(row.status, "failed");
  assert.equal(row.partialVideoCount, 1);
  assert.equal(row.firstResultsMs, 25);
  assert.equal(timingSummary([row], "firstResultsMs").count, 0);
});

test("One absolute deadline aborts a hanging request and stops later live trials", async () => {
  let signal: AbortSignal | undefined;
  const measure = createMeasurementClient({
    baseUrl: "http://127.0.0.1",
    origin: "http://127.0.0.1",
    timeoutMs: 20,
    fetchRequest: (async (_: any, options: any) => {
      signal = options.signal;
      return new Promise((_, reject) =>
        signal!.addEventListener("abort", () => reject(new Error("aborted"))),
      );
    }) as any,
  });
  const rows = await runCases({
    suite: "teacher",
    cases: [searchCase],
    repeats: 2,
    measure,
  });
  assert.equal(rows[0].errorCode, "TIMEOUT");
  assert.equal(rows[1].status, "skipped");
  assert.equal(signal?.aborted, true);
});

test("Old search contracts and malformed classifier responses cannot pass as successful benchmarks", async () => {
  for (const [suite, body] of [
    ["search", { videos: [] }],
    ["classification", { classification: { primaryUniverse: "science" } }],
    ["search", { decision, videos: [], status: "mystery" }],
  ]) {
    const { measure } = clientWithResponses([body]);
    const row = await measure(suite, searchCase, 1);
    assert.equal(row.status, "failed");
    assert.equal(row.errorCode, "INVALID_RESPONSE");
  }
});

test("Teacher measurements retain structured evidence without saving raw answers or conversation text", async () => {
  const { measure } = clientWithResponses([
    {
      answer: "A private example answer.",
      relation: "no-video",
      answerBasis: "general",
      videoContext: "none",
      timestamp: null,
      recommendations: [video],
      notices: [],
    },
  ]);
  const row = await measure("teacher", searchCase, 1);
  assert.equal(row.status, "success");
  assert.deepEqual(row.observation?.videoIds, [video.id]);
  assert.equal(row.observation?.hasTimestamp, false);
  assert.ok(!JSON.stringify(row).includes("private example answer"));
});

test("Quality scoring excludes drafts, includes attempted failures, and reports reviewed-video coverage", () => {
  const cases = [
    searchCase,
    {
      ...searchCase,
      id: "reviewed",
      review: reviewed({
        action: "allow",
        videoLabels: {
          abcdefghijk: "educational",
          bcdefghijkl: "entertainment",
        },
      }),
    },
  ];
  const results = [
    {
      caseId: "gpu",
      status: "success",
      observation: { action: "redirect", videoIds: [] },
    },
    {
      caseId: "reviewed",
      status: "success",
      observation: {
        action: "allow",
        videoIds: ["abcdefghijk", "bcdefghijkl", "cdefghijklm"],
      },
    },
    { caseId: "reviewed", status: "failed" },
    { caseId: "reviewed", status: "skipped" },
  ];
  const score = scoreResults(cases, results, "search");
  assert.equal(score.distinctReviewedCases, 1);
  assert.equal(score.reviewedAttempts, 2);
  assert.equal(score.returnedVideos, 3);
  assert.equal(score.reviewedReturnedVideos, 2);
  assert.deepEqual(score.metrics, {
    searchDecision: { correct: 1, total: 2, percentage: 50 },
    returnedVideoEducationalPrecision: { correct: 1, total: 2, percentage: 50 },
  });
  assert.deepEqual(
    scoreResults([searchCase], results.slice(0, 1), "search").metrics,
    {},
  );
});

test("Topic scoring uses explicit accepted labels or QIDs; provisional null Universe is not a missing response", () => {
  const sample = {
    ...searchCase,
    review: reviewed({
      primaryUniverse: null,
      topicLabels: ["Graphics Card"],
      wikidataIds: ["Q183484"],
    }),
  };
  const score = scoreResults(
    [sample],
    [
      {
        caseId: "gpu",
        status: "success",
        observation: {
          primaryUniverse: null,
          topicLabel: "graphics   card",
          wikidataId: null,
        },
      },
      {
        caseId: "gpu",
        status: "success",
        observation: {
          primaryUniverse: "science",
          topicLabel: "different",
          wikidataId: "Q183484",
        },
      },
      { caseId: "gpu", status: "failed" },
    ],
    "classification",
  );
  assert.deepEqual(score.metrics, {
    primaryUniverse: { correct: 1, total: 3, percentage: 33.33 },
    topicMapping: { correct: 2, total: 3, percentage: 66.67 },
  });
});

test("CLI and reviewed datasets reject ambiguous configuration before network work", () => {
  assert.equal(readOptions(["search"]).live, false);
  assert.throws(() =>
    readOptions(["search", "--base-url", "https://name:secret@example.com/"]),
  );
  assert.throws(() =>
    readOptions(["search", "--base-url", "https://example.com/?key=secret"]),
  );
  assert.throws(() =>
    readOptions(["search", "--base-url", "http://example.com"]),
  );
  assert.throws(() => readOptions(["teacher", "--repeats", "-1"]));
  assert.throws(() => readOptions(["teacher", "--repeats", "100"]));
  assert.throws(() => validateCases([searchCase, searchCase], "search"));
  assert.throws(() =>
    validateCases(
      [
        {
          ...searchCase,
          review: { status: "reviewed", expected: { action: "allow" } },
        },
      ],
      "search",
    ),
  );
  assert.throws(() =>
    validateCases(
      [
        {
          ...searchCase,
          review: reviewed({
            action: "allow",
            videoLabels: { invalid: "educational" },
          }),
        },
      ],
      "search",
    ),
  );
  assert.throws(() => validateRun({ schemaVersion: 2 }));
});

test("Timing summaries do not hide failures or substitute zero for unmeasured values", () => {
  assert.deepEqual(
    timingSummary([
      { status: "success", elapsedMs: 100 },
      { status: "failed", elapsedMs: 10000 },
      { status: "success", elapsedMs: 300 },
    ]),
    { count: 2, medianMs: 200, minMs: 100, maxMs: 300 },
  );
  assert.equal(
    timingSummary([{ status: "failed", elapsedMs: 10 }]).medianMs,
    null,
  );
  const run: any = {
    suite: "teacher",
    cases: [searchCase],
    results: [
      {
        caseId: "gpu",
        repeat: 1,
        status: "failed",
        elapsedMs: 10,
        requests: 1,
        errorCode: "LOCAL_LIMIT",
      },
    ],
    metadata: { target: "http://127.0.0.1", model: "unrecorded" },
  };
  const report = markdownReport(run);
  assert.match(report, /0 \/ 1 \/ 0/);
  assert.match(report, /Quality scores: \*\*not measured\*\*/);
  assert.match(report, /Cache state is unknown/);
  assert.match(
    resultsCsv({ results: [{ caseId: "=FORMULA", status: "failed" }] } as any),
    /'=FORMULA/,
  );
});

test("CLI makes no calls in plan mode and produces regenerable reports against an isolated simulated API", async () => {
  const directory = mkdtempSync(join(tmpdir(), "revelink-benchmarks-"));
  let calls = 0;
  const server = createServer((request, response) => {
    calls++;
    assert.equal(request.headers.origin, "http://127.0.0.1:5173");
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        status: "ready",
        decision,
        videos: [video],
        filteredCount: 0,
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const casesFile = join(directory, "cases.json");
  const output = join(directory, "output");
  writeFileSync(
    casesFile,
    JSON.stringify([
      {
        ...searchCase,
        review: reviewed({
          action: "allow",
          videoLabels: { abcdefghijk: "educational" },
        }),
      },
    ]),
  );
  const command = [
    "experiments/benchmarks/run.mjs",
    "search",
    "--base-url",
    base,
    "--cases",
    casesFile,
    "--output",
    output,
  ];
  try {
    const plan = await execute(process.execPath, command);
    assert.match(plan.stdout, /Plan only/);
    assert.equal(calls, 0);
    assert.deepEqual(readdirSync(directory).sort(), ["cases.json"]);
    await execute(process.execPath, [
      ...command,
      "--live",
      "--model",
      "simulated-model",
    ]);
    assert.equal(calls, 1);
    const run = JSON.parse(readFileSync(join(output, "run.json"), "utf8"));
    assert.equal(run.summary.success, 1);
    assert.equal(run.summary.quality.metrics.searchDecision.percentage, 100);
    assert.equal(run.metadata.model, "simulated-model");
    assert.ok(!JSON.stringify(run).includes(searchCase.input.query));
    // Regeneration must recalculate stored rows instead of trusting a stale summary.
    run.summary.success = 999;
    writeFileSync(join(output, "run.json"), JSON.stringify(run));
    await execute(process.execPath, [
      "experiments/benchmarks/run.mjs",
      "report",
      "--run",
      join(output, "run.json"),
    ]);
    assert.equal(
      JSON.parse(readFileSync(join(output, "run.json"), "utf8")).summary
        .success,
      1,
    );
    assert.equal(calls, 1);
    assert.ok(
      readFileSync(join(output, "report.md"), "utf8").includes(
        "simulated-model",
      ),
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Benchmark search and classifier clients follow the real app's background API contracts with simulated providers", async () => {
  const directory = mkdtempSync(join(tmpdir(), "revelink-benchmark-api-"));
  const publicVideo = {
    ...video,
    title: "How GPUs work",
    channel: "Public example",
    watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
    details: { privacyStatus: "public", embeddable: true, duration: "PT3M" },
  };
  const classification = {
    topic: {
      label: "Graphics processing unit",
      wikidataId: null,
      status: "provisional",
    },
    primaryUniverse: "science",
    relatedUniverses: [],
    reason: "Computing.",
    wikidataStatus: "unavailable",
    policyVersion: "1",
  };
  const server = startServer(
    {},
    {
      port: 0,
      usageDirectory: directory,
      limits: { reserve: () => {} },
      youtube: {
        searchPage: async () => ({
          videos: [publicVideo],
          nextPageToken: null,
        }),
        getVideoDetails: async () => [publicVideo],
        getPlayableVideos: async () => [publicVideo],
      } as any,
      classifier: { classify: async () => classification },
      searchAssessor: {
        query: async () => decision,
        videos: async () => [
          { id: video.id, purpose: "educational", related: true },
        ],
      },
    },
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const measure = createMeasurementClient({
      baseUrl: `http://127.0.0.1:${(server.address() as any).port}`,
      origin: "http://127.0.0.1:5173",
      pollMs: 5,
      timeoutMs: 3000,
    });
    const search = await measure("search", searchCase, 1);
    assert.equal(search.status, "success");
    assert.deepEqual(search.observation?.videoIds, [video.id]);
    const mapped = await measure(
      "classification",
      { ...searchCase, input: { id: video.id } },
      1,
    );
    assert.equal(mapped.status, "success");
    assert.equal(mapped.observation?.topicLabel, classification.topic.label);
    assert.equal(mapped.observation?.primaryUniverse, "science");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
