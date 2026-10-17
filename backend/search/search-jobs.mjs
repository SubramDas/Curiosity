import { createHash } from "node:crypto";
import { ServiceError } from "../providers/request-json.mjs";

// Opaque, bounded jobs avoid holding HTTP requests open during model queue waits.
export function createSearchJobs({ run, now }) {
  const jobs = new Map();
  const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
  const fail = (message) => {
    throw new ServiceError("INVALID_INPUT", message);
  };
  const view = (job) => ({
    jobId: job.id,
    status: job.status,
    ...job.result,
    ...job.error,
  });
  function status(body) {
    const job = typeof body.jobId === "string" && jobs.get(body.jobId);
    if (!job || job.expiresAt <= now())
      throw new ServiceError(
        "SEARCH_EXPIRED",
        "This search expired. Please try again.",
      );
    return view(job);
  }

  function request(body) {
    if (typeof body.requestId !== "string" || !uuid.test(body.requestId))
      fail("Use a valid search request identifier.");
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([body.query, body.goal, body.pageToken]))
      .digest("hex");
    for (const [id, j] of jobs) if (j.expiresAt <= now()) jobs.delete(id);
    const existing = jobs.get(body.requestId);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        fail("This request identifier belongs to another search.");
      return view(existing);
    }
    if (jobs.size >= 100)
      throw new ServiceError(
        "GEMINI_BUSY",
        "Search is busy. Please try again shortly.",
      );
    const job = {
      id: body.requestId,
      status: "checking",
      fingerprint,
      expiresAt: now() + 10 * 60_000,
    };
    jobs.set(job.id, job);
    void run(
      body,
      (phase) => {
        job.status = phase;
      },
      (result) => {
        job.result = result;
      },
    )
      .then(
        (result) => {
          job.result = result;
          job.status = "ready";
        },
        (error) => {
          job.status = "failed";
          job.error = {
            code:
              error instanceof ServiceError ? error.code : "SEARCH_UNAVAILABLE",
            message:
              error instanceof ServiceError
                ? error.message
                : "The search check could not finish. Please try again.",
          };
        },
      )
      .finally(() => {
        job.expiresAt = now() + 5 * 60_000;
      });
    return view(job);
  }
  return { status, request };
}
