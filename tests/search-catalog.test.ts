import { createCachedSearchRecovery } from "../backend/universes/recover-cached-search.mjs";
import { createClassificationStore } from "../backend/classification/classification-store.mjs";
import { classificationMetadata } from "../backend/classification/classify-video.mjs";
import {
  SEARCH_POLICY_VERSION,
  videoEvidence,
} from "../backend/search/search-policy.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProviderCache } from "../backend/provider-cache.mjs";
import { createSearchCatalog } from "../backend/universes/search-catalog.mjs";
import { startServer } from "../backend/server.mjs";
import { educationalSearchAssessor } from "./search-fixture";
const video = {
  id: "abcdefghijk",
  title: "How GPUs work",
  channel: "Example",
  description: "Parallel processing explained",
  watchUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  reviewed: false,
  details: { embeddable: true, privacyStatus: "public", duration: "PT6M" },
};
const classification = {
  topic: {
    label: "Graphics processing",
    wikidataId: "Q123",
    status: "matched",
  },
  primaryUniverse: "science",
  relatedUniverses: ["commerce"],
  reason: "Explains computing",
  policyVersion: "1",
};

test("Catalog requires educational approval, reuses classification in either order, persists and keeps primary-only placement", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-catalog-"));
  let time = 1000;
  const options = { directory, now: () => time };
  try {
    const cache = createProviderCache(options);
    const catalog = createSearchCatalog({
      cache,
      model: "test",
      now: () => time,
    });
    await catalog.classify(video, classification);
    assert.deepEqual(await catalog.list("science"), []);
    await catalog.approve([video]);
    await catalog.approve([video]);
    assert.equal((await catalog.list("science")).length, 1);
    assert.deepEqual(await catalog.list("commerce"), []);
    assert.deepEqual(await catalog.list("arts"), []);
    const restored = createSearchCatalog({
      cache: createProviderCache(options),
      model: "test",
      now: () => time,
    });
    assert.equal(
      (await restored.list("science"))[0].classification.topic.label,
      "Graphics processing",
    );
    assert.deepEqual(
      await createSearchCatalog({
        cache,
        model: "changed",
        now: () => time,
      }).list("science"),
      [],
    );
    await assert.rejects(catalog.list("invented"), /valid Universe/);
    // Changed metadata clears an old classification until the new evidence is checked.
    await catalog.approve([{ ...video, title: "Updated title" }]);
    assert.equal(
      (await catalog.list("science")).find((row) => row.id === video.id)!
        .classification,
      undefined,
    );
    await catalog.classify(
      { ...video, title: "Updated title" },
      { ...classification, primaryUniverse: "arts" },
    );
    assert.deepEqual(await catalog.list("science"), []);
    assert.equal((await catalog.list("arts")).length, 1);
    time += 23 * 3600_000;
    await catalog.classify(
      { ...video, title: "Updated title" },
      classification,
    );
    time += 3600_001;
    assert.deepEqual(await catalog.list("science"), []); // Classification cannot extend approval.
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Catalog bounds retained videos and expires provisional outage labels without discarding approved references", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-catalog-"));
  let time = 1000;
  try {
    const catalog = createSearchCatalog({
      cache: createProviderCache({ directory, now: () => time }),
      model: "test",
      now: () => time,
      maxVideos: 2,
    });
    await catalog.approve([
      video,
      { ...video, id: "bcdefghijkl" },
      { ...video, id: "cdefghijklm" },
    ]);
    assert.equal((await catalog.list("science")).length, 2);
    await catalog.classify(video, {
      ...classification,
      wikidataStatus: "unavailable",
    });
    assert.equal(
      (await catalog.list("science")).find((row) => row.id === video.id)!
        .classification.primaryUniverse,
      "science",
    );
    time += 300_001;
    assert.equal(
      (await catalog.list("science")).find((row) => row.id === video.id)!
        .classification,
      undefined,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("HTTP catalog joins only server-approved search videos with server classifications and survives restart without provider calls", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-catalog-http-"));
  let providers = 0;
  const options = {
    port: 0,
    usageDirectory: directory,
    searchAssessor: educationalSearchAssessor,
    classifier: {
      classify: async () => {
        providers++;
        return classification;
      },
    },
    youtube: {
      searchPage: async () => {
        providers++;
        return { videos: [video], nextPageToken: null };
      },
      getPlayableVideos: async () => {
        providers++;
        return [video];
      },
    } as any,
  };
  let server: ReturnType<typeof startServer>;
  async function start() {
    server = startServer({}, options);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    return async (path: string, body: unknown) => {
      const response = await fetch(
        `http://127.0.0.1:${(server.address() as any).port}/api/${path}`,
        {
          method: "POST",
          headers: {
            Origin: "http://127.0.0.1:5173",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      return { status: response.status, body: await response.json() };
    };
  }
  async function stop() {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  try {
    let post = await start();
    await post("videos/classify", {
      id: video.id,
      classification: { primaryUniverse: "arts" },
    });
    assert.deepEqual(
      (await post("feed/universe/catalog", { universe: "science" })).body
        .videos,
      [],
    );
    await post("search", { query: "How GPUs work" });
    assert.equal(
      (await post("feed/universe/catalog", { universe: "science" })).body
        .videos[0].classification.primaryUniverse,
      "science",
    );
    assert.deepEqual(
      (await post("feed/universe/catalog", { universe: "commerce" })).body
        .videos,
      [],
    );
    assert.equal(
      (await post("feed/universe/catalog", { universe: "invalid" })).status,
      400,
    );
    const previousCalls = providers;
    await stop();
    post = await start();
    assert.equal(
      (await post("feed/universe/catalog", { universe: "science" })).body
        .videos[0].id,
      video.id,
    );
    assert.equal(providers, previousCalls);
  } finally {
    await stop();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Legacy cached videos recover with existing educational decisions and labels, without extending approval or admitting entertainment", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-cache-recovery-"));
  let time = 1000;
  try {
    const cache = createProviderCache({ directory, now: () => time });
    const labels = createClassificationStore({
      cache: createProviderCache({
        directory,
        filename: "labels.json",
        now: () => time,
      }),
      model: "test",
    });
    const unapproved = { ...video, id: "bcdefghijkl" };
    const rejected = { ...video, id: "cdefghijklm" };
    const changed = { ...video, id: "defghijklmn" };
    for (const v of [video, unapproved, rejected, changed]) {
      await cache.getOrLoad(["video", v.id], 1000, async () => v);
      await labels.getOrClassify(
        classificationMetadata(v),
        async () => classification,
      );
    }
    const purposeKey = (v: typeof video) => [
      "search-video-purpose",
      SEARCH_POLICY_VERSION,
      "test",
      videoEvidence(v),
      "learning",
      "",
    ];
    await cache.getOrLoad(purposeKey(video), 5000, async () => ({
      id: video.id,
      purpose: "educational",
    }));
    await cache.getOrLoad(purposeKey(rejected), 5000, async () => ({
      id: rejected.id,
      purpose: "entertainment",
    }));
    await cache.getOrLoad(
      purposeKey({ ...changed, description: "Old evidence" }),
      5000,
      async () => ({ id: changed.id, purpose: "educational" }),
    );
    const catalog = createSearchCatalog({
      cache,
      model: "test",
      now: () => time,
      resolveClassification: labels.getCachedByFingerprint,
    });
    let scans = 0;
    const recovery = createCachedSearchRecovery({
      cache: {
        ...cache,
        entries: async () => {
          scans++;
          return cache.entries();
        },
      },
      catalog,
      model: "test",
      now: () => time,
    });
    await Promise.all([recovery(), recovery()]);
    assert.equal(scans, 1);
    const science = await catalog.list("science");
    assert.deepEqual(
      science.map((v) => v.id),
      [video.id],
    );
    assert.deepEqual(science[0].classification, classification);
    assert.deepEqual(await catalog.list("commerce"), []);
    assert.deepEqual(await catalog.list("arts"), []);
    time += 1001;
    assert.deepEqual(await catalog.list("science"), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Existing catalog approvals join classification-cache labels by exact evidence and configured model", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-cache-label-join-"));
  try {
    const cache = createProviderCache({ directory });
    const labelsCache = createProviderCache({
      directory,
      filename: "labels.json",
    });
    const labels = createClassificationStore({
      cache: labelsCache,
      model: "test",
    });
    const catalog = createSearchCatalog({
      cache,
      model: "test",
      resolveClassification: labels.getCachedByFingerprint,
    });
    await catalog.approve([video]);
    assert.equal((await catalog.list("science"))[0].classification, undefined);
    await labels.getOrClassify(
      classificationMetadata(video),
      async () => classification,
    );
    assert.deepEqual(
      (await catalog.list("science"))[0].classification,
      classification,
    );
    assert.deepEqual(await catalog.list("commerce"), []);
    assert.deepEqual(await catalog.list("arts"), []);
    await catalog.approve([{ ...video, description: "New evidence" }]);
    assert.equal((await catalog.list("science"))[0].classification, undefined);
    const differentModel = createClassificationStore({
      cache: labelsCache,
      model: "other",
    });
    assert.equal(
      await differentModel.getCached(classificationMetadata(video)),
      undefined,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
