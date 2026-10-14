export class ServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

// Do not expose raw provider errors: they can contain request data or secrets.
export async function requestJson(url, options = {}, fetchRequest = fetch) {
  let response;
  try {
    response = await fetchRequest(url, {
      ...options,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ServiceError(
      "NETWORK_ERROR",
      "The service did not respond. Check your connection and retry manually.",
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new ServiceError(
        "SERVICE_LIMIT",
        "The service limit was reached. No automatic retry was made.",
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new ServiceError(
        "ACCESS_DENIED",
        "Check the API key, enabled API, key restrictions, and remaining quota in your provider account.",
      );
    }
    throw new ServiceError(
      "SERVICE_ERROR",
      `The service rejected the request (HTTP ${response.status}).`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ServiceError(
      "INVALID_RESPONSE",
      "The service returned an unreadable response.",
    );
  }
}
