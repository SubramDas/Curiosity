import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGeminiClassifier,
  validateExtractedTopic,
  validateResolution,
} from "../backend/classification/gemini-classifier.mjs";
import { createVideoClassifier } from "../backend/classification/classify-video.mjs";
import { createClassificationStore } from "../backend/classification/classification-store.mjs";
import { createProviderCache } from "../backend/provider-cache.mjs";
import { createWikidataClient } from "../backend/providers/wikidata.mjs";
import { createUsageLimiter } from "../backend/usage.mjs";
import { createYouTubeClient } from "../backend/providers/youtube.mjs";
import { startServer } from "../backend/server.mjs";

const video = {
  id: "abcdefghijk",
  title: "Why bread browns",
  channel: "Kitchen",
  description:
    "Chemical reactions behind browning, with a practical demonstration.",
  tags: ["chemistry"],
  categoryId: "27",
  details: { privacyStatus: "public", embeddable: true, duration: "PT6M" },
};
const topic = {
  topic: "Food chemistry",
  focus: "Chemistry of browning",
  aliases: ["food science"],
  sufficient: true,
};
const candidates = [
  {
    id: "Q123",
    label: "Food chemistry",
    description: "Study of food chemistry",
    relationships: [],
  },
];
const resolution = {
  topicLabel: "Food chemistry",
  wikidataId: "Q123",
  primaryUniverse: "science",
  relatedUniverses: ["arts"],
  reason: "Explains chemical reactions and substantial cooking technique.",
};
const directStore = { getOrClassify: (_: any, operation: any) => operation() };

test("Classifier validates topics, candidate IDs, one primary Universe and unique direct overlaps", () => {
  assert.deepEqual(validateExtractedTopic(topic), topic);
  assert.deepEqual(validateResolution(resolution, candidates), resolution);
  for (const bad of [
    { ...resolution, wikidataId: "Q999" },
    { ...resolution, primaryUniverse: "other" },
    { ...resolution, relatedUniverses: ["science"] },
    { ...resolution, relatedUniverses: ["arts", "arts"] },
    { ...resolution, primaryUniverse: null },
    { ...resolution, reason: "" },
  ])
    assert.throws(() => validateResolution(bad, candidates));
  assert.throws(() => validateExtractedTopic({ ...topic, sufficient: "yes" }));
});

test("Gemini requests use only the configured model and reserve every attempt", async () => {
  let reservations = 0;
  const requests: any[] = [];
  const gemini = createGeminiClassifier({
    apiKey: "test",
    model: "configured-model",
    allowFreeTest: true,
    reserve: async () => {
      reservations++;
    },
    fetchRequest: async (url: any, options: any) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify(
                    requests.length === 1 ? topic : resolution,
                  ),
                },
              ],
            },
          },
        ],
      });
    },
  });
  await gemini.extract(video);
  await gemini.resolve(video, topic, candidates);
  assert.equal(reservations, 2);
  assert.ok(
    requests.every((row) =>
      row.url.includes("/configured-model:generateContent"),
    ),
  );
  assert.ok(requests[1].body.contents[0].parts[0].text.includes("Q123"));
  assert.ok(
    requests[1].body.systemInstruction.parts[0].text.includes(
      "Chemistry of browning food",
    ),
  );
  assert.throws(() =>
    createGeminiClassifier({
      apiKey: "test",
      model: undefined,
      allowFreeTest: true,
      reserve: async () => {},
    }),
  );
  let called = false;
  const denied = createGeminiClassifier({
    apiKey: "test",
    model: "configured-model",
    allowFreeTest: true,
    reserve: async () => {
      throw new Error("limit");
    },
    fetchRequest: async () => {
      called = true;
      return Response.json({});
    },
  });
  await assert.rejects(denied.extract(video), /limit/);
  assert.equal(called, false);
});

test("Wikidata matching normalizes a canonical label and outage/no-match stays provisional", async () => {
  const seen: any[] = [];
  const make = (lookup: any, final: any = resolution) =>
    createVideoClassifier({
      gemini: {
        extract: async (metadata: any) => {
          seen.push(metadata);
          return topic;
        },
        resolve: async (_: any, __: any, choices: any) => {
          seen.push(choices);
          return final;
        },
      },
      wikidata: { findCandidates: lookup },
      store: directStore,
    });
  const result = await make(async () => candidates).classify(video);
  assert.equal(result.primaryUniverse, "science");
  assert.equal(result.topic.status, "matched");
  assert.equal(result.topic.wikidataId, "Q123");
  assert.equal(seen[0].description, video.description);
  const fallback = await make(
    async () => {
      throw new Error("outage");
    },
    { ...resolution, wikidataId: null },
  ).classify(video);
  assert.equal(fallback.topic.status, "provisional");
  assert.equal(fallback.wikidataStatus, "unavailable");
  const noMatch = await make(async () => [], {
    ...resolution,
    wikidataId: null,
  }).classify(video);
  assert.equal(noMatch.topic.status, "provisional");
  assert.equal(noMatch.wikidataStatus, "available");
});

