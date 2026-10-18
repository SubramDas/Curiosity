import { createHash, randomUUID } from "node:crypto";
import { ServiceError } from "../providers/request-json.mjs";

/** Shared public metadata cache; provider work always happens outside transactions. */
export function createFirestoreCache({
  database,
  namespace = "curiosity",
  now = Date.now,
  maxTtlMs = 86400_000,
  maxEntries = 400,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  if (!Number.isFinite(maxTtlMs) || maxTtlMs <= 0)
    throw new Error("Invalid maximum cache lifetime.");
  const pending = new Map();
  const entries = database.collection(`${namespace}_cache`);
  const index = database.doc(`${namespace}_system/cache-index`);
  let writeQueue = Promise.resolve();
  function serialWrite(operation) {
    const result = writeQueue.then(operation);
    writeQueue = result.catch(() => {});
    return result;
  }
  async function store(record, owner, value, ttl, change) {
    return serialWrite(() =>
      database.runTransaction(async (transaction) => {
        const [snapshot, catalog] = await Promise.all([
          transaction.get(record),
          transaction.get(index),
        ]);
        if (!change && snapshot.data()?.owner !== owner)
          throw new ServiceError(
            "SERVICE_ERROR",
            "The cache request timed out. Try again.",
          );
        const stored = snapshot.data();
        const nextValue = change
          ? change(
              stored?.expiresAt > now() && typeof stored.payload === "string"
                ? JSON.parse(stored.payload)
                : undefined,
            )
          : value;
        const payload = JSON.stringify(nextValue);
        if (typeof payload !== "string" || Buffer.byteLength(payload) > 750_000)
          throw new ServiceError(
            "SERVICE_ERROR",
            "Video metadata is too large to cache.",
          );
        const existing = catalog.data()?.entries ?? {};
        const valid = Object.fromEntries(
          Object.entries(existing).filter(
            ([key, expiry]) =>
              /^[a-f0-9]{64}$/.test(key) && Number.isFinite(expiry),
          ),
        );
        const expiresAt = now() + ttl;
        const survivors = Object.entries(valid)
          .filter(([key, expiry]) => key !== record.id && expiry > now())
          .sort((a, b) => a[1] - b[1]);
        const retained = survivors.slice(-Math.max(0, maxEntries - 1));
        const keep = new Set(retained.map(([key]) => key));
        const removed = Object.keys(valid).filter(
          (key) => key !== record.id && !keep.has(key),
        );
        const removedSnapshots = await Promise.all(
          removed.map((key) => transaction.get(entries.doc(key))),
        );
        for (const snapshot of removedSnapshots)
          if (!(snapshot.data()?.leaseUntil > now()))
            transaction.delete(snapshot.ref);
        transaction.set(record, {
          payload,
          expiresAt,
          purgeAt: new Date(expiresAt),
          owner: null,
          leaseUntil: 0,
        });
        transaction.set(index, {
          entries: Object.fromEntries([...retained, [record.id, expiresAt]]),
        });
        return nextValue;
      }),
    );
  }
  async function release(record, owner) {
    await database.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(record);
      if (snapshot.data()?.owner === owner) transaction.delete(record);
    });
  }
  async function loadShared(key, ttl, load) {
    const record = entries.doc(key);
    const owner = randomUUID();
    // Leases coalesce identical requests across instances and expire after crashes.
    for (let attempt = 0; attempt < 90; attempt++) {
      const decision = await database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(record);
        const stored = snapshot.data();
        if (stored?.expiresAt > now() && typeof stored.payload === "string")
          return { hit: true, value: JSON.parse(stored.payload) };
        if (stored?.leaseUntil > now()) return { waiting: true };
        transaction.set(record, {
          owner,
          leaseUntil: now() + 90_000,
          purgeAt: new Date(now() + 86400_000),
        });
        return { claimed: true };
      });
      if (decision.hit) return decision.value;
      if (decision.claimed) {
        try {
          const value = await load();
          await store(record, owner, value, ttl);
          return value;
        } catch (error) {
          await release(record, owner).catch(() => {});
          throw error;
        }
      }
      await wait(1000);
    }
    throw new ServiceError(
      "SERVICE_ERROR",
      "These video results are still loading. Try again shortly.",
    );
  }
  return {
    async sweep() {
      await serialWrite(() =>
        database.runTransaction(async (transaction) => {
          const catalog = await transaction.get(index);
          const stored = catalog.data()?.entries ?? {};
          const expired = Object.entries(stored).filter(
            ([key, expiry]) =>
              /^[a-f0-9]{64}$/.test(key) &&
              Number.isFinite(expiry) &&
              expiry <= now(),
          );
          if (!expired.length) return;
          // Read before deleting: an expired value may now be a new in-flight lease.
          const snapshots = await Promise.all(
            expired.map(([key]) => transaction.get(entries.doc(key))),
          );
          for (const snapshot of snapshots)
            if (!(snapshot.data()?.leaseUntil > now()))
              transaction.delete(snapshot.ref);
          for (const [key] of expired) delete stored[key];
          transaction.set(index, { entries: stored });
        }),
      );
    },
    async entries() {
      const snapshot = await entries.limit(maxEntries).get();
      return snapshot.docs.flatMap((doc) => {
        const row = doc.data();
        return row.expiresAt > now() && typeof row.payload === "string"
          ? [
              {
                key: doc.id,
                expiresAt: row.expiresAt,
                value: JSON.parse(row.payload),
              },
            ]
          : [];
      });
    },
    async get(parts) {
      const key = createHash("sha256")
        .update(JSON.stringify(parts))
        .digest("hex");
      const snapshot = await entries.doc(key).get();
      const stored = snapshot.data();
      return stored?.expiresAt > now() && typeof stored.payload === "string"
        ? JSON.parse(stored.payload)
        : undefined;
    },
    // Use update-only keys for mutable catalogs, separate from leased getOrLoad keys.
    async update(parts, ttl, change) {
      if (!Number.isFinite(ttl) || ttl <= 0 || ttl > maxTtlMs)
        throw new Error("Invalid cache lifetime.");
      const key = createHash("sha256")
        .update(JSON.stringify(parts))
        .digest("hex");
      return structuredClone(
        await store(entries.doc(key), null, undefined, ttl, change),
      );
    },
    async getOrLoad(parts, ttl, load) {
      if (!Number.isFinite(ttl) || ttl <= 0 || ttl > maxTtlMs)
        throw new Error("Invalid cache lifetime.");
      const key = createHash("sha256")
        .update(JSON.stringify(parts))
        .digest("hex");
      if (!pending.has(key))
        pending.set(
          key,
          loadShared(key, ttl, load).finally(() => pending.delete(key)),
        );
      return structuredClone(await pending.get(key));
    },
  };
}
