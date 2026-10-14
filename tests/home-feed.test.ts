import test from "node:test";
import { ServiceError } from "../backend/providers/request-json.mjs";
import assert from "node:assert/strict";
import { createHomeFeed } from "../backend/home-feed.mjs";
import { createYouTubeClient } from "../backend/providers/youtube.mjs";

test("Home feed caps suggestions, reuses provider data briefly, and refreshes after expiry", async () => {
  let time = 0;
  let reserved = 0;
  const calls: string[] = [];
  const feed = createHomeFeed({
    now: () => time,
    reserve: () => {
      reserved++;
    },
    youtube: {
      async getPopularLearningVideos() {
        calls.push("trending");
        return [];
      },
      async searchPage(query: string) {
        calls.push(query);
        return { videos: [{ id: "abcdefghijk" }] };
      },
      async getVideoDetails() {
        return [{ id: "abcdefghijk", embeddable: true }];
      },
    },
  });
  const first = await feed(["GPU", "GPU"]);
  assert.equal(first.recommendations.length, 1);
  await feed(["GPU"]);
  assert.deepEqual(calls, ["trending", "GPU"]);
  assert.equal(reserved, 3);
  time = 600_001;
  await feed(["GPU"]);
  assert.equal(reserved, 6);
  await assert.rejects(feed(["a", "b", "c"]), /up to two/);
  assert.equal(reserved, 6);
});

test("Home provider failures keep independent suggestions and never invent trending items", async () => {
  const feed = createHomeFeed({
    reserve: () => {},
    youtube: {
      async getPopularLearningVideos() {
        throw new Error("private provider details");
      },
      async searchPage() {
        return { videos: [] };
      },
      async getVideoDetails() {
        return [];
      },
    },
  });
  const result = await feed(["GPU"]);
  assert.deepEqual(result.trending, []);
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.messages.length, 1);
  assert.doesNotMatch(result.messages.join(), /private provider/);
});

test("Trending requests recent popular education results and preserves provider rank while excluding unplayable videos", async () => {
  const calls: URL[] = [];
  const youtube = createYouTubeClient({
    apiKey: "test-only-key",
    fetchRequest: async (url: RequestInfo | URL) => {
      calls.push(new URL(url instanceof Request ? url.url : String(url)));
      const items =
        calls.length <= 2
          ? [
              { id: { videoId: "abcdefghijk" } },
              { id: { videoId: "Kgcfj_KV-mo" } },
            ]
          : [
              {
                id: "Kgcfj_KV-mo",
                snippet: { title: "Unavailable" },
                status: { embeddable: false },
              },
              {
                id: "abcdefghijk",
                snippet: { title: "Popular video" },
                status: { embeddable: true },
                contentDetails: { duration: "PT5M" },
              },
            ];
      return new Response(JSON.stringify({ items }), { status: 200 });
    },
  });
  const result = await youtube.getPopularLearningVideos();
  assert.equal(calls.length, 3);
  assert.equal(calls[0].searchParams.get("videoDuration"), "medium");
  assert.equal(calls[1].searchParams.get("videoDuration"), "short");
  assert.equal(calls[0].searchParams.get("order"), "viewCount");
  assert.equal(calls[0].searchParams.get("videoCategoryId"), "27");
  assert.equal(calls[0].searchParams.get("videoEmbeddable"), "true");
  const age =
    Date.now() - Date.parse(calls[0].searchParams.get("publishedAfter")!);
  assert.ok(Math.abs(age - 30 * 86400_000) < 10_000);
  assert.deepEqual(
    result.map((video: { id: string }) => video.id),
    ["abcdefghijk"],
  );
  assert.equal(result[0].reviewed, false);
});

test("Exhausted home allowance blocks provider calls and explains the limit without fabricating results", async () => {
  let calls = 0;
  const feed = createHomeFeed({
    reserve: () => {
      throw new ServiceError(
        "LOCAL_LIMIT",
        "The local daily search allowance is used. Try again tomorrow.",
      );
    },
    youtube: {
      async getPopularLearningVideos() {
        calls++;
        return [];
      },
      async searchPage() {
        calls++;
        return { videos: [] };
      },
      async getVideoDetails() {
        calls++;
        return [];
      },
    },
  });
  const result = await feed(["GPU"]);
  assert.equal(calls, 0);
  assert.deepEqual(result.trending, []);
  assert.deepEqual(result.recommendations, []);
  assert.deepEqual(result.messages, [
    "The local daily search allowance is used. Try again tomorrow.",
  ]);
});