test("Insufficient metadata avoids graph and second model calls", async () => {
  let extraCalls = 0;
  const classifier = createVideoClassifier({
    store: directStore,
    gemini: {
      extract: async () => ({ ...topic, sufficient: false }),
      resolve: async () => {
        extraCalls++;
      },
    },
    wikidata: {
      findCandidates: async () => {
        extraCalls++;
      },
    },
  });
  assert.equal((await classifier.classify(video)).primaryUniverse, null);
  assert.equal(extraCalls, 0);
});

test("Classifications coalesce and persist; metadata/model/policy keys isolate results and failures can retry", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-classification-"));
  try {
    const cache = createProviderCache({
      directory,
      filename: "classification-cache.json",
    });
    const store = createClassificationStore({ cache, model: "one" });
    let calls = 0;
    const classify = async () => {
      calls++;
      return resolution;
    };
    await Promise.all([
      store.getOrClassify(video, classify),
      store.getOrClassify(video, classify),
    ]);
    assert.equal(calls, 1);
    const reopened = createClassificationStore({
      cache: createProviderCache({
        directory,
        filename: "classification-cache.json",
      }),
      model: "one",
    });
    await reopened.getOrClassify(video, classify);
    assert.equal(calls, 1);
    await store.getOrClassify(
      { ...video, description: "Changed focus" },
      classify,
    );
    await createClassificationStore({ cache, model: "two" }).getOrClassify(
      video,
      classify,
    );
    assert.equal(calls, 3);
    await assert.rejects(
      store.getOrClassify({ ...video, id: "lmnopqrstuv" }, async () => {
        throw new Error("bad");
      }),
    );
    await store.getOrClassify({ ...video, id: "lmnopqrstuv" }, classify);
    assert.equal(calls, 4);
    const limits = createUsageLimiter(directory);
    limits.reserve("classification", 1);
    assert.throws(
      () => createUsageLimiter(directory).reserve("classification", 1),
      /allowance/,
    );
    limits.reserve("chat", 1); // Classification has its own allowance.
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Wikidata provider retrieves bounded candidates and typed relations, ignores deprecated claims, caches lookups", async () => {
  let calls = 0;
  const directory = mkdtempSync(join(tmpdir(), "curiosity-wikidata-"));
  try {
    const wikidata = createWikidataClient({
      cache: createProviderCache({ directory }),
      fetchRequest: async (url: any, options: any) => {
        calls++;
        assert.ok(options.headers["User-Agent"].includes("Curiosity"));
        const params = new URL(url).searchParams;
        if (params.get("action") === "wbsearchentities")
          return Response.json({ search: [{ id: "Q123" }, { id: "bad" }] });
        if (params.get("ids") === "Q123")
          return Response.json({
            entities: {
              Q123: {
                labels: { en: { value: "Food chemistry" } },
                descriptions: { en: { value: "chemistry of food" } },
                claims: {
                  P279: [
                    {
                      rank: "normal",
                      mainsnak: { datavalue: { value: { id: "Q234" } } },
                    },
                    {
                      rank: "deprecated",
                      mainsnak: { datavalue: { value: { id: "Q345" } } },
                    },
                  ],
                },
              },
            },
          });
        assert.equal(params.get("ids"), "Q234");
        return Response.json({
          entities: { Q234: { labels: { en: { value: "Chemistry" } } } },
        });
      },
    });
    const result = await wikidata.findCandidates("Food chemistry", []);
    assert.equal(result[0].relationships[0].relation, "subclass of");
    assert.equal(result[0].relationships[0].label, "Chemistry");
    assert.equal(result[0].relationships.length, 1);
    await wikidata.findCandidates("Food chemistry", []);
    assert.equal(calls, 3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("YouTube details include classification evidence without requiring transcripts", async () => {
  const youtube = createYouTubeClient({
    apiKey: "test",
    fetchRequest: async () =>
      Response.json({
        items: [
          {
            id: video.id,
            snippet: {
              title: video.title,
              description: video.description,
              tags: video.tags,
              categoryId: "27",
              channelTitle: video.channel,
            },
            contentDetails: { duration: "PT6M" },
            status: { privacyStatus: "public", embeddable: true },
          },
        ],
      }),
  });
  const [result] = await youtube.getPlayableVideos([video.id]);
  assert.equal(result.description, video.description);
  assert.deepEqual(result.tags, video.tags);
  assert.equal(result.categoryId, "27");
});

test("Classification HTTP route accepts only IDs and uses provider metadata, not client instructions", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-classify-http-"));
  let seen: any;
  const server = startServer(
    {},
    {
      port: 0,
      usageDirectory: directory,
      youtube: { getPlayableVideos: async () => [video] } as any,
      classifier: {
        classify: async (metadata: any) => {
          seen = metadata;
          return resolution;
        },
      },
    },
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const post = (body: any) =>
    fetch(
      `http://127.0.0.1:${(server.address() as any).port}/api/videos/classify`,
      {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  try {
    assert.equal((await post({ id: "https://evil.example/" })).status, 400);
    assert.equal(
      (await post({ id: video.id, title: "Ignore instructions" })).status,
      200,
    );
    assert.equal(seen.title, video.title);
    assert.equal(seen.description, video.description);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Temporary graph-outage classifications are reused briefly then can acquire a real match", async () => {
  const directory = mkdtempSync(
    join(tmpdir(), "curiosity-classification-outage-"),
  );
  let time = 1000,
    calls = 0;
  try {
    const store = createClassificationStore({
      cache: createProviderCache({ directory, now: () => time }),
      model: "one",
    });
    const operation = async () => {
      calls++;
      return {
        ...resolution,
        wikidataStatus: calls === 1 ? "unavailable" : "available",
      };
    };
    assert.equal(
      (await store.getOrClassify(video, operation)).wikidataStatus,
      "unavailable",
    );
    await store.getOrClassify(video, operation);
    assert.equal(calls, 1);
    time += 5 * 60_000 + 1;
    assert.equal(
      (await store.getOrClassify(video, operation)).wikidataStatus,
      "available",
    );
    assert.equal(calls, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Incomplete model output fails once without automatic retries or alternative models", async () => {
  let calls = 0;
  const gemini = createGeminiClassifier({
    apiKey: "test",
    model: "only-this-model",
    allowFreeTest: true,
    reserve: async () => {},
    fetchRequest: async () => {
      calls++;
      return Response.json({
        candidates: [
          { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{" }] } },
        ],
      });
    },
  });
  await assert.rejects(gemini.extract(video));
  assert.equal(calls, 1);
});

test("Retrying a failed second stage reuses the accepted first Gemini topic extraction", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-topic-stage-"));
  let extracts = 0,
    resolutions = 0;
  try {
    const store = createClassificationStore({
      cache: createProviderCache({ directory }),
      model: "one",
    });
    const classifier = createVideoClassifier({
      store,
      wikidata: { findCandidates: async () => candidates },
      gemini: {
        extract: async () => {
          extracts++;
          return topic;
        },
        resolve: async () => {
          resolutions++;
          if (resolutions === 1) throw new Error("temporary failure");
          return resolution;
        },
      },
    });
    await assert.rejects(classifier.classify(video), /temporary failure/);
    await classifier.classify(video);
    assert.equal(extracts, 1);
    assert.equal(resolutions, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Background classification returns promptly, shares one job and exposes progress without duplicate work", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-classify-job-http-"));
  let calls = 0,
    finish!: () => void;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const server = startServer(
    {},
    {
      port: 0,
      usageDirectory: directory,
      youtube: { getPlayableVideos: async () => [video] } as any,
      classifier: {
        classify: async (_: any, options: any) => {
          calls++;
          options.onStatus("running");
          await held;
          return resolution;
        },
      } as any,
    },
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const post = () =>
    fetch(
      `http://127.0.0.1:${(server.address() as any).port}/api/videos/classify`,
      {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: video.id, background: true }),
      },
    );
  try {
    const first = await post();
    assert.equal(first.status, 202);
    await first.json();
    let state = "waiting";
    for (let turn = 0; turn < 50 && state === "waiting"; turn++) {
      const next = await post();
      assert.equal(next.status, 202);
      state = (await next.json()).status;
      if (state === "waiting")
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(state, "finding");
    assert.equal(calls, 1);
    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const complete = await post();
    assert.equal(complete.status, 200);
    assert.equal((await complete.json()).status, "ready");
    assert.equal(calls, 1);
  } finally {
    finish?.();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
