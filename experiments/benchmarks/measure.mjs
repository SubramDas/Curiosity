import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export class BenchmarkError extends Error {
  constructor(code, status = null) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
const pending = new Set(["checking", "filtering", "waiting", "finding"]);
const stoppingCodes = new Set([
  "LOCAL_LIMIT",
  "GEMINI_DAILY_LIMIT",
  "GEMINI_RATE_LIMIT",
  "GEMINI_BUSY",
  "TOO_MANY_REQUESTS",
  "QUOTA_EXCEEDED",
  "NOT_CONFIGURED",
  "MISSING_CONFIG",
  "INVALID_CONFIG",
  "DATA_USE_NOT_CONFIRMED",
  "ACCESS_DENIED",
  "AUTH_REQUIRED",
]);
const safeCode = (code) =>
  typeof code === "string" && /^[A-Z][A-Z0-9_]{0,60}$/.test(code)
    ? code
    : "API_ERROR";
const videoIds = (videos) => {
  if (
    !Array.isArray(videos) ||
    videos.some((v) => !/^[\w-]{11}$/.test(v?.id ?? ""))
  )
    throw new BenchmarkError("INVALID_RESPONSE");
  return [...new Set(videos.map((v) => v.id))];
};

/**
 * @typedef {object} BenchmarkResult
 * @property {string} caseId
 * @property {number} repeat
 * @property {string} cacheState
 * @property {string} status
 * @property {Record<string, any>} [observation]
 * @property {number} [partialVideoCount]
 * @property {string} [errorCode]
 * @property {number|null} [httpStatus]
 * @property {boolean} [stopRun]
 */

function observe(suite, data) {
  if (suite === "search") {
    if (!["allow", "choices", "redirect"].includes(data?.decision?.action))
      throw new BenchmarkError("INVALID_RESPONSE");
    return {
      action: data.decision.action,
      videoIds: videoIds(data.videos),
      filteredCount: Number.isInteger(data.filteredCount)
        ? data.filteredCount
        : null,
    };
  }
  if (suite === "teacher") {
    if (
      typeof data?.answer !== "string" ||
      !data.answer.trim() ||
      !["related", "unrelated", "unclear", "no-video"].includes(
        data.relation,
      ) ||
      !["checked-notes", "video-analysis", "general"].includes(data.answerBasis)
    )
      throw new BenchmarkError("INVALID_RESPONSE");
    return {
      answerCharacters: data.answer.length,
      relation: data.relation,
      answerBasis: data.answerBasis,
      videoContext: data.videoContext ?? "unknown",
      hasTimestamp: Boolean(data.timestamp),
      videoIds: videoIds(data.recommendations),
      noticeCount: Array.isArray(data.notices) ? data.notices.length : 0,
    };
  }
  const c = data?.classification;
  if (
    !c?.topic ||
    typeof c.topic.label !== "string" ||
    !c.topic.label.trim() ||
    !["science", "commerce", "arts", null].includes(c.primaryUniverse) ||
    !["matched", "provisional"].includes(c.topic.status) ||
    (c.topic.wikidataId !== null && !/^Q\d+$/.test(c.topic.wikidataId ?? ""))
  )
    throw new BenchmarkError("INVALID_RESPONSE");
  return {
    topicLabel: c.topic.label.slice(0, 160),
    wikidataId: c.topic.wikidataId,
    topicStatus: c.topic.status,
    primaryUniverse: c.primaryUniverse,
    wikidataStatus: c.wikidataStatus ?? "unknown",
    policyVersion: c.policyVersion ?? "unknown",
  };
}

export function createMeasurementClient({
  baseUrl,
  origin,
  timeoutMs = 180000,
  pollMs = 1500,
  fetchRequest = fetch,
  now = () => performance.now(),
  sleep = delay,
}) {
  return async function measure(suite, sample, repeat) {
    const started = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let requests = 0,
      firstResultsMs = null;
    /** @type {BenchmarkResult} */
    const row = {
      caseId: sample.id,
      repeat,
      cacheState: "unknown",
      status: "failed",
    };
    const elapsed = () => Math.round((now() - started) * 100) / 100;
    async function post(path, body) {
      if (now() - started >= timeoutMs || controller.signal.aborted)
        throw new BenchmarkError("TIMEOUT");
      requests++;
      const response = await fetchRequest(new URL(path, baseUrl), {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new BenchmarkError("INVALID_RESPONSE", response.status);
      }
      if (!response.ok)
        throw new BenchmarkError(safeCode(data?.code), response.status);
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new BenchmarkError("INVALID_RESPONSE");
      return data;
    }
    try {
      const path =
        suite === "teacher"
          ? "/api/chat"
          : suite === "search"
            ? "/api/search"
            : "/api/videos/classify";
      const body =
        suite === "search"
          ? {
              query: sample.input.query,
              ...(sample.input.goal ? { goal: sample.input.goal } : {}),
              background: true,
              requestId: randomUUID(),
            }
          : suite === "classification"
            ? { id: sample.input.id, background: true }
            : {
                question: sample.input.question,
                topic: sample.input.topic,
                history: sample.input.history ?? [],
                currentVideo: sample.input.currentVideo ?? null,
              };
      let data = await post(path, body);
      // Measure first actual results, not acceptance of a 202 background job.
      while (true) {
        if (
          suite === "search" &&
          Array.isArray(data.videos) &&
          data.videos.length &&
          firstResultsMs === null
        ) {
          const partial = observe(suite, data);
          row.partialVideoCount = partial.videoIds.length;
          firstResultsMs = elapsed();
        }
        if (data.status === "failed")
          throw new BenchmarkError(safeCode(data.code));
        if (!pending.has(data.status)) break;
        if (
          suite === "teacher" ||
          (suite === "search" && !/^[\da-f-]{36}$/i.test(data.jobId ?? ""))
        )
          throw new BenchmarkError("INVALID_RESPONSE");
        await sleep(
          Math.min(pollMs, Math.max(1, timeoutMs - (now() - started))),
          undefined,
          { signal: controller.signal },
        );
        data =
          suite === "search"
            ? await post("/api/search/status", { jobId: data.jobId })
            : await post(path, body);
      }
      if (data.status !== undefined && data.status !== "ready")
        throw new BenchmarkError("INVALID_RESPONSE");
      row.observation = observe(suite, data);
      row.status = "success";
    } catch (error) {
      row.errorCode =
        controller.signal.aborted || now() - started >= timeoutMs
          ? "TIMEOUT"
          : error instanceof BenchmarkError
            ? error.code
            : "NETWORK_ERROR";
      row.httpStatus = error instanceof BenchmarkError ? error.status : null;
      // Do not resubmit failed jobs or continue a quota-limited run.
      row.stopRun =
        row.httpStatus === 429 ||
        stoppingCodes.has(row.errorCode) ||
        row.errorCode === "TIMEOUT";
    } finally {
      clearTimeout(timer);
    }
    return { ...row, elapsedMs: elapsed(), firstResultsMs, requests };
  };
}

export async function runCases({
  suite,
  cases,
  repeats,
  measure,
  onResult = async () => {},
}) {
  const results = [];
  let stopped = false;
  // Each case's subsequent trials are labelled as repeats; no cache reset occurs.
  for (const sample of cases)
    for (let repeat = 1; repeat <= repeats; repeat++) {
      const row = stopped
        ? {
            caseId: sample.id,
            repeat,
            status: "skipped",
            reason: "RUN_STOPPED",
            cacheState: "unknown",
          }
        : await measure(suite, sample, repeat);
      results.push(row);
      if (row.stopRun) stopped = true;
      await onResult(row);
    }
  return results;
}
