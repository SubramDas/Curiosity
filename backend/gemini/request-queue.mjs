import { ServiceError } from "../providers/request-json.mjs";

const pacificDay = (time) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(time);

// Shared by every Gemini request in one app server. Cloud Run is capped at one instance.
export function createGeminiRequestQueue({
  intervalMs = 15_000,
  now = Date.now,
  maxPending = 32,
} = {}) {
  if (!Number.isInteger(intervalMs) || intervalMs < 0 || intervalMs > 300_000)
    throw new ServiceError(
      "INVALID_CONFIG",
      "GEMINI_REQUEST_INTERVAL_MS must be an integer from 0 to 300000.",
    );
  const pending = [];
  let active = false,
    lastStart = -Infinity,
    pauseUntil = 0,
    blockedDay,
    closed = false,
    timer;
  function notify(entry, status) {
    try {
      entry.onStatus?.(status);
    } catch {
      /* UI observers do not control model work. */
    }
  }
  function dailyError() {
    return new ServiceError(
      "GEMINI_DAILY_LIMIT",
      "Gemini's daily allowance is exhausted. New requests are paused until its next Pacific-time daily reset.",
    );
  }
  function isDayBlocked() {
    return blockedDay === pacificDay(now());
  }
  function rejectPending(error) {
    for (const entry of pending.splice(0)) {
      clearTimeout(entry.deadline);
      entry.reject(error);
    }
  }
  function pump() {
    clearTimeout(timer);
    if (closed || active || !pending.length) return;
    if (isDayBlocked()) {
      rejectPending(dailyError());
      return;
    }
    const delay = Math.max(
      0,
      lastStart + intervalMs - now(),
      pauseUntil - now(),
    );
    if (delay > 0) {
      timer = setTimeout(pump, delay);
      return;
    }
    const teacher = pending.findIndex((entry) => entry.priority === "teacher");
    const [entry] = pending.splice(teacher < 0 ? 0 : teacher, 1);
    clearTimeout(entry.deadline);
    active = true;
    Promise.resolve()
      .then(() => {
        lastStart = now();
        notify(entry, "running");
        return entry.operation(() => {
          lastStart = now();
        });
      })
      .then(entry.resolve, (error) => {
        if (error?.code === "GEMINI_DAILY_LIMIT") {
          blockedDay = pacificDay(now());
          rejectPending(dailyError());
        }
        if (error?.code === "GEMINI_RATE_LIMIT")
          pauseUntil = Math.max(
            pauseUntil,
            now() + (error.retryAfterSeconds ?? 60) * 1000,
          );
        entry.reject(error);
      })
      .finally(() => {
        active = false;
        pump();
      });
  }
  return {
    run(
      operation,
      {
        priority = "classification",
        onStatus,
        maxWaitMs = priority === "teacher" ? 30_000 : 120_000,
      } = {},
    ) {
      if (closed)
        return Promise.reject(
          new ServiceError(
            "GEMINI_BUSY",
            "The app is restarting. Please try again.",
          ),
        );
      if (isDayBlocked()) return Promise.reject(dailyError());
      if (pending.length >= maxPending)
        return Promise.reject(
          new ServiceError(
            "GEMINI_BUSY",
            "The teacher is busy. Please try again shortly.",
          ),
        );
      return new Promise((resolve, reject) => {
        const entry = {
          operation,
          priority,
          onStatus,
          resolve,
          reject,
          deadline: undefined,
        };
        entry.deadline = setTimeout(() => {
          const index = pending.indexOf(entry);
          if (index < 0) return;
          pending.splice(index, 1);
          reject(
            new ServiceError(
              "GEMINI_BUSY",
              "The teacher is busy or cooling down. Please try again shortly.",
            ),
          );
          pump();
        }, maxWaitMs);
        pending.push(entry);
        notify(entry, "waiting");
        pump();
      });
    },
    close() {
      closed = true;
      clearTimeout(timer);
      rejectPending(
        new ServiceError(
          "GEMINI_BUSY",
          "The app is restarting. Please try again.",
        ),
      );
    },
  };
}
