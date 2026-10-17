import { test } from "node:test";
import assert from "node:assert/strict";
import { createFirestoreUsage } from "../backend/storage/firestore-usage.mjs";
import { createFirestoreCache } from "../backend/storage/firestore-cache.mjs";
import { createCachedYouTubeClient } from "../backend/cached-youtube.mjs";

class DatabaseFixture {
  records = new Map<string, any>();
  queue = Promise.resolve();
  doc(path: string) {
    return {
      path,
      id: path.split("/").at(-1)!,
      get: async () => ({
        data: () => structuredClone(this.records.get(path)),
      }),
    };
  }
  collection(path: string) {
    return {
      doc: (id: string) => this.doc(path + "/" + id),
      limit: (count: number) => ({
        get: async () => ({
          docs: [...this.records]
            .filter(([key]) => key.startsWith(path + "/"))
            .slice(0, count)
            .map(([key, value]) => ({
              id: key.split("/").at(-1)!,
              data: () => structuredClone(value),
            })),
        }),
      }),
    };
  }
  runTransaction<T>(operation: (transaction: any) => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const changes = new Map<string, any>();
      const transaction = {
        get: async (ref: any) => ({
          ref,
          data: () => structuredClone(this.records.get(ref.path)),
        }),
        set: (ref: any, value: any, options?: any) =>
          changes.set(
            ref.path,
            options?.merge
              ? { ...this.records.get(ref.path), ...value }
              : value,
          ),
        delete: (ref: any) => changes.set(ref.path, undefined),
      };
      const value = await operation(transaction);
      for (const [path, row] of changes)
        row === undefined
          ? this.records.delete(path)
          : this.records.set(path, structuredClone(row));
      return value;
    });
    this.queue = result.then(
      () => {},
      () => {},
    );
    return result;
  }
}

test("Hosted quotas reserve atomically across adapters and reject async failures before provider calls", async () => {
  const database = new DatabaseFixture();
  const a = createFirestoreUsage({ database });
  const b = createFirestoreUsage({ database });
  const outcomes = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b).reserve("chat", 5)),
  );
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 5);
  await assert.rejects(a.reserve("chat", 5), /allowance/);
  let called = false;
  const youtube = createCachedYouTubeClient({
    cache: { getOrLoad: async (_: any, __: any, load: any) => load() },
    reserve: async () => {
      throw new Error("denied");
    },
    youtube: {
      searchPage: async () => {
        called = true;
      },
    },
  });
  await assert.rejects(youtube.searchPage("GPUs"), /denied/);
  assert.equal(called, false);
});

test("Shared metadata survives adapter replacement, coalesces requests, expires, caps entries and avoids cached failures", async () => {
  const database = new DatabaseFixture();
  let time = 1000;
  let calls = 0;
  const options = {
    database,
    now: () => time,
    maxEntries: 2,
    wait: async () => {
      await new Promise((r) => setTimeout(r, 1));
    },
  };
  const a = createFirestoreCache(options),
    b = createFirestoreCache(options);
  const load = async () => {
    calls++;
    return { value: "cached" };
  };
  assert.deepEqual(
    await Promise.all([
      a.getOrLoad(["one"], 100, load),
      b.getOrLoad(["one"], 100, load),
    ]),
    [{ value: "cached" }, { value: "cached" }],
  );
  assert.equal(calls, 1);
  assert.deepEqual(await b.get(["one"]), { value: "cached" });
  assert.equal(await b.get(["missing"]), undefined);
  await createFirestoreCache(options).getOrLoad(["one"], 100, load);
  assert.equal(calls, 1);
  time = 1101;
  assert.equal(await b.get(["one"]), undefined);
  await b.getOrLoad(["one"], 100, load);
  assert.equal(calls, 2);
  await a.getOrLoad(["two"], 100, load);
  await a.getOrLoad(["three"], 100, load);
  assert.equal(
    [...database.records.keys()].filter((x) => x.startsWith("curiosity_cache/"))
      .length,
    2,
  );
  await assert.rejects(
    a.getOrLoad(["bad"], 100, async () => {
      throw new Error("fail");
    }),
    /fail/,
  );
  await a.getOrLoad(["bad"], 100, load);
  time = 5000;
  await a.sweep();
  assert.equal(
    [...database.records.keys()].filter((x) => x.startsWith("curiosity_cache/"))
      .length,
    0,
  );
});

test("Asynchronous cache misses finish at different times without losing video details", async () => {
  const ids = ["abcdefghijk", "lmnopqrstuv", "zyxwvutsrqp"];
  let calls = 0;
  const client = createCachedYouTubeClient({
    cache: {
      getOrLoad: async (parts: any, ttl: any, load: any) => {
        await new Promise((r) => setTimeout(r, ids.indexOf(parts.at(-1)) * 60));
        return load();
      },
    },
    reserve: async () => {},
    youtube: {
      getPlayableVideos: async (batch: string[]) => {
        calls++;
        return batch.map((id) => ({ id, details: { embeddable: true } }));
      },
    },
  });
  assert.deepEqual(
    (await client.getPlayableVideos(ids)).map((x: any) => x.id),
    ids,
  );
  assert.equal(calls, 3);
});

test("Mutable cache updates preserve concurrent catalog additions across hosted adapters and expire", async () => {
  const database = new DatabaseFixture();
  let time = 1000;
  const options = { database, now: () => time };
  const a = createFirestoreCache(options),
    b = createFirestoreCache(options);
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      (i % 2 ? a : b).update(["catalog"], 1000, (rows: number[] = []) => [
        ...rows,
        i,
      ]),
    ),
  );
  assert.deepEqual(await a.get(["catalog"]), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(
    (await a.entries()).map((row: { value: unknown }) => row.value),
    [[0, 1, 2, 3, 4, 5, 6, 7]],
  );
  time += 1001;
  assert.equal(await b.get(["catalog"]), undefined);
  assert.deepEqual(await b.entries(), []);
  await b.update(["catalog"], 1000, (rows: number[] = []) => [...rows, 9]);
  assert.deepEqual(await a.get(["catalog"]), [9]);
});
