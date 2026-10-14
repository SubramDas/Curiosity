import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProviderCache } from "../backend/provider-cache.mjs";
import { createCachedYouTubeClient } from "../backend/cached-youtube.mjs";

const video = (id: string) => ({
  id,
  title: "GPU",
  channel: "Example",
  watchUrl: `https://www.youtube.com/watch?v=${id}`,
  reviewed: false,
  details: { embeddable: true, duration: "PT4M", privacyStatus: "public" },
});

test("Persistent cache reuses results after restart, isolates pages, expires and does not cache failures", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-cache-"));
  let time = 1000,
    calls = 0;
  const options = { directory, now: () => time, maxEntries: 2 };
  try {
    let cache = createProviderCache(options);
    const load = async () => {
      calls++;
      return { videos: [video("abcdefghijk")] };
    };
    await Promise.all([
      cache.getOrLoad(["search", "GPU", ""], 1000, load),
      cache.getOrLoad(["search", "GPU", ""], 1000, load),
    ]);
    assert.equal(calls, 1);
    cache = createProviderCache(options);
    await cache.getOrLoad(["search", "GPU", ""], 1000, load);
    assert.equal(calls, 1);
    await cache.getOrLoad(["search", "GPU", "page2"], 1000, load);
    assert.equal(calls, 2);
    time = 2001;
    cache = createProviderCache(options);
    assert.deepEqual(
      JSON.parse(readFileSync(join(directory, "youtube-cache.json"), "utf8"))
        .entries,
      [],
    );
    await cache.getOrLoad(["search", "GPU", ""], 1000, load);
    assert.equal(calls, 3);
    for (let i = 0; i < 2; i++)
      await assert.rejects(
        cache.getOrLoad(["failure"], 1000, async () => {
          calls++;
          throw Error("offline");
        }),
        /offline/,
      );
    assert.equal(calls, 5);
    for (let i = 0; i < 4; i++) await cache.getOrLoad(["other", i], 1000, load);
    assert.equal(
      JSON.parse(readFileSync(join(directory, "youtube-cache.json"), "utf8"))
        .entries.length,
      2,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Searches and overlapping video batches share cached metadata and work at an exhausted allowance", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-youtube-cache-"));
  let reservations = 0,
    exhausted = false;
  const calls: string[] = [];
  function client() {
    return createCachedYouTubeClient({
      cache: createProviderCache({ directory }),
      reserve: (count: number) => {
        if (exhausted) throw Error("allowance used");
        reservations += count;
      },
      youtube: {
        async searchPage(query: string, page?: string) {
          calls.push(`search:${query}:${page ?? ""}`);
          return { videos: [video("abcdefghijk")], nextPageToken: "next" };
        },
        async getPlayableVideos(ids: string[]) {
          calls.push(`details:${ids.join(",")}`);
          return ids.filter((id) => id !== "missing0000").map(video);
        },
        async getPopularLearningVideos() {
          calls.push("trending");
          return [video("abcdefghijk")];
        },
      },
    });
  }
  try {
    let youtube = client();
    await Promise.all([youtube.searchPage("GPU"), youtube.searchPage("GPU")]);
    await youtube.getVideoDetails(["abcdefghijk", "Kgcfj_KV-mo"]);
    await youtube.getPlayableVideos(["Kgcfj_KV-mo", "other000000"]);
    await youtube.getPlayableVideos(["missing0000"]);
    await youtube.getPopularLearningVideos();
    assert.equal(reservations, 6);
    assert.deepEqual(calls.slice(0, 3), [
      "search:GPU:",
      "details:abcdefghijk,Kgcfj_KV-mo",
      "details:other000000",
    ]);
    exhausted = true;
    youtube = client();
    await youtube.searchPage("GPU");
    assert.equal(
      (await youtube.getPlayableVideos(["abcdefghijk", "missing0000"])).length,
      1,
    );
    await youtube.getPopularLearningVideos();
    assert.equal(reservations, 6);
    await assert.rejects(youtube.searchPage("GPU", "next"), /allowance used/);
    await assert.rejects(youtube.searchPage("different"), /allowance used/);
    assert.equal(reservations, 6);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Actual API routes reuse cached search/details after exhaustion and a server restart", async () => {
  const { startServer } = await import("../backend/server.mjs");
  const directory = mkdtempSync(join(tmpdir(), "curiosity-cache-routes-"));
  let calls = 0;
  const youtube = {
    async searchPage() {
      calls++;
      return { videos: [video("abcdefghijk")], nextPageToken: "next" };
    },
    async getPlayableVideos(ids: string[]) {
      calls++;
      return ids.map(video);
    },
    async getVideoDetails(ids: string[]) {
      return ids.map((id) => ({ id, ...video(id).details }));
    },
    async getPopularLearningVideos() {
      calls++;
      return [video("abcdefghijk")];
    },
  };
  const open = async () => {
    const server = startServer(
      { SEARCH_DAILY_LIMIT: "2" },
      { port: 0, usageDirectory: directory, youtube },
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));
    return server;
  };
  let server = await open();
  async function post(path: string, body: unknown) {
    const address = server.address() as { port: number };
    return fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
  async function close() {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  try {
    assert.equal((await post("search", { query: "GPU" })).status, 200);
    assert.equal(calls, 2);
    await close();
    server = await open();
    const repeated = await post("search", { query: "GPU" });
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).videos[0].details.embeddable, true);
    assert.equal(
      (await post("videos/details", { ids: ["abcdefghijk"] })).status,
      200,
    );
    assert.equal(calls, 2);
    const uncached = await post("search", { query: "GPU", pageToken: "next" });
    assert.equal(uncached.status, 400);
    assert.equal((await uncached.json()).code, "LOCAL_LIMIT");
    assert.equal(calls, 2);
    assert.equal(
      JSON.parse(readFileSync(join(directory, "usage.json"), "utf8")).search,
      2,
    );
  } finally {
    await close();
    rmSync(directory, { recursive: true, force: true });
  }
});
