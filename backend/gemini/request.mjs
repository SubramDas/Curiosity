import { requestJson, ServiceError } from "../providers/request-json.mjs";

async function limitError(response) {
  let data;
  try {
    data = await response.clone().json();
  } catch {
    /* Never expose raw provider errors. */
  }
  const details = Array.isArray(data?.error?.details) ? data.error.details : [];
  const violations = details.flatMap((row) =>
    Array.isArray(row?.violations) ? row.violations : [],
  );
  const daily = violations.some((row) =>
    /perday|per_day|daily/i.test(
      `${row.quotaId ?? ""} ${row.quotaMetric ?? ""}`,
    ),
  );
  let seconds = 60;
  const header = response.headers.get("retry-after");
  const headerDelay =
    Number(header) || (Date.parse(header ?? "") - Date.now()) / 1000;
  if (headerDelay > 0 && Number.isFinite(headerDelay))
    seconds = Math.ceil(headerDelay);
  for (const row of details) {
    const delay =
      typeof row.retryDelay === "string"
        ? row.retryDelay.match(/^(\d+(?:\.\d+)?)s$/)
        : null;
    if (delay) seconds = Math.max(seconds, Math.ceil(Number(delay[1])));
  }
  seconds = Math.min(86400, Math.max(1, seconds));
  const error = new ServiceError(
    daily ? "GEMINI_DAILY_LIMIT" : "GEMINI_RATE_LIMIT",
    daily
      ? "Gemini's daily allowance is exhausted. New requests are paused until its next Pacific-time daily reset."
      : `Gemini is temporarily rate limited. New requests are paused for ${seconds} seconds; the failed request was not retried.`,
  );
  error.provider = "gemini";
  error.limitKind = daily ? "daily" : "rate";
  if (!daily) error.retryAfterSeconds = seconds;
  return error;
}

/** @param {{ queue?: ReturnType<typeof import("./request-queue.mjs").createGeminiRequestQueue>, fetchRequest?: typeof fetch }} [options] */
export function createGeminiRequester({ queue, fetchRequest = fetch } = {}) {
  return (
    url,
    options,
    {
      priority = "classification",
      reserve = async () => {},
      timeoutMs = 20_000,
      onStatus,
    } = {},
  ) => {
    const operation = async (markStarted = () => {}) => {
      await reserve();
      // Storage reservations may wait; pace from the actual provider dispatch.
      markStarted();
      // The provider deadline starts when dispatched, not while waiting in the queue.
      return requestJson(url, options, async (target, requestOptions) => {
        const response = await fetchRequest(target, {
          ...requestOptions,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status === 429) throw await limitError(response);
        return response;
      });
    };
    return queue ? queue.run(operation, { priority, onStatus }) : operation();
  };
}
