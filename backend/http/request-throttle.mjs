import { createHash } from "node:crypto";
import { ServiceError } from "../providers/request-json.mjs";

/** Per-instance burst protection supplements shared provider budgets. */
export function createRequestThrottle({ now = Date.now } = {}) {
  const windows = new Map();
  function reserve(key, limit) {
    const minute = Math.floor(now() / 60_000);
    const existing = windows.get(key);
    const row = existing?.minute === minute ? existing : { minute, count: 0 };
    if (row.count >= limit)
      throw new ServiceError(
        "TOO_MANY_REQUESTS",
        "Too many requests. Please wait a minute and try again.",
      );
    row.count++;
    windows.set(key, row);
    if (windows.size > 2000)
      for (const [id, record] of windows)
        if (record.minute !== minute) windows.delete(id);
    if (windows.size > 3000)
      throw new ServiceError(
        "TOO_MANY_REQUESTS",
        "The demo is busy. Please try again shortly.",
      );
  }
  return (request) => {
    if (request.method !== "POST" || !request.url?.startsWith("/api/")) return;
    reserve("global", 180);
    const address = String(
      request.headers["x-forwarded-for"] ?? request.socket.remoteAddress,
    )
      .split(",")[0]
      .trim();
    const id = createHash("sha256").update(address).digest("hex");
    reserve(id, 60);
    if (request.url === "/api/chat") reserve(id + ":chat", 6);
    if (request.url === "/api/search") reserve(id + ":search", 10);
  };
}
