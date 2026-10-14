import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyVideo,
  groupUniverseTopics,
  topicUniverse,
} from "../shared/features/universes/universe-rules";
import { createHomeFeed } from "../backend/home-feed.mjs";
import type { Topic } from "../shared/types";

test("One primary Universe with overlap tags, and unknown titles stay unclassified", () => {
  assert.deepEqual(classifyVideo({ title: "NVIDIA stock valuation" }), {
    universe: "commerce",
    subtopic: "Business & markets",
    relatedUniverses: ["science"],
  });
  assert.equal(classifyVideo({ title: "How GPUs work" })?.universe, "science");
  assert.equal(
    classifyVideo({ title: "English literature and history" })?.universe,
    "arts",
  );
  assert.equal(classifyVideo({ title: "A surprising discovery" }), null);
});
test("Legacy saved searches map to Universes without rewriting keys or records", () => {
  const topics: Topic[] = [
    {
      key: "computing:gpu",
      query: "GPUs",
      category: "computing",
      relatedCategories: [],
    },
    {
      key: "science:physics",
      query: "Physics",
      category: "science",
      relatedCategories: [],
    },
    {
      key: "money:tax",
      query: "Tax",
      category: "money",
      relatedCategories: ["society"],
    },
    {
      key: "life:cooking",
      query: "Cooking",
      category: "life",
      relatedCategories: [],
    },
  ];
  const original = JSON.stringify(topics);
  assert.deepEqual(
    groupUniverseTopics(topics, "science").map((t) => t.key),
    ["computing:gpu", "science:physics"],
  );
  assert.equal(topicUniverse(topics[2]), "commerce");
  assert.equal(topicUniverse(topics[3]), null);
  assert.equal(JSON.stringify(topics), original);
});
test("Universe feeds omit Trending provider calls, reuse cache and preserve independent failures", async () => {
  let trendingCalls = 0,
    searches = 0;
  const feed = createHomeFeed({
    reserve: () => {},
    youtube: {
      async getPopularLearningVideos() {
        trendingCalls++;
        return [];
      },
      async searchPage(query: string) {
        searches++;
        if (query === "unavailable") throw new Error("private upstream error");
        return { videos: [{ id: "abcdefghijk" }] };
      },
      async getVideoDetails() {
        return [{ id: "abcdefghijk", embeddable: true }];
      },
    },
  });
  const result = await feed(["GPUs", "unavailable"], {
    includeTrending: false,
  });
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.messages.length, 1);
  assert.doesNotMatch(result.messages.join(), /private upstream/);
  await feed(["GPUs"], { includeTrending: false });
  assert.equal(trendingCalls, 0);
  assert.equal(searches, 2);
  await assert.rejects(
    feed(["a", "b", "c"], { includeTrending: false }),
    /up to two/,
  );
});

test("Universe HTTP route shares cached results with search and rejects oversized query lists", async () => {
  const { startServer } = await import("../backend/server.mjs");
  const { createProviderCache } = await import("../backend/provider-cache.mjs");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = mkdtempSync(join(tmpdir(), "curiosity-universe-"));
  let searches = 0,
    reservations = 0;
  const server = startServer(
    {},
    {
      port: 0,
      cache: createProviderCache({ directory }),
      limits: {
        reserve: () => {
          reservations++;
        },
      },
      youtube: {
        async searchPage() {
          searches++;
          return {
            videos: [{ id: "abcdefghijk", title: "GPU", channel: "Example" }],
            nextPageToken: null,
          };
        },
        async getPlayableVideos() {
          return [
            {
              id: "abcdefghijk",
              title: "GPU",
              channel: "Example",
              watchUrl: "https://www.youtube.com/watch?v=abcdefghijk",
              reviewed: false,
              details: {
                embeddable: true,
                duration: "PT6M",
                privacyStatus: "public",
              },
            },
          ];
        },
        async getVideoDetails() {
          return [
            {
              id: "abcdefghijk",
              embeddable: true,
              duration: "PT6M",
              privacyStatus: "public",
            },
          ];
        },
        async getPopularLearningVideos() {
          throw new Error("Trending must not be queried");
        },
      },
    },
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const post = (path: string, body: unknown) =>
    fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  try {
    const response = await post("feed/universe", { queries: ["GPUs"] });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.recommendations[0].videos.length, 1);
    assert.equal(data.messages.length, 0);
    const used = reservations;
    assert.equal((await post("search", { query: "GPUs" })).status, 200);
    assert.equal(searches, 1);
    assert.equal(reservations, used);
    assert.equal(
      (await post("feed/universe", { queries: ["a", "b", "c"] })).status,
      400,
    );
    assert.equal(reservations, used);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
