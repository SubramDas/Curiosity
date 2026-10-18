import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { ServiceError } from "./providers/request-json.mjs";

// Single local process only. Hosted deployment needs a shared atomic limiter.
export function createUsageLimiter(directory = ".local-data") {
  mkdirSync(directory, { recursive: true });
  const path = `${directory}/usage.json`;
  let stored;
  try {
    stored = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new ServiceError(
        "INVALID_CONFIG",
        "The local usage record cannot be read. Review it before making API calls.",
      );
    stored = null;
  }
  let usage = stored ?? { day: "", search: 0, chat: 0 };
  return {
    reserve(kind, limit) {
      const day = new Date().toISOString().slice(0, 10);
      if (usage.day !== day) usage = { day, search: 0, chat: 0 };
      const maximum = kind === "classification" ? 500 : 100;
      if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
        throw new ServiceError(
          "INVALID_CONFIG",
          `Daily ${kind} limits must be integers from 1 to ${maximum}.`,
        );
      }
      if (
        ["videoChat", "classification", "searchGuard"].includes(kind) &&
        usage[kind] === undefined
      )
        usage[kind] = 0;
      if (!Number.isInteger(usage[kind]) || usage[kind] < 0) {
        throw new ServiceError(
          "INVALID_CONFIG",
          "The local usage record is invalid. Stop and review it before making more API calls.",
        );
      }
      if (usage[kind] >= limit)
        throw new ServiceError(
          "LOCAL_LIMIT",
          `The local daily ${kind} allowance is used. Try again tomorrow.`,
        );
      usage[kind]++;
      writeFileSync(`${path}.tmp`, JSON.stringify(usage), { mode: 0o600 });
      renameSync(`${path}.tmp`, path);
    },
  };
}
