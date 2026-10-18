import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { ServiceError } from "./providers/request-json.mjs";

// Public provider data and derived labels only; never credentials, accounts or media.
export function createProviderCache({
  directory = ".local-data",
  now = Date.now,
  maxTtlMs = 86400_000,
  maxEntries = 500,
  filename = "youtube-cache.json",
} = {}) {
  if (!Number.isFinite(maxTtlMs) || maxTtlMs <= 0)
    throw new Error("Invalid maximum cache lifetime.");
  mkdirSync(directory, { recursive: true });
  const path = `${directory}/${filename}`;
  const entries = new Map();
  const pending = new Map();
  function prune() {
    for (const [key, entry] of entries)
      if (entry.expiresAt <= now()) entries.delete(key);
    while (entries.size > maxEntries)
      entries.delete(entries.keys().next().value);
  }
  function persist() {
    prune();
    writeFileSync(
      `${path}.tmp`,
      JSON.stringify({ version: 1, entries: [...entries] }),
      { mode: 0o600 },
    );
    renameSync(`${path}.tmp`, path);
  }
  try {
    const saved = JSON.parse(readFileSync(path, "utf8"));
    if (saved.version === 1 && Array.isArray(saved.entries)) {
      for (const row of saved.entries) {
        if (!Array.isArray(row) || row.length !== 2) continue;
        const [key, entry] = row;
        if (
          typeof key === "string" &&
          /^[a-f0-9]{64}$/.test(key) &&
          entry &&
          Number.isFinite(entry.expiresAt) &&
          entry.expiresAt > now() &&
          entry.expiresAt <= now() + maxTtlMs &&
          "value" in entry
        )
          entries.set(key, entry);
      }
    }
    // Expired data is removed from disk as well as memory when the server starts.
    persist();
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new ServiceError(
        "INVALID_CONFIG",
        "The provider cache cannot be read. Review the local cache files.",
      );
  }
  return {
    sweep() {
      const size = entries.size;
      prune();
      if (entries.size !== size) persist();
    },
    async entries() {
      return [...entries]
        .filter(([, row]) => row.expiresAt > now())
        .map(([key, row]) => ({
          key,
          expiresAt: row.expiresAt,
          value: structuredClone(row.value),
        }));
    },
    async get(keyParts) {
      const key = createHash("sha256")
        .update(JSON.stringify(keyParts))
        .digest("hex");
      const entry = entries.get(key);
      return entry?.expiresAt > now()
        ? structuredClone(entry.value)
        : undefined;
    },
    async update(keyParts, ttl, change) {
      if (!Number.isFinite(ttl) || ttl <= 0 || ttl > maxTtlMs)
        throw new Error("Invalid cache lifetime.");
      const key = createHash("sha256")
        .update(JSON.stringify(keyParts))
        .digest("hex");
      const entry = entries.get(key);
      const value = change(
        entry?.expiresAt > now() ? structuredClone(entry.value) : undefined,
      );
      entries.set(key, {
        value: structuredClone(value),
        expiresAt: now() + ttl,
      });
      persist();
      return structuredClone(value);
    },
    async getOrLoad(keyParts, ttl, load) {
      if (!Number.isFinite(ttl) || ttl <= 0 || ttl > maxTtlMs)
        throw new Error("Invalid cache lifetime.");
      const key = createHash("sha256")
        .update(JSON.stringify(keyParts))
        .digest("hex");
      const existing = entries.get(key);
      if (existing?.expiresAt > now()) return structuredClone(existing.value);
      if (existing) {
        entries.delete(key);
        persist();
      }
      if (!pending.has(key)) {
        const request = Promise.resolve()
          .then(load)
          .then((value) => {
            entries.set(key, {
              value: structuredClone(value),
              expiresAt: now() + ttl,
            });
            persist();
            return value;
          })
          .finally(() => pending.delete(key));
        pending.set(key, request);
      }
      return structuredClone(await pending.get(key));
    },
  };
}
