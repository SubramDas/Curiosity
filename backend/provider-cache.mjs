import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { ServiceError } from "./providers/request-json.mjs";

// Public YouTube metadata only. Never cache account records, credentials, or media.
export function createProviderCache({
  directory = ".local-data",
  now = Date.now,
  maxEntries = 500,
} = {}) {
  mkdirSync(directory, { recursive: true });
  const path = `${directory}/youtube-cache.json`;
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
          entry.expiresAt <= now() + 86400_000 &&
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
        "The YouTube cache cannot be read. Review .local-data/youtube-cache.json.",
      );
  }
  return {
    sweep() {
      const size = entries.size;
      prune();
      if (entries.size !== size) persist();
    },
    async getOrLoad(keyParts, ttl, load) {
      if (!Number.isFinite(ttl) || ttl <= 0 || ttl > 86400_000)
        throw new Error("Cache lifetime must be between zero and one day.");
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
