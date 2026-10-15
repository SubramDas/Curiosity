import { ServiceError } from "../providers/request-json.mjs";

// Return short HTTP responses while classification waits for paced model slots.
export function createClassificationJobs({
  classify,
  now = Date.now,
  maxEntries = 200,
}) {
  const jobs = new Map();
  const pending = [];
  let active = false,
    closed = false;
  function view(job) {
    return {
      videoId: job.id,
      status: job.status,
      ...(job.classification ? { classification: job.classification } : {}),
      ...(job.error
        ? {
            code: job.error.code,
            message: job.error.message,
            retryAfterSeconds: job.error.retryAfterSeconds,
          }
        : {}),
    };
  }
  function pump() {
    if (closed || active || !pending.length) return;
    const job = pending.shift();
    active = true;
    Promise.resolve()
      .then(() =>
        classify(job.id, (state) => {
          job.status = state === "running" ? "finding" : "waiting";
        }),
      )
      .then(
        (result) => {
          job.classification = result;
          job.status = "ready";
        },
        (error) => {
          job.status = "failed";
          job.error =
            error instanceof ServiceError
              ? error
              : new ServiceError(
                  "LOCAL_ERROR",
                  "Video classification could not finish.",
                );
        },
      )
      .finally(() => {
        job.expiresAt = now() + 5 * 60_000;
        active = false;
        pump();
      });
  }
  return {
    getOrStart(id, { retry = false } = {}) {
      if (closed)
        throw new ServiceError(
          "GEMINI_BUSY",
          "The app is restarting. Please try again.",
        );
      for (const [key, job] of jobs)
        if (job.expiresAt <= now() && ["ready", "failed"].includes(job.status))
          jobs.delete(key);
      const existing = jobs.get(id);
      if (existing && !(retry && existing.status === "failed"))
        return view(existing);
      if (pending.length >= 32)
        throw new ServiceError(
          "GEMINI_BUSY",
          "Video classification is busy. Please try again shortly.",
        );
      if (jobs.size >= maxEntries) {
        const finished = [...jobs].find(([, job]) =>
          ["ready", "failed"].includes(job.status),
        );
        if (finished) jobs.delete(finished[0]);
        else
          throw new ServiceError(
            "GEMINI_BUSY",
            "Video classification is busy. Please try again shortly.",
          );
      }
      const job = { id, status: "waiting", expiresAt: Infinity };
      jobs.set(id, job);
      pending.push(job);
      // Start after returning the initial waiting state.
      queueMicrotask(pump);
      return view(job);
    },
    close() {
      closed = true;
      pending.length = 0;
    },
  };
}
